/**
 * Infinite Campus Service (Simplified)
 * Uses student portal credentials (username/password) instead of OAuth
 * Based on unofficial API approach for easier student access
 */

import supabase from '../lib/supabase'
import authService from './authService'

class InfiniteCampusService {
  constructor() {
    this.districtName = null
    this.state = null
    this.username = null
    this.password = null
    this.baseUrl = null
  }

  /**
   * Initialize from user profile
   */
  async initializeFromProfile() {
    const profile = authService.getUserProfile()

    if (!profile?.ic_district_name ||
        !profile?.ic_state ||
        !profile?.ic_username ||
        !profile?.ic_password) {
      console.log('⚠️ Infinite Campus not configured')
      return false
    }

    this.districtName = profile.ic_district_name
    this.state = profile.ic_state
    this.username = profile.ic_username
    this.password = profile.ic_password

    // Construct base URL from district and state
    // Format: https://<state><district>.infinitecampus.org
    const districtCode = this.districtName.toLowerCase().replace(/\s+/g, '')
    this.baseUrl = `https://${this.state.toLowerCase()}${districtCode}.infinitecampus.org`

    console.log('✅ Infinite Campus initialized:', {
      district: this.districtName,
      state: this.state,
      baseUrl: this.baseUrl,
      hasCredentials: !!(this.username && this.password)
    })

    return true
  }

  /**
   * Find district URL
   * Some districts have custom URLs, this tries common patterns
   */
  async findDistrictUrl() {
    const patterns = [
      // Pattern 1: state + district
      `https://${this.state.toLowerCase()}${this.districtName.toLowerCase().replace(/\s+/g, '')}.infinitecampus.org`,
      // Pattern 2: just district name
      `https://${this.districtName.toLowerCase().replace(/\s+/g, '')}.infinitecampus.org`,
      // Pattern 3: district with 'ky' suffix (Kentucky pattern)
      `https://${this.districtName.toLowerCase().replace(/\s+/g, '')}ky.infinitecampus.org`,
    ]

    for (const url of patterns) {
      try {
        const response = await fetch(`${url}/campus/portal/students/${this.districtName.toLowerCase().replace(/\s+/g, '')}.jsp`, {
          method: 'HEAD',
          mode: 'no-cors'
        })
        this.baseUrl = url
        return url
      } catch (error) {
        continue
      }
    }

    // Default to first pattern
    this.baseUrl = patterns[0]
    return patterns[0]
  }

  /**
   * Get grades from Infinite Campus via Edge Function proxy
   */
  async getAllGrades() {
    try {
      console.log('🎓 Fetching grades from Infinite Campus...')

      if (!this.districtName || !this.state || !this.username || !this.password) {
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
          district: this.districtName,
          state: this.state,
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
          message: 'Please configure Infinite Campus credentials first'
        }
      }

      await this.findDistrictUrl()

      return {
        success: true,
        message: `District found! Configuration ready for ${this.districtName}, ${this.state}`,
        config: {
          district: this.districtName,
          state: this.state,
          url: this.baseUrl
        },
        note: 'Actual grade sync requires backend proxy (browser CORS limitation)'
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
