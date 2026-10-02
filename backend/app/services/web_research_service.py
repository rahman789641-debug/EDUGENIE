"""Backend service for educational web research and verified external source grounding."""

import asyncio
import logging
import re
import uuid
from typing import List, Optional, Set
from urllib.parse import unquote, urlparse

import httpx
from fastapi import Depends

from app.core.auth import AuthenticatedUser
from app.core.config import Settings, get_settings
from app.schemas.activity import ActivityType
from app.schemas.research import ResearchRequest, ResearchResponse, WebSource
from app.services.activity_service import ActivityService, get_activity_service
from app.services.ai.base import BaseAIService
from app.services.ai_service import get_ai_service
from app.services.base import BaseService

logger = logging.getLogger("edugenie.services.web_research")


class WebResearchService(BaseService):
    """Business service orchestrating external web search, result sanitization, and grounded synthesis."""

    def __init__(
        self,
        ai_service: BaseAIService,
        settings: Optional[Settings] = None,
        activity_service: Optional[ActivityService] = None,
    ) -> None:
        super().__init__(service_name="WebResearchService")
        self.ai_service = ai_service
        self.settings = settings or get_settings()
        self.activity_service = activity_service


    async def search(self, query: str, max_results: Optional[int] = None) -> List[WebSource]:
        """Search available external web sources and return deduplicated, verified results."""
        limit = max_results or self.settings.MAX_SEARCH_RESULTS
        clean_query = query.strip()
        if not clean_query:
            return []

        # 1. Check if dedicated search provider API key is present
        if self.settings.TAVILY_API_KEY and self.settings.TAVILY_API_KEY.strip():
            try:
                tavily_results = await self._search_tavily(clean_query, limit)
                if tavily_results:
                    return tavily_results
            except Exception as exc:
                self.logger.warning("Tavily search provider failed, falling back to open web search: %s", exc)

        # 2. Standard open web search via DuckDuckGo HTML endpoint
        try:
            return await self._search_duckduckgo(clean_query, limit)
        except Exception as exc:
            self.logger.warning("External web search failed for query '%s': %s", clean_query[:50], exc)
            return []

    async def _search_tavily(self, query: str, limit: int) -> List[WebSource]:
        """Query Tavily search provider API if configured."""
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.settings.TAVILY_API_KEY.strip()}",
        }
        payload = {
            "query": query,
            "max_results": limit,
            "include_answer": False,
            "search_depth": "basic",
        }

        async with httpx.AsyncClient(timeout=self.settings.WEB_SEARCH_TIMEOUT_SECONDS) as client:
            resp = await client.post("https://api.tavily.com/search", json=payload, headers=headers)
            if resp.status_code != 200:
                raise RuntimeError(f"Tavily returned status {resp.status_code}")
            data = resp.json()
            raw_results = data.get("results", [])

            sources: List[WebSource] = []
            seen_urls: Set[str] = set()

            for item in raw_results:
                raw_url = str(item.get("url", "")).strip()
                if not raw_url or not (raw_url.startswith("http://") or raw_url.startswith("https://")):
                    continue

                norm_url = raw_url.rstrip("/")
                if norm_url in seen_urls:
                    continue
                seen_urls.add(norm_url)

                domain = urlparse(raw_url).netloc
                title = str(item.get("title", domain)).strip() or domain
                snippet = str(item.get("content", "")).strip()

                sources.append(
                    WebSource(
                        title=title,
                        url=raw_url,
                        domain=domain,
                        snippet=snippet,
                    )
                )
                if len(sources) >= limit:
                    break

            return sources

    def _extract_url(self, raw_url: str) -> Optional[str]:
        """Extract and sanitize destination URL, resolving redirect wrappers."""
        if not raw_url:
            return None
        clean_url = raw_url.strip()
        if "uddg=" in clean_url:
            m = re.search(r"uddg=([^&]+)", clean_url)
            if m:
                clean_url = unquote(m.group(1))

        if not clean_url.startswith("http://") and not clean_url.startswith("https://"):
            return None

        domain = urlparse(clean_url).netloc
        if not domain or "duckduckgo.com" in domain:
            return None

        return clean_url

    async def _search_duckduckgo(self, query: str, limit: int) -> List[WebSource]:
        """Fetch real web search results via DuckDuckGo open search endpoint."""
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        }

        timeout = httpx.Timeout(self.settings.WEB_SEARCH_TIMEOUT_SECONDS, connect=4.0)
        async with httpx.AsyncClient(timeout=timeout, headers=headers, follow_redirects=True) as client:
            resp = await client.post(
                "https://html.duckduckgo.com/html/",
                data={"q": query},
            )

            if resp.status_code != 200:
                self.logger.warning("DuckDuckGo HTML search returned status code %d", resp.status_code)
                return []

            html = resp.text
            blocks = html.split('class="result ')
            if len(blocks) <= 1:
                return []

            sources: List[WebSource] = []
            seen_urls: Set[str] = set()

            for block in blocks[1:]:
                # Extract URL
                url_match = re.search(r'<a[^>]+class=[\'"]result__url[\'"][^>]*href=[\'"](.*?)[\'"]', block, re.DOTALL)
                if not url_match:
                    continue

                raw_url = url_match.group(1).strip()
                clean_url = self._extract_url(raw_url)
                if not clean_url:
                    continue

                # Deduplicate by normalized URL
                norm_url = clean_url.rstrip("/")
                if norm_url in seen_urls:
                    continue
                seen_urls.add(norm_url)

                domain = urlparse(clean_url).netloc

                # Extract Title
                title_match = re.search(r'<a[^>]+class=[\'"]result__a[\'"][^>]*>(.*?)</a>', block, re.DOTALL)
                if title_match:
                    raw_title = re.sub(r"<[^>]+>", "", title_match.group(1)).strip()
                    # Decode HTML entities
                    import html as html_lib
                    title = html_lib.unescape(raw_title)
                else:
                    title = domain

                # Extract Snippet
                snippet_match = re.search(r'<a[^>]+class=[\'"]result__snippet[\'"][^>]*>(.*?)</a>', block, re.DOTALL)
                if snippet_match:
                    raw_snippet = re.sub(r"<[^>]+>", "", snippet_match.group(1)).strip()
                    import html as html_lib
                    snippet = html_lib.unescape(raw_snippet)
                else:
                    snippet = ""

                sources.append(
                    WebSource(
                        title=title,
                        url=raw_url,
                        domain=domain,
                        snippet=snippet,
                    )
                )

                if len(sources) >= limit:
                    break

            return sources

    async def conduct_research(
        self,
        request: ResearchRequest,
        request_id: Optional[str] = None,
        user: Optional[AuthenticatedUser] = None,
        conversation_context: Optional[str] = None,
    ) -> ResearchResponse:
        """Execute controlled pipeline: Query -> Web Search -> Grounded Synthesis -> Answer & Citations."""
        masked_uid = user.masked_uid if user else "anonymous"
        clean_query = request.query.strip()
        req_id = request_id or f"res-{uuid.uuid4().hex[:12]}"

        self.logger.info(
            "[%s] Conducting web research for query '%s' for user %s",
            req_id,
            clean_query[:60],
            masked_uid,
        )

        # 1. Retrieve external web results
        sources = await self.search(clean_query, max_results=self.settings.MAX_SEARCH_RESULTS)

        # 2. If no sources retrieved, answer transparently without hallucinating web visits
        if not sources:
            self.logger.info("[%s] No external sources retrieved for query '%s'", req_id, clean_query[:60])
            return ResearchResponse(
                query=clean_query,
                answer=(
                    "No reliable web results were found for this question. "
                    "No reliable external web results were found for this query. "
                    "The topic could not be verified against live external web sources at this moment. "
                    "Please check your search terms or try asking in AI Answer mode."
                ),
                sources=[],
                request_id=req_id,
                searched=True,
                model=getattr(self.ai_service, "client_manager", None).model_name if hasattr(self.ai_service, "client_manager") else None,
            )

        # 3. Format retrieved source context for Gemini grounding
        context_lines: List[str] = []
        for idx, src in enumerate(sources, start=1):
            context_lines.append(
                f"[{idx}] Source Title: {src.title}\n"
                f"    Domain: {src.domain}\n"
                f"    URL: {src.url}\n"
                f"    Retrieved Excerpt: {src.snippet}\n"
            )
        research_material = "\n".join(context_lines)

        # 4. Synthesize source-grounded answer via Gemini
        try:
            import inspect
            sig = inspect.signature(self.ai_service.synthesize_research)
            if "conversation_context" in sig.parameters or any(p.kind == inspect.Parameter.VAR_KEYWORD for p in sig.parameters.values()):
                answer = await self.ai_service.synthesize_research(
                    query=clean_query,
                    sources_context=research_material,
                    conversation_context=conversation_context,
                )
            else:
                answer = await self.ai_service.synthesize_research(
                    query=clean_query,
                    sources_context=research_material,
                )
        except Exception as exc:
            self.logger.error("[%s] AI research synthesis failed: %s", req_id, exc)
            raise

        model_name = getattr(self.ai_service, "client_manager", None).model_name if hasattr(self.ai_service, "client_manager") else None

        if user and user.uid and self.activity_service:
            await self.activity_service.record_activity(
                user_id=user.uid,
                activity_type=ActivityType.RESEARCH,
                title=f"Research: {clean_query[:80]}",
                metadata={"query": clean_query, "sources_count": len(sources)},
            )

        return ResearchResponse(
            query=clean_query,
            answer=answer,
            sources=sources,
            request_id=req_id,
            searched=True,
            model=model_name,
        )


def get_web_research_service(
    ai_service: BaseAIService = Depends(get_ai_service),
    settings: Settings = Depends(get_settings),
    activity_service: ActivityService = Depends(get_activity_service),
) -> WebResearchService:
    """FastAPI dependency provider for WebResearchService."""
    return WebResearchService(ai_service=ai_service, settings=settings, activity_service=activity_service)

