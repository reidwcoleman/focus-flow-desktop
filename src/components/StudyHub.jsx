/**
 * StudyHub Component
 * Central hub for Notes and Flashcards features
 */

import { useState, useEffect } from 'react'
import { useStudy } from '../contexts/StudyContext'
import StudySession from './StudySession'
import DeckPreview from './DeckPreview'

const StudyHub = () => {
  const {
    notes,
    notesLoading,
    decks,
    flashcardsLoading,
    getDueCards,
    getCardsByDeck,
    getNotesStats,
    getFlashcardsStats,
    refreshNotes,
    updateNote,
    deleteNote: deleteNoteContext,
    updateDeck,
    deleteDeck,
    loadFlashcards
  } = useStudy()

  const [activeSection, setActiveSection] = useState('overview') // overview, allNotes, allFlashcards
  const [studySession, setStudySession] = useState(null)
  const [deckPreview, setDeckPreview] = useState(null)
  const [selectedNote, setSelectedNote] = useState(null)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [notesStats, setNotesStats] = useState({ totalNotes: 0 })
  const [flashcardsStats, setFlashcardsStats] = useState({ totalDecks: 0, dueToday: 0 })
  const [dueCards, setDueCards] = useState([])

  // Load stats on mount and when notes/decks change
  useEffect(() => {
    const loadStats = async () => {
      const nStats = await getNotesStats()
      const fStats = await getFlashcardsStats()
      const due = await getDueCards()
      setNotesStats(nStats)
      setFlashcardsStats(fStats)
      setDueCards(due)
    }
    loadStats()
  }, [notes, decks, getNotesStats, getFlashcardsStats, getDueCards])

  const startDailyReview = () => {
    if (dueCards.length > 0) {
      setStudySession({
        cards: dueCards,
        title: 'Daily Review'
      })
    }
  }

  const startDeckStudy = async (deckId) => {
    const deck = decks.find(d => d.id === deckId)
    if (!deck) return

    const cards = await getCardsByDeck(deckId)
    const dueCardsForDeck = cards.filter(card =>
      new Date(card.nextReviewDate) <= new Date()
    )

    if (dueCardsForDeck.length > 0) {
      setStudySession({
        deckId,
        cards: dueCardsForDeck,
        title: deck.title
      })
    } else {
      // Study all cards if none are due
      setStudySession({
        deckId,
        cards: cards,
        title: deck.title
      })
    }
  }

  const handleSessionComplete = () => {
    setStudySession(null)
  }

  const startEditingTitle = () => {
    setEditedTitle(selectedNote.title)
    setIsEditingTitle(true)
  }

  const saveTitle = async () => {
    if (editedTitle.trim() && editedTitle !== selectedNote.title) {
      const updated = await updateNote(selectedNote.id, { title: editedTitle.trim() })
      if (updated) {
        setSelectedNote(updated)
        await refreshNotes()
      }
    }
    setIsEditingTitle(false)
  }

  const cancelEditTitle = () => {
    setIsEditingTitle(false)
    setEditedTitle('')
  }

  const handleDeleteNote = async () => {
    const success = await deleteNoteContext(selectedNote.id)
    if (success) {
      setSelectedNote(null)
      setShowDeleteConfirm(false)
      await refreshNotes()
    }
  }

  const exportNote = (note) => {
    // Create clean text content
    const cleanContent = note.content
      .replace(/\.\.\./g, '')
      .replace(/\/\/\//g, '')
      .replace(/---/g, '')
      .replace(/\*\*/g, '')
      .replace(/##/g, '')
      .replace(/#/g, '')
      .replace(/\*/g, '')
      .replace(/_/g, '')
      .replace(/~/g, '')
      .replace(/`/g, '')
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .join('\n\n')

    // Create export content
    const exportContent = `${note.title}\nSubject: ${note.subject}\n\n${cleanContent}`

    // Create blob and download
    const blob = new Blob([exportContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Deck Preview Handlers
  const openDeckPreview = (deckId) => {
    const deck = decks.find(d => d.id === deckId)
    if (deck) {
      setDeckPreview(deck)
    }
  }

  const handleEditDeck = () => {
    // TODO: Implement deck title edit modal (Phase 7)
    console.log('Edit deck:', deckPreview.title)
  }

  const handleDeleteDeck = async () => {
    if (!deckPreview) return

    const confirmed = window.confirm(`Are you sure you want to delete "${deckPreview.title}"? This will delete all ${deckPreview.cardIds.length} cards in this deck.`)
    if (confirmed) {
      const success = await deleteDeck(deckPreview.id)
      if (success) {
        setDeckPreview(null)
        await loadFlashcards()
      }
    }
  }

  const handleStartStudyFromPreview = async () => {
    if (!deckPreview) return

    const cards = await getCardsByDeck(deckPreview.id)
    const dueCardsForDeck = cards.filter(card =>
      new Date(card.nextReviewDate) <= new Date()
    )

    if (dueCardsForDeck.length > 0) {
      setStudySession({
        deckId: deckPreview.id,
        cards: dueCardsForDeck,
        title: deckPreview.title
      })
    } else {
      // Study all cards if none are due
      setStudySession({
        deckId: deckPreview.id,
        cards: cards,
        title: deckPreview.title
      })
    }
    setDeckPreview(null)
  }

  // Render deck preview if active
  if (deckPreview) {
    return (
      <DeckPreview
        deck={deckPreview}
        onClose={() => setDeckPreview(null)}
        onStartStudy={handleStartStudyFromPreview}
        onEditDeck={handleEditDeck}
        onDeleteDeck={handleDeleteDeck}
      />
    )
  }

  // Render study session if active
  if (studySession) {
    return (
      <StudySession
        deckId={studySession.deckId}
        cards={studySession.cards}
        onComplete={handleSessionComplete}
        onExit={handleSessionComplete}
      />
    )
  }

  // Render "View All Notes" section
  if (activeSection === 'allNotes') {
    return (
      <div className="space-y-6 pb-6">
        {/* Header with Back Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSection('overview')}
            className="w-10 h-10 rounded-full bg-dark-bg-secondary border border-dark-border-glow flex items-center justify-center hover:bg-dark-bg-tertiary transition-all active:scale-95"
          >
            <svg className="w-5 h-5 text-dark-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-dark-text-primary mb-1">All Notes</h1>
            <p className="text-dark-text-secondary">{notes.length} total notes</p>
          </div>
        </div>

        {/* All Notes List */}
        <div className="bg-dark-bg-secondary rounded-2xl p-5 shadow-dark-soft-md border border-dark-border-glow">
          {notesLoading ? (
            <div className="text-center py-12">
              <div className="inline-block w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-dark-bg-tertiary flex items-center justify-center border border-dark-border-glow">
                <svg className="w-10 h-10 text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <p className="text-dark-text-secondary text-base mb-2">No notes yet</p>
              <p className="text-dark-text-muted text-sm">Use the scanner to convert handwritten notes</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => setSelectedNote(note)}
                  className="flex items-start gap-3 p-4 rounded-xl bg-dark-bg-tertiary hover:bg-dark-navy-dark border border-dark-border-subtle hover:border-dark-border-glow transition-all cursor-pointer active:scale-[0.98]"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-accent-purple/20 flex items-center justify-center border border-accent-purple/30">
                    <svg className="w-5 h-5 text-accent-purple-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-dark-text-primary text-base mb-1">{note.title}</div>
                    <div className="text-dark-text-secondary text-sm mb-2">{note.subject}</div>
                    <div className="text-dark-text-muted text-xs">
                      {new Date(note.updatedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                  <div className="text-dark-text-muted flex items-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Note Viewer Modal (reuse existing one) */}
        {selectedNote && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
            onClick={() => setSelectedNote(null)}
          >
            <div
              className="bg-dark-bg-secondary rounded-3xl shadow-2xl border border-dark-border-glow max-w-2xl w-full flex flex-col animate-fadeInUp"
              style={{ maxHeight: '85vh' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-dark-border-subtle flex-shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-accent-purple/20 flex items-center justify-center border border-accent-purple/30">
                      <svg className="w-5 h-5 text-accent-purple-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      {isEditingTitle ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveTitle()
                              if (e.key === 'Escape') cancelEditTitle()
                            }}
                            className="flex-1 px-3 py-1.5 text-lg font-bold text-dark-text-primary bg-dark-bg-tertiary border-2 border-accent-purple rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-purple/20"
                            autoFocus
                          />
                          <button
                            onClick={saveTitle}
                            className="p-2 rounded-lg bg-accent-purple text-white hover:bg-accent-purple-dark transition-all active:scale-95"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={cancelEditTitle}
                            className="p-2 rounded-lg bg-dark-bg-tertiary text-dark-text-secondary hover:bg-dark-navy-dark transition-all active:scale-95"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-dark-text-primary truncate">{selectedNote.title}</h3>
                          <button
                            onClick={startEditingTitle}
                            className="p-1.5 rounded-lg hover:bg-dark-bg-tertiary transition-all active:scale-95 flex-shrink-0"
                            title="Rename note"
                          >
                            <svg className="w-4 h-4 text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        </div>
                      )}
                      <p className="text-sm text-dark-text-secondary mt-1">{selectedNote.subject}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-10 h-10 rounded-full hover:bg-red-900/20 flex items-center justify-center transition-all active:scale-95"
                      title="Delete note"
                    >
                      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setSelectedNote(null)}
                      className="w-10 h-10 rounded-full hover:bg-dark-bg-tertiary flex items-center justify-center transition-all active:scale-95"
                    >
                      <svg className="w-5 h-5 text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="p-6 overflow-y-auto flex-1 scrollbar-thin scroll-smooth">
                {/* Note Content with Enhanced Typography */}
                <div className="mb-6">
                  <div
                    className="text-white leading-relaxed text-base prose prose-invert max-w-none"
                    style={{
                      whiteSpace: 'pre-wrap',
                      wordWrap: 'break-word',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      lineHeight: '1.8',
                      letterSpacing: '0.015em'
                    }}
                  >
                    {selectedNote.content
                      .trim()
                      .split('\n')
                      .map((line, index) => {
                        const trimmedLine = line.trim()

                        // Skip empty lines
                        if (!trimmedLine) return null

                        // Remove unwanted artifacts and stray characters
                        let cleanLine = trimmedLine
                          .replace(/\.\.\./g, '')
                          .replace(/\/\/\//g, '')
                          .replace(/^---+$/g, '')
                          .replace(/\*(?!\*)/g, '') // Remove single * but keep **
                          .replace(/_{1,2}/g, '') // Remove underscores
                          .replace(/~/g, '') // Remove tildes
                          .replace(/`/g, '') // Remove backticks
                          .replace(/₀|₁|₂|₃|₄|₅|₆|₇|₈|₉/g, (match) => {
                            // Convert subscripts to regular numbers
                            const subs = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '₇', '₈': '8', '₉': '9' }
                            return subs[match] || match
                          })

                        // Handle headers (## or #)
                        if (cleanLine.startsWith('## ')) {
                          const headerText = cleanLine.replace(/^## /, '').replace(/\*\*/g, '')
                          return (
                            <div key={index} className="relative mt-8 mb-4 first:mt-0">
                              <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-cyan">
                                {headerText}
                              </h3>
                              <div className="h-0.5 w-16 bg-gradient-to-r from-primary-500 to-transparent mt-2 rounded-full"></div>
                            </div>
                          )
                        }
                        if (cleanLine.startsWith('# ')) {
                          const headerText = cleanLine.replace(/^# /, '').replace(/\*\*/g, '')
                          return (
                            <div key={index} className="relative mt-10 mb-6 first:mt-0">
                              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-primary-300 to-accent-cyan tracking-tight">
                                {headerText}
                              </h2>
                              <div className="h-1 w-24 bg-gradient-to-r from-primary-500 via-accent-cyan to-transparent mt-3 rounded-full"></div>
                            </div>
                          )
                        }

                        // Handle bullet points
                        if (cleanLine.startsWith('- ') || cleanLine.startsWith('* ')) {
                          const bulletText = cleanLine.replace(/^[*-] /, '').replace(/\*\*/g, '')

                          // Check if it has a colon (for key terms)
                          const hasColon = bulletText.includes(':')
                          if (hasColon) {
                            const [term, ...rest] = bulletText.split(':')
                            return (
                              <div key={index} className="flex items-start gap-3 mb-3 ml-2">
                                <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-primary-500 to-accent-cyan mt-2 shadow-glow-cyan-sm"></div>
                                <p className="flex-1">
                                  <span className="font-bold text-primary-400">{term}:</span>
                                  <span className="text-white/90 ml-1">{rest.join(':')}</span>
                                </p>
                              </div>
                            )
                          }

                          return (
                            <div key={index} className="flex items-start gap-3 mb-2 ml-2">
                              <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-primary-500 to-accent-cyan mt-2 shadow-glow-cyan-sm"></div>
                              <p className="flex-1 text-white/90">{bulletText}</p>
                            </div>
                          )
                        }

                        // Handle bold text (**text**)
                        const parts = cleanLine.split(/(\*\*.*?\*\*)/)
                        const formattedLine = parts.map((part, i) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                            const boldText = part.slice(2, -2)
                            return (
                              <span key={i} className="font-bold text-primary-400 px-0.5">
                                {boldText}
                              </span>
                            )
                          }
                          return part
                        })

                        // Regular paragraph
                        return (
                          <p key={index} className="mb-4 last:mb-0 text-white/95 leading-relaxed">
                            {formattedLine}
                          </p>
                        )
                      })
                      .filter(Boolean)
                    }
                  </div>
                </div>

                {/* Note Metadata */}
                <div className="pt-6 border-t border-dark-border-subtle">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-dark-text-secondary font-medium mb-1">Created</div>
                      <div className="text-dark-text-primary">
                        {new Date(selectedNote.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-dark-text-secondary font-medium mb-1">Last Updated</div>
                      <div className="text-dark-text-primary">
                        {new Date(selectedNote.updatedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-dark-border-subtle flex gap-3 flex-shrink-0">
                <button
                  onClick={() => exportNote(selectedNote)}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-accent-purple to-accent-purple-dark hover:from-accent-purple-dark hover:to-accent-purple-dark text-white font-semibold rounded-xl transition-all active:scale-95 shadow-glow-purple flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export
                </button>
                <button
                  onClick={() => setSelectedNote(null)}
                  className="flex-1 py-3 px-4 bg-dark-bg-tertiary hover:bg-dark-navy-dark text-dark-text-primary font-semibold rounded-xl transition-all active:scale-95 border border-dark-border-glow"
                >
                  Close
                </button>
              </div>

              {/* Delete Confirmation Overlay */}
              {showDeleteConfirm && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 rounded-3xl animate-fadeIn">
                  <div className="bg-dark-bg-secondary rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-dark-border-glow animate-scaleIn">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-900/20 flex items-center justify-center border border-red-700/40">
                      <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-dark-text-primary text-center mb-2">Delete Note?</h3>
                    <p className="text-dark-text-secondary text-center mb-6">
                      Are you sure you want to delete "{selectedNote.title}"? This action cannot be undone.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 py-3 px-4 bg-dark-bg-tertiary hover:bg-dark-navy-dark text-dark-text-primary font-semibold rounded-xl transition-all active:scale-95 border border-dark-border-glow"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteNote}
                        className="flex-1 py-3 px-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl transition-all active:scale-95 shadow-dark-soft"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Render "View All Flashcards" section
  if (activeSection === 'allFlashcards') {
    return (
      <div className="space-y-6 pb-6">
        {/* Header with Back Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSection('overview')}
            className="w-10 h-10 rounded-full bg-dark-bg-secondary border border-dark-border-glow flex items-center justify-center hover:bg-dark-bg-tertiary transition-all active:scale-95"
          >
            <svg className="w-5 h-5 text-dark-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-dark-text-primary mb-1">All Flashcard Decks</h1>
            <p className="text-dark-text-secondary">{decks.length} total decks</p>
          </div>
        </div>

        {/* All Decks List */}
        <div className="bg-dark-bg-secondary rounded-2xl p-5 shadow-dark-soft-md border border-dark-border-glow">
          {flashcardsLoading ? (
            <div className="text-center py-12">
              <div className="inline-block w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
            </div>
          ) : decks.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-dark-bg-tertiary flex items-center justify-center border border-dark-border-glow">
                <svg className="w-10 h-10 text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-dark-text-secondary text-base mb-2">No decks yet</p>
              <p className="text-dark-text-muted text-sm">Use the scanner to create flashcards from textbooks</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {decks.map((deck) => (
                <div
                  key={deck.id}
                  onClick={() => openDeckPreview(deck.id)}
                  className="flex items-center gap-3 p-4 rounded-xl bg-dark-bg-tertiary hover:bg-dark-navy-dark border border-dark-border-subtle hover:border-dark-border-glow transition-all cursor-pointer active:scale-95"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center border border-primary-500/30">
                    <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-dark-text-primary text-base mb-1">{deck.title}</div>
                    <div className="text-dark-text-secondary text-sm mb-1">{deck.subject}</div>
                    <div className="text-dark-text-muted text-xs">
                      {deck.cardIds.length} cards
                    </div>
                  </div>
                  <div className="text-dark-text-muted flex items-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render overview (default view)
  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-dark-text-primary mb-1">Study Hub</h1>
          <p className="text-dark-text-secondary">Your notes and flashcards</p>
        </div>
      </div>

      {/* Daily Review Widget */}
      {dueCards.length > 0 && (
        <div className="bg-gradient-to-br from-accent-purple to-accent-purple-dark rounded-2xl p-6 shadow-glow-purple-lg border border-accent-purple/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Daily Review</h3>
                <p className="text-white/90 text-sm">{dueCards.length} cards waiting</p>
              </div>
            </div>
            <button
              onClick={startDailyReview}
              className="px-5 py-2.5 bg-white text-accent-purple font-semibold rounded-xl shadow-dark-soft hover:shadow-soft-md transition-all active:scale-95"
            >
              Start
            </button>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: '35%' }}
            ></div>
          </div>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Notes Card */}
        <button
          onClick={() => setActiveSection('notes')}
          className="bg-dark-bg-secondary rounded-2xl p-5 shadow-dark-soft-md border border-dark-border-glow hover:shadow-rim-light transition-all active:scale-95 text-left"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-purple to-accent-purple-dark flex items-center justify-center shadow-glow-purple">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-dark-text-primary mb-1">
            {notesLoading ? '...' : notesStats.totalNotes}
          </div>
          <div className="text-dark-text-secondary text-sm font-medium">Notes</div>
        </button>

        {/* Flashcards Card */}
        <button
          onClick={() => setActiveSection('flashcards')}
          className="bg-dark-bg-secondary rounded-2xl p-5 shadow-dark-soft-md border border-dark-border-glow hover:shadow-rim-light transition-all active:scale-95 text-left"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-cyan flex items-center justify-center shadow-glow-cyan">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-dark-text-primary mb-1">
            {flashcardsLoading ? '...' : flashcardsStats.totalDecks}
          </div>
          <div className="text-dark-text-secondary text-sm font-medium">Decks</div>
        </button>
      </div>

      {/* Recent Notes Section */}
      <div className="bg-dark-bg-secondary rounded-2xl p-5 shadow-dark-soft-md border border-dark-border-glow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-dark-text-primary">Recent Notes</h3>
          <button
            onClick={() => setActiveSection('allNotes')}
            className="text-primary-500 text-sm font-semibold hover:text-primary-400 transition-colors"
          >
            View All
          </button>
        </div>

        {notesLoading ? (
          <div className="text-center py-8">
            <div className="inline-block w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-dark-bg-tertiary flex items-center justify-center border border-dark-border-glow">
              <svg className="w-8 h-8 text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <p className="text-dark-text-secondary text-sm mb-1">No notes yet</p>
            <p className="text-dark-text-muted text-xs">Use the scanner to convert handwritten notes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.slice(0, 3).map((note) => (
              <div
                key={note.id}
                onClick={() => setSelectedNote(note)}
                className="flex items-start gap-3 p-3 rounded-xl hover:bg-dark-bg-tertiary transition-all cursor-pointer active:scale-[0.98]"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent-purple/20 flex items-center justify-center border border-accent-purple/30">
                  <svg className="w-4 h-4 text-accent-purple-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-dark-text-primary text-sm truncate">{note.title}</div>
                  <div className="text-dark-text-secondary text-xs">{note.subject}</div>
                </div>
                <div className="text-dark-text-muted text-xs flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Flashcard Decks Section */}
      <div className="bg-dark-bg-secondary rounded-2xl p-5 shadow-dark-soft-md border border-dark-border-glow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-dark-text-primary">Flashcard Decks</h3>
          <button
            onClick={() => setActiveSection('allFlashcards')}
            className="text-primary-500 text-sm font-semibold hover:text-primary-400 transition-colors"
          >
            View All
          </button>
        </div>

        {flashcardsLoading ? (
          <div className="text-center py-8">
            <div className="inline-block w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
          </div>
        ) : decks.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-dark-bg-tertiary flex items-center justify-center border border-dark-border-glow">
              <svg className="w-8 h-8 text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-dark-text-secondary text-sm mb-1">No decks yet</p>
            <p className="text-dark-text-muted text-xs">Use the scanner to create flashcards from textbooks</p>
          </div>
        ) : (
          <div className="space-y-3">
            {decks.slice(0, 3).map((deck) => (
              <div
                key={deck.id}
                onClick={() => openDeckPreview(deck.id)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-dark-bg-tertiary transition-all cursor-pointer active:scale-95"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center border border-primary-500/30">
                  <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-dark-text-primary text-sm truncate">{deck.title}</div>
                  <div className="text-dark-text-secondary text-xs">
                    {deck.cardIds.length} cards • {deck.subject}
                  </div>
                </div>
                <div className="text-dark-text-muted text-xs flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Note Viewer Modal */}
      {selectedNote && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={() => setSelectedNote(null)}
        >
          <div
            className="bg-dark-bg-secondary rounded-3xl shadow-2xl border border-dark-border-glow max-w-2xl w-full flex flex-col animate-fadeInUp"
            style={{ maxHeight: '85vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-dark-border-subtle flex-shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-accent-purple/20 flex items-center justify-center border border-accent-purple/30">
                    <svg className="w-5 h-5 text-accent-purple-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    {isEditingTitle ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editedTitle}
                          onChange={(e) => setEditedTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveTitle()
                            if (e.key === 'Escape') cancelEditTitle()
                          }}
                          className="flex-1 px-3 py-1.5 text-lg font-bold text-dark-text-primary bg-dark-bg-tertiary border-2 border-accent-purple rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-purple/20"
                          autoFocus
                        />
                        <button
                          onClick={saveTitle}
                          className="p-2 rounded-lg bg-accent-purple text-white hover:bg-accent-purple-dark transition-all active:scale-95"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={cancelEditTitle}
                          className="p-2 rounded-lg bg-dark-bg-tertiary text-dark-text-secondary hover:bg-dark-navy-dark transition-all active:scale-95"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-dark-text-primary truncate">{selectedNote.title}</h3>
                        <button
                          onClick={startEditingTitle}
                          className="p-1.5 rounded-lg hover:bg-dark-bg-tertiary transition-all active:scale-95 flex-shrink-0"
                          title="Rename note"
                        >
                          <svg className="w-4 h-4 text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>
                    )}
                    <p className="text-sm text-dark-text-secondary mt-1">{selectedNote.subject}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-10 h-10 rounded-full hover:bg-red-900/20 flex items-center justify-center transition-all active:scale-95"
                    title="Delete note"
                  >
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setSelectedNote(null)}
                    className="w-10 h-10 rounded-full hover:bg-dark-bg-tertiary flex items-center justify-center transition-all active:scale-95"
                  >
                    <svg className="w-5 h-5 text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="p-6 overflow-y-auto flex-1 scrollbar-thin scroll-smooth">
              {/* Note Content with Enhanced Typography */}
              <div className="mb-6">
                <div
                  className="text-white leading-relaxed text-base prose prose-invert max-w-none"
                  style={{
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    lineHeight: '1.8',
                    letterSpacing: '0.015em'
                  }}
                >
                  {selectedNote.content
                    .trim()
                    .split('\n')
                    .map((line, index) => {
                      const trimmedLine = line.trim()

                      // Skip empty lines
                      if (!trimmedLine) return null

                      // Remove unwanted artifacts and stray characters
                      let cleanLine = trimmedLine
                        .replace(/\.\.\./g, '')
                        .replace(/\/\/\//g, '')
                        .replace(/^---+$/g, '')
                        .replace(/\*(?!\*)/g, '') // Remove single * but keep **
                        .replace(/_{1,2}/g, '') // Remove underscores
                        .replace(/~/g, '') // Remove tildes
                        .replace(/`/g, '') // Remove backticks
                        .replace(/₀|₁|₂|₃|₄|₅|₆|₇|₈|₉/g, (match) => {
                          // Convert subscripts to regular numbers
                          const subs = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '₇', '₈': '8', '₉': '9' }
                          return subs[match] || match
                        })

                      // Handle headers (## or #)
                      if (cleanLine.startsWith('## ')) {
                        const headerText = cleanLine.replace(/^## /, '').replace(/\*\*/g, '')
                        return (
                          <div key={index} className="relative mt-8 mb-4 first:mt-0">
                            <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-cyan">
                              {headerText}
                            </h3>
                            <div className="h-0.5 w-16 bg-gradient-to-r from-primary-500 to-transparent mt-2 rounded-full"></div>
                          </div>
                        )
                      }
                      if (cleanLine.startsWith('# ')) {
                        const headerText = cleanLine.replace(/^# /, '').replace(/\*\*/g, '')
                        return (
                          <div key={index} className="relative mt-10 mb-6 first:mt-0">
                            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-primary-300 to-accent-cyan tracking-tight">
                              {headerText}
                            </h2>
                            <div className="h-1 w-24 bg-gradient-to-r from-primary-500 via-accent-cyan to-transparent mt-3 rounded-full"></div>
                          </div>
                        )
                      }

                      // Handle bullet points
                      if (cleanLine.startsWith('- ') || cleanLine.startsWith('* ')) {
                        const bulletText = cleanLine.replace(/^[*-] /, '').replace(/\*\*/g, '')

                        // Check if it has a colon (for key terms)
                        const hasColon = bulletText.includes(':')
                        if (hasColon) {
                          const [term, ...rest] = bulletText.split(':')
                          return (
                            <div key={index} className="flex items-start gap-3 mb-3 ml-2">
                              <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-primary-500 to-accent-cyan mt-2 shadow-glow-cyan-sm"></div>
                              <p className="flex-1">
                                <span className="font-bold text-primary-400">{term}:</span>
                                <span className="text-white/90 ml-1">{rest.join(':')}</span>
                              </p>
                            </div>
                          )
                        }

                        return (
                          <div key={index} className="flex items-start gap-3 mb-2 ml-2">
                            <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-primary-500 to-accent-cyan mt-2 shadow-glow-cyan-sm"></div>
                            <p className="flex-1 text-white/90">{bulletText}</p>
                          </div>
                        )
                      }

                      // Handle bold text (**text**)
                      const parts = cleanLine.split(/(\*\*.*?\*\*)/)
                      const formattedLine = parts.map((part, i) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                          const boldText = part.slice(2, -2)
                          return (
                            <span key={i} className="font-bold text-primary-400 px-0.5">
                              {boldText}
                            </span>
                          )
                        }
                        return part
                      })

                      // Regular paragraph
                      return (
                        <p key={index} className="mb-4 last:mb-0 text-white/95 leading-relaxed">
                          {formattedLine}
                        </p>
                      )
                    })
                    .filter(Boolean)
                  }
                </div>
              </div>

              {/* Note Metadata */}
              <div className="pt-6 border-t border-dark-border-subtle">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-dark-text-secondary font-medium mb-1">Created</div>
                    <div className="text-dark-text-primary">
                      {new Date(selectedNote.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="text-dark-text-secondary font-medium mb-1">Last Updated</div>
                    <div className="text-dark-text-primary">
                      {new Date(selectedNote.updatedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-dark-border-subtle flex gap-3 flex-shrink-0">
              <button
                onClick={() => exportNote(selectedNote)}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-accent-purple to-accent-purple-dark hover:from-accent-purple-dark hover:to-accent-purple-dark text-white font-semibold rounded-xl transition-all active:scale-95 shadow-glow-purple flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export
              </button>
              <button
                onClick={() => setSelectedNote(null)}
                className="flex-1 py-3 px-4 bg-dark-bg-tertiary hover:bg-dark-navy-dark text-dark-text-primary font-semibold rounded-xl transition-all active:scale-95 border border-dark-border-glow"
              >
                Close
              </button>
            </div>

            {/* Delete Confirmation Overlay */}
            {showDeleteConfirm && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 rounded-3xl animate-fadeIn">
                <div className="bg-dark-bg-secondary rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-dark-border-glow animate-scaleIn">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-900/20 flex items-center justify-center border border-red-700/40">
                    <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-dark-text-primary text-center mb-2">Delete Note?</h3>
                  <p className="text-dark-text-secondary text-center mb-6">
                    Are you sure you want to delete "{selectedNote.title}"? This action cannot be undone.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-3 px-4 bg-dark-bg-tertiary hover:bg-dark-navy-dark text-dark-text-primary font-semibold rounded-xl transition-all active:scale-95 border border-dark-border-glow"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteNote}
                      className="flex-1 py-3 px-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl transition-all active:scale-95 shadow-dark-soft"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default StudyHub
