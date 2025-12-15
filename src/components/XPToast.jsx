import { useEffect } from 'react'

/**
 * XP Toast Component
 * Shows XP gains and level-up notifications
 *
 * Usage:
 * - Regular XP: Pass xp amount, shows subtle inline
 * - Level-up: Pass levelUp=true, shows prominent toast
 */
const XPToast = ({ xp, levelUp, newLevel, message, onClose, duration = 3000 }) => {
  useEffect(() => {
    if (onClose && duration > 0) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [onClose, duration])

  if (levelUp) {
    // Prominent level-up toast
    return (
      <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl md:rounded-2xl px-5 md:px-6 py-4 md:py-5 shadow-glow-orange flex items-center gap-3 md:gap-4 border-2 border-yellow-300">
          <div className="text-4xl md:text-5xl animate-bounce-slow">🎉</div>
          <div className="text-white">
            <div className="font-bold text-lg md:text-xl">LEVEL UP!</div>
            <div className="text-sm md:text-base mt-0.5">
              You're now <span className="font-bold">Level {newLevel}</span>
            </div>
            <div className="text-xs md:text-sm bg-white/20 px-2 py-0.5 rounded mt-1 inline-block">
              +{xp} XP Earned
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-2 p-1 rounded-lg hover:bg-white/20 transition-all active:scale-95"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  // Subtle XP gain notification (inline, not prominent)
  return (
    <div className="fixed top-4 right-4 z-40 animate-fade-in">
      <div className="bg-dark-bg-secondary border border-yellow-500/40 rounded-lg md:rounded-xl px-4 py-2 shadow-dark-soft flex items-center gap-2">
        <span className="text-lg">⭐</span>
        <div className="text-yellow-400 font-semibold text-sm md:text-base">
          +{xp} XP
        </div>
        {message && (
          <div className="text-xs text-dark-text-muted ml-1">{message}</div>
        )}
      </div>
    </div>
  )
}

export default XPToast
