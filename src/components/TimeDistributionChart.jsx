/**
 * Time Distribution Chart Component
 * Donut chart showing time allocation by activity type
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

export default function TimeDistributionChart({ activities }) {
  // Aggregate time by activity type
  const getDistributionData = () => {
    const typeMinutes = {}
    const typeColors = {
      task: '#3b82f6',
      class: '#a855f7',
      study: '#06b6d4',
      break: '#22c55e',
      event: '#f59e0b',
      meeting: '#ef4444',
      assignment: '#ec4899',
    }

    activities.forEach(activity => {
      const type = activity.activity_type || 'task'
      const minutes = activity.duration_minutes || 60
      typeMinutes[type] = (typeMinutes[type] || 0) + minutes
    })

    return Object.entries(typeMinutes).map(([type, minutes]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: minutes,
      color: typeColors[type] || '#3b82f6',
      hours: (minutes / 60).toFixed(1)
    }))
  }

  const data = getDistributionData()
  const totalMinutes = data.reduce((sum, item) => sum + item.value, 0)
  const totalHours = (totalMinutes / 60).toFixed(1)

  // Custom tooltip with glass morphism
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const percentage = ((data.value / totalMinutes) * 100).toFixed(1)

      return (
        <div className="bg-dark-bg-tertiary/95 backdrop-blur-xl rounded-lg p-3 border border-primary-500/30 shadow-[0_4px_16px_0_rgba(0,0,0,0.3)]">
          <p className="text-sm font-bold text-dark-text-primary mb-1">{data.name}</p>
          <p className="text-xs text-dark-text-secondary">{data.hours} hours ({percentage}%)</p>
        </div>
      )
    }
    return null
  }

  // Custom legend
  const renderLegend = (props) => {
    const { payload } = props
    return (
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-1.5 px-2 py-1 rounded bg-dark-bg-tertiary/50">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            ></div>
            <span className="text-xs text-dark-text-secondary">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="relative overflow-hidden bg-dark-bg-secondary/30 backdrop-blur-xl rounded-xl p-5 border border-white/10 shadow-[0_4px_16px_0_rgba(0,0,0,0.25)] text-center">
        <p className="text-dark-text-muted">No activity data available</p>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden bg-dark-bg-secondary/30 backdrop-blur-xl rounded-xl p-5 border border-white/10 shadow-[0_4px_16px_0_rgba(0,0,0,0.25)]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20">
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-dark-text-primary">Time Distribution</h3>
          <p className="text-xs text-dark-text-muted">Total: {totalHours} hours</p>
        </div>
      </div>

      {/* Chart */}
      <div style={{ width: '100%', height: 250 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={renderLegend} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
