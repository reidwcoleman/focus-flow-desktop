/**
 * DeckPreview Component
 * Browse and preview all cards in a deck before studying
 */

import { useState, useEffect } from 'react'
import { useStudy } from '../contexts/StudyContext'
import FlashCard from './FlashCard'

const DeckPreview = ({ deck, onClose, onStartStudy, onEditDeck, onDeleteDeck }) => {
  const { getCardsByDeck, getDueCards } = useStudy()
  const [cards, setCards] = useState([])
  const [dueCards, setDueCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCard, setSelectedCard] = useState(null)

  useEffect(() => {
    loadDeckData()
  }, [deck.id])

  const loadDeckData = async () => {
    setLoading(true)
    try {
      const [allCards, due] = await Promise.all([
        getCardsByDeck(deck.id),
        getDueCards(deck.id)
      ])
      setCards(allCards)
      setDueCards(due)
    } catch (error) {
      console.error('Failed to load deck data:', error)
    } finally {
      setLoading(false)
    }
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

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-400">Loading deck...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-dark-bg flex flex-col">
      {/* Header */}
      <div className="bg-dark-bg-secondary border-b border-neutral-700/50 safe-area-inset-top">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full hover:bg-neutral-700/50 flex items-center justify-center transition-all active:scale-95"
            >
              <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Edit/Delete Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={onEditDeck}
                className="px-3 py-1.5 rounded-lg bg-neutral-700/50 hover:bg-neutral-700 text-neutral-300 text-sm font-medium transition-all active:scale-95 flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
              <button
                onClick={onDeleteDeck}
                className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-all active:scale-95 flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </div>

          {/* Deck Title & Stats */}
          <h1 className="text-2xl font-bold text-white mb-2">{deck.title}</h1>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-primary-500"></div>
              <span className="text-neutral-400">{cards.length} cards</span>
            </div>
            {dueCards.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <span className="text-neutral-400">{dueCards.length} due</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          {cards.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-700/50 flex items-center justify-center">
                <svg className="w-8 h-8 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-neutral-300 mb-2">No cards yet</h3>
              <p className="text-neutral-500 text-sm">Add cards to start studying this deck</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {cards.map((card) => {
                const difficultyConfig = getDifficultyConfig(card.difficulty)
                return (
                  <button
                    key={card.id}
                    onClick={() => setSelectedCard(card)}
                    className="bg-dark-bg-secondary rounded-xl p-4 border border-neutral-700/50 hover:border-primary-500/50 transition-all active:scale-95 text-left group"
                  >
                    {/* Card Front Preview */}
                    <p className="text-neutral-300 text-sm line-clamp-4 mb-3 group-hover:text-white transition-colors">
                      {card.front}
                    </p>

                    {/* Bottom Row: Difficulty Badge */}
                    <div className="flex items-center justify-between">
                      {card.difficulty && (
                        <div className={`px-2 py-0.5 rounded-full ${difficultyConfig.bg} ${difficultyConfig.text} text-[10px] font-bold uppercase tracking-wide`}>
                          {difficultyConfig.label}
                        </div>
                      )}
                      <svg className="w-4 h-4 text-neutral-500 group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="bg-dark-bg-secondary border-t border-neutral-700/50 safe-area-inset-bottom">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <button
            onClick={onStartStudy}
            disabled={cards.length === 0}
            className="w-full py-4 px-6 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl shadow-glow-lg hover:shadow-glow transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cards.length === 0 ? 'Add cards to start studying' : `Start Studying ${cards.length} Cards`}
          </button>
        </div>
      </div>

      {/* Full Card Modal */}
      {selectedCard && (
        <div
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedCard(null)}
        >
          <div
            className="max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <FlashCard card={selectedCard} showDifficulty={true} />

            {/* Close button */}
            <button
              onClick={() => setSelectedCard(null)}
              className="mt-4 w-full py-3 bg-neutral-700/50 hover:bg-neutral-700 text-white rounded-xl transition-all active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DeckPreview
