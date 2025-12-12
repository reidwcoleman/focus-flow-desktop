/**
 * Study Context for Focus Flow
 * Global state management for notes and flashcards with Supabase
 */

import { createContext, useContext, useState, useEffect } from 'react'
import supabaseNotesService from '../services/supabaseNotesService'
import supabaseFlashcardService from '../services/supabaseFlashcardService'
import authService from '../services/authService'

const StudyContext = createContext(null)

export function StudyProvider({ children }) {
  // Notes state
  const [notes, setNotes] = useState([])
  const [notesLoading, setNotesLoading] = useState(true)

  // Flashcards state
  const [decks, setDecks] = useState([])
  const [flashcards, setFlashcards] = useState([])
  const [flashcardsLoading, setFlashcardsLoading] = useState(true)

  // Load data on mount and auth state changes
  useEffect(() => {
    loadNotes()
    loadFlashcards()

    // Subscribe to auth state changes
    const subscription = authService.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        // Reload data when user signs in
        loadNotes()
        loadFlashcards()
      } else if (event === 'SIGNED_OUT') {
        // Clear data when user signs out
        setNotes([])
        setDecks([])
        setFlashcards([])
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // ===== NOTES ACTIONS =====

  const loadNotes = async () => {
    setNotesLoading(true)
    try {
      const loadedNotes = await supabaseNotesService.getAllNotes()
      setNotes(loadedNotes)
    } catch (error) {
      console.error('Failed to load notes:', error)
    } finally {
      setNotesLoading(false)
    }
  }

  const addNote = async (noteData) => {
    try {
      const newNote = await supabaseNotesService.createNote(noteData)
      if (newNote) {
        setNotes(prev => [newNote, ...prev])
      }
      return newNote
    } catch (error) {
      console.error('Failed to add note:', error)
      return null
    }
  }

  const updateNote = async (id, updates) => {
    try {
      const updatedNote = await supabaseNotesService.updateNote(id, updates)
      if (updatedNote) {
        setNotes(prev => prev.map(note =>
          note.id === id ? updatedNote : note
        ))
      }
      return updatedNote
    } catch (error) {
      console.error('Failed to update note:', error)
      return null
    }
  }

  const deleteNote = async (id) => {
    try {
      const success = await supabaseNotesService.deleteNote(id)
      if (success) {
        setNotes(prev => prev.filter(note => note.id !== id))
      }
      return success
    } catch (error) {
      console.error('Failed to delete note:', error)
      return false
    }
  }

  const searchNotes = async (query) => {
    return await supabaseNotesService.searchNotes(query)
  }

  const getNotesBySubject = async (subject) => {
    return await supabaseNotesService.getNotesBySubject(subject)
  }

  const toggleNoteFavorite = async (id) => {
    try {
      const updatedNote = await supabaseNotesService.toggleFavorite(id)
      if (updatedNote) {
        setNotes(prev => prev.map(note =>
          note.id === id ? updatedNote : note
        ))
      }
      return updatedNote
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
      return null
    }
  }

  // ===== FLASHCARD ACTIONS =====

  const loadFlashcards = async () => {
    setFlashcardsLoading(true)
    try {
      const loadedDecks = await supabaseFlashcardService.getAllDecks()
      setDecks(loadedDecks)

      // Load all cards for all decks
      const allCards = []
      for (const deck of loadedDecks) {
        const deckCards = await supabaseFlashcardService.getCardsByDeck(deck.id)
        allCards.push(...deckCards)
      }
      setFlashcards(allCards)
    } catch (error) {
      console.error('Failed to load flashcards:', error)
    } finally {
      setFlashcardsLoading(false)
    }
  }

  const addDeck = async (deckData) => {
    try {
      const newDeck = await supabaseFlashcardService.createDeck(deckData)
      if (newDeck) {
        setDecks(prev => [newDeck, ...prev])
      }
      return newDeck
    } catch (error) {
      console.error('Failed to add deck:', error)
      return null
    }
  }

  const updateDeck = async (id, updates) => {
    try {
      const updatedDeck = await supabaseFlashcardService.updateDeck(id, updates)
      if (updatedDeck) {
        setDecks(prev => prev.map(deck =>
          deck.id === id ? updatedDeck : deck
        ))
      }
      return updatedDeck
    } catch (error) {
      console.error('Failed to update deck:', error)
      return null
    }
  }

  const deleteDeck = async (id) => {
    try {
      const success = await supabaseFlashcardService.deleteDeck(id)
      if (success) {
        setDecks(prev => prev.filter(deck => deck.id !== id))
        // Reload flashcards to remove deleted deck's cards
        await loadFlashcards()
      }
      return success
    } catch (error) {
      console.error('Failed to delete deck:', error)
      return false
    }
  }

  const addCard = async (cardData) => {
    try {
      const newCard = await supabaseFlashcardService.createCard(cardData)
      if (newCard) {
        setFlashcards(prev => [...prev, newCard])
        // Update deck's cardIds
        setDecks(prev => prev.map(deck =>
          deck.id === cardData.deckId
            ? { ...deck, cardIds: [...deck.cardIds, newCard.id] }
            : deck
        ))
      }
      return newCard
    } catch (error) {
      console.error('Failed to add card:', error)
      return null
    }
  }

  const updateCard = async (id, updates) => {
    try {
      const updatedCard = await supabaseFlashcardService.updateCard(id, updates)
      if (updatedCard) {
        setFlashcards(prev => prev.map(card =>
          card.id === id ? updatedCard : card
        ))
      }
      return updatedCard
    } catch (error) {
      console.error('Failed to update card:', error)
      return null
    }
  }

  const deleteCard = async (id) => {
    try {
      const success = await supabaseFlashcardService.deleteCard(id)
      if (success) {
        setFlashcards(prev => prev.filter(card => card.id !== id))
        // Reload decks to update cardIds
        await loadFlashcards()
      }
      return success
    } catch (error) {
      console.error('Failed to delete card:', error)
      return false
    }
  }

  const addDeckWithCards = async (deckData, cardsData) => {
    try {
      const result = await supabaseFlashcardService.createDeckWithCards(deckData, cardsData)
      if (result) {
        setDecks(prev => [result.deck, ...prev])
        setFlashcards(prev => [...prev, ...result.cards])
      }
      return result
    } catch (error) {
      console.error('Failed to add deck with cards:', error)
      return null
    }
  }

  const recordCardReview = async (cardId, rating) => {
    try {
      const updatedCard = await supabaseFlashcardService.recordReview(cardId, rating)
      if (updatedCard) {
        setFlashcards(prev => prev.map(card =>
          card.id === cardId ? updatedCard : card
        ))
      }
      return updatedCard
    } catch (error) {
      console.error('Failed to record review:', error)
      return null
    }
  }

  const getDueCards = async (deckId = null) => {
    return await supabaseFlashcardService.getDueCards(deckId)
  }

  const getCardsByDeck = async (deckId) => {
    return await supabaseFlashcardService.getCardsByDeck(deckId)
  }

  const getDeckStats = async (deckId) => {
    return await supabaseFlashcardService.getDeckStats(deckId)
  }

  // ===== STATISTICS =====

  const getNotesStats = async () => {
    return await supabaseNotesService.getStatistics()
  }

  const getFlashcardsStats = async () => {
    return await supabaseFlashcardService.getOverallStats()
  }

  // Context value
  const value = {
    // Notes
    notes,
    notesLoading,
    addNote,
    updateNote,
    deleteNote,
    searchNotes,
    getNotesBySubject,
    toggleNoteFavorite,
    getNotesStats,
    loadNotes,

    // Flashcards
    decks,
    flashcards,
    flashcardsLoading,
    addDeck,
    updateDeck,
    deleteDeck,
    addCard,
    updateCard,
    deleteCard,
    addDeckWithCards,
    recordCardReview,
    getDueCards,
    getCardsByDeck,
    getDeckStats,
    getFlashcardsStats,
    loadFlashcards,
  }

  return (
    <StudyContext.Provider value={value}>
      {children}
    </StudyContext.Provider>
  )
}

// Custom hook for using the study context
export function useStudy() {
  const context = useContext(StudyContext)
  if (!context) {
    throw new Error('useStudy must be used within a StudyProvider')
  }
  return context
}

export default StudyContext
