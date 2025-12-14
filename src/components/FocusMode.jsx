/**
 * Focus Mode - Opal-Inspired Design
 * Clean, minimal interface for app blocking with one-tap presets
 */

import { useState, useEffect } from 'react'
import appBlockingService from '../services/appBlockingService'
import { APP_LIBRARY, APPS_BY_CATEGORY, DEFAULT_BLOCKING_LISTS } from '../data/appLibrary'

const FocusMode = () => {
  // Navigation
  const [currentView, setCurrentView] = useState('home') // home, app-selector, active

  // Data
  const [blockingLists, setBlockingLists] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [stats, setStats] = useState(null)

  // Selection state
  const [selectedApps, setSelectedApps] = useState([])
  const [selectedList, setSelectedList] = useState(null)
  const [selectedDuration, setSelectedDuration] = useState(60)

  // UI state
  const [loading, setLoading] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDurationPicker, setShowDurationPicker] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  // Timer countdown for active session
  useEffect(() => {
    if (!activeSession) return

    const interval = setInterval(() => {
      const now = new Date()
      const endTime = new Date(activeSession.end_time)
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000))

      setTimeRemaining(remaining)

      if (remaining === 0) {
        handleEndSession()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [activeSession])

  const loadData = async () => {
    const [session, lists, statistics] = await Promise.all([
      appBlockingService.getActiveSession(),
      appBlockingService.getBlockingLists(),
      appBlockingService.getStats(),
    ])

    setActiveSession(session)
    setBlockingLists(lists)
    setStats(statistics)

    if (session) {
      setCurrentView('active')
    }

    // Create default lists if none exist
    if (lists.length === 0) {
      await createDefaultLists()
    }
  }

  const createDefaultLists = async () => {
    for (const preset of DEFAULT_BLOCKING_LISTS) {
      await appBlockingService.createBlockingList({
        name: preset.name,
        description: preset.description,
        appIds: preset.appIds,
        icon: preset.icon,
        color: preset.color,
        isDefault: true,
      })
    }
    const lists = await appBlockingService.getBlockingLists()
    setBlockingLists(lists)
  }

  const handleQuickStart = async (list, duration) => {
    setLoading(true)
    try {
      const session = await appBlockingService.createSession({
        blockedApps: list.app_ids,
        duration: duration,
        blockingListId: list.id,
        sessionType: 'manual',
      })

      setActiveSession(session)
      setCurrentView('active')
      await loadData()
    } catch (error) {
      console.error('Failed to start focus session:', error)
      alert('Failed to start focus session')
    } finally {
      setLoading(false)
    }
  }

  const handleStartCustom = () => {
    setSelectedApps([])
    setCurrentView('app-selector')
  }

  const toggleApp = (appId) => {
    setSelectedApps(prev =>
      prev.includes(appId)
        ? prev.filter(id => id !== appId)
        : [...prev, appId]
    )
  }

  const handleStartWithCustomApps = async () => {
    if (selectedApps.length === 0) {
      alert('Please select at least one app to block')
      return
    }

    setLoading(true)
    try {
      const session = await appBlockingService.createSession({
        blockedApps: selectedApps,
        duration: selectedDuration,
        sessionType: 'manual',
      })

      setActiveSession(session)
      setCurrentView('active')
      await loadData()
    } catch (error) {
      console.error('Failed to start focus session:', error)
      alert('Failed to start focus session')
    } finally {
      setLoading(false)
    }
  }

  const handleEndSession = async () => {
    if (!activeSession) return

    try {
      await appBlockingService.endSession(activeSession.id)
      setActiveSession(null)
      setCurrentView('home')
      setSelectedApps([])
      setSelectedList(null)
      await loadData()
    } catch (error) {
      console.error('Failed to end session:', error)
    }
  }

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`
  }

  const getProgressPercentage = () => {
    if (!activeSession) return 0
    const total = activeSession.duration_minutes * 60
    const elapsed = total - timeRemaining
    return Math.min(100, (elapsed / total) * 100)
  }

  const getAppById = (appId) => APP_LIBRARY.find(a => a.id === appId)

  // Duration presets
  const durations = [
    { minutes: 15, label: '15m', emoji: '⚡' },
    { minutes: 30, label: '30m', emoji: '🎯' },
    { minutes: 60, label: '1h', emoji: '🔥' },
    { minutes: 120, label: '2h', emoji: '💪' },
  ]

  // ===================================
  // ACTIVE SESSION VIEW (Opal-style)
  // ===================================
  if (currentView === 'active' && activeSession) {
    const progress = getProgressPercentage()

    return (
      <div className="min-h-screen bg-[#0D0D0F] px-5 md:px-8 lg:px-12 pb-24 md:pb-12 pt-12 md:pt-16 lg:pt-20">
        <div className="max-w-md md:max-w-2xl lg:max-w-3xl xl:max-w-4xl mx-auto">
          {/* Timer Circle */}
          <div className="relative w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 xl:w-[28rem] xl:h-[28rem] mx-auto mb-8 md:mb-12 lg:mb-16 animate-timer-pulse rounded-full">
            {/* Ambient Glow Background */}
            <div className="absolute inset-0 rounded-full bg-[#4E30BD]/10 blur-2xl animate-opal-breathe" />

            {/* Background Circle */}
            <svg className="w-full h-full -rotate-90 animate-ring-glow relative z-10" viewBox="0 0 256 256">
              <circle
                cx="128"
                cy="128"
                r="120"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-dark-bg-tertiary md:stroke-[10] lg:stroke-[12]"
              />
              {/* Progress Circle */}
              <circle
                cx="128"
                cy="128"
                r="120"
                stroke="url(#opal-gradient)"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 120}`}
                strokeDashoffset={`${2 * Math.PI * 120 * (1 - progress / 100)}`}
                className="transition-[stroke-dashoffset] duration-1000 ease-out md:stroke-[10] lg:stroke-[12]"
                style={{ filter: 'drop-shadow(0 0 10px rgba(78, 48, 189, 0.5))' }}
              />
              <defs>
                <linearGradient id="opal-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4E30BD" />
                  <stop offset="50%" stopColor="#7C5CFF" />
                  <stop offset="100%" stopColor="#A0FFF9" />
                </linearGradient>
              </defs>
            </svg>

            {/* Timer Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
              <div className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-[#7C5CFF] to-[#A0FFF9] tabular-nums font-mono mb-2 md:mb-3 lg:mb-4 drop-shadow-[0_0_15px_rgba(124,92,255,0.5)]">
                {formatTime(timeRemaining)}
              </div>
              <p className="text-sm md:text-base lg:text-lg text-dark-text-muted uppercase tracking-widest">Remaining</p>
            </div>
          </div>

          {/* Session Info */}
          <div className="text-center mb-8 md:mb-10 lg:mb-12">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-dark-text-primary mb-2">
              Stay focused
            </h2>
            <p className="text-sm md:text-base lg:text-lg text-dark-text-secondary">
              {activeSession.blocked_apps.length} apps blocked
            </p>
          </div>

          {/* Blocked Apps Preview */}
          <div className="flex justify-center gap-2 md:gap-3 lg:gap-4 mb-8 md:mb-10 lg:mb-12 flex-wrap max-w-xs md:max-w-md lg:max-w-2xl mx-auto">
            {activeSession.blocked_apps.slice(0, 8).map(appId => {
              const app = getAppById(appId)
              return app ? (
                <div
                  key={appId}
                  className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-xl md:rounded-2xl bg-dark-bg-tertiary border border-dark-border-subtle opacity-40 grayscale flex items-center justify-center text-xl md:text-2xl lg:text-3xl transition-all hover:opacity-60 hover:scale-105"
                >
                  {app.icon}
                </div>
              ) : null
            })}
            {activeSession.blocked_apps.length > 8 && (
              <div className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-xl md:rounded-2xl bg-dark-bg-tertiary border border-dark-border-subtle opacity-40 flex items-center justify-center">
                <span className="text-xs md:text-sm lg:text-base text-dark-text-muted font-semibold">
                  +{activeSession.blocked_apps.length - 8}
                </span>
              </div>
            )}
          </div>

          {/* End Button */}
          <button
            onClick={handleEndSession}
            className="w-full max-w-sm md:max-w-md lg:max-w-lg mx-auto block py-4 md:py-5 lg:py-6 px-6 md:px-8 lg:px-10 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white font-semibold text-base md:text-lg lg:text-xl rounded-full hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] hover:scale-105 transition-all duration-200 active:scale-95"
          >
            End Session
          </button>
        </div>
      </div>
    )
  }

  // ===================================
  // APP SELECTOR VIEW (Opal-style)
  // ===================================
  if (currentView === 'app-selector') {
    const filteredApps = searchQuery
      ? APP_LIBRARY.filter(app =>
          app.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : APP_LIBRARY

    return (
      <div className="pb-6 md:pb-8 lg:pb-12 animate-fadeIn bg-[#0D0D0F] min-h-screen px-4 md:px-6 lg:px-8">
        <div className="max-w-md md:max-w-3xl lg:max-w-5xl xl:max-w-7xl mx-auto">
          {/* Header */}
          <div className="sticky top-0 bg-[#0D0D0F]/95 backdrop-blur-xl z-20 pb-4 md:pb-6 mb-4 md:mb-6 lg:mb-8">
            <div className="flex items-center gap-4 md:gap-6 mb-4 md:mb-6">
            <button
              onClick={() => setCurrentView('home')}
              className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full bg-dark-bg-secondary border border-dark-border-glow flex items-center justify-center hover:border-primary-500 hover:scale-110 transition-all active:scale-95"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6 text-dark-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex-1">
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-dark-text-primary">Select apps to block</h1>
              <p className="text-xs md:text-sm lg:text-base text-dark-text-muted">{selectedApps.length} selected</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4 md:mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search apps..."
              className="w-full px-4 md:px-6 py-3 md:py-4 pl-11 md:pl-14 rounded-2xl bg-dark-bg-secondary border border-dark-border-glow text-dark-text-primary text-base md:text-lg placeholder:text-dark-text-muted focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
            />
            <svg className="w-5 h-5 md:w-6 md:h-6 text-dark-text-muted absolute left-3.5 md:left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Duration Pills */}
          <div className="flex gap-2 md:gap-3 lg:gap-4 overflow-x-auto scrollbar-hide pb-1">
            {durations.map(preset => (
              <button
                key={preset.minutes}
                onClick={() => setSelectedDuration(preset.minutes)}
                className={`flex-shrink-0 px-4 md:px-6 lg:px-8 py-2 md:py-3 rounded-full font-semibold text-sm md:text-base lg:text-lg transition-all duration-200 active:scale-95 ${
                  selectedDuration === preset.minutes
                    ? 'bg-gradient-to-r from-[#4E30BD] to-[#7C5CFF] text-white shadow-glow-opal scale-105'
                    : 'bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-dark-text-secondary hover:scale-105 hover:border-[#7C5CFF]/30'
                }`}
              >
                {preset.emoji} {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Apps Grid */}
        <div className="space-y-6 md:space-y-8 lg:space-y-10">
          {Object.entries(APPS_BY_CATEGORY).map(([category, apps]) => {
            const categoryApps = searchQuery
              ? apps.filter(app => filteredApps.includes(app))
              : apps

            if (categoryApps.length === 0) return null

            return (
              <div key={category}>
                <h3 className="text-xs md:text-sm lg:text-base font-bold text-dark-text-muted uppercase tracking-wider mb-3 md:mb-4 lg:mb-5 px-1">
                  {category}
                </h3>
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3 md:gap-4 lg:gap-5">
                  {categoryApps.map(app => {
                    const isSelected = selectedApps.includes(app.id)
                    return (
                      <button
                        key={app.id}
                        onClick={() => toggleApp(app.id)}
                        className={`relative flex flex-col items-center gap-2 md:gap-3 p-3 md:p-4 lg:p-5 rounded-2xl transition-all duration-200 active:scale-95 hover:scale-105 ${
                          isSelected
                            ? 'bg-[rgba(78,48,189,0.15)] ring-2 ring-[#7C5CFF]'
                            : 'bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)]'
                        }`}
                      >
                        <div className={`w-14 h-14 md:w-16 md:h-16 lg:w-18 lg:h-18 rounded-2xl bg-gradient-to-br ${app.gradient} flex items-center justify-center text-2xl md:text-3xl shadow-soft-md transition-transform duration-200 ${
                          isSelected ? 'scale-90' : ''
                        }`}>
                          {app.icon}
                        </div>
                        <span className={`text-xs md:text-sm text-center font-medium leading-tight transition-colors duration-200 ${
                          isSelected ? 'text-[#A0FFF9]' : 'text-dark-text-muted'
                        }`}>
                          {app.name}
                        </span>
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-r from-[#4E30BD] to-[#7C5CFF] flex items-center justify-center shadow-glow-opal animate-opal-checkmark">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Start Button */}
        {selectedApps.length > 0 && (
          <div className="fixed bottom-20 md:bottom-8 lg:bottom-12 left-0 right-0 px-5 md:px-8 lg:px-12 z-10 flex justify-center">
            <button
              onClick={handleStartWithCustomApps}
              disabled={loading}
              className="w-full max-w-md md:max-w-2xl lg:max-w-3xl mx-auto py-4 md:py-5 lg:py-6 px-6 md:px-8 lg:px-10 bg-gradient-to-r from-[#4E30BD] to-[#7C5CFF] text-white font-bold text-lg md:text-xl lg:text-2xl rounded-full shadow-glow-opal-lg hover:shadow-glow-opal-xl hover:scale-[1.03] transition-all duration-300 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 md:gap-4"
            >
              {loading ? (
                <>
                  <div className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Starting...</span>
                </>
              ) : (
                <>
                  <svg className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Start Focus ({selectedDuration}min)</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
      </div>
    )
  }

  // ===================================
  // HOME VIEW (Opal-style)
  // ===================================
  return (
    <div className="space-y-8 md:space-y-10 lg:space-y-12 pb-6 md:pb-8 lg:pb-12 px-6 md:px-8 lg:px-12 animate-fadeIn bg-[#0D0D0F] min-h-screen">
      <div className="max-w-md md:max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center pt-4 md:pt-6 lg:pt-8">
          <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#4E30BD] via-[#7C5CFF] to-[#A0FFF9] bg-[length:200%_200%] animate-opal-gradient mb-2 md:mb-3">
            Focus
          </h1>
          <p className="text-sm md:text-base lg:text-lg text-dark-text-secondary">Block apps and stay in the zone</p>
        </div>

        {/* Stats */}
        {stats && stats.totalSessions > 0 && (
          <div className="bg-[rgba(255,255,255,0.05)] backdrop-blur-xl rounded-3xl p-6 md:p-8 lg:p-10 border border-[rgba(255,255,255,0.1)] animate-opal-card-enter">
            <div className="grid grid-cols-3 gap-4 md:gap-8 lg:gap-12 text-center">
              <div>
                <div className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-[#A0FFF9]">{stats.totalHoursBlocked || 0}h</div>
                <div className="text-xs md:text-sm lg:text-base text-dark-text-muted mt-1 md:mt-2">Focused</div>
              </div>
              <div>
                <div className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-[#7C5CFF]">{stats.totalSessions}</div>
                <div className="text-xs md:text-sm lg:text-base text-dark-text-muted mt-1 md:mt-2">Sessions</div>
              </div>
              <div>
                <div className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-[#A0FFF9]">{stats.longestStreak || 0}</div>
                <div className="text-xs md:text-sm lg:text-base text-dark-text-muted mt-1 md:mt-2">Day Streak</div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Start Presets */}
        <div>
          <h3 className="text-xs md:text-sm lg:text-base font-bold text-dark-text-secondary uppercase tracking-[0.2em] mb-4 md:mb-6 lg:mb-8 px-1">Quick Start</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 lg:gap-6">
          {blockingLists.slice(0, 4).map((list, index) => {
            const appCount = list.app_ids?.length || 0
            const previewApps = list.app_ids?.slice(0, 4).map(getAppById).filter(Boolean) || []

            return (
              <div
                key={list.id}
                className="bg-[rgba(255,255,255,0.05)] backdrop-blur-xl rounded-2xl p-6 border border-[rgba(255,255,255,0.1)] hover:border-[rgba(124,92,255,0.5)] transition-all duration-300 animate-opal-card-enter"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-cyan/20 flex items-center justify-center text-2xl">
                      {list.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-dark-text-primary">{list.name}</h4>
                      <p className="text-xs text-dark-text-muted">{appCount} apps</p>
                    </div>
                  </div>
                </div>

                {/* App Preview */}
                <div className="flex gap-2 mb-4">
                  {previewApps.map(app => (
                    <div
                      key={app.id}
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${app.gradient} flex items-center justify-center text-lg shadow-soft-sm`}
                    >
                      {app.icon}
                    </div>
                  ))}
                  {appCount > 4 && (
                    <div className="w-10 h-10 rounded-xl bg-dark-bg-tertiary border border-dark-border-subtle flex items-center justify-center">
                      <span className="text-xs text-dark-text-muted font-semibold">+{appCount - 4}</span>
                    </div>
                  )}
                </div>

                {/* Duration Buttons */}
                <div className="grid grid-cols-4 gap-2">
                  {durations.map(preset => (
                    <button
                      key={preset.minutes}
                      onClick={() => handleQuickStart(list, preset.minutes)}
                      disabled={loading}
                      className="py-2.5 px-3 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] hover:border-[#7C5CFF] hover:bg-[rgba(78,48,189,0.15)] text-white font-semibold text-sm rounded-full transition-all duration-200 active:scale-95 disabled:opacity-50"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Custom Block Button */}
      <button
        onClick={handleStartCustom}
        className="w-full py-5 px-6 bg-gradient-to-r from-[#4E30BD] via-[#7C5CFF] to-[#A0FFF9] text-white font-bold text-lg rounded-full shadow-glow-opal-lg hover:shadow-glow-opal-xl hover:scale-[1.03] transition-all duration-300 active:scale-95 flex items-center justify-center gap-3"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span>Custom Block</span>
      </button>

      {/* Database Setup Reminder */}
      {(!blockingLists || blockingLists.length === 0) && (
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-2xl p-4 border border-amber-500/30">
          <div className="flex gap-3">
            <div className="flex-shrink-0 text-2xl">⚠️</div>
            <div>
              <h4 className="text-sm font-semibold text-dark-text-primary mb-1">Setup Required</h4>
              <p className="text-xs text-dark-text-secondary leading-relaxed">
                Run FOCUS_MODE_DATABASE.sql in Supabase to enable Focus Mode features.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FocusMode
