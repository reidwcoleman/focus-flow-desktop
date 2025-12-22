/**
 * Weekly Comparison Chart Component
 * Bar chart comparing last 4 weeks - planned vs completed activities
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function WeeklyComparisonChart({ activities }) {
  const getWeeklyData = () => {
    const today = new Date()
    const weeks = []

    // Generate last 4 weeks
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - (i * 7) - today.getDay()) // Start of week (Sunday)

      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6) // End of week (Saturday)

      const weekStartStr = weekStart.toISOString().split('T')[0]
      const weekEndStr = weekEnd.toISOString().split('T')[0]

      // Filter activities for this week
      const weekActivities = activities.filter(activity => {
        return activity.activity_date >= weekStartStr && activity.activity_date <= weekEndStr
      })

      const completed = weekActivities.filter(a => a.is_completed).length
      const total = weekActivities.length
      const pending = total - completed

      weeks.push({
        name: `Week ${4 - i}`,
        dateRange: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
        completed,
        pending,
        total
      })
    }

    return weeks
  }

  const data = getWeeklyData()

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const weekData = payload[0].payload
      return (
        <div className="bg-dark-bg-tertiary/95 backdrop-blur-xl rounded-lg p-3 border border-primary-500/30 shadow-[0_4px_16px_0_rgba(0,0,0,0.3)]">
          <p className="text-sm font-bold text-dark-text-primary mb-2">{label}</p>
          <p className="text-xs text-dark-text-secondary mb-1">
            Starting: {weekData.dateRange}
          </p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-xs text-dark-text-secondary">Completed: {weekData.completed}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              <span className="text-xs text-dark-text-secondary">Pending: {weekData.pending}</span>
            </div>
            <div className="text-xs text-dark-text-muted pt-1 border-t border-dark-border-subtle">
              Total: {weekData.total}
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  if (data.every(week => week.total === 0)) {
    return (
      <div className="relative overflow-hidden bg-dark-bg-secondary/30 backdrop-blur-xl rounded-xl p-5 border border-white/10 shadow-[0_4px_16px_0_rgba(0,0,0,0.25)] text-center">
        <p className="text-dark-text-muted">No activity data for the last 4 weeks</p>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden bg-dark-bg-secondary/30 backdrop-blur-xl rounded-xl p-5 border border-white/10 shadow-[0_4px_16px_0_rgba(0,0,0,0.25)]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-cyan-500/20">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-dark-text-primary">Weekly Progress</h3>
          <p className="text-xs text-dark-text-muted">Last 4 weeks comparison</p>
        </div>
      </div>

      {/* Chart */}
      <div style={{ width: '100%', height: 250 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" opacity={0.2} />
            <XAxis
              dataKey="name"
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#9ca3af' }}
            />
            <YAxis
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#9ca3af' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px' }}
              iconType="circle"
            />
            <Bar
              dataKey="completed"
              fill="#22c55e"
              name="Completed"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="pending"
              fill="#f59e0b"
              name="Pending"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
