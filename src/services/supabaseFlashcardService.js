/**
 * Supabase Flashcard Service
 * Handles CRUD operations and spaced repetition for flashcards using Supabase
 */

import supabase from '../lib/supabase'
import authService from './authService'

class SupabaseFlashcardService {
  // ===== DECK OPERATIONS =====

  /**
   * Get all decks for current user
   * @returns {Promise<Array<FlashcardDeck>>}
   */
  async getAllDecks() {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('decks')
        .select(`
          *,
          flashcards(id)
        `)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      if (error) throw error

      return data.map(deck => this._mapDeckFromDatabase(deck))
    } catch (error) {
      console.error('Failed to fetch decks:', error)
      return []
    }
  }

  /**
   * Get deck by ID
   * @param {string} id - Deck ID
   * @returns {Promise<FlashcardDeck|null>}
   */
  async getDeckById(id) {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('decks')
        .select(`
          *,
          flashcards(id)
        `)
        .eq('id', id)
        .eq('user_id', userId)
        .single()

      if (error) throw error

      return this._mapDeckFromDatabase(data)
    } catch (error) {
      console.error('Failed to fetch deck:', error)
      return null
    }
  }

  /**
   * Create a new deck
   * @param {Object} deckData - Deck data
   * @returns {Promise<FlashcardDeck|null>}
   */
  async createDeck(deckData) {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const dbDeck = {
        user_id: userId,
        title: deckData.title || 'Untitled Deck',
        description: deckData.description || '',
        subject: deckData.subject || 'General',
        source_image: deckData.sourceImage || null
      }

      const { data, error } = await supabase
        .from('decks')
        .insert(dbDeck)
        .select(`
          *,
          flashcards(id)
        `)
        .single()

      if (error) throw error

      return this._mapDeckFromDatabase(data)
    } catch (error) {
      console.error('Failed to create deck:', error)
      return null
    }
  }

  /**
   * Update a deck
   * @param {string} id - Deck ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<FlashcardDeck|null>}
   */
  async updateDeck(id, updates) {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const dbUpdates = {}
      if (updates.title !== undefined) dbUpdates.title = updates.title
      if (updates.description !== undefined) dbUpdates.description = updates.description
      if (updates.subject !== undefined) dbUpdates.subject = updates.subject
      if (updates.sourceImage !== undefined) dbUpdates.source_image = updates.sourceImage

      const { data, error } = await supabase
        .from('decks')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', userId)
        .select(`
          *,
          flashcards(id)
        `)
        .single()

      if (error) throw error

      return this._mapDeckFromDatabase(data)
    } catch (error) {
      console.error('Failed to update deck:', error)
      return null
    }
  }

  /**
   * Delete a deck and all its cards
   * @param {string} id - Deck ID
   * @returns {Promise<boolean>}
   */
  async deleteDeck(id) {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      // Cards will be deleted automatically due to CASCADE
      const { error } = await supabase
        .from('decks')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (error) throw error

      return true
    } catch (error) {
      console.error('Failed to delete deck:', error)
      return false
    }
  }

  // ===== FLASHCARD OPERATIONS =====

  /**
   * Get cards by deck ID
   * @param {string} deckId - Deck ID
   * @returns {Promise<Array<Flashcard>>}
   */
  async getCardsByDeck(deckId) {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('deck_id', deckId)
        .eq('user_id', userId)

      if (error) throw error

      return data.map(this._mapCardFromDatabase)
    } catch (error) {
      console.error('Failed to fetch cards:', error)
      return []
    }
  }

  /**
   * Get card by ID
   * @param {string} id - Card ID
   * @returns {Promise<Flashcard|null>}
   */
  async getCardById(id) {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single()

      if (error) throw error

      return this._mapCardFromDatabase(data)
    } catch (error) {
      console.error('Failed to fetch card:', error)
      return null
    }
  }

  /**
   * Create a new flashcard
   * @param {Object} cardData - Card data (must include deckId)
   * @returns {Promise<Flashcard|null>}
   */
  async createCard(cardData) {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      if (!cardData.deckId) {
        throw new Error('deckId is required')
      }

      const now = new Date().toISOString()

      const dbCard = {
        user_id: userId,
        deck_id: cardData.deckId,
        front: cardData.front || '',
        back: cardData.back || '',
        hint: cardData.hint || null,
        difficulty: cardData.difficulty || 'medium',
        status: 'new',
        ease_factor: 2.5,
        interval: 0,
        next_review_date: now,
        repetitions: 0,
        last_reviewed: null
      }

      const { data, error } = await supabase
        .from('flashcards')
        .insert(dbCard)
        .select()
        .single()

      if (error) throw error

      return this._mapCardFromDatabase(data)
    } catch (error) {
      console.error('Failed to create card:', error)
      return null
    }
  }

  /**
   * Update a flashcard
   * @param {string} id - Card ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Flashcard|null>}
   */
  async updateCard(id, updates) {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const dbUpdates = {}
      if (updates.front !== undefined) dbUpdates.front = updates.front
      if (updates.back !== undefined) dbUpdates.back = updates.back
      if (updates.hint !== undefined) dbUpdates.hint = updates.hint
      if (updates.difficulty !== undefined) dbUpdates.difficulty = updates.difficulty
      if (updates.status !== undefined) dbUpdates.status = updates.status
      if (updates.easeFactor !== undefined) dbUpdates.ease_factor = updates.easeFactor
      if (updates.interval !== undefined) dbUpdates.interval = updates.interval
      if (updates.nextReviewDate !== undefined) dbUpdates.next_review_date = updates.nextReviewDate
      if (updates.repetitions !== undefined) dbUpdates.repetitions = updates.repetitions
      if (updates.lastReviewed !== undefined) dbUpdates.last_reviewed = updates.lastReviewed

      const { data, error } = await supabase
        .from('flashcards')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error

      return this._mapCardFromDatabase(data)
    } catch (error) {
      console.error('Failed to update card:', error)
      return null
    }
  }

  /**
   * Delete a flashcard
   * @param {string} id - Card ID
   * @returns {Promise<boolean>}
   */
  async deleteCard(id) {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const { error } = await supabase
        .from('flashcards')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (error) throw error

      return true
    } catch (error) {
      console.error('Failed to delete card:', error)
      return false
    }
  }

  // ===== BULK OPERATIONS =====

  /**
   * Create a deck with multiple cards
   * @param {Object} deckData - Deck data
   * @param {Array<Object>} cardsData - Array of card data
   * @returns {Promise<{deck, cards}|null>}
   */
  async createDeckWithCards(deckData, cardsData) {
    try {
      const deck = await this.createDeck(deckData)
      if (!deck) {
        throw new Error('Failed to create deck')
      }

      const cards = []
      for (const cardData of cardsData) {
        const card = await this.createCard({ ...cardData, deckId: deck.id })
        if (card) {
          cards.push(card)
        }
      }

      return { deck, cards }
    } catch (error) {
      console.error('Failed to create deck with cards:', error)
      return null
    }
  }

  // ===== SPACED REPETITION (SM-2 ALGORITHM) =====

  /**
   * Get cards due for review
   * @param {string|null} deckId - Optional deck ID to filter
   * @returns {Promise<Array<Flashcard>>}
   */
  async getDueCards(deckId = null) {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      let query = supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', userId)
        .lte('next_review_date', new Date().toISOString())

      if (deckId) {
        query = query.eq('deck_id', deckId)
      }

      const { data, error } = await query

      if (error) throw error

      // Sort by status priority
      const statusOrder = { new: 0, learning: 1, reviewing: 2, mastered: 3 }
      return data
        .map(this._mapCardFromDatabase)
        .sort((a, b) => statusOrder[a.status] - statusOrder[b.status])
    } catch (error) {
      console.error('Failed to fetch due cards:', error)
      return []
    }
  }

  /**
   * Record a review of a flashcard (SM-2 algorithm)
   * @param {string} cardId - Card ID
   * @param {number} rating - Quality rating 0-5
   * @returns {Promise<Flashcard|null>}
   */
  async recordReview(cardId, rating) {
    try {
      const card = await this.getCardById(cardId)
      if (!card) {
        return null
      }

      const now = new Date()
      const updates = this._calculateNextReview(card, rating)

      return await this.updateCard(cardId, {
        ...updates,
        lastReviewed: now.toISOString(),
        repetitions: card.repetitions + 1
      })
    } catch (error) {
      console.error('Failed to record review:', error)
      return null
    }
  }

  /**
   * SM-2 Algorithm implementation
   * @private
   */
  _calculateNextReview(card, rating) {
    if (rating < 3) {
      return {
        easeFactor: card.easeFactor,
        interval: 1,
        nextReviewDate: this._addDays(new Date(), 1).toISOString(),
        status: 'learning'
      }
    }

    let { easeFactor, interval, repetitions } = card

    easeFactor = Math.max(
      1.3,
      easeFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02))
    )

    if (repetitions === 0) {
      interval = 1
    } else if (repetitions === 1) {
      interval = 6
    } else {
      interval = Math.round(interval * easeFactor)
    }

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

  // ===== STATISTICS =====

  /**
   * Get deck statistics
   * @param {string} deckId - Deck ID
   * @returns {Promise<Object>}
   */
  async getDeckStats(deckId) {
    try {
      const cards = await this.getCardsByDeck(deckId)
      const dueCards = await this.getDueCards(deckId)

      return {
        totalCards: cards.length,
        new: cards.filter(c => c.status === 'new').length,
        learning: cards.filter(c => c.status === 'learning').length,
        reviewing: cards.filter(c => c.status === 'reviewing').length,
        mastered: cards.filter(c => c.status === 'mastered').length,
        dueToday: dueCards.length
      }
    } catch (error) {
      console.error('Failed to get deck stats:', error)
      return {
        totalCards: 0,
        new: 0,
        learning: 0,
        reviewing: 0,
        mastered: 0,
        dueToday: 0
      }
    }
  }

  /**
   * Get overall statistics
   * @returns {Promise<Object>}
   */
  async getOverallStats() {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const { data: cards, error: cardsError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', userId)

      if (cardsError) throw cardsError

      const { data: decks, error: decksError } = await supabase
        .from('decks')
        .select('id')
        .eq('user_id', userId)

      if (decksError) throw decksError

      const dueCards = await this.getDueCards()

      return {
        totalDecks: decks.length,
        totalCards: cards.length,
        dueToday: dueCards.length,
        new: cards.filter(c => c.status === 'new').length,
        learning: cards.filter(c => c.status === 'learning').length,
        reviewing: cards.filter(c => c.status === 'reviewing').length,
        mastered: cards.filter(c => c.status === 'mastered').length
      }
    } catch (error) {
      console.error('Failed to get overall stats:', error)
      return {
        totalDecks: 0,
        totalCards: 0,
        dueToday: 0,
        new: 0,
        learning: 0,
        reviewing: 0,
        mastered: 0
      }
    }
  }

  // ===== HELPER METHODS =====

  /**
   * Add days to a date
   * @private
   */
  _addDays(date, days) {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  }

  /**
   * Map database deck to app format
   * @private
   */
  _mapDeckFromDatabase(dbDeck) {
    return {
      id: dbDeck.id,
      title: dbDeck.title,
      description: dbDeck.description,
      subject: dbDeck.subject,
      sourceImage: dbDeck.source_image,
      cardIds: dbDeck.flashcards ? dbDeck.flashcards.map(c => c.id) : [],
      createdAt: dbDeck.created_at,
      updatedAt: dbDeck.updated_at
    }
  }

  /**
   * Map database card to app format
   * @private
   */
  _mapCardFromDatabase(dbCard) {
    return {
      id: dbCard.id,
      front: dbCard.front,
      back: dbCard.back,
      hint: dbCard.hint,
      difficulty: dbCard.difficulty,
      deckId: dbCard.deck_id,
      status: dbCard.status,
      easeFactor: parseFloat(dbCard.ease_factor),
      interval: dbCard.interval,
      nextReviewDate: dbCard.next_review_date,
      repetitions: dbCard.repetitions,
      lastReviewed: dbCard.last_reviewed,
      createdAt: dbCard.created_at
    }
  }
}

// Export singleton instance
export default new SupabaseFlashcardService()
