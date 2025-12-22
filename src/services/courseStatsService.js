// Course Stats Service - Track study time and assignments per course
import supabase from '../lib/supabase'
import authService from './authService'

const courseStatsService = {
  // Record a completed assignment for a course
  async recordAssignmentCompleted(courseName, courseCode = null) {
    try {
      const { user } = await authService.getCurrentUser()
      if (!user) throw new Error('Not authenticated')

      // Upsert course stats
      const { data, error } = await supabase
        .from('course_stats')
        .upsert({
          user_id: user.id,
          course_name: courseName,
          course_code: courseCode,
          assignments_completed: 1,
          last_activity_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,course_name',
          ignoreDuplicates: false
        })
        .select()
        .single()

      // If record exists, increment the count
      if (data) {
        const { error: updateError } = await supabase.rpc('increment_course_assignment', {
          p_user_id: user.id,
          p_course_name: courseName
        })

        if (updateError) {
          console.error('Failed to increment assignment count:', updateError)
        }
      }

      if (error && error.code !== '23505') {
        throw error
      }

      console.log(`✅ Recorded assignment completion for ${courseName}`)
    } catch (error) {
      console.error('Failed to record assignment completion:', error)
    }
  },

  // Record a focus session for a course
  async recordFocusSession(courseName, minutes, courseCode = null) {
    try {
      const { user } = await authService.getCurrentUser()
      if (!user) throw new Error('Not authenticated')

      // Check if record exists
      const { data: existing } = await supabase
        .from('course_stats')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_name', courseName)
        .single()

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('course_stats')
          .update({
            focus_sessions: existing.focus_sessions + 1,
            total_focus_minutes: existing.total_focus_minutes + minutes,
            last_activity_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('course_name', courseName)

        if (error) throw error
      } else {
        // Create new record
        const { error } = await supabase
          .from('course_stats')
          .insert({
            user_id: user.id,
            course_name: courseName,
            course_code: courseCode,
            focus_sessions: 1,
            total_focus_minutes: minutes,
            last_activity_at: new Date().toISOString()
          })

        if (error) throw error
      }

      console.log(`✅ Recorded ${minutes} min focus session for ${courseName}`)
    } catch (error) {
      console.error('Failed to record focus session:', error)
    }
  },

  // Get all course stats for user
  async getCourseStats() {
    try {
      const { user } = await authService.getCurrentUser()
      if (!user) return []

      const { data, error } = await supabase
        .from('course_stats')
        .select('*')
        .eq('user_id', user.id)
        .order('total_focus_minutes', { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Failed to get course stats:', error)
      return []
    }
  },

  // Get stats for a specific course
  async getCourseStatsByName(courseName) {
    try {
      const { user } = await authService.getCurrentUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('course_stats')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_name', courseName)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      return data || null
    } catch (error) {
      console.error('Failed to get course stats:', error)
      return null
    }
  },

  // Get top courses by study time
  async getTopCoursesByTime(limit = 5) {
    try {
      const { user } = await authService.getCurrentUser()
      if (!user) return []

      const { data, error } = await supabase
        .from('course_stats')
        .select('*')
        .eq('user_id', user.id)
        .order('total_focus_minutes', { ascending: false })
        .limit(limit)

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Failed to get top courses:', error)
      return []
    }
  },

  // Get total stats summary
  async getTotalStats() {
    try {
      const stats = await this.getCourseStats()

      const total = stats.reduce((acc, course) => {
        return {
          totalCourses: acc.totalCourses + 1,
          totalAssignments: acc.totalAssignments + course.assignments_completed,
          totalSessions: acc.totalSessions + course.focus_sessions,
          totalMinutes: acc.totalMinutes + course.total_focus_minutes
        }
      }, {
        totalCourses: 0,
        totalAssignments: 0,
        totalSessions: 0,
        totalMinutes: 0
      })

      return total
    } catch (error) {
      console.error('Failed to get total stats:', error)
      return {
        totalCourses: 0,
        totalAssignments: 0,
        totalSessions: 0,
        totalMinutes: 0
      }
    }
  }
}

export default courseStatsService
