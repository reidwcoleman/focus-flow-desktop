// Canvas LMS API Integration Service
import supabase from '../lib/supabase'
import authService from './authService'
import assignmentsService from './assignmentsService'

const CANVAS_CONFIG = {
  baseUrl: '',
  accessToken: '',
}

export const canvasService = {
  // Initialize Canvas credentials from user profile
  async initializeFromProfile() {
    try {
      const { user } = await authService.getCurrentUser()
      if (!user) return false

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('canvas_url, canvas_token')
        .eq('id', user.id)
        .single()

      if (profile?.canvas_url && profile?.canvas_token) {
        const formattedUrl = profile.canvas_url.includes('http')
          ? profile.canvas_url
          : `https://${profile.canvas_url}`
        CANVAS_CONFIG.baseUrl = formattedUrl
        CANVAS_CONFIG.accessToken = profile.canvas_token
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to initialize Canvas from profile:', error)
      return false
    }
  },

  // Check if Canvas is connected
  async isConnected() {
    if (!CANVAS_CONFIG.baseUrl || !CANVAS_CONFIG.accessToken) {
      await this.initializeFromProfile()
    }
    return !!(CANVAS_CONFIG.baseUrl && CANVAS_CONFIG.accessToken)
  },

  // Clear Canvas credentials
  clearCredentials() {
    CANVAS_CONFIG.baseUrl = ''
    CANVAS_CONFIG.accessToken = ''
  },

  // Make authenticated API request to Canvas
  async makeRequest(endpoint, options = {}) {
    const connected = await this.isConnected()
    if (!connected) {
      throw new Error('Canvas not connected. Please configure Canvas in Account settings.')
    }

    const url = `${CANVAS_CONFIG.baseUrl}/api/v1${endpoint}`

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${CANVAS_CONFIG.accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        mode: 'cors',
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid Canvas token. Please check your token in Account settings.')
        }
        if (response.status === 403) {
          throw new Error('Access denied. Your token may not have the required permissions.')
        }
        throw new Error(`Canvas API error: ${response.status} - ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      // Check if it's a CORS error (expected in browser)
      if (error.message.includes('CORS') || error.name === 'TypeError') {
        // Silently fail for CORS errors - this is expected from GitHub Pages
        throw new Error('Canvas CORS: Browser blocked. Use Canvas directly at canvas.wcpss.net')
      }

      // Log other errors
      console.error('Canvas API request failed:', error)
      throw error
    }
  },

  // Get current user info
  async getCurrentUser() {
    return await this.makeRequest('/users/self')
  },

  // Get all active courses
  async getCourses() {
    return await this.makeRequest('/courses?enrollment_state=active&per_page=100')
  },

  // Get assignments for all courses
  async getAllAssignments() {
    try {
      const courses = await this.getCourses()
      const allAssignments = []

      for (const course of courses) {
        try {
          const assignments = await this.makeRequest(
            `/courses/${course.id}/assignments?per_page=100`
          )

          // Transform Canvas assignments to our format
          const transformedAssignments = assignments.map(assignment => ({
            id: `canvas-${assignment.id}`,
            title: assignment.name,
            subject: course.name,
            dueDate: assignment.due_at,
            description: assignment.description,
            points: assignment.points_possible,
            submissionTypes: assignment.submission_types,
            htmlUrl: assignment.html_url,
            courseId: course.id,
            submitted: assignment.has_submitted_submissions,
            graded: !!assignment.grade,
            grade: assignment.grade,
            source: 'canvas',
          }))

          allAssignments.push(...transformedAssignments)
        } catch (error) {
          // Silently skip CORS errors
          if (!error.message.includes('CORS')) {
            console.error(`Failed to fetch assignments for course ${course.id}:`, error)
          }
        }
      }

      return allAssignments
    } catch (error) {
      // Silently fail for CORS errors (expected from GitHub Pages)
      if (!error.message.includes('CORS')) {
        console.error('Failed to fetch Canvas assignments:', error)
      }
      return []
    }
  },

  // Get grades for all courses
  async getAllGrades() {
    try {
      const courses = await this.getCourses()
      const grades = []

      for (const course of courses) {
        try {
          const enrollments = await this.makeRequest(
            `/courses/${course.id}/enrollments?user_id=self`
          )

          for (const enrollment of enrollments) {
            if (enrollment.grades) {
              grades.push({
                courseId: course.id,
                courseName: course.name,
                currentGrade: enrollment.grades.current_grade,
                currentScore: enrollment.grades.current_score,
                finalGrade: enrollment.grades.final_grade,
                finalScore: enrollment.grades.final_score,
              })
            }
          }
        } catch (error) {
          // Silently skip CORS errors
          if (!error.message.includes('CORS')) {
            console.error(`Failed to fetch grades for course ${course.id}:`, error)
          }
        }
      }

      return grades
    } catch (error) {
      // Silently fail for CORS errors (expected from GitHub Pages)
      if (!error.message.includes('CORS')) {
        console.error('Failed to fetch Canvas grades:', error)
      }
      return []
    }
  },

  // Get upcoming assignments (due in next 7 days)
  async getUpcomingAssignments() {
    const allAssignments = await this.getAllAssignments()
    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    return allAssignments
      .filter(assignment => {
        if (!assignment.dueDate) return false
        const dueDate = new Date(assignment.dueDate)
        return dueDate >= now && dueDate <= sevenDaysFromNow && !assignment.submitted
      })
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
  },

  // Submit assignment (for future use)
  async submitAssignment(courseId, assignmentId, submission) {
    return await this.makeRequest(
      `/courses/${courseId}/assignments/${assignmentId}/submissions`,
      {
        method: 'POST',
        body: JSON.stringify({ submission }),
      }
    )
  },

  // Sync Canvas assignments to database
  async syncToDatabase() {
    try {
      console.log('🔄 Starting Canvas sync...')

      // Initialize connection
      await this.initializeFromProfile()

      // Fetch all assignments from Canvas
      const canvasAssignments = await this.getAllAssignments()
      console.log(`📥 Fetched ${canvasAssignments.length} assignments from Canvas`)

      if (canvasAssignments.length === 0) {
        return { success: true, synced: 0, message: 'No assignments found in Canvas' }
      }

      let syncedCount = 0
      const errors = []

      // Sync each assignment to database
      for (const assignment of canvasAssignments) {
        try {
          // Transform to database format
          const dbAssignment = {
            title: assignment.title,
            subject: assignment.subject,
            dueDate: assignment.dueDate ? new Date(assignment.dueDate).toISOString().split('T')[0] : null,
            description: assignment.description || null,
            priority: this.calculatePriority(assignment.dueDate),
            source: 'canvas',
            aiCaptured: false,
            timeEstimate: this.estimateTime(assignment.points),
          }

          // Create or update in database
          const result = await assignmentsService.createAssignment(dbAssignment)

          if (!result.error) {
            syncedCount++
            console.log(`✅ Synced: ${assignment.title}`)
          } else {
            errors.push({ title: assignment.title, error: result.error })
            console.error(`❌ Failed to sync: ${assignment.title}`, result.error)
          }
        } catch (error) {
          errors.push({ title: assignment.title, error: error.message })
          console.error(`❌ Error syncing ${assignment.title}:`, error)
        }
      }

      console.log(`✨ Sync complete: ${syncedCount}/${canvasAssignments.length} assignments synced`)

      return {
        success: true,
        synced: syncedCount,
        total: canvasAssignments.length,
        errors: errors.length > 0 ? errors : null,
        message: `Synced ${syncedCount} assignments from Canvas`
      }
    } catch (error) {
      console.error('❌ Canvas sync failed:', error)
      return {
        success: false,
        synced: 0,
        error: error.message,
        message: `Sync failed: ${error.message}`
      }
    }
  },

  // Calculate priority based on due date
  calculatePriority(dueDate) {
    if (!dueDate) return 'low'
    const now = new Date()
    const due = new Date(dueDate)
    const daysUntil = Math.ceil((due - now) / (1000 * 60 * 60 * 24))

    if (daysUntil <= 1) return 'high'
    if (daysUntil <= 3) return 'medium'
    return 'low'
  },

  // Estimate time based on points
  estimateTime(points) {
    if (!points) return '1h'
    if (points <= 10) return '30m'
    if (points <= 50) return '1h'
    if (points <= 100) return '2h'
    return '3h+'
  },
}

export default canvasService
