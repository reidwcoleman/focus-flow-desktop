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

  // Make authenticated API request to Canvas via Supabase Edge Function proxy
  async makeRequest(endpoint, options = {}) {
    const connected = await this.isConnected()
    if (!connected) {
      throw new Error('Canvas not connected. Please configure Canvas in Account settings.')
    }

    // Use Supabase Edge Function as proxy to bypass CORS
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
    const proxyUrl = `${SUPABASE_URL}/functions/v1/canvas-proxy`

    console.log('📡 Making Canvas API request:', {
      endpoint,
      url: CANVAS_CONFIG.baseUrl,
      proxyUrl,
      tokenPreview: CANVAS_CONFIG.accessToken ? `${CANVAS_CONFIG.accessToken.substring(0, 10)}...` : 'missing'
    })

    try {
      const response = await fetch(proxyUrl, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'canvas-url': CANVAS_CONFIG.baseUrl,
          'canvas-token': CANVAS_CONFIG.accessToken,
          'canvas-endpoint': endpoint,
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      })

      console.log('📊 Canvas API response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ Canvas API error response:', errorData)

        if (response.status === 401) {
          throw new Error(errorData.error || 'Invalid Canvas token. Please check that your token is correct and has not expired.')
        }
        if (response.status === 403) {
          throw new Error(errorData.error || 'Access denied. Your token may not have the required permissions.')
        }
        if (response.status === 404) {
          throw new Error(errorData.error || 'Canvas API endpoint not found. Please check your Canvas URL.')
        }

        throw new Error(errorData.error || `Canvas API error: ${response.status} - ${response.statusText}`)
      }

      const data = await response.json()
      console.log('✅ Canvas API request successful')
      return data
    } catch (error) {
      console.error('❌ Canvas API request failed:', error)
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

  // Sync courses to canvas_courses table
  async syncCourses(userId) {
    try {
      const courses = await this.getCourses()
      let syncedCount = 0

      for (const course of courses) {
        const courseData = {
          user_id: userId,
          canvas_course_id: course.id,
          name: course.name,
          course_code: course.course_code || null,
          term_name: course.term?.name || null,
          enrollment_type: course.enrollments?.[0]?.type || null,
          is_active: true,
          synced_at: new Date().toISOString()
        }

        // Upsert: insert or update on conflict
        const { error } = await supabase
          .from('canvas_courses')
          .upsert(courseData, {
            onConflict: 'user_id,canvas_course_id',
            ignoreDuplicates: false
          })

        if (!error) syncedCount++
      }

      return { synced: syncedCount, total: courses.length }
    } catch (error) {
      console.error('Failed to sync courses:', error)
      return { synced: 0, error: error.message }
    }
  },

  // Sync assignments with Canvas ID for deduplication
  async syncAssignments(userId) {
    try {
      const canvasAssignments = await this.getAllAssignments()
      let syncedCount = 0

      for (const assignment of canvasAssignments) {
        // Extract numeric Canvas assignment ID
        const canvasId = parseInt(assignment.id.replace('canvas-', ''))

        const assignmentData = {
          user_id: userId,
          canvas_assignment_id: canvasId,
          canvas_course_id: assignment.courseId,
          title: assignment.title,
          subject: assignment.subject,
          due_date: assignment.dueDate
            ? new Date(assignment.dueDate).toISOString().split('T')[0]
            : null,
          description: assignment.description || null,
          priority: this.calculatePriority(assignment.dueDate),
          source: 'canvas',
          points_possible: assignment.points || null,
          submitted: assignment.submitted || false,
          grade_received: assignment.grade || null,
          canvas_url: assignment.htmlUrl || null,
          time_estimate: this.estimateTime(assignment.points)
        }

        // Upsert: insert or update on conflict of (user_id, canvas_assignment_id)
        const { error } = await supabase
          .from('assignments')
          .upsert(assignmentData, {
            onConflict: 'user_id,canvas_assignment_id',
            ignoreDuplicates: false
          })

        if (!error) syncedCount++
      }

      return { synced: syncedCount, total: canvasAssignments.length }
    } catch (error) {
      console.error('Failed to sync assignments:', error)
      return { synced: 0, error: error.message }
    }
  },

  // Sync course grades to course_grades table
  async syncGrades(userId) {
    try {
      const grades = await this.getAllGrades()
      let syncedCount = 0

      for (const grade of grades) {
        const gradeData = {
          user_id: userId,
          canvas_course_id: grade.courseId,
          course_name: grade.courseName,
          current_grade: grade.currentGrade || null,
          current_score: grade.currentScore || null,
          final_grade: grade.finalGrade || null,
          final_score: grade.finalScore || null,
          synced_at: new Date().toISOString()
        }

        // Upsert: insert or update on conflict
        const { error } = await supabase
          .from('course_grades')
          .upsert(gradeData, {
            onConflict: 'user_id,canvas_course_id',
            ignoreDuplicates: false
          })

        if (!error) syncedCount++
      }

      return { synced: syncedCount, total: grades.length }
    } catch (error) {
      console.error('Failed to sync grades:', error)
      return { synced: 0, error: error.message }
    }
  },

  // Sync Canvas data to database with upsert (no duplicates)
  async syncToDatabase() {
    try {
      console.log('🔄 Starting Canvas sync...')

      // Initialize connection
      await this.initializeFromProfile()

      const { user } = await authService.getCurrentUser()
      if (!user) {
        return { success: false, error: 'No user logged in' }
      }

      // Sync courses first
      const courseResult = await this.syncCourses(user.id)
      console.log(`📚 Synced ${courseResult.synced} courses`)

      // Sync assignments
      const assignmentResult = await this.syncAssignments(user.id)
      console.log(`📝 Synced ${assignmentResult.synced} assignments`)

      // Sync grades
      const gradeResult = await this.syncGrades(user.id)
      console.log(`📊 Synced ${gradeResult.synced} course grades`)

      return {
        success: true,
        courses: courseResult.synced,
        assignments: assignmentResult.synced,
        grades: gradeResult.synced,
        message: `Synced ${courseResult.synced} courses, ${assignmentResult.synced} assignments, ${gradeResult.synced} grades`
      }
    } catch (error) {
      console.error('❌ Canvas sync failed:', error)
      return {
        success: false,
        error: error.message,
        message: `Sync failed: ${error.message}`
      }
    }
  },

  // Get synced courses from database
  async getSyncedCourses() {
    const { user } = await authService.getCurrentUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('canvas_courses')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Failed to get synced courses:', error)
      return []
    }
    return data || []
  },

  // Get synced grades from database
  async getSyncedGrades() {
    const { user } = await authService.getCurrentUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('course_grades')
      .select('*')
      .eq('user_id', user.id)
      .order('course_name')

    if (error) {
      console.error('Failed to get synced grades:', error)
      return []
    }
    return data || []
  },

  // Get Canvas assignments from database
  async getSyncedAssignments() {
    const { user } = await authService.getCurrentUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('user_id', user.id)
      .eq('source', 'canvas')
      .order('due_date', { ascending: true, nullsFirst: false })

    if (error) {
      console.error('Failed to get synced Canvas assignments:', error)
      return []
    }
    return data || []
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
