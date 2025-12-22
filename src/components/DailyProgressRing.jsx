/**
 * Daily Progress Ring Component
 * SVG circular progress indicator showing completion percentage
 */

import { useEffect, useState } from 'react'

export default function DailyProgressRing({ activities }) {
  const [percentage, setPercentage] = useState(0)
  const [showCelebration, setShowCelebration] = useState(false)

  useEffect(() => {
    calculateProgress()
  }, [activities])

  const calculateProgress = () => {
    if (activities.length === 0) {
      setPercentage(0)
      return
    }

    const completed = activities.filter(a => a.is_completed).length
    const total = activities.length
    const pct = Math.round((completed / total) * 100)

    // Animate to the new percentage
    let current = 0
    const increment = pct / 30 // 30 frames
    const timer = setInterval(() => {
      current += increment
      if (current >= pct) {
        current = pct
        clearInterval(timer)
        if (pct === 100) {
          setShowCelebration(true)
          setTimeout(() => setShowCelebration(false), 2000)
        }
      }
      setPercentage(Math.round(current))
    }, 20)

    return () => clearInterval(timer)
  }

  const radius = 70
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  const getColor = () => {
    if (percentage === 100) return '#22c55e' // green
    if (percentage >= 75) return '#3b82f6' // blue
    if (percentage >= 50) return '#06b6d4' // cyan
    if (percentage >= 25) return '#f59e0b' // amber
    return '#ef4444' // red
  }

  return (
    <div className="relative overflow-hidden bg-dark-bg-secondary/30 backdrop-blur-xl rounded-xl p-5 border border-white/10 shadow-[0_4px_16px_0_rgba(0,0,0,0.25)]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20">
          <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-dark-text-primary">Today's Progress</h3>
          <p className="text-xs text-dark-text-muted">
            {activities.filter(a => a.is_completed).length} of {activities.length} completed
          </p>
        </div>
      </div>

      {/* Progress Ring */}
      <div className="flex items-center justify-center py-4 relative">
        <svg width="180" height="180" className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            stroke="#1f2937"
            strokeWidth="12"
            fill="none"
          />

          {/* Progress circle */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            stroke={getColor()}
            strokeWidth="12"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
            style={{
              filter: `drop-shadow(0 0 8px ${getColor()}40)`
            }}
          />
        </svg>

        {/* Percentage text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`text-5xl font-bold ${
            percentage === 100 ? 'text-green-400' : 'text-dark-text-primary'
          } transition-colors`}>
            {percentage}%
          </div>
          {percentage === 100 && (
            <div className="text-2xl mt-1 animate-float">🎉</div>
          )}
        </div>

        {/* Celebration effect */}
        {showCelebration && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute top-1/2 left-1/2 w-2 h-2 bg-green-400 rounded-full animate-fly-away"
                style={{
                  animationDelay: `${i * 0.1}s`,
                  transform: `rotate(${i * 30}deg) translateY(-40px)`
                }}
              ></div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-dark-border-subtle">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">
            {activities.filter(a => a.is_completed).length}
          </div>
          <div className="text-xs text-dark-text-muted mt-1">Completed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-400">
            {activities.filter(a => !a.is_completed).length}
          </div>
          <div className="text-xs text-dark-text-muted mt-1">Remaining</div>
        </div>
      </div>
    </div>
  )
}
