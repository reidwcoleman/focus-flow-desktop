/**
 * Subtasks Service
 * Manages subtasks for assignment breakdown
 */

import supabase from '../lib/supabase'
import authService from './authService'
import assignmentsService from './assignmentsService'

class SubtasksService {
  /**
   * Get all subtasks for an assignment
   * @param {string} assignmentId - Assignment UUID
   * @returns {Promise<Array>} Array of subtasks
   */
  async getSubtasks(assignmentId) {
    try {
      const userId = authService.getUserId()
      if (!userId) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('subtasks')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('user_id', userId)
        .order('order_index', { ascending: true })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Failed to get subtasks:', error)
      return []
    }
  }

  /**
   * Create a new subtask
   * @param {Object} subtaskData - Subtask data
   * @returns {Promise<Object>} Created subtask
   */
  async createSubtask(subtaskData) {
    try {
      const userId = authService.getUserId()
      if (!userId) throw new Error('Not authenticated')

      const { assignmentId, title, description, orderIndex, generatedByAI, aiConfidence } = subtaskData

      // Get current max order index if not provided
      let order = orderIndex
      if (order === undefined) {
        const existing = await this.getSubtasks(assignmentId)
        order = existing.length > 0 ? Math.max(...existing.map(s => s.order_index)) + 1 : 0
      }

      const { data, error } = await supabase
        .from('subtasks')
        .insert({
          assignment_id: assignmentId,
          user_id: userId,
          title: title.trim(),
          description: description?.trim() || null,
          order_index: order,
          generated_by_ai: generatedByAI || false,
          ai_confidence: aiConfidence || null,
        })
        .select()
        .single()

      if (error) throw error

      console.log('✅ Created subtask:', data)
      return data
    } catch (error) {
      console.error('Failed to create subtask:', error)
      throw error
    }
  }

  /**
   * Create multiple subtasks in bulk (for AI generation)
   * @param {string} assignmentId - Assignment UUID
   * @param {Array} subtasks - Array of subtask objects
   * @returns {Promise<Array>} Created subtasks
   */
  async createSubtasksBulk(assignmentId, subtasks) {
    try {
      const userId = authService.getUserId()
      if (!userId) throw new Error('Not authenticated')

      const subtasksData = subtasks.map((subtask, index) => ({
        assignment_id: assignmentId,
        user_id: userId,
        title: subtask.title.trim(),
        description: subtask.description?.trim() || null,
        order_index: index,
        generated_by_ai: true,
        ai_confidence: subtask.confidence || null,
      }))

      const { data, error } = await supabase
        .from('subtasks')
        .insert(subtasksData)
        .select()

      if (error) throw error

      console.log(`✅ Created ${data.length} AI-generated subtasks`)
      return data
    } catch (error) {
      console.error('Failed to create subtasks in bulk:', error)
      throw error
    }
  }

  /**
   * Update a subtask
   * @param {string} subtaskId - Subtask UUID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated subtask
   */
  async updateSubtask(subtaskId, updates) {
    try {
      const userId = authService.getUserId()
      if (!userId) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('subtasks')
        .update(updates)
        .eq('id', subtaskId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error

      console.log('✅ Updated subtask:', data)

      // Update parent assignment progress
      await this.updateAssignmentProgress(data.assignment_id)

      return data
    } catch (error) {
      console.error('Failed to update subtask:', error)
      throw error
    }
  }

  /**
   * Toggle subtask completion
   * @param {string} subtaskId - Subtask UUID
   * @param {boolean} completed - Completion status
   * @returns {Promise<Object>} Updated subtask
   */
  async toggleSubtask(subtaskId, completed) {
    return this.updateSubtask(subtaskId, { completed })
  }

  /**
   * Delete a subtask
   * @param {string} subtaskId - Subtask UUID
   * @returns {Promise<boolean>} Success
   */
  async deleteSubtask(subtaskId) {
    try {
      const userId = authService.getUserId()
      if (!userId) throw new Error('Not authenticated')

      // Get assignment_id before deleting
      const { data: subtask } = await supabase
        .from('subtasks')
        .select('assignment_id')
        .eq('id', subtaskId)
        .eq('user_id', userId)
        .single()

      const { error } = await supabase
        .from('subtasks')
        .delete()
        .eq('id', subtaskId)
        .eq('user_id', userId)

      if (error) throw error

      console.log('✅ Deleted subtask')

      // Update parent assignment progress
      if (subtask) {
        await this.updateAssignmentProgress(subtask.assignment_id)
      }

      return true
    } catch (error) {
      console.error('Failed to delete subtask:', error)
      throw error
    }
  }

  /**
   * Delete all subtasks for an assignment
   * @param {string} assignmentId - Assignment UUID
   * @returns {Promise<boolean>} Success
   */
  async deleteAllSubtasks(assignmentId) {
    try {
      const userId = authService.getUserId()
      if (!userId) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('subtasks')
        .delete()
        .eq('assignment_id', assignmentId)
        .eq('user_id', userId)

      if (error) throw error

      console.log('✅ Deleted all subtasks for assignment')

      // Reset assignment progress to 0
      await assignmentsService.updateAssignment(assignmentId, { progress: 0 })

      return true
    } catch (error) {
      console.error('Failed to delete all subtasks:', error)
      throw error
    }
  }

  /**
   * Reorder subtasks
   * @param {string} assignmentId - Assignment UUID
   * @param {Array} subtaskIds - Array of subtask IDs in new order
   * @returns {Promise<boolean>} Success
   */
  async reorderSubtasks(assignmentId, subtaskIds) {
    try {
      const userId = authService.getUserId()
      if (!userId) throw new Error('Not authenticated')

      // Update each subtask's order_index
      const updates = subtaskIds.map((subtaskId, index) =>
        supabase
          .from('subtasks')
          .update({ order_index: index })
          .eq('id', subtaskId)
          .eq('user_id', userId)
      )

      await Promise.all(updates)

      console.log('✅ Reordered subtasks')
      return true
    } catch (error) {
      console.error('Failed to reorder subtasks:', error)
      throw error
    }
  }

  /**
   * Calculate and update parent assignment progress based on subtasks
   * @param {string} assignmentId - Assignment UUID
   * @returns {Promise<number>} Updated progress percentage
   */
  async updateAssignmentProgress(assignmentId) {
    try {
      const subtasks = await this.getSubtasks(assignmentId)

      if (subtasks.length === 0) {
        // No subtasks - don't change assignment progress
        return null
      }

      const completedCount = subtasks.filter(s => s.completed).length
      const progress = Math.round((completedCount / subtasks.length) * 100)

      // Update assignment progress and completion status
      const updates = { progress }

      // If all subtasks complete, mark assignment as complete
      if (progress === 100) {
        updates.completed = true
      }
      // If assignment was completed but subtask unchecked, unmark completion
      else {
        const { data: assignment } = await supabase
          .from('assignments')
          .select('completed')
          .eq('id', assignmentId)
          .single()

        if (assignment?.completed) {
          updates.completed = false
        }
      }

      await assignmentsService.updateAssignment(assignmentId, updates)

      console.log(`📊 Updated assignment progress: ${progress}% (${completedCount}/${subtasks.length} subtasks)`)
      return progress
    } catch (error) {
      console.error('Failed to update assignment progress:', error)
      return null
    }
  }

  /**
   * Get subtask statistics for an assignment
   * @param {string} assignmentId - Assignment UUID
   * @returns {Promise<Object>} Subtask stats
   */
  async getSubtaskStats(assignmentId) {
    try {
      const subtasks = await this.getSubtasks(assignmentId)

      return {
        total: subtasks.length,
        completed: subtasks.filter(s => s.completed).length,
        remaining: subtasks.filter(s => !s.completed).length,
        progress: subtasks.length > 0
          ? Math.round((subtasks.filter(s => s.completed).length / subtasks.length) * 100)
          : 0,
        hasAIGenerated: subtasks.some(s => s.generated_by_ai),
      }
    } catch (error) {
      console.error('Failed to get subtask stats:', error)
      return {
        total: 0,
        completed: 0,
        remaining: 0,
        progress: 0,
        hasAIGenerated: false,
      }
    }
  }
}

export default new SubtasksService()
