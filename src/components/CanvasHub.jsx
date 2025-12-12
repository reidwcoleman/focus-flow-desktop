import { useState, useEffect } from 'react'
import canvasService from '../services/canvasService'

const CanvasHub = () => {
  const [courses, setCourses] = useState([])
  const [assignments, setAssignments] = useState([])
  const [grades, setGrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [activeView, setActiveView] = useState('courses') // courses, assignments, grades

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

      // Load all data in parallel
      const [coursesData, assignmentsData, gradesData] = await Promise.all([
        canvasService.getCourses().catch(() => []),
        canvasService.getAllAssignments().catch(() => []),
        canvasService.getAllGrades().catch(() => [])
      ])

      setCourses(coursesData || [])
      setAssignments(assignmentsData || [])
      setGrades(gradesData || [])
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
        alert(`✅ Synced ${result.synced} assignments from Canvas!`)
        await loadCanvasData() // Reload data after sync
      } else {
        throw new Error(result.message || 'Sync failed')
      }
    } catch (err) {
      console.error('Sync failed:', err)
      alert(`❌ Sync failed: ${err.message}`)
    } finally {
      setSyncing(false)
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

  if (loading) {
    return (
      <div className="space-y-5 pb-6">
        <div className="text-center py-12">
          <div className="w-12 h-12 mx-auto border-3 border-primary-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-dark-text-secondary">Loading Canvas data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-5 pb-6">
        <div className="text-center py-12">
          <div className="text-5xl mb-4">⚠️</div>
          <h3 className="text-lg font-bold text-dark-text-primary mb-2">Canvas Not Connected</h3>
          <p className="text-sm text-dark-text-secondary mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-cyan text-white font-semibold rounded-xl hover:shadow-glow-cyan transition-all active:scale-95"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-900/30 to-red-900/30 p-6 shadow-dark-soft-lg border border-orange-700/40">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-dark-text-primary tracking-tight">Canvas LMS</h2>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-primary-500 to-accent-cyan text-white font-semibold rounded-lg hover:shadow-glow-cyan transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
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
          <p className="text-dark-text-secondary text-sm">
            {courses.length} courses • {assignments.length} assignments
          </p>
        </div>
        <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 p-1 bg-dark-bg-secondary rounded-2xl border border-dark-border-glow">
        <button
          onClick={() => setActiveView('courses')}
          className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all ${
            activeView === 'courses'
              ? 'bg-gradient-to-r from-primary-500 to-accent-cyan text-white shadow-glow-cyan'
              : 'text-dark-text-secondary hover:text-dark-text-primary'
          }`}
        >
          Courses
        </button>
        <button
          onClick={() => setActiveView('assignments')}
          className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all ${
            activeView === 'assignments'
              ? 'bg-gradient-to-r from-primary-500 to-accent-cyan text-white shadow-glow-cyan'
              : 'text-dark-text-secondary hover:text-dark-text-primary'
          }`}
        >
          Assignments
        </button>
        <button
          onClick={() => setActiveView('grades')}
          className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all ${
            activeView === 'grades'
              ? 'bg-gradient-to-r from-primary-500 to-accent-cyan text-white shadow-glow-cyan'
              : 'text-dark-text-secondary hover:text-dark-text-primary'
          }`}
        >
          Grades
        </button>
      </div>

      {/* Courses View */}
      {activeView === 'courses' && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-dark-text-primary tracking-tight">
            Your Courses ({courses.length})
          </h3>
          {courses.length === 0 ? (
            <div className="text-center py-8 bg-dark-bg-secondary rounded-2xl border border-dark-border-glow">
              <div className="text-4xl mb-3">📚</div>
              <p className="text-dark-text-secondary">No courses found</p>
            </div>
          ) : (
            courses.map((course) => (
              <div
                key={course.id}
                className="bg-dark-bg-secondary rounded-2xl p-5 shadow-dark-soft-md border border-dark-border-glow hover:shadow-rim-light transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="text-base font-semibold text-dark-text-primary mb-1 tracking-tight leading-snug">
                      {course.name}
                    </h4>
                    {course.course_code && (
                      <p className="text-xs text-dark-text-muted">{course.course_code}</p>
                    )}
                  </div>
                  {course.enrollments && course.enrollments[0]?.type && (
                    <span className="px-2 py-1 bg-primary-500/20 text-primary-500 text-xs font-semibold rounded-lg">
                      {course.enrollments[0].type}
                    </span>
                  )}
                </div>
                {course.term && course.term.name && (
                  <div className="flex items-center gap-2 text-xs text-dark-text-secondary">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{course.term.name}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Assignments View */}
      {activeView === 'assignments' && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-dark-text-primary tracking-tight">
            Assignments ({assignments.length})
          </h3>
          {assignments.length === 0 ? (
            <div className="text-center py-8 bg-dark-bg-secondary rounded-2xl border border-dark-border-glow">
              <div className="text-4xl mb-3">📝</div>
              <p className="text-dark-text-secondary">No assignments found</p>
            </div>
          ) : (
            assignments.map((assignment) => {
              const dueInfo = getDaysUntilDue(assignment.dueDate)
              return (
                <div
                  key={assignment.id}
                  className="bg-dark-bg-secondary rounded-2xl p-5 shadow-dark-soft-md border border-dark-border-glow hover:shadow-rim-light transition-all"
                >
                  {/* Subject/Course Badge */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                    <span className="text-xs font-semibold text-dark-text-secondary tracking-tight">
                      {assignment.subject}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="text-base font-semibold text-dark-text-primary mb-3 tracking-tight leading-snug">
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

                  {/* Status Badges */}
                  <div className="flex items-center gap-2">
                    {assignment.submitted && (
                      <span className="px-2.5 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded-lg">
                        ✓ Submitted
                      </span>
                    )}
                    {assignment.graded && assignment.grade && (
                      <span className="px-2.5 py-1 bg-blue-500/20 text-blue-400 text-xs font-semibold rounded-lg">
                        Grade: {assignment.grade}
                      </span>
                    )}
                    {assignment.htmlUrl && (
                      <a
                        href={assignment.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-primary-500/20 text-primary-400 text-xs font-semibold rounded-lg hover:bg-primary-500/30 transition-colors"
                      >
                        View in Canvas →
                      </a>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Grades View */}
      {activeView === 'grades' && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-dark-text-primary tracking-tight">
            Course Grades ({grades.length})
          </h3>
          {grades.length === 0 ? (
            <div className="text-center py-8 bg-dark-bg-secondary rounded-2xl border border-dark-border-glow">
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
                  className="bg-dark-bg-secondary rounded-2xl p-5 shadow-dark-soft-md border border-dark-border-glow hover:shadow-rim-light transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="text-base font-semibold text-dark-text-primary mb-1 tracking-tight leading-snug">
                        {grade.courseName}
                      </h4>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${gradeColor}`}>
                        {grade.currentGrade || grade.currentScore ?
                          (grade.currentGrade || `${grade.currentScore.toFixed(1)}%`)
                          : 'N/A'
                        }
                      </div>
                      <div className="text-xs text-dark-text-muted">Current</div>
                    </div>
                  </div>

                  {/* Score breakdown */}
                  {grade.currentScore !== undefined && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-dark-text-secondary">Progress</span>
                        <span className={`text-xs font-bold ${gradeColor}`}>
                          {grade.currentScore.toFixed(1)}%
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

      {/* CORS Warning */}
      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-xs text-amber-300">
            <strong>Note:</strong> Canvas has browser limitations. If you see errors, view assignments directly at canvas.wcpss.net. Use "Sync to App" to import assignments into Focus Flow.
          </p>
        </div>
      </div>
    </div>
  )
}

export default CanvasHub
