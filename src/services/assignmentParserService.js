/**
 * Assignment Parser Service - AI-Powered Assignment Creation
 * Smart parsing of natural language into structured assignment data
 */

import supabase from '../lib/supabase'

/**
 * Get comprehensive prompt for AI assignment parsing
 */
const getAssignmentParserPrompt = () => {
  const now = new Date()

  // Use local timezone for accurate date calculations
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const today = `${year}-${month}-${day}`

  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' })
  const currentDay = now.getDate()
  const currentMonth = now.getMonth() + 1
  const currentDayOfWeek = now.getDay()

  // Calculate tomorrow
  const tomorrowDate = new Date(now)
  tomorrowDate.setDate(now.getDate() + 1)
  const tomorrowStr = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, '0')}-${String(tomorrowDate.getDate()).padStart(2, '0')}`

  // Calculate next occurrence of each day of week
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const nextDayOccurrences = daysOfWeek.map((dayName, targetDay) => {
    const daysUntil = (targetDay - currentDayOfWeek + 7) % 7 || 7
    const nextDate = new Date(now)
    nextDate.setDate(now.getDate() + daysUntil)
    return {
      name: dayName,
      date: `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`,
      day: nextDate.getDate()
    }
  })

  const nextMonday = nextDayOccurrences[1]
  const nextFriday = nextDayOccurrences[5]

  return `You are an ULTRA-SMART AI assignment assistant. Parse assignment descriptions into structured data with MAXIMUM INTELLIGENCE about dates, subjects, and priorities.

=== CURRENT CONTEXT ===
Today: ${today} (${dayOfWeek}) - Day ${currentDay} of month ${currentMonth}
Tomorrow: ${tomorrowStr}
Current Day of Week: ${dayOfWeek}

=== DATE PARSING RULES ===

**PRIORITY 1: ABSOLUTE DATES (ALWAYS USE THESE FIRST):**
- If user mentions a SPECIFIC DATE NUMBER (like "on the 17th", "Dec 25", "12/17"), USE THAT DATE
- If user says "due on the 17th" and today is the ${currentDay}, they mean the 17th (NOT ${tomorrowStr})
- If the day number is LESS than today's day (${currentDay}), assume NEXT month
- If the day number is GREATER than today's day, assume THIS month
- Examples:
  * "due on the 17th" → 2025-12-17
  * "math homework due the 25th" → 2025-12-25

**PRIORITY 2: DAY OF WEEK (when no specific date number):**
Today is ${dayOfWeek}. Calculate NEXT occurrence:
- "Monday" or "this Monday" → ${nextMonday.date}
- "Friday" or "this Friday" → ${nextFriday.date}
- "next Monday" → one week after ${nextMonday.date}

**PRIORITY 3: RELATIVE DATES:**
- "today" = ${today}
- "tomorrow" = ${tomorrowStr}
- "next week" = 7 days from ${today}

=== PRIORITY DETERMINATION ===
Automatically determine priority based on due date:
- Due today or tomorrow = "high"
- Due within 3 days = "medium"
- Due more than 3 days = "low"

=== TIME ESTIMATE PARSING ===
- Look for phrases like "takes 2 hours", "30 minutes", "1h 30m"
- If no time mentioned, use smart defaults:
  * Essay/Project = "2h 30m"
  * Homework/Assignment = "1h 30m"
  * Quiz/Test = "1h" (study time)
  * Reading = "45m"
  * Problem Set = "2h"

=== SUBJECT EXTRACTION ===
Extract school subjects intelligently:
- Math, Chemistry, Physics, Biology, English, History, Computer Science
- Course codes: "CS101", "CHEM202", "MATH301"
- Generic subjects: "Science", "Language Arts", "Social Studies"

=== OUTPUT FORMAT ===
**CRITICAL: Return ONLY the JSON object. No explanations, no markdown, no code blocks.**

{
  "title": "Assignment title",
  "subject": "Subject name or null",
  "dueDate": "YYYY-MM-DD or null",
  "priority": "high|medium|low",
  "timeEstimate": "Xh Ym format like '1h 30m' or null"
}

DO NOT include any text before or after the JSON. Just the JSON object.

=== COMPREHENSIVE EXAMPLES ===

Input: "Math homework due tomorrow"
Output: {"title":"Math Homework","subject":"Math","dueDate":"${tomorrowStr}","priority":"high","timeEstimate":"1h 30m"}

Input: "Chemistry lab report due on the 17th"
Output: {"title":"Chemistry Lab Report","subject":"Chemistry","dueDate":"2025-12-17","priority":"medium","timeEstimate":"2h 30m"}

Input: "English essay due Friday, takes about 3 hours"
Output: {"title":"English Essay","subject":"English","dueDate":"${nextFriday.date}","priority":"medium","timeEstimate":"3h"}

Input: "Physics problem set chapter 5 due Monday"
Output: {"title":"Physics Problem Set Chapter 5","subject":"Physics","dueDate":"${nextMonday.date}","priority":"medium","timeEstimate":"2h"}

Input: "Read history chapter 12 by tomorrow"
Output: {"title":"Read History Chapter 12","subject":"History","dueDate":"${tomorrowStr}","priority":"high","timeEstimate":"45m"}

Input: "CS101 project due on the 25th"
Output: {"title":"CS101 Project","subject":"CS101","dueDate":"2025-12-25","priority":"low","timeEstimate":"2h 30m"}

Input: "Biology quiz on Wednesday"
Output: {"title":"Biology Quiz","subject":"Biology","dueDate":"${nextDayOccurrences[3].date}","priority":"medium","timeEstimate":"1h"}

Input: "finish calculus homework by next Friday"
Output: {"title":"Finish Calculus Homework","subject":"Calculus","dueDate":"${nextFriday.date}","priority":"medium","timeEstimate":"2h"}

=== YOUR TASK ===
Parse the following assignment description with MAXIMUM intelligence:`
}

class AssignmentParserService {
  /**
   * Parse natural language assignment description using AI
   * @param {string} userInput - Natural language description
   * @returns {Promise<Object>} Parsed assignment data
   */
  async parseAssignment(userInput) {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured')
      }

      const contextualPrompt = getAssignmentParserPrompt()

      const now = new Date()
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      console.log('📚 Parsing assignment with AI:', userInput, '| Today:', today)

      const response = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userInput }],
          systemPrompt: contextualPrompt,
          model: 'llama-3.3-70b-versatile',
          temperature: 0.2,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ AI API Error:', errorText)
        throw new Error('Failed to parse assignment with AI')
      }

      const data = await response.json()
      const aiResponse = data.response || data.message || data.content

      if (!aiResponse) {
        console.error('❌ No response from AI:', data)
        throw new Error('No response from AI')
      }

      // Parse JSON from AI response
      let jsonString = aiResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '')
      const jsonMatch = jsonString.match(/\{(?:[^{}]|(?:\{[^{}]*\}))*\}/s)

      if (!jsonMatch) {
        console.error('❌ AI response did not contain JSON:', aiResponse)
        throw new Error('AI response did not contain valid JSON')
      }

      let parsed
      try {
        parsed = JSON.parse(jsonMatch[0])
      } catch (parseError) {
        const cleaned = jsonMatch[0]
          .replace(/\n/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
        parsed = JSON.parse(cleaned)
      }

      console.log('✅ Parsed assignment data:', parsed)

      // Validate required fields
      if (!parsed.title) {
        throw new Error('Assignment must have a title')
      }

      // Validate date format if provided
      if (parsed.dueDate) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/
        if (!dateRegex.test(parsed.dueDate)) {
          console.warn('⚠️ Invalid date format:', parsed.dueDate)
          parsed.dueDate = null
        }
      }

      // Build final assignment data
      const assignmentData = {
        title: parsed.title,
        subject: parsed.subject || '',
        dueDate: parsed.dueDate || null,
        priority: parsed.priority || 'medium',
        timeEstimate: parsed.timeEstimate || '1h 30m',
        source: 'ai',
        aiCaptured: true,
        progress: 0,
        completed: false,
      }

      console.log('✨ Final assignment data:', assignmentData)
      return assignmentData
    } catch (error) {
      console.error('❌ Failed to parse assignment:', error)
      throw error
    }
  }
}

export default new AssignmentParserService()
