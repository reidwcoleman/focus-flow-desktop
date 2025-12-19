/**
 * Activity Breakdown Service
 * Uses AI to generate descriptions and break down activities into subtasks
 */

import aiService from './aiService'

class ActivityBreakdownService {
  /**
   * Generate AI description for an activity
   * @param {Object} activity - Activity object with title, activity_type, subject, etc.
   * @returns {Promise<string>} Generated description
   */
  async generateDescription(activity) {
    try {
      if (!activity?.title) {
        throw new Error('Activity title is required')
      }

      const prompt = `You are a helpful study assistant. Generate a brief, helpful description (1-2 sentences) for this calendar activity.

**Activity Details:**
- **Title:** ${activity.title}
${activity.activity_type ? `- **Type:** ${activity.activity_type}\n` : ''}${activity.subject ? `- **Subject:** ${activity.subject}\n` : ''}${activity.duration_minutes ? `- **Duration:** ${activity.duration_minutes} minutes\n` : ''}${activity.start_time ? `- **Time:** ${activity.start_time}\n` : ''}
**Instructions:**
Provide a helpful 1-2 sentence description that explains what this activity involves. Be concise and actionable.

Respond with ONLY the description text, no additional formatting or explanation.`

      console.log('🤖 Requesting AI description for:', activity.title)

      // Disable advanced modes for faster response
      const originalUltraThink = aiService.useUltraThink
      const originalDeepResearch = aiService.useDeepResearch

      aiService.useUltraThink = false
      aiService.useDeepResearch = false

      try {
        const response = await aiService.sendMessage(prompt)

        // Restore original modes
        aiService.useUltraThink = originalUltraThink
        aiService.useDeepResearch = originalDeepResearch

        const description = response.trim()
        console.log('✅ Generated description:', description)

        return description
      } catch (error) {
        // Restore modes on error
        aiService.useUltraThink = originalUltraThink
        aiService.useDeepResearch = originalDeepResearch
        throw error
      }
    } catch (error) {
      console.error('Failed to generate description:', error)
      throw new Error(`AI description generation failed: ${error.message}`)
    }
  }

  /**
   * Generate AI subtask breakdown for an activity
   * @param {Object} activity - Activity object with title, description, etc.
   * @returns {Promise<Array>} Array of subtask suggestions
   */
  async generateSubtasks(activity) {
    try {
      if (!activity?.title) {
        throw new Error('Activity title is required')
      }

      const prompt = this.buildSubtaskPrompt(activity)

      console.log('🤖 Requesting AI task breakdown for:', activity.title)

      // Disable advanced modes for faster response
      const originalUltraThink = aiService.useUltraThink
      const originalDeepResearch = aiService.useDeepResearch

      aiService.useUltraThink = false
      aiService.useDeepResearch = false

      try {
        const response = await aiService.sendMessage(prompt)

        // Restore original modes
        aiService.useUltraThink = originalUltraThink
        aiService.useDeepResearch = originalDeepResearch

        console.log('📝 AI Response received:', response)

        // Parse the response to extract subtasks
        const subtasks = this.parseSubtasks(response)

        console.log(`✅ Generated ${subtasks.length} subtask suggestions`)

        return subtasks
      } catch (error) {
        // Restore modes on error
        aiService.useUltraThink = originalUltraThink
        aiService.useDeepResearch = originalDeepResearch
        throw error
      }
    } catch (error) {
      console.error('Failed to generate subtasks:', error)
      throw new Error(`AI task breakdown failed: ${error.message}`)
    }
  }

  /**
   * Build the prompt for AI subtask generation
   * @param {Object} activity - Activity object
   * @returns {string} Formatted prompt
   */
  buildSubtaskPrompt(activity) {
    const { title, description, activity_type, subject, duration_minutes, start_time } = activity

    let prompt = `You are a helpful study assistant. Break down this activity into 2-4 clear, actionable subtasks.

**Activity Details:**
- **Title:** ${title}
${description ? `- **Description:** ${description}\n` : ''}${activity_type ? `- **Type:** ${activity_type}\n` : ''}${subject ? `- **Subject:** ${subject}\n` : ''}${duration_minutes ? `- **Duration:** ${duration_minutes} minutes\n` : ''}${start_time ? `- **Time:** ${start_time}\n` : ''}
**Instructions:**
1. Create 2-4 subtasks that break this activity into logical steps
2. Each subtask should be specific and actionable
3. Order subtasks sequentially (what to do first, second, etc.)
4. Keep subtask titles concise (3-8 words max)
5. Add brief descriptions explaining what each subtask involves

**Response Format (JSON):**
Respond with ONLY valid JSON in this exact format, no additional text:

\`\`\`json
{
  "subtasks": [
    {
      "title": "Review materials",
      "description": "Go through notes and textbook sections related to the topic"
    },
    {
      "title": "Practice problems",
      "description": "Complete 5-10 practice exercises to reinforce concepts"
    }
  ]
}
\`\`\`

Remember: Respond with ONLY the JSON object, nothing else.`

    return prompt
  }

  /**
   * Parse AI response to extract subtasks
   * @param {string} response - AI response text
   * @returns {Array} Parsed subtask objects
   */
  parseSubtasks(response) {
    try {
      // Try to extract JSON from response
      let jsonText = response.trim()

      // Remove markdown code blocks if present
      jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '')

      // Find JSON object in response
      const jsonMatch = jsonText.match(/\{[\s\S]*"subtasks"[\s\S]*\}/)
      if (jsonMatch) {
        jsonText = jsonMatch[0]
      }

      const parsed = JSON.parse(jsonText)

      if (!parsed.subtasks || !Array.isArray(parsed.subtasks)) {
        throw new Error('Invalid response format: missing subtasks array')
      }

      // Validate and clean subtasks
      const subtasks = parsed.subtasks
        .filter(s => s.title && s.title.trim().length > 0)
        .map((subtask, index) => ({
          title: subtask.title.trim(),
          description: subtask.description?.trim() || '',
          order: index
        }))

      // Limit to 2-4 subtasks
      return subtasks.slice(0, 4)
    } catch (error) {
      console.error('Failed to parse AI response:', error)
      console.error('Raw response:', response)

      // Fallback: Try to extract subtasks from plain text
      return this.fallbackParse(response)
    }
  }

  /**
   * Fallback parser for non-JSON responses
   * @param {string} response - AI response text
   * @returns {Array} Extracted subtasks
   */
  fallbackParse(response) {
    try {
      console.log('⚠️ Using fallback parser for response')

      const lines = response.split('\n').filter(line => line.trim())
      const subtasks = []

      let currentTitle = null
      let currentDescription = ''

      lines.forEach(line => {
        const trimmed = line.trim()

        // Look for numbered items or bullet points as titles
        if (/^(\d+\.|[-*•])\s*(.+)/.test(trimmed)) {
          // Save previous subtask if exists
          if (currentTitle) {
            subtasks.push({
              title: currentTitle,
              description: currentDescription.trim()
            })
          }

          // Start new subtask
          currentTitle = trimmed.replace(/^(\d+\.|[-*•])\s*/, '').trim()
          currentDescription = ''
        } else if (currentTitle && trimmed.length > 0) {
          // Add to description
          currentDescription += (currentDescription ? ' ' : '') + trimmed
        }
      })

      // Save last subtask
      if (currentTitle) {
        subtasks.push({
          title: currentTitle,
          description: currentDescription.trim()
        })
      }

      // If still no subtasks found, create generic ones
      if (subtasks.length === 0) {
        console.log('⚠️ Could not parse response, using generic breakdown')
        return this.getGenericBreakdown()
      }

      return subtasks.slice(0, 4)
    } catch (error) {
      console.error('Fallback parser failed:', error)
      return this.getGenericBreakdown()
    }
  }

  /**
   * Get generic subtask breakdown as last resort
   * @returns {Array} Generic subtasks
   */
  getGenericBreakdown() {
    return [
      {
        title: 'Prepare and gather materials',
        description: 'Collect all necessary materials and resources'
      },
      {
        title: 'Complete main activity',
        description: 'Work on the primary task or objective'
      },
      {
        title: 'Review and wrap up',
        description: 'Check work and finalize any remaining details'
      }
    ]
  }

  /**
   * Validate if AI service is available
   * @returns {boolean} True if AI service is configured
   */
  isAvailable() {
    try {
      return aiService.isConfigured()
    } catch (error) {
      return false
    }
  }
}

export default new ActivityBreakdownService()
