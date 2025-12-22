/**
 * Planner Component - AI-Optimized Calendar
 * Smart calendar with AI-powered activity creation
 */

import { useState, useEffect, useRef } from 'react'
import calendarService from '../services/calendarService'
import activityParserService from '../services/activityParserService'
import activityBreakdownService from '../services/activityBreakdownService'
import activitySubtasksService from '../services/activitySubtasksService'
import { CalendarSkeleton, ActivitySkeleton, StatCardSkeleton } from './LoadingSkeleton'
import { confirmDialog } from './ConfirmDialog'
import BulkUpload from './BulkUpload'
import AIPlanningSuggestions from './AIPlanningSuggestions'
import assignmentsService from '../services/assignmentsService'
import infiniteCampusService from '../services/infiniteCampusService'

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
  const [subtasksByActivity, setSubtasksByActivity] = useState({})
  const [generatingAI, setGeneratingAI] = useState({}) // Track which activities are generating AI content
  const [collapsedSubtasks, setCollapsedSubtasks] = useState({}) // Track which activities have collapsed subtasks
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [assignments, setAssignments] = useState([])
  const [grades, setGrades] = useState([])
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  useEffect(() => {
    loadActivities()
    loadAssignments()
    loadGrades()
  }, [currentDate])

  useEffect(() => {
    loadDayActivities()
  }, [selectedDate, activities])

  useEffect(() => {
    // Load subtasks for all visible activities
    const loadAllSubtasks = async () => {
      const subtasksMap = {}
      for (const activity of activities) {
        try {
          const subtasks = await activitySubtasksService.getSubtasks(activity.id)
          if (subtasks.length > 0) {
            subtasksMap[activity.id] = subtasks
            console.log(`Loaded ${subtasks.length} subtasks for activity: ${activity.title}`)
          }
        } catch (error) {
          // Silently fail if table doesn't exist yet - migrations may not be applied
          if (!error.message?.includes('relation') && !error.message?.includes('does not exist')) {
            console.error(`Failed to load subtasks for activity ${activity.id}:`, error)
          }
        }
      }
      setSubtasksByActivity(subtasksMap)
    }

    if (activities.length > 0) {
      loadAllSubtasks()
    }
  }, [activities])

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

  const loadAssignments = async () => {
    try {
      const { data, error } = await assignmentsService.getUpcomingAssignments()
      if (error) throw error
      const formatted = assignmentsService.toAppFormatBatch(data)
      setAssignments(formatted)
    } catch (error) {
      console.error('Failed to load assignments:', error)
    }
  }

  const loadGrades = async () => {
    try {
      const syncedGrades = await infiniteCampusService.getSyncedGrades()
      setGrades(syncedGrades)
    } catch (error) {
      console.error('Failed to load grades:', error)
    }
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
      const createdActivity = await calendarService.createActivity({
        ...activityData,
        ai_generated: true
      })

      // Generate AI description and subtasks in parallel
      if (createdActivity?.id) {
        generateAIContent(createdActivity)
      }

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

  const generateAIContent = async (activity) => {
    try {
      setGeneratingAI(prev => ({ ...prev, [activity.id]: true }))
      console.log('🤖 Generating AI content for:', activity.title)

      // Generate description and subtasks in parallel
      const [description, subtasks] = await Promise.all([
        activityBreakdownService.generateDescription(activity).catch((err) => {
          console.log('Description generation skipped:', err.message)
          return null
        }),
        activityBreakdownService.generateSubtasks(activity).catch((err) => {
          console.log('Subtask generation skipped:', err.message)
          return []
        })
      ])

      // Update activity with AI description if generated
      if (description) {
        console.log('✅ Generated description:', description)
        await calendarService.updateActivity(activity.id, {
          ai_description: description
        })
      }

      // Create subtasks if generated
      if (subtasks && subtasks.length > 0) {
        console.log(`✅ Generated ${subtasks.length} subtasks:`, subtasks.map(s => s.title))
        try {
          await activitySubtasksService.createSubtasksBulk(activity.id, subtasks)
          await loadSubtasksForActivity(activity.id)
          console.log('✅ Subtasks saved to database')
        } catch (error) {
          console.error('⚠️ Failed to save subtasks (table may not exist yet):', error.message)
        }
      }

      // Reload activities to show updated description
      await loadActivities()
    } catch (error) {
      console.error('Failed to generate AI content:', error)
    } finally {
      setGeneratingAI(prev => ({ ...prev, [activity.id]: false }))
    }
  }

  const loadSubtasksForActivity = async (activityId) => {
    try {
      const subtasks = await activitySubtasksService.getSubtasks(activityId)
      setSubtasksByActivity(prev => ({
        ...prev,
        [activityId]: subtasks
      }))
    } catch (error) {
      console.error('Failed to load subtasks:', error)
    }
  }

  const handleToggleSubtask = async (subtask) => {
    try {
      await activitySubtasksService.toggleSubtask(subtask.id, !subtask.completed)
      await loadSubtasksForActivity(subtask.activity_id)
    } catch (error) {
      console.error('Failed to toggle subtask:', error)
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
    const confirmed = await confirmDialog(
      'Delete Activity',
      'Are you sure you want to delete this activity?'
    )
    if (confirmed) {
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
    <div className="space-y-5 md:space-y-6 pb-6 md:pb-8 animate-fadeIn">
      {/* Glass Morphism Header */}
      <div className="relative overflow-hidden rounded-2xl bg-dark-bg-secondary/30 backdrop-blur-2xl p-4 md:p-5 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] border border-white/10 hover:border-primary-500/30 transition-all duration-300">
        {/* Floating glow orbs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/15 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-cyan/15 rounded-full blur-3xl animate-float" style={{animationDelay: '1.5s'}}></div>

        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-primary-300 via-accent-cyan to-primary-300 bg-clip-text text-transparent bg-[length:200%_auto] animate-opal-gradient">
              Calendar & Planning
            </h1>
            {activities.length > 0 && (
              <div className="flex items-center gap-4 text-sm md:text-base text-dark-text-muted mt-2">
                <span className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="font-semibold text-green-400">{activities.filter(a => a.is_completed).length}</span> done
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                  <span className="font-semibold text-amber-400">{activities.filter(a => !a.is_completed).length}</span> pending
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowBulkUpload(true)}
            className="group relative overflow-hidden px-5 py-2.5 bg-gradient-to-r from-primary-500 to-accent-cyan text-white font-bold text-sm md:text-base rounded-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-primary-500/20"
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>

            <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="relative z-10">Bulk Upload</span>
          </button>
        </div>
      </div>

      {/* AI Input - Glass Morphism */}
      <div className="relative overflow-hidden bg-dark-bg-secondary/30 backdrop-blur-xl rounded-2xl p-4 md:p-5 border border-white/10 hover:border-primary-500/30 transition-all duration-300 shadow-[0_8px_32px_0_rgba(0,0,0,0.25)]">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-3 p-2.5 rounded-lg bg-green-500/10 backdrop-blur-sm border border-green-500/30 animate-fadeIn">
            <p className="text-green-400 text-sm font-medium">{success}</p>
          </div>
        )}
        {error && (
          <div className="mb-3 p-2.5 rounded-lg bg-red-500/10 backdrop-blur-sm border border-red-500/30 animate-fadeIn">
            <p className="text-red-400 text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAiCreate()}
            placeholder="Study chemistry tomorrow at 3pm..."
            className="flex-1 px-4 py-2.5 text-sm md:text-base rounded-xl bg-dark-bg-tertiary border border-dark-border-glow text-dark-text-primary placeholder:text-dark-text-muted focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
            disabled={aiProcessing}
          />
          <button
            onClick={handleAiCreate}
            disabled={aiProcessing || !aiInput.trim()}
            className="group relative overflow-hidden px-4 py-2.5 bg-gradient-to-r from-primary-500 to-accent-cyan text-white text-sm md:text-base font-semibold rounded-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>

            {aiProcessing ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin relative z-10"></div>
            ) : (
              <>
                <svg className="w-4 h-4 relative z-10 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline relative z-10">Add</span>
              </>
            )}
          </button>
        </div>

        {/* Simplified Examples */}
        {showExamples && (
          <div className="mt-3 grid grid-cols-2 gap-2 animate-fadeIn">
            <button
              onClick={() => { setAiInput("Study chemistry tomorrow at 3pm for 2 hours"); setShowExamples(false); }}
              className="text-xs px-3 py-2 rounded-lg bg-dark-bg-tertiary text-dark-text-muted hover:text-primary-500 transition-colors text-left"
            >
              Study tomorrow 3pm
            </button>
            <button
              onClick={() => { setAiInput("Math quiz on Friday"); setShowExamples(false); }}
              className="text-xs px-3 py-2 rounded-lg bg-dark-bg-tertiary text-dark-text-muted hover:text-primary-500 transition-colors text-left"
            >
              Quiz on Friday
            </button>
          </div>
        )}
        <button
          onClick={() => setShowExamples(!showExamples)}
          className="mt-2 text-xs text-dark-text-muted hover:text-primary-500 transition-colors"
        >
          {showExamples ? 'Hide' : 'Show'} examples
        </button>
      </div>

      {/* AI Smart Planning Suggestions */}
      <AIPlanningSuggestions assignments={assignments} grades={grades} />

      {/* Simplified View & Filter */}
      <div className="flex items-center justify-between gap-3">
        {/* View Toggle */}
        <div className="flex gap-2 bg-dark-bg-secondary rounded-lg p-1">
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'calendar'
                ? 'bg-primary-500 text-white'
                : 'text-dark-text-secondary hover:text-dark-text-primary'
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setViewMode('upcoming')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'upcoming'
                ? 'bg-primary-500 text-white'
                : 'text-dark-text-secondary hover:text-dark-text-primary'
            }`}
          >
            Upcoming
          </button>
        </div>

        {/* Activity Type Filter - Simplified */}
        {filterType !== 'all' && (
          <button
            onClick={() => setFilterType('all')}
            className="text-xs text-dark-text-muted hover:text-primary-500 transition-colors"
          >
            Show all types
          </button>
        )}
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        loading ? (
          <CalendarSkeleton />
        ) : (
          <div
            className="relative overflow-hidden bg-dark-bg-secondary/30 backdrop-blur-xl rounded-2xl p-4 md:p-5 border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.25)] animate-slide-in-right"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
          {/* Floating glow orb */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary-500/10 rounded-full blur-3xl animate-float"></div>

          <div className="flex items-center justify-between mb-4 relative z-10">
            <h2 className="text-lg md:text-xl font-bold text-dark-text-primary bg-gradient-to-r from-primary-300 to-accent-cyan bg-clip-text text-transparent">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={goToToday}
                className="px-3 py-1.5 rounded-lg bg-primary-500/10 backdrop-blur-sm border border-primary-500/30 text-primary-500 text-xs font-medium hover:bg-primary-500/20 hover:scale-105 transition-all"
              >
                Today
              </button>
              <button
                onClick={previousMonth}
                className="w-8 h-8 rounded-lg bg-dark-bg-tertiary/50 backdrop-blur-sm border border-dark-border-glow text-dark-text-primary hover:border-primary-500 hover:scale-110 hover:-translate-x-1 transition-all"
              >
                <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={nextMonth}
                className="w-8 h-8 rounded-lg bg-dark-bg-tertiary/50 backdrop-blur-sm border border-dark-border-glow text-dark-text-primary hover:border-primary-500 hover:scale-110 hover:translate-x-1 transition-all"
              >
                <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Day Names */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-xs font-semibold text-dark-text-muted py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days - Enhanced */}
          <div className="grid grid-cols-7 gap-1.5 relative z-10">
            {getDaysInMonth().map((day, index) => {
              const dayActivities = getFilteredActivities(getActivitiesForDay(day))
              const hasActivities = dayActivities.length > 0
              const hasIncompleteActivities = dayActivities.some(a => !a.is_completed)
              const activityTypes = [...new Set(dayActivities.map(a => a.activity_type))]

              return (
                <button
                  key={index}
                  onClick={() => day && setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                  disabled={!day}
                  className={`aspect-square rounded-lg p-1 transition-all duration-300 text-center relative hover:scale-110 ${
                    !day
                      ? 'invisible'
                      : isSelected(day)
                      ? 'bg-gradient-to-br from-primary-500 to-accent-cyan text-white shadow-[0_0_20px_rgba(88,166,255,0.6)] ring-2 ring-primary-400'
                      : isToday(day)
                      ? 'bg-primary-500/20 border-2 border-primary-500 text-dark-text-primary font-bold shadow-[0_0_15px_rgba(88,166,255,0.4)]'
                      : hasActivities && hasIncompleteActivities
                      ? 'bg-amber-500/20 border-2 border-amber-500 text-dark-text-primary font-bold hover:bg-amber-500/30'
                      : hasActivities
                      ? 'bg-green-500/20 border-2 border-green-500 text-dark-text-primary hover:bg-green-500/30'
                      : 'bg-dark-bg-tertiary/50 text-dark-text-muted border border-dark-border-subtle hover:bg-dark-bg-tertiary hover:border-primary-500/30'
                  }`}
                  style={{ animationDelay: `${index * 0.02}s` }}
                >
                  {day && (
                    <div className="flex flex-col items-center justify-center h-full relative">
                      <span className={`text-sm font-semibold relative z-10 ${isSelected(day) ? 'text-white' : ''}`}>
                        {day}
                      </span>

                      {/* Activity count badge */}
                      {hasActivities && dayActivities.length > 0 && (
                        <div className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-xs font-bold ${
                          isSelected(day)
                            ? 'bg-white text-primary-500'
                            : hasIncompleteActivities
                            ? 'bg-amber-500 text-white shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                            : 'bg-green-500 text-white shadow-[0_0_8px_rgba(34,197,94,0.6)]'
                        } animate-pulse-soft`}>
                          {dayActivities.length}
                        </div>
                      )}

                      {/* Activity type dots */}
                      {hasActivities && activityTypes.length > 0 && (
                        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                          {activityTypes.slice(0, 3).map((type, i) => (
                            <div
                              key={i}
                              className={`w-1 h-1 rounded-full ${getTypeColor(type).replace('bg-', 'bg-')} ${isSelected(day) ? 'opacity-70' : ''}`}
                              title={type}
                            ></div>
                          ))}
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
          <div className="bg-dark-bg-secondary rounded-xl p-4 md:p-5 border border-dark-border-subtle animate-fadeIn">
          <h3 className="text-lg md:text-xl font-bold text-dark-text-primary mb-3">Next 7 Days</h3>

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

                    <div className={`p-4 rounded-lg border transition-all ${
                      flyingAwayItems.has(activity.id)
                        ? 'animate-fly-away'
                        : activity.is_completed
                        ? 'bg-dark-bg-surface/50 border-dark-border-subtle opacity-70'
                        : 'bg-dark-bg-secondary border-dark-border-subtle hover:border-dark-border-subtle/80'
                    }`}>
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleToggleComplete(activity.id, activity.is_completed)}
                          className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-all ${
                            activity.is_completed
                              ? 'bg-green-500 border-green-500'
                              : 'border-dark-border-subtle hover:border-primary-500 hover:scale-110'
                          }`}
                        >
                          {activity.is_completed && (
                            <svg className="w-2.5 h-2.5 md:w-3 md:h-3 lg:w-4 lg:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <h4 className={`text-base font-semibold leading-tight ${
                              activity.is_completed
                                ? 'text-dark-text-muted line-through'
                                : 'text-dark-text-primary'
                            }`}>
                              {activity.title}
                            </h4>
                            {activity.ai_generated && (
                              <div className="flex-shrink-0 flex items-center px-2 py-0.5 rounded bg-primary-500/10 border border-primary-500/20">
                                <svg className="w-3 h-3 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-dark-text-muted mb-2">
                            {activity.start_time && (
                              <span className="flex items-center gap-1 font-medium">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {activity.start_time.slice(0, 5)}
                              </span>
                            )}
                            {activity.duration_minutes && (
                              <span className="font-medium">{activity.duration_minutes}min</span>
                            )}
                            {activity.subject && (
                              <span className="text-dark-text-secondary font-medium">{activity.subject}</span>
                            )}
                            <span className={`px-2 py-0.5 rounded-md ${getTypeColor(activity.activity_type)} text-white text-xs font-medium`}>
                              {activity.activity_type}
                            </span>
                          </div>

                          {(activity.ai_description || activity.description) && (
                            <p className="text-sm text-dark-text-secondary line-clamp-2">
                              {activity.ai_description || activity.description}
                            </p>
                          )}

                          {/* Collapsible Subtasks */}
                          {subtasksByActivity[activity.id] && subtasksByActivity[activity.id].length > 0 && (
                            <div className="mt-3 border-t border-dark-border-subtle pt-3">
                              <button
                                onClick={() => setCollapsedSubtasks(prev => ({ ...prev, [activity.id]: !prev[activity.id] }))}
                                className="flex items-center gap-2 text-xs font-semibold text-dark-text-secondary hover:text-dark-text-primary transition-colors mb-2"
                              >
                                <svg className={`w-4 h-4 transition-transform ${collapsedSubtasks[activity.id] ? '' : 'rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                <span>Subtasks ({subtasksByActivity[activity.id].filter(s => s.completed).length}/{subtasksByActivity[activity.id].length})</span>
                              </button>

                              {!collapsedSubtasks[activity.id] && (
                                <div className="space-y-1.5">
                                  {subtasksByActivity[activity.id].map((subtask) => (
                                    <div key={subtask.id} className="flex items-start gap-2 bg-dark-bg-surface/30 rounded-md p-2 hover:bg-dark-bg-surface/50 transition-colors">
                                      <button
                                        onClick={() => handleToggleSubtask(subtask)}
                                        className={`mt-0.5 w-4 h-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-all ${
                                          subtask.completed
                                            ? 'bg-green-500 border-green-500'
                                            : 'border-dark-border-subtle hover:border-primary-500 hover:scale-110'
                                        }`}
                                      >
                                        {subtask.completed && (
                                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                          </svg>
                                        )}
                                      </button>
                                      <div className="flex-1 min-w-0">
                                        <div className={`text-xs font-medium ${subtask.completed ? 'text-dark-text-muted line-through' : 'text-dark-text-primary'}`}>
                                          {subtask.title}
                                        </div>
                                        {subtask.description && (
                                          <div className="text-xs text-dark-text-muted mt-0.5">
                                            {subtask.description}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Generating AI indicator */}
                          {generatingAI[activity.id] && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-primary-500">
                              <div className="w-3 h-3 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
                              <span>Generating AI content...</span>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleDeleteActivity(activity.id)}
                          className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
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
          <div className="bg-dark-bg-secondary rounded-xl p-4 md:p-5 border border-dark-border-subtle animate-fadeIn">
          <h3 className="text-lg md:text-xl font-bold text-dark-text-primary mb-3">
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

                      {(activity.ai_description || activity.description) && (
                        <p className="text-xs text-dark-text-secondary mt-1.5 line-clamp-2">
                          {activity.ai_description || activity.description}
                        </p>
                      )}

                      {/* Subtasks */}
                      {subtasksByActivity[activity.id] && subtasksByActivity[activity.id].length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {subtasksByActivity[activity.id].map((subtask) => (
                            <div key={subtask.id} className="flex items-start gap-2 bg-dark-bg-surface/50 rounded-lg p-2">
                              <button
                                onClick={() => handleToggleSubtask(subtask)}
                                className={`mt-0.5 w-4 h-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                                  subtask.completed
                                    ? 'bg-green-500 border-green-500'
                                    : 'border-dark-border-subtle hover:border-primary-500'
                                }`}
                              >
                                {subtask.completed && (
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className={`text-xs font-medium ${subtask.completed ? 'text-dark-text-muted line-through' : 'text-dark-text-primary'}`}>
                                  {subtask.title}
                                </div>
                                {subtask.description && (
                                  <div className="text-xs text-dark-text-muted mt-0.5">
                                    {subtask.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Generating AI indicator */}
                      {generatingAI[activity.id] && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-primary-500">
                          <div className="w-3 h-3 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
                          <span>Generating AI content...</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteActivity(activity.id)}
                      className="flex-shrink-0 w-7 h-7 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
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

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <BulkUpload
          onClose={() => setShowBulkUpload(false)}
          onSuccess={() => loadActivities()}
        />
      )}
    </div>
  )
}

export default Planner
