/**
 * Notes Service for Focus Flow
 * Handles CRUD operations and localStorage persistence for typed notes
 */

const STORAGE_KEY = 'focus_flow_notes'

class NotesService {
  constructor() {
    this.notes = this._loadFromStorage()
  }

  /**
   * Get all notes
   * @returns {Array<Note>} Array of all notes
   */
  getAllNotes() {
    return [...this.notes].sort((a, b) =>
      new Date(b.updatedAt) - new Date(a.updatedAt)
    )
  }

  /**
   * Get note by ID
   * @param {string} id - Note ID
   * @returns {Note|null}
   */
  getNoteById(id) {
    return this.notes.find(note => note.id === id) || null
  }

  /**
   * Create a new note
   * @param {Object} noteData - Note data
   * @returns {Note} Created note
   */
  createNote(noteData) {
    const now = new Date().toISOString()
    const newNote = {
      id: this._generateId(),
      title: noteData.title || 'Untitled Note',
      content: noteData.content || '',
      rawText: noteData.rawText || '',
      sourceImage: noteData.sourceImage || null,
      subject: noteData.subject || 'General',
      tags: Array.isArray(noteData.tags) ? noteData.tags : [],
      isFavorite: false,
      createdAt: now,
      updatedAt: now
    }

    this.notes.push(newNote)
    this._saveToStorage()

    return newNote
  }

  /**
   * Update an existing note
   * @param {string} id - Note ID
   * @param {Object} updates - Fields to update
   * @returns {Note|null} Updated note or null if not found
   */
  updateNote(id, updates) {
    const index = this.notes.findIndex(note => note.id === id)

    if (index === -1) {
      return null
    }

    this.notes[index] = {
      ...this.notes[index],
      ...updates,
      id, // Prevent ID from being changed
      updatedAt: new Date().toISOString()
    }

    this._saveToStorage()

    return this.notes[index]
  }

  /**
   * Delete a note
   * @param {string} id - Note ID
   * @returns {boolean} True if deleted, false if not found
   */
  deleteNote(id) {
    const initialLength = this.notes.length
    this.notes = this.notes.filter(note => note.id !== id)

    if (this.notes.length < initialLength) {
      this._saveToStorage()
      return true
    }

    return false
  }

  /**
   * Search notes by query
   * @param {string} query - Search query
   * @returns {Array<Note>} Matching notes
   */
  searchNotes(query) {
    if (!query || query.trim() === '') {
      return this.getAllNotes()
    }

    const lowerQuery = query.toLowerCase()

    return this.notes.filter(note =>
      note.title.toLowerCase().includes(lowerQuery) ||
      note.content.toLowerCase().includes(lowerQuery) ||
      note.subject.toLowerCase().includes(lowerQuery) ||
      note.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  }

  /**
   * Get notes by subject
   * @param {string} subject - Subject name
   * @returns {Array<Note>} Matching notes
   */
  getNotesBySubject(subject) {
    return this.notes.filter(note =>
      note.subject.toLowerCase() === subject.toLowerCase()
    ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  }

  /**
   * Get favorite notes
   * @returns {Array<Note>} Favorite notes
   */
  getFavoriteNotes() {
    return this.notes.filter(note => note.isFavorite)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  }

  /**
   * Get recent notes (limit)
   * @param {number} limit - Number of notes to return
   * @returns {Array<Note>} Recent notes
   */
  getRecentNotes(limit = 5) {
    return this.getAllNotes().slice(0, limit)
  }

  /**
   * Get all unique subjects
   * @returns {Array<string>} Array of unique subjects
   */
  getAllSubjects() {
    const subjects = new Set(this.notes.map(note => note.subject))
    return Array.from(subjects).sort()
  }

  /**
   * Get notes count by subject
   * @returns {Object} Object with subject as key and count as value
   */
  getNotesCountBySubject() {
    const counts = {}
    this.notes.forEach(note => {
      counts[note.subject] = (counts[note.subject] || 0) + 1
    })
    return counts
  }

  /**
   * Toggle favorite status
   * @param {string} id - Note ID
   * @returns {Note|null} Updated note or null
   */
  toggleFavorite(id) {
    const note = this.getNoteById(id)
    if (!note) {
      return null
    }

    return this.updateNote(id, { isFavorite: !note.isFavorite })
  }

  /**
   * Export note to markdown string
   * @param {string} id - Note ID
   * @returns {string|null} Markdown content or null
   */
  exportToMarkdown(id) {
    const note = this.getNoteById(id)
    if (!note) {
      return null
    }

    return `# ${note.title}

**Subject:** ${note.subject}
**Created:** ${new Date(note.createdAt).toLocaleDateString()}
**Tags:** ${note.tags.join(', ')}

---

${note.content}
`
  }

  /**
   * Import note from plain text
   * @param {string} text - Plain text content
   * @param {Object} metadata - Optional metadata (title, subject, etc.)
   * @returns {Note} Created note
   */
  importFromText(text, metadata = {}) {
    return this.createNote({
      title: metadata.title || 'Imported Note',
      content: text,
      rawText: text,
      subject: metadata.subject || 'General',
      tags: metadata.tags || [],
      sourceImage: null
    })
  }

  /**
   * Clear all notes (with confirmation in calling code)
   * @returns {boolean} True if cleared
   */
  clearAllNotes() {
    this.notes = []
    this._saveToStorage()
    return true
  }

  /**
   * Get statistics
   * @returns {Object} Notes statistics
   */
  getStatistics() {
    return {
      totalNotes: this.notes.length,
      favoriteNotes: this.getFavoriteNotes().length,
      subjects: this.getAllSubjects().length,
      notesBySubject: this.getNotesCountBySubject(),
      recentlyUpdated: this.getRecentNotes(3).length,
      oldestNote: this.notes.length > 0
        ? new Date(Math.min(...this.notes.map(n => new Date(n.createdAt))))
        : null,
      newestNote: this.notes.length > 0
        ? new Date(Math.max(...this.notes.map(n => new Date(n.createdAt))))
        : null
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Generate unique ID
   */
  _generateId() {
    return `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Load notes from localStorage
   */
  _loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        return []
      }

      const parsed = JSON.parse(stored)
      return Array.isArray(parsed) ? parsed : []
    } catch (error) {
      console.error('Failed to load notes from localStorage:', error)
      return []
    }
  }

  /**
   * Save notes to localStorage
   */
  _saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notes))
    } catch (error) {
      console.error('Failed to save notes to localStorage:', error)
      // Handle quota exceeded error
      if (error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded - notes not saved')
      }
    }
  }
}

// Export singleton instance
export default new NotesService()
