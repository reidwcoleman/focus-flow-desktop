/**
 * Grade Trends Chart Component
 * Visualizes grade history and trends over time
 */

import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function GradeChart({ grades }) {
  // If no grades, show empty state
  if (!grades || grades.length === 0) {
    return (
      <div className="text-center py-8 text-dark-text-muted">
        <div className="text-4xl mb-2">📊</div>
        <p>No grade data available yet</p>
      </div>
    )
  }

  // Prepare data for chart - average grade over time
  const chartData = grades
    .filter(g => g.current_score != null)
    .map(grade => ({
      name: grade.class_name?.substring(0, 15) || 'Unknown',
      score: Math.round(grade.current_score),
      letterGrade: grade.letter_grade || ''
    }))
    .slice(0, 10) // Show top 10 courses

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-dark-bg-secondary/95 backdrop-blur-xl border border-white/20 rounded-lg p-3 shadow-lg">
          <p className="text-dark-text-primary font-semibold">{payload[0].payload.name}</p>
          <p className="text-primary-400 font-bold text-lg">{payload[0].value}%</p>
          <p className="text-dark-text-muted text-sm">Grade: {payload[0].payload.letterGrade}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#58a6ff" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#58a6ff" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
          <XAxis
            dataKey="name"
            stroke="#8b949e"
            tick={{ fill: '#8b949e', fontSize: 12 }}
          />
          <YAxis
            domain={[0, 100]}
            stroke="#8b949e"
            tick={{ fill: '#8b949e', fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#58a6ff"
            strokeWidth={2}
            fill="url(#colorScore)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
