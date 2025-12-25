import { useState, useEffect } from 'react'
import calendarService from '../services/calendarService'
import activityParserService from '../services/activityParserService'
import canvasService from '../services/canvasService'
import assignmentsService from '../services/assignmentsService'
import { confirmDialog } from './ConfirmDialog'
import { toast } from './Toast'

const Planner = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(false)
  const [aiInput, setAiInput] = useState('')
  const [aiProcessing, setAiProcessing] = useState(false)
  const [showAssignments, setShowAssignments] = useState(() => {
    const saved = localStorage.getItem('plannerShowAssignments')
    return saved !== null ? JSON.parse(saved) : false
  })
  const [assignments, setAssignments] = useState([])

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  useEffect(() => {
    loadActivities()
  }, [currentDate])

  useEffect(() => {
    localStorage.setItem('plannerShowAssignments', JSON.stringify(showAssignments))
    if (showAssignments) {
      loadAssignments()
    }
  }, [showAssignments])

  const loadAssignments = async () => {
    try {
      const data = await assignmentsService.getUpcomingAssignments()
      setAssignments(data.map(a => assignmentsService.toAppFormat(a)))
    } catch (err) {
      console.error('Failed to load assignments:', err)
    }
  }

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

  const handleAiCreate = async () => {
    if (!aiInput.trim()) return
    setAiProcessing(true)
    try {
      const parseResult = await activityParserService.parseActivity(aiInput)

      if (parseResult.isRecurring) {
        let created = 0
        for (const activityData of parseResult.activities) {
          await calendarService.createActivity({ ...activityData, ai_generated: true })
          created++
        }
        toast.success(`Created ${created} activities`)
      } else {
        await calendarService.createActivity({ ...parseResult, ai_generated: true })
        toast.success(`Created: ${parseResult.title}`)
      }

      await loadActivities()
      setAiInput('')
    } catch (err) {
      toast.error('Failed to create activity')
    } finally {
      setAiProcessing(false)
    }
  }

  const handleToggleComplete = async (id, currentStatus) => {
    try {
      await calendarService.toggleCompletion(id, !currentStatus)
      setActivities(prev => prev.map(a =>
        a.id === id ? { ...a, is_completed: !currentStatus } : a
      ))
    } catch (err) {
      toast.error('Failed to update')
    }
  }

  const handleDelete = async (id) => {
    const confirmed = await confirmDialog('Delete Activity', 'Are you sure?')
    if (confirmed) {
      await calendarService.deleteActivity(id)
      await loadActivities()
    }
  }

  const syncCanvas = async () => {
    try {
      const result = await canvasService.syncToDatabase()
      if (result.success) {
        await loadActivities()
        toast.success(result.synced > 0 ? `Synced ${result.synced} items` : 'Up to date')
      }
    } catch (err) {
      toast.error('Failed to sync')
    }
  }

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let i = 1; i <= daysInMonth; i++) days.push(i)
    return days
  }

  const getActivitiesForDay = (day) => {
    if (!day) return []
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      .toISOString().split('T')[0]
    return activities.filter(a => a.activity_date === dateStr)
  }

  const getAssignmentsForDay = (day) => {
    if (!day || !showAssignments) return []
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      .toISOString().split('T')[0]
    return assignments
      .filter(a => a.dueDate === dateStr && !a.completed)
      .map(a => ({
        id: a.id,
        title: a.title,
        activity_type: 'assignment',
        subject: a.subject,
        is_completed: a.completed,
        isAssignment: true,
        priority: a.priority,
        dueDate: a.dueDate
      }))
  }

  const isToday = (day) => {
    const today = new Date()
    return day && currentDate.getFullYear() === today.getFullYear() &&
      currentDate.getMonth() === today.getMonth() && day === today.getDate()
  }

  const isSelected = (day) => {
    return day && currentDate.getFullYear() === selectedDate.getFullYear() &&
      currentDate.getMonth() === selectedDate.getMonth() && day === selectedDate.getDate()
  }

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))

  const selectDay = (day) => {
    if (day) setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))
  }

  const selectedDateStr = selectedDate.toISOString().split('T')[0]
  const dayActivities = activities
    .filter(a => a.activity_date === selectedDateStr)
    .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))

  const formatTime = (time) => {
    if (!time) return ''
    const [h, m] = time.split(':')
    const hour = parseInt(h)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const h12 = hour % 12 || 12
    return `${h12}:${m} ${ampm}`
  }

  const getActivityColor = (type) => {
    const colors = {
      study: 'bg-primary',
      homework: 'bg-accent-warm',
      class: 'bg-success',
      exam: 'bg-error',
      break: 'bg-accent-cool',
    }
    return colors[type] || 'bg-text-muted'
  }

  return (
    <div className="min-h-screen p-6 md:p-8 lg:p-10 max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-8 animate-fade-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-text-primary tracking-tight">Planner</h1>
            <p className="text-text-secondary mt-1">Schedule your study sessions</p>
          </div>
          <button
            onClick={() => setShowAssignments(!showAssignments)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
              showAssignments
                ? 'bg-accent-warm/20 text-accent-warm border border-accent-warm/30'
                : 'bg-surface-elevated text-text-muted hover:text-text-secondary border border-border'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span>{showAssignments ? 'Hide' : 'Show'} Assignments</span>
          </button>
        </div>
      </header>

      {/* Quick Add */}
      <div className="mb-8 animate-fade-up stagger-1">
        <div className="relative">
          <input
            type="text"
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAiCreate()}
            placeholder="Add activity... (e.g., Study Math 3-5pm tomorrow)"
            className="input pr-14 py-4"
            disabled={aiProcessing}
          />
          <button
            onClick={handleAiCreate}
            disabled={aiProcessing || !aiInput.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-all disabled:opacity-30"
          >
            {aiProcessing ? (
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-up stagger-2">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-surface-elevated rounded-2xl p-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-overlay rounded-lg transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-xl font-semibold text-text-primary">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button onClick={nextMonth} className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-overlay rounded-lg transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-3">
            {dayNames.map(day => (
              <div key={day} className="text-center text-xs font-medium text-text-muted py-2 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {getDaysInMonth().map((day, index) => {
                const dayActivities = getActivitiesForDay(day)
                const dayAssignments = getAssignmentsForDay(day)
                const activityCount = dayActivities.length
                const assignmentCount = dayAssignments.length
                const hasIncomplete = dayActivities.some(a => !a.is_completed)

                return (
                  <button
                    key={index}
                    onClick={() => selectDay(day)}
                    disabled={!day}
                    className={`aspect-square p-2 rounded-xl text-sm transition-all relative ${
                      !day ? 'cursor-default' :
                      isSelected(day) ? 'bg-primary text-white font-medium' :
                      isToday(day) ? 'bg-primary/15 text-primary font-medium' :
                      'hover:bg-surface-overlay text-text-primary'
                    }`}
                  >
                    {day && (
                      <>
                        <span>{day}</span>
                        {(activityCount > 0 || assignmentCount > 0) && (
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5">
                            {activityCount > 0 && (
                              <div className={`w-1 h-1 rounded-full ${
                                isSelected(day) ? 'bg-white' :
                                hasIncomplete ? 'bg-primary' : 'bg-success'
                              }`} />
                            )}
                            {assignmentCount > 0 && (
                              <div className={`w-1 h-1 rounded-full ${
                                isSelected(day) ? 'bg-white' : 'bg-accent-warm'
                              }`} />
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Day Activities */}
        <div className="bg-surface-elevated rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-1">
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}
          </h3>
          <p className="text-sm text-text-muted mb-6">
            {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
          </p>

          {(() => {
            const selectedAssignments = showAssignments
              ? assignments
                  .filter(a => a.dueDate === selectedDateStr && !a.completed)
                  .map(a => ({
                    id: a.id,
                    title: a.title,
                    subject: a.subject,
                    isAssignment: true,
                    priority: a.priority
                  }))
              : []
            const allItems = [...dayActivities, ...selectedAssignments]

            if (allItems.length === 0) {
              return (
                <div className="text-center py-12">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-surface-base flex items-center justify-center">
                    <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-text-muted text-sm">No activities{showAssignments ? ' or assignments' : ''}</p>
                </div>
              )
            }

            return (
              <div className="space-y-3">
                {/* Activities */}
                {dayActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className={`p-4 rounded-xl transition-all ${
                      activity.is_completed
                        ? 'bg-surface-base/50'
                        : 'bg-surface-base hover:bg-surface-overlay'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleToggleComplete(activity.id, activity.is_completed)}
                        className={`mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-all ${
                          activity.is_completed
                            ? 'bg-success/20'
                            : 'border-2 border-text-muted/30 hover:border-primary'
                        }`}
                      >
                        {activity.is_completed && (
                          <svg className="w-3 h-3 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${getActivityColor(activity.activity_type)}`} />
                          {activity.start_time && (
                            <span className="text-xs text-text-muted">{formatTime(activity.start_time)}</span>
                          )}
                        </div>
                        <h4 className={`font-medium text-sm ${activity.is_completed ? 'text-text-muted line-through' : 'text-text-primary'}`}>
                          {activity.title}
                        </h4>
                        {activity.duration_minutes && (
                          <p className="text-xs text-text-muted mt-1">{activity.duration_minutes} min</p>
                        )}
                      </div>

                      <button
                        onClick={() => handleDelete(activity.id)}
                        className="p-1.5 text-text-muted hover:text-error hover:bg-error/10 rounded-lg transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}

                {/* Assignments */}
                {selectedAssignments.map((assignment) => (
                  <div
                    key={`assignment-${assignment.id}`}
                    className="p-4 rounded-xl bg-accent-warm/5 border border-accent-warm/20 hover:border-accent-warm/40 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center bg-accent-warm/20">
                        <svg className="w-3 h-3 text-accent-warm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-accent-warm" />
                          <span className="text-xs text-accent-warm font-medium">Assignment Due</span>
                        </div>
                        <h4 className="font-medium text-sm text-text-primary">
                          {assignment.title}
                        </h4>
                        {assignment.subject && (
                          <p className="text-xs text-text-muted mt-1">{assignment.subject}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

export default Planner
