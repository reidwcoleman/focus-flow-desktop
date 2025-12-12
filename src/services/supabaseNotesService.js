/**
 * Supabase Notes Service
 * Handles CRUD operations for notes using Supabase database
 */

import supabase from '../lib/supabase'
import authService from './authService'

class SupabaseNotesService {
  /**
   * Get all notes for current user
   * @returns {Promise<Array<Note>>}
   */
  async getAllNotes() {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      if (error) throw error

      return data.map(this._mapFromDatabase)
    } catch (error) {
      console.error('Failed to fetch notes:', error)
      return []
    }
  }

  /**
   * Get note by ID
   * @param {string} id - Note ID
   * @returns {Promise<Note|null>}
   */
  async getNoteById(id) {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single()

      if (error) throw error

      return this._mapFromDatabase(data)
    } catch (error) {
      console.error('Failed to fetch note:', error)
      return null
    }
  }

  /**
   * Create a new note
   * @param {Object} noteData - Note data
   * @returns {Promise<Note|null>}
   */
  async createNote(noteData) {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const dbNote = {
        user_id: userId,
        title: noteData.title || 'Untitled Note',
        content: noteData.content || '',
        raw_text: noteData.rawText || '',
        source_image: noteData.sourceImage || null,
        subject: noteData.subject || 'General',
        tags: noteData.tags || [],
        is_favorite: false
      }

      const { data, error } = await supabase
        .from('notes')
        .insert(dbNote)
        .select()
        .single()

      if (error) throw error

      return this._mapFromDatabase(data)
    } catch (error) {
      console.error('Failed to create note:', error)
      return null
    }
  }

  /**
   * Update an existing note
   * @param {string} id - Note ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Note|null>}
   */
  async updateNote(id, updates) {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const dbUpdates = {}
      if (updates.title !== undefined) dbUpdates.title = updates.title
      if (updates.content !== undefined) dbUpdates.content = updates.content
      if (updates.rawText !== undefined) dbUpdates.raw_text = updates.rawText
      if (updates.sourceImage !== undefined) dbUpdates.source_image = updates.sourceImage
      if (updates.subject !== undefined) dbUpdates.subject = updates.subject
      if (updates.tags !== undefined) dbUpdates.tags = updates.tags
      if (updates.isFavorite !== undefined) dbUpdates.is_favorite = updates.isFavorite

      const { data, error } = await supabase
        .from('notes')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error

      return this._mapFromDatabase(data)
    } catch (error) {
      console.error('Failed to update note:', error)
      return null
    }
  }

  /**
   * Delete a note
   * @param {string} id - Note ID
   * @returns {Promise<boolean>}
   */
  async deleteNote(id) {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (error) throw error

      return true
    } catch (error) {
      console.error('Failed to delete note:', error)
      return false
    }
  }

  /**
   * Search notes by query
   * @param {string} query - Search query
   * @returns {Promise<Array<Note>>}
   */
  async searchNotes(query) {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      if (!query || query.trim() === '') {
        return await this.getAllNotes()
      }

      const lowerQuery = query.toLowerCase()

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .or(`title.ilike.%${lowerQuery}%,content.ilike.%${lowerQuery}%,subject.ilike.%${lowerQuery}%`)
        .order('updated_at', { ascending: false })

      if (error) throw error

      return data.map(this._mapFromDatabase)
    } catch (error) {
      console.error('Failed to search notes:', error)
      return []
    }
  }

  /**
   * Get notes by subject
   * @param {string} subject - Subject name
   * @returns {Promise<Array<Note>>}
   */
  async getNotesBySubject(subject) {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .ilike('subject', subject)
        .order('updated_at', { ascending: false })

      if (error) throw error

      return data.map(this._mapFromDatabase)
    } catch (error) {
      console.error('Failed to fetch notes by subject:', error)
      return []
    }
  }

  /**
   * Get favorite notes
   * @returns {Promise<Array<Note>>}
   */
  async getFavoriteNotes() {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .eq('is_favorite', true)
        .order('updated_at', { ascending: false })

      if (error) throw error

      return data.map(this._mapFromDatabase)
    } catch (error) {
      console.error('Failed to fetch favorite notes:', error)
      return []
    }
  }

  /**
   * Get recent notes
   * @param {number} limit - Number of notes to return
   * @returns {Promise<Array<Note>>}
   */
  async getRecentNotes(limit = 5) {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return data.map(this._mapFromDatabase)
    } catch (error) {
      console.error('Failed to fetch recent notes:', error)
      return []
    }
  }

  /**
   * Toggle favorite status
   * @param {string} id - Note ID
   * @returns {Promise<Note|null>}
   */
  async toggleFavorite(id) {
    try {
      const note = await this.getNoteById(id)
      if (!note) {
        return null
      }

      return await this.updateNote(id, { isFavorite: !note.isFavorite })
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
      return null
    }
  }

  /**
   * Get statistics
   * @returns {Promise<Object>}
   */
  async getStatistics() {
    try {
      const notes = await this.getAllNotes()
      const favoriteNotes = notes.filter(n => n.isFavorite)
      const subjects = [...new Set(notes.map(n => n.subject))]

      const notesBySubject = {}
      notes.forEach(note => {
        notesBySubject[note.subject] = (notesBySubject[note.subject] || 0) + 1
      })

      return {
        totalNotes: notes.length,
        favoriteNotes: favoriteNotes.length,
        subjects: subjects.length,
        notesBySubject,
        recentlyUpdated: Math.min(3, notes.length),
        oldestNote: notes.length > 0
          ? new Date(Math.min(...notes.map(n => new Date(n.createdAt))))
          : null,
        newestNote: notes.length > 0
          ? new Date(Math.max(...notes.map(n => new Date(n.createdAt))))
          : null
      }
    } catch (error) {
      console.error('Failed to get statistics:', error)
      return {
        totalNotes: 0,
        favoriteNotes: 0,
        subjects: 0,
        notesBySubject: {},
        recentlyUpdated: 0,
        oldestNote: null,
        newestNote: null
      }
    }
  }

  /**
   * Map database row to app format
   * @private
   */
  _mapFromDatabase(dbNote) {
    return {
      id: dbNote.id,
      title: dbNote.title,
      content: dbNote.content,
      rawText: dbNote.raw_text,
      sourceImage: dbNote.source_image,
      subject: dbNote.subject,
      tags: dbNote.tags || [],
      isFavorite: dbNote.is_favorite || false,
      createdAt: dbNote.created_at,
      updatedAt: dbNote.updated_at
    }
  }
}

// Export singleton instance
export default new SupabaseNotesService()
