/**
 * Activity Subtasks Service
 * Manages subtasks for calendar activities
 */

import supabase from '../lib/supabase'
import authService from './authService'

class ActivitySubtasksService {
  /**
   * Get all subtasks for an activity
   * @param {string} activityId
   * @returns {Promise<Array>}
   */
  async getSubtasks(activityId) {
    const userId = authService.getUserId()
    if (!userId) throw new Error('No user logged in')

    const { data, error } = await supabase
      .from('activity_subtasks')
      .select('*')
      .eq('activity_id', activityId)
      .eq('user_id', userId)
      .order('order', { ascending: true })

    if (error) {
      console.error('Error fetching activity subtasks:', error)
      throw error
    }

    return data || []
  }

  /**
   * Create a single subtask
   * @param {string} activityId
   * @param {Object} subtaskData
   * @returns {Promise<Object>}
   */
  async createSubtask(activityId, subtaskData) {
    const userId = authService.getUserId()
    if (!userId) throw new Error('No user logged in')

    const { data, error } = await supabase
      .from('activity_subtasks')
      .insert({
        activity_id: activityId,
        user_id: userId,
        title: subtaskData.title,
        description: subtaskData.description || '',
        order: subtaskData.order || 0,
        completed: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating activity subtask:', error)
      throw error
    }

    return data
  }

  /**
   * Create multiple subtasks in bulk
   * @param {string} activityId
   * @param {Array} subtasksArray
   * @returns {Promise<Array>}
   */
  async createSubtasksBulk(activityId, subtasksArray) {
    const userId = authService.getUserId()
    if (!userId) throw new Error('No user logged in')

    const subtasksToInsert = subtasksArray.map((subtask, index) => ({
      activity_id: activityId,
      user_id: userId,
      title: subtask.title,
      description: subtask.description || '',
      order: subtask.order !== undefined ? subtask.order : index,
      completed: false,
      created_at: new Date().toISOString()
    }))

    const { data, error } = await supabase
      .from('activity_subtasks')
      .insert(subtasksToInsert)
      .select()

    if (error) {
      console.error('Error creating activity subtasks in bulk:', error)
      throw error
    }

    return data || []
  }

  /**
   * Toggle subtask completion
   * @param {string} subtaskId
   * @param {boolean} completed
   * @returns {Promise<Object>}
   */
  async toggleSubtask(subtaskId, completed) {
    const { data, error } = await supabase
      .from('activity_subtasks')
      .update({
        completed,
        updated_at: new Date().toISOString()
      })
      .eq('id', subtaskId)
      .select()
      .single()

    if (error) {
      console.error('Error toggling activity subtask:', error)
      throw error
    }

    return data
  }

  /**
   * Delete a subtask
   * @param {string} subtaskId
   * @returns {Promise<boolean>}
   */
  async deleteSubtask(subtaskId) {
    const { error } = await supabase
      .from('activity_subtasks')
      .delete()
      .eq('id', subtaskId)

    if (error) {
      console.error('Error deleting activity subtask:', error)
      throw error
    }

    return true
  }

  /**
   * Delete all subtasks for an activity
   * @param {string} activityId
   * @returns {Promise<boolean>}
   */
  async deleteActivitySubtasks(activityId) {
    const userId = authService.getUserId()
    if (!userId) throw new Error('No user logged in')

    const { error } = await supabase
      .from('activity_subtasks')
      .delete()
      .eq('activity_id', activityId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting activity subtasks:', error)
      throw error
    }

    return true
  }
}

export default new ActivitySubtasksService()
