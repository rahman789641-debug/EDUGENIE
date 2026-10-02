import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopHeader } from './TopHeader'

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/ask': 'Ask AI Assistant',
  '/explain': 'Concept Explanation',
  '/quiz': 'Adaptive Quiz Generation',
  '/summary': 'Text & Lecture Summarization',
  '/learn': 'Personalized Learning Pathways',
  '/settings': 'System Settings & Architecture',
}

export const AppLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const currentTitle = ROUTE_TITLES[location.pathname] || 'EduGenie'

  const isFullWidthRoute = location.pathname === '/ask'

  return (
    <div className="app-shell">
      <Sidebar isMobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className={`app-main ${isFullWidthRoute ? 'app-main-fixed preserve-dark-theme' : ''}`}>
        <TopHeader
          pageTitle={currentTitle}
          onToggleMobileMenu={() => setMobileOpen((prev) => !prev)}
        />

        <main className={`workspace-container ${isFullWidthRoute ? 'workspace-fullwidth' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
