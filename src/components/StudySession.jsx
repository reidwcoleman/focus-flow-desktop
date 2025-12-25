/**
 * StudySession Component
 * Polished desktop flashcard study mode with keyboard controls and elegant UI
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useStudy } from '../contexts/StudyContext'
import FlashCard from './FlashCard'

const StudySession = ({ deckId, cards, onComplete, onExit }) => {
  const { recordCardReview } = useStudy()

  const [activeCards, setActiveCards] = useState(cards)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sessionStats, setSessionStats] = useState({ needsWork: 0, mastered: 0 })
  const [missedCards, setMissedCards] = useState([])
  const [showComplete, setShowComplete] = useState(false)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [cardResults, setCardResults] = useState([])
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [exitDirection, setExitDirection] = useState(null)

  // Session timing
  const [sessionStartTime] = useState(Date.now())
  const [cardStartTime, setCardStartTime] = useState(Date.now())
  const [cardTimes, setCardTimes] = useState([])

  const currentCard = activeCards[currentIndex]

  // Keyboard controls
  const handleRating = useCallback((rating) => {
    if (isTransitioning) return

    const cardTime = Date.now() - cardStartTime
    setCardTimes(prev => [...prev, cardTime])
    setCardStartTime(Date.now())

    recordCardReview(currentCard.id, rating)

    if (rating <= 2) {
      setMissedCards(prev => [...prev, currentCard])
    }

    setCardResults(prev => [...prev, rating >= 4 ? 'mastered' : 'needsWork'])

    if (rating >= 4) {
      const newStreak = streak + 1
      setStreak(newStreak)
      if (newStreak > bestStreak) setBestStreak(newStreak)
    } else {
      setStreak(0)
    }

    setSessionStats(prev => ({
      needsWork: prev.needsWork + (rating <= 2 ? 1 : 0),
      mastered: prev.mastered + (rating >= 4 ? 1 : 0)
    }))

    setIsTransitioning(true)
    setExitDirection(rating >= 4 ? 'right' : 'left')

    setTimeout(() => {
      if (currentIndex < activeCards.length - 1) {
        setCurrentIndex(currentIndex + 1)
      } else {
        setShowComplete(true)
      }
      setExitDirection(null)
      setIsTransitioning(false)
    }, 300)
  }, [isTransitioning, cardStartTime, currentCard, currentIndex, activeCards.length, streak, bestStreak, recordCardReview])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showComplete || isTransitioning) return

      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
        case 'Digit1':
          e.preventDefault()
          handleRating(2)
          break
        case 'ArrowRight':
        case 'KeyD':
        case 'Digit2':
          e.preventDefault()
          handleRating(5)
          break
        case 'Escape':
          e.preventDefault()
          onExit()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleRating, showComplete, isTransitioning, onExit])

  const reviewMissedCards = () => {
    if (missedCards.length > 0) {
      setActiveCards([...missedCards])
      setCurrentIndex(0)
      setSessionStats({ needsWork: 0, mastered: 0 })
      setMissedCards([])
      setShowComplete(false)
      setStreak(0)
      setCardStartTime(Date.now())
      setCardResults([])
    }
  }

  const accuracy = activeCards.length > 0
    ? Math.round((sessionStats.mastered / activeCards.length) * 100)
    : 0

  const sessionDuration = Date.now() - sessionStartTime
  const sessionMinutes = Math.floor(sessionDuration / 60000)
  const sessionSeconds = Math.floor((sessionDuration % 60000) / 1000)
  const avgCardTime = cardTimes.length > 0
    ? Math.round(cardTimes.reduce((a, b) => a + b, 0) / cardTimes.length / 1000)
    : 0

  // Completion Screen
  if (!currentCard || showComplete) {
    return (
      <div className="fixed inset-0 z-50 bg-surface-base flex items-center justify-center p-6 animate-fade-in">
        <div className="w-full max-w-2xl">
          {/* Success Card */}
          <div className="bg-surface-elevated rounded-3xl p-8 lg:p-12 border border-border animate-scale-in">
            {/* Header */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
                <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-semibold text-text-primary mb-2">Session Complete</h2>
              <p className="text-text-secondary">{activeCards.length} cards reviewed</p>
            </div>

            {/* Accuracy Ring */}
            <div className="flex justify-center mb-10">
              <div className="relative w-40 h-40">
                <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 160 160">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-surface-overlay"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeDasharray={`${(accuracy / 100) * 440} 440`}
                    strokeLinecap="round"
                    className={accuracy >= 80 ? 'text-success' : accuracy >= 60 ? 'text-warning' : 'text-error'}
                    style={{ transition: 'stroke-dasharray 1s ease-out' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-4xl font-bold ${accuracy >= 80 ? 'text-success' : accuracy >= 60 ? 'text-warning' : 'text-error'}`}>
                    {accuracy}%
                  </span>
                  <span className="text-sm text-text-muted">Accuracy</span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              <div className="bg-surface-overlay rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold text-success">{sessionStats.mastered}</div>
                <div className="text-xs text-text-muted mt-1">Mastered</div>
              </div>
              <div className="bg-surface-overlay rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold text-warning">{sessionStats.needsWork}</div>
                <div className="text-xs text-text-muted mt-1">Needs Work</div>
              </div>
              <div className="bg-surface-overlay rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold text-accent-cool">
                  {sessionMinutes}:{sessionSeconds.toString().padStart(2, '0')}
                </div>
                <div className="text-xs text-text-muted mt-1">Duration</div>
              </div>
              <div className="bg-surface-overlay rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold text-accent-warm">{bestStreak}</div>
                <div className="text-xs text-text-muted mt-1">Best Streak</div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {missedCards.length > 0 && (
                <button
                  onClick={reviewMissedCards}
                  className="w-full py-4 bg-warning/10 hover:bg-warning/20 text-warning font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Review {missedCards.length} Missed Card{missedCards.length !== 1 ? 's' : ''}
                </button>
              )}
              <button
                onClick={onComplete || onExit}
                className="w-full py-4 bg-primary hover:bg-primary-hover text-text-inverse font-medium rounded-xl transition-colors"
              >
                {missedCards.length > 0 ? 'Finish Later' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-surface-base flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-border bg-surface-base/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onExit}
              className="p-2 -ml-2 rounded-xl hover:bg-surface-overlay text-text-muted hover:text-text-primary transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Streak */}
            {streak > 0 && (
              <div className="px-4 py-2 rounded-full bg-accent-warm/10 animate-scale-in">
                <span className="text-accent-warm font-semibold flex items-center gap-2">
                  <span>🔥</span>
                  <span>{streak}</span>
                </span>
              </div>
            )}

            <div className="text-sm font-medium text-text-secondary">
              {currentIndex + 1} / {activeCards.length}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex gap-1">
            {activeCards.map((_, index) => {
              let color = 'bg-surface-overlay'
              if (index < currentIndex) {
                color = cardResults[index] === 'mastered' ? 'bg-success' : 'bg-warning'
              } else if (index === currentIndex) {
                color = 'bg-primary animate-pulse-soft'
              }
              return (
                <div
                  key={index}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${color}`}
                />
              )
            })}
          </div>
        </div>
      </header>

      {/* Main Card Area */}
      <main className="flex-1 flex items-center justify-center p-6 lg:p-12 overflow-hidden">
        <div
          className="w-full max-w-4xl transition-all duration-300"
          style={{
            transform: exitDirection
              ? `translateX(${exitDirection === 'right' ? '120%' : '-120%'}) rotate(${exitDirection === 'right' ? '10deg' : '-10deg'})`
              : 'translateX(0) rotate(0)',
            opacity: exitDirection ? 0 : 1
          }}
        >
          <FlashCard card={currentCard} showDifficulty={true} />
        </div>
      </main>

      {/* Bottom Controls */}
      <footer className="flex-shrink-0 border-t border-border bg-surface-base/95 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            {/* Needs Work Button */}
            <button
              onClick={() => handleRating(2)}
              disabled={isTransitioning}
              className="flex-1 group relative py-4 px-6 bg-surface-elevated hover:bg-warning/10 border border-border hover:border-warning/30 rounded-2xl transition-all disabled:opacity-50"
            >
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning/10 group-hover:bg-warning/20 flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="font-medium text-text-primary">Needs Work</div>
                  <div className="text-xs text-text-muted">← or A</div>
                </div>
              </div>
            </button>

            {/* Mastered Button */}
            <button
              onClick={() => handleRating(5)}
              disabled={isTransitioning}
              className="flex-1 group relative py-4 px-6 bg-surface-elevated hover:bg-success/10 border border-border hover:border-success/30 rounded-2xl transition-all disabled:opacity-50"
            >
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/10 group-hover:bg-success/20 flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="font-medium text-text-primary">Mastered</div>
                  <div className="text-xs text-text-muted">→ or D</div>
                </div>
              </div>
            </button>
          </div>

          {/* Keyboard Hint */}
          <div className="mt-4 text-center">
            <p className="text-xs text-text-muted">
              Press <kbd className="px-1.5 py-0.5 bg-surface-overlay rounded text-text-secondary">Space</kbd> to flip the card
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default StudySession
