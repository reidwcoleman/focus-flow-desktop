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
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
    const proxyUrl = `${SUPABASE_URL}/functions/v1/canvas-proxy`

    console.log('📡 Making Canvas API request:', {
      endpoint,
      url: CANVAS_CONFIG.baseUrl,
      proxyUrl,
      tokenPreview: CANVAS_CONFIG.accessToken ? `${CANVAS_CONFIG.accessToken.substring(0, 10)}...` : 'missing',
      tokenLength: CANVAS_CONFIG.accessToken?.length || 0,
      fullCanvasUrl: `${CANVAS_CONFIG.baseUrl}/api/v1${endpoint}`
    })

    try {
      const response = await fetch(proxyUrl, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
          'canvas-url': CANVAS_CONFIG.baseUrl,
          'canvas-token': CANVAS_CONFIG.accessToken,
          'canvas-endpoint': endpoint,
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      })

      console.log('📊 Canvas API response status:', response.status)

      // Log the actual error from Canvas if available
      if (!response.ok) {
        const clonedResponse = response.clone()
        const errorText = await clonedResponse.text()
        console.log('🔍 Raw Canvas error response:', errorText)
      }

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

  // Get all active courses with pagination
  async getCourses() {
    const courses = []
    let page = 1
    let hasMore = true

    while (hasMore && page <= 10) { // Max 10 pages (1000 courses)
      const response = await this.makeRequest(
        `/courses?enrollment_state=active&per_page=100&page=${page}&include[]=term&include[]=total_students`
      )

      if (response && response.length > 0) {
        courses.push(...response)
        hasMore = response.length === 100 // If we got 100, there might be more
        page++
      } else {
        hasMore = false
      }
    }

    return courses
  },

  // Get assignments for all courses with submission/grade data (with pagination) - PARALLEL
  async getAllAssignments() {
    try {
      const courses = await this.getCourses()

      // Fetch assignments for ALL courses in parallel
      const assignmentPromises = courses.map(async (course) => {
        try {
          const courseAssignments = []
          let page = 1
          let hasMore = true

          while (hasMore && page <= 5) { // Max 5 pages per course (500 assignments)
            const assignments = await this.makeRequest(
              `/courses/${course.id}/assignments?include[]=submission&include[]=score_statistics&per_page=100&page=${page}`
            )

            if (!assignments || assignments.length === 0) {
              hasMore = false
              break
            }

            // Transform Canvas assignments to our format
            const transformedAssignments = assignments.map(assignment => {
              const submission = assignment.submission || {}

              return {
                id: `canvas-${assignment.id}`,
                title: assignment.name,
                subject: course.name,
                dueDate: assignment.due_at,
                description: assignment.description,
                points: assignment.points_possible,
                submissionTypes: assignment.submission_types,
                htmlUrl: assignment.html_url,
                courseId: course.id,
                // Enhanced submission/grade data
                submitted: submission.workflow_state === 'submitted' || submission.workflow_state === 'graded',
                graded: !!submission.grade,
                grade: submission.grade,
                score: submission.score,
                submissionId: submission.id,
                submittedAt: submission.submitted_at,
                gradedAt: submission.graded_at,
                late: submission.late,
                missing: submission.missing,
                excused: submission.excused,
                // Additional fields
                locked: assignment.locked_for_user,
                unlockAt: assignment.unlock_at,
                lockAt: assignment.lock_at,
                source: 'canvas',
              }
            })

            courseAssignments.push(...transformedAssignments)

            hasMore = assignments.length === 100 // If we got 100, there might be more
            page++
          }

          return courseAssignments
        } catch (error) {
          // Silently skip CORS errors
          if (!error.message.includes('CORS')) {
            console.error(`Failed to fetch assignments for course ${course.id}:`, error)
          }
          return []
        }
      })

      // Wait for all course assignment requests to complete in parallel
      const assignmentArrays = await Promise.all(assignmentPromises)
      const allAssignments = assignmentArrays.flat()

      return allAssignments
    } catch (error) {
      // Silently fail for CORS errors (expected from GitHub Pages)
      if (!error.message.includes('CORS')) {
        console.error('Failed to fetch Canvas assignments:', error)
      }
      return []
    }
  },

  // Get grades for all courses with enhanced data - PARALLEL
  async getAllGrades() {
    try {
      const courses = await this.getCourses()

      // Fetch grades for ALL courses in parallel
      const gradePromises = courses.map(async (course) => {
        try {
          // Get user enrollments with grades
          const enrollments = await this.makeRequest(
            `/courses/${course.id}/enrollments?user_id=self&type[]=StudentEnrollment`
          )

          const courseGrades = []
          for (const enrollment of enrollments) {
            if (enrollment.grades) {
              courseGrades.push({
                courseId: course.id,
                courseName: course.name,
                courseCode: course.course_code,
                currentGrade: enrollment.grades.current_grade,
                currentScore: enrollment.grades.current_score,
                finalGrade: enrollment.grades.final_grade,
                finalScore: enrollment.grades.final_score,
                // Additional grade info
                unpostedCurrentGrade: enrollment.grades.unposted_current_grade,
                unpostedCurrentScore: enrollment.grades.unposted_current_score,
                unpostedFinalGrade: enrollment.grades.unposted_final_grade,
                unpostedFinalScore: enrollment.grades.unposted_final_score,
              })
            }
          }
          return courseGrades
        } catch (error) {
          // Silently skip CORS errors
          if (!error.message.includes('CORS')) {
            console.error(`Failed to fetch grades for course ${course.id}:`, error)
          }
          return []
        }
      })

      // Wait for all grade requests to complete in parallel
      const gradeArrays = await Promise.all(gradePromises)
      const grades = gradeArrays.flat()

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

  // Sync courses to canvas_courses table - BATCH UPSERT
  async syncCourses(userId) {
    try {
      const courses = await this.getCourses()

      console.log(`📚 Syncing ${courses.length} courses...`)

      // Prepare all course data
      const courseDataArray = courses.map(course => ({
        user_id: userId,
        canvas_course_id: course.id,
        name: course.name,
        course_code: course.course_code || null,
        term_name: course.term?.name || null,
        enrollment_type: course.enrollments?.[0]?.type || null,
        is_active: true,
        synced_at: new Date().toISOString()
      }))

      // Batch upsert all courses at once (much faster!)
      const { data, error } = await supabase
        .from('canvas_courses')
        .upsert(courseDataArray, {
          onConflict: 'user_id,canvas_course_id',
          ignoreDuplicates: false
        })

      if (error) {
        console.error('Failed to sync courses:', error)
        return { synced: 0, total: courses.length, error: error.message }
      }

      console.log(`✅ Successfully synced ${courses.length} courses`)
      return { synced: courses.length, total: courses.length }
    } catch (error) {
      console.error('Failed to sync courses:', error)
      return { synced: 0, error: error.message }
    }
  },

  // Sync assignments with Canvas ID for deduplication - BATCH UPSERT
  async syncAssignments(userId) {
    try {
      const canvasAssignments = await this.getAllAssignments()

      console.log(`📝 Syncing ${canvasAssignments.length} assignments...`)

      // Prepare all assignment data
      const assignmentDataArray = canvasAssignments.map(assignment => {
        const canvasId = parseInt(assignment.id.replace('canvas-', ''))

        return {
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
      })

      // Batch upsert all assignments at once (much faster!)
      const { data, error } = await supabase
        .from('assignments')
        .upsert(assignmentDataArray, {
          onConflict: 'user_id,canvas_assignment_id',
          ignoreDuplicates: false
        })

      if (error) {
        console.error('Failed to sync assignments:', error)
        return { synced: 0, total: canvasAssignments.length, error: error.message }
      }

      console.log(`✅ Successfully synced ${canvasAssignments.length} assignments`)
      return { synced: canvasAssignments.length, total: canvasAssignments.length }
    } catch (error) {
      console.error('Failed to sync assignments:', error)
      return { synced: 0, error: error.message }
    }
  },

  // Sync course grades to course_grades table with enhanced data - BATCH UPSERT
  async syncGrades(userId) {
    try {
      const grades = await this.getAllGrades()

      console.log(`📊 Syncing ${grades.length} course grades...`)

      // Prepare all grade data
      const gradeDataArray = grades.map(grade => ({
        user_id: userId,
        canvas_course_id: grade.courseId,
        course_name: grade.courseName,
        course_code: grade.courseCode || null,
        current_grade: grade.currentGrade || null,
        current_score: grade.currentScore || null,
        final_grade: grade.finalGrade || null,
        final_score: grade.finalScore || null,
        synced_at: new Date().toISOString()
      }))

      // Batch upsert all grades at once (much faster!)
      const { data, error } = await supabase
        .from('course_grades')
        .upsert(gradeDataArray, {
          onConflict: 'user_id,canvas_course_id',
          ignoreDuplicates: false
        })

      if (error) {
        console.error('Failed to sync grades:', error)
        return { synced: 0, total: grades.length, error: error.message }
      }

      console.log(`✅ Successfully synced ${grades.length} grades`)
      return { synced: grades.length, total: grades.length }
    } catch (error) {
      console.error('Failed to sync grades:', error)
      return { synced: 0, error: error.message }
    }
  },

  // Delete old past-due assignments (over 2 weeks old)
  async deleteOldPastDueAssignments(userId) {
    try {
      const twoWeeksAgo = new Date()
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
      const twoWeeksAgoStr = twoWeeksAgo.toISOString().split('T')[0]

      console.log(`🗑️  Cleaning up assignments past due before ${twoWeeksAgoStr}...`)

      const { data, error } = await supabase
        .from('assignments')
        .delete()
        .eq('user_id', userId)
        .eq('source', 'canvas')
        .lt('due_date', twoWeeksAgoStr)
        .eq('submitted', false) // Only delete unsubmitted ones

      if (error) {
        console.error('Failed to delete old assignments:', error)
        return { deleted: 0, error: error.message }
      }

      const deletedCount = data?.length || 0
      if (deletedCount > 0) {
        console.log(`✅ Deleted ${deletedCount} old past-due assignments`)
      } else {
        console.log(`✅ No old past-due assignments to delete`)
      }

      return { deleted: deletedCount }
    } catch (error) {
      console.error('Failed to delete old assignments:', error)
      return { deleted: 0, error: error.message }
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

      // Delete old past-due assignments FIRST (before syncing new data)
      const cleanupResult = await this.deleteOldPastDueAssignments(user.id)

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
        deleted: cleanupResult.deleted,
        message: `Synced ${courseResult.synced} courses, ${assignmentResult.synced} assignments, ${gradeResult.synced} grades${cleanupResult.deleted > 0 ? ` (cleaned up ${cleanupResult.deleted} old assignments)` : ''}`
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

    // Transform to match UI format
    return (data || []).map(course => ({
      id: course.canvas_course_id,
      name: course.name,
      course_code: course.course_code,
      term: course.term_name ? { name: course.term_name } : null,
      enrollments: course.enrollment_type ? [{ type: course.enrollment_type }] : [],
      syncedAt: course.synced_at,
    }))
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

    console.log(`📊 Loaded ${data?.length || 0} grades from database`)

    // Transform to match UI format (snake_case to camelCase)
    return (data || []).map(grade => ({
      courseId: grade.canvas_course_id,
      courseName: grade.course_name,
      courseCode: grade.course_code,
      currentGrade: grade.current_grade,
      currentScore: grade.current_score,
      finalGrade: grade.final_grade,
      finalScore: grade.final_score,
      syncedAt: grade.synced_at,
    }))
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

    // Transform to Canvas UI format (not the same as app format)
    return (data || []).map(assignment => ({
      id: `canvas-${assignment.canvas_assignment_id}`,
      title: assignment.title,
      subject: assignment.subject,
      dueDate: assignment.due_date,
      description: assignment.description,
      points: assignment.points_possible,
      courseId: assignment.canvas_course_id,
      submitted: assignment.submitted,
      grade: assignment.grade_received,
      graded: !!assignment.grade_received,
      htmlUrl: assignment.canvas_url,
      source: 'canvas',
    }))
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
