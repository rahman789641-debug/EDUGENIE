"""Safe Google Gemini API Integration Verification Script.

Verifies:
1. GEMINI_API_KEY is loaded securely from backend configuration (never printed).
2. GEMINI_MODEL is configured and valid.
3. Official google-genai Client initializes properly.
4. Executes ONE minimal real generation request.
5. Verifies non-empty response text.
6. Safe diagnostic output without exposing secrets.
"""

import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.core.config import get_settings


def verify_gemini_live() -> bool:
    print("=" * 60)
    print("EDUGENIE GOOGLE GEMINI REAL API INTEGRATION VERIFICATION")
    print("=" * 60)

    settings = get_settings()

    # 1. Verify Model configuration
    model_name = settings.GEMINI_MODEL
    if not model_name or not model_name.strip():
        print("[ERROR] GEMINI_MODEL is missing or empty in environment.")
        return False
    print(f"[OK] GEMINI_MODEL configured: {model_name}")

    # 2. Verify Key configuration securely (never print key)
    if not settings.is_gemini_configured:
        print("[ERROR] GEMINI_API_KEY is not present or is empty in .env.")
        print("       Please provide your GEMINI_API_KEY in .env to enable real Gemini calls.")
        return False

    key_len = len(settings.GEMINI_API_KEY.strip())
    print(f"[OK] GEMINI_API_KEY detected securely in environment (length: {key_len} chars). Key is hidden.")

    # 3. Initialize Official GenAI Client
    try:
        from google import genai
        import google.genai as genai_pkg

        sdk_version = getattr(genai_pkg, "__version__", "unknown")
        print(f"[OK] Official google-genai SDK imported (version: {sdk_version})")

        client = genai.Client(api_key=settings.GEMINI_API_KEY.strip())
        print("[OK] GenAI Client initialized successfully.")
    except Exception as exc:
        print(f"[ERROR] Failed to initialize Gemini Client: {type(exc).__name__}: {str(exc)[:100]}")
        return False

    # 4. Execute ONE Minimal Real Generation Request
    print(f"[...] Sending ONE minimal verification request to model '{model_name}'...")
    try:
        response = client.models.generate_content(
            model=model_name,
            contents="Respond with only: Gemini integration verified.",
        )

        if not response or not response.text:
            print("[ERROR] Gemini returned empty response.")
            return False

        clean_resp = response.text.strip()
        print(f"[SUCCESS] Real Gemini generation succeeded!")
        print(f"          Model: {model_name}")
        print(f"          Response received: {clean_resp}")
        print("=" * 60)
        return True

    except Exception as exc:
        exc_type = type(exc).__name__
        exc_msg = str(exc)
        print(f"[ERROR] Real Gemini API call failed: {exc_type}")

        # Diagnose safe reason without printing secrets
        if "403" in exc_msg or "PERMISSION_DENIED" in exc_msg:
            print("        Diagnosis: HTTP 403 Forbidden / Permission Denied.")
            print("        Possible cause: API key has IP/service restrictions or Generative Language API is disabled.")
        elif "400" in exc_msg or "API_KEY_INVALID" in exc_msg:
            print("        Diagnosis: HTTP 400 Invalid Argument / API Key Invalid.")
            print("        Possible cause: The provided API key is invalid or expired.")
        elif "429" in exc_msg or "RESOURCE_EXHAUSTED" in exc_msg:
            print("        Diagnosis: HTTP 429 Quota Exceeded / Rate Limited.")
        elif "404" in exc_msg or "NOT_FOUND" in exc_msg:
            print(f"        Diagnosis: Model '{model_name}' not found or unsupported.")
        else:
            # Safe truncated message
            print(f"        Details: {exc_msg[:150]}")
        print("=" * 60)
        return False


if __name__ == "__main__":
    success = verify_gemini_live()
    sys.exit(0 if success else 1)
