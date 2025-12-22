import { useState, useEffect } from 'react'
import analyticsService from '../services/analyticsService'
import courseStatsService from '../services/courseStatsService'
import { StatCardSkeleton } from './LoadingSkeleton'

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null)
  const [courseStats, setCourseStats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
    loadCourseStats()
  }, [])

  const loadCourseStats = async () => {
    try {
      const stats = await courseStatsService.getCourseStats()
      setCourseStats(stats)
    } catch (error) {
      console.error('Failed to load course stats:', error)
    }
  }

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const data = await analyticsService.getAnalytics()
      setAnalytics(data)
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 pb-6">
        {/* Loading skeletons */}
        <div className="animate-pulse">
          <div className="bg-dark-bg-secondary rounded-3xl p-6 border border-dark-border-glow">
            <div className="h-8 bg-dark-bg-tertiary rounded w-48 mb-4"></div>
            <div className="grid grid-cols-3 gap-4">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
          </div>
        </div>
        <div className="bg-dark-bg-secondary rounded-2xl p-5 border border-dark-border-glow h-64 animate-pulse"></div>
        <div className="bg-dark-bg-secondary rounded-2xl p-5 border border-dark-border-glow h-48 animate-pulse"></div>
      </div>
    )
  }

  if (!analytics) return null

  const { studyStats, assignmentStats, weeklyActivity, subjectBreakdown } = analytics
  const maxHours = Math.max(...weeklyActivity.map(d => d.hours), 1)
  const totalWeekHours = weeklyActivity.reduce((sum, d) => sum + d.hours, 0).toFixed(1)

  const getGradeColor = (rate) => {
    if (rate >= 90) return 'from-green-500 to-emerald-600'
    if (rate >= 80) return 'from-blue-500 to-primary-600'
    if (rate >= 70) return 'from-amber-500 to-orange-600'
    return 'from-red-500 to-rose-600'
  }

  const getSubjectColor = (subject) => {
    const colors = {
      'Math': 'from-cyan-500 to-blue-500',
      'Chemistry': 'from-purple-500 to-pink-500',
      'Physics': 'from-green-500 to-emerald-500',
      'English': 'from-blue-500 to-primary-600',
      'History': 'from-amber-500 to-orange-500',
    }
    return colors[subject] || 'from-neutral-400 to-neutral-500'
  }

  return (
    <div className="space-y-6 lg:space-y-8 pb-6 lg:pb-10 animate-fadeIn">
      {/* Overall Performance - Desktop Optimized */}
      <div className="relative overflow-hidden rounded-lg bg-dark-bg-tertiary/50 hover:bg-dark-bg-tertiary p-6 lg:p-8 border border-dark-border-subtle hover:border-dark-border-subtle/80 transition-all">
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-6 lg:mb-8">
            <div>
              <h2 className="text-2xl lg:text-4xl font-bold text-dark-text-primary mb-1 lg:mb-2">Performance</h2>
              <p className="text-dark-text-secondary text-sm lg:text-base">Your academic overview</p>
            </div>
            <div className="px-4 lg:px-6 py-2 lg:py-3 bg-primary-500/20 backdrop-blur-sm rounded-full border border-primary-500/30">
              <span className="text-primary-500 font-semibold text-sm lg:text-lg">
                {assignmentStats.completionRate}% Complete
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 lg:gap-8">
            <div className="bg-dark-bg-secondary rounded-lg p-4 lg:p-6 border border-dark-border-subtle hover:border-primary-500/30 transition-all">
              <div className="text-3xl lg:text-5xl font-bold text-dark-text-primary mb-1 lg:mb-3">
                {assignmentStats.total}
              </div>
              <div className="text-dark-text-secondary text-xs lg:text-sm font-medium">Assignments</div>
            </div>
            <div className="bg-dark-bg-secondary rounded-lg p-4 lg:p-6 border border-dark-border-subtle hover:border-accent-cyan/30 transition-all">
              <div className="text-3xl lg:text-5xl font-bold text-dark-text-primary mb-1 lg:mb-3">
                {studyStats.totalHours}h
              </div>
              <div className="text-dark-text-secondary text-xs lg:text-sm font-medium">Study Hours</div>
            </div>
            <div className="bg-dark-bg-secondary rounded-lg p-4 lg:p-6 border border-dark-border-subtle hover:border-green-500/30 transition-all">
              <div className="text-3xl lg:text-5xl font-bold text-dark-text-primary mb-1 lg:mb-3">
                {assignmentStats.onTimeRate}%
              </div>
              <div className="text-dark-text-secondary text-xs lg:text-sm font-medium">On Time</div>
            </div>
          </div>
        </div>

        {/* Decorative orbs - Larger on desktop */}
        <div className="absolute -top-20 lg:-top-32 -right-20 lg:-right-32 w-60 lg:w-96 h-60 lg:h-96 bg-primary-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 lg:-bottom-32 -left-20 lg:-left-32 w-60 lg:w-96 h-60 lg:h-96 bg-accent-purple/10 rounded-full blur-3xl"></div>
      </div>

      {/* Desktop 2-Column Grid: Subject Breakdown + Weekly Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Subject Breakdown */}
        {subjectBreakdown.length > 0 && (
          <div className="bg-dark-bg-tertiary/50 hover:bg-dark-bg-tertiary rounded-lg p-5 lg:p-6 border border-dark-border-subtle hover:border-dark-border-subtle/80 transition-all">
            <div className="flex items-center justify-between mb-4 lg:mb-6">
              <h3 className="font-bold text-dark-text-primary text-base lg:text-2xl">Subject Breakdown</h3>
              <div className="flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-4 py-1 lg:py-2 rounded-lg bg-primary-500/10 border border-primary-500/30">
                <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-xs lg:text-sm font-medium text-primary-500">Real Data</span>
              </div>
            </div>

            <div className="space-y-4 lg:space-y-6">
              {subjectBreakdown.slice(0, 5).map((subject) => (
                <div key={subject.subject}>
                  <div className="flex items-center justify-between mb-2 lg:mb-3">
                    <div className="flex items-center gap-3 lg:gap-4">
                      <div className={`w-8 h-8 lg:w-12 lg:h-12 rounded-lg bg-gradient-to-br ${getSubjectColor(subject.subject)}`}></div>
                      <div>
                        <div className="font-semibold text-dark-text-primary text-sm lg:text-lg">{subject.subject}</div>
                        <div className="text-xs lg:text-sm text-dark-text-secondary">
                          {subject.studyHours}h · {subject.assignmentCount} assignments
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm lg:text-xl font-bold text-primary-500">
                        {subject.completionRate}%
                      </div>
                      <div className="text-xs lg:text-sm text-dark-text-muted">complete</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="relative h-2 lg:h-3 bg-dark-bg-primary rounded-full overflow-hidden shadow-dark-inner">
                    <div
                      className={`absolute h-full bg-gradient-to-r ${getGradeColor(subject.completionRate)} transition-all`}
                      style={{ width: `${subject.completionRate}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weekly Activity Chart */}
        <div className="bg-dark-bg-tertiary/50 hover:bg-dark-bg-tertiary rounded-lg p-5 lg:p-6 border border-dark-border-subtle hover:border-dark-border-subtle/80 transition-all">
          <h3 className="font-bold text-dark-text-primary text-base lg:text-2xl mb-4 lg:mb-6">This Week's Activity</h3>

          <div className="flex items-end justify-between gap-2 lg:gap-4 h-40 lg:h-56 mb-4 lg:mb-6">
            {weeklyActivity.map((day, index) => {
              const height = maxHours > 0 ? (day.hours / maxHours) * 100 : 0
              const isToday = new Date().toISOString().split('T')[0] === day.date

              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2 lg:gap-3">
                  <div className="relative w-full flex flex-col justify-end h-32 lg:h-48">
                    <div
                      className={`w-full rounded-t-lg transition-all hover:opacity-80 ${
                        isToday
                          ? 'bg-gradient-to-t from-primary-500 to-accent-cyan'
                          : day.hours > 0
                          ? 'bg-gradient-to-t from-primary-600 to-primary-500'
                          : 'bg-dark-bg-tertiary'
                      }`}
                      style={{ height: `${Math.max(height, 5)}%` }}
                    >
                      {day.hours > 0 && (
                        <div className="absolute -top-6 lg:-top-8 left-1/2 transform -translate-x-1/2 text-xs lg:text-base font-bold text-dark-text-primary whitespace-nowrap">
                          {day.hours}h
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`text-xs lg:text-sm font-medium ${isToday ? 'text-primary-500' : 'text-dark-text-muted'}`}>
                    {day.day}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="pt-4 lg:pt-6 border-t border-dark-border-subtle">
            <div className="grid grid-cols-2 gap-4 lg:gap-8">
              <div>
                <div className="text-2xl lg:text-4xl font-bold text-dark-text-primary">{totalWeekHours}h</div>
                <div className="text-xs lg:text-sm text-dark-text-secondary">Total Study Time</div>
              </div>
              <div>
                <div className="text-2xl lg:text-4xl font-bold text-primary-500">{studyStats.avgFocusScore}%</div>
                <div className="text-xs lg:text-sm text-dark-text-secondary">Avg Focus Score</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Strengths & Improvements - Desktop Optimized */}
      <div className="grid grid-cols-2 gap-3 lg:gap-6">
        <div className="bg-green-900/10 border border-green-700/40 rounded-lg p-4 lg:p-6 transition-all">
          <div className="w-10 h-10 lg:w-16 lg:h-16 rounded-xl bg-gradient-to-br from-green-600 to-emerald-700 flex items-center justify-center mb-3 lg:mb-5">
            <svg className="w-5 h-5 lg:w-8 lg:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 className="font-semibold text-green-400 text-sm lg:text-xl mb-1 lg:mb-2">Strengths</h4>
          <p className="text-xs lg:text-base text-green-300">
            {assignmentStats.completionRate >= 80
              ? 'Great completion rate!'
              : studyStats.totalHours >= 20
              ? 'Strong study habits'
              : 'Keep going!'}
          </p>
        </div>

        <div className="bg-amber-900/10 border border-amber-700/40 rounded-lg p-4 lg:p-6 transition-all">
          <div className="w-10 h-10 lg:w-16 lg:h-16 rounded-xl bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center mb-3 lg:mb-5">
            <svg className="w-5 h-5 lg:w-8 lg:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h4 className="font-semibold text-amber-400 text-sm lg:text-xl mb-1 lg:mb-2">Focus On</h4>
          <p className="text-xs lg:text-base text-amber-300">
            {weeklyActivity.slice(-2).every(d => d.hours < 2)
              ? 'Weekend study time'
              : assignmentStats.completionRate < 80
              ? 'Assignment completion'
              : 'Maintain consistency'}
          </p>
        </div>
      </div>

      {/* AI Insights - Desktop Optimized */}
      <div className="bg-dark-bg-tertiary/50 hover:bg-dark-bg-tertiary rounded-lg p-5 lg:p-8 border border-dark-border-subtle hover:border-dark-border-subtle/80 transition-all">
        <div className="flex gap-3 lg:gap-6">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 lg:w-16 lg:h-16 rounded-xl bg-gradient-to-br from-accent-purple to-accent-purple-dark flex items-center justify-center">
              <svg className="w-5 h-5 lg:w-8 lg:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-dark-text-primary text-base lg:text-2xl mb-1.5 lg:mb-3">AI Recommendation</h4>
            <p className="text-sm lg:text-lg text-dark-text-secondary leading-relaxed mb-3 lg:mb-5">
              {studyStats.totalHours < 10
                ? `You've logged ${studyStats.totalHours} hours this month. Try to add 30 minutes of daily study to reach your goals faster!`
                : assignmentStats.completionRate < 80
                ? `You're at ${assignmentStats.completionRate}% completion. Focus on finishing pending assignments to improve your rate!`
                : `Great work! You've completed ${assignmentStats.completed} assignments with ${studyStats.totalHours}h of study time. Keep it up!`}
            </p>
            <button
              onClick={() => window.location.hash = '#tutor'}
              className="text-sm lg:text-base font-semibold text-primary-500 hover:text-primary-400 transition-colors"
            >
              Get personalized tips →
            </button>
          </div>
        </div>
      </div>

      {/* Course Breakdown */}
      {courseStats.length > 0 && (
        <div className="relative overflow-hidden rounded-lg bg-dark-bg-tertiary/50 hover:bg-dark-bg-tertiary p-6 lg:p-8 border border-dark-border-subtle hover:border-dark-border-subtle/80 transition-all">
          <div className="relative z-10">
            <h3 className="text-xl lg:text-2xl font-bold text-dark-text-primary mb-4 lg:mb-6">By Course</h3>
            <div className="space-y-3 lg:space-y-4">
              {courseStats.map((course, index) => {
                const totalHours = (course.total_focus_minutes / 60).toFixed(1)
                const maxMinutes = Math.max(...courseStats.map(c => c.total_focus_minutes), 1)
                const percentage = (course.total_focus_minutes / maxMinutes) * 100

                return (
                  <div key={course.id} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="text-sm lg:text-base font-semibold text-dark-text-primary">
                          {course.course_code || course.course_name}
                        </h4>
                        {course.course_code && course.course_code !== course.course_name && (
                          <p className="text-xs text-dark-text-muted">{course.course_name}</p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-base lg:text-lg font-bold text-primary-400">
                          {totalHours}h
                        </p>
                        <p className="text-xs text-dark-text-muted">
                          {course.assignments_completed} completed
                        </p>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-dark-bg-primary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-accent-cyan rounded-full transition-all duration-500 group-hover:from-primary-400 group-hover:to-accent-cyan-400"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-dark-text-muted">
                      <span>{course.focus_sessions} sessions</span>
                      <span>•</span>
                      <span>Avg {(course.total_focus_minutes / Math.max(course.focus_sessions, 1)).toFixed(0)} min/session</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Empty State - Desktop Optimized */}
      {assignmentStats.total === 0 && studyStats.totalHours === 0 && courseStats.length === 0 && (
        <div className="text-center py-12 lg:py-24 bg-dark-bg-secondary rounded-2xl lg:rounded-3xl border border-dark-border-glow">
          <div className="w-20 h-20 lg:w-32 lg:h-32 mx-auto mb-4 lg:mb-8 rounded-2xl lg:rounded-3xl bg-dark-bg-tertiary flex items-center justify-center border border-dark-border-glow">
            <svg className="w-10 h-10 lg:w-16 lg:h-16 text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-dark-text-secondary text-base lg:text-2xl font-medium mb-1 lg:mb-3">No data yet</p>
          <p className="text-dark-text-muted text-sm lg:text-lg">
            Start adding assignments and tracking study time to see your analytics!
          </p>
        </div>
      )}
    </div>
  )
}

export default Analytics
