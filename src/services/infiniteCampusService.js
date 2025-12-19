/**
 * Infinite Campus Service (Simplified)
 * Uses student portal credentials (username/password) instead of OAuth
 * Based on unofficial API approach for easier student access
 */

import supabase from '../lib/supabase'
import authService from './authService'

class InfiniteCampusService {
  constructor() {
    this.lunchNumber = null
    this.username = null
    this.password = null
    this.baseUrl = null
  }

  /**
   * Initialize from user profile
   */
  async initializeFromProfile() {
    const profile = authService.getUserProfile()

    if (!profile?.ic_lunch_number ||
        !profile?.ic_username ||
        !profile?.ic_password) {
      console.log('⚠️ Infinite Campus not configured')
      return false
    }

    this.lunchNumber = profile.ic_lunch_number
    this.username = profile.ic_username
    this.password = profile.ic_password

    console.log('✅ Infinite Campus initialized:', {
      lunchNumber: this.lunchNumber,
      username: this.username,
      hasCredentials: !!(this.username && this.password)
    })

    return true
  }

  /**
   * Find district URL (deprecated for NCEdCloud)
   * Wake County uses NCEdCloud SSO, not direct Infinite Campus URLs
   */
  async findDistrictUrl() {
    // For Wake County with NCEdCloud, we use the fixed URL
    this.baseUrl = 'https://920.ncsis.gov'
    return this.baseUrl
  }

  /**
   * Get grades from Infinite Campus via Edge Function proxy
   */
  async getAllGrades() {
    try {
      console.log('🎓 Fetching grades from Infinite Campus...')

      if (!this.lunchNumber || !this.username || !this.password) {
        throw new Error('Infinite Campus credentials not configured')
      }

      // Get Supabase auth token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      // Call Edge Function proxy
      const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/infinite-campus-proxy`

      console.log('📡 Calling Edge Function proxy...')

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'getGrades',
          lunchNumber: this.lunchNumber,
          username: this.username,
          password: this.password
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch grades')
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error('Grade fetch failed')
      }

      console.log(`✅ Retrieved ${data.grades.length} course grades`)

      return data.grades.map(grade => ({
        courseName: grade.courseName,
        courseCode: grade.courseCode,
        teacher: grade.teacher,
        period: grade.period,
        currentScore: grade.currentScore,
        letterGrade: grade.letterGrade || this.scoreToLetterGrade(grade.currentScore)
      }))

    } catch (error) {
      console.error('❌ Failed to fetch grades:', error)
      throw error
    }
  }

  /**
   * Calculate letter grade from percentage
   */
  scoreToLetterGrade(score) {
    if (score >= 90) return 'A'
    if (score >= 80) return 'B'
    if (score >= 70) return 'C'
    if (score >= 60) return 'D'
    return 'F'
  }

  /**
   * Sync grades to database
   */
  async syncGrades(userId) {
    try {
      const grades = await this.getAllGrades()
      let syncedCount = 0

      for (const grade of grades) {
        const gradeData = {
          user_id: userId,
          source: 'infinite_campus',
          class_id: grade.classId || grade.courseName,
          class_name: grade.courseName,
          class_code: grade.courseCode,
          current_score: grade.currentScore,
          letter_grade: grade.letterGrade,
          synced_at: new Date().toISOString()
        }

        const { error } = await supabase
          .from('infinite_campus_grades')
          .upsert(gradeData, {
            onConflict: 'user_id,class_id',
            ignoreDuplicates: false
          })

        if (!error) syncedCount++
      }

      return { synced: syncedCount, total: grades.length }
    } catch (error) {
      console.error('Failed to sync Infinite Campus grades:', error)
      return { synced: 0, error: error.message }
    }
  }

  /**
   * Get synced grades from database
   */
  async getSyncedGrades() {
    const { user } = await authService.getCurrentUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('infinite_campus_grades')
      .select('*')
      .eq('user_id', user.id)
      .order('class_name')

    if (error) {
      console.error('Failed to get synced grades:', error)
      return []
    }

    return data || []
  }

  /**
   * Test connection
   */
  async testConnection() {
    try {
      const initialized = await this.initializeFromProfile()

      if (!initialized) {
        return {
          success: false,
          message: 'Please configure Infinite Campus credentials (lunch number, username, password)'
        }
      }

      await this.findDistrictUrl()

      return {
        success: true,
        message: `✅ NCEdCloud credentials configured! Ready to sync grades for lunch number ${this.lunchNumber}`,
        config: {
          lunchNumber: this.lunchNumber,
          username: this.username,
          url: this.baseUrl
        },
        note: 'Click "Sync Grades" to fetch your grades from Infinite Campus via NCEdCloud'
      }
    } catch (error) {
      return {
        success: false,
        message: `Connection test failed: ${error.message}`
      }
    }
  }

  /**
   * Add manual grade (for testing/manual entry)
   */
  async addManualGrade(userId, gradeData) {
    try {
      const data = {
        user_id: userId,
        source: 'infinite_campus_manual',
        class_id: gradeData.classId || `manual_${Date.now()}`,
        class_name: gradeData.className,
        class_code: gradeData.classCode || null,
        current_score: gradeData.score,
        letter_grade: this.scoreToLetterGrade(gradeData.score),
        synced_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('infinite_campus_grades')
        .insert(data)

      if (error) throw error

      return { success: true, message: 'Grade added successfully' }
    } catch (error) {
      console.error('Failed to add manual grade:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Delete a grade
   */
  async deleteGrade(gradeId) {
    try {
      const { user } = await authService.getCurrentUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('infinite_campus_grades')
        .delete()
        .eq('id', gradeId)
        .eq('user_id', user.id)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Failed to delete grade:', error)
      return { success: false, error: error.message }
    }
  }
}

export default new InfiniteCampusService()
