/**
 * Assignment Completion Chart Component
 * Visualizes assignment completion progress over time
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function AssignmentChart({ assignments }) {
  // If no assignments, show empty state
  if (!assignments || assignments.length === 0) {
    return (
      <div className="text-center py-8 text-dark-text-muted">
        <div className="text-4xl mb-2">📝</div>
        <p>No assignment data available yet</p>
      </div>
    )
  }

  // Group assignments by status
  const totalAssignments = assignments.length
  const completed = assignments.filter(a => a.completed).length
  const pending = assignments.filter(a => !a.completed && (!a.due_date || new Date(a.due_date) > new Date())).length
  const overdue = assignments.filter(a => !a.completed && a.due_date && new Date(a.due_date) < new Date()).length

  const chartData = [
    { name: 'Completed', value: completed, color: '#3fb950' },
    { name: 'Pending', value: pending, color: '#58a6ff' },
    { name: 'Overdue', value: overdue, color: '#f85149' },
  ].filter(item => item.value > 0)

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const percent = Math.round((payload[0].value / totalAssignments) * 100)
      return (
        <div className="bg-dark-bg-secondary/95 backdrop-blur-xl border border-white/20 rounded-lg p-3 shadow-lg">
          <p className="text-dark-text-primary font-semibold">{payload[0].payload.name}</p>
          <p className="text-primary-400 font-bold text-lg">{payload[0].value} tasks</p>
          <p className="text-dark-text-muted text-sm">{percent}% of total</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
          <XAxis
            dataKey="name"
            stroke="#8b949e"
            tick={{ fill: '#8b949e', fontSize: 12 }}
          />
          <YAxis
            stroke="#8b949e"
            tick={{ fill: '#8b949e', fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
