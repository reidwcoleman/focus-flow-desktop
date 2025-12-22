/**
 * Productivity Heatmap Component
 * GitHub-style contribution heatmap showing last 3 months of activity
 */

import { useState, useEffect } from 'react'

export default function ProductivityHeatmap({ activities }) {
  const [heatmapData, setHeatmapData] = useState([])

  useEffect(() => {
    generateHeatmapData()
  }, [activities])

  const generateHeatmapData = () => {
    // Get last 3 months (91 days)
    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - 90)

    const data = []
    const dateMap = new Map()

    // Initialize all dates with 0 minutes
    for (let i = 0; i <= 90; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      dateMap.set(dateStr, { date: dateStr, minutes: 0, count: 0 })
    }

    // Aggregate activity minutes per day
    activities.forEach(activity => {
      const dateStr = activity.activity_date
      if (dateMap.has(dateStr)) {
        const dayData = dateMap.get(dateStr)
        dayData.minutes += activity.duration_minutes || 60
        dayData.count += 1
        dateMap.set(dateStr, dayData)
      }
    })

    // Convert to array and organize by weeks
    const allDays = Array.from(dateMap.values()).sort((a, b) =>
      new Date(a.date) - new Date(b.date)
    )

    // Group by weeks (7 days each)
    const weeks = []
    for (let i = 0; i < allDays.length; i += 7) {
      weeks.push(allDays.slice(i, i + 7))
    }

    setHeatmapData(weeks)
  }

  const getIntensityColor = (minutes) => {
    if (minutes === 0) return 'bg-dark-bg-tertiary/50'
    if (minutes < 60) return 'bg-green-500/20'
    if (minutes < 120) return 'bg-green-500/40'
    if (minutes < 180) return 'bg-green-500/60'
    if (minutes < 240) return 'bg-green-500/80'
    return 'bg-green-500'
  }

  const getDayName = (dateStr) => {
    const date = new Date(dateStr)
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]
  }

  const getMonthLabel = (week) => {
    if (week.length === 0) return null
    const firstDate = new Date(week[0].date)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return monthNames[firstDate.getMonth()]
  }

  if (heatmapData.length === 0) return null

  return (
    <div className="relative overflow-hidden bg-dark-bg-secondary/30 backdrop-blur-xl rounded-xl p-5 border border-white/10 shadow-[0_4px_16px_0_rgba(0,0,0,0.25)]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20">
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-dark-text-primary">Activity Heatmap</h3>
          <p className="text-xs text-dark-text-muted">Last 3 months</p>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {/* Day labels */}
          <div className="flex flex-col gap-1 pr-2">
            <div className="h-3"></div> {/* Space for month labels */}
            {['Mon', 'Wed', 'Fri'].map((day) => (
              <div key={day} className="h-3 text-xs text-dark-text-muted flex items-center">
                {day}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {heatmapData.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {/* Month label (only on first day of month) */}
              <div className="h-3 text-xs text-dark-text-muted font-medium">
                {weekIndex % 4 === 0 ? getMonthLabel(week) : ''}
              </div>

              {/* Days in week */}
              {week.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className={`w-3 h-3 rounded-sm ${getIntensityColor(day.minutes)} transition-all hover:ring-2 hover:ring-primary-500/50 cursor-pointer group relative`}
                  title={`${day.date}: ${day.count} activities (${day.minutes} min)`}
                >
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-dark-bg-tertiary/95 backdrop-blur-xl rounded border border-primary-500/30 text-xs text-dark-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                    {new Date(day.date).toLocaleDateString()}: {day.count} activities ({day.minutes}m)
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-4 text-xs text-dark-text-muted">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-dark-bg-tertiary/50"></div>
          <div className="w-3 h-3 rounded-sm bg-green-500/20"></div>
          <div className="w-3 h-3 rounded-sm bg-green-500/40"></div>
          <div className="w-3 h-3 rounded-sm bg-green-500/60"></div>
          <div className="w-3 h-3 rounded-sm bg-green-500/80"></div>
          <div className="w-3 h-3 rounded-sm bg-green-500"></div>
        </div>
        <span>More</span>
      </div>
    </div>
  )
}
