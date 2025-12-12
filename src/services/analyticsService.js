/**
 * Analytics Service
 * Calculates real user statistics from Supabase data
 */

import supabase from '../lib/supabase'
import authService from './authService'
import assignmentsService from './assignmentsService'
import calendarService from './calendarService'

class AnalyticsService {
  /**
   * Get comprehensive user analytics
   */
  async getAnalytics() {
    const userId = authService.getUserId()
    if (!userId) return this.getEmptyAnalytics()

    try {
      const [
        studyStats,
        assignmentStats,
        weeklyActivity,
        subjectBreakdown
      ] = await Promise.all([
        this.getStudyStats(),
        this.getAssignmentStats(),
        this.getWeeklyActivity(),
        this.getSubjectBreakdown()
      ])

      return {
        studyStats,
        assignmentStats,
        weeklyActivity,
        subjectBreakdown
      }
    } catch (error) {
      console.error('Failed to load analytics:', error)
      return this.getEmptyAnalytics()
    }
  }

  /**
   * Get study session statistics
   */
  async getStudyStats() {
    const userId = authService.getUserId()
    if (!userId) return { totalHours: 0, avgFocusScore: 0, sessionsCount: 0 }

    // Get study sessions from last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: sessions, error } = await supabase
      .from('study_sessions')
      .select('duration_minutes, focus_score, session_date')
      .eq('user_id', userId)
      .gte('session_date', thirtyDaysAgo.toISOString().split('T')[0])

    if (error) {
      console.error('Error fetching study sessions:', error)
      return { totalHours: 0, avgFocusScore: 0, sessionsCount: 0 }
    }

    const totalMinutes = sessions?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0
    const totalHours = (totalMinutes / 60).toFixed(1)
    const avgFocusScore = sessions?.length > 0
      ? Math.round(sessions.reduce((sum, s) => sum + (s.focus_score || 0), 0) / sessions.length)
      : 0

    return {
      totalHours: parseFloat(totalHours),
      avgFocusScore,
      sessionsCount: sessions?.length || 0
    }
  }

  /**
   * Get assignment statistics
   */
  async getAssignmentStats() {
    const { data: assignments } = await assignmentsService.getUpcomingAssignments()
    const formatted = assignmentsService.toAppFormatBatch(assignments || [])

    const total = formatted.length
    const completed = formatted.filter(a => a.completed).length
    const onTime = formatted.filter(a => {
      if (!a.completed || !a.dueDate) return false
      // Consider on-time if completed
      return true
    }).length

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
    const onTimeRate = total > 0 ? Math.round((onTime / total) * 100) : 100

    return {
      total,
      completed,
      completionRate,
      onTimeRate
    }
  }

  /**
   * Get weekly activity breakdown
   */
  async getWeeklyActivity() {
    const userId = authService.getUserId()
    if (!userId) return this.getEmptyWeeklyActivity()

    const today = new Date()
    const oneWeekAgo = new Date(today)
    oneWeekAgo.setDate(today.getDate() - 7)

    // Get calendar activities from past week
    const calendarData = await calendarService.getActivitiesByDateRange(
      oneWeekAgo.toISOString().split('T')[0],
      today.toISOString().split('T')[0]
    )

    // Get study sessions from past week
    const { data: sessions } = await supabase
      .from('study_sessions')
      .select('duration_minutes, focus_score, session_date')
      .eq('user_id', userId)
      .gte('session_date', oneWeekAgo.toISOString().split('T')[0])

    // Create 7-day array
    const weeklyData = []
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const dayIndex = date.getDay()

      // Calculate hours from calendar activities
      const dayActivities = calendarData?.filter(a =>
        a.activity_date === dateStr &&
        (a.activity_type === 'study' || a.activity_type === 'class')
      ) || []

      const calendarMinutes = dayActivities.reduce((sum, a) =>
        sum + (a.duration_minutes || 0), 0
      )

      // Calculate hours from study sessions
      const daySessions = sessions?.filter(s => s.session_date === dateStr) || []
      const sessionMinutes = daySessions.reduce((sum, s) =>
        sum + (s.duration_minutes || 0), 0
      )

      // Use the max of calendar or sessions to avoid double counting
      const totalMinutes = Math.max(calendarMinutes, sessionMinutes)
      const hours = totalMinutes / 60

      // Calculate avg focus score for the day
      const avgFocus = daySessions.length > 0
        ? Math.round(daySessions.reduce((sum, s) => sum + (s.focus_score || 85), 0) / daySessions.length)
        : 85

      weeklyData.push({
        day: dayNames[dayIndex],
        date: dateStr,
        hours: parseFloat(hours.toFixed(1)),
        focus: avgFocus
      })
    }

    return weeklyData
  }

  /**
   * Get subject breakdown
   */
  async getSubjectBreakdown() {
    const userId = authService.getUserId()
    if (!userId) return []

    // Get all study sessions
    const { data: sessions } = await supabase
      .from('study_sessions')
      .select('subject, duration_minutes')
      .eq('user_id', userId)

    // Get assignments
    const { data: assignments } = await assignmentsService.getUpcomingAssignments()

    // Aggregate by subject
    const subjectMap = {}

    // Add study time from sessions
    sessions?.forEach(session => {
      const subject = session.subject || 'Other'
      if (!subjectMap[subject]) {
        subjectMap[subject] = { studyHours: 0, assignmentCount: 0, completedCount: 0 }
      }
      subjectMap[subject].studyHours += (session.duration_minutes || 0) / 60
    })

    // Add assignment counts
    assignments?.forEach(assignment => {
      const subject = assignment.subject || 'Other'
      if (!subjectMap[subject]) {
        subjectMap[subject] = { studyHours: 0, assignmentCount: 0, completedCount: 0 }
      }
      subjectMap[subject].assignmentCount += 1
      if (assignment.completed) {
        subjectMap[subject].completedCount += 1
      }
    })

    // Convert to array and calculate completion rate
    const subjects = Object.entries(subjectMap).map(([subject, data]) => ({
      subject,
      studyHours: parseFloat(data.studyHours.toFixed(1)),
      assignmentCount: data.assignmentCount,
      completionRate: data.assignmentCount > 0
        ? Math.round((data.completedCount / data.assignmentCount) * 100)
        : 100
    }))

    // Sort by study hours
    return subjects.sort((a, b) => b.studyHours - a.studyHours)
  }

  /**
   * Empty analytics fallback
   */
  getEmptyAnalytics() {
    return {
      studyStats: { totalHours: 0, avgFocusScore: 0, sessionsCount: 0 },
      assignmentStats: { total: 0, completed: 0, completionRate: 0, onTimeRate: 100 },
      weeklyActivity: this.getEmptyWeeklyActivity(),
      subjectBreakdown: []
    }
  }

  /**
   * Empty weekly activity
   */
  getEmptyWeeklyActivity() {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const today = new Date()

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today)
      date.setDate(today.getDate() - (6 - i))
      return {
        day: dayNames[date.getDay()],
        date: date.toISOString().split('T')[0],
        hours: 0,
        focus: 0
      }
    })
  }

  /**
   * Log a study session manually
   */
  async logStudySession(sessionData) {
    const userId = authService.getUserId()
    if (!userId) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('study_sessions')
      .insert({
        user_id: userId,
        subject: sessionData.subject,
        duration_minutes: sessionData.durationMinutes,
        focus_score: sessionData.focusScore || 85,
        session_date: sessionData.date || new Date().toISOString().split('T')[0],
        session_start: sessionData.startTime,
        session_end: sessionData.endTime,
        notes: sessionData.notes
      })
      .select()
      .single()

    if (error) throw error
    return data
  }
}

export default new AnalyticsService()
