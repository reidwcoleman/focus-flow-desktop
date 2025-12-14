import { useState, useEffect } from 'react'
import analyticsService from '../services/analyticsService'
import { StatCardSkeleton } from './LoadingSkeleton'

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [])

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
    <div className="space-y-6 pb-6 animate-fadeIn">
      {/* Overall Performance */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-dark-navy to-dark-navy-light p-6 shadow-dark-soft-lg border border-dark-border-glow">
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-dark-text-primary mb-1">Performance</h2>
              <p className="text-dark-text-secondary text-sm">Your academic overview</p>
            </div>
            <div className="px-3 py-1.5 bg-primary-500/20 backdrop-blur-sm rounded-full border border-primary-500/30">
              <span className="text-primary-500 font-semibold text-sm">
                {assignmentStats.completionRate}% Complete
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-dark-bg-secondary/50 backdrop-blur-sm rounded-xl p-4 border border-dark-border-glow">
              <div className="text-3xl font-bold text-dark-text-primary mb-1">
                {assignmentStats.total}
              </div>
              <div className="text-dark-text-secondary text-xs">Assignments</div>
            </div>
            <div className="bg-dark-bg-secondary/50 backdrop-blur-sm rounded-xl p-4 border border-dark-border-glow">
              <div className="text-3xl font-bold text-dark-text-primary mb-1">
                {studyStats.totalHours}h
              </div>
              <div className="text-dark-text-secondary text-xs">Study Hours</div>
            </div>
            <div className="bg-dark-bg-secondary/50 backdrop-blur-sm rounded-xl p-4 border border-dark-border-glow">
              <div className="text-3xl font-bold text-dark-text-primary mb-1">
                {assignmentStats.onTimeRate}%
              </div>
              <div className="text-dark-text-secondary text-xs">On Time</div>
            </div>
          </div>
        </div>

        {/* Decorative orbs */}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-accent-purple/10 rounded-full blur-3xl"></div>
      </div>

      {/* Subject Breakdown */}
      {subjectBreakdown.length > 0 && (
        <div className="bg-dark-bg-secondary rounded-2xl p-5 shadow-dark-soft-md border border-dark-border-glow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-dark-text-primary">Subject Breakdown</h3>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary-500/10 border border-primary-500/30">
              <svg className="w-3.5 h-3.5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-xs font-medium text-primary-500">Real Data</span>
            </div>
          </div>

          <div className="space-y-4">
            {subjectBreakdown.slice(0, 5).map((subject) => (
              <div key={subject.subject}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getSubjectColor(subject.subject)} shadow-dark-soft`}></div>
                    <div>
                      <div className="font-semibold text-dark-text-primary text-sm">{subject.subject}</div>
                      <div className="text-xs text-dark-text-secondary">
                        {subject.studyHours}h · {subject.assignmentCount} assignments
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-primary-500">
                      {subject.completionRate}%
                    </div>
                    <div className="text-xs text-dark-text-muted">complete</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="relative h-2 bg-dark-bg-primary rounded-full overflow-hidden shadow-dark-inner">
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
      <div className="bg-dark-bg-secondary rounded-2xl p-5 shadow-dark-soft-md border border-dark-border-glow">
        <h3 className="font-bold text-dark-text-primary mb-4">This Week's Activity</h3>

        <div className="flex items-end justify-between gap-2 h-40 mb-4">
          {weeklyActivity.map((day, index) => {
            const height = maxHours > 0 ? (day.hours / maxHours) * 100 : 0
            const isToday = new Date().toISOString().split('T')[0] === day.date

            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                <div className="relative w-full flex flex-col justify-end h-32">
                  <div
                    className={`w-full rounded-t-xl transition-all ${
                      isToday
                        ? 'bg-gradient-to-t from-primary-500 to-accent-cyan shadow-glow-cyan'
                        : day.hours > 0
                        ? 'bg-gradient-to-t from-primary-600 to-primary-500'
                        : 'bg-gradient-to-t from-dark-bg-tertiary to-dark-navy-dark'
                    }`}
                    style={{ height: `${Math.max(height, 5)}%` }}
                  >
                    {day.hours > 0 && (
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-bold text-dark-text-primary whitespace-nowrap">
                        {day.hours}h
                      </div>
                    )}
                  </div>
                </div>
                <div className={`text-xs font-medium ${isToday ? 'text-primary-500' : 'text-dark-text-muted'}`}>
                  {day.day}
                </div>
              </div>
            )
          })}
        </div>

        <div className="pt-4 border-t border-dark-border-subtle">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold text-dark-text-primary">{totalWeekHours}h</div>
              <div className="text-xs text-dark-text-secondary">Total Study Time</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary-500">{studyStats.avgFocusScore}%</div>
              <div className="text-xs text-dark-text-secondary">Avg Focus Score</div>
            </div>
          </div>
        </div>
      </div>

      {/* Strengths & Improvements */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-700/40 rounded-2xl p-4 shadow-dark-soft">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-600 to-emerald-700 flex items-center justify-center shadow-dark-soft mb-3">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 className="font-semibold text-green-400 text-sm mb-1">Strengths</h4>
          <p className="text-xs text-green-300">
            {assignmentStats.completionRate >= 80
              ? 'Great completion rate!'
              : studyStats.totalHours >= 20
              ? 'Strong study habits'
              : 'Keep going!'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-amber-900/20 to-orange-900/20 border border-amber-700/40 rounded-2xl p-4 shadow-dark-soft">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center shadow-dark-soft mb-3">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h4 className="font-semibold text-amber-400 text-sm mb-1">Focus On</h4>
          <p className="text-xs text-amber-300">
            {weeklyActivity.slice(-2).every(d => d.hours < 2)
              ? 'Weekend study time'
              : assignmentStats.completionRate < 80
              ? 'Assignment completion'
              : 'Maintain consistency'}
          </p>
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-gradient-to-br from-accent-purple/10 via-dark-bg-tertiary to-primary-500/10 rounded-2xl p-5 border border-dark-border-glow shadow-dark-soft-md">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-purple to-accent-purple-dark flex items-center justify-center shadow-glow-purple">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-dark-text-primary mb-1.5">AI Recommendation</h4>
            <p className="text-sm text-dark-text-secondary leading-relaxed mb-3">
              {studyStats.totalHours < 10
                ? `You've logged ${studyStats.totalHours} hours this month. Try to add 30 minutes of daily study to reach your goals faster!`
                : assignmentStats.completionRate < 80
                ? `You're at ${assignmentStats.completionRate}% completion. Focus on finishing pending assignments to improve your rate!`
                : `Great work! You've completed ${assignmentStats.completed} assignments with ${studyStats.totalHours}h of study time. Keep it up!`}
            </p>
            <button
              onClick={() => window.location.hash = '#tutor'}
              className="text-sm font-semibold text-primary-500 hover:text-primary-400"
            >
              Get personalized tips →
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {assignmentStats.total === 0 && studyStats.totalHours === 0 && (
        <div className="text-center py-12 bg-dark-bg-secondary rounded-2xl border border-dark-border-glow">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-dark-bg-tertiary flex items-center justify-center border border-dark-border-glow">
            <svg className="w-10 h-10 text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-dark-text-secondary text-base font-medium mb-1">No data yet</p>
          <p className="text-dark-text-muted text-sm">
            Start adding assignments and tracking study time to see your analytics!
          </p>
        </div>
      )}
    </div>
  )
}

export default Analytics
