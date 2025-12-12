/**
 * Assignments Service
 * Handles CRUD operations for user assignments in Supabase
 */

import supabase from '../lib/supabase'
import authService from './authService'

class AssignmentsService {
  /**
   * Get all assignments for current user
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  async getAssignments() {
    const userId = authService.getUserId()
    if (!userId) {
      return { data: [], error: new Error('No user logged in') }
    }

    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('user_id', userId)
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      return { data: data || [], error: null }
    } catch (error) {
      console.error('Failed to get assignments:', error)
      return { data: [], error }
    }
  }

  /**
   * Get upcoming assignments (not completed, ordered by due date)
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  async getUpcomingAssignments() {
    const userId = authService.getUserId()
    if (!userId) {
      return { data: [], error: new Error('No user logged in') }
    }

    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('user_id', userId)
        .eq('completed', false)
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      return { data: data || [], error: null }
    } catch (error) {
      console.error('Failed to get upcoming assignments:', error)
      return { data: [], error }
    }
  }

  /**
   * Create a new assignment
   * @param {Object} assignment - Assignment data
   * @returns {Promise<{data: Object, error: Error|null}>}
   */
  async createAssignment(assignment) {
    const userId = authService.getUserId()
    if (!userId) {
      return { data: null, error: new Error('No user logged in') }
    }

    try {
      const { data, error } = await supabase
        .from('assignments')
        .insert({
          user_id: userId,
          title: assignment.title,
          subject: assignment.subject || null,
          due_date: assignment.dueDate || assignment.due_date || null,
          priority: assignment.priority || 'medium',
          progress: assignment.progress || 0,
          ai_captured: assignment.aiCaptured || assignment.ai_captured || false,
          time_estimate: assignment.timeEstimate || assignment.time_estimate || null,
          description: assignment.description || null,
          source: assignment.source || 'manual',
          completed: assignment.completed || false,
        })
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Failed to create assignment:', error)
      return { data: null, error }
    }
  }

  /**
   * Update an assignment
   * @param {string} assignmentId - Assignment ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<{data: Object, error: Error|null}>}
   */
  async updateAssignment(assignmentId, updates) {
    const userId = authService.getUserId()
    if (!userId) {
      return { data: null, error: new Error('No user logged in') }
    }

    try {
      // Convert camelCase to snake_case for database
      const dbUpdates = {}
      if (updates.title !== undefined) dbUpdates.title = updates.title
      if (updates.subject !== undefined) dbUpdates.subject = updates.subject
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate
      if (updates.due_date !== undefined) dbUpdates.due_date = updates.due_date
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority
      if (updates.progress !== undefined) dbUpdates.progress = updates.progress
      if (updates.aiCaptured !== undefined) dbUpdates.ai_captured = updates.aiCaptured
      if (updates.ai_captured !== undefined) dbUpdates.ai_captured = updates.ai_captured
      if (updates.timeEstimate !== undefined) dbUpdates.time_estimate = updates.timeEstimate
      if (updates.time_estimate !== undefined) dbUpdates.time_estimate = updates.time_estimate
      if (updates.description !== undefined) dbUpdates.description = updates.description
      if (updates.completed !== undefined) dbUpdates.completed = updates.completed

      const { data, error } = await supabase
        .from('assignments')
        .update(dbUpdates)
        .eq('id', assignmentId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Failed to update assignment:', error)
      return { data: null, error }
    }
  }

  /**
   * Delete an assignment
   * @param {string} assignmentId - Assignment ID
   * @returns {Promise<{error: Error|null}>}
   */
  async deleteAssignment(assignmentId) {
    const userId = authService.getUserId()
    if (!userId) {
      return { error: new Error('No user logged in') }
    }

    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentId)
        .eq('user_id', userId)

      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Failed to delete assignment:', error)
      return { error }
    }
  }

  /**
   * Mark assignment as completed
   * @param {string} assignmentId - Assignment ID
   * @returns {Promise<{data: Object, error: Error|null}>}
   */
  async completeAssignment(assignmentId) {
    return this.updateAssignment(assignmentId, {
      completed: true,
      progress: 100
    })
  }

  /**
   * Convert database assignment to app format (snake_case to camelCase)
   * @param {Object} dbAssignment - Assignment from database
   * @returns {Object} - Assignment in app format
   */
  toAppFormat(dbAssignment) {
    if (!dbAssignment) return null

    return {
      id: dbAssignment.id,
      title: dbAssignment.title,
      subject: dbAssignment.subject,
      dueDate: dbAssignment.due_date,
      priority: dbAssignment.priority,
      progress: dbAssignment.progress,
      aiCaptured: dbAssignment.ai_captured,
      timeEstimate: dbAssignment.time_estimate,
      description: dbAssignment.description,
      source: dbAssignment.source,
      completed: dbAssignment.completed,
      createdAt: dbAssignment.created_at,
      updatedAt: dbAssignment.updated_at,
    }
  }

  /**
   * Convert multiple database assignments to app format
   * @param {Array} dbAssignments - Assignments from database
   * @returns {Array} - Assignments in app format
   */
  toAppFormatBatch(dbAssignments) {
    if (!Array.isArray(dbAssignments)) return []
    return dbAssignments.map(a => this.toAppFormat(a))
  }
}

// Export singleton instance
const assignmentsService = new AssignmentsService()
export default assignmentsService
