/**
 * FlashCard Component
 * Elegant 3D flip animation flashcard with polished desktop UI
 */

import { useState, useEffect } from 'react'

const FlashCard = ({ card, className = '', showDifficulty = false }) => {
  const [isFlipped, setIsFlipped] = useState(false)

  // Reset flip state when card changes
  useEffect(() => {
    setIsFlipped(false)
  }, [card.id])

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        setIsFlipped(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const getDifficultyConfig = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return { bg: 'bg-success/15', text: 'text-success', label: 'Easy' }
      case 'medium':
        return { bg: 'bg-warning/15', text: 'text-warning', label: 'Medium' }
      case 'hard':
        return { bg: 'bg-error/15', text: 'text-error', label: 'Hard' }
      default:
        return { bg: 'bg-accent-cool/15', text: 'text-accent-cool', label: 'Standard' }
    }
  }

  const difficultyConfig = getDifficultyConfig(card.difficulty)

  return (
    <div
      className={`group ${className}`}
      style={{ perspective: '2000px' }}
    >
      <div
        onClick={handleFlip}
        tabIndex={0}
        role="button"
        aria-label={isFlipped ? 'Show question' : 'Show answer'}
        className="relative w-full aspect-[16/10] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-3xl"
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {/* Front Side - Question */}
        <div
          className="absolute inset-0 rounded-3xl overflow-hidden"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="absolute inset-0 bg-surface-elevated border border-border" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent-cool/5" />

          <div className="relative h-full flex flex-col p-8 lg:p-12">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-semibold uppercase tracking-widest text-text-muted">
                Question
              </span>
              {showDifficulty && card.difficulty && (
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${difficultyConfig.bg} ${difficultyConfig.text}`}>
                  {difficultyConfig.label}
                </span>
              )}
            </div>

            {/* Question Content */}
            <div className="flex-1 flex items-center justify-center overflow-y-auto">
              <p className="text-2xl lg:text-3xl xl:text-4xl font-medium text-text-primary text-center leading-relaxed max-w-3xl">
                {card.front}
              </p>
            </div>

            {/* Hint Badge */}
            {card.hint && (
              <div className="mt-6 px-4 py-3 rounded-xl bg-warning/10 border border-warning/20">
                <div className="flex items-center gap-2 text-warning text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span>Hint available</span>
                </div>
              </div>
            )}

            {/* Flip Indicator */}
            <div className="mt-6 flex items-center justify-center gap-3 text-text-muted">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-overlay/50 group-hover:bg-surface-overlay transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-sm font-medium">Click or press Space</span>
              </div>
            </div>
          </div>
        </div>

        {/* Back Side - Answer */}
        <div
          className="absolute inset-0 rounded-3xl overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary-hover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/5" />

          <div className="relative h-full flex flex-col p-8 lg:p-12">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-semibold uppercase tracking-widest text-white/70">
                Answer
              </span>
              {showDifficulty && card.difficulty && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white">
                  {difficultyConfig.label}
                </span>
              )}
            </div>

            {/* Answer Content */}
            <div className="flex-1 flex items-center justify-center overflow-y-auto">
              <p className="text-2xl lg:text-3xl xl:text-4xl font-medium text-white text-center leading-relaxed max-w-3xl">
                {card.back}
              </p>
            </div>

            {/* Hint Display */}
            {card.hint && (
              <div className="mt-6 px-4 py-3 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20">
                <div className="flex items-center gap-2 text-white/90 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span>{card.hint}</span>
                </div>
              </div>
            )}

            {/* Flip Indicator */}
            <div className="mt-6 flex items-center justify-center gap-3 text-white/60">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 group-hover:bg-white/15 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-sm font-medium">Click or press Space</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FlashCard
