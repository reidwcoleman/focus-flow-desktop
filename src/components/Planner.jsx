import { useState, useEffect } from 'react'
import calendarService from '../services/calendarService'
import activityParserService from '../services/activityParserService'
import canvasService from '../services/canvasService'
import { confirmDialog } from './ConfirmDialog'
import { toast } from './Toast'

const Planner = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(false)
  const [aiInput, setAiInput] = useState('')
  const [aiProcessing, setAiProcessing] = useState(false)

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  useEffect(() => {
    loadActivities()
  }, [currentDate])

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
      homework: 'bg-warning',
      class: 'bg-success',
      exam: 'bg-error',
      break: 'bg-accent',
    }
    return colors[type] || 'bg-text-muted'
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Planner</h1>
        <button
          onClick={syncCanvas}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Sync Canvas
        </button>
      </div>

      {/* AI Input */}
      <div className="bg-surface-elevated rounded-xl p-4 border border-border">
        <div className="flex gap-3">
          <input
            type="text"
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAiCreate()}
            placeholder="Add activity... (e.g., Study Math 3-5pm tomorrow)"
            className="flex-1 px-4 py-2.5 bg-surface-base border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
            disabled={aiProcessing}
          />
          <button
            onClick={handleAiCreate}
            disabled={aiProcessing || !aiInput.trim()}
            className="px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {aiProcessing ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-surface-elevated rounded-xl p-4 border border-border">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 text-text-muted hover:text-text-primary transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-text-primary">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button onClick={nextMonth} className="p-2 text-text-muted hover:text-text-primary transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-xs font-medium text-text-muted py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {getDaysInMonth().map((day, index) => {
                const dayActivities = getActivitiesForDay(day)
                const activityCount = dayActivities.length
                const hasIncomplete = dayActivities.some(a => !a.is_completed)

                return (
                  <button
                    key={index}
                    onClick={() => selectDay(day)}
                    disabled={!day}
                    className={`aspect-square p-1 rounded-lg text-sm transition-colors relative ${
                      !day ? 'cursor-default' :
                      isSelected(day) ? 'bg-primary text-white' :
                      isToday(day) ? 'bg-primary/20 text-primary' :
                      'hover:bg-surface-overlay text-text-primary'
                    }`}
                  >
                    {day && (
                      <>
                        <span className="font-medium">{day}</span>
                        {activityCount > 0 && (
                          <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${
                            hasIncomplete ? 'bg-primary' : 'bg-success'
                          }`} />
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
        <div className="bg-surface-elevated rounded-xl p-4 border border-border">
          <h3 className="font-semibold text-text-primary mb-4">
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </h3>

          {dayActivities.length === 0 ? (
            <p className="text-text-muted text-center py-8">No activities</p>
          ) : (
            <div className="space-y-3">
              {dayActivities.map((activity) => (
                <div
                  key={activity.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    activity.is_completed
                      ? 'bg-surface-base/50 border-border'
                      : 'bg-surface-base border-border hover:border-border-active'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleToggleComplete(activity.id, activity.is_completed)}
                      className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 flex items-center justify-center ${
                        activity.is_completed
                          ? 'bg-success'
                          : 'border-2 border-border hover:border-primary'
                      }`}
                    >
                      {activity.is_completed && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${getActivityColor(activity.activity_type)}`} />
                        {activity.start_time && (
                          <span className="text-xs text-text-muted">{formatTime(activity.start_time)}</span>
                        )}
                      </div>
                      <h4 className={`font-medium ${activity.is_completed ? 'text-text-muted line-through' : 'text-text-primary'}`}>
                        {activity.title}
                      </h4>
                      {activity.duration_minutes && (
                        <p className="text-xs text-text-muted mt-1">{activity.duration_minutes} min</p>
                      )}
                    </div>

                    <button
                      onClick={() => handleDelete(activity.id)}
                      className="p-1.5 text-text-muted hover:text-error transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Planner
