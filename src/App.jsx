import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import AITutor from './components/AITutor'
import Planner from './components/Planner'
import Scanner from './components/Scanner'
import StudyHub from './components/StudyHub'
import Account from './components/Account'
import AuthScreen from './components/AuthScreen'
import ToastContainer from './components/Toast'
import ConfirmDialogContainer from './components/ConfirmDialog'
import { StudyProvider } from './contexts/StudyContext'
import authService from './services/authService'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showScanner, setShowScanner] = useState(false)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [dashboardKey, setDashboardKey] = useState(0)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const { user } = await authService.getCurrentUser()
      setUser(user)
      setAuthLoading(false)

      if (user) {
        await authService.refreshUserProfile()
        const userProfile = authService.getUserProfile()
        setProfile(userProfile)
      }
    }

    checkAuth()

    const subscription = authService.onAuthStateChange(async (event, session) => {
      setUser(session?.user || null)

      if (session?.user) {
        await authService.refreshUserProfile()
        const userProfile = authService.getUserProfile()
        setProfile(userProfile)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    if (saved !== null) {
      setSidebarCollapsed(JSON.parse(saved))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed))
  }, [sidebarCollapsed])

  // Consolidated 5-tab navigation
  const tabs = [
    { id: 'dashboard', label: 'Home', icon: 'home' },
    { id: 'planner', label: 'Plan', icon: 'calendar' },
    { id: 'study', label: 'Study', icon: 'book' },
    { id: 'tutor', label: 'AI', icon: 'sparkles' },
    { id: 'account', label: 'Account', icon: 'user' },
  ]

  const getIcon = (icon, isActive) => {
    const className = "w-5 h-5"
    const strokeWidth = isActive ? 2.5 : 2

    const icons = {
      home: (
        <svg className={className} fill={isActive ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      calendar: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      book: (
        <svg className={className} fill={isActive ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      sparkles: (
        <svg className={className} fill={isActive ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ),
      user: (
        <svg className={className} fill={isActive ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      camera: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    }

    return icons[icon] || null
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface-base flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-3 border-border border-t-primary rounded-full animate-spin"></div>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthScreen onAuthSuccess={(user) => setUser(user)} />
  }

  return (
    <StudyProvider>
      <div className="min-h-screen bg-surface-base flex">
        {/* Scanner Modal */}
        {showScanner && (
          <Scanner
            onClose={() => {
              setShowScanner(false)
              setDashboardKey(prev => prev + 1)
            }}
            onCapture={(assignment) => console.log('Captured:', assignment)}
          />
        )}

        {/* Sidebar - Desktop */}
        <aside className={`hidden md:flex md:flex-col ${sidebarCollapsed ? 'w-16' : 'w-56'} bg-surface-elevated border-r border-border fixed left-0 top-0 bottom-0 z-40 transition-all duration-200`}>
          {/* Logo */}
          <div className="p-4 border-b border-border">
            {sidebarCollapsed ? (
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
                <span className="text-white font-bold text-sm">FF</span>
              </div>
            ) : (
              <h1 className="text-xl font-bold text-primary">Focus Flow</h1>
            )}
          </div>

          {/* User */}
          {user && (
            <div className="p-3 border-b border-border">
              <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                  {profile?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                </div>
                {!sidebarCollapsed && (
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {profile?.full_name || user.email?.split('@')[0]}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Nav Items */}
          <nav className="flex-1 p-2 space-y-1">
            {/* Scan Button */}
            <button
              onClick={() => setShowScanner(true)}
              className={`w-full ${sidebarCollapsed ? 'p-2 justify-center' : 'px-3 py-2'} rounded-lg bg-primary hover:bg-primary-hover text-white flex items-center gap-3 transition-colors`}
              title="Scan"
            >
              {getIcon('camera', true)}
              {!sidebarCollapsed && <span className="text-sm font-medium">Scan</span>}
            </button>

            <div className="h-2" />

            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full ${sidebarCollapsed ? 'p-2 justify-center' : 'px-3 py-2'} rounded-lg flex items-center gap-3 transition-colors ${
                    isActive
                      ? 'bg-surface-overlay text-primary'
                      : 'text-text-secondary hover:bg-surface-overlay hover:text-text-primary'
                  }`}
                  title={sidebarCollapsed ? tab.label : undefined}
                >
                  {getIcon(tab.icon, isActive)}
                  {!sidebarCollapsed && <span className="text-sm font-medium">{tab.label}</span>}
                </button>
              )
            })}
          </nav>

          {/* Collapse Toggle */}
          <div className="p-2 border-t border-border">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`w-full ${sidebarCollapsed ? 'p-2 justify-center' : 'px-3 py-2'} rounded-lg flex items-center gap-3 text-text-muted hover:text-text-secondary hover:bg-surface-overlay transition-colors`}
            >
              <svg className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {!sidebarCollapsed && <span className="text-sm">Collapse</span>}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-56'} pb-20 md:pb-6 transition-all duration-200`}>
          <div className={`transition-opacity duration-150 ${activeTab === 'dashboard' ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'}`}>
            <Dashboard key={dashboardKey} onOpenScanner={() => setShowScanner(true)} />
          </div>
          <div className={`transition-opacity duration-150 ${activeTab === 'planner' ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'}`}>
            <Planner />
          </div>
          <div className={`transition-opacity duration-150 ${activeTab === 'study' ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'}`}>
            <StudyHub />
          </div>
          <div className={`transition-opacity duration-150 ${activeTab === 'tutor' ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'}`}>
            <AITutor />
          </div>
          <div className={`transition-opacity duration-150 ${activeTab === 'account' ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'}`}>
            <Account />
          </div>
        </main>

        {/* Bottom Nav - Mobile */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-elevated border-t border-border">
          <div className="flex justify-around items-center px-2 py-2">
            {/* Scan Button - Center */}
            <button
              onClick={() => setShowScanner(true)}
              className="w-12 h-12 -mt-6 rounded-xl bg-primary flex items-center justify-center text-white shadow-elevated"
            >
              {getIcon('camera', true)}
            </button>
          </div>
          <div className="flex justify-around items-center px-2 pb-2 -mt-4">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2 flex flex-col items-center gap-1 ${
                    isActive ? 'text-primary' : 'text-text-muted'
                  }`}
                >
                  {getIcon(tab.icon, isActive)}
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </nav>
      </div>

      <ToastContainer />
      <ConfirmDialogContainer />
    </StudyProvider>
  )
}

export default App
