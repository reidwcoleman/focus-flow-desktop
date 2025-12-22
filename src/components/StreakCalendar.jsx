/**
 * Streak Calendar Modal
 * Shows calendar with streak history (last 90 days)
 */

import { useState, useEffect } from 'react'
import streakService from '../services/streakService'
import authService from '../services/authService'

const StreakCalendar = ({ onClose, currentStreak, longestStreak }) => {
  const [streakDates, setStreakDates] = useState([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [loading, setLoading] = useState(true)

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  useEffect(() => {
    loadStreakHistory()
  }, [])

  const loadStreakHistory = async () => {
    try {
      const { user } = await authService.getCurrentUser()
      if (!user) return

      const history = await streakService.getStreakHistory(user.id)
      setStreakDates(history)
    } catch (error) {
      console.error('Failed to load streak history:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const days = []
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }
    // Add days of month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    return days
  }

  const isStreakDay = (day) => {
    if (!day) return false
    const dateStr = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      .toISOString().split('T')[0]
    return streakDates.includes(dateStr)
  }

  const isToday = (day) => {
    const today = new Date()
    return day &&
      currentMonth.getFullYear() === today.getFullYear() &&
      currentMonth.getMonth() === today.getMonth() &&
      day === today.getDate()
  }

  const isFutureDay = (day) => {
    if (!day) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    return checkDate > today
  }

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const goToToday = () => {
    setCurrentMonth(new Date())
  }

  const getStreakPercentage = () => {
    const today = new Date()
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(today.getDate() - 90)

    // Count how many days in the last 90 days
    const totalDays = Math.min(90, streakDates.length > 0 ? 90 : 0)
    if (totalDays === 0) return 0

    return Math.round((streakDates.length / totalDays) * 100)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-dark-bg-primary/90 backdrop-blur-2xl rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden animate-scaleIn">
        {/* Header - Glass Morphism */}
        <div className="relative bg-gradient-to-br from-orange-500/20 via-red-500/20 to-yellow-500/20 backdrop-blur-xl p-6 border-b border-orange-500/30">
          {/* Floating glow orbs */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-red-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }}></div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-dark-bg-tertiary/50 hover:bg-dark-bg-tertiary border border-dark-border-glow text-dark-text-primary transition-all active:scale-95 hover:scale-110 hover:rotate-90 duration-300 z-10"
          >
            <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="text-4xl animate-bounce-soft filter drop-shadow-[0_0_12px_rgba(251,146,60,0.8)]">🔥</div>
            <div>
              <h2 className="text-xl font-black text-dark-text-primary">Streak History</h2>
              <p className="text-sm text-dark-text-secondary">Your daily login calendar</p>
            </div>
          </div>

          {/* Stats - Enhanced Glass */}
          <div className="grid grid-cols-3 gap-3 relative z-10">
            <div className="bg-dark-bg-secondary/30 backdrop-blur-xl rounded-xl p-3 border border-white/10 hover:border-orange-400/30 transition-all duration-300 hover:scale-105">
              <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400">
                {currentStreak}
              </div>
              <div className="text-[10px] text-dark-text-muted font-semibold">Current</div>
            </div>
            <div className="bg-dark-bg-secondary/30 backdrop-blur-xl rounded-xl p-3 border border-white/10 hover:border-yellow-400/30 transition-all duration-300 hover:scale-105">
              <div className="text-2xl font-black text-yellow-400">
                {longestStreak}
              </div>
              <div className="text-[10px] text-dark-text-muted font-semibold">Best</div>
            </div>
            <div className="bg-dark-bg-secondary/30 backdrop-blur-xl rounded-xl p-3 border border-white/10 hover:border-primary-500/30 transition-all duration-300 hover:scale-105">
              <div className="text-2xl font-black text-primary-500">
                {getStreakPercentage()}%
              </div>
              <div className="text-[10px] text-dark-text-muted font-semibold">90 Days</div>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-dark-text-primary bg-gradient-to-r from-primary-300 to-accent-cyan bg-clip-text text-transparent">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h3>
                <div className="flex gap-1.5">
                  <button
                    onClick={goToToday}
                    className="px-2.5 py-1.5 rounded-lg bg-primary-500/10 backdrop-blur-sm border border-primary-500/30 text-primary-500 text-xs font-semibold hover:bg-primary-500/20 hover:scale-105 transition-all active:scale-95"
                  >
                    Today
                  </button>
                  <button
                    onClick={previousMonth}
                    className="w-8 h-8 rounded-lg bg-dark-bg-tertiary/50 backdrop-blur-sm border border-dark-border-glow text-dark-text-primary hover:border-primary-500 hover:scale-110 hover:-translate-x-1 transition-all active:scale-95"
                  >
                    <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={nextMonth}
                    className="w-8 h-8 rounded-lg bg-dark-bg-tertiary/50 backdrop-blur-sm border border-dark-border-glow text-dark-text-primary hover:border-primary-500 hover:scale-110 hover:translate-x-1 transition-all active:scale-95"
                  >
                    <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Day Names */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map(day => (
                  <div key={day} className="text-center text-[10px] font-bold text-dark-text-muted py-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {getDaysInMonth().map((day, index) => {
                  const hasStreak = isStreakDay(day)
                  const today = isToday(day)
                  const future = isFutureDay(day)

                  return (
                    <div
                      key={index}
                      className={`aspect-square rounded-lg flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                        !day
                          ? 'invisible'
                          : future
                          ? 'bg-dark-bg-tertiary/30 text-dark-text-muted cursor-not-allowed opacity-30'
                          : hasStreak
                          ? today
                            ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-[0_0_20px_rgba(251,146,60,0.6)] ring-2 ring-yellow-400 animate-pulse-soft hover:scale-110'
                            : 'bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)] hover:scale-110 hover:shadow-[0_0_25px_rgba(34,197,94,0.6)]'
                          : 'bg-dark-bg-tertiary/50 text-dark-text-muted border border-dark-border-subtle hover:bg-dark-bg-tertiary hover:border-primary-500/30 hover:scale-105'
                      }`}
                      style={{ animationDelay: `${index * 0.02}s` }}
                    >
                      {day && (
                        <div className="relative">
                          <span className="relative z-10">{day}</span>
                          {hasStreak && !today && (
                            <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-green-400 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-ping"></div>
                          )}
                          {today && hasStreak && (
                            <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] animate-bounce-soft">🔥</div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="mt-6 flex items-center justify-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-gradient-to-br from-green-500 to-emerald-500"></div>
                  <span className="text-dark-text-secondary">Logged in</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-dark-bg-tertiary/50 border border-dark-border-subtle"></div>
                  <span className="text-dark-text-secondary">Missed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-gradient-to-br from-orange-500 to-red-500 ring-1 ring-yellow-400"></div>
                  <span className="text-dark-text-secondary">Today</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default StreakCalendar
