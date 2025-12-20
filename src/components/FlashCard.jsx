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
        className={`relative w-full aspect-[4/5] sm:aspect-[3/4] md:aspect-[4/3] lg:aspect-[16/10] xl:aspect-[16/9] transition-transform duration-500 preserve-3d cursor-pointer ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}
      >
        {/* Front Side */}
        <div
          className="absolute inset-0 backface-hidden bg-gradient-to-br from-dark-bg-secondary via-dark-bg-secondary to-dark-bg-tertiary rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 lg:p-12 xl:p-14 shadow-dark-soft-md border border-dark-border-glow ring-1 ring-white/5 flex flex-col overflow-hidden"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Difficulty Badge */}
          {showDifficulty && card.difficulty && (
            <div className="absolute top-6 md:top-8 lg:top-10 right-6 md:right-8 lg:right-10 z-10">
              <div className={`px-3 md:px-4 lg:px-5 py-1.5 md:py-2 lg:py-2.5 rounded-full ${difficultyConfig.bg} ${difficultyConfig.text} text-xs md:text-sm lg:text-base font-bold uppercase tracking-wide`}>
                {difficultyConfig.label}
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-dark-border-subtle scrollbar-track-transparent">
            <div className="flex-1 flex items-center justify-center py-4">
              <div className="text-center max-w-4xl w-full px-4">
                <div className="text-dark-text-secondary text-xs sm:text-sm md:text-base lg:text-lg font-bold uppercase tracking-wider mb-3 sm:mb-4 md:mb-6">
                  Question
                </div>
                <p className="text-dark-text-primary text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-semibold leading-relaxed whitespace-pre-wrap">
                  {card.front}
                </p>
              </div>
            </div>
          </div>

          {/* Hint Badge */}
          {card.hint && (
            <div className="mt-4 md:mt-6 lg:mt-8 px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
              <span className="text-yellow-400 text-sm md:text-base lg:text-lg">💡 Hint available</span>
            </div>
          )}

          {/* Flip Indicator */}
          <div className="mt-4 md:mt-6 lg:mt-8 flex items-center justify-center gap-2 md:gap-3 text-dark-text-muted">
            <svg className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            <span className="text-sm md:text-base lg:text-lg font-medium">Click to flip</span>
          </div>
        </div>

        {/* Back Side */}
        <div
          className="absolute inset-0 backface-hidden bg-gradient-to-br from-primary-500 via-primary-500 to-primary-600 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 lg:p-12 xl:p-14 shadow-soft-xl ring-1 ring-white/10 flex flex-col text-white overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
            <div className="flex-1 flex items-center justify-center py-4">
              <div className="text-center max-w-4xl w-full px-4">
                <div className="text-white/80 text-xs sm:text-sm md:text-base lg:text-lg font-bold uppercase tracking-wider mb-3 sm:mb-4 md:mb-6">
                  Answer
                </div>
                <p className="text-white text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-semibold leading-relaxed whitespace-pre-wrap">
                  {card.back}
                </p>
              </div>
            </div>
          </div>

          {/* Hint */}
          {card.hint && (
            <div className="mt-4 md:mt-6 lg:mt-8 px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30">
              <span className="text-white/90 text-sm md:text-base lg:text-lg">💡 {card.hint}</span>
            </div>
          )}

          {/* Flip Indicator */}
          <div className="mt-4 md:mt-6 lg:mt-8 flex items-center justify-center gap-2 md:gap-3 text-white/70">
            <svg className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            <span className="text-sm md:text-base lg:text-lg font-medium">Click to flip</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FlashCard
