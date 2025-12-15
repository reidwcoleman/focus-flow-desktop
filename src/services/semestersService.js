/**
 * Semesters Service
 * Handles CRUD operations for academic semesters in Supabase
 */

import supabase from '../lib/supabase'
import authService from './authService'

class SemestersService {
  /**
   * Get all semesters for current user
   * @returns {Promise<{data: Array, error: Error|null}>}
   */
  async getSemesters() {
    const userId = authService.getUserId()
    if (!userId) {
      return { data: [], error: new Error('No user logged in') }
    }

    try {
      const { data, error } = await supabase
        .from('semesters')
        .select(`
          *,
          breaks:semester_breaks(*)
        `)
        .eq('user_id', userId)
        .order('start_date', { ascending: false })

      if (error) throw error
      return { data: data || [], error: null }
    } catch (error) {
      console.error('Failed to get semesters:', error)
      return { data: [], error }
    }
  }

  /**
   * Get current semester
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async getCurrentSemester() {
    const userId = authService.getUserId()
    if (!userId) {
      return { data: null, error: new Error('No user logged in') }
    }

    try {
      const { data, error} = await supabase
        .from('semesters')
        .select(`
          *,
          breaks:semester_breaks(*)
        `)
        .eq('user_id', userId)
        .eq('is_current', true)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
      return { data: data || null, error: null }
    } catch (error) {
      console.error('Failed to get current semester:', error)
      return { data: null, error }
    }
  }

  /**
   * Create a new semester
   * @param {Object} semesterData - Semester data
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async createSemester(semesterData) {
    const userId = authService.getUserId()
    if (!userId) {
      return { data: null, error: new Error('No user logged in') }
    }

    try {
      // If this is set as current, unset all other current semesters
      if (semesterData.isCurrent) {
        await this.unsetCurrentSemester()
      }

      const insertData = {
        user_id: userId,
        name: semesterData.name,
        start_date: semesterData.startDate,
        end_date: semesterData.endDate,
        exam_period_start: semesterData.examPeriodStart || null,
        exam_period_end: semesterData.examPeriodEnd || null,
        is_current: semesterData.isCurrent || false,
      }

      const { data, error } = await supabase
        .from('semesters')
        .insert(insertData)
        .select()
        .single()

      if (error) throw error

      // Add breaks if provided
      if (data && semesterData.breaks && semesterData.breaks.length > 0) {
        await this.updateBreaks(data.id, semesterData.breaks)
      }

      return { data, error: null }
    } catch (error) {
      console.error('Failed to create semester:', error)
      return { data: null, error }
    }
  }

  /**
   * Update a semester
   * @param {string} semesterId - Semester ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async updateSemester(semesterId, updates) {
    const userId = authService.getUserId()
    if (!userId) {
      return { data: null, error: new Error('No user logged in') }
    }

    try {
      // If setting as current, unset all other current semesters
      if (updates.isCurrent) {
        await this.unsetCurrentSemester()
      }

      const dbUpdates = {}
      if (updates.name !== undefined) dbUpdates.name = updates.name
      if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate
      if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate
      if (updates.examPeriodStart !== undefined) dbUpdates.exam_period_start = updates.examPeriodStart
      if (updates.examPeriodEnd !== undefined) dbUpdates.exam_period_end = updates.examPeriodEnd
      if (updates.isCurrent !== undefined) dbUpdates.is_current = updates.isCurrent

      dbUpdates.updated_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('semesters')
        .update(dbUpdates)
        .eq('id', semesterId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error

      // Update breaks if provided
      if (data && updates.breaks !== undefined) {
        await this.updateBreaks(semesterId, updates.breaks)
      }

      return { data, error: null }
    } catch (error) {
      console.error('Failed to update semester:', error)
      return { data: null, error }
    }
  }

  /**
   * Delete a semester
   * @param {string} semesterId - Semester ID
   * @returns {Promise<{error: Error|null}>}
   */
  async deleteSemester(semesterId) {
    const userId = authService.getUserId()
    if (!userId) {
      return { error: new Error('No user logged in') }
    }

    try {
      const { error } = await supabase
        .from('semesters')
        .delete()
        .eq('id', semesterId)
        .eq('user_id', userId)

      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Failed to delete semester:', error)
      return { error }
    }
  }

  /**
   * Set a semester as current
   * @param {string} semesterId - Semester ID
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async setCurrentSemester(semesterId) {
    return this.updateSemester(semesterId, { isCurrent: true })
  }

  /**
   * Unset all current semesters for user
   * @private
   * @returns {Promise<{error: Error|null}>}
   */
  async unsetCurrentSemester() {
    const userId = authService.getUserId()
    if (!userId) {
      return { error: new Error('No user logged in') }
    }

    try {
      const { error } = await supabase
        .from('semesters')
        .update({ is_current: false })
        .eq('user_id', userId)
        .eq('is_current', true)

      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Failed to unset current semester:', error)
      return { error }
    }
  }

  /**
   * Update semester breaks
   * @param {string} semesterId - Semester ID
   * @param {Array} breaks - Break entries [{ name, startDate, endDate }]
   * @returns {Promise<{error: Error|null}>}
   */
  async updateBreaks(semesterId, breaks) {
    const userId = authService.getUserId()
    if (!userId) {
      return { error: new Error('No user logged in') }
    }

    try {
      // Verify user owns this semester
      const { data: semesterData } = await supabase
        .from('semesters')
        .select('id')
        .eq('id', semesterId)
        .eq('user_id', userId)
        .single()

      if (!semesterData) {
        throw new Error('Semester not found or access denied')
      }

      // Delete existing breaks
      await supabase
        .from('semester_breaks')
        .delete()
        .eq('semester_id', semesterId)

      // Insert new breaks
      if (breaks && breaks.length > 0) {
        const breaksData = breaks.map(b => ({
          semester_id: semesterId,
          name: b.name,
          start_date: b.startDate,
          end_date: b.endDate,
        }))

        const { error } = await supabase
          .from('semester_breaks')
          .insert(breaksData)

        if (error) throw error
      }

      return { error: null }
    } catch (error) {
      console.error('Failed to update breaks:', error)
      return { error }
    }
  }

  /**
   * Check if a date is during a break
   * @param {Date|string} date - Date to check
   * @returns {Promise<{isBreak: boolean, breakName: string|null}>}
   */
  async isBreakDay(date) {
    const userId = authService.getUserId()
    if (!userId) {
      return { isBreak: false, breakName: null }
    }

    try {
      const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0]

      const { data } = await supabase
        .from('semester_breaks')
        .select('name, start_date, end_date, semester:semesters!inner(user_id)')
        .eq('semesters.user_id', userId)
        .lte('start_date', dateStr)
        .gte('end_date', dateStr)
        .limit(1)
        .single()

      if (data) {
        return { isBreak: true, breakName: data.name }
      }

      return { isBreak: false, breakName: null }
    } catch (error) {
      return { isBreak: false, breakName: null }
    }
  }

  /**
   * Check if currently in exam period
   * @returns {Promise<boolean>}
   */
  async isExamPeriod() {
    const userId = authService.getUserId()
    if (!userId) return false

    try {
      const today = new Date().toISOString().split('T')[0]

      const { data } = await supabase
        .from('semesters')
        .select('exam_period_start, exam_period_end')
        .eq('user_id', userId)
        .eq('is_current', true)
        .single()

      if (!data || !data.exam_period_start || !data.exam_period_end) {
        return false
      }

      return today >= data.exam_period_start && today <= data.exam_period_end
    } catch (error) {
      return false
    }
  }
}

// Export singleton instance
const semestersService = new SemestersService()
export default semestersService
