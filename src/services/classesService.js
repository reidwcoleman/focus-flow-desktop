/**
 * Classes Service
 * Handles CRUD operations for user classes in Supabase
 */

import supabase from '../lib/supabase'
import authService from './authService'

class ClassesService {
  /**
   * Get all classes for current user
   * @param {boolean} includeArchived - Include archived classes
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  async getClasses(includeArchived = false) {
    const userId = authService.getUserId()
    if (!userId) {
      return { data: [], error: new Error('No user logged in') }
    }

    try {
      let query = supabase
        .from('classes')
        .select(`
          *,
          semester:semesters(id, name, start_date, end_date, is_current),
          schedule:class_schedule(*)
        `)
        .eq('user_id', userId)
        .order('name')

      if (!includeArchived) {
        query = query.eq('is_archived', false)
      }

      const { data, error } = await query

      if (error) throw error
      return { data: data || [], error: null }
    } catch (error) {
      console.error('Failed to get classes:', error)
      return { data: [], error }
    }
  }

  /**
   * Get a single class by ID with schedule
   * @param {string} classId - Class ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async getClass(classId) {
    const userId = authService.getUserId()
    if (!userId) {
      return { data: null, error: new Error('No user logged in') }
    }

    try {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          semester:semesters(*),
          schedule:class_schedule(*)
        `)
        .eq('id', classId)
        .eq('user_id', userId)
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Failed to get class:', error)
      return { data: null, error }
    }
  }

  /**
   * Create a new class
   * @param {Object} classData - Class data
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async createClass(classData) {
    const userId = authService.getUserId()
    if (!userId) {
      return { data: null, error: new Error('No user logged in') }
    }

    try {
      const insertData = {
        user_id: userId,
        name: classData.name,
        teacher_name: classData.teacherName || null,
        semester_id: classData.semesterId || null,
        color: classData.color || '#3B82F6',
        icon: classData.icon || null,
        room: classData.room || null,
        current_grade: classData.currentGrade || null,
        is_archived: false,
      }

      const { data, error } = await supabase
        .from('classes')
        .insert(insertData)
        .select()
        .single()

      if (error) throw error

      // Add schedule if provided
      if (data && classData.schedule && classData.schedule.length > 0) {
        await this.updateSchedule(data.id, classData.schedule)
      }

      return { data, error: null }
    } catch (error) {
      console.error('Failed to create class:', error)
      return { data: null, error }
    }
  }

  /**
   * Update a class
   * @param {string} classId - Class ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async updateClass(classId, updates) {
    const userId = authService.getUserId()
    if (!userId) {
      return { data: null, error: new Error('No user logged in') }
    }

    try {
      const dbUpdates = {}
      if (updates.name !== undefined) dbUpdates.name = updates.name
      if (updates.teacherName !== undefined) dbUpdates.teacher_name = updates.teacherName
      if (updates.semesterId !== undefined) dbUpdates.semester_id = updates.semesterId
      if (updates.color !== undefined) dbUpdates.color = updates.color
      if (updates.icon !== undefined) dbUpdates.icon = updates.icon
      if (updates.room !== undefined) dbUpdates.room = updates.room
      if (updates.currentGrade !== undefined) dbUpdates.current_grade = updates.currentGrade
      if (updates.isArchived !== undefined) dbUpdates.is_archived = updates.isArchived

      dbUpdates.updated_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('classes')
        .update(dbUpdates)
        .eq('id', classId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error

      // Update schedule if provided
      if (data && updates.schedule !== undefined) {
        await this.updateSchedule(classId, updates.schedule)
      }

      return { data, error: null }
    } catch (error) {
      console.error('Failed to update class:', error)
      return { data: null, error }
    }
  }

  /**
   * Delete a class
   * @param {string} classId - Class ID
   * @returns {Promise<{error: Error|null}>}
   */
  async deleteClass(classId) {
    const userId = authService.getUserId()
    if (!userId) {
      return { error: new Error('No user logged in') }
    }

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId)
        .eq('user_id', userId)

      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Failed to delete class:', error)
      return { error }
    }
  }

  /**
   * Archive a class
   * @param {string} classId - Class ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async archiveClass(classId) {
    return this.updateClass(classId, { isArchived: true })
  }

  /**
   * Update class schedule
   * @param {string} classId - Class ID
   * @param {Array} schedule - Schedule entries [{ dayOfWeek, startTime, endTime }]
   * @returns {Promise<{error: Error|null}>}
   */
  async updateSchedule(classId, schedule) {
    const userId = authService.getUserId()
    if (!userId) {
      return { error: new Error('No user logged in') }
    }

    try {
      // Verify user owns this class
      const { data: classData } = await supabase
        .from('classes')
        .select('id')
        .eq('id', classId)
        .eq('user_id', userId)
        .single()

      if (!classData) {
        throw new Error('Class not found or access denied')
      }

      // Delete existing schedule
      await supabase
        .from('class_schedule')
        .delete()
        .eq('class_id', classId)

      // Insert new schedule entries
      if (schedule && schedule.length > 0) {
        const scheduleData = schedule.map(entry => ({
          class_id: classId,
          day_of_week: entry.dayOfWeek,
          start_time: entry.startTime,
          end_time: entry.endTime,
        }))

        const { error } = await supabase
          .from('class_schedule')
          .insert(scheduleData)

        if (error) throw error
      }

      return { error: null }
    } catch (error) {
      console.error('Failed to update schedule:', error)
      return { error }
    }
  }

  /**
   * Get classes for current semester
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  async getCurrentSemesterClasses() {
    const userId = authService.getUserId()
    if (!userId) {
      return { data: [], error: new Error('No user logged in') }
    }

    try {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          semester:semesters!inner(id, name, is_current),
          schedule:class_schedule(*)
        `)
        .eq('user_id', userId)
        .eq('is_archived', false)
        .eq('semesters.is_current', true)
        .order('name')

      if (error) throw error
      return { data: data || [], error: null }
    } catch (error) {
      console.error('Failed to get current semester classes:', error)
      return { data: [], error }
    }
  }

  /**
   * Get class color for UI
   * @param {string} classId - Class ID
   * @returns {string} Hex color code
   */
  getClassColor(classId) {
    // This can be enhanced with caching
    return '#3B82F6' // Default blue
  }
}

// Export singleton instance
const classesService = new ClassesService()
export default classesService
