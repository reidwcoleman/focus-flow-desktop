import { useState, useEffect } from 'react'
import { useStudy } from '../contexts/StudyContext'
import StudySession from './StudySession'
import QuizSession from './QuizSession'
import { confirmDialog } from './ConfirmDialog'
import { toast } from './Toast'

const StudyHub = () => {
  const {
    notes, notesLoading, decks, flashcardsLoading, quizzes, quizzesLoading,
    getDueCards, getCardsByDeck, getNotesStats, getFlashcardsStats,
    refreshNotes, deleteNote: deleteNoteContext, deleteDeck, loadFlashcards,
    getQuizById, loadQuizzes
  } = useStudy()

  const [activeTab, setActiveTab] = useState('notes') // notes, flashcards
  const [studySession, setStudySession] = useState(null)
  const [activeQuizSession, setActiveQuizSession] = useState(null)
  const [selectedNote, setSelectedNote] = useState(null)
  const [dueCards, setDueCards] = useState([])
  const [stats, setStats] = useState({ notes: 0, decks: 0, due: 0 })

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
    const confirmed = await confirmDialog('Delete Note', 'Are you sure?')
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

  // Note detail view
  if (selectedNote) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <button
          onClick={() => setSelectedNote(null)}
          className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="bg-surface-elevated rounded-xl p-6 border border-border">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="text-xs font-medium text-accent bg-accent/20 px-2 py-1 rounded">
                {selectedNote.subject}
              </span>
              <h1 className="text-2xl font-bold text-text-primary mt-2">{selectedNote.title}</h1>
            </div>
            <button
              onClick={() => handleDeleteNote(selectedNote.id)}
              className="p-2 text-text-muted hover:text-error transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          <div className="prose prose-invert max-w-none">
            <div className="text-text-primary whitespace-pre-wrap">{selectedNote.content}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Study</h1>
        {dueCards.length > 0 && (
          <button
            onClick={startDailyReview}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2"
          >
            <span className="w-5 h-5 rounded-full bg-white/20 text-xs flex items-center justify-center">
              {dueCards.length}
            </span>
            Review Due
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-elevated rounded-xl p-4 border border-border">
          <div className="text-2xl font-bold text-primary">{stats.notes}</div>
          <div className="text-sm text-text-muted">Notes</div>
        </div>
        <div className="bg-surface-elevated rounded-xl p-4 border border-border">
          <div className="text-2xl font-bold text-accent">{stats.decks}</div>
          <div className="text-sm text-text-muted">Decks</div>
        </div>
        <div className="bg-surface-elevated rounded-xl p-4 border border-border">
          <div className="text-2xl font-bold text-warning">{stats.due}</div>
          <div className="text-sm text-text-muted">Due Today</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-surface-elevated rounded-lg p-1 border border-border">
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'notes' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          Notes
        </button>
        <button
          onClick={() => setActiveTab('flashcards')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'flashcards' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          Flashcards
        </button>
      </div>

      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <div>
          {notesLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <p>No notes yet</p>
              <p className="text-sm mt-1">Scan documents to create notes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => setSelectedNote(note)}
                  className="w-full text-left bg-surface-elevated rounded-xl p-4 border border-border hover:border-border-active transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-text-primary truncate">{note.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-accent">{note.subject}</span>
                        <span className="text-xs text-text-muted">
                          {new Date(note.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Flashcards Tab */}
      {activeTab === 'flashcards' && (
        <div>
          {flashcardsLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : decks.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <p>No flashcard decks yet</p>
              <p className="text-sm mt-1">Scan documents to create flashcards</p>
            </div>
          ) : (
            <div className="space-y-3">
              {decks.map((deck) => (
                <div
                  key={deck.id}
                  className="bg-surface-elevated rounded-xl p-4 border border-border hover:border-border-active transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-text-primary">{deck.title}</h3>
                      <p className="text-sm text-text-muted mt-1">
                        {deck.cardIds?.length || 0} cards
                        {deck.dueCount > 0 && (
                          <span className="text-warning ml-2">({deck.dueCount} due)</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startDeckStudy(deck.id)}
                        className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover transition-colors"
                      >
                        Study
                      </button>
                      <button
                        onClick={() => handleDeleteDeck(deck)}
                        className="p-2 text-text-muted hover:text-error transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quizzes Section */}
          {quizzes.length > 0 && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold text-text-primary mb-3">Quizzes</h2>
              <div className="space-y-3">
                {quizzes.map((quiz) => (
                  <button
                    key={quiz.id}
                    onClick={() => startQuiz(quiz)}
                    className="w-full text-left bg-surface-elevated rounded-xl p-4 border border-border hover:border-success transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-text-primary">{quiz.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-success">{quiz.subject}</span>
                          <span className="text-xs text-text-muted">{quiz.questionCount} questions</span>
                          {quiz.bestScore && (
                            <span className="text-xs text-text-muted">Best: {Math.round(quiz.bestScore)}%</span>
                          )}
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default StudyHub
