/**
 * Task Breakdown Service
 * Uses AI to break down assignments into manageable subtasks
 */

import aiService from './aiService'

class TaskBreakdownService {
  /**
   * Generate AI subtask breakdown for an assignment
   * @param {Object} assignment - Assignment object with title, description, subject, etc.
   * @returns {Promise<Array>} Array of subtask suggestions
   */
  async generateSubtasks(assignment) {
    try {
      if (!assignment?.title) {
        throw new Error('Assignment title is required')
      }

      const prompt = this.buildPrompt(assignment)

      console.log('🤖 Requesting AI task breakdown for:', assignment.title)

      // Temporarily disable advanced modes for faster, focused response
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
        // Restore modes on error too
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
   * @param {Object} assignment - Assignment object
   * @returns {string} Formatted prompt
   */
  buildPrompt(assignment) {
    const { title, description, subject, timeEstimate, dueDate } = assignment

    let prompt = `You are a helpful study assistant. Break down this assignment into 3-5 clear, actionable subtasks that a student can complete in order.

**Assignment Details:**
- **Title:** ${title}
${description ? `- **Description:** ${description}\n` : ''}${subject ? `- **Subject:** ${subject}\n` : ''}${timeEstimate ? `- **Estimated Time:** ${timeEstimate}\n` : ''}${dueDate ? `- **Due Date:** ${new Date(dueDate).toLocaleDateString()}\n` : ''}

**Instructions:**
1. Create 3-5 subtasks that break this assignment into logical, sequential steps
2. Each subtask should be specific, actionable, and take no more than 25-30% of the total time
3. Order subtasks from first to last (what to do in sequence)
4. Keep subtask titles concise (5-10 words max)
5. Add brief descriptions explaining what each subtask involves

**Response Format (JSON):**
Respond with ONLY valid JSON in this exact format, no additional text:

\`\`\`json
{
  "subtasks": [
    {
      "title": "Research and gather sources",
      "description": "Find 3-5 credible sources related to the topic. Create a bibliography.",
      "confidence": 0.9
    },
    {
      "title": "Create outline",
      "description": "Organize main points and structure based on research findings.",
      "confidence": 0.85
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
      // Try to extract JSON from response (in case AI adds markdown or extra text)
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
          confidence: typeof subtask.confidence === 'number' ? subtask.confidence : 0.8,
          order: index
        }))

      // Limit to 3-5 subtasks
      return subtasks.slice(0, 5)
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
              description: currentDescription.trim(),
              confidence: 0.7
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
          description: currentDescription.trim(),
          confidence: 0.7
        })
      }

      // If still no subtasks found, create generic ones
      if (subtasks.length === 0) {
        console.log('⚠️ Could not parse response, using generic breakdown')
        return this.getGenericBreakdown()
      }

      return subtasks.slice(0, 5)
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
        title: 'Review assignment requirements',
        description: 'Read through all instructions and understand what is expected',
        confidence: 0.6
      },
      {
        title: 'Gather materials and resources',
        description: 'Collect all necessary materials, research sources, or tools needed',
        confidence: 0.6
      },
      {
        title: 'Complete main work',
        description: 'Work on the primary assignment task or deliverable',
        confidence: 0.6
      },
      {
        title: 'Review and finalize',
        description: 'Proofread, check for errors, and make final improvements',
        confidence: 0.6
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

  /**
   * Get estimation of time per subtask based on total estimate
   * @param {number} totalMinutes - Total estimated minutes for assignment
   * @param {number} subtaskCount - Number of subtasks
   * @returns {Array} Array of time estimates per subtask
   */
  estimateSubtaskTimes(totalMinutes, subtaskCount) {
    if (!totalMinutes || subtaskCount <= 0) {
      return []
    }

    // Distribute time with slight variation (first and last tasks often take longer)
    const baseTime = totalMinutes / subtaskCount
    const estimates = []

    for (let i = 0; i < subtaskCount; i++) {
      let multiplier = 1.0

      // First task: 10% more time (setup, understanding)
      if (i === 0) multiplier = 1.1

      // Last task: 15% more time (review, finalization)
      if (i === subtaskCount - 1) multiplier = 1.15

      // Middle tasks: slightly less time
      if (i > 0 && i < subtaskCount - 1) multiplier = 0.9

      estimates.push(Math.round(baseTime * multiplier))
    }

    // Normalize to ensure total matches
    const sum = estimates.reduce((a, b) => a + b, 0)
    const ratio = totalMinutes / sum

    return estimates.map(est => Math.round(est * ratio))
  }
}

export default new TaskBreakdownService()
