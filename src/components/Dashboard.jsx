import { useState, useEffect } from 'react'
import canvasService from '../services/canvasService'
import authService from '../services/authService'
import assignmentsService from '../services/assignmentsService'
import assignmentParserService from '../services/assignmentParserService'
import subtasksService from '../services/subtasksService'
import taskBreakdownService from '../services/taskBreakdownService'
import infiniteCampusService from '../services/infiniteCampusService'
import courseStatsService from '../services/courseStatsService'
import { toast } from './Toast'
import { confirmDialog } from './ConfirmDialog'

const Dashboard = ({ onOpenScanner }) => {
  const [userName, setUserName] = useState('there')
  const [assignments, setAssignments] = useState([])
  const [isLoadingCanvas, setIsLoadingCanvas] = useState(false)
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true)
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
  const [showStats, setShowStats] = useState(false)

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
  }, [])

  const loadUserName = async () => {
    const { user } = await authService.getCurrentUser()
    await authService.refreshUserProfile()
    const profile = authService.getUserProfile()
    setUserName(profile?.full_name || user?.email?.split('@')[0] || 'there')
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
        toast.success(result.synced > 0 ? `Synced ${result.synced} assignments` : 'No new assignments')
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
    if (diffDays === 0) return 'Due today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays < 0) return 'Overdue'
    return `${diffDays} days`
  }

  const recentAssignments = filterRecentAssignments(assignments)
  const completedCount = recentAssignments.filter(a => a.completed).length
  const pendingCount = recentAssignments.filter(a => !a.completed).length

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {getTimeOfDayGreeting()}, {userName}
          </h1>
          <p className="text-text-secondary mt-1">
            <span className="text-success">{completedCount} done</span>
            <span className="mx-2">·</span>
            <span className="text-warning">{pendingCount} pending</span>
          </p>
        </div>
        <button
          onClick={loadCanvasAssignments}
          disabled={isLoadingCanvas}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isLoadingCanvas ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          Sync Canvas
        </button>
      </div>

      {/* Quick Add */}
      <div className="bg-surface-elevated rounded-xl p-4 border border-border">
        <div className="flex gap-3">
          <input
            type="text"
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAiCreateAssignment()}
            placeholder="Add assignment... (e.g., Math homework due Friday)"
            className="flex-1 px-4 py-2.5 bg-surface-base border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
            disabled={aiProcessing}
          />
          <button
            onClick={handleAiCreateAssignment}
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
        <p className="text-xs text-text-muted mt-2">
          AI will parse your text to create an assignment with due date, subject, and priority
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <button
          onClick={onOpenScanner}
          className="flex-1 p-4 bg-surface-elevated rounded-xl border border-border hover:border-primary transition-colors flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="text-left">
            <div className="font-medium text-text-primary">Scan</div>
            <div className="text-sm text-text-muted">Homework</div>
          </div>
        </button>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex-1 p-4 bg-surface-elevated rounded-xl border border-border hover:border-success transition-colors flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-success flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div className="text-left">
            <div className="font-medium text-text-primary">Add</div>
            <div className="text-sm text-text-muted">Manual</div>
          </div>
        </button>
      </div>

      {/* Assignments */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Upcoming</h2>

        {isLoadingAssignments ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : recentAssignments.length === 0 ? (
          <div className="text-center py-8 text-text-muted">
            No upcoming assignments
          </div>
        ) : (
          <div className="space-y-3">
            {recentAssignments.filter(a => !a.completed).map((assignment) => (
              <div
                key={assignment.id}
                className="bg-surface-elevated rounded-xl p-4 border border-border hover:border-border-active transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => handleToggleComplete(assignment.id, assignment.completed)}
                    className="mt-0.5 w-5 h-5 rounded border-2 border-border hover:border-primary transition-colors flex-shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {assignment.subject && (
                        <span className="text-xs font-medium text-text-muted">{assignment.subject}</span>
                      )}
                      {assignment.aiCaptured && (
                        <span className="text-xs px-1.5 py-0.5 bg-accent/20 text-accent rounded">AI</span>
                      )}
                    </div>
                    <h3 className="font-medium text-text-primary">{assignment.title}</h3>
                    <div className="flex items-center gap-3 mt-2 text-sm text-text-secondary">
                      {assignment.dueDate && (
                        <span className={getDaysUntilDue(assignment.dueDate) === 'Overdue' ? 'text-error' : ''}>
                          {getDaysUntilDue(assignment.dueDate)}
                        </span>
                      )}
                      {assignment.timeEstimate && <span>{assignment.timeEstimate}</span>}
                    </div>

                    {/* Subtasks */}
                    {subtasksByAssignment[assignment.id]?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <button
                          onClick={() => setExpandedAssignments(prev => {
                            const next = new Set(prev)
                            next.has(assignment.id) ? next.delete(assignment.id) : next.add(assignment.id)
                            return next
                          })}
                          className="text-sm text-text-secondary hover:text-text-primary flex items-center gap-1"
                        >
                          <span>Subtasks ({subtasksByAssignment[assignment.id].filter(s => s.completed).length}/{subtasksByAssignment[assignment.id].length})</span>
                          <svg className={`w-4 h-4 transition-transform ${expandedAssignments.has(assignment.id) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {expandedAssignments.has(assignment.id) && (
                          <div className="mt-2 space-y-2">
                            {subtasksByAssignment[assignment.id].map((subtask) => (
                              <div key={subtask.id} className="flex items-center gap-2 pl-1">
                                <button
                                  onClick={() => handleToggleSubtask(subtask)}
                                  className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                                    subtask.completed ? 'bg-success border-success' : 'border-border'
                                  }`}
                                >
                                  {subtask.completed && (
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </button>
                                <span className={`text-sm ${subtask.completed ? 'text-text-muted line-through' : 'text-text-primary'}`}>
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
                    <button
                      onClick={() => handleGenerateBreakdown(assignment)}
                      disabled={generatingBreakdown}
                      className="p-2 text-text-muted hover:text-accent transition-colors"
                      title="AI Breakdown"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </button>
                    {assignment.source !== 'canvas' && (
                      <button
                        onClick={() => handleDeleteAssignment(assignment.id, assignment.source)}
                        className="p-2 text-text-muted hover:text-error transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Completed Section */}
        {recentAssignments.filter(a => a.completed).length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-text-muted mb-3">Completed</h3>
            <div className="space-y-2">
              {recentAssignments.filter(a => a.completed).map((assignment) => (
                <div
                  key={assignment.id}
                  className="bg-surface-elevated/50 rounded-lg p-3 border border-border flex items-center gap-3"
                >
                  <button
                    onClick={() => handleToggleComplete(assignment.id, assignment.completed)}
                    className="w-5 h-5 rounded bg-success flex items-center justify-center flex-shrink-0"
                  >
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <span className="text-text-muted line-through">{assignment.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stats Toggle */}
      <button
        onClick={() => setShowStats(!showStats)}
        className="w-full p-3 bg-surface-elevated rounded-xl border border-border text-text-secondary hover:text-text-primary flex items-center justify-center gap-2 transition-colors"
      >
        <span>{showStats ? 'Hide' : 'Show'} Stats</span>
        <svg className={`w-4 h-4 transition-transform ${showStats ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showStats && (
        <div className="grid grid-cols-2 gap-4 animate-fade-in">
          <div className="bg-surface-elevated rounded-xl p-4 border border-border">
            <div className="text-3xl font-bold text-primary">{completedCount}</div>
            <div className="text-sm text-text-muted">Completed</div>
          </div>
          <div className="bg-surface-elevated rounded-xl p-4 border border-border">
            <div className="text-3xl font-bold text-warning">{pendingCount}</div>
            <div className="text-sm text-text-muted">Pending</div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-surface-elevated rounded-xl p-6 max-w-md w-full border border-border animate-scale-in">
            <h3 className="text-xl font-bold text-text-primary mb-4">Add Assignment</h3>
            <div className="space-y-4">
              <input
                type="text"
                value={newAssignment.title}
                onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                placeholder="Title"
                className="w-full px-4 py-2.5 bg-surface-base border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
              />
              <input
                type="text"
                value={newAssignment.subject}
                onChange={(e) => setNewAssignment({ ...newAssignment, subject: e.target.value })}
                placeholder="Subject"
                className="w-full px-4 py-2.5 bg-surface-base border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
              />
              <input
                type="date"
                value={newAssignment.dueDate}
                onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                className="w-full px-4 py-2.5 bg-surface-base border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
              />
              <select
                value={newAssignment.priority}
                onChange={(e) => setNewAssignment({ ...newAssignment, priority: e.target.value })}
                className="w-full px-4 py-2.5 bg-surface-base border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
              <input
                type="text"
                value={newAssignment.timeEstimate}
                onChange={(e) => setNewAssignment({ ...newAssignment, timeEstimate: e.target.value })}
                placeholder="Time estimate (e.g., 1h 30m)"
                className="w-full px-4 py-2.5 bg-surface-base border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 bg-surface-base border border-border text-text-primary rounded-lg hover:bg-surface-overlay transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAssignment}
                className="flex-1 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Breakdown Modal */}
      {breakdownModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-surface-elevated rounded-xl p-6 max-w-lg w-full border border-border animate-scale-in max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-text-primary">AI Breakdown</h3>
                <p className="text-sm text-text-muted">{breakdownModal.assignment.title}</p>
              </div>
              <button onClick={() => setBreakdownModal(null)} className="p-2 text-text-muted hover:text-text-primary">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3 mb-6">
              {breakdownModal.suggestions.map((s, i) => (
                <div key={i} className="p-3 bg-surface-base rounded-lg border border-border">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded bg-primary/20 text-primary text-sm font-medium flex items-center justify-center">{i + 1}</span>
                    <div>
                      <div className="font-medium text-text-primary">{s.title}</div>
                      {s.description && <div className="text-sm text-text-muted mt-1">{s.description}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setBreakdownModal(null)} className="flex-1 py-2.5 bg-surface-base border border-border text-text-primary rounded-lg">
                Cancel
              </button>
              <button onClick={handleAddAllSubtasks} className="flex-1 py-2.5 bg-primary text-white rounded-lg">
                Add All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
