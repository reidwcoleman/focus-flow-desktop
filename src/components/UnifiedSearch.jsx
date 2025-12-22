import { useState, useEffect } from 'react'
import { useStudy } from '../contexts/StudyContext'

const UnifiedSearch = ({ onSelect, onBack }) => {
  const { searchAll } = useStudy()

  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [results, setResults] = useState({
    notes: [],
    flashcards: [],
    decks: [],
    quizzes: [],
    total: 0
  })
  const [isSearching, setIsSearching] = useState(false)

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim().length > 0) {
        performSearch()
      } else {
        setResults({ notes: [], flashcards: [], decks: [], quizzes: [], total: 0 })
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query])

  const performSearch = async () => {
    setIsSearching(true)
    try {
      const searchResults = await searchAll(query, {
        types: activeFilter === 'all'
          ? ['notes', 'flashcards', 'decks', 'quizzes']
          : [activeFilter]
      })
      setResults(searchResults)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const getCounts = () => ({
    all: results.total || 0,
    notes: results.notes?.length || 0,
    flashcards: results.flashcards?.length || 0,
    decks: results.decks?.length || 0,
    quizzes: results.quizzes?.length || 0
  })

  const counts = getCounts()

  const handleResultClick = (item, type) => {
    if (onSelect) {
      onSelect(item, type)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          {onBack && (
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-lg bg-dark-bg-secondary border border-dark-border-subtle flex items-center justify-center hover:bg-dark-bg-tertiary transition-colors"
            >
              <svg className="w-5 h-5 text-dark-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-dark-text-primary">Search All Study Materials</h2>
            <p className="text-dark-text-secondary">Search across notes, flashcards, and quizzes</p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for notes, flashcards, quizzes..."
            className="w-full pl-12 pr-4 py-4 bg-dark-bg-secondary border border-dark-border-subtle rounded-lg text-dark-text-primary placeholder-dark-text-muted focus:outline-none focus:border-primary-500 transition-colors"
            autoFocus
          />
          {isSearching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
            activeFilter === 'all'
              ? 'bg-gradient-to-r from-primary-500 to-accent-cyan text-white'
              : 'bg-dark-bg-secondary text-dark-text-secondary hover:text-dark-text-primary'
          }`}
        >
          All ({counts.all})
        </button>
        <button
          onClick={() => setActiveFilter('notes')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
            activeFilter === 'notes'
              ? 'bg-gradient-to-r from-primary-500 to-accent-cyan text-white'
              : 'bg-dark-bg-secondary text-dark-text-secondary hover:text-dark-text-primary'
          }`}
        >
          Notes ({counts.notes})
        </button>
        <button
          onClick={() => setActiveFilter('decks')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
            activeFilter === 'decks'
              ? 'bg-gradient-to-r from-primary-500 to-accent-cyan text-white'
              : 'bg-dark-bg-secondary text-dark-text-secondary hover:text-dark-text-primary'
          }`}
        >
          Decks ({counts.decks})
        </button>
        <button
          onClick={() => setActiveFilter('flashcards')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
            activeFilter === 'flashcards'
              ? 'bg-gradient-to-r from-primary-500 to-accent-cyan text-white'
              : 'bg-dark-bg-secondary text-dark-text-secondary hover:text-dark-text-primary'
          }`}
        >
          Cards ({counts.flashcards})
        </button>
        <button
          onClick={() => setActiveFilter('quizzes')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
            activeFilter === 'quizzes'
              ? 'bg-gradient-to-r from-primary-500 to-accent-cyan text-white'
              : 'bg-dark-bg-secondary text-dark-text-secondary hover:text-dark-text-primary'
          }`}
        >
          Quizzes ({counts.quizzes})
        </button>
      </div>

      {/* Results */}
      {query.trim().length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-16 h-16 mx-auto mb-4 text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 className="text-xl font-semibold text-dark-text-primary mb-2">Start searching</h3>
          <p className="text-dark-text-secondary">Type to search across all your study materials</p>
        </div>
      ) : results.total === 0 && !isSearching ? (
        <div className="text-center py-16">
          <svg className="w-16 h-16 mx-auto mb-4 text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-xl font-semibold text-dark-text-primary mb-2">No results found</h3>
          <p className="text-dark-text-secondary">Try different keywords or filters</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Notes Results */}
          {(activeFilter === 'all' || activeFilter === 'notes') && results.notes?.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-dark-text-primary mb-3">
                Notes ({results.notes.length})
              </h3>
              <div className="space-y-2">
                {results.notes.map(note => (
                  <button
                    key={note.id}
                    onClick={() => handleResultClick(note, 'note')}
                    className="w-full text-left p-4 bg-dark-bg-secondary rounded-lg border border-dark-border-subtle hover:border-primary-500/50 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-dark-text-primary mb-1">{note.title}</h4>
                        {note.matchText && (
                          <p className="text-sm text-dark-text-secondary line-clamp-2">{note.matchText}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-primary-500/20 text-primary-400">
                            {note.subject}
                          </span>
                          <span className="text-xs text-dark-text-muted">
                            {new Date(note.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Decks Results */}
          {(activeFilter === 'all' || activeFilter === 'decks') && results.decks?.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-dark-text-primary mb-3">
                Flashcard Decks ({results.decks.length})
              </h3>
              <div className="space-y-2">
                {results.decks.map(deck => (
                  <button
                    key={deck.id}
                    onClick={() => handleResultClick(deck, 'deck')}
                    className="w-full text-left p-4 bg-dark-bg-secondary rounded-lg border border-dark-border-subtle hover:border-accent-cyan/50 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-accent-cyan/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-accent-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-dark-text-primary mb-1">{deck.title}</h4>
                        {deck.matchText && (
                          <p className="text-sm text-dark-text-secondary line-clamp-1">{deck.matchText}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-accent-cyan/20 text-accent-cyan">
                            {deck.subject}
                          </span>
                          <span className="text-xs text-dark-text-muted">
                            {deck.cardCount || 0} cards
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Flashcards Results */}
          {(activeFilter === 'all' || activeFilter === 'flashcards') && results.flashcards?.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-dark-text-primary mb-3">
                Individual Cards ({results.flashcards.length})
              </h3>
              <div className="space-y-2">
                {results.flashcards.map(card => (
                  <button
                    key={card.id}
                    onClick={() => handleResultClick(card, 'flashcard')}
                    className="w-full text-left p-4 bg-dark-bg-secondary rounded-lg border border-dark-border-subtle hover:border-accent-purple/50 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-accent-purple/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-accent-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-dark-text-primary mb-1">{card.front}</h4>
                        <p className="text-sm text-dark-text-secondary line-clamp-1">{card.back}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {card.deckTitle && (
                            <span className="px-2 py-1 rounded text-xs font-semibold bg-accent-purple/20 text-accent-purple">
                              {card.deckTitle}
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            card.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                            card.difficulty === 'hard' ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {card.difficulty}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quizzes Results */}
          {(activeFilter === 'all' || activeFilter === 'quizzes') && results.quizzes?.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-dark-text-primary mb-3">
                Quizzes ({results.quizzes.length})
              </h3>
              <div className="space-y-2">
                {results.quizzes.map(quiz => (
                  <button
                    key={quiz.id}
                    onClick={() => handleResultClick(quiz, 'quiz')}
                    className="w-full text-left p-4 bg-dark-bg-secondary rounded-lg border border-dark-border-subtle hover:border-green-500/50 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-dark-text-primary mb-1">{quiz.title}</h4>
                        {quiz.description && (
                          <p className="text-sm text-dark-text-secondary line-clamp-1">{quiz.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-green-500/20 text-green-400">
                            {quiz.subject}
                          </span>
                          <span className="text-xs text-dark-text-muted">
                            {quiz.questionCount} questions
                          </span>
                          {quiz.bestScore && (
                            <span className="text-xs text-dark-text-muted">
                              Best: {Math.round(quiz.bestScore)}%
                            </span>
                          )}
                        </div>
                      </div>
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

export default UnifiedSearch
