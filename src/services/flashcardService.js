/**
 * Flashcard Service for Focus Flow
 * Handles CRUD operations and spaced repetition (SM-2 algorithm) for flashcards and decks
 */

const DECKS_STORAGE_KEY = 'focus_flow_decks'
const CARDS_STORAGE_KEY = 'focus_flow_flashcards'

class FlashcardService {
  constructor() {
    this.decks = this._loadDecksFromStorage()
    this.flashcards = this._loadCardsFromStorage()
  }

  // ===== DECK OPERATIONS =====

  /**
   * Get all decks
   * @returns {Array<FlashcardDeck>}
   */
  getAllDecks() {
    return [...this.decks].sort((a, b) =>
      new Date(b.updatedAt) - new Date(a.updatedAt)
    )
  }

  /**
   * Get deck by ID
   * @param {string} id - Deck ID
   * @returns {FlashcardDeck|null}
   */
  getDeckById(id) {
    return this.decks.find(deck => deck.id === id) || null
  }

  /**
   * Create a new deck
   * @param {Object} deckData - Deck data
   * @returns {FlashcardDeck} Created deck
   */
  createDeck(deckData) {
    const now = new Date().toISOString()
    const newDeck = {
      id: this._generateId('deck'),
      title: deckData.title || 'Untitled Deck',
      description: deckData.description || '',
      subject: deckData.subject || 'General',
      sourceImage: deckData.sourceImage || null,
      cardIds: [],
      createdAt: now,
      updatedAt: now
    }

    this.decks.push(newDeck)
    this._saveDecksToStorage()

    return newDeck
  }

  /**
   * Update a deck
   * @param {string} id - Deck ID
   * @param {Object} updates - Fields to update
   * @returns {FlashcardDeck|null}
   */
  updateDeck(id, updates) {
    const index = this.decks.findIndex(deck => deck.id === id)

    if (index === -1) {
      return null
    }

    this.decks[index] = {
      ...this.decks[index],
      ...updates,
      id, // Prevent ID change
      updatedAt: new Date().toISOString()
    }

    this._saveDecksToStorage()
    return this.decks[index]
  }

  /**
   * Delete a deck and all its cards
   * @param {string} id - Deck ID
   * @returns {boolean}
   */
  deleteDeck(id) {
    const deck = this.getDeckById(id)
    if (!deck) {
      return false
    }

    // Delete all cards in the deck
    deck.cardIds.forEach(cardId => {
      this._deleteCardInternal(cardId)
    })

    // Delete the deck
    this.decks = this.decks.filter(d => d.id !== id)
    this._saveDecksToStorage()

    return true
  }

  // ===== FLASHCARD OPERATIONS =====

  /**
   * Get cards by deck ID
   * @param {string} deckId - Deck ID
   * @returns {Array<Flashcard>}
   */
  getCardsByDeck(deckId) {
    const deck = this.getDeckById(deckId)
    if (!deck) {
      return []
    }

    return deck.cardIds
      .map(cardId => this.flashcards.find(card => card.id === cardId))
      .filter(card => card !== undefined)
  }

  /**
   * Get card by ID
   * @param {string} id - Card ID
   * @returns {Flashcard|null}
   */
  getCardById(id) {
    return this.flashcards.find(card => card.id === id) || null
  }

  /**
   * Create a new flashcard
   * @param {Object} cardData - Card data (must include deckId)
   * @returns {Flashcard|null}
   */
  createCard(cardData) {
    if (!cardData.deckId) {
      console.error('deckId is required to create a flashcard')
      return null
    }

    const deck = this.getDeckById(cardData.deckId)
    if (!deck) {
      console.error(`Deck ${cardData.deckId} not found`)
      return null
    }

    const now = new Date().toISOString()
    const newCard = {
      id: this._generateId('card'),
      front: cardData.front || '',
      back: cardData.back || '',
      hint: cardData.hint || null,
      difficulty: cardData.difficulty || 'medium',
      deckId: cardData.deckId,
      // Spaced repetition fields (SM-2 algorithm)
      status: 'new', // new | learning | reviewing | mastered
      easeFactor: 2.5, // Initial ease factor
      interval: 0, // Days until next review
      nextReviewDate: now,
      repetitions: 0,
      lastReviewed: null,
      createdAt: now
    }

    this.flashcards.push(newCard)
    deck.cardIds.push(newCard.id)

    this._saveCardsToStorage()
    this._saveDecksToStorage()

    return newCard
  }

  /**
   * Update a flashcard
   * @param {string} id - Card ID
   * @param {Object} updates - Fields to update
   * @returns {Flashcard|null}
   */
  updateCard(id, updates) {
    const index = this.flashcards.findIndex(card => card.id === id)

    if (index === -1) {
      return null
    }

    this.flashcards[index] = {
      ...this.flashcards[index],
      ...updates,
      id // Prevent ID change
    }

    this._saveCardsToStorage()
    return this.flashcards[index]
  }

  /**
   * Delete a flashcard
   * @param {string} id - Card ID
   * @returns {boolean}
   */
  deleteCard(id) {
    const card = this.getCardById(id)
    if (!card) {
      return false
    }

    // Remove from deck's cardIds
    const deck = this.getDeckById(card.deckId)
    if (deck) {
      deck.cardIds = deck.cardIds.filter(cid => cid !== id)
      this._saveDecksToStorage()
    }

    // Delete card
    return this._deleteCardInternal(id)
  }

  // ===== BULK OPERATIONS =====

  /**
   * Create a deck with multiple cards
   * @param {Object} deckData - Deck data
   * @param {Array<Object>} cardsData - Array of card data
   * @returns {{deck: FlashcardDeck, cards: Array<Flashcard>}}
   */
  createDeckWithCards(deckData, cardsData) {
    const deck = this.createDeck(deckData)

    const cards = cardsData.map(cardData =>
      this.createCard({ ...cardData, deckId: deck.id })
    ).filter(card => card !== null)

    return { deck, cards }
  }

  /**
   * Add multiple cards to existing deck
   * @param {string} deckId - Deck ID
   * @param {Array<Object>} cardsData - Array of card data
   * @returns {Array<Flashcard>}
   */
  addCardsToDeck(deckId, cardsData) {
    return cardsData.map(cardData =>
      this.createCard({ ...cardData, deckId })
    ).filter(card => card !== null)
  }

  // ===== SPACED REPETITION (SM-2 ALGORITHM) =====

  /**
   * Get cards due for review
   * @param {string|null} deckId - Optional deck ID to filter
   * @returns {Array<Flashcard>}
   */
  getDueCards(deckId = null) {
    const now = new Date()

    let cards = this.flashcards.filter(card =>
      new Date(card.nextReviewDate) <= now
    )

    if (deckId) {
      cards = cards.filter(card => card.deckId === deckId)
    }

    // Sort by status priority: new, learning, reviewing, mastered
    const statusOrder = { new: 0, learning: 1, reviewing: 2, mastered: 3 }
    return cards.sort((a, b) => statusOrder[a.status] - statusOrder[b.status])
  }

  /**
   * Get count of due cards for a deck
   * @param {string} deckId - Deck ID
   * @returns {number}
   */
  getDueCardCount(deckId) {
    return this.getDueCards(deckId).length
  }

  /**
   * Record a review of a flashcard (SM-2 algorithm)
   * @param {string} cardId - Card ID
   * @param {number} rating - Quality rating 0-5 (0=wrong, 3+=correct)
   * @returns {Flashcard|null}
   */
  recordReview(cardId, rating) {
    const card = this.getCardById(cardId)
    if (!card) {
      return null
    }

    const now = new Date()
    const updates = this._calculateNextReview(card, rating)

    return this.updateCard(cardId, {
      ...updates,
      lastReviewed: now.toISOString(),
      repetitions: card.repetitions + 1
    })
  }

  /**
   * SM-2 Algorithm implementation
   * @private
   */
  _calculateNextReview(card, rating) {
    // Rating: 0 (wrong) to 5 (perfect)
    // 0-2: Failed, reset
    // 3: Correct with difficulty
    // 4: Correct
    // 5: Perfect

    if (rating < 3) {
      // Failed - reset to learning
      return {
        easeFactor: card.easeFactor, // Keep ease factor
        interval: 1, // Review tomorrow
        nextReviewDate: this._addDays(new Date(), 1).toISOString(),
        status: 'learning'
      }
    }

    let { easeFactor, interval, repetitions } = card

    // Update ease factor based on performance
    easeFactor = Math.max(
      1.3,
      easeFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02))
    )

    // Calculate interval
    if (repetitions === 0) {
      interval = 1 // First review: 1 day
    } else if (repetitions === 1) {
      interval = 6 // Second review: 6 days
    } else {
      interval = Math.round(interval * easeFactor)
    }

    // Determine status based on interval
    let status = 'learning'
    if (interval >= 21) {
      status = 'mastered'
    } else if (interval >= 6) {
      status = 'reviewing'
    }

    return {
      easeFactor,
      interval,
      nextReviewDate: this._addDays(new Date(), interval).toISOString(),
      status
    }
  }

  // ===== STUDY SESSION =====

  /**
   * Get a study session for a deck
   * @param {string} deckId - Deck ID
   * @param {number} count - Number of cards to study
   * @returns {Array<Flashcard>}
   */
  getStudySession(deckId, count = 20) {
    const dueCards = this.getDueCards(deckId)
    return dueCards.slice(0, count)
  }

  // ===== STATISTICS =====

  /**
   * Get deck statistics
   * @param {string} deckId - Deck ID
   * @returns {Object}
   */
  getDeckStats(deckId) {
    const cards = this.getCardsByDeck(deckId)

    return {
      totalCards: cards.length,
      new: cards.filter(c => c.status === 'new').length,
      learning: cards.filter(c => c.status === 'learning').length,
      reviewing: cards.filter(c => c.status === 'reviewing').length,
      mastered: cards.filter(c => c.status === 'mastered').length,
      dueToday: this.getDueCardCount(deckId)
    }
  }

  /**
   * Get overall statistics
   * @returns {Object}
   */
  getOverallStats() {
    return {
      totalDecks: this.decks.length,
      totalCards: this.flashcards.length,
      dueToday: this.getDueCards().length,
      new: this.flashcards.filter(c => c.status === 'new').length,
      learning: this.flashcards.filter(c => c.status === 'learning').length,
      reviewing: this.flashcards.filter(c => c.status === 'reviewing').length,
      mastered: this.flashcards.filter(c => c.status === 'mastered').length
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Generate unique ID
   */
  _generateId(prefix = 'card') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Add days to a date
   */
  _addDays(date, days) {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  }

  /**
   * Internal card deletion (doesn't update deck)
   */
  _deleteCardInternal(id) {
    const initialLength = this.flashcards.length
    this.flashcards = this.flashcards.filter(card => card.id !== id)

    if (this.flashcards.length < initialLength) {
      this._saveCardsToStorage()
      return true
    }

    return false
  }

  /**
   * Load decks from localStorage
   */
  _loadDecksFromStorage() {
    try {
      const stored = localStorage.getItem(DECKS_STORAGE_KEY)
      if (!stored) {
        return []
      }

      const parsed = JSON.parse(stored)
      return Array.isArray(parsed) ? parsed : []
    } catch (error) {
      console.error('Failed to load decks from localStorage:', error)
      return []
    }
  }

  /**
   * Load flashcards from localStorage
   */
  _loadCardsFromStorage() {
    try {
      const stored = localStorage.getItem(CARDS_STORAGE_KEY)
      if (!stored) {
        return []
      }

      const parsed = JSON.parse(stored)
      return Array.isArray(parsed) ? parsed : []
    } catch (error) {
      console.error('Failed to load flashcards from localStorage:', error)
      return []
    }
  }

  /**
   * Save decks to localStorage
   */
  _saveDecksToStorage() {
    try {
      localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(this.decks))
    } catch (error) {
      console.error('Failed to save decks to localStorage:', error)
    }
  }

  /**
   * Save flashcards to localStorage
   */
  _saveCardsToStorage() {
    try {
      localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(this.flashcards))
    } catch (error) {
      console.error('Failed to save flashcards to localStorage:', error)
    }
  }
}

// Export singleton instance
export default new FlashcardService()
