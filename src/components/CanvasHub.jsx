import { useState, useEffect } from 'react'
import canvasService from '../services/canvasService'
import { toast } from './Toast'

const CanvasHub = () => {
  const [courses, setCourses] = useState([])
  const [assignments, setAssignments] = useState([])
  const [grades, setGrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [activeView, setActiveView] = useState('courses') // courses, assignments, grades
  const [lastSyncTime, setLastSyncTime] = useState(null)
  const [selectedCourse, setSelectedCourse] = useState(null) // For viewing course assignments
  const [deleting, setDeleting] = useState(null) // Track which item is being deleted

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

      // Load synced data from database (faster and persisted)
      const [coursesData, assignmentsData, gradesData] = await Promise.all([
        canvasService.getSyncedCourses().catch(() => []),
        canvasService.getSyncedAssignments().catch(() => []),
        canvasService.getSyncedGrades().catch(() => [])
      ])

      console.log('📚 Loaded synced courses:', coursesData?.length || 0)
      console.log('📝 Loaded synced assignments:', assignmentsData?.length || 0)
      console.log('📊 Loaded synced grades:', gradesData?.length || 0)

      setCourses(coursesData || [])
      setAssignments(assignmentsData || [])
      setGrades(gradesData || [])

      // Set last sync time from the most recent item
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
        const cleanupMessage = result.deleted > 0 ? `\n🗑️  Cleaned up ${result.deleted} old past-due assignments` : ''
        toast.success(`Sync Complete!\n\n📚 Courses: ${result.courses}\n📝 Assignments: ${result.assignments}\n📊 Grades: ${result.grades}${cleanupMessage}`)
        setLastSyncTime(new Date())
        await loadCanvasData() // Reload data after sync
      } else {
        throw new Error(result.message || 'Sync failed')
      }
    } catch (err) {
      console.error('Sync failed:', err)
      toast.error(`Sync failed: ${err.message}`)
    } finally {
      setSyncing(false)
    }
  }

  const handleDeleteCourse = async (courseId) => {
    if (!confirm('Delete this course from your local data? (You can re-sync to get it back)')) {
      return
    }

    setDeleting(courseId)
    try {
      await canvasService.deleteCourse(courseId)
      setCourses(courses.filter(c => c.id !== courseId))
      toast.success('Course deleted successfully')
    } catch (err) {
      console.error('Failed to delete course:', err)
      toast.error(`Failed to delete course: ${err.message}`)
    } finally {
      setDeleting(null)
    }
  }

  const handleDeleteAssignment = async (assignmentId) => {
    setDeleting(assignmentId)
    try {
      await canvasService.deleteAssignment(assignmentId)
      setAssignments(assignments.filter(a => a.id !== assignmentId))
      toast.success('Assignment deleted successfully')
    } catch (err) {
      console.error('Failed to delete assignment:', err)
      toast.error(`Failed to delete assignment: ${err.message}`)
    } finally {
      setDeleting(null)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return { text: 'Due today', color: 'text-red-400' }
    if (diffDays === 1) return { text: 'Due tomorrow', color: 'text-orange-400' }
    if (diffDays < 0) return { text: 'Overdue', color: 'text-red-500' }
    if (diffDays <= 3) return { text: `${diffDays} days`, color: 'text-yellow-400' }
    return { text: `${diffDays} days`, color: 'text-green-400' }
  }

  // Filter assignments to exclude those older than 2 weeks
  const filterRecentAssignments = (assignmentsList) => {
    const twoWeeksAgo = new Date()
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

    return assignmentsList.filter(assignment => {
      if (!assignment.dueDate) return true // Keep assignments with no due date
      const dueDate = new Date(assignment.dueDate)
      return dueDate >= twoWeeksAgo // Only keep assignments due within last 2 weeks or future
    })
  }

  if (loading) {
    return (
      <div className="space-y-4 md:space-y-5 lg:space-y-6 pb-6 md:pb-8">
        <div className="text-center py-12">
          <div className="w-12 h-12 mx-auto border-3 border-primary-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-dark-text-secondary">Loading Canvas data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4 md:space-y-5 lg:space-y-6 pb-6 md:pb-8">
        <div className="text-center py-12">
          <div className="text-5xl mb-4">⚠️</div>
          <h3 className="text-lg font-bold text-dark-text-primary mb-2">Canvas Not Connected</h3>
          <p className="text-sm text-dark-text-secondary mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-cyan text-white font-semibold rounded-xl hover: transition-all active:scale-98"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-5 pb-6 md:pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-orange-900/30 to-red-900/30 p-4 md:p-5 border border-orange-700/40">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark-text-primary tracking-tight">Canvas LMS</h2>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-primary-500 to-accent-cyan text-white font-semibold rounded-lg hover: transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {syncing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Sync to App</span>
                </>
              )}
            </button>
          </div>
          <div className="space-y-1">
            <p className="text-dark-text-secondary text-sm">
              {courses.length} courses • {filterRecentAssignments(assignments).filter(a => !a.submitted && !a.graded).length} incomplete • {grades.length} grades
            </p>
            {lastSyncTime && (
              <p className="text-dark-text-muted text-xs">
                Last synced: {lastSyncTime.toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </p>
            )}
          </div>
        </div>
        <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 p-1 bg-dark-bg-secondary rounded-lg border border-dark-border-subtle">
        <button
          onClick={() => setActiveView('courses')}
          className={`flex-1 py-2 md:py-2.5 px-3 md:px-4 rounded-lg font-semibold text-xs md:text-sm transition-all ${
            activeView === 'courses'
              ? 'bg-gradient-to-r from-primary-500 to-accent-cyan text-white'
              : 'text-dark-text-secondary hover:text-dark-text-primary'
          }`}
        >
          Courses
        </button>
        <button
          onClick={() => setActiveView('assignments')}
          className={`flex-1 py-2 md:py-2.5 px-3 md:px-4 rounded-lg font-semibold text-xs md:text-sm transition-all ${
            activeView === 'assignments'
              ? 'bg-gradient-to-r from-primary-500 to-accent-cyan text-white'
              : 'text-dark-text-secondary hover:text-dark-text-primary'
          }`}
        >
          Assignments
        </button>
        <button
          onClick={() => setActiveView('grades')}
          className={`flex-1 py-2 md:py-2.5 px-3 md:px-4 rounded-lg font-semibold text-xs md:text-sm transition-all ${
            activeView === 'grades'
              ? 'bg-gradient-to-r from-primary-500 to-accent-cyan text-white'
              : 'text-dark-text-secondary hover:text-dark-text-primary'
          }`}
        >
          Grades
        </button>
      </div>

      {/* Courses View */}
      {activeView === 'courses' && !selectedCourse && (
        <div className="space-y-3">
          <h3 className="text-base md:text-lg lg:text-xl font-bold text-dark-text-primary tracking-tight">
            Your Courses ({courses.length})
          </h3>
          {courses.length === 0 ? (
            <div className="text-center py-8 bg-dark-bg-secondary rounded-lg border border-dark-border-subtle">
              <div className="text-4xl mb-3">📚</div>
              <p className="text-dark-text-secondary">No courses found</p>
            </div>
          ) : (
            courses.map((course) => {
              const courseAssignments = filterRecentAssignments(assignments).filter(a => a.courseId === course.id)
              const incompleteCount = courseAssignments.filter(a => !a.submitted && !a.graded).length

              return (
                <div
                  key={course.id}
                  className="bg-dark-bg-tertiary/50 hover:bg-dark-bg-tertiary rounded-lg p-4 border border-dark-border-subtle hover:border-dark-border-subtle/80 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="text-sm md:text-base lg:text-lg font-semibold text-dark-text-primary mb-1 tracking-tight leading-snug">
                        {course.course_code || course.name}
                      </h4>
                      {course.course_code && course.course_code !== course.name && (
                        <p className="text-xs text-dark-text-muted">{course.name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {course.enrollments && course.enrollments[0]?.type && (
                        <span className="px-2 py-1 bg-primary-500/20 text-primary-500 text-xs font-semibold rounded-lg">
                          {course.enrollments[0].type}
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteCourse(course.id)}
                        disabled={deleting === course.id}
                        className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                        title="Delete course"
                      >
                        {deleting === course.id ? (
                          <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    {course.term && course.term.name && (
                      <div className="flex items-center gap-2 text-xs text-dark-text-secondary">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{course.term.name}</span>
                      </div>
                    )}

                    <button
                      onClick={() => setSelectedCourse(course)}
                      className="px-3 py-1.5 rounded-lg bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 transition-colors text-xs font-semibold flex items-center gap-1.5"
                    >
                      <span>{incompleteCount} Incomplete</span>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Course Detail View - Show assignments for selected course */}
      {activeView === 'courses' && selectedCourse && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => setSelectedCourse(null)}
              className="p-2 rounded-lg bg-dark-bg-secondary hover:bg-dark-bg-tertiary transition-colors"
            >
              <svg className="w-5 h-5 text-dark-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h3 className="text-base md:text-lg lg:text-xl font-bold text-dark-text-primary tracking-tight">
                {selectedCourse.course_code || selectedCourse.name}
              </h3>
              <p className="text-xs text-dark-text-muted">
                {filterRecentAssignments(assignments).filter(a => a.courseId === selectedCourse.id && !a.submitted && !a.graded).length} incomplete assignments
              </p>
            </div>
          </div>

          {filterRecentAssignments(assignments).filter(a => a.courseId === selectedCourse.id && !a.submitted && !a.graded).length === 0 ? (
            <div className="text-center py-8 bg-dark-bg-secondary rounded-lg border border-dark-border-subtle">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-dark-text-secondary">All caught up! No incomplete assignments.</p>
            </div>
          ) : (
            filterRecentAssignments(assignments)
              .filter(a => a.courseId === selectedCourse.id && !a.submitted && !a.graded)
              .map((assignment) => {
                const dueInfo = getDaysUntilDue(assignment.dueDate)
                return (
                  <div
                    key={assignment.id}
                    className="bg-dark-bg-tertiary/50 hover:bg-dark-bg-tertiary rounded-lg p-4 border border-dark-border-subtle hover:border-dark-border-subtle/80 transition-all"
                  >
                    {/* Title */}
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="flex-1 text-sm md:text-base lg:text-lg font-semibold text-dark-text-primary tracking-tight leading-snug">
                        {assignment.title}
                      </h4>
                      <button
                        onClick={() => handleDeleteAssignment(assignment.id)}
                        disabled={deleting === assignment.id}
                        className="ml-2 p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                        title="Delete assignment"
                      >
                        {deleting === assignment.id ? (
                          <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-dark-text-secondary mb-3">
                      {assignment.dueDate && (
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{formatDate(assignment.dueDate)}</span>
                          {dueInfo && (
                            <span className={`font-semibold ${dueInfo.color}`}>
                              ({dueInfo.text})
                            </span>
                          )}
                        </div>
                      )}
                      {assignment.points && (
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                          <span>{assignment.points} pts</span>
                        </div>
                      )}
                    </div>

                    {/* Link */}
                    {assignment.htmlUrl && (
                      <a
                        href={assignment.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex px-2.5 py-1 bg-primary-500/20 text-primary-400 text-xs font-semibold rounded-lg hover:bg-primary-500/30 transition-colors"
                      >
                        View in Canvas →
                      </a>
                    )}
                  </div>
                )
              })
          )}
        </div>
      )}

      {/* Assignments View */}
      {activeView === 'assignments' && (
        <div className="space-y-3">
          <h3 className="text-base md:text-lg lg:text-xl font-bold text-dark-text-primary tracking-tight">
            Incomplete Assignments ({filterRecentAssignments(assignments).filter(a => !a.submitted && !a.graded).length})
          </h3>
          {filterRecentAssignments(assignments).filter(a => !a.submitted && !a.graded).length === 0 ? (
            <div className="text-center py-8 bg-dark-bg-secondary rounded-lg border border-dark-border-subtle">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-dark-text-secondary">All caught up! No incomplete assignments.</p>
            </div>
          ) : (
            filterRecentAssignments(assignments)
              .filter(a => !a.submitted && !a.graded)
              .map((assignment) => {
                const dueInfo = getDaysUntilDue(assignment.dueDate)
                return (
                  <div
                    key={assignment.id}
                    className="bg-dark-bg-tertiary/50 hover:bg-dark-bg-tertiary rounded-lg p-4 border border-dark-border-subtle hover:border-dark-border-subtle/80 transition-all"
                  >
                    {/* Subject/Course Badge */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        <span className="text-xs font-semibold text-dark-text-secondary tracking-tight">
                          {assignment.subject}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteAssignment(assignment.id)}
                        disabled={deleting === assignment.id}
                        className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                        title="Delete assignment"
                      >
                        {deleting === assignment.id ? (
                          <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>

                    {/* Title */}
                    <h4 className="text-sm md:text-base lg:text-lg font-semibold text-dark-text-primary mb-3 tracking-tight leading-snug">
                      {assignment.title}
                    </h4>

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-dark-text-secondary mb-3">
                      {assignment.dueDate && (
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{formatDate(assignment.dueDate)}</span>
                          {dueInfo && (
                            <span className={`font-semibold ${dueInfo.color}`}>
                              ({dueInfo.text})
                            </span>
                          )}
                        </div>
                      )}
                      {assignment.points && (
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                          <span>{assignment.points} pts</span>
                        </div>
                      )}
                    </div>

                    {/* Link */}
                    {assignment.htmlUrl && (
                      <a
                        href={assignment.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex px-2.5 py-1 bg-primary-500/20 text-primary-400 text-xs font-semibold rounded-lg hover:bg-primary-500/30 transition-colors"
                      >
                        View in Canvas →
                      </a>
                    )}
                  </div>
                )
              })
          )}
        </div>
      )}

      {/* Grades View */}
      {activeView === 'grades' && (
        <div className="space-y-3">
          <h3 className="text-base md:text-lg lg:text-xl font-bold text-dark-text-primary tracking-tight">
            Course Grades ({grades.length})
          </h3>
          {grades.length === 0 ? (
            <div className="text-center py-8 bg-dark-bg-secondary rounded-lg border border-dark-border-subtle">
              <div className="text-4xl mb-3">📊</div>
              <p className="text-dark-text-secondary">No grades available</p>
            </div>
          ) : (
            grades.map((grade) => {
              const currentScore = grade.currentScore || 0
              const gradeColor = currentScore >= 90
                ? 'text-green-400'
                : currentScore >= 80
                ? 'text-blue-400'
                : currentScore >= 70
                ? 'text-yellow-400'
                : 'text-red-400'

              return (
                <div
                  key={grade.courseId}
                  className="bg-dark-bg-tertiary/50 hover:bg-dark-bg-tertiary rounded-lg p-4 border border-dark-border-subtle hover:border-dark-border-subtle/80 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="text-sm md:text-base lg:text-lg font-semibold text-dark-text-primary mb-1 tracking-tight leading-snug">
                        {grade.courseCode || grade.courseName}
                      </h4>
                      {grade.courseCode && grade.courseCode !== grade.courseName && (
                        <p className="text-xs text-dark-text-muted">{grade.courseName}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${gradeColor}`}>
                        {grade.currentGrade || (grade.currentScore !== null && grade.currentScore !== undefined) ?
                          (grade.currentGrade || `${(grade.currentScore || 0).toFixed(1)}%`)
                          : 'N/A'
                        }
                      </div>
                      <div className="text-xs text-dark-text-muted">Current</div>
                    </div>
                  </div>

                  {/* Score breakdown */}
                  {grade.currentScore !== undefined && grade.currentScore !== null && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-dark-text-secondary">Progress</span>
                        <span className={`text-xs font-bold ${gradeColor}`}>
                          {(grade.currentScore || 0).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-dark-bg-primary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            currentScore >= 90
                              ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                              : currentScore >= 80
                              ? 'bg-gradient-to-r from-blue-500 to-cyan-600'
                              : currentScore >= 70
                              ? 'bg-gradient-to-r from-yellow-500 to-amber-600'
                              : 'bg-gradient-to-r from-red-500 to-orange-600'
                          }`}
                          style={{ width: `${Math.min(currentScore, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Final grade if different */}
                  {grade.finalGrade && grade.finalGrade !== grade.currentGrade && (
                    <div className="pt-3 border-t border-dark-border-subtle">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-dark-text-secondary">Final Grade:</span>
                        <span className="font-semibold text-dark-text-primary">
                          {grade.finalGrade} ({grade.finalScore ? grade.finalScore.toFixed(1) : 'N/A'}%)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

export default CanvasHub
