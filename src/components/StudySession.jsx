/**
 * StudySession Component
 * Interactive flashcard study mode with swipe gestures and SM-2 spaced repetition
 */

import { useState, useRef, useEffect } from 'react'
import { useStudy } from '../contexts/StudyContext'
import FlashCard from './FlashCard'

const StudySession = ({ deckId, cards, onComplete, onExit }) => {
  const { recordCardReview } = useStudy()

  // Use activeCards to allow resetting session with missed cards
  const [activeCards, setActiveCards] = useState(cards)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sessionStats, setSessionStats] = useState({
    needsWork: 0,
    mastered: 0
  })
  const [missedCards, setMissedCards] = useState([])
  const [showComplete, setShowComplete] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [cardExiting, setCardExiting] = useState(null)
  const [cardEntering, setCardEntering] = useState(false)
  const [swipeDirection, setSwipeDirection] = useState(null) // 'left' | 'right' | null
  const [swipeIntensity, setSwipeIntensity] = useState(0) // 0-1 based on threshold

  // Session timing
  const [sessionStartTime] = useState(Date.now())
  const [cardStartTime, setCardStartTime] = useState(Date.now())
  const [cardTimes, setCardTimes] = useState([])

  // Track results for each card for color-coded progress bar
  const [cardResults, setCardResults] = useState([])

  const dragStartX = useRef(0)
  const cardRef = useRef(null)

  const currentCard = activeCards[currentIndex]
  const progress = ((currentIndex + 1) / activeCards.length) * 100

  // Touch/Mouse event handlers for swipe gestures
  const handleDragStart = (clientX) => {
    setIsDragging(true)
    dragStartX.current = clientX
  }

  const handleDragMove = (clientX) => {
    if (!isDragging) return
    const diff = clientX - dragStartX.current
    setDragOffset(diff)

    // Calculate swipe intensity for visual feedback
    const intensity = Math.min(Math.abs(diff) / 100, 1)
    setSwipeIntensity(intensity)
    setSwipeDirection(diff > 20 ? 'right' : diff < -20 ? 'left' : null)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    setSwipeDirection(null)
    setSwipeIntensity(0)

    // Swipe threshold
    const threshold = 100

    if (Math.abs(dragOffset) > threshold) {
      // Trigger exit animation
      setCardExiting(dragOffset > 0 ? 'right' : 'left')

      // Wait for animation, then handle rating
      setTimeout(() => {
        if (dragOffset > 0) {
          // Swipe right - Mastered (rating 5)
          handleRating(5)
        } else {
          // Swipe left - Needs Work (rating 2)
          handleRating(2)
        }
        setCardExiting(null)
        setCardEntering(true)
        setTimeout(() => setCardEntering(false), 300)
      }, 300)
    }

    setDragOffset(0)
  }

  const handleRating = (rating) => {
    // Track card timing
    const cardTime = Date.now() - cardStartTime
    setCardTimes(prev => [...prev, cardTime])
    setCardStartTime(Date.now())

    // Record the review with SM-2 algorithm
    recordCardReview(currentCard.id, rating)

    // Track missed cards for review
    if (rating <= 2) {
      setMissedCards(prev => [...prev, currentCard])
    }

    // Track card result for progress bar (mastered=green, needsWork=amber)
    setCardResults(prev => [...prev, rating >= 5 ? 'mastered' : 'needsWork'])

    // Update streak
    if (rating >= 5) {
      const newStreak = streak + 1
      setStreak(newStreak)
      if (newStreak > bestStreak) {
        setBestStreak(newStreak)
      }

      // Trigger confetti on milestones (5, 10, 15, 20...)
      if (newStreak % 5 === 0) {
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 3000)
      }
    } else {
      setStreak(0)
    }

    // Update stats - simplified to two categories
    setSessionStats(prev => ({
      ...prev,
      needsWork: prev.needsWork + (rating <= 2 ? 1 : 0),
      mastered: prev.mastered + (rating >= 5 ? 1 : 0)
    }))

    // Move to next card or complete
    if (currentIndex < activeCards.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      setShowComplete(true)
    }
  }

  const reviewMissedCards = () => {
    // Reset session with only the missed cards
    if (missedCards.length > 0) {
      setActiveCards([...missedCards])
      setCurrentIndex(0)
      setSessionStats({ needsWork: 0, mastered: 0 })
      setMissedCards([])
      setShowComplete(false)
      setStreak(0)
      setCardStartTime(Date.now())
      setCardResults([]) // Reset progress bar results
    }
  }

  const accuracy = activeCards.length > 0 ? Math.round((sessionStats.mastered / activeCards.length) * 100) : 0

  // Calculate session metrics
  const sessionDuration = Date.now() - sessionStartTime
  const sessionMinutes = Math.floor(sessionDuration / 60000)
  const sessionSeconds = Math.floor((sessionDuration % 60000) / 1000)
  const avgCardTime = cardTimes.length > 0 ? Math.round(cardTimes.reduce((a, b) => a + b, 0) / cardTimes.length / 1000) : 0
  const cardsPerMinute = sessionDuration > 0 ? Math.round((cards.length / sessionDuration) * 60000 * 10) / 10 : 0

  if (!currentCard || showComplete) {
    return (
      <div className="fixed inset-0 z-50 bg-dark-bg flex items-center justify-center p-8">
        <div className="max-w-2xl w-full bg-dark-bg-secondary rounded-3xl p-12 shadow-dark-soft-xl border border-dark-border-glow">
          {/* Circular Accuracy Indicator */}
          <div className="text-center mb-12 animate-opal-card-enter">
            <h2 className="text-4xl font-bold text-dark-text-primary mb-10">Session Complete!</h2>

            {/* Circular Progress Ring - Larger for Desktop */}
            <div className="relative w-80 h-80 mx-auto mb-10">
              <svg className="w-80 h-80 transform -rotate-90" viewBox="0 0 200 200">
                {/* Background circle */}
                <circle
                  cx="100"
                  cy="100"
                  r="85"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="16"
                />
                {/* Accuracy arc */}
                <circle
                  cx="100"
                  cy="100"
                  r="85"
                  fill="none"
                  stroke={accuracy >= 80 ? '#10b981' : accuracy >= 60 ? '#f59e0b' : '#f97316'}
                  strokeWidth="16"
                  strokeDasharray={`${(accuracy / 100) * 534} 534`}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                  style={{
                    filter: 'drop-shadow(0 0 8px rgba(124, 92, 255, 0.3))'
                  }}
                />
              </svg>
              {/* Center text - Larger fonts */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className={`text-8xl font-bold ${accuracy >= 80 ? 'text-green-600' : accuracy >= 60 ? 'text-amber-600' : 'text-orange-600'}`}>
                  {accuracy}%
                </div>
                <div className="text-xl text-dark-text-secondary font-semibold mt-3">Accuracy</div>
              </div>
            </div>

            {/* Mastered vs Needs Work - Larger fonts and spacing */}
            <div className="flex items-center justify-center gap-12 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-green-500"></div>
                <span className="text-lg text-dark-text-secondary">
                  <span className="font-bold text-green-500 text-xl">{sessionStats.mastered}</span> Mastered
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-amber-500"></div>
                <span className="text-lg text-dark-text-secondary">
                  <span className="font-bold text-amber-500 text-xl">{sessionStats.needsWork}</span> Needs Work
                </span>
              </div>
            </div>
          </div>

          {/* Simplified 3-Stat Row with Staggered Animation - Larger for Desktop */}
          <div className="grid grid-cols-3 gap-6 mb-10">
            {/* Duration */}
            <div
              className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-6 text-center animate-opal-card-enter"
              style={{ animationDelay: '0.1s' }}
            >
              <div className="text-sm text-blue-600 font-bold uppercase tracking-wide mb-2">Duration</div>
              <div className="text-3xl font-bold text-blue-700">
                {sessionMinutes}:{sessionSeconds.toString().padStart(2, '0')}
              </div>
            </div>

            {/* Avg/Card */}
            <div
              className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-xl p-6 text-center animate-opal-card-enter"
              style={{ animationDelay: '0.2s' }}
            >
              <div className="text-sm text-indigo-600 font-bold uppercase tracking-wide mb-2">Avg/Card</div>
              <div className="text-3xl font-bold text-indigo-700">{avgCardTime}s</div>
            </div>

            {/* Best Streak */}
            <div
              className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-6 text-center animate-opal-card-enter"
              style={{ animationDelay: '0.3s' }}
            >
              <div className="text-sm text-purple-600 font-bold uppercase tracking-wide mb-2">Best 🔥</div>
              <div className="text-3xl font-bold text-purple-700">{bestStreak || 0}</div>
            </div>
          </div>

          {/* Total Cards - Larger text */}
          <div
            className="bg-neutral-50 rounded-xl p-5 text-center mb-10 animate-opal-card-enter"
            style={{ animationDelay: '0.4s' }}
          >
            <span className="text-neutral-600 text-lg">
              <span className="font-bold text-neutral-900 text-xl">{cards.length}</span> cards reviewed
            </span>
          </div>

          {/* Actions - Larger buttons */}
          <div
            className="space-y-4 animate-opal-card-enter"
            style={{ animationDelay: '0.5s' }}
          >
            {missedCards.length > 0 && (
              <button
                onClick={reviewMissedCards}
                className="w-full py-5 px-8 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-lg font-semibold rounded-xl shadow-soft-lg hover:shadow-soft-xl transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                <span className="text-xl">↻</span>
                <span>Review {missedCards.length} Missed Card{missedCards.length !== 1 ? 's' : ''}</span>
              </button>
            )}
            <button
              onClick={onComplete || onExit}
              className="w-full py-5 px-8 bg-gradient-to-r from-primary-500 to-primary-600 text-white text-lg font-semibold rounded-xl shadow-glow-lg hover:shadow-glow transition-all active:scale-95"
            >
              {missedCards.length > 0 ? 'Finish Later' : 'Done'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-neutral-50 via-white to-primary-50/30">
      {/* Confetti Celebration */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                width: '10px',
                height: '10px',
                backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'][Math.floor(Math.random() * 5)],
                borderRadius: Math.random() > 0.5 ? '50%' : '0',
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
                transform: `rotate(${Math.random() * 360}deg)`
              }}
            />
          ))}
        </div>
      )}

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-white/80 backdrop-blur-md border-b border-neutral-200/60 safe-area-inset-top">
        <div className="max-w-4xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={onExit}
              className="w-14 h-14 rounded-full hover:bg-neutral-100 flex items-center justify-center transition-all active:scale-95"
            >
              <svg className="w-8 h-8 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Streak Display */}
            {streak > 0 && (
              <div className="px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-soft animate-pulse-soft">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">🔥</span>
                  <span className="text-white font-bold text-lg">{streak}</span>
                </div>
              </div>
            )}

            <div className="text-lg font-semibold text-neutral-600">
              {currentIndex + 1} / {cards.length}
            </div>
            <div className="w-14" /> {/* Spacer */}
          </div>

          {/* Color-Coded Segmented Progress Bar */}
          <div className="flex gap-1">
            {activeCards.map((_, index) => {
              const isCompleted = index < currentIndex
              const isCurrent = index === currentIndex
              const isPending = index > currentIndex

              // Determine segment color
              let segmentClass = 'bg-neutral-200' // Default for pending cards
              if (isCompleted && cardResults[index] === 'mastered') {
                segmentClass = 'bg-green-500'
              } else if (isCompleted && cardResults[index] === 'needsWork') {
                segmentClass = 'bg-amber-500'
              } else if (isCurrent) {
                segmentClass = 'bg-primary-500 animate-pulse'
              }

              return (
                <div
                  key={index}
                  className={`h-3 flex-1 rounded-full transition-all duration-300 ${segmentClass}`}
                  style={{
                    minWidth: '6px',
                    boxShadow: isCurrent ? '0 0 8px rgba(124, 92, 255, 0.6)' : 'none'
                  }}
                />
              )
            })}
          </div>
        </div>
      </div>

      {/* Flashcard */}
      <div className="h-full flex items-center justify-center px-8 pt-32 pb-48">
        <div
          ref={cardRef}
          className={`w-full max-w-4xl transition-all ${cardEntering ? 'duration-300' : 'duration-200'}`}
          style={{
            transform: cardExiting
              ? `translateX(${cardExiting === 'right' ? '150%' : '-150%'}) rotate(${cardExiting === 'right' ? '30deg' : '-30deg'})`
              : cardEntering
              ? 'translateX(0) rotate(0deg) scale(0.9)'
              : `translateX(${dragOffset}px) rotate(${dragOffset * 0.05}deg)`,
            opacity: cardExiting ? 0 : cardEntering ? 1 : isDragging ? 0.9 : 1,
            background: swipeDirection === 'right'
              ? `rgba(16, 185, 129, ${swipeIntensity * 0.12})` // green tint for mastered
              : swipeDirection === 'left'
              ? `rgba(245, 158, 11, ${swipeIntensity * 0.12})` // amber tint for needs work
              : 'transparent',
            borderRadius: '2rem',
            border: swipeDirection
              ? `4px solid ${swipeDirection === 'right'
                  ? `rgba(16, 185, 129, ${swipeIntensity * 0.6})`
                  : `rgba(245, 158, 11, ${swipeIntensity * 0.6})`}`
              : '4px solid transparent',
            transition: isDragging ? 'none' : 'background 0.15s, border 0.15s'
          }}
          onTouchStart={(e) => !cardExiting && handleDragStart(e.touches[0].clientX)}
          onTouchMove={(e) => !cardExiting && handleDragMove(e.touches[0].clientX)}
          onTouchEnd={handleDragEnd}
          onMouseDown={(e) => !cardExiting && handleDragStart(e.clientX)}
          onMouseMove={(e) => !cardExiting && isDragging && handleDragMove(e.clientX)}
          onMouseUp={handleDragEnd}
          onMouseLeave={() => {
            if (isDragging) {
              setIsDragging(false)
              setDragOffset(0)
            }
          }}
        >
          {/* Swipe feedback icons overlay */}
          <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
            {/* Mastered checkmark - appears on right swipe */}
            <div
              className="absolute w-32 h-32 rounded-full bg-green-500/90 flex items-center justify-center shadow-lg backdrop-blur-sm"
              style={{
                opacity: swipeDirection === 'right' ? swipeIntensity : 0,
                transform: `scale(${swipeDirection === 'right' ? 0.7 + swipeIntensity * 0.5 : 0.5})`,
                transition: 'opacity 0.12s ease-out, transform 0.12s ease-out'
              }}
            >
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {/* Needs work retry icon - appears on left swipe */}
            <div
              className="absolute w-32 h-32 rounded-full bg-amber-500/90 flex items-center justify-center shadow-lg backdrop-blur-sm"
              style={{
                opacity: swipeDirection === 'left' ? swipeIntensity : 0,
                transform: `scale(${swipeDirection === 'left' ? 0.7 + swipeIntensity * 0.5 : 0.5})`,
                transition: 'opacity 0.12s ease-out, transform 0.12s ease-out'
              }}
            >
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
          </div>

          <FlashCard card={currentCard} showDifficulty={true} />
        </div>

        {/* Swipe Indicators */}
        {isDragging && (
          <>
            {/* Right Swipe - Mastered */}
            <div
              className="absolute left-16 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-200"
              style={{
                opacity: dragOffset > 50 ? 1 : 0,
                transform: `translateY(-50%) scale(${dragOffset > 100 ? 1.1 : 1})`
              }}
            >
              <div className="px-8 py-5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl font-bold text-xl shadow-soft-lg flex items-center gap-3">
                <span className="text-3xl">✓</span>
                <span>Mastered</span>
              </div>
            </div>

            {/* Left Swipe - Needs Work */}
            <div
              className="absolute right-16 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-200"
              style={{
                opacity: dragOffset < -50 ? 1 : 0,
                transform: `translateY(-50%) scale(${dragOffset < -100 ? 1.1 : 1})`
              }}
            >
              <div className="px-8 py-5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-2xl font-bold text-xl shadow-soft-lg flex items-center gap-3">
                <span>Needs Work</span>
                <span className="text-3xl">↻</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Swipe Instructions */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-neutral-900/90 to-transparent safe-area-inset-bottom pointer-events-none">
        <div className="max-w-4xl mx-auto px-8 py-12">
          <div className="flex items-center justify-center gap-16 text-white/80">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
                <span className="text-3xl">←</span>
              </div>
              <span className="text-xl font-medium">Needs Work</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xl font-medium">Mastered</span>
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <span className="text-3xl">→</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StudySession
