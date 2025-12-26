import { useState, useEffect } from 'react'
import canvasService from '../services/canvasService'
import authService from '../services/authService'
import assignmentsService from '../services/assignmentsService'
import assignmentParserService from '../services/assignmentParserService'
import subtasksService from '../services/subtasksService'
import taskBreakdownService from '../services/taskBreakdownService'
import courseStatsService from '../services/courseStatsService'
import calendarService from '../services/calendarService'
import { toast } from './Toast'
import { confirmDialog } from './ConfirmDialog'

const Dashboard = ({ onOpenScanner, focusTimerProps }) => {
  // Destructure focus timer props from App (persists across tabs)
  const {
    focusTask, setFocusTask,
    focusTime, setFocusTime,
    focusActive, setFocusActive,
    focusPaused, setFocusPaused
  } = focusTimerProps || {}

  const [userName, setUserName] = useState('there')
  const [assignments, setAssignments] = useState([])
  const [isLoadingCanvas, setIsLoadingCanvas] = useState(false)
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true)
  const [canvasConfigured, setCanvasConfigured] = useState(true)
  const [showCanvasSetup, setShowCanvasSetup] = useState(false)
  const [canvasUrl, setCanvasUrl] = useState('')
  const [canvasToken, setCanvasToken] = useState('')
  const [savingCanvas, setSavingCanvas] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [aiInput, setAiInput] = useState('')
  const [aiProcessing, setAiProcessing] = useState(false)
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    subject: '',
    dueDate: '',
    priority: 'medium',
    timeEstimate: '',
  })
  const [subtasksByAssignment, setSubtasksByAssignment] = useState({})
  const [expandedAssignments, setExpandedAssignments] = useState(new Set())
  const [breakdownModal, setBreakdownModal] = useState(null)
  const [generatingBreakdown, setGeneratingBreakdown] = useState(false)
  const [showFocusPicker, setShowFocusPicker] = useState(false)
  const [dailyGoal, setDailyGoal] = useState(() => {
    const saved = localStorage.getItem('dailyStudyGoal')
    return saved ? parseInt(saved) : 120 // Default 2 hours
  })
  const [todayMinutes, setTodayMinutes] = useState(0)
  const [studyStreak, setStudyStreak] = useState(0)
  const [weeklyStats, setWeeklyStats] = useState({ completed: 0, total: 0 })

  const filterRecentAssignments = (assignmentsList) => {
    const twoWeeksAgo = new Date()
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
    return assignmentsList.filter(assignment => {
      if (!assignment.dueDate) return true
      return new Date(assignment.dueDate) >= twoWeeksAgo
    })
  }

  useEffect(() => {
    loadUserName()
    loadAssignments()
    loadProductivityStats()
  }, [])

  // Focus timer countdown is now handled in App.jsx

  const loadProductivityStats = async () => {
    try {
      // Load activities from current and previous month to handle cross-month streaks
      const today = new Date()
      const currentMonthActivities = await calendarService.getActivitiesForMonth(today.getFullYear(), today.getMonth())
      const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const prevMonthActivities = await calendarService.getActivitiesForMonth(prevMonth.getFullYear(), prevMonth.getMonth())
      const allActivities = [...currentMonthActivities, ...prevMonthActivities]

      // Calculate today's study minutes
      const todayStr = today.toISOString().split('T')[0]
      const todayActivities = allActivities.filter(a => a.activity_date === todayStr && a.is_completed)
      const minutes = todayActivities.reduce((sum, a) => sum + (a.duration_minutes || 0), 0)
      setTodayMinutes(minutes)

      // Calculate study streak (consecutive days with completed activities)
      let streak = 0
      const checkDate = new Date()

      // Check if today has activities - if not, start from yesterday (day isn't over yet)
      const todayHasActivity = allActivities.some(a => a.activity_date === todayStr && a.is_completed)
      if (!todayHasActivity) {
        checkDate.setDate(checkDate.getDate() - 1)
      }

      // Count consecutive days with completed activities
      for (let i = 0; i < 60; i++) {
        const dateStr = checkDate.toISOString().split('T')[0]
        const dayActivities = allActivities.filter(a => a.activity_date === dateStr && a.is_completed)
        if (dayActivities.length > 0) {
          streak++
          checkDate.setDate(checkDate.getDate() - 1)
        } else {
          break
        }
      }

      // Add today to streak if it has activities
      if (todayHasActivity) {
        streak++
      }

      setStudyStreak(streak)

      // Calculate weekly completion stats (assignments due this week)
      const weekStart = new Date()
      weekStart.setHours(0, 0, 0, 0)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)

      // Get ALL assignments (including completed ones)
      const { data: allAssignments } = await assignmentsService.getAssignments()
      const weekAssignments = (allAssignments || []).filter(a => {
        if (!a.due_date) return false
        const dueDate = new Date(a.due_date)
        return dueDate >= weekStart && dueDate <= weekEnd
      })
      setWeeklyStats({
        completed: weekAssignments.filter(a => a.completed).length,
        total: weekAssignments.length
      })
    } catch (err) {
      console.error('Failed to load productivity stats:', err)
    }
  }

  const loadUserName = async () => {
    const { user } = await authService.getCurrentUser()
    await authService.refreshUserProfile()
    const profile = authService.getUserProfile()
    setUserName(profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there')
    setCanvasConfigured(!!profile?.canvas_url)
  }

  const handleSaveCanvasSetup = async () => {
    if (!canvasUrl.trim() || !canvasToken.trim()) {
      toast.error('Both URL and token are required')
      return
    }
    setSavingCanvas(true)
    try {
      await authService.updateUserProfile({
        canvas_url: canvasUrl.trim(),
        canvas_token: canvasToken.trim()
      })
      setCanvasConfigured(true)
      setShowCanvasSetup(false)
      toast.success('Canvas connected! Syncing assignments...')
      // Auto-sync after setup
      await loadCanvasAssignments()
    } catch (err) {
      toast.error('Failed to save Canvas settings')
    } finally {
      setSavingCanvas(false)
    }
  }

  const loadAssignments = async () => {
    setIsLoadingAssignments(true)
    try {
      const { data, error } = await assignmentsService.getUpcomingAssignments()
      if (error) throw error
      const formatted = assignmentsService.toAppFormatBatch(data)
      setAssignments(formatted)
      await loadAllSubtasks(formatted)
    } catch (error) {
      console.error('Failed to load assignments:', error)
    } finally {
      setIsLoadingAssignments(false)
    }
  }

  const loadAllSubtasks = async (assignmentList) => {
    const subtasksMap = {}
    await Promise.all(
      assignmentList.map(async (assignment) => {
        const subtasks = await subtasksService.getSubtasks(assignment.id)
        if (subtasks.length > 0) subtasksMap[assignment.id] = subtasks
      })
    )
    setSubtasksByAssignment(subtasksMap)
  }

  const handleCreateAssignment = async () => {
    if (!newAssignment.title.trim()) {
      toast.error('Please enter a title')
      return
    }
    try {
      await assignmentsService.createAssignment({
        title: newAssignment.title,
        subject: newAssignment.subject,
        dueDate: newAssignment.dueDate || null,
        priority: newAssignment.priority,
        timeEstimate: newAssignment.timeEstimate || null,
        source: 'manual',
      })
      await loadAssignments()
      setNewAssignment({ title: '', subject: '', dueDate: '', priority: 'medium', timeEstimate: '' })
      setShowAddModal(false)
    } catch (error) {
      toast.error('Failed to create assignment')
    }
  }

  const handleAiCreateAssignment = async () => {
    if (!aiInput.trim()) return
    setAiProcessing(true)
    try {
      const assignmentData = await assignmentParserService.parseAssignment(aiInput)
      await assignmentsService.createAssignment({
        title: assignmentData.title,
        subject: assignmentData.subject,
        dueDate: assignmentData.dueDate,
        priority: assignmentData.priority,
        timeEstimate: assignmentData.timeEstimate,
        source: 'manual',
        aiCaptured: true,
      })
      await loadAssignments()
      toast.success(`Created: ${assignmentData.title}`)
      setAiInput('')
    } catch (err) {
      toast.error('Failed to parse assignment')
    } finally {
      setAiProcessing(false)
    }
  }

  const handleDeleteAssignment = async (assignmentId, source) => {
    if (source === 'canvas') {
      toast.warning('Canvas assignments cannot be deleted here')
      return
    }
    const confirmed = await confirmDialog('Delete Assignment', 'Are you sure?')
    if (!confirmed) return
    try {
      await assignmentsService.deleteAssignment(assignmentId)
      await loadAssignments()
    } catch (error) {
      toast.error('Failed to delete')
    }
  }

  const handleToggleComplete = async (assignmentId, currentStatus) => {
    try {
      const newStatus = !currentStatus
      const assignment = assignments.find(a => a.id === assignmentId)

      await assignmentsService.updateAssignment(assignmentId, {
        completed: newStatus,
        progress: newStatus ? 100 : 0
      })

      if (newStatus && assignment?.subject) {
        let timeMinutes = 0
        if (assignment.timeEstimate) {
          const timeStr = assignment.timeEstimate.toLowerCase()
          const hours = timeStr.match(/(\d+)\s*h/)
          const mins = timeStr.match(/(\d+)\s*m/)
          if (hours) timeMinutes += parseInt(hours[1]) * 60
          if (mins) timeMinutes += parseInt(mins[1])
        }
        await courseStatsService.recordAssignmentCompleted(assignment.subject, null, timeMinutes)
      }

      setAssignments(prev => prev.map(a =>
        a.id === assignmentId ? { ...a, completed: newStatus, progress: newStatus ? 100 : 0 } : a
      ))

      // Update weekly stats after completion change
      await loadProductivityStats()
    } catch (error) {
      toast.error('Failed to update')
      await loadAssignments()
    }
  }

  const handleGenerateBreakdown = async (assignment) => {
    try {
      setGeneratingBreakdown(true)
      const suggestions = await taskBreakdownService.generateSubtasks(assignment)
      setBreakdownModal({ assignment, suggestions })
    } catch (error) {
      toast.error('Failed to generate breakdown')
    } finally {
      setGeneratingBreakdown(false)
    }
  }

  const handleAddAllSubtasks = async () => {
    if (!breakdownModal) return
    try {
      await subtasksService.createSubtasksBulk(breakdownModal.assignment.id, breakdownModal.suggestions)
      const subtasks = await subtasksService.getSubtasks(breakdownModal.assignment.id)
      setSubtasksByAssignment(prev => ({ ...prev, [breakdownModal.assignment.id]: subtasks }))
      setExpandedAssignments(prev => new Set([...prev, breakdownModal.assignment.id]))
      setBreakdownModal(null)
    } catch (error) {
      toast.error('Failed to add subtasks')
    }
  }

  const handleToggleSubtask = async (subtask) => {
    await subtasksService.toggleSubtask(subtask.id, !subtask.completed)
    const subtasks = await subtasksService.getSubtasks(subtask.assignment_id)
    setSubtasksByAssignment(prev => ({ ...prev, [subtask.assignment_id]: subtasks }))
    await loadAssignments()
  }

  const loadCanvasAssignments = async () => {
    setIsLoadingCanvas(true)
    try {
      const result = await canvasService.syncToDatabase()
      if (result.success) {
        await loadAssignments()
        toast.success(result.synced > 0 ? `Synced ${result.synced} assignments` : 'All up to date')
      }
    } catch (error) {
      toast.error('Failed to sync from Canvas')
    } finally {
      setIsLoadingCanvas(false)
    }
  }

  const getTimeOfDayGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const getDaysUntilDue = (dueDate) => {
    const diffDays = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays < 0) return 'Overdue'
    return `${diffDays}d`
  }

  // Calculate deadline risk based on time remaining vs estimated work
  const getDeadlineRisk = (assignment) => {
    if (!assignment.dueDate) return { level: 'none', color: 'text-text-muted', bg: 'bg-surface-base' }

    const daysUntil = Math.ceil((new Date(assignment.dueDate) - new Date()) / (1000 * 60 * 60 * 24))

    // Parse time estimate to hours
    let estimatedHours = 1 // Default 1 hour
    if (assignment.timeEstimate) {
      const timeStr = assignment.timeEstimate.toLowerCase()
      const hours = timeStr.match(/(\d+)\s*h/)
      const mins = timeStr.match(/(\d+)\s*m/)
      if (hours) estimatedHours = parseInt(hours[1])
      if (mins) estimatedHours += parseInt(mins[1]) / 60
    }

    // Risk calculation: days needed = estimated hours / 2 (assuming 2 productive hours/day)
    const daysNeeded = Math.ceil(estimatedHours / 2)

    if (daysUntil < 0) {
      return { level: 'overdue', color: 'text-error', bg: 'bg-error/10', icon: 'alert' }
    } else if (daysUntil === 0) {
      return { level: 'critical', color: 'text-error', bg: 'bg-error/10', icon: 'fire' }
    } else if (daysUntil <= daysNeeded) {
      return { level: 'high', color: 'text-accent-warm', bg: 'bg-accent-warm/10', icon: 'warning' }
    } else if (daysUntil <= daysNeeded * 2) {
      return { level: 'medium', color: 'text-primary', bg: 'bg-primary/10', icon: 'clock' }
    }
    return { level: 'low', color: 'text-success', bg: 'bg-success/10', icon: 'check' }
  }

  // Get smart recommendation for what to focus on
  const getTopPriority = () => {
    const pending = recentAssignments.filter(a => !a.completed)
    if (pending.length === 0) return null

    // Score each assignment by urgency
    const scored = pending.map(a => {
      let score = 0
      if (a.dueDate) {
        const days = Math.ceil((new Date(a.dueDate) - new Date()) / (1000 * 60 * 60 * 24))
        if (days < 0) score += 100 // Overdue
        else if (days === 0) score += 80 // Today
        else if (days === 1) score += 60 // Tomorrow
        else score += Math.max(0, 40 - days * 2)
      }
      if (a.priority === 'high') score += 30
      else if (a.priority === 'medium') score += 15
      return { ...a, score }
    })

    return scored.sort((a, b) => b.score - a.score)[0]
  }

  const formatMinutes = (mins) => {
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    const remaining = mins % 60
    return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`
  }

  const formatFocusTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  const startFocus = (assignment) => {
    setFocusTask(assignment)
    setFocusTime(0)
    setFocusActive(true)
    setFocusPaused(false)
  }

  const stopFocus = async () => {
    if (focusTask && focusTime > 0) {
      // Add to today's study time
      const minutesStudied = Math.round(focusTime / 60)
      setTodayMinutes(prev => prev + minutesStudied)

      // Record activity
      try {
        const today = new Date().toISOString().split('T')[0]
        await calendarService.createActivity({
          title: `Studied: ${focusTask.title}`,
          activity_type: 'study',
          activity_date: today,
          duration_minutes: minutesStudied,
          subject: focusTask.subject || 'General',
          is_completed: true
        })
        toast.success(`Logged ${minutesStudied}m studying ${focusTask.title}`)
      } catch (err) {
        console.error('Failed to log study session:', err)
      }
    }
    setFocusTask(null)
    setFocusTime(0)
    setFocusActive(false)
    setFocusPaused(false)
  }

  const dailyProgress = Math.min(100, Math.round((todayMinutes / dailyGoal) * 100))

  const recentAssignments = filterRecentAssignments(assignments)
  const completedCount = recentAssignments.filter(a => a.completed).length
  const pendingCount = recentAssignments.filter(a => !a.completed).length
  const pendingAssignments = recentAssignments.filter(a => !a.completed)
  const completedAssignments = recentAssignments.filter(a => a.completed)

  return (
    <div className="min-h-screen p-6 md:p-8 lg:p-10 max-w-4xl mx-auto">
      {/* Header */}
      <header className="mb-10 animate-fade-up">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold text-text-primary tracking-tight">
              {getTimeOfDayGreeting()}, {userName}
            </h1>
            <p className="text-text-secondary mt-2 text-lg">
              {pendingCount === 0 ? (
                <span className="text-primary">All caught up</span>
              ) : (
                <>
                  <span className="text-accent-warm">{pendingCount}</span>
                  <span className="text-text-muted"> task{pendingCount !== 1 ? 's' : ''} ahead</span>
                </>
              )}
            </p>
          </div>
          <button
            onClick={loadCanvasAssignments}
            disabled={isLoadingCanvas}
            className="px-4 py-2.5 bg-surface-elevated hover:bg-surface-overlay text-text-secondary hover:text-text-primary rounded-xl transition-all duration-200 flex items-center gap-2 text-sm font-medium"
          >
            {isLoadingCanvas ? (
              <div className="w-4 h-4 border-2 border-text-muted/30 border-t-text-secondary rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            <span className="hidden sm:inline">Sync</span>
          </button>
        </div>
      </header>

      {/* Active Focus Timer */}
      {focusTask && (
        <div className="mb-6 animate-fade-up">
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center ${focusActive && !focusPaused ? 'animate-pulse' : ''}`}>
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-primary font-medium uppercase tracking-wider">
                    {focusActive && !focusPaused ? 'Focusing on' : focusPaused ? 'Paused' : 'Focus Session'}
                  </p>
                  <h3 className="font-semibold text-text-primary">{focusTask.title}</h3>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-3xl font-mono font-bold text-primary tabular-nums">
                  {formatFocusTime(focusTime)}
                </span>

                <div className="flex gap-2">
                  {focusActive && !focusPaused ? (
                    <button
                      onClick={() => setFocusPaused(true)}
                      className="p-2.5 bg-surface-elevated hover:bg-surface-overlay rounded-xl transition-colors"
                      title="Pause"
                    >
                      <svg className="w-5 h-5 text-text-secondary" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      </svg>
                    </button>
                  ) : focusPaused ? (
                    <button
                      onClick={() => setFocusPaused(false)}
                      className="p-2.5 bg-primary/20 hover:bg-primary/30 rounded-xl transition-colors"
                      title="Resume"
                    >
                      <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                  ) : null}
                  <button
                    onClick={stopFocus}
                    className="p-2.5 bg-error/10 hover:bg-error/20 rounded-xl transition-colors"
                    title="Stop & Save"
                  >
                    <svg className="w-5 h-5 text-error" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 6h12v12H6z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Productivity Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6 animate-fade-up stagger-1">
        {/* Daily Progress */}
        <div className="bg-surface-elevated rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Today</span>
            <button
              onClick={() => {
                const newGoal = prompt('Set daily study goal (minutes):', dailyGoal)
                if (newGoal && !isNaN(newGoal)) {
                  setDailyGoal(parseInt(newGoal))
                  localStorage.setItem('dailyStudyGoal', newGoal)
                }
              }}
              className="text-xs text-text-muted hover:text-text-secondary"
            >
              Edit
            </button>
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-2xl font-semibold text-text-primary">{formatMinutes(todayMinutes)}</span>
            <span className="text-sm text-text-muted mb-0.5">/ {formatMinutes(dailyGoal)}</span>
          </div>
          <div className="h-1.5 bg-surface-base rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${dailyProgress}%` }}
            />
          </div>
        </div>

        {/* Study Streak */}
        <div className="bg-surface-elevated rounded-2xl p-4">
          <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Streak</span>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-2xl font-semibold text-accent-warm">{studyStreak}</span>
            <span className="text-sm text-text-muted">day{studyStreak !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex gap-0.5 mt-2">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full ${i < Math.min(studyStreak, 7) ? 'bg-accent-warm' : 'bg-surface-base'}`}
              />
            ))}
          </div>
        </div>

        {/* Weekly Completion */}
        <div className="bg-surface-elevated rounded-2xl p-4">
          <span className="text-xs font-medium text-text-muted uppercase tracking-wider">This Week</span>
          <div className="flex items-end gap-2 mt-3">
            <span className="text-2xl font-semibold text-success">{weeklyStats.completed}</span>
            <span className="text-sm text-text-muted mb-0.5">/ {weeklyStats.total} done</span>
          </div>
          <div className="h-1.5 bg-surface-base rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-success rounded-full transition-all duration-500"
              style={{ width: `${weeklyStats.total > 0 ? (weeklyStats.completed / weeklyStats.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Focus Recommendation */}
      {getTopPriority() && !focusTask && (
        <div className="mb-6 animate-fade-up stagger-1">
          <div className={`p-4 rounded-2xl ${getDeadlineRisk(getTopPriority()).bg} border border-${getDeadlineRisk(getTopPriority()).color.replace('text-', '')}/20`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${getDeadlineRisk(getTopPriority()).bg} flex items-center justify-center`}>
                <svg className={`w-5 h-5 ${getDeadlineRisk(getTopPriority()).color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <span className={`text-xs font-medium ${getDeadlineRisk(getTopPriority()).color} uppercase tracking-wider`}>
                  Recommended
                </span>
                <h3 className="font-medium text-text-primary truncate">{getTopPriority().title}</h3>
              </div>
              {getTopPriority().dueDate && (
                <span className={`text-sm font-medium ${getDeadlineRisk(getTopPriority()).color} mr-2`}>
                  {getDaysUntilDue(getTopPriority().dueDate)}
                </span>
              )}
              <button
                onClick={() => startFocus(getTopPriority())}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-medium hover:bg-primary-hover transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start Focus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Quick Add Input */}
      <div className="mb-8 animate-fade-up stagger-2">
        <div className="bg-surface-elevated rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-accent-cool/10 rounded-lg">
              <svg className="w-3.5 h-3.5 text-accent-cool" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-xs font-medium text-accent-cool">AI-Powered</span>
            </div>
            <span className="text-xs text-text-muted">Just type naturally - AI will parse dates, subjects & priority</span>
          </div>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAiCreateAssignment()}
              placeholder="Math homework chapter 5 due Friday, high priority..."
              className="w-full bg-surface-base border border-border rounded-xl pl-12 pr-24 py-3.5 text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
              disabled={aiProcessing}
            />
            <button
              onClick={handleAiCreateAssignment}
              disabled={aiProcessing || !aiInput.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium text-sm transition-all disabled:opacity-30 disabled:bg-primary"
            >
              {aiProcessing ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3 mb-6 animate-fade-up stagger-2">
        {/* Start Focus Button */}
        <button
          onClick={() => {
            if (pendingAssignments.length > 0) {
              setShowFocusPicker(true)
            } else {
              toast.info('No tasks to focus on')
            }
          }}
          disabled={focusTask !== null}
          className={`group p-5 rounded-2xl transition-all duration-300 hover:-translate-y-0.5 ${
            focusTask
              ? 'bg-primary/10 border-2 border-primary/30'
              : 'bg-surface-elevated hover:bg-surface-overlay'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
              focusTask ? 'bg-primary/20' : 'bg-success/10 group-hover:bg-success/15'
            }`}>
              <svg className={`w-5 h-5 ${focusTask ? 'text-primary' : 'text-success'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-left">
              <div className="font-medium text-text-primary">{focusTask ? 'Focusing' : 'Focus'}</div>
              <div className="text-sm text-text-muted">{focusTask ? formatFocusTime(focusTime) : 'Start session'}</div>
            </div>
          </div>
        </button>

        <button
          onClick={onOpenScanner}
          className="group p-5 bg-surface-elevated hover:bg-surface-overlay rounded-2xl transition-all duration-300 hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-primary/10 group-hover:bg-primary/15 flex items-center justify-center transition-colors">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="text-left">
              <div className="font-medium text-text-primary">Scan</div>
              <div className="text-sm text-text-muted">Capture</div>
            </div>
          </div>
        </button>

        <button
          onClick={() => setShowAddModal(true)}
          className="group p-5 bg-surface-elevated hover:bg-surface-overlay rounded-2xl transition-all duration-300 hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-accent-warm/10 group-hover:bg-accent-warm/15 flex items-center justify-center transition-colors">
              <svg className="w-5 h-5 text-accent-warm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div className="text-left">
              <div className="font-medium text-text-primary">Add</div>
              <div className="text-sm text-text-muted">New task</div>
            </div>
          </div>
        </button>
      </div>

      {/* Canvas Setup Card - shows when not configured */}
      {!canvasConfigured && !showCanvasSetup && (
        <div className="mb-10 animate-fade-up stagger-2">
          <div className="bg-gradient-to-br from-primary/5 to-accent-cool/5 border border-primary/10 rounded-2xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-text-primary">Connect Canvas LMS</h3>
                <p className="text-sm text-text-secondary mt-1">Automatically sync your assignments and due dates from Canvas</p>
                <button
                  onClick={() => setShowCanvasSetup(true)}
                  className="mt-4 px-4 py-2 bg-primary text-text-inverse rounded-xl hover:bg-primary-hover transition-colors text-sm font-medium"
                >
                  Set Up Canvas
                </button>
              </div>
              <button
                onClick={() => setCanvasConfigured(true)}
                className="p-1.5 text-text-muted hover:text-text-secondary transition-colors"
                title="Dismiss"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Canvas Setup Form */}
      {showCanvasSetup && (
        <div className="mb-10 animate-fade-up">
          <div className="bg-surface-elevated rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-text-primary">Connect Canvas</h3>
              <button
                onClick={() => setShowCanvasSetup(false)}
                className="p-1.5 text-text-muted hover:text-text-secondary transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-text-secondary mb-2 block">Canvas URL</label>
                <input
                  type="url"
                  value={canvasUrl}
                  onChange={(e) => setCanvasUrl(e.target.value)}
                  className="input"
                  placeholder="https://school.instructure.com"
                />
              </div>
              <div>
                <label className="text-sm text-text-secondary mb-2 block">API Token</label>
                <input
                  type="password"
                  value={canvasToken}
                  onChange={(e) => setCanvasToken(e.target.value)}
                  className="input"
                  placeholder="Your Canvas API token"
                />
                <p className="text-xs text-text-muted mt-2">
                  Find your token: Canvas → Account → Settings → New Access Token
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCanvasSetup(false)}
                  className="flex-1 py-3 bg-surface-overlay text-text-secondary rounded-xl hover:bg-surface-overlay/80 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCanvasSetup}
                  disabled={savingCanvas}
                  className="flex-1 py-3 bg-primary text-text-inverse rounded-xl hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingCanvas ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Connecting...
                    </>
                  ) : 'Connect Canvas'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tasks Section */}
      <section className="animate-fade-up stagger-3">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider">Tasks</h2>
          {completedCount > 0 && (
            <span className="text-xs text-text-muted">
              {completedCount} completed
            </span>
          )}
        </div>

        {isLoadingAssignments ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : pendingAssignments.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-elevated flex items-center justify-center">
              <svg className="w-7 h-7 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-text-secondary">You're all caught up</p>
            <p className="text-sm text-text-muted mt-1">Enjoy your focus time</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingAssignments.map((assignment, index) => {
              const risk = getDeadlineRisk(assignment)
              return (
              <div
                key={assignment.id}
                className="group bg-surface-elevated hover:bg-surface-overlay rounded-2xl overflow-hidden transition-all duration-300"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex">
                  {/* Risk indicator bar */}
                  <div className={`w-1 ${risk.level === 'overdue' || risk.level === 'critical' ? 'bg-error' : risk.level === 'high' ? 'bg-accent-warm' : risk.level === 'medium' ? 'bg-primary' : risk.level === 'low' ? 'bg-success' : 'bg-transparent'}`} />

                  <div className="flex-1 p-5">
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <button
                        onClick={() => handleToggleComplete(assignment.id, assignment.completed)}
                        className={`mt-0.5 w-5 h-5 rounded-full border-2 transition-all flex-shrink-0 ${risk.level === 'overdue' || risk.level === 'critical' ? 'border-error/50 hover:border-error hover:bg-error/10' : 'border-text-muted/30 hover:border-primary hover:bg-primary/10'}`}
                      />

                  <div className="flex-1 min-w-0">
                    {/* Title & Subject */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-medium text-text-primary leading-snug">{assignment.title}</h3>
                        {assignment.subject && (
                          <span className="inline-block mt-1.5 text-xs font-medium text-text-muted bg-surface-base px-2 py-0.5 rounded-md">
                            {assignment.subject}
                          </span>
                        )}
                      </div>

                      {/* Due Date Badge */}
                      {assignment.dueDate && (
                        <span className={`flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-lg ${
                          getDaysUntilDue(assignment.dueDate) === 'Overdue'
                            ? 'bg-error/10 text-error'
                            : getDaysUntilDue(assignment.dueDate) === 'Today'
                            ? 'bg-accent-warm/10 text-accent-warm'
                            : 'bg-surface-base text-text-secondary'
                        }`}>
                          {getDaysUntilDue(assignment.dueDate)}
                        </span>
                      )}
                    </div>

                    {/* Meta & Time */}
                    {assignment.timeEstimate && (
                      <p className="text-sm text-text-muted mt-2">{assignment.timeEstimate}</p>
                    )}

                    {/* Subtasks */}
                    {subtasksByAssignment[assignment.id]?.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <button
                          onClick={() => setExpandedAssignments(prev => {
                            const next = new Set(prev)
                            next.has(assignment.id) ? next.delete(assignment.id) : next.add(assignment.id)
                            return next
                          })}
                          className="text-sm text-text-secondary hover:text-text-primary flex items-center gap-2 transition-colors"
                        >
                          <span className="text-xs text-text-muted">
                            {subtasksByAssignment[assignment.id].filter(s => s.completed).length}/{subtasksByAssignment[assignment.id].length}
                          </span>
                          <span>subtasks</span>
                          <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedAssignments.has(assignment.id) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {expandedAssignments.has(assignment.id) && (
                          <div className="mt-3 space-y-2">
                            {subtasksByAssignment[assignment.id].map((subtask) => (
                              <div key={subtask.id} className="flex items-center gap-3">
                                <button
                                  onClick={() => handleToggleSubtask(subtask)}
                                  className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center transition-all ${
                                    subtask.completed
                                      ? 'bg-success text-white'
                                      : 'border border-text-muted/30 hover:border-success'
                                  }`}
                                >
                                  {subtask.completed && (
                                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </button>
                                <span className={`text-sm ${subtask.completed ? 'text-text-muted line-through' : 'text-text-secondary'}`}>
                                  {subtask.title}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Focus Button - Always visible */}
                    <button
                      onClick={() => startFocus(assignment)}
                      disabled={focusTask !== null}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${
                        focusTask !== null
                          ? 'bg-surface-base text-text-muted opacity-50'
                          : 'bg-primary/10 text-primary hover:bg-primary/20'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Focus
                    </button>

                    {/* Other actions - show on hover */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleGenerateBreakdown(assignment)}
                        disabled={generatingBreakdown}
                        className="p-2 text-text-muted hover:text-accent-cool hover:bg-accent-cool/10 rounded-lg transition-all"
                        title="AI Breakdown"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </button>
                      {assignment.source !== 'canvas' && (
                        <button
                          onClick={() => handleDeleteAssignment(assignment.id, assignment.source)}
                          className="p-2 text-text-muted hover:text-error hover:bg-error/10 rounded-lg transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                    </div>
                  </div>
                </div>
              </div>
            )})}
          </div>
        )}

        {/* Completed Section */}
        {completedAssignments.length > 0 && (
          <div className="mt-8 pt-6 border-t border-border">
            <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-4">Completed</h3>
            <div className="space-y-2">
              {completedAssignments.slice(0, 5).map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center gap-3 py-2 group"
                >
                  <button
                    onClick={() => handleToggleComplete(assignment.id, assignment.completed)}
                    className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0 hover:bg-success/30 transition-colors"
                  >
                    <svg className="w-3 h-3 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <span className="text-text-muted line-through text-sm">{assignment.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-surface-elevated rounded-3xl p-6 md:p-8 max-w-md w-full animate-scale-in">
            <h3 className="text-xl font-semibold text-text-primary mb-6">New Task</h3>
            <div className="space-y-4">
              <input
                type="text"
                value={newAssignment.title}
                onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                placeholder="What needs to be done?"
                className="input"
                autoFocus
              />
              <input
                type="text"
                value={newAssignment.subject}
                onChange={(e) => setNewAssignment({ ...newAssignment, subject: e.target.value })}
                placeholder="Subject (optional)"
                className="input"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={newAssignment.dueDate}
                  onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="input"
                  title="Due date"
                />
                <input
                  type="text"
                  value={newAssignment.timeEstimate}
                  onChange={(e) => setNewAssignment({ ...newAssignment, timeEstimate: e.target.value })}
                  placeholder="Time (e.g., 1h)"
                  className="input"
                />
              </div>
              <select
                value={newAssignment.priority}
                onChange={(e) => setNewAssignment({ ...newAssignment, priority: e.target.value })}
                className="input"
              >
                <option value="low">Low priority</option>
                <option value="medium">Medium priority</option>
                <option value="high">High priority</option>
              </select>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-3 bg-surface-overlay text-text-secondary rounded-xl hover:bg-surface-overlay/80 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAssignment}
                className="flex-1 py-3 bg-primary text-text-inverse rounded-xl hover:bg-primary-hover transition-colors font-medium"
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Breakdown Modal */}
      {breakdownModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-surface-elevated rounded-3xl p-6 md:p-8 max-w-lg w-full animate-scale-in max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-text-primary">Break it down</h3>
                <p className="text-sm text-text-muted mt-1">{breakdownModal.assignment.title}</p>
              </div>
              <button
                onClick={() => setBreakdownModal(null)}
                className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-overlay rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3 mb-8">
              {breakdownModal.suggestions.map((s, i) => (
                <div key={i} className="p-4 bg-surface-base rounded-xl">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-medium flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <div>
                      <div className="font-medium text-text-primary">{s.title}</div>
                      {s.description && (
                        <div className="text-sm text-text-muted mt-1">{s.description}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setBreakdownModal(null)}
                className="flex-1 py-3 bg-surface-overlay text-text-secondary rounded-xl hover:bg-surface-overlay/80 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAllSubtasks}
                className="flex-1 py-3 bg-primary text-text-inverse rounded-xl hover:bg-primary-hover transition-colors font-medium"
              >
                Add All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Focus Picker Modal */}
      {showFocusPicker && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-surface-elevated rounded-3xl p-6 md:p-8 max-w-lg w-full animate-scale-in max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-text-primary">Start Focus Session</h3>
                <p className="text-sm text-text-muted mt-1">Choose a task to focus on</p>
              </div>
              <button
                onClick={() => setShowFocusPicker(false)}
                className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-overlay rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-2 mb-6">
              {pendingAssignments.slice(0, 8).map((assignment) => {
                const risk = getDeadlineRisk(assignment)
                return (
                  <button
                    key={assignment.id}
                    onClick={() => {
                      startFocus(assignment)
                      setShowFocusPicker(false)
                    }}
                    className="w-full p-4 bg-surface-base hover:bg-surface-overlay rounded-xl text-left transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${risk.bg} flex items-center justify-center flex-shrink-0`}>
                        <svg className={`w-5 h-5 ${risk.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-text-primary truncate">{assignment.title}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {assignment.subject && (
                            <span className="text-xs text-text-muted">{assignment.subject}</span>
                          )}
                          {assignment.dueDate && (
                            <span className={`text-xs font-medium ${risk.color}`}>
                              {getDaysUntilDue(assignment.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-text-muted group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => setShowFocusPicker(false)}
              className="w-full py-3 bg-surface-overlay text-text-secondary rounded-xl hover:bg-surface-overlay/80 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
