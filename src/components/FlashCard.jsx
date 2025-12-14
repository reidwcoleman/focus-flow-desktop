/**
 * FlashCard Component
 * 3D flip animation flashcard with front/back sides
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

  // Difficulty badge styling
  const getDifficultyConfig = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return { bg: 'bg-green-100', text: 'text-green-700', label: 'Easy' }
      case 'medium':
        return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Medium' }
      case 'hard':
        return { bg: 'bg-red-100', text: 'text-red-700', label: 'Hard' }
      default:
        return { bg: 'bg-neutral-100', text: 'text-neutral-700', label: 'Medium' }
    }
  }

  const difficultyConfig = getDifficultyConfig(card.difficulty)

  return (
    <div className={`perspective-1000 ${className}`}>
      <div
        onClick={handleFlip}
        className={`relative w-full aspect-[4/5] sm:aspect-[3/4] md:aspect-[5/6] lg:aspect-square transition-transform duration-500 preserve-3d cursor-pointer ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}
      >
        {/* Front Side */}
        <div
          className="absolute inset-0 backface-hidden bg-gradient-to-br from-dark-bg-secondary via-dark-bg-secondary to-dark-bg-tertiary rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-10 lg:p-12 shadow-dark-soft-md border border-dark-border-glow ring-1 ring-white/5 flex flex-col"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Difficulty Badge */}
          {showDifficulty && card.difficulty && (
            <div className="absolute top-4 md:top-6 right-4 md:right-6">
              <div className={`px-2.5 md:px-3 py-1 md:py-1.5 rounded-full ${difficultyConfig.bg} ${difficultyConfig.text} text-[10px] md:text-xs font-bold uppercase tracking-wide`}>
                {difficultyConfig.label}
              </div>
            </div>
          )}

          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-2xl">
              <div className="text-dark-text-secondary text-[10px] sm:text-xs md:text-sm font-bold uppercase tracking-wider mb-2 sm:mb-3 md:mb-4">
                Question
              </div>
              <p className="text-dark-text-primary text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold leading-relaxed">
                {card.front}
              </p>
            </div>
          </div>

          {/* Hint Badge */}
          {card.hint && (
            <div className="mt-4 px-3 md:px-4 py-2 md:py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
              <span className="text-yellow-400 text-xs md:text-sm">💡 Hint available</span>
            </div>
          )}

          {/* Flip Indicator */}
          <div className="mt-4 flex items-center justify-center gap-2 text-dark-text-muted">
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            <span className="text-xs md:text-sm font-medium">Tap to flip</span>
          </div>
        </div>

        {/* Back Side */}
        <div
          className="absolute inset-0 backface-hidden bg-gradient-to-br from-primary-500 via-primary-500 to-primary-600 rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-10 lg:p-12 shadow-soft-xl ring-1 ring-white/10 flex flex-col text-white"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-2xl">
              <div className="text-white/80 text-[10px] sm:text-xs md:text-sm font-bold uppercase tracking-wider mb-2 sm:mb-3 md:mb-4">
                Answer
              </div>
              <p className="text-white text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold leading-relaxed">
                {card.back}
              </p>
            </div>
          </div>

          {/* Hint */}
          {card.hint && (
            <div className="mt-4 px-3 md:px-4 py-2 md:py-3 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30">
              <span className="text-white/90 text-xs md:text-sm">💡 {card.hint}</span>
            </div>
          )}

          {/* Flip Indicator */}
          <div className="mt-4 flex items-center justify-center gap-2 text-white/70">
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            <span className="text-xs md:text-sm font-medium">Tap to flip</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FlashCard
