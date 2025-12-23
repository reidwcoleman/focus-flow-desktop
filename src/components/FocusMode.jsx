/**
 * Focus Mode - Simple Study Timer
 * A clean, customizable timer to help students focus and study
 */

import { useState, useEffect } from 'react'
import { toast } from './Toast'

const FocusMode = () => {
  // Timer state
  const [duration, setDuration] = useState(25 * 60) // default 25 minutes in seconds
  const [timeRemaining, setTimeRemaining] = useState(25 * 60)
  const [isActive, setIsActive] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  // Custom duration input
  const [customMinutes, setCustomMinutes] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  // Timer countdown
  useEffect(() => {
    let interval = null

    if (isActive && !isPaused && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(time => {
          if (time <= 1) {
            handleTimerComplete()
            return 0
          }
          return time - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isActive, isPaused, timeRemaining])

  const handleTimerComplete = () => {
    setIsActive(false)
    setIsPaused(false)
    toast.success('Focus session complete! Great work! 🎉')

    // Optional: Play a sound notification
    if (typeof Audio !== 'undefined') {
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLaiTcIGWi77eefTRAMUKfj8LZjHAY4ktfyzHksBSR3x/DdkEAKFF606+uoVRQKRp/g8r5sIQUrgtDy1IY9Bxlnvuz8n1EQDE+m4/C3YhwGOJHX8sx5LAUkd8jw2I9BCxRbtOPrrFYVCkaf3/K/bSEFK4PQ8tSGPQcZZ77s/J9REAxPpuLwuGIcBjiR1/LNeSsFJXjI8NiPQAoUW7Pj66xWFQpGnt/yv20hBSqD0PLUhj0HGWe+7PyfURAN')
        audio.play().catch(() => {}) // Ignore errors if audio doesn't play
      } catch (e) {
        // Ignore audio errors
      }
    }
  }

  const handleStart = () => {
    if (timeRemaining === 0) {
      setTimeRemaining(duration)
    }
    setIsActive(true)
    setIsPaused(false)
  }

  const handlePause = () => {
    setIsPaused(true)
  }

  const handleResume = () => {
    setIsPaused(false)
  }

  const handleReset = () => {
    setIsActive(false)
    setIsPaused(false)
    setTimeRemaining(duration)
  }

  const handleSetDuration = (minutes) => {
    const seconds = minutes * 60
    setDuration(seconds)
    setTimeRemaining(seconds)
    setIsActive(false)
    setIsPaused(false)
    setShowCustomInput(false)
  }

  const handleCustomDuration = () => {
    const minutes = parseInt(customMinutes)
    if (minutes > 0 && minutes <= 180) {
      handleSetDuration(minutes)
      setCustomMinutes('')
    } else {
      toast.error('Please enter a valid duration (1-180 minutes)')
    }
  }

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`
  }

  const getProgressPercentage = () => {
    if (duration === 0) return 0
    const elapsed = duration - timeRemaining
    return Math.min(100, (elapsed / duration) * 100)
  }

  // Duration presets
  const presets = [
    { minutes: 5, label: '5m', emoji: '⚡' },
    { minutes: 15, label: '15m', emoji: '📚' },
    { minutes: 25, label: '25m', emoji: '🎯' },
    { minutes: 45, label: '45m', emoji: '🔥' },
    { minutes: 60, label: '1h', emoji: '💪' },
  ]

  const progress = getProgressPercentage()

  return (
    <div className="min-h-screen bg-[#0D0D0F] px-5 md:px-8 lg:px-12 pb-24 md:pb-12 pt-8 md:pt-12 lg:pt-16">
      <div className="max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12 lg:mb-16">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#4E30BD] via-[#7C5CFF] to-[#A0FFF9] bg-[length:200%_200%] animate-opal-gradient mb-3 md:mb-4">
            Focus Timer
          </h1>
          <p className="text-base md:text-lg lg:text-xl text-dark-text-secondary">
            Stay focused, study better
          </p>
        </div>

        {/* Timer Circle */}
        <div className="relative w-72 h-72 md:w-96 md:h-96 lg:w-[28rem] lg:h-[28rem] mx-auto mb-12 md:mb-16 lg:mb-20">
          {/* Ambient Glow Background */}
          <div className={`absolute inset-0 rounded-full bg-[#4E30BD]/10 blur-3xl transition-all duration-1000 ${
            isActive && !isPaused ? 'animate-opal-breathe' : 'opacity-50'
          }`} />

          {/* Background Circle */}
          <svg className="w-full h-full -rotate-90 relative z-10" viewBox="0 0 256 256">
            <circle
              cx="128"
              cy="128"
              r="120"
              stroke="currentColor"
              strokeWidth="10"
              fill="none"
              className="text-dark-bg-tertiary"
            />
            {/* Progress Circle */}
            <circle
              cx="128"
              cy="128"
              r="120"
              stroke="url(#opal-gradient)"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 120}`}
              strokeDashoffset={`${2 * Math.PI * 120 * (1 - progress / 100)}`}
              className="transition-[stroke-dashoffset] duration-1000 ease-out"
              style={{ filter: 'drop-shadow(0 0 10px rgba(78, 48, 189, 0.5))' }}
            />
            <defs>
              <linearGradient id="opal-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4E30BD" />
                <stop offset="50%" stopColor="#7C5CFF" />
                <stop offset="100%" stopColor="#A0FFF9" />
              </linearGradient>
            </defs>
          </svg>

          {/* Timer Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
            <div className="text-6xl md:text-7xl lg:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-[#7C5CFF] to-[#A0FFF9] tabular-nums font-mono mb-3 md:mb-4 drop-shadow-[0_0_15px_rgba(124,92,255,0.5)]">
              {formatTime(timeRemaining)}
            </div>
            <p className="text-sm md:text-base lg:text-lg text-dark-text-muted uppercase tracking-widest">
              {isActive && !isPaused ? 'Focusing' : isPaused ? 'Paused' : 'Ready'}
            </p>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex justify-center gap-4 md:gap-6 mb-12 md:mb-16">
          {!isActive ? (
            <button
              onClick={handleStart}
              className="px-12 md:px-16 lg:px-20 py-4 md:py-5 lg:py-6 bg-gradient-to-r from-[#4E30BD] to-[#7C5CFF] text-white font-bold text-lg md:text-xl lg:text-2xl rounded-full shadow-glow-opal-lg hover:shadow-glow-opal-xl hover:scale-105 transition-all duration-300 active:scale-95 flex items-center gap-3"
            >
              <svg className="w-6 h-6 md:w-7 md:h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Start
            </button>
          ) : isPaused ? (
            <>
              <button
                onClick={handleResume}
                className="px-10 md:px-14 py-4 md:py-5 bg-gradient-to-r from-[#4E30BD] to-[#7C5CFF] text-white font-bold text-lg md:text-xl rounded-full shadow-glow-opal-lg hover:shadow-glow-opal-xl hover:scale-105 transition-all duration-300 active:scale-95 flex items-center gap-2"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Resume
              </button>
              <button
                onClick={handleReset}
                className="px-10 md:px-14 py-4 md:py-5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white font-semibold text-lg md:text-xl rounded-full hover:bg-[rgba(255,255,255,0.08)] hover:scale-105 transition-all duration-200 active:scale-95"
              >
                Reset
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handlePause}
                className="px-10 md:px-14 py-4 md:py-5 bg-gradient-to-r from-[#4E30BD] to-[#7C5CFF] text-white font-bold text-lg md:text-xl rounded-full shadow-glow-opal-lg hover:shadow-glow-opal-xl hover:scale-105 transition-all duration-300 active:scale-95 flex items-center gap-2"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
                Pause
              </button>
              <button
                onClick={handleReset}
                className="px-10 md:px-14 py-4 md:py-5 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white font-semibold text-lg md:text-xl rounded-full hover:bg-[rgba(255,255,255,0.08)] hover:scale-105 transition-all duration-200 active:scale-95"
              >
                Reset
              </button>
            </>
          )}
        </div>

        {/* Duration Presets */}
        {!isActive && (
          <div className="space-y-6">
            <h3 className="text-center text-sm md:text-base font-semibold text-dark-text-secondary uppercase tracking-wider">
              Set Duration
            </h3>

            {/* Preset Buttons */}
            <div className="flex flex-wrap justify-center gap-3 md:gap-4">
              {presets.map(preset => (
                <button
                  key={preset.minutes}
                  onClick={() => handleSetDuration(preset.minutes)}
                  className={`px-6 md:px-8 py-3 md:py-4 rounded-full font-semibold text-base md:text-lg transition-all duration-200 active:scale-95 ${
                    duration === preset.minutes * 60
                      ? 'bg-gradient-to-r from-[#4E30BD] to-[#7C5CFF] text-white shadow-glow-opal scale-105'
                      : 'bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-dark-text-secondary hover:scale-105 hover:border-[#7C5CFF]/30'
                  }`}
                >
                  {preset.emoji} {preset.label}
                </button>
              ))}
            </div>

            {/* Custom Duration Input */}
            <div className="max-w-md mx-auto">
              {!showCustomInput ? (
                <button
                  onClick={() => setShowCustomInput(true)}
                  className="w-full py-3 md:py-4 px-6 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-dark-text-secondary font-semibold text-base md:text-lg rounded-full hover:bg-[rgba(255,255,255,0.08)] hover:border-[#7C5CFF]/30 hover:scale-105 transition-all duration-200 active:scale-95"
                >
                  ⏱️ Custom Duration
                </button>
              ) : (
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleCustomDuration()
                    }}
                    placeholder="Minutes (1-180)"
                    min="1"
                    max="180"
                    className="flex-1 px-4 md:px-6 py-3 md:py-4 rounded-full bg-dark-bg-secondary border border-dark-border-subtle text-dark-text-primary text-base md:text-lg placeholder:text-dark-text-muted focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                    autoFocus
                  />
                  <button
                    onClick={handleCustomDuration}
                    className="px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-[#4E30BD] to-[#7C5CFF] text-white font-semibold text-base md:text-lg rounded-full hover:scale-105 transition-all duration-200 active:scale-95"
                  >
                    Set
                  </button>
                  <button
                    onClick={() => {
                      setShowCustomInput(false)
                      setCustomMinutes('')
                    }}
                    className="px-4 py-3 md:py-4 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-dark-text-secondary rounded-full hover:bg-[rgba(255,255,255,0.08)] hover:scale-105 transition-all duration-200 active:scale-95"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Study Tips */}
        {!isActive && (
          <div className="mt-16 bg-dark-bg-tertiary/30 rounded-2xl p-6 md:p-8 border border-dark-border-subtle">
            <h4 className="text-lg md:text-xl font-semibold text-dark-text-primary mb-4 flex items-center gap-2">
              💡 Focus Tips
            </h4>
            <ul className="space-y-3 text-sm md:text-base text-dark-text-secondary">
              <li className="flex items-start gap-3">
                <span className="text-[#7C5CFF] mt-1">•</span>
                <span>Try the <strong className="text-dark-text-primary">Pomodoro Technique</strong>: 25 minutes of focused work, then a 5-minute break</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#7C5CFF] mt-1">•</span>
                <span>Put your phone in another room to minimize distractions</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#7C5CFF] mt-1">•</span>
                <span>Use noise-canceling headphones or study music to help concentration</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#7C5CFF] mt-1">•</span>
                <span>Keep a glass of water nearby to stay hydrated</span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default FocusMode
