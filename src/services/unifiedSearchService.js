/**
 * Unified Search Service
 * Search across notes, flashcards, decks, and quizzes
 * Uses PostgreSQL full-text search when available, falls back to ILIKE
 */

import supabase from '../lib/supabase'
import authService from './authService'
import supabaseNotesService from './supabaseNotesService'
import supabaseQuizService from './supabaseQuizService'

class UnifiedSearchService {
  /**
   * Search across all study materials
   */
  async search(query, options = {}) {
    const {
      types = ['notes', 'flashcards', 'decks', 'quizzes'],
      limit = 50
    } = options

    if (!query || query.trim().length === 0) {
      return { notes: [], flashcards: [], decks: [], quizzes: [], total: 0 }
    }

    const searchPromises = []

    if (types.includes('notes')) {
      searchPromises.push(this.searchNotes(query, { limit }))
    } else {
      searchPromises.push(Promise.resolve([]))
    }

    if (types.includes('flashcards')) {
      searchPromises.push(this.searchFlashcards(query, { limit }))
    } else {
      searchPromises.push(Promise.resolve([]))
    }

    if (types.includes('decks')) {
      searchPromises.push(this.searchDecks(query, { limit }))
    } else {
      searchPromises.push(Promise.resolve([]))
    }

    if (types.includes('quizzes')) {
      searchPromises.push(this.searchQuizzes(query, { limit }))
    } else {
      searchPromises.push(Promise.resolve([]))
    }

    const [notes, flashcards, decks, quizzes] = await Promise.all(searchPromises)

    return {
      notes,
      flashcards,
      decks,
      quizzes,
      total: notes.length + flashcards.length + decks.length + quizzes.length
    }
  }

  /**
   * Search notes using full-text search
   */
  async searchNotes(query, options = {}) {
    try {
      const { user } = await authService.getCurrentUser()
      if (!user) return []

      const lowerQuery = query.toLowerCase()

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .or(`title.ilike.%${lowerQuery}%,content.ilike.%${lowerQuery}%,subject.ilike.%${lowerQuery}%`)
        .limit(options.limit || 50)
        .order('updated_at', { ascending: false })

      if (error) throw error

      return (data || []).map(note => ({
        ...note,
        resultType: 'note',
        matchText: this._highlightMatch(note.content || '', query, 200)
      }))
    } catch (error) {
      console.error('Error searching notes:', error)
      return []
    }
  }

  /**
   * Search flashcards
   */
  async searchFlashcards(query, options = {}) {
    try {
      const { user } = await authService.getCurrentUser()
      if (!user) return []

      const lowerQuery = query.toLowerCase()

      const { data, error } = await supabase
        .from('flashcards')
        .select('*, decks(title, subject)')
        .eq('user_id', user.id)
        .or(`front.ilike.%${lowerQuery}%,back.ilike.%${lowerQuery}%,hint.ilike.%${lowerQuery}%`)
        .limit(options.limit || 50)
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data || []).map(card => ({
        ...card,
        resultType: 'flashcard',
        deckTitle: card.decks?.title,
        deckSubject: card.decks?.subject,
        matchText: this._highlightMatch(
          card.front + ' ' + card.back,
          query,
          100
        )
      }))
    } catch (error) {
      console.error('Error searching flashcards:', error)
      return []
    }
  }

  /**
   * Search decks
   */
  async searchDecks(query, options = {}) {
    try {
      const { user } = await authService.getCurrentUser()
      if (!user) return []

      const lowerQuery = query.toLowerCase()

      const { data, error } = await supabase
        .from('decks')
        .select('*, flashcards(count)')
        .eq('user_id', user.id)
        .or(`title.ilike.%${lowerQuery}%,description.ilike.%${lowerQuery}%,subject.ilike.%${lowerQuery}%`)
        .limit(options.limit || 50)
        .order('updated_at', { ascending: false })

      if (error) throw error

      return (data || []).map(deck => ({
        ...deck,
        resultType: 'deck',
        cardCount: deck.flashcards?.[0]?.count || 0,
        matchText: this._highlightMatch(deck.description || '', query, 150)
      }))
    } catch (error) {
      console.error('Error searching decks:', error)
      return []
    }
  }

  /**
   * Search quizzes
   */
  async searchQuizzes(query, options = {}) {
    try {
      return await supabaseQuizService.searchQuizzes(query)
    } catch (error) {
      console.error('Error searching quizzes:', error)
      return []
    }
  }

  /**
   * Highlight matched text and return preview
   */
  _highlightMatch(text, query, maxLength = 200) {
    if (!text || !query) return ''

    const lowerText = text.toLowerCase()
    const lowerQuery = query.toLowerCase()
    const index = lowerText.indexOf(lowerQuery)

    if (index === -1) {
      return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '')
    }

    // Get context around match
    const start = Math.max(0, index - 50)
    const end = Math.min(text.length, index + query.length + maxLength - 50)

    let preview = text.substring(start, end)
    if (start > 0) preview = '...' + preview
    if (end < text.length) preview = preview + '...'

    return preview
  }

  /**
   * Get search suggestions based on recent searches
   */
  async getSuggestions(partialQuery, limit = 5) {
    try {
      const { user } = await authService.getCurrentUser()
      if (!user) return []

      const lowerQuery = partialQuery.toLowerCase()

      // Get unique subjects and titles that match
      const [noteTitles, quizTitles, subjects] = await Promise.all([
        supabase
          .from('notes')
          .select('title')
          .eq('user_id', user.id)
          .ilike('title', `%${lowerQuery}%`)
          .limit(limit),
        supabase
          .from('quizzes')
          .select('title')
          .eq('user_id', user.id)
          .ilike('title', `%${lowerQuery}%`)
          .limit(limit),
        supabase
          .from('notes')
          .select('subject')
          .eq('user_id', user.id)
          .ilike('subject', `%${lowerQuery}%`)
          .limit(limit)
      ])

      const suggestions = new Set()

      noteTitles.data?.forEach(n => suggestions.add(n.title))
      quizTitles.data?.forEach(q => suggestions.add(q.title))
      subjects.data?.forEach(s => suggestions.add(s.subject))

      return Array.from(suggestions).slice(0, limit)
    } catch (error) {
      console.error('Error getting suggestions:', error)
      return []
    }
  }
}

export default new UnifiedSearchService()
