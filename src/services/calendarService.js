/**
 * Calendar Activities Service
 * Manages calendar activities/events in Supabase
 */

import supabase from '../lib/supabase'
import authService from './authService'

class CalendarService {
  /**
   * Get all activities for a specific date range
   * @param {Date|string} startDate - Date object or ISO date string (YYYY-MM-DD)
   * @param {Date|string} endDate - Date object or ISO date string (YYYY-MM-DD)
   * @returns {Promise<Array>}
   */
  async getActivitiesByDateRange(startDate, endDate) {
    const userId = authService.getUserId()
    if (!userId) throw new Error('No user logged in')

    // Convert to ISO string if Date object, otherwise use as-is
    const startDateStr = startDate instanceof Date
      ? startDate.toISOString().split('T')[0]
      : startDate
    const endDateStr = endDate instanceof Date
      ? endDate.toISOString().split('T')[0]
      : endDate

    const { data, error } = await supabase
      .from('calendar_activities')
      .select('*')
      .eq('user_id', userId)
      .gte('activity_date', startDateStr)
      .lte('activity_date', endDateStr)
      .order('activity_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Get activities for a specific month
   * @param {number} year
   * @param {number} month (0-11)
   * @returns {Promise<Array>}
   */
  async getActivitiesForMonth(year, month) {
    const startDate = new Date(year, month, 1)
    const endDate = new Date(year, month + 1, 0)
    return this.getActivitiesByDateRange(startDate, endDate)
  }

  /**
   * Get activities for a specific date
   * @param {Date} date
   * @returns {Promise<Array>}
   */
  async getActivitiesForDate(date) {
    const userId = authService.getUserId()
    if (!userId) throw new Error('No user logged in')

    const dateStr = date.toISOString().split('T')[0]

    const { data, error} = await supabase
      .from('calendar_activities')
      .select('*')
      .eq('user_id', userId)
      .eq('activity_date', dateStr)
      .order('start_time', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Create a new activity
   * @param {Object} activityData
   * @returns {Promise<Object>}
   */
  async createActivity(activityData) {
    const userId = authService.getUserId()
    if (!userId) throw new Error('No user logged in')

    const { data, error } = await supabase
      .from('calendar_activities')
      .insert({
        user_id: userId,
        ...activityData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Update an activity
   * @param {string} id
   * @param {Object} updates
   * @returns {Promise<Object>}
   */
  async updateActivity(id, updates) {
    const { data, error } = await supabase
      .from('calendar_activities')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Delete an activity
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteActivity(id) {
    const { error } = await supabase
      .from('calendar_activities')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  }

  /**
   * Toggle activity completion
   * @param {string} id
   * @param {boolean} isCompleted
   * @returns {Promise<Object>}
   */
  async toggleCompletion(id, isCompleted) {
    return this.updateActivity(id, { is_completed: isCompleted })
  }
}

export default new CalendarService()
