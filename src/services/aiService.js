/**
 * AI Service for Focus Flow
 * Uses Supabase Edge Function to securely proxy AI requests
 */

import supabase from '../lib/supabase'
import authService from './authService'
import assignmentsService from './assignmentsService'
import calendarService from './calendarService'

const AI_CONFIG = {
  // Supabase Edge Function URL
  // Replace with your actual Supabase project URL
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  edgeFunctionUrl: import.meta.env.VITE_SUPABASE_URL
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`
    : null,

  // Fallback: Direct Groq API (for local development)
  useDirectApi: import.meta.env.VITE_USE_DIRECT_API === 'true',
  groqApiKey: import.meta.env.VITE_GROQ_API_KEY || '',
}

// Usage limits
const FREE_TIER_LIMIT = 3
const PRO_TIER_LIMIT = 250

class AIService {
  constructor() {
    this.conversationHistory = []
    this.userContext = null
    // Base system prompt (will be enhanced with user context)
    this.baseSystemPrompt = `You are an expert AI tutor for students on a mobile app. Your role is to help with homework, concepts, and studying.

CRITICAL - Mobile optimization rules:
- Keep responses BRIEF (1-2 short paragraphs max, 3-5 sentences)
- Use bullet points and lists for clarity
- Be direct and to-the-point
- Avoid lengthy explanations unless specifically asked
- Use simple formatting (**, -, numbers only)

Guidelines:
- Answer the specific question asked
- Give examples when helpful
- Be encouraging but concise
- If topic is complex, give overview first, offer to elaborate

Remember: Students are on mobile - keep it SHORT and scannable!

**UNDERSTANDING THE APP:**
The student has access to two main organizational systems:
1. **ASSIGNMENTS** (Dashboard/Homepage) - Tasks that need to be completed: homework, projects, tests, papers
2. **CALENDAR/PLANNING** (Planning Tab) - Time-blocked schedule: classes, study sessions, events, breaks

When students ask:
- "What assignments do I have?" → Refer to ASSIGNMENTS section
- "What's on my calendar/schedule/planning?" → Refer to CALENDAR section
- "What should I work on?" → Consider both ASSIGNMENTS and CALENDAR together`
  }

  /**
   * Get system prompt with user context
   */
  getSystemPrompt() {
    if (!this.userContext) {
      return this.baseSystemPrompt
    }

    let contextPrompt = this.baseSystemPrompt + '\n\n**STUDENT CONTEXT:**\n'

    // Add student stats summary
    if (this.userContext.stats) {
      const s = this.userContext.stats
      contextPrompt += `\n📊 STUDENT OVERVIEW:\n`
      contextPrompt += `- Current Study Streak: ${s.currentStreak} day${s.currentStreak !== 1 ? 's' : ''} (Best: ${s.longestStreak})\n`
      contextPrompt += `- Assignments: ${s.totalAssignments} total (${s.pendingAssignments} pending, ${s.completedAssignments} done${s.overdueAssignments > 0 ? `, ${s.overdueAssignments} overdue` : ''})\n`
      contextPrompt += `- Study Hours This Week: ${s.studyHoursThisWeek} hours\n`
      contextPrompt += `- Active Subjects: ${s.activeSubjects.length > 0 ? s.activeSubjects.join(', ') : 'None'}\n`
      contextPrompt += `- Study Resources: ${s.totalNotes} notes, ${s.totalDecks} flashcard decks\n`
      contextPrompt += `- Upcoming Events (Next 7 Days): ${s.upcomingEventsCount}\n`
    }

    // Add upcoming assignments (Dashboard - tasks to complete)
    if (this.userContext.upcoming?.assignments && this.userContext.upcoming.assignments.length > 0) {
      contextPrompt += `\n📚 UPCOMING ASSIGNMENTS (Next to Work On):\n`
      this.userContext.upcoming.assignments.forEach(assignment => {
        const dueDate = assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'No due date'
        const priority = assignment.priority ? `[${assignment.priority.toUpperCase()}]` : ''
        const estimate = assignment.timeEstimate ? `~${assignment.timeEstimate}` : ''
        contextPrompt += `- ${priority} ${assignment.title} (${assignment.subject || 'General'}) - Due: ${dueDate} ${estimate}\n`
      })
    } else {
      contextPrompt += `\n📚 UPCOMING ASSIGNMENTS: All caught up! 🎉\n`
    }

    // Add upcoming calendar/schedule (next 7 days)
    if (this.userContext.upcoming?.events && this.userContext.upcoming.events.length > 0) {
      contextPrompt += `\n📅 UPCOMING SCHEDULE (Next 7 Days - ${this.userContext.upcoming.events.length} events):\n`
      this.userContext.upcoming.events.forEach(activity => {
        const date = new Date(activity.activity_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        const time = activity.start_time ? activity.start_time.slice(0, 5) : 'No time'
        const duration = activity.duration_minutes ? `${activity.duration_minutes}min` : ''
        const type = activity.activity_type || 'event'
        const subject = activity.subject ? `(${activity.subject})` : ''
        contextPrompt += `- ${date} at ${time}: ${activity.title} ${subject} - ${duration} [${type}]\n`
      })
    } else {
      contextPrompt += `\n📅 UPCOMING SCHEDULE: No scheduled activities in the next 7 days\n`
    }

    // Add ALL calendar activities (full schedule context)
    if (this.userContext.calendar && this.userContext.calendar.length > 0) {
      const totalEvents = this.userContext.calendar.length
      const upcomingCount = this.userContext.upcoming?.events?.length || 0
      const pastEvents = totalEvents - upcomingCount
      contextPrompt += `\n📆 FULL CALENDAR (Total ${totalEvents} activities: ${upcomingCount} upcoming, ${pastEvents} past):\n`

      // Group by date for better readability
      const eventsByDate = {}
      this.userContext.calendar.forEach(activity => {
        const dateKey = activity.activity_date
        if (!eventsByDate[dateKey]) eventsByDate[dateKey] = []
        eventsByDate[dateKey].push(activity)
      })

      // Show activities grouped by date (limit to 30 most recent/upcoming)
      const sortedDates = Object.keys(eventsByDate).sort()
      sortedDates.slice(0, 30).forEach(dateKey => {
        const date = new Date(dateKey + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        contextPrompt += `\n${date}:\n`
        eventsByDate[dateKey].forEach(activity => {
          const time = activity.start_time ? activity.start_time.slice(0, 5) : 'All day'
          const duration = activity.duration_minutes ? `(${activity.duration_minutes}min)` : ''
          const subject = activity.subject ? `[${activity.subject}]` : ''
          contextPrompt += `  • ${time}: ${activity.title} ${subject} ${duration}\n`
        })
      })

      if (sortedDates.length > 30) {
        contextPrompt += `\n... and ${sortedDates.length - 30} more dates with activities\n`
      }
    }

    // Add grades/classes info
    if (this.userContext.grades && this.userContext.grades.length > 0) {
      contextPrompt += `\nClasses & Current Grades:\n`
      this.userContext.grades.forEach(g => {
        contextPrompt += `- ${g.subject}: ${g.current}%\n`
      })
    }

    // Add recent notes
    if (this.userContext.notes && this.userContext.notes.length > 0) {
      contextPrompt += `\nRecent Study Notes (${this.userContext.notes.length} total):\n`
      this.userContext.notes.slice(0, 3).forEach(note => {
        contextPrompt += `- ${note.subject}: ${note.title}\n`
      })
    }

    // Add flashcard decks
    if (this.userContext.decks && this.userContext.decks.length > 0) {
      contextPrompt += `\nFlashcard Decks (${this.userContext.decks.length} total):\n`
      this.userContext.decks.slice(0, 3).forEach(deck => {
        contextPrompt += `- ${deck.subject}: ${deck.title} (${deck.cardCount} cards)\n`
      })
    }

    contextPrompt += `\n**IMPORTANT INSTRUCTIONS:**
- When asked about "assignments" or "homework" → Reference the ASSIGNMENTS section above
- When asked about "calendar", "schedule", "planning", or "what's coming up" → Reference the CALENDAR/PLANNING section
- When helping prioritize → Consider both assignments (what to work on) and calendar (when to work on it)
- Always use this context to give PERSONALIZED advice specific to their actual work!`

    return contextPrompt
  }

  /**
   * Load user context (assignments, calendar, notes, decks, grades)
   */
  async loadUserContext() {
    const userId = authService.getUserId()
    if (!userId) {
      this.userContext = null
      return
    }

    try {
      // Load upcoming assignments
      const { data: assignmentsData } = await assignmentsService.getUpcomingAssignments()
      const assignments = assignmentsService.toAppFormatBatch(assignmentsData || [])

      // Load ALL calendar activities (past 7 days + next 60 days for full context)
      const today = new Date()
      today.setHours(0, 0, 0, 0) // Start of today in local timezone

      const pastWeek = new Date(today)
      pastWeek.setDate(today.getDate() - 7)

      const futureRange = new Date(today)
      futureRange.setDate(today.getDate() + 60)

      // Format dates as YYYY-MM-DD in local timezone
      const formatLocalDate = (date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }

      const calendarData = await calendarService.getActivitiesByDateRange(
        formatLocalDate(pastWeek),
        formatLocalDate(futureRange)
      )

      console.log('📅 Loaded calendar data for AI:', calendarData)
      console.log('📅 Date range:', formatLocalDate(pastWeek), 'to', formatLocalDate(futureRange))

      // Load notes
      const { data: notes } = await supabase
        .from('notes')
        .select('id, title, subject, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)

      // Load flashcard decks with card count
      const { data: decks } = await supabase
        .from('decks')
        .select('id, title, subject, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)

      // Get card counts for each deck
      if (decks && decks.length > 0) {
        for (const deck of decks) {
          const { count } = await supabase
            .from('flashcards')
            .select('*', { count: 'exact', head: true })
            .eq('deck_id', deck.id)
          deck.cardCount = count || 0
        }
      }

      // Load grades from Canvas when available
      const grades = []

      // Get study streak information
      const profile = authService.getUserProfile()
      const streak = {
        current: profile?.current_streak || 0,
        longest: profile?.longest_streak || 0
      }

      // Calculate completed vs pending assignments
      const completedCount = assignments.filter(a => a.completed).length
      const pendingCount = assignments.filter(a => !a.completed).length
      const overdueCount = assignments.filter(a => {
        if (a.completed) return false
        if (!a.dueDate) return false
        return new Date(a.dueDate) < new Date()
      }).length

      // Get upcoming calendar events (today + next 7 days = 8 days total)
      const todayStart = new Date(today)
      const weekFromNow = new Date(today)
      weekFromNow.setDate(today.getDate() + 7)

      const upcomingEvents = calendarData.filter(event => {
        const eventDate = new Date(event.activity_date + 'T00:00:00') // Parse as local date
        return eventDate >= todayStart && eventDate <= weekFromNow
      })

      console.log('📅 Today:', formatLocalDate(todayStart))
      console.log('📅 Week from now:', formatLocalDate(weekFromNow))
      console.log('📅 Upcoming events:', upcomingEvents.length)

      // Calculate total study hours this week
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      const studyHoursThisWeek = calendarData
        .filter(a => {
          const aDate = new Date(a.activity_date)
          return aDate >= weekStart && a.activity_type === 'study'
        })
        .reduce((sum, a) => sum + (a.duration_minutes || 0), 0) / 60

      // Get subjects from assignments and activities
      const allSubjects = new Set([
        ...assignments.map(a => a.subject).filter(Boolean),
        ...calendarData.map(a => a.subject).filter(Boolean)
      ])

      this.userContext = {
        // Core data
        assignments: assignments || [],
        calendar: calendarData || [],
        notes: notes || [],
        decks: decks || [],
        grades,

        // Analytics & Stats
        stats: {
          totalAssignments: assignments.length,
          completedAssignments: completedCount,
          pendingAssignments: pendingCount,
          overdueAssignments: overdueCount,
          totalNotes: notes?.length || 0,
          totalDecks: decks?.length || 0,
          currentStreak: streak.current,
          longestStreak: streak.longest,
          studyHoursThisWeek: Math.round(studyHoursThisWeek * 10) / 10,
          upcomingEventsCount: upcomingEvents.length,
          activeSubjects: Array.from(allSubjects)
        },

        // Upcoming items (next 7 days)
        upcoming: {
          assignments: assignments.filter(a => !a.completed).slice(0, 5),
          events: upcomingEvents.slice(0, 10)
        }
      }
    } catch (error) {
      console.error('Failed to load user context:', error)
      this.userContext = null
    }
  }

  /**
   * Get current usage count from Supabase
   */
  async getUsageCount() {
    const profile = authService.getUserProfile()
    if (!profile) {
      // Fallback to localStorage for non-authenticated users
      return parseInt(localStorage.getItem('ai_chat_usage_count') || '0', 10)
    }
    return profile.ai_chats_used_this_month || 0
  }

  /**
   * Increment usage count in Supabase
   */
  async incrementUsage() {
    const userId = authService.getUserId()
    if (!userId) {
      // Fallback to localStorage
      const current = await this.getUsageCount()
      localStorage.setItem('ai_chat_usage_count', String(current + 1))
      return current + 1
    }

    try {
      const { data, error } = await supabase.rpc('increment_ai_usage', {
        user_uuid: userId
      })

      if (error) throw error

      // Refresh user profile to get updated count
      await authService.refreshUserProfile()

      return data
    } catch (error) {
      console.error('Failed to increment usage:', error)
      return await this.getUsageCount()
    }
  }

  /**
   * Check if user has remaining requests
   */
  async hasRemainingRequests() {
    const usage = await this.getUsageCount()
    const limit = authService.getAiChatLimit()
    return usage < limit
  }

  /**
   * Get remaining requests
   */
  async getRemainingRequests() {
    const usage = await this.getUsageCount()
    const limit = authService.getAiChatLimit()
    return Math.max(0, limit - usage)
  }

  /**
   * Get usage limits
   */
  getLimits() {
    return {
      free: FREE_TIER_LIMIT,
      pro: PRO_TIER_LIMIT,
    }
  }

  /**
   * Check if AI service is properly configured
   */
  isConfigured() {
    // Check if using backend (recommended)
    if (AI_CONFIG.edgeFunctionUrl) {
      return true
    }

    // Check if using direct API (local dev only)
    if (AI_CONFIG.useDirectApi && AI_CONFIG.groqApiKey) {
      return true
    }

    return false
  }

  /**
   * Get the current provider name for display
   */
  getProviderName() {
    if (AI_CONFIG.edgeFunctionUrl) {
      return 'Groq Llama 3.1 (Secure)'
    }
    if (AI_CONFIG.useDirectApi && AI_CONFIG.groqApiKey) {
      return 'Groq Llama 3.1 (Direct)'
    }
    return 'Demo Mode'
  }

  /**
   * Send message via Supabase Edge Function (RECOMMENDED)
   * @param {string} userMessage - The user's text message
   * @param {string} imageData - Optional base64 image data
   */
  async sendViaBackend(userMessage, imageData = null) {
    if (!AI_CONFIG.edgeFunctionUrl) {
      throw new Error('Supabase URL not configured. Add VITE_SUPABASE_URL to .env')
    }

    // Always load fresh user context before sending
    if (authService.isAuthenticated()) {
      await this.loadUserContext()
    }

    // Add user message to history (text only for history)
    this.conversationHistory.push({
      role: 'user',
      content: userMessage || '📷 [Image]',
    })

    try {
      // Build messages array for API
      const messagesForAPI = []

      // Add conversation history (last 10 messages)
      const recentHistory = this.conversationHistory.slice(-10)

      recentHistory.forEach((msg, idx) => {
        // If this is the last message (the one we just added) and we have an image
        if (idx === recentHistory.length - 1 && imageData && msg.role === 'user') {
          // Clean base64 data - preserve original format or default to jpeg
          let imageUrl = imageData
          if (!imageData.startsWith('data:image/')) {
            imageUrl = `data:image/jpeg;base64,${imageData}`
          }

          // Build multimodal content for vision model
          const visionContent = [
            {
              type: 'text',
              text: userMessage || 'Please analyze this image, read any text in it, solve any problems shown, and help me understand what it contains.'
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl }
            }
          ]

          messagesForAPI.push({
            role: 'user',
            content: visionContent
          })
        } else {
          // Regular text message
          messagesForAPI.push({
            role: msg.role,
            content: msg.content
          })
        }
      })

      console.log('🔍 Sending to backend with image:', !!imageData)

      const response = await fetch(AI_CONFIG.edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_CONFIG.anonKey}`,
          'apikey': AI_CONFIG.anonKey,
        },
        body: JSON.stringify({
          messages: messagesForAPI,
          systemPrompt: this.getSystemPrompt(),
          useVision: !!imageData, // Tell backend to use vision model
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.details || errorData.error || 'Failed to get AI response')
      }

      const data = await response.json()
      const aiMessage = data.message || 'Sorry, I could not generate a response.'

      // Add AI response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: aiMessage,
      })

      return aiMessage
    } catch (error) {
      // Remove user message from history on error
      this.conversationHistory.pop()
      throw error
    }
  }

  /**
   * Send message directly to Groq (LOCAL DEV ONLY - NOT SECURE FOR PRODUCTION)
   * @param {string} userMessage - The user's text message
   * @param {string} imageData - Optional base64 image data
   */
  async sendDirectToGroq(userMessage, imageData = null) {
    if (!AI_CONFIG.groqApiKey) {
      throw new Error('Groq API key not configured')
    }

    // Always load fresh user context before sending
    if (authService.isAuthenticated()) {
      await this.loadUserContext()
    }

    // Add user message to history (text only for history)
    this.conversationHistory.push({
      role: 'user',
      content: userMessage || '📷 [Image]',
    })

    try {
      // Build messages array for API
      const messagesForAPI = [
        { role: 'system', content: this.getSystemPrompt() }
      ]

      // Add conversation history (last 10 messages)
      const recentHistory = this.conversationHistory.slice(-10)

      recentHistory.forEach((msg, idx) => {
        // If this is the last message (the one we just added) and we have an image
        if (idx === recentHistory.length - 1 && imageData && msg.role === 'user') {
          // Clean base64 data - preserve original format or default to jpeg
          let imageUrl = imageData
          if (!imageData.startsWith('data:image/')) {
            imageUrl = `data:image/jpeg;base64,${imageData}`
          }

          // Build multimodal content for vision model
          const visionContent = [
            {
              type: 'text',
              text: userMessage || 'Please analyze this image, read any text in it, solve any problems shown, and help me understand what it contains.'
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl }
            }
          ]

          messagesForAPI.push({
            role: 'user',
            content: visionContent
          })
        } else {
          // Regular text message
          messagesForAPI.push({
            role: msg.role,
            content: msg.content
          })
        }
      })

      // Use vision model if image is provided (same as scanner)
      const modelToUse = imageData ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.3-70b-versatile'

      console.log('🔍 Using model:', modelToUse)
      console.log('📨 Sending to AI:', {
        hasImage: !!imageData,
        messageCount: messagesForAPI.length,
        lastMessage: messagesForAPI[messagesForAPI.length - 1]
      })

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_CONFIG.groqApiKey}`,
        },
        body: JSON.stringify({
          model: modelToUse,
          messages: messagesForAPI,
          temperature: 0.7,
          max_tokens: imageData ? 800 : 300, // More tokens for vision responses
          top_p: 1,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 401) {
          throw new Error('Invalid API key')
        }
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment.')
        }
        throw new Error(errorData.error?.message || 'Failed to get AI response')
      }

      const data = await response.json()
      const aiMessage = data.choices[0]?.message?.content || 'Sorry, I could not generate a response.'

      // Add AI response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: aiMessage,
      })

      return aiMessage
    } catch (error) {
      // Remove user message from history on error
      this.conversationHistory.pop()
      throw error
    }
  }

  /**
   * Send a message and get AI response
   * Automatically chooses backend or direct API based on configuration
   * @param {string} userMessage - The user's text message
   * @param {string} imageData - Optional base64 image data
   */
  async sendMessage(userMessage, imageData = null) {
    if (!this.isConfigured()) {
      throw new Error('AI service not configured. Please set up Supabase or add Groq API key.')
    }

    // Use backend if configured (recommended)
    if (AI_CONFIG.edgeFunctionUrl && !AI_CONFIG.useDirectApi) {
      return await this.sendViaBackend(userMessage, imageData)
    }

    // Fallback to direct API (local dev only)
    if (AI_CONFIG.useDirectApi && AI_CONFIG.groqApiKey) {
      return await this.sendDirectToGroq(userMessage, imageData)
    }

    throw new Error('No AI service configured')
  }

  /**
   * Get a demo response when API is not configured
   */
  async getDemoResponse(userMessage) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000))

    const lowerMessage = userMessage.toLowerCase()

    if (lowerMessage.includes('photosynthesis')) {
      return `Great question! Photosynthesis is the process plants use to convert light energy into chemical energy. Here's how it works:

**The Process:**
1. **Light Absorption**: Chlorophyll in leaves captures sunlight
2. **Water Splitting**: Roots absorb H₂O from soil
3. **CO₂ Intake**: Leaves take in carbon dioxide from air
4. **Glucose Production**: These combine to create sugar (C₆H₁₂O₆)

**The Formula**: 6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂

The oxygen released is what we breathe! Would you like to explore any specific part of this process?`
    }

    if (lowerMessage.includes('math') || lowerMessage.includes('calculus') || lowerMessage.includes('algebra')) {
      return `I'd love to help with math! Math builds on itself, so let's make sure we understand the fundamentals first.

**Key Strategy:**
1. Identify what type of problem you're solving
2. Write down what you know
3. Break it into smaller steps
4. Check your work at each step

Could you share the specific problem or concept you're working on? That way I can give you targeted help with examples!`
    }

    if (lowerMessage.includes('study') || lowerMessage.includes('prepare') || lowerMessage.includes('exam') || lowerMessage.includes('test')) {
      return `Effective studying is all about smart strategies! Here's my recommended approach:

**Study Techniques That Work:**
- **Spaced Repetition**: Review material over several days, not just once
- **Active Recall**: Test yourself instead of just re-reading
- **Pomodoro Technique**: 25-min focused sessions with 5-min breaks
- **Teach It**: Explain concepts to someone else (or pretend to!)

**For Exams:**
1. Review your notes within 24 hours of learning
2. Create practice questions
3. Focus on understanding "why," not just "what"
4. Get enough sleep before the exam

What subject are you studying for? I can give more specific tips!`
    }

    // Generic helpful response
    return `That's a great question! I'm here to help you understand this better.

**To give you the best explanation**, could you tell me:
- What subject is this for?
- What specifically are you trying to understand?
- Have you learned any related concepts yet?

This will help me tailor my explanation to exactly what you need. In the meantime, remember that learning is a process - it's totally normal to not understand something right away!`
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = []
  }

  /**
   * Get conversation history
   */
  getHistory() {
    return [...this.conversationHistory]
  }
}

// Export singleton instance
const aiService = new AIService()
export default aiService
