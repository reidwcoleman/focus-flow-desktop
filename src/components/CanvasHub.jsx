import { useState, useEffect } from 'react'
import canvasService from '../services/canvasService'
import { toast } from './Toast'
import { confirmDialog } from './ConfirmDialog'

const CanvasHub = () => {
  const [courses, setCourses] = useState([])
  const [assignments, setAssignments] = useState([])
  const [grades, setGrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [activeView, setActiveView] = useState('courses')
  const [lastSyncTime, setLastSyncTime] = useState(null)
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [blockedCourses, setBlockedCourses] = useState([])
  const [recovering, setRecovering] = useState(null)
  const [cleaning, setCleaning] = useState(false)

  useEffect(() => {
    loadCanvasData()
  }, [])

  const loadCanvasData = async () => {
    setLoading(true)
    setError(null)
    try {
      const isConnected = await canvasService.isConnected()
      if (!isConnected) {
        setError('Canvas not connected. Please configure Canvas in Account settings.')
        setLoading(false)
        return
      }

      const [coursesData, assignmentsData, gradesData, blockedCoursesData] = await Promise.all([
        canvasService.getSyncedCourses().catch(() => []),
        canvasService.getSyncedAssignments().catch(() => []),
        canvasService.getSyncedGrades().catch(() => []),
        canvasService.getBlockedCoursesWithDetails().catch(() => [])
      ])

      setCourses(coursesData || [])
      setAssignments(assignmentsData || [])
      setGrades(gradesData || [])
      setBlockedCourses(blockedCoursesData || [])

      const latestSync = coursesData?.[0]?.syncedAt || gradesData?.[0]?.syncedAt
      if (latestSync) {
        setLastSyncTime(new Date(latestSync))
      }
    } catch (err) {
      console.error('Failed to load Canvas data:', err)
      setError(err.message || 'Failed to load Canvas data')
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const result = await canvasService.syncToDatabase()
      if (result.success) {
        toast.success(`Synced ${result.courses} courses, ${result.assignments} assignments, ${result.grades} grades`)
        setLastSyncTime(new Date())
        await loadCanvasData()
      } else {
        throw new Error(result.message || 'Sync failed')
      }
    } catch (err) {
      toast.error(`Sync failed: ${err.message}`)
    } finally {
      setSyncing(false)
    }
  }

  const handleDeleteCourse = async (courseId) => {
    const confirmed = await confirmDialog('Delete Course', 'Remove this course from your local data?')
    if (!confirmed) return

    setDeleting(courseId)
    try {
      await canvasService.deleteCourse(courseId)
      setCourses(courses.filter(c => c.id !== courseId))
      toast.success('Course removed')
    } catch (err) {
      toast.error(`Failed to delete: ${err.message}`)
    } finally {
      setDeleting(null)
    }
  }

  const handleDeleteAssignment = async (assignmentId) => {
    setDeleting(assignmentId)
    try {
      await canvasService.deleteAssignment(assignmentId)
      setAssignments(assignments.filter(a => a.id !== assignmentId))
      toast.success('Assignment removed')
    } catch (err) {
      toast.error(`Failed to delete: ${err.message}`)
    } finally {
      setDeleting(null)
    }
  }

  const handleRecoverCourse = async (courseId) => {
    setRecovering(courseId)
    try {
      await canvasService.unblockCourse(courseId)
      setBlockedCourses(blockedCourses.filter(c => c.canvas_course_id !== courseId))
      toast.success('Course recovered! Sync to restore data.')
    } catch (err) {
      toast.error(`Failed to recover: ${err.message}`)
    } finally {
      setRecovering(null)
    }
  }

  const handleCleanup = async () => {
    const confirmed = await confirmDialog(
      'Clean Up Assignments',
      'Delete all completed assignments and those older than 2 weeks?'
    )
    if (!confirmed) return

    setCleaning(true)
    try {
      const result = await canvasService.cleanupAssignments()
      if (result.deleted > 0) {
        toast.success(`Cleaned up ${result.deleted} assignments`)
        await loadCanvasData()
      } else {
        toast.info('No assignments to clean up')
      }
    } catch (err) {
      toast.error(`Cleanup failed: ${err.message}`)
    } finally {
      setCleaning(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null
    const today = new Date()
    const due = new Date(dueDate)
    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return { text: 'Overdue', color: 'text-error' }
    if (diffDays === 0) return { text: 'Due today', color: 'text-accent-warm' }
    if (diffDays === 1) return { text: 'Tomorrow', color: 'text-accent-warm' }
    if (diffDays <= 3) return { text: `${diffDays} days`, color: 'text-accent-warm' }
    return { text: `${diffDays} days`, color: 'text-text-secondary' }
  }

  const filterRecentAssignments = (list) => {
    const twoWeeksAgo = new Date()
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
    return list.filter(a => !a.dueDate || new Date(a.dueDate) >= twoWeeksAgo)
  }

  const incompleteAssignments = filterRecentAssignments(assignments).filter(a => !a.submitted && !a.graded)

  if (loading) {
    return (
      <div className="min-h-screen p-6 md:p-8 lg:p-10 max-w-5xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-text-muted text-sm">Loading Canvas data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen p-6 md:p-8 lg:p-10 max-w-5xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-surface-elevated flex items-center justify-center">
              <svg className="w-7 h-7 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">Canvas Not Connected</h3>
            <p className="text-sm text-text-muted mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white font-medium rounded-xl hover:bg-primary-hover transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 md:p-8 lg:p-10 max-w-5xl mx-auto">
      {/* Header */}
      <header className="mb-8 animate-fade-up">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-text-primary tracking-tight">Canvas</h1>
            <p className="text-text-secondary mt-1">
              {courses.length} courses · {incompleteAssignments.length} incomplete
            </p>
            {lastSyncTime && (
              <p className="text-xs text-text-muted mt-1">
                Last synced {lastSyncTime.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCleanup}
              disabled={cleaning || syncing}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-surface-elevated text-text-muted hover:text-text-secondary border border-border transition-all disabled:opacity-50"
            >
              {cleaning ? (
                <div className="w-4 h-4 border-2 border-text-muted/30 border-t-text-muted rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
              <span>Clean Up</span>
            </button>
            <button
              onClick={handleSync}
              disabled={syncing || cleaning}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-white hover:bg-primary-hover transition-all disabled:opacity-50"
            >
              {syncing ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              <span>Sync</span>
            </button>
          </div>
        </div>
      </header>

      {/* View Tabs */}
      <div className="flex gap-1 p-1 bg-surface-elevated rounded-xl mb-6 animate-fade-up">
        {['courses', 'assignments', 'grades', 'deleted'].map((view) => (
          <button
            key={view}
            onClick={() => { setActiveView(view); setSelectedCourse(null) }}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all capitalize ${
              activeView === view
                ? 'bg-primary text-white'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {view}{view === 'deleted' && blockedCourses.length > 0 ? ` (${blockedCourses.length})` : ''}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-3 animate-fade-up">
        {/* Courses View */}
        {activeView === 'courses' && !selectedCourse && (
          <>
            {courses.length === 0 ? (
              <EmptyState icon="📚" message="No courses found. Try syncing with Canvas." />
            ) : (
              courses.map((course) => {
                const courseAssignments = filterRecentAssignments(assignments).filter(a => a.courseId === course.id)
                const incompleteCount = courseAssignments.filter(a => !a.submitted && !a.graded).length

                return (
                  <div key={course.id} className="bg-surface-elevated rounded-xl p-4 border border-border hover:border-primary/30 transition-all group">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-text-primary truncate">
                          {course.course_code || course.name}
                        </h3>
                        {course.course_code && course.course_code !== course.name && (
                          <p className="text-xs text-text-muted truncate mt-0.5">{course.name}</p>
                        )}
                        {course.term?.name && (
                          <p className="text-xs text-text-muted mt-1">{course.term.name}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => setSelectedCourse(course)}
                          className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                        >
                          {incompleteCount} due
                        </button>
                        <button
                          onClick={() => handleDeleteCourse(course.id)}
                          disabled={deleting === course.id}
                          className="p-1.5 rounded-lg text-text-muted hover:text-error hover:bg-error/10 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          {deleting === course.id ? (
                            <div className="w-4 h-4 border-2 border-text-muted/30 border-t-text-muted rounded-full animate-spin" />
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </>
        )}

        {/* Course Detail View */}
        {activeView === 'courses' && selectedCourse && (
          <>
            <button
              onClick={() => setSelectedCourse(null)}
              className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors mb-4"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm">Back to courses</span>
            </button>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-text-primary">{selectedCourse.course_code || selectedCourse.name}</h2>
              <p className="text-sm text-text-muted">
                {filterRecentAssignments(assignments).filter(a => a.courseId === selectedCourse.id && !a.submitted && !a.graded).length} incomplete assignments
              </p>
            </div>
            {filterRecentAssignments(assignments).filter(a => a.courseId === selectedCourse.id && !a.submitted && !a.graded).length === 0 ? (
              <EmptyState icon="✓" message="All caught up! No incomplete assignments." />
            ) : (
              filterRecentAssignments(assignments)
                .filter(a => a.courseId === selectedCourse.id && !a.submitted && !a.graded)
                .map((assignment) => <AssignmentCard key={assignment.id} assignment={assignment} onDelete={handleDeleteAssignment} deleting={deleting} formatDate={formatDate} getDaysUntilDue={getDaysUntilDue} />)
            )}
          </>
        )}

        {/* Assignments View */}
        {activeView === 'assignments' && (
          <>
            {incompleteAssignments.length === 0 ? (
              <EmptyState icon="✓" message="All caught up! No incomplete assignments." />
            ) : (
              incompleteAssignments.map((assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} onDelete={handleDeleteAssignment} deleting={deleting} formatDate={formatDate} getDaysUntilDue={getDaysUntilDue} showCourse />
              ))
            )}
          </>
        )}

        {/* Grades View */}
        {activeView === 'grades' && (
          <>
            {grades.length === 0 ? (
              <EmptyState icon="📊" message="No grades available yet." />
            ) : (
              grades.map((grade) => {
                const score = grade.currentScore || 0
                const gradeColor = score >= 90 ? 'text-success' : score >= 80 ? 'text-primary' : score >= 70 ? 'text-accent-warm' : 'text-error'
                const barColor = score >= 90 ? 'bg-success' : score >= 80 ? 'bg-primary' : score >= 70 ? 'bg-accent-warm' : 'bg-error'

                return (
                  <div key={grade.courseId} className="bg-surface-elevated rounded-xl p-4 border border-border">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-text-primary truncate">{grade.courseCode || grade.courseName}</h3>
                        {grade.courseCode && grade.courseCode !== grade.courseName && (
                          <p className="text-xs text-text-muted truncate mt-0.5">{grade.courseName}</p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <div className={`text-2xl font-bold ${gradeColor}`}>
                          {grade.currentGrade || (score ? `${score.toFixed(0)}%` : 'N/A')}
                        </div>
                      </div>
                    </div>
                    {score > 0 && (
                      <div className="h-1.5 bg-surface-base rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${Math.min(score, 100)}%` }} />
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </>
        )}

        {/* Deleted View */}
        {activeView === 'deleted' && (
          <>
            <p className="text-sm text-text-muted mb-4">Deleted courses stay hidden even after syncing. Recover them to restore.</p>
            {blockedCourses.length === 0 ? (
              <EmptyState icon="🗑️" message="No deleted courses." />
            ) : (
              blockedCourses.map((blocked) => (
                <div key={blocked.id} className="bg-surface-elevated rounded-xl p-4 border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-text-primary">Course ID: {blocked.canvas_course_id}</h3>
                      <p className="text-xs text-text-muted mt-0.5">
                        Deleted {new Date(blocked.blocked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRecoverCourse(blocked.canvas_course_id)}
                      disabled={recovering === blocked.canvas_course_id}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/10 text-success text-xs font-medium hover:bg-success/20 transition-colors disabled:opacity-50"
                    >
                      {recovering === blocked.canvas_course_id ? (
                        <div className="w-3 h-3 border-2 border-success/30 border-t-success rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                      <span>Recover</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Empty State Component
const EmptyState = ({ icon, message }) => (
  <div className="text-center py-12 bg-surface-elevated rounded-xl border border-border">
    <div className="text-4xl mb-3">{icon}</div>
    <p className="text-text-muted">{message}</p>
  </div>
)

// Assignment Card Component
const AssignmentCard = ({ assignment, onDelete, deleting, formatDate, getDaysUntilDue, showCourse }) => {
  const dueInfo = getDaysUntilDue(assignment.dueDate)

  return (
    <div className="bg-surface-elevated rounded-xl p-4 border border-border hover:border-primary/30 transition-all group">
      {showCourse && (
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="text-xs font-medium text-text-muted">{assignment.subject}</span>
        </div>
      )}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-text-primary">{assignment.title}</h3>
          <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
            {assignment.dueDate && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {formatDate(assignment.dueDate)}
                {dueInfo && <span className={`font-medium ${dueInfo.color}`}>({dueInfo.text})</span>}
              </span>
            )}
            {assignment.points && (
              <span>{assignment.points} pts</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          {assignment.htmlUrl && (
            <a
              href={assignment.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
            >
              Open
            </a>
          )}
          <button
            onClick={() => onDelete(assignment.id)}
            disabled={deleting === assignment.id}
            className="p-1.5 rounded-lg text-text-muted hover:text-error hover:bg-error/10 transition-colors opacity-0 group-hover:opacity-100"
          >
            {deleting === assignment.id ? (
              <div className="w-4 h-4 border-2 border-text-muted/30 border-t-text-muted rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CanvasHub
