import { useState, useEffect } from 'react'
import canvasService from '../services/canvasService'
import authService from '../services/authService'
import assignmentsService from '../services/assignmentsService'
import streakService from '../services/streakService'
import assignmentParserService from '../services/assignmentParserService'
import StreakCalendar from './StreakCalendar'

const Dashboard = ({ onOpenScanner }) => {
  const [userName, setUserName] = useState('there')
  const [assignments, setAssignments] = useState([])
  const [isLoadingCanvas, setIsLoadingCanvas] = useState(false)
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showStreakCalendar, setShowStreakCalendar] = useState(false)
  const [streak, setStreak] = useState({ currentStreak: 0, longestStreak: 0, isNewStreak: false })
  const [showStreakCelebration, setShowStreakCelebration] = useState(false)
  const [flyingAwayItems, setFlyingAwayItems] = useState(new Set())
  const [aiInput, setAiInput] = useState('')
  const [aiProcessing, setAiProcessing] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiSuccess, setAiSuccess] = useState('')
  const [showExamples, setShowExamples] = useState(false)
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    subject: '',
    dueDate: '',
    priority: 'medium',
    timeEstimate: '',
  })

  useEffect(() => {
    loadUserName()
    loadAssignments()
    checkStreak()
  }, [])

  const loadUserName = async () => {
    const { user } = await authService.getCurrentUser()
    await authService.refreshUserProfile()
    const profile = authService.getUserProfile()

    // Use full_name if available, otherwise use email username
    const name = profile?.full_name || user?.email?.split('@')[0] || 'there'
    setUserName(name)
  }

  const checkStreak = async () => {
    try {
      const { user } = await authService.getCurrentUser()
      if (!user) return

      // Just load the current streak (App.jsx handles updating it globally)
      const streakData = await streakService.getStreak(user.id)
      setStreak({
        currentStreak: streakData.currentStreak,
        longestStreak: streakData.longestStreak,
        isNewStreak: false
      })
    } catch (error) {
      console.error('Failed to load streak:', error)
    }
  }

  const loadAssignments = async () => {
    setIsLoadingAssignments(true)
    try {
      const { data, error } = await assignmentsService.getUpcomingAssignments()
      if (error) throw error

      // Convert to app format
      const formatted = assignmentsService.toAppFormatBatch(data)
      setAssignments(formatted)
    } catch (error) {
      console.error('Failed to load assignments:', error)
    } finally {
      setIsLoadingAssignments(false)
    }
  }

  const handleCreateAssignment = async () => {
    if (!newAssignment.title.trim()) {
      alert('Please enter a title')
      return
    }

    try {
      const { data, error} = await assignmentsService.createAssignment({
        title: newAssignment.title,
        subject: newAssignment.subject,
        dueDate: newAssignment.dueDate || null,
        priority: newAssignment.priority,
        timeEstimate: newAssignment.timeEstimate || null,
        source: 'manual',
      })

      if (error) throw error

      // Reload assignments
      await loadAssignments()

      // Reset form and close modal
      setNewAssignment({
        title: '',
        subject: '',
        dueDate: '',
        priority: 'medium',
        timeEstimate: '',
      })
      setShowAddModal(false)
    } catch (error) {
      console.error('Failed to create assignment:', error)
      alert('Failed to create assignment')
    }
  }

  const handleAiCreateAssignment = async () => {
    if (!aiInput.trim()) return

    setAiProcessing(true)
    setAiError('')
    setAiSuccess('')

    try {
      // Parse assignment with AI
      const assignmentData = await assignmentParserService.parseAssignment(aiInput)

      // Create assignment in database
      const { data, error } = await assignmentsService.createAssignment({
        title: assignmentData.title,
        subject: assignmentData.subject,
        dueDate: assignmentData.dueDate,
        priority: assignmentData.priority,
        timeEstimate: assignmentData.timeEstimate,
        source: 'ai',
      })

      if (error) throw error

      // Reload assignments
      await loadAssignments()

      // Show success
      setAiSuccess(`Created: ${assignmentData.title}`)
      setAiInput('')
      setTimeout(() => setAiSuccess(''), 3000)
    } catch (err) {
      console.error('Failed to create assignment:', err)
      setAiError('Failed to create assignment. Try being more specific.')
      setTimeout(() => setAiError(''), 5000)
    } finally {
      setAiProcessing(false)
    }
  }

  const handleDeleteAssignment = async (assignmentId, assignmentSource) => {
    // Only allow deleting manual and scanned assignments (not Canvas)
    if (assignmentSource === 'canvas') {
      alert('Canvas assignments cannot be deleted. Please delete them in Canvas.')
      return
    }

    if (!confirm('Are you sure you want to delete this assignment?')) {
      return
    }

    try {
      const { error } = await assignmentsService.deleteAssignment(assignmentId)

      if (error) throw error

      // Reload assignments
      await loadAssignments()
    } catch (error) {
      console.error('Failed to delete assignment:', error)
      alert('Failed to delete assignment')
    }
  }

  const handleToggleComplete = async (assignmentId, currentStatus) => {
    try {
      const newStatus = !currentStatus

      // If marking as complete, trigger fly-away animation
      if (newStatus) {
        // Optimistically update the UI to show completed state
        setAssignments(prev => prev.map(a =>
          a.id === assignmentId ? { ...a, completed: true, progress: 100 } : a
        ))

        // Small delay to show the checkmark before flying away
        setTimeout(() => {
          setFlyingAwayItems(prev => new Set([...prev, assignmentId]))
        }, 100)

        // Wait for animation to complete, then remove from UI
        setTimeout(async () => {
          // Update in database
          await assignmentsService.updateAssignment(assignmentId, {
            completed: true,
            progress: 100
          })

          // Remove from UI
          setAssignments(prev => prev.filter(a => a.id !== assignmentId))
          setFlyingAwayItems(prev => {
            const next = new Set(prev)
            next.delete(assignmentId)
            return next
          })
        }, 1000) // Matched to new 0.85s animation + 150ms buffer
      } else {
        // If unchecking, update immediately without animation
        const { error } = await assignmentsService.updateAssignment(assignmentId, {
          completed: false,
          progress: 0
        })

        if (error) throw error

        // Update local state optimistically
        setAssignments(prev => prev.map(a =>
          a.id === assignmentId ? { ...a, completed: false, progress: 0 } : a
        ))
      }
    } catch (error) {
      console.error('Failed to toggle completion:', error)
      alert('Failed to update assignment')
      // Reload on error
      await loadAssignments()
    }
  }

  const getTimeOfDayGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const loadCanvasAssignments = async () => {
    setIsLoadingCanvas(true)
    try {
      // Sync Canvas assignments to database
      const result = await canvasService.syncToDatabase()

      if (result.success) {
        // Reload assignments from database to show synced Canvas assignments
        await loadAssignments()

        // Show success message
        if (result.synced > 0) {
          alert(`✅ Successfully synced ${result.synced} assignments from Canvas!`)
        } else {
          alert('ℹ️ No new assignments found in Canvas')
        }
      } else {
        throw new Error(result.message || 'Sync failed')
      }
    } catch (error) {
      console.error('Failed to sync Canvas assignments:', error)
      alert(`❌ Failed to sync from Canvas: ${error.message}`)
    } finally {
      setIsLoadingCanvas(false)
    }
  }

  const determinePriority = (dueDate) => {
    if (!dueDate) return 'medium'
    const now = new Date()
    const due = new Date(dueDate)
    const daysUntil = Math.ceil((due - now) / (1000 * 60 * 60 * 24))

    if (daysUntil <= 1) return 'high'
    if (daysUntil <= 3) return 'medium'
    return 'low'
  }

  const estimateTime = (points) => {
    if (!points) return '1h'
    if (points <= 10) return '30m'
    if (points <= 50) return '1h 30m'
    return '2h 30m'
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'from-red-900/30 to-orange-900/30 border-red-700/40'
      case 'medium': return 'from-yellow-900/30 to-amber-900/30 border-yellow-700/40'
      case 'low': return 'from-green-900/30 to-emerald-900/30 border-green-700/40'
      default: return 'from-dark-bg-secondary to-dark-bg-tertiary border-dark-border-subtle'
    }
  }

  const getSubjectColor = (subject) => {
    const colors = {
      'Chemistry': 'bg-purple-600',
      'English': 'bg-amber-600',
      'Math': 'bg-cyan-600',
      'History': 'bg-orange-600',
      'Physics': 'bg-green-600',
    }
    return colors[subject] || 'bg-neutral-600'
  }

  const getSubjectBgColor = (subject) => {
    const colors = {
      'Chemistry': 'bg-dark-subject-chemistry',
      'English': 'bg-dark-subject-english',
      'Math': 'bg-dark-subject-math',
      'History': 'bg-dark-subject-history',
      'Physics': 'bg-dark-subject-physics',
    }
    return colors[subject] || 'bg-dark-bg-secondary'
  }

  const getDaysUntilDue = (dueDate) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Due today'
    if (diffDays === 1) return 'Due tomorrow'
    if (diffDays < 0) return 'Overdue'
    return `${diffDays} days`
  }

  return (
    <div className="space-y-5 md:space-y-6 lg:space-y-8 pb-6 md:pb-8 lg:pb-10">
      {/* Header with AI Status */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-dark-navy to-dark-navy-light p-6 md:p-8 lg:p-10 xl:p-12 shadow-dark-soft-lg border border-dark-border-glow">
        <div className="relative z-10">
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-primary-500 animate-pulse-soft shadow-glow-cyan"></div>
            <span className="text-dark-text-primary text-sm md:text-base lg:text-lg font-medium tracking-tight">AI Active</span>
          </div>
          <h2 className="text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-dark-text-primary mb-1.5 md:mb-3 tracking-tight">{getTimeOfDayGreeting()}, {userName}</h2>
          <p className="text-dark-text-secondary text-sm md:text-base lg:text-lg xl:text-xl">
            {assignments.length === 0
              ? 'No assignments - add one to get started!'
              : `You have ${assignments.length} assignment${assignments.length === 1 ? '' : 's'}`
            }
          </p>
        </div>

        {/* Decorative gradient orbs */}
        <div className="absolute -top-20 -right-20 w-60 h-60 md:w-80 md:h-80 lg:w-96 lg:h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-60 h-60 md:w-80 md:h-80 lg:w-96 lg:h-96 bg-dark-navy-dark/50 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Streak Display - Clickable */}
      <button
        onClick={() => setShowStreakCalendar(true)}
        className="w-full relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500/10 via-red-500/10 to-yellow-500/10 p-6 md:p-8 lg:p-10 shadow-dark-soft-lg border border-orange-500/30 hover:shadow-glow-orange transition-all active:scale-[0.98] text-left"
      >
        {/* Celebration overlay */}
        {showStreakCelebration && (
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 via-yellow-500/20 to-orange-500/20 animate-pulse-soft pointer-events-none"></div>
        )}

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-6 lg:gap-8">
            {/* Fire icon with animation */}
            <div className={`relative ${showStreakCelebration ? 'animate-bounce' : ''}`}>
              <div className="text-5xl md:text-7xl lg:text-8xl xl:text-9xl filter drop-shadow-[0_0_12px_rgba(251,146,60,0.8)]">
                🔥
              </div>
              {showStreakCelebration && (
                <div className="absolute inset-0 text-5xl md:text-7xl lg:text-8xl xl:text-9xl animate-ping opacity-75">
                  🔥
                </div>
              )}
            </div>

            {/* Streak info */}
            <div>
              <div className="flex items-baseline gap-2 md:gap-3 mb-1 md:mb-2">
                <span className="text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-400 to-yellow-400">
                  {streak.currentStreak}
                </span>
                <span className="text-lg md:text-2xl lg:text-3xl xl:text-4xl font-bold text-orange-300">
                  {streak.currentStreak === 1 ? 'day' : 'days'}
                </span>
              </div>
              <p className="text-sm md:text-base lg:text-lg xl:text-xl text-dark-text-secondary font-medium">
                Current streak
              </p>
            </div>
          </div>

          {/* Longest streak badge */}
          {streak.longestStreak > 0 && (
            <div className="text-right">
              <div className="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 lg:px-5 py-1.5 md:py-2 lg:py-3 rounded-xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 backdrop-blur-sm">
                <svg className="w-4 h-4 md:w-6 md:h-6 lg:w-7 lg:h-7 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <div className="text-left">
                  <div className="text-xs md:text-sm lg:text-base font-bold text-yellow-300">
                    {streak.longestStreak} best
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Motivational message */}
        {showStreakCelebration && (
          <div className="mt-3 md:mt-4 text-center animate-fadeIn">
            <p className="text-sm md:text-base lg:text-lg font-bold text-orange-300">
              🎉 Streak increased! Keep it going!
            </p>
          </div>
        )}

        {/* Subtle background pattern */}
        <div className="absolute bottom-0 right-0 w-32 h-32 md:w-48 md:h-48 lg:w-64 lg:h-64 opacity-10 pointer-events-none">
          <div className="text-8xl md:text-[10rem] lg:text-[12rem]">🔥</div>
        </div>

        {/* Tap hint */}
        <div className="absolute top-3 md:top-4 lg:top-5 right-3 md:right-4 lg:right-5 flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-lg bg-dark-bg-tertiary/70 backdrop-blur-sm border border-orange-500/30">
          <svg className="w-3 h-3 md:w-4 md:h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span className="text-[10px] md:text-xs font-semibold text-orange-300">Tap to view calendar</span>
        </div>
      </button>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-5">
        <button
          onClick={onOpenScanner}
          className="relative overflow-hidden bg-dark-bg-secondary rounded-2xl md:rounded-3xl p-4 md:p-6 lg:p-8 shadow-dark-soft-md border border-dark-border-glow hover:shadow-rim-light hover:border-primary-500/30 transition-all duration-200 active:scale-[0.98]">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-11 h-11 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-xl md:rounded-2xl bg-gradient-to-br from-primary-500 to-accent-cyan flex items-center justify-center shadow-glow-cyan">
              <svg className="w-5 h-5 md:w-8 md:h-8 lg:w-10 lg:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="text-left">
              <div className="font-semibold text-dark-text-primary text-sm md:text-base lg:text-lg tracking-tight">Scan</div>
              <div className="text-xs md:text-sm text-dark-text-muted">Homework</div>
            </div>
          </div>
        </button>

        <button
          onClick={() => setShowAddModal(true)}
          className="relative overflow-hidden bg-dark-bg-secondary rounded-2xl md:rounded-3xl p-4 md:p-6 lg:p-8 shadow-dark-soft-md border border-dark-border-glow hover:shadow-glow-green hover:border-green-500/30 transition-all duration-200 active:scale-[0.98]">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-11 h-11 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-xl md:rounded-2xl bg-gradient-to-br from-green-600 to-emerald-700 flex items-center justify-center shadow-glow-green">
              <svg className="w-5 h-5 md:w-8 md:h-8 lg:w-10 lg:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div className="text-left">
              <div className="font-semibold text-dark-text-primary text-sm md:text-base lg:text-lg tracking-tight">Add</div>
              <div className="text-xs md:text-sm text-dark-text-muted">Assignment</div>
            </div>
          </div>
        </button>
      </div>

      {/* Assignments Section */}
      <div>
        <div className="flex items-center justify-between mb-3.5 md:mb-5 lg:mb-6">
          <h3 className="text-lg md:text-2xl lg:text-3xl xl:text-4xl font-bold text-dark-text-primary tracking-tight">Upcoming</h3>
          <div className="flex items-center gap-2 md:gap-3">
            {isLoadingCanvas && (
              <div className="flex items-center gap-2 text-xs md:text-sm text-primary-500">
                <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Syncing...</span>
              </div>
            )}
            {!isLoadingCanvas && (
              <button
                onClick={loadCanvasAssignments}
                disabled={isLoadingCanvas}
                className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 lg:px-5 py-1.5 md:py-2 lg:py-3 text-sm md:text-base lg:text-lg bg-gradient-to-r from-primary-500 to-accent-cyan text-white font-semibold rounded-lg md:rounded-xl hover:shadow-glow-cyan transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Sync from Canvas</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 lg:gap-5">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className={`relative overflow-hidden rounded-2xl md:rounded-3xl ${getSubjectBgColor(assignment.subject)} border border-dark-border-glow p-5 md:p-6 lg:p-7 shadow-dark-soft-md hover:shadow-rim-light transition-all active:scale-[0.99] ${
                flyingAwayItems.has(assignment.id)
                  ? 'animate-fly-away'
                  : assignment.completed
                  ? 'duration-300 opacity-80'
                  : 'duration-200'
              } ${
                assignment.completed && !flyingAwayItems.has(assignment.id)
                  ? 'success-flash'
                  : ''
              }`}
            >
              {/* Badges and Actions */}
              <div className="absolute top-3.5 md:top-5 lg:top-6 right-3.5 md:right-5 lg:right-6 flex items-center gap-2 md:gap-3">
                {/* AI Badge */}
                {assignment.aiCaptured && (
                  <div className="flex items-center gap-1.5 px-2.5 md:px-3 py-1 md:py-1.5 rounded-full bg-dark-bg-secondary/80 shadow-dark-soft border border-dark-border-glow">
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-gradient-to-r from-primary-500 to-accent-purple shadow-glow-cyan"></div>
                    <span className="text-xs md:text-sm font-semibold text-dark-text-primary tracking-tight">AI</span>
                  </div>
                )}

                {/* Delete Button - For manual and scanned assignments */}
                {assignment.source !== 'canvas' && (
                  <button
                    onClick={() => handleDeleteAssignment(assignment.id, assignment.source)}
                    className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-lg md:rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/50 transition-all active:scale-95 flex items-center justify-center"
                    title="Delete assignment"
                  >
                    <svg className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Subject Badge */}
              <div className="flex items-center gap-2 md:gap-3 mb-2.5 md:mb-3">
                <div className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full ${getSubjectColor(assignment.subject)} shadow-xs`}></div>
                <span className="text-xs md:text-sm lg:text-base font-semibold text-dark-text-secondary tracking-tight">{assignment.subject}</span>
              </div>

              {/* Title */}
              <h4 className="text-base md:text-lg lg:text-xl font-semibold text-dark-text-primary mb-2.5 md:mb-3 lg:mb-4 pr-16 md:pr-20 lg:pr-24 tracking-tight leading-snug">
                {assignment.title}
              </h4>

              {/* Meta Info */}
              <div className="flex items-center gap-4 md:gap-5 text-xs md:text-sm text-dark-text-secondary mb-3.5 md:mb-4">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">{assignment.timeEstimate}</span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2">
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-semibold">{getDaysUntilDue(assignment.dueDate)}</span>
                </div>
              </div>

              {/* Mark as Done Checkbox */}
              <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
                <button
                  onClick={() => handleToggleComplete(assignment.id, assignment.completed)}
                  className={`w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 rounded-lg md:rounded-xl border-2 flex items-center justify-center transition-all ${
                    assignment.completed
                      ? 'bg-green-500 border-green-500'
                      : 'border-dark-border-glow hover:border-primary-500'
                  }`}
                >
                  {assignment.completed && (
                    <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <span className={`text-sm md:text-base font-medium ${
                  assignment.completed
                    ? 'text-green-400 line-through'
                    : 'text-dark-text-primary'
                }`}>
                  {assignment.completed ? 'Completed' : 'Mark as done'}
                </span>
              </div>

              {/* Progress Bar */}
              {!assignment.completed && (
                <div>
                  <div className="flex items-center justify-between mb-1.5 md:mb-2">
                    <span className="text-xs md:text-sm font-semibold text-dark-text-secondary tracking-tight">Progress</span>
                    <span className="text-xs md:text-sm font-bold text-primary-500">{assignment.progress}%</span>
                  </div>
                  <div className="w-full h-2 md:h-3 bg-dark-bg-primary rounded-full overflow-hidden shadow-dark-inner">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-accent-cyan rounded-full transition-all duration-500 shadow-glow-cyan"
                      style={{ width: `${assignment.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add Assignment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 md:p-6 lg:p-8 animate-fadeIn">
          <div className="bg-dark-bg-secondary rounded-3xl p-6 md:p-8 lg:p-10 max-w-md md:max-w-xl lg:max-w-2xl w-full shadow-2xl border border-dark-border-glow animate-scaleIn">
            <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-dark-text-primary mb-4 md:mb-6">Add Assignment</h3>

            <div className="space-y-4 md:space-y-5 lg:space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm md:text-base lg:text-lg font-medium text-dark-text-secondary mb-1.5 md:mb-2">Title *</label>
                <input
                  type="text"
                  value={newAssignment.title}
                  onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                  placeholder="e.g., Math Homework Ch. 5"
                  className="w-full px-4 md:px-5 lg:px-6 py-2.5 md:py-3 lg:py-4 bg-dark-bg-tertiary border border-dark-border-subtle rounded-xl md:rounded-2xl text-sm md:text-base lg:text-lg text-dark-text-primary placeholder-dark-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm md:text-base lg:text-lg font-medium text-dark-text-secondary mb-1.5 md:mb-2">Subject</label>
                <input
                  type="text"
                  value={newAssignment.subject}
                  onChange={(e) => setNewAssignment({ ...newAssignment, subject: e.target.value })}
                  placeholder="e.g., Math, Chemistry"
                  className="w-full px-4 md:px-5 lg:px-6 py-2.5 md:py-3 lg:py-4 bg-dark-bg-tertiary border border-dark-border-subtle rounded-xl md:rounded-2xl text-sm md:text-base lg:text-lg text-dark-text-primary placeholder-dark-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm md:text-base lg:text-lg font-medium text-dark-text-secondary mb-1.5 md:mb-2">Due Date</label>
                <input
                  type="date"
                  value={newAssignment.dueDate}
                  onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                  className="w-full px-4 md:px-5 lg:px-6 py-2.5 md:py-3 lg:py-4 bg-dark-bg-tertiary border border-dark-border-subtle rounded-xl md:rounded-2xl text-sm md:text-base lg:text-lg text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm md:text-base lg:text-lg font-medium text-dark-text-secondary mb-1.5 md:mb-2">Priority</label>
                <select
                  value={newAssignment.priority}
                  onChange={(e) => setNewAssignment({ ...newAssignment, priority: e.target.value })}
                  className="w-full px-4 md:px-5 lg:px-6 py-2.5 md:py-3 lg:py-4 bg-dark-bg-tertiary border border-dark-border-subtle rounded-xl md:rounded-2xl text-sm md:text-base lg:text-lg text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              {/* Time Estimate */}
              <div>
                <label className="block text-sm md:text-base lg:text-lg font-medium text-dark-text-secondary mb-1.5 md:mb-2">Time Estimate</label>
                <input
                  type="text"
                  value={newAssignment.timeEstimate}
                  onChange={(e) => setNewAssignment({ ...newAssignment, timeEstimate: e.target.value })}
                  placeholder="e.g., 1h 30m"
                  className="w-full px-4 md:px-5 lg:px-6 py-2.5 md:py-3 lg:py-4 bg-dark-bg-tertiary border border-dark-border-subtle rounded-xl md:rounded-2xl text-sm md:text-base lg:text-lg text-dark-text-primary placeholder-dark-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 md:gap-4 mt-6 md:mt-8">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setNewAssignment({
                    title: '',
                    subject: '',
                    dueDate: '',
                    priority: 'medium',
                    timeEstimate: '',
                  })
                }}
                className="flex-1 py-2.5 md:py-3 lg:py-4 px-4 md:px-6 bg-dark-bg-tertiary text-dark-text-primary text-sm md:text-base lg:text-lg font-semibold rounded-xl md:rounded-2xl hover:bg-dark-bg-surface transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAssignment}
                className="flex-1 py-2.5 md:py-3 lg:py-4 px-4 md:px-6 bg-gradient-to-r from-primary-500 to-accent-cyan text-white text-sm md:text-base lg:text-lg font-semibold rounded-xl md:rounded-2xl hover:shadow-glow-cyan transition-all active:scale-95"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Streak Calendar Modal */}
      {showStreakCalendar && (
        <StreakCalendar
          onClose={() => setShowStreakCalendar(false)}
          currentStreak={streak.currentStreak}
          longestStreak={streak.longestStreak}
        />
      )}
    </div>
  )
}

export default Dashboard
