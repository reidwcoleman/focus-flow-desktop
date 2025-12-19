/**
 * Planner Component - AI-Optimized Calendar
 * Smart calendar with AI-powered activity creation
 */

import { useState, useEffect, useRef } from 'react'
import calendarService from '../services/calendarService'
import activityParserService from '../services/activityParserService'
import { CalendarSkeleton, ActivitySkeleton, StatCardSkeleton } from './LoadingSkeleton'

const Planner = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [activities, setActivities] = useState([])
  const [dayActivities, setDayActivities] = useState([])
  const [loading, setLoading] = useState(false)
  const [aiInput, setAiInput] = useState('')
  const [aiProcessing, setAiProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showExamples, setShowExamples] = useState(false)
  const [viewMode, setViewMode] = useState('calendar') // 'calendar' or 'upcoming'
  const [filterType, setFilterType] = useState('all') // 'all' or specific activity type
  const [flyingAwayItems, setFlyingAwayItems] = useState(new Set())
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  useEffect(() => {
    loadActivities()
  }, [currentDate])

  useEffect(() => {
    loadDayActivities()
  }, [selectedDate, activities])

  const loadActivities = async () => {
    setLoading(true)
    try {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      const data = await calendarService.getActivitiesForMonth(year, month)
      setActivities(data)
    } catch (err) {
      console.error('Failed to load activities:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadDayActivities = () => {
    const dateStr = selectedDate.toISOString().split('T')[0]
    const filtered = activities.filter(a => a.activity_date === dateStr)
    // Sort by time
    const sorted = filtered.sort((a, b) => {
      if (!a.start_time && !b.start_time) return 0
      if (!a.start_time) return 1
      if (!b.start_time) return -1
      return a.start_time.localeCompare(b.start_time)
    })
    setDayActivities(sorted)
  }

  const handleAiCreate = async () => {
    if (!aiInput.trim()) return

    setAiProcessing(true)
    setError('')
    setSuccess('')

    try {
      // Parse activity with AI
      const activityData = await activityParserService.parseActivity(aiInput)

      // Create activity in database
      await calendarService.createActivity(activityData)

      // Reload activities
      await loadActivities()

      // Show success
      setSuccess(`Created: ${activityData.title}`)
      setAiInput('')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Failed to create activity:', err)
      setError('Failed to create activity. Try being more specific.')
      setTimeout(() => setError(''), 5000)
    } finally {
      setAiProcessing(false)
    }
  }

  const handleToggleComplete = async (id, currentStatus) => {
    try {
      const newStatus = !currentStatus

      // If marking as complete, trigger fly-away animation
      if (newStatus) {
        // Optimistically update the UI to show completed state
        setActivities(prev => prev.map(a =>
          a.id === id ? { ...a, is_completed: true } : a
        ))

        // Small delay to show the checkmark before flying away
        setTimeout(() => {
          setFlyingAwayItems(prev => new Set([...prev, id]))
        }, 100)

        // Wait for animation to complete, then remove from UI
        setTimeout(async () => {
          // Update in database
          await calendarService.toggleCompletion(id, true)

          // Remove from UI
          setActivities(prev => prev.filter(a => a.id !== id))
          setFlyingAwayItems(prev => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
        }, 1000) // Matched to new 0.85s animation + 150ms buffer
      } else {
        // If unchecking, update immediately without animation
        await calendarService.toggleCompletion(id, false)

        // Update local state optimistically
        setActivities(prev => prev.map(a =>
          a.id === id ? { ...a, is_completed: false } : a
        ))
      }
    } catch (err) {
      console.error('Failed to toggle completion:', err)
      // Reload on error
      await loadActivities()
    }
  }

  const handleDeleteActivity = async (id) => {
    if (confirm('Delete this activity?')) {
      try {
        await calendarService.deleteActivity(id)
        await loadActivities()
      } catch (err) {
        console.error('Failed to delete activity:', err)
      }
    }
  }

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const days = []
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }
    // Add days of month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    return days
  }

  const getActivitiesForDay = (day) => {
    if (!day) return []
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      .toISOString().split('T')[0]
    return activities.filter(a => a.activity_date === dateStr)
  }

  const isToday = (day) => {
    const today = new Date()
    return day &&
      currentDate.getFullYear() === today.getFullYear() &&
      currentDate.getMonth() === today.getMonth() &&
      day === today.getDate()
  }

  const isSelected = (day) => {
    return day &&
      currentDate.getFullYear() === selectedDate.getFullYear() &&
      currentDate.getMonth() === selectedDate.getMonth() &&
      day === selectedDate.getDate()
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDate(today)
  }

  // Swipe gesture handlers
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e) => {
    touchEndX.current = e.changedTouches[0].clientX
    handleSwipe()
  }

  const handleSwipe = () => {
    const swipeDistance = touchStartX.current - touchEndX.current
    const minSwipeDistance = 50

    if (swipeDistance > minSwipeDistance) {
      // Swiped left - next month
      nextMonth()
    } else if (swipeDistance < -minSwipeDistance) {
      // Swiped right - previous month
      previousMonth()
    }
  }

  const getUpcomingActivities = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const nextWeek = new Date(today)
    nextWeek.setDate(today.getDate() + 7)

    return activities
      .filter(a => {
        const actDate = new Date(a.activity_date)
        return actDate >= today && actDate <= nextWeek
      })
      .sort((a, b) => {
        const dateCompare = a.activity_date.localeCompare(b.activity_date)
        if (dateCompare !== 0) return dateCompare
        if (!a.start_time && !b.start_time) return 0
        if (!a.start_time) return 1
        if (!b.start_time) return -1
        return a.start_time.localeCompare(b.start_time)
      })
  }

  const getFilteredActivities = (activityList) => {
    if (filterType === 'all') return activityList
    return activityList.filter(a => a.activity_type === filterType)
  }

  const getTypeColor = (type) => {
    const colors = {
      task: 'bg-blue-500',
      class: 'bg-purple-500',
      study: 'bg-cyan-500',
      break: 'bg-green-500',
      event: 'bg-amber-500',
      meeting: 'bg-red-500',
      assignment: 'bg-pink-500',
    }
    return colors[type] || 'bg-blue-500'
  }

  const activityTypes = ['all', 'study', 'class', 'task', 'assignment', 'event', 'break']

  const getTotalHours = () => {
    return activities.reduce((sum, a) => sum + (a.duration_minutes || 0), 0) / 60
  }

  const getTimeOfDay = (time) => {
    if (!time) return 'No time'
    const hour = parseInt(time.split(':')[0])
    if (hour < 12) return 'Morning'
    if (hour < 17) return 'Afternoon'
    return 'Evening'
  }

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8 pb-6 md:pb-8 lg:pb-10 animate-fadeIn">
      {/* Header with Stats */}
      <div>
        <div className="flex items-start justify-between mb-4 md:mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark-text-primary mb-1">Smart Calendar</h1>
            <p className="text-sm md:text-base text-dark-text-secondary">AI-powered activity planning</p>
          </div>
          <div className="text-right">
            <div className="text-xl md:text-2xl lg:text-3xl font-bold text-primary-500">{activities.length}</div>
            <div className="text-xs md:text-sm text-dark-text-muted">activities</div>
          </div>
        </div>

        {/* Quick Stats */}
        {loading ? (
          <div className="flex gap-2 md:gap-3 lg:gap-4 mt-2">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
        ) : activities.length > 0 && (
          <div className="flex gap-3 md:gap-4 mt-3 md:mt-4 animate-fadeIn">
            <div className="flex-1 bg-dark-bg-secondary rounded-xl p-3 md:p-4 border border-dark-border-subtle">
              <div className="text-xs md:text-sm text-dark-text-muted">Total Hours</div>
              <div className="text-xl md:text-2xl lg:text-3xl font-bold text-dark-text-primary mt-1">{getTotalHours().toFixed(1)}h</div>
            </div>
            <div className="flex-1 bg-dark-bg-secondary rounded-xl p-3 md:p-4 border border-dark-border-subtle">
              <div className="text-xs md:text-sm text-dark-text-muted">Completed</div>
              <div className="text-xl md:text-2xl lg:text-3xl font-bold text-green-500 mt-1">
                {activities.filter(a => a.is_completed).length}
              </div>
            </div>
            <div className="flex-1 bg-dark-bg-secondary rounded-xl p-3 md:p-4 border border-dark-border-subtle">
              <div className="text-xs md:text-sm text-dark-text-muted">Pending</div>
              <div className="text-xl md:text-2xl lg:text-3xl font-bold text-amber-500 mt-1">
                {activities.filter(a => !a.is_completed).length}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Activity Input */}
      <div className="bg-dark-bg-secondary rounded-xl md:rounded-2xl p-4 md:p-5 lg:p-6 border border-dark-border-subtle">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-3 md:mb-4 lg:mb-5 p-2.5 md:p-3 lg:p-4 rounded-xl md:rounded-2xl bg-green-500/10 border border-green-500/30 animate-fadeIn">
            <p className="text-green-400 text-xs md:text-sm lg:text-base font-medium">{success}</p>
          </div>
        )}
        {error && (
          <div className="mb-3 md:mb-4 lg:mb-5 p-2.5 md:p-3 lg:p-4 rounded-xl md:rounded-2xl bg-red-500/10 border border-red-500/30 animate-fadeIn">
            <p className="text-red-400 text-xs md:text-sm lg:text-base font-medium">{error}</p>
          </div>
        )}

        <div className="flex gap-2 md:gap-3 lg:gap-4">
          <input
            type="text"
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAiCreate()}
            placeholder="Study chemistry tomorrow at 3pm..."
            className="flex-1 px-3 md:px-4 lg:px-5 xl:px-6 py-2.5 md:py-3 lg:py-4 text-sm md:text-base lg:text-lg rounded-xl md:rounded-2xl bg-dark-bg-tertiary border border-dark-border-glow text-dark-text-primary placeholder:text-dark-text-muted focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
            disabled={aiProcessing}
          />
          <button
            onClick={handleAiCreate}
            disabled={aiProcessing || !aiInput.trim()}
            className="px-4 md:px-5 lg:px-6 py-2.5 md:py-3 lg:py-4 bg-gradient-to-r from-primary-500 to-accent-cyan text-white text-sm md:text-base font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center gap-2"
          >
            {aiProcessing ? (
              <div className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <svg className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="hidden sm:inline">Create</span>
              </>
            )}
          </button>
        </div>

        {/* Pro Tip */}
        <div className="mt-2.5 md:mt-3 lg:mt-4 flex items-start gap-1.5 md:gap-2 text-[10px] md:text-xs lg:text-sm text-dark-text-muted">
          <svg className="w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 flex-shrink-0 mt-0.5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <p>
            <span className="font-semibold text-primary-500">Pro tip:</span> Use specific dates like "on the 17th" for best accuracy. Days of the week like "Monday" or "Friday" also work well!
          </p>
        </div>

        {/* Collapsible Examples */}
        <button
          onClick={() => setShowExamples(!showExamples)}
          className="mt-2 md:mt-3 flex items-center gap-1.5 md:gap-2 text-xs md:text-sm lg:text-base text-dark-text-secondary hover:text-primary-500 transition-colors"
        >
          <svg
            className={`w-3.5 h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 transition-transform ${showExamples ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-medium">{showExamples ? 'Hide' : 'Show'} examples</span>
        </button>

        {showExamples && (
          <div className="mt-2 md:mt-3 lg:mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 lg:gap-4 animate-fadeIn">
            <button
              onClick={() => { setAiInput("Study chemistry tomorrow at 3pm for 2 hours"); setShowExamples(false); }}
              className="text-xs md:text-sm lg:text-base px-2.5 md:px-3 lg:px-4 py-2 md:py-2.5 lg:py-3 rounded-lg md:rounded-xl bg-dark-bg-tertiary border border-dark-border-subtle text-dark-text-muted hover:text-primary-500 hover:border-primary-500/50 hover:scale-105 transition-all text-left"
            >
              Study tomorrow 3pm
            </button>
            <button
              onClick={() => { setAiInput("Math quiz on Friday"); setShowExamples(false); }}
              className="text-xs md:text-sm lg:text-base px-2.5 md:px-3 lg:px-4 py-2 md:py-2.5 lg:py-3 rounded-lg md:rounded-xl bg-dark-bg-tertiary border border-dark-border-subtle text-dark-text-muted hover:text-primary-500 hover:border-primary-500/50 hover:scale-105 transition-all text-left"
            >
              Quiz on Friday
            </button>
            <button
              onClick={() => { setAiInput("finish physics homework on the 17th"); setShowExamples(false); }}
              className="text-xs md:text-sm lg:text-base px-2.5 md:px-3 lg:px-4 py-2 md:py-2.5 lg:py-3 rounded-lg md:rounded-xl bg-dark-bg-tertiary border border-dark-border-subtle text-dark-text-muted hover:text-primary-500 hover:border-primary-500/50 hover:scale-105 transition-all text-left"
            >
              Homework on 17th
            </button>
            <button
              onClick={() => { setAiInput("chemistry lab Monday at 2pm"); setShowExamples(false); }}
              className="text-xs md:text-sm lg:text-base px-2.5 md:px-3 lg:px-4 py-2 md:py-2.5 lg:py-3 rounded-lg md:rounded-xl bg-dark-bg-tertiary border border-dark-border-subtle text-dark-text-muted hover:text-primary-500 hover:border-primary-500/50 hover:scale-105 transition-all text-left"
            >
              Lab Monday 2pm
            </button>
          </div>
        )}
      </div>

      {/* View Mode Toggle & Filters */}
      <div className="space-y-2 md:space-y-3 lg:space-y-4">
        {/* View Toggle */}
        <div className="flex gap-2 md:gap-3">
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex-1 py-2 md:py-3 px-3 md:px-4 rounded-xl font-semibold text-sm md:text-base transition-all flex items-center justify-center gap-2 ${
              viewMode === 'calendar'
                ? 'bg-gradient-to-r from-primary-500 to-accent-cyan text-white'
                : 'bg-dark-bg-secondary text-dark-text-secondary border border-dark-border-subtle'
            }`}
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="hidden md:inline">Calendar</span>
          </button>
          <button
            onClick={() => setViewMode('upcoming')}
            className={`flex-1 py-2 md:py-3 px-3 md:px-4 rounded-xl font-semibold text-sm md:text-base transition-all flex items-center justify-center gap-2 ${
              viewMode === 'upcoming'
                ? 'bg-gradient-to-r from-primary-500 to-accent-cyan text-white'
                : 'bg-dark-bg-secondary text-dark-text-secondary border border-dark-border-subtle'
            }`}
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span className="hidden md:inline">Upcoming</span>
          </button>
        </div>

        {/* Activity Type Filters */}
        <div className="flex gap-2 md:gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {activityTypes.map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-semibold whitespace-nowrap transition-all ${
                filterType === type
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-bg-tertiary text-dark-text-secondary border border-dark-border-subtle'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        {/* Color Legend - Only show in calendar mode */}
        {viewMode === 'calendar' && (
          <div className="bg-dark-bg-secondary rounded-xl p-3 md:p-4 border border-dark-border-subtle">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-primary-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
              <h4 className="text-sm md:text-base lg:text-lg font-bold text-dark-text-primary">What the Colors Mean</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              {/* Assignments/Tasks - RED */}
              <div className="flex items-center gap-3 p-2 md:p-3 rounded-xl bg-dark-bg-tertiary/50 border border-dark-border-subtle">
                <div className="relative">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-br from-red-500/80 to-orange-500/80 border-[3px] border-red-400/80 shadow-lg shadow-red-500/50 flex items-center justify-center">
                    <svg className="w-5 h-5 md:w-6 md:h-6 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center text-xs font-extrabold text-red-900 border-2 border-yellow-300 shadow-xl">
                    3
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-sm md:text-base font-bold text-red-400">🔴 RED - Assignments</div>
                  <div className="text-xs md:text-sm text-dark-text-muted mt-0.5">Tasks & homework due</div>
                </div>
              </div>

              {/* Classes - PURPLE */}
              <div className="flex items-center gap-3 p-2 md:p-3 rounded-xl bg-dark-bg-tertiary/50 border border-dark-border-subtle">
                <div className="relative">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-br from-purple-500/70 to-pink-500/70 border-[3px] border-purple-400/70 shadow-lg shadow-purple-500/50"></div>
                  <div className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-white rounded-full flex items-center justify-center text-xs font-extrabold text-primary-600 border-2 border-white shadow-xl">
                    2
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-sm md:text-base font-bold text-purple-400">🟣 PURPLE - Classes</div>
                  <div className="text-xs md:text-sm text-dark-text-muted mt-0.5">Scheduled classes</div>
                </div>
              </div>

              {/* Other Activities - CYAN */}
              <div className="flex items-center gap-3 p-2 md:p-3 rounded-xl bg-dark-bg-tertiary/50 border border-dark-border-subtle">
                <div className="relative">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-br from-cyan-500/70 to-blue-500/70 border-[3px] border-cyan-400/70 shadow-lg shadow-cyan-500/50"></div>
                  <div className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-white rounded-full flex items-center justify-center text-xs font-extrabold text-primary-600 border-2 border-white shadow-xl">
                    1
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-sm md:text-base font-bold text-cyan-400">🔵 BLUE - Activities</div>
                  <div className="text-xs md:text-sm text-dark-text-muted mt-0.5">Events & meetings</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        loading ? (
          <CalendarSkeleton />
        ) : (
          <div
            className="bg-dark-bg-secondary rounded-xl md:rounded-2xl p-4 md:p-5 lg:p-6 border border-dark-border-subtle animate-fadeIn"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
          <div className="flex items-center justify-between mb-4 md:mb-5 lg:mb-6 xl:mb-8">
            <h2 className="text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold text-dark-text-primary">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={goToToday}
                className="px-3 md:px-4 py-1.5 md:py-2 rounded-lg bg-primary-500/10 border border-primary-500/30 text-primary-500 text-xs md:text-sm font-semibold transition-colors"
              >
                Today
              </button>
              <button
                onClick={previousMonth}
                className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-dark-bg-tertiary border border-dark-border-subtle text-dark-text-primary transition-colors"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={nextMonth}
                className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-dark-bg-tertiary border border-dark-border-subtle text-dark-text-primary transition-colors"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Day Names */}
          <div className="grid grid-cols-7 gap-0.5 md:gap-1 lg:gap-1.5 mb-1 md:mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-[10px] md:text-xs lg:text-sm xl:text-base font-bold text-dark-text-muted py-1 md:py-1.5 lg:py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1 md:gap-1.5 lg:gap-2 xl:gap-3">
            {getDaysInMonth().map((day, index) => {
              const dayActivities = getFilteredActivities(getActivitiesForDay(day))
              const hasActivities = dayActivities.length > 0

              return (
                <button
                  key={index}
                  onClick={() => day && setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                  disabled={!day}
                  className={`aspect-square rounded-lg p-1 transition-all text-center relative ${
                    !day
                      ? 'invisible'
                      : isSelected(day)
                      ? 'bg-gradient-to-br from-primary-500 to-accent-cyan text-white'
                      : isToday(day)
                      ? 'bg-primary-500/20 border-2 border-primary-500 text-dark-text-primary font-bold'
                      : hasActivities
                      ? 'bg-amber-500/20 border-2 border-amber-500 text-dark-text-primary font-bold'
                      : 'bg-dark-bg-tertiary text-dark-text-muted border border-dark-border-subtle'
                  }`}
                >
                  {day && (
                    <div className="flex flex-col items-center justify-center h-full relative">
                      <span className={`text-xs md:text-sm lg:text-base xl:text-lg font-bold ${isSelected(day) ? 'text-white' : hasActivities ? 'text-amber-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]' : ''}`}>
                        {day}
                      </span>
                      {hasActivities && dayActivities.length > 0 && (
                        <div className={`absolute -top-1 -right-1 min-w-[20px] h-[20px] md:min-w-[24px] md:h-[24px] flex items-center justify-center rounded-full text-xs md:text-sm font-bold border-2 ${
                          isSelected(day)
                            ? 'bg-white text-primary-500 border-white'
                            : 'bg-amber-500 text-white border-amber-600'
                        }`}>
                          {dayActivities.length}
                        </div>
                      )}
                      {hasActivities && (
                        <div className="flex gap-1 md:gap-1.5 mt-1 md:mt-1.5">
                          {dayActivities.slice(0, 3).map((activity, i) => (
                            <div
                              key={i}
                              className={`w-1.5 h-1.5 md:w-2 md:h-2 lg:w-2.5 lg:h-2.5 rounded-full shadow-lg ${
                                isSelected(day)
                                  ? 'bg-white'
                                  : activity.activity_type === 'assignment' || activity.activity_type === 'task'
                                  ? 'bg-amber-400 shadow-amber-500/50'
                                  : activity.activity_type === 'class'
                                  ? 'bg-purple-400 shadow-purple-500/50'
                                  : 'bg-cyan-400 shadow-cyan-500/50'
                              }`}
                            ></div>
                          ))}
                          {dayActivities.length > 3 && (
                            <div className={`w-1.5 h-1.5 md:w-2 md:h-2 lg:w-2.5 lg:h-2.5 rounded-full ${isSelected(day) ? 'bg-white/60' : 'bg-primary-400 shadow-lg shadow-primary-500/50'}`}></div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
          </div>
        )
      )}

      {/* Upcoming List View */}
      {viewMode === 'upcoming' && (
        loading ? (
          <div className="bg-dark-bg-secondary rounded-2xl md:rounded-3xl p-4 md:p-5 lg:p-6 xl:p-8 border border-dark-border-glow shadow-dark-soft-md">
            <div className="h-5 md:h-6 lg:h-7 bg-dark-bg-tertiary rounded w-24 md:w-32 lg:w-40 mb-3 md:mb-4 lg:mb-6 animate-pulse"></div>
            <div className="space-y-3 md:space-y-4 lg:space-y-5">
              <ActivitySkeleton />
              <ActivitySkeleton />
              <ActivitySkeleton />
            </div>
          </div>
        ) : (
          <div className="bg-dark-bg-secondary rounded-xl md:rounded-2xl p-4 md:p-5 lg:p-6 border border-dark-border-subtle animate-fadeIn">
          <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-dark-text-primary mb-3 md:mb-4">Next 7 Days</h3>

          {getFilteredActivities(getUpcomingActivities()).length === 0 ? (
            <div className="text-center py-8 md:py-12 lg:py-16">
              <div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 mx-auto mb-3 md:mb-4 lg:mb-6 rounded-xl md:rounded-2xl bg-dark-bg-tertiary flex items-center justify-center border border-dark-border-glow">
                <svg className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-dark-text-secondary text-sm md:text-base lg:text-lg">No upcoming activities</p>
              <p className="text-dark-text-muted text-xs md:text-sm lg:text-base mt-0.5 md:mt-1">Create one using AI above</p>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4 lg:space-y-5">
              {getFilteredActivities(getUpcomingActivities()).map((activity, idx, arr) => {
                const showDateHeader = idx === 0 || activity.activity_date !== arr[idx - 1].activity_date

                return (
                  <div key={activity.id}>
                    {showDateHeader && (
                      <div className="flex items-center gap-2 md:gap-3 lg:gap-4 mb-2 md:mb-3 lg:mb-4 mt-4 md:mt-5 lg:mt-6 first:mt-0">
                        <div className="flex-1 h-px bg-dark-border-glow"></div>
                        <div className="text-xs md:text-sm lg:text-base xl:text-lg font-bold text-dark-text-secondary">
                          {new Date(activity.activity_date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        <div className="flex-1 h-px bg-dark-border-glow"></div>
                      </div>
                    )}

                    <div className={`p-3 md:p-4 lg:p-5 xl:p-6 rounded-xl md:rounded-2xl border transition-all hover:scale-[1.01] ${
                      flyingAwayItems.has(activity.id)
                        ? 'animate-fly-away'
                        : activity.is_completed
                        ? 'bg-dark-bg-tertiary border-dark-border-subtle opacity-60 duration-300'
                        : 'bg-dark-bg-tertiary border-dark-border-glow duration-200 hover:border-primary-500/50'
                    } ${
                      activity.is_completed && !flyingAwayItems.has(activity.id)
                        ? 'success-flash'
                        : ''
                    }`}>
                      <div className="flex items-start gap-2.5 md:gap-3 lg:gap-4">
                        <button
                          onClick={() => handleToggleComplete(activity.id, activity.is_completed)}
                          className={`mt-0.5 md:mt-1 w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 flex-shrink-0 rounded md:rounded-lg border-2 flex items-center justify-center transition-all hover:scale-110 ${
                            activity.is_completed
                              ? 'bg-green-500 border-green-500'
                              : 'border-dark-border-glow hover:border-primary-500'
                          }`}
                        >
                          {activity.is_completed && (
                            <svg className="w-2.5 h-2.5 md:w-3 md:h-3 lg:w-4 lg:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 md:gap-3 mb-1 md:mb-1.5 lg:mb-2">
                            <h4 className={`text-sm md:text-base lg:text-lg xl:text-xl font-semibold leading-tight ${
                              activity.is_completed
                                ? 'text-dark-text-muted line-through'
                                : 'text-dark-text-primary'
                            }`}>
                              {activity.title}
                            </h4>
                            {activity.ai_generated && (
                              <div className="flex-shrink-0 flex items-center px-1.5 md:px-2 lg:px-2.5 py-0.5 md:py-1 rounded md:rounded-lg bg-primary-500/10 border border-primary-500/30">
                                <svg className="w-2.5 h-2.5 md:w-3 md:h-3 lg:w-4 lg:h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 md:gap-2.5 lg:gap-3 text-[10px] md:text-xs lg:text-sm text-dark-text-muted">
                            {activity.start_time && (
                              <span className="flex items-center gap-1 md:gap-1.5 font-medium">
                                <svg className="w-3 h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {activity.start_time.slice(0, 5)}
                              </span>
                            )}
                            {activity.duration_minutes && (
                              <span>{activity.duration_minutes}min</span>
                            )}
                            {activity.subject && (
                              <span className="text-dark-text-secondary font-medium">{activity.subject}</span>
                            )}
                            <span className={`px-1.5 md:px-2 lg:px-2.5 py-0.5 md:py-1 rounded md:rounded-lg ${getTypeColor(activity.activity_type)} text-white font-medium`}>
                              {activity.activity_type}
                            </span>
                          </div>

                          {activity.description && (
                            <p className="text-xs md:text-sm lg:text-base text-dark-text-secondary mt-1.5 md:mt-2 lg:mt-2.5 line-clamp-2">{activity.description}</p>
                          )}
                        </div>

                        <button
                          onClick={() => handleDeleteActivity(activity.id)}
                          className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 rounded-lg md:rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:scale-110 transition-all active:scale-95"
                        >
                          <svg className="w-3.5 h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          </div>
        )
      )}

      {/* Selected Day Activities (only shown in calendar mode) */}
      {viewMode === 'calendar' && (
        loading ? (
          <div className="bg-dark-bg-secondary rounded-2xl md:rounded-3xl p-4 md:p-5 lg:p-6 xl:p-8 border border-dark-border-glow shadow-dark-soft-md">
            <div className="h-5 md:h-6 lg:h-7 bg-dark-bg-tertiary rounded w-48 md:w-56 lg:w-64 mb-3 md:mb-4 lg:mb-6 animate-pulse"></div>
            <div className="space-y-2.5 md:space-y-3 lg:space-y-4">
              <ActivitySkeleton />
              <ActivitySkeleton />
            </div>
          </div>
        ) : (
          <div className="bg-dark-bg-secondary rounded-xl md:rounded-2xl p-4 md:p-5 lg:p-6 border border-dark-border-subtle animate-fadeIn">
          <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-dark-text-primary mb-3 md:mb-4">
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </h3>

          {getFilteredActivities(dayActivities).length === 0 ? (
            <div className="text-center py-6 md:py-8 lg:py-12">
              <div className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 mx-auto mb-2 md:mb-3 lg:mb-4 rounded-xl md:rounded-2xl bg-dark-bg-tertiary flex items-center justify-center border border-dark-border-glow">
                <svg className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-dark-text-secondary text-sm md:text-base lg:text-lg">No activities</p>
              <p className="text-dark-text-muted text-xs md:text-sm lg:text-base mt-0.5 md:mt-1">Use AI to create one</p>
            </div>
          ) : (
            <div className="space-y-2.5 md:space-y-3 lg:space-y-4">
              {getFilteredActivities(dayActivities).map((activity) => (
                <div
                  key={activity.id}
                  className={`p-3 rounded-xl border transition-all ${
                    flyingAwayItems.has(activity.id)
                      ? 'animate-fly-away'
                      : activity.is_completed
                      ? 'bg-dark-bg-tertiary border-dark-border-subtle opacity-60 duration-300'
                      : 'bg-dark-bg-tertiary border-dark-border-glow duration-200'
                  } ${
                    activity.is_completed && !flyingAwayItems.has(activity.id)
                      ? 'success-flash'
                      : ''
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <button
                      onClick={() => handleToggleComplete(activity.id, activity.is_completed)}
                      className={`mt-0.5 w-4 h-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-all ${
                        activity.is_completed
                          ? 'bg-green-500 border-green-500'
                          : 'border-dark-border-glow hover:border-primary-500'
                      }`}
                    >
                      {activity.is_completed && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className={`text-sm font-semibold leading-tight ${
                          activity.is_completed
                            ? 'text-dark-text-muted line-through'
                            : 'text-dark-text-primary'
                        }`}>
                          {activity.title}
                        </h4>
                        {activity.ai_generated && (
                          <div className="flex-shrink-0 flex items-center px-1.5 py-0.5 rounded bg-primary-500/10 border border-primary-500/30">
                            <svg className="w-2.5 h-2.5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-dark-text-muted">
                        {activity.start_time && (
                          <span className="flex items-center gap-1 font-medium">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {activity.start_time.slice(0, 5)}
                          </span>
                        )}
                        {activity.duration_minutes && (
                          <span>{activity.duration_minutes}min</span>
                        )}
                        {activity.subject && (
                          <span className="text-dark-text-secondary font-medium">{activity.subject}</span>
                        )}
                        <span className={`px-1.5 py-0.5 rounded ${getTypeColor(activity.activity_type)} text-white font-medium`}>
                          {activity.activity_type}
                        </span>
                      </div>

                      {activity.description && (
                        <p className="text-xs text-dark-text-secondary mt-1.5 line-clamp-2">{activity.description}</p>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteActivity(activity.id)}
                      className="flex-shrink-0 w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all active:scale-95"
                    >
                      <svg className="w-3.5 h-3.5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        )
      )}
    </div>
  )
}

export default Planner
