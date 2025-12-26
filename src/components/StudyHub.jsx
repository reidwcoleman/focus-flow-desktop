/**
 * StudyHub Component
 * Polished desktop study hub with notes, flashcards, and quizzes
 */

import { useState, useEffect } from 'react'
import { useStudy } from '../contexts/StudyContext'
import StudySession from './StudySession'
import QuizSession from './QuizSession'
import QuizCreator from './QuizCreator'
import { confirmDialog } from './ConfirmDialog'
import { toast } from './Toast'

const StudyHub = () => {
  const {
    notes, notesLoading, decks, flashcardsLoading, quizzes, quizzesLoading,
    getDueCards, getCardsByDeck, getNotesStats, getFlashcardsStats,
    refreshNotes, deleteNote: deleteNoteContext, deleteDeck, loadFlashcards,
    getQuizById, loadQuizzes, addNote, addDeck, addCard, loadNotes
  } = useStudy()

  const [activeTab, setActiveTab] = useState('notes')
  const [studySession, setStudySession] = useState(null)
  const [activeQuizSession, setActiveQuizSession] = useState(null)
  const [selectedNote, setSelectedNote] = useState(null)
  const [dueCards, setDueCards] = useState([])
  const [stats, setStats] = useState({ notes: 0, decks: 0, due: 0 })
  const [showQuizCreator, setShowQuizCreator] = useState(false)

  // Note creation state
  const [showNoteCreator, setShowNoteCreator] = useState(false)
  const [newNote, setNewNote] = useState({ title: '', content: '', subject: '' })
  const [savingNote, setSavingNote] = useState(false)

  // Flashcard creation state
  const [showDeckCreator, setShowDeckCreator] = useState(false)
  const [newDeck, setNewDeck] = useState({ title: '', subject: '' })
  const [newCards, setNewCards] = useState([{ front: '', back: '', hint: '' }])
  const [savingDeck, setSavingDeck] = useState(false)

  useEffect(() => {
    const loadStats = async () => {
      const nStats = await getNotesStats()
      const fStats = await getFlashcardsStats()
      const due = await getDueCards()
      setStats({ notes: nStats.totalNotes, decks: fStats.totalDecks, due: due.length })
      setDueCards(due)
    }
    loadStats()
  }, [notes, decks])

  const startDeckStudy = async (deckId) => {
    const deck = decks.find(d => d.id === deckId)
    if (!deck) return
    const cards = await getCardsByDeck(deckId)
    setStudySession({ deckId, cards, title: deck.title })
  }

  const startDailyReview = () => {
    if (dueCards.length > 0) {
      setStudySession({ cards: dueCards, title: 'Daily Review' })
    }
  }

  const handleDeleteNote = async (noteId) => {
    const confirmed = await confirmDialog('Delete Note', 'Are you sure you want to delete this note?')
    if (confirmed) {
      await deleteNoteContext(noteId)
      setSelectedNote(null)
      await refreshNotes()
    }
  }

  const handleDeleteDeck = async (deck) => {
    const confirmed = await confirmDialog('Delete Deck', `Delete "${deck.title}" and all its cards?`)
    if (confirmed) {
      await deleteDeck(deck.id)
      await loadFlashcards()
    }
  }

  const startQuiz = async (quiz) => {
    const fullQuiz = await getQuizById(quiz.id)
    setActiveQuizSession(fullQuiz)
  }

  // Study session view
  if (studySession) {
    return (
      <StudySession
        deckId={studySession.deckId}
        cards={studySession.cards}
        onComplete={() => setStudySession(null)}
        onExit={() => setStudySession(null)}
      />
    )
  }

  // Quiz session view
  if (activeQuizSession) {
    return (
      <QuizSession
        quiz={activeQuizSession}
        onComplete={() => { setActiveQuizSession(null); loadQuizzes() }}
        onExit={() => setActiveQuizSession(null)}
      />
    )
  }

  // Quiz creator view
  if (showQuizCreator) {
    return (
      <QuizCreator
        onComplete={() => { setShowQuizCreator(false); loadQuizzes() }}
        onBack={() => setShowQuizCreator(false)}
        onStartQuiz={(quiz) => { setShowQuizCreator(false); setActiveQuizSession(quiz) }}
      />
    )
  }

  // Note detail view
  if (selectedNote) {
    return (
      <div className="min-h-screen bg-surface-base p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <button
            onClick={() => setSelectedNote(null)}
            className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors group"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Back to Study Hub</span>
          </button>

          <div className="bg-surface-elevated rounded-2xl border border-border overflow-hidden">
            <div className="p-6 lg:p-8 border-b border-border">
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-accent-cool/15 text-accent-cool">
                    {selectedNote.subject}
                  </span>
                  <h1 className="text-2xl lg:text-3xl font-semibold text-text-primary mt-3">{selectedNote.title}</h1>
                  <p className="text-sm text-text-muted mt-2">
                    Last updated {new Date(selectedNote.updatedAt).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteNote(selectedNote.id)}
                  className="p-3 rounded-xl text-text-muted hover:text-error hover:bg-error/10 transition-all"
                  title="Delete note"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 lg:p-8">
              <div className="prose prose-invert max-w-none">
                <div className="text-text-primary whitespace-pre-wrap leading-relaxed">{selectedNote.content}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-base">
      <div className="max-w-6xl mx-auto p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-text-primary">Study Hub</h1>
            <p className="text-text-muted mt-1">Your notes, flashcards, and quizzes</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Create Quiz Button - Always Visible */}
            <button
              onClick={() => setShowQuizCreator(true)}
              className="group relative px-5 py-3 bg-gradient-to-r from-success to-emerald-500 text-white rounded-xl font-medium transition-all hover:shadow-lg hover:shadow-success/25 hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <span>Create Quiz</span>
                <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </button>
            {/* Review Due Cards Button */}
            {dueCards.length > 0 && (
              <button
                onClick={startDailyReview}
                className="group relative px-5 py-3 bg-gradient-to-r from-primary to-primary-hover text-text-inverse rounded-xl font-medium transition-all hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-white/20 text-sm font-bold flex items-center justify-center">
                    {dueCards.length}
                  </div>
                  <span>Review Due Cards</span>
                  <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface-elevated rounded-2xl p-5 border border-border group hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <div className="text-3xl font-bold text-text-primary">{stats.notes}</div>
                <div className="text-sm text-text-muted">Notes Created</div>
              </div>
            </div>
          </div>

          <div className="bg-surface-elevated rounded-2xl p-5 border border-border group hover:border-accent-cool/30 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent-cool/15 flex items-center justify-center">
                <svg className="w-6 h-6 text-accent-cool" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <div className="text-3xl font-bold text-text-primary">{stats.decks}</div>
                <div className="text-sm text-text-muted">Flashcard Decks</div>
              </div>
            </div>
          </div>

          <div className="bg-surface-elevated rounded-2xl p-5 border border-border group hover:border-warning/30 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-warning/15 flex items-center justify-center">
                <svg className="w-6 h-6 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-3xl font-bold text-text-primary">{stats.due}</div>
                <div className="text-sm text-text-muted">Cards Due Today</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-surface-elevated rounded-xl p-1.5 border border-border inline-flex">
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
              activeTab === 'notes'
                ? 'bg-primary text-text-inverse shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Notes
            </div>
          </button>
          <button
            onClick={() => setActiveTab('flashcards')}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
              activeTab === 'flashcards'
                ? 'bg-primary text-text-inverse shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Flashcards
            </div>
          </button>
          <button
            onClick={() => setActiveTab('quizzes')}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
              activeTab === 'quizzes'
                ? 'bg-primary text-text-inverse shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Quizzes
            </div>
          </button>
        </div>

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="animate-fade-in">
            {notesLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-text-muted mt-4">Loading notes...</p>
              </div>
            ) : notes.length === 0 ? (
              <div className="bg-surface-elevated rounded-2xl border border-border p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-2">No notes yet</h3>
                <p className="text-text-muted max-w-sm mx-auto">
                  Scan documents or take pictures to automatically generate study notes
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {notes.map((note, index) => (
                  <button
                    key={note.id}
                    onClick={() => setSelectedNote(note)}
                    className="group text-left bg-surface-elevated rounded-2xl p-5 border border-border hover:border-primary/30 transition-all hover:-translate-y-0.5 animate-fade-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-primary/15 group-hover:bg-primary/25 flex items-center justify-center flex-shrink-0 transition-colors">
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-text-primary truncate group-hover:text-primary transition-colors">{note.title}</h3>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs font-medium text-accent-cool">{note.subject}</span>
                          <span className="w-1 h-1 rounded-full bg-border" />
                          <span className="text-xs text-text-muted">
                            {new Date(note.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-end">
                      <span className="text-xs text-text-muted group-hover:text-primary transition-colors flex items-center gap-1">
                        Read more
                        <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Flashcards Tab */}
        {activeTab === 'flashcards' && (
          <div className="animate-fade-in space-y-8">
            {flashcardsLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-10 h-10 border-2 border-accent-cool/30 border-t-accent-cool rounded-full animate-spin" />
                <p className="text-text-muted mt-4">Loading flashcards...</p>
              </div>
            ) : decks.length === 0 ? (
              <div className="bg-surface-elevated rounded-2xl border border-border p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-accent-cool/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-accent-cool" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-2">No flashcard decks yet</h3>
                <p className="text-text-muted max-w-sm mx-auto">
                  Scan documents to automatically generate flashcards for efficient studying
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {decks.map((deck, index) => (
                  <div
                    key={deck.id}
                    className="group bg-surface-elevated rounded-2xl border border-border hover:border-accent-cool/30 transition-all animate-fade-up overflow-hidden"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Card Stack Preview */}
                    <div className="relative h-24 bg-gradient-to-br from-accent-cool/10 to-primary/10 overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center">
                        {/* Stacked cards effect */}
                        <div className="relative w-20 h-14">
                          <div className="absolute inset-0 bg-surface-overlay rounded-lg transform rotate-6 translate-x-1" />
                          <div className="absolute inset-0 bg-surface-overlay rounded-lg transform -rotate-3 -translate-x-0.5" />
                          <div className="absolute inset-0 bg-surface-elevated rounded-lg border border-border flex items-center justify-center">
                            <span className="text-lg font-bold text-accent-cool">{deck.cardIds?.length || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-text-primary truncate">{deck.title}</h3>
                          <p className="text-sm text-text-muted mt-1">
                            {deck.cardIds?.length || 0} cards
                            {deck.dueCount > 0 && (
                              <span className="text-warning ml-2 font-medium">
                                ({deck.dueCount} due)
                              </span>
                            )}
                          </p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteDeck(deck) }}
                          className="p-2 rounded-lg text-text-muted hover:text-error hover:bg-error/10 transition-all opacity-0 group-hover:opacity-100"
                          title="Delete deck"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      <button
                        onClick={() => startDeckStudy(deck.id)}
                        className="w-full py-2.5 bg-primary hover:bg-primary-hover text-text-inverse text-sm font-medium rounded-xl transition-all flex items-center justify-center gap-2 group/btn"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        </svg>
                        Study Now
                        <svg className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quizzes Tab */}
        {activeTab === 'quizzes' && (
          <div className="animate-fade-in">
            {quizzesLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-10 h-10 border-2 border-success/30 border-t-success rounded-full animate-spin" />
                <p className="text-text-muted mt-4">Loading quizzes...</p>
              </div>
            ) : quizzes.length === 0 ? (
              <div className="bg-surface-elevated rounded-2xl border border-border p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-2">No quizzes yet</h3>
                <p className="text-text-muted max-w-sm mx-auto mb-6">
                  Create your first quiz by uploading study materials
                </p>
                <button
                  onClick={() => setShowQuizCreator(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-success hover:bg-success/90 text-white font-medium rounded-xl transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Your First Quiz
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quizzes.map((quiz, index) => (
                  <button
                    key={quiz.id}
                    onClick={() => startQuiz(quiz)}
                    className="group text-left bg-surface-elevated rounded-2xl p-5 border border-border hover:border-success/30 transition-all hover:-translate-y-0.5 animate-fade-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-success/15 group-hover:bg-success/25 flex items-center justify-center flex-shrink-0 transition-colors">
                        <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-text-primary truncate group-hover:text-success transition-colors">{quiz.title}</h3>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-xs font-medium text-success">{quiz.subject}</span>
                          <span className="w-1 h-1 rounded-full bg-border" />
                          <span className="text-xs text-text-muted">{quiz.questionCount} questions</span>
                          {quiz.bestScore && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-border" />
                              <span className="text-xs text-text-muted">Best: {Math.round(quiz.bestScore)}%</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-end">
                      <span className="text-xs text-text-muted group-hover:text-success transition-colors flex items-center gap-1">
                        Start quiz
                        <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        </svg>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default StudyHub
