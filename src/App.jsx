import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import AITutor from './components/AITutor'
import Planner from './components/Planner'
import Scanner from './components/Scanner'
import StudyHub from './components/StudyHub'
import Account from './components/Account'
import CanvasHub from './components/CanvasHub'
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [sidebarLocked, setSidebarLocked] = useState(false)

  // Focus timer state (persists across tab switches)
  const [focusTask, setFocusTask] = useState(null)
  const [focusTime, setFocusTime] = useState(0)
  const [focusActive, setFocusActive] = useState(false)
  const [focusPaused, setFocusPaused] = useState(false)

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
    const savedLocked = localStorage.getItem('sidebarLocked')
    if (savedLocked !== null) {
      const isLocked = JSON.parse(savedLocked)
      setSidebarLocked(isLocked)
      if (isLocked) setSidebarCollapsed(false)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('sidebarLocked', JSON.stringify(sidebarLocked))
    if (sidebarLocked) setSidebarCollapsed(false)
  }, [sidebarLocked])

  // Focus timer countdown
  useEffect(() => {
    let interval = null
    if (focusActive && !focusPaused) {
      interval = setInterval(() => {
        setFocusTime(t => t + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [focusActive, focusPaused])

  const formatFocusTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  const focusTimerProps = {
    focusTask, setFocusTask,
    focusTime, setFocusTime,
    focusActive, setFocusActive,
    focusPaused, setFocusPaused
  }

  const tabs = [
    { id: 'dashboard', label: 'Home', icon: 'home' },
    { id: 'planner', label: 'Plan', icon: 'calendar' },
    { id: 'canvas', label: 'Canvas', icon: 'graduation' },
    { id: 'study', label: 'Study', icon: 'book' },
    { id: 'tutor', label: 'AI', icon: 'sparkles' },
    { id: 'account', label: 'Account', icon: 'user' },
  ]

  const getIcon = (icon, isActive) => {
    const className = "w-5 h-5"
    const strokeWidth = isActive ? 2 : 1.5

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
      graduation: (
        <svg className={className} fill={isActive ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
        </svg>
      ),
    }

    return icons[icon] || null
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface-base flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-4 border-2 border-border border-t-primary rounded-full animate-spin"></div>
          <p className="text-text-muted text-sm">Loading...</p>
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
        <aside
          className={`hidden md:flex md:flex-col ${sidebarCollapsed ? 'w-18' : 'w-60'} bg-surface-base fixed left-0 top-0 bottom-0 z-40 transition-all duration-300 ease-gentle`}
          onMouseEnter={() => !sidebarLocked && setSidebarCollapsed(false)}
          onMouseLeave={() => !sidebarLocked && setSidebarCollapsed(true)}
        >
          {/* Logo */}
          <div className="h-18 flex items-center justify-center">
            <div className={`flex items-center gap-3 transition-all duration-300 ${sidebarCollapsed ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
              {!sidebarCollapsed && (
                <span className="text-xl font-semibold text-text-primary tracking-tight">Focus Flow</span>
              )}
            </div>
            {sidebarCollapsed && (
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-semibold text-sm">FF</span>
              </div>
            )}
          </div>

          {/* User Avatar */}
          {user && (
            <div className={`px-3 py-4 ${sidebarCollapsed ? 'flex justify-center' : ''}`}>
              <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3 px-2'}`}>
                <div className="w-9 h-9 rounded-xl bg-accent-warm/15 flex items-center justify-center text-accent-warm font-medium text-sm flex-shrink-0">
                  {profile?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                </div>
                {!sidebarCollapsed && (
                  <div className="min-w-0 transition-opacity duration-200">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {profile?.full_name || user.email?.split('@')[0]}
                    </p>
                    <p className="text-xs text-text-muted truncate">{user.email}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Nav Items */}
          <nav className="flex-1 px-3 py-2 space-y-1">
            {/* Scan Button */}
            <button
              onClick={() => setShowScanner(true)}
              className={`w-full ${sidebarCollapsed ? 'p-3 justify-center' : 'px-3 py-3'} rounded-xl bg-primary/10 hover:bg-primary/15 text-primary flex items-center gap-3 transition-all duration-200 group`}
              title="Scan"
            >
              <div className="w-5 h-5 flex items-center justify-center">
                {getIcon('camera', false)}
              </div>
              {!sidebarCollapsed && <span className="text-sm font-medium">Scan</span>}
            </button>

            <div className="h-4" />

            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full ${sidebarCollapsed ? 'p-3 justify-center' : 'px-3 py-3'} rounded-xl flex items-center gap-3 transition-all duration-200 ${
                    isActive
                      ? 'bg-surface-elevated text-text-primary'
                      : 'text-text-muted hover:bg-surface-elevated/50 hover:text-text-secondary'
                  }`}
                  title={sidebarCollapsed ? tab.label : undefined}
                >
                  <div className="w-5 h-5 flex items-center justify-center">
                    {getIcon(tab.icon, isActive)}
                  </div>
                  {!sidebarCollapsed && (
                    <span className={`text-sm ${isActive ? 'font-medium' : ''}`}>{tab.label}</span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Lock Toggle Button */}
          <div className="px-3 pb-4">
            <button
              onClick={() => setSidebarLocked(!sidebarLocked)}
              className={`w-full ${sidebarCollapsed ? 'p-3 justify-center' : 'px-3 py-2.5'} rounded-xl flex items-center gap-3 transition-all duration-200 ${
                sidebarLocked
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-muted hover:bg-surface-elevated/50 hover:text-text-secondary'
              }`}
              title={sidebarLocked ? 'Unlock sidebar' : 'Lock sidebar open'}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                {sidebarLocked ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              {!sidebarCollapsed && (
                <span className="text-sm">{sidebarLocked ? 'Locked' : 'Lock open'}</span>
              )}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 ${sidebarCollapsed ? 'md:ml-18' : 'md:ml-60'} transition-all duration-300 ease-gentle`}>
          <div className="h-screen overflow-y-auto overflow-x-hidden pb-20 md:pb-0">
            {activeTab === 'dashboard' && (
              <div key="dashboard" className="animate-fade-in">
                <Dashboard key={dashboardKey} onOpenScanner={() => setShowScanner(true)} focusTimerProps={focusTimerProps} />
              </div>
            )}
            {activeTab === 'planner' && (
              <div key="planner" className="animate-fade-in">
                <Planner />
              </div>
            )}
            {activeTab === 'canvas' && (
              <div key="canvas" className="animate-fade-in">
                <CanvasHub />
              </div>
            )}
            {activeTab === 'study' && (
              <div key="study" className="animate-fade-in">
                <StudyHub />
              </div>
            )}
            {activeTab === 'tutor' && (
              <div key="tutor" className="animate-fade-in h-[calc(100vh-5rem)] md:h-screen">
                <AITutor />
              </div>
            )}
            {activeTab === 'account' && (
              <div key="account" className="animate-fade-in">
                <Account />
              </div>
            )}
          </div>
        </main>

        {/* Bottom Nav - Mobile */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-elevated/95 backdrop-blur-lg border-t border-border z-50 safe-area-pb">
          <div className="grid grid-cols-7 h-16">
            {/* First 3 tabs */}
            {tabs.slice(0, 3).map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                    isActive ? 'text-primary' : 'text-text-muted'
                  }`}
                >
                  {getIcon(tab.icon, isActive)}
                  <span className="text-[9px] font-medium">{tab.label}</span>
                </button>
              )
            })}

            {/* Center Scan Button */}
            <button
              onClick={() => setShowScanner(true)}
              className="flex items-center justify-center"
            >
              <div className="w-12 h-12 -mt-4 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 active:scale-95 transition-transform">
                {getIcon('camera', true)}
              </div>
            </button>

            {/* Last 3 tabs */}
            {tabs.slice(3, 6).map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                    isActive ? 'text-primary' : 'text-text-muted'
                  }`}
                >
                  {getIcon(tab.icon, isActive)}
                  <span className="text-[9px] font-medium">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </nav>
      </div>

      {/* Floating Focus Timer - shows when active and not on dashboard */}
      {focusTask && activeTab !== 'dashboard' && (
        <div className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50 animate-scale-in">
          <div className="bg-surface-elevated border border-primary/30 rounded-2xl shadow-lg shadow-primary/10 p-4 min-w-[200px]">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center ${focusActive && !focusPaused ? 'animate-pulse' : ''}`}>
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-primary font-medium uppercase tracking-wider">
                  {focusActive && !focusPaused ? 'Focusing' : 'Paused'}
                </p>
                <p className="text-sm font-medium text-text-primary truncate">{focusTask.title}</p>
              </div>
              <span className="text-2xl font-mono font-bold text-primary tabular-nums">
                {formatFocusTime(focusTime)}
              </span>
            </div>
            <div className="flex gap-2 mt-3">
              {focusActive && !focusPaused ? (
                <button
                  onClick={() => setFocusPaused(true)}
                  className="flex-1 py-2 px-3 bg-surface-overlay hover:bg-surface-base rounded-lg text-sm font-medium text-text-secondary transition-colors"
                >
                  Pause
                </button>
              ) : (
                <button
                  onClick={() => setFocusPaused(false)}
                  className="flex-1 py-2 px-3 bg-primary/20 hover:bg-primary/30 rounded-lg text-sm font-medium text-primary transition-colors"
                >
                  Resume
                </button>
              )}
              <button
                onClick={() => setActiveTab('dashboard')}
                className="flex-1 py-2 px-3 bg-primary hover:bg-primary-hover rounded-lg text-sm font-medium text-white transition-colors"
              >
                View
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
      <ConfirmDialogContainer />
    </StudyProvider>
  )
}

export default App
