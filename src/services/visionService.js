/**
 * Vision AI Service for Focus Flow
 * Handles OCR and image analysis using Groq Llama 4 Scout via Supabase Edge Function
 */

import supabase from '../lib/supabase'

const VISION_CONFIG = {
  useEdgeFunction: true, // Use Supabase Edge Function for secure API calls
  edgeFunctionUrl: null, // Will be set dynamically from Supabase client
  visionModel: 'meta-llama/llama-4-scout-17b-16e-instruct',
  maxTokens: 2000,
  temperature: 0.3, // Lower for more consistent extraction
}

class VisionService {
  constructor() {
    // Always use edge function (API key is stored securely in Supabase)
    this.isConfigured = true
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  }

  /**
   * Call Supabase Edge Function for vision tasks
   * @private
   */
  async _callEdgeFunction(prompt, base64Image) {
    const cleanBase64 = this._cleanBase64(base64Image)

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${cleanBase64}`
                  }
                }
              ]
            }
          ],
          useVision: true
        }
      })

      if (error) {
        throw new Error(error.message || 'Edge function error')
      }

      if (!data || !data.message) {
        throw new Error('Invalid response from edge function')
      }

      return data.message
    } catch (error) {
      console.error('Edge function call failed:', error)
      throw error
    }
  }

  /**
   * Process handwritten notes image into structured text
   * @param {string} base64Image - Base64 encoded image (with or without data URL prefix)
   * @returns {Promise<{rawText: string, formattedContent: string, title: string, subject: string, tags: string[], confidence: number}>}
   */
  async processHandwrittenNotes(base64Image) {
    const prompt = this._getHandwritingPrompt()

    try {
      const aiResponse = await this._callEdgeFunction(prompt, base64Image)
      return this._parseNotesResponse(aiResponse)
    } catch (error) {
      console.error('Vision service error (handwriting):', error)
      throw new Error(`Failed to process handwritten notes: ${error.message}`)
    }
  }

  /**
   * Process textbook/notes image into flashcards
   * @param {string} base64Image - Base64 encoded image
   * @returns {Promise<{flashcards: Array<{front: string, back: string, hint?: string, difficulty: string}>, title: string, subject: string}>}
   */
  async processTextbookToFlashcards(base64Image) {
    const prompt = this._getFlashcardPrompt()

    try {
      const aiResponse = await this._callEdgeFunction(prompt, base64Image)
      return this._parseFlashcardsResponse(aiResponse)
    } catch (error) {
      console.error('Vision service error (flashcards):', error)
      throw new Error(`Failed to generate flashcards: ${error.message}`)
    }
  }

  /**
   * Process homework assignment image into structured assignment data
   * @param {string} base64Image - Base64 encoded image
   * @returns {Promise<{title: string, subject: string, dueDate: string, description: string, estimatedTime: string, priority: string, confidence: number}>}
   */
  async processHomeworkAssignment(base64Image) {
    const prompt = this._getHomeworkPrompt()

    try {
      const aiResponse = await this._callEdgeFunction(prompt, base64Image)
      return this._parseHomeworkResponse(aiResponse)
    } catch (error) {
      console.error('Vision service error (homework):', error)
      throw new Error(`Failed to process homework: ${error.message}`)
    }
  }

  /**
   * Generic OCR text extraction
   * @param {string} base64Image - Base64 encoded image
   * @returns {Promise<{text: string, confidence: number}>}
   */
  async extractText(base64Image) {
    const prompt = 'Extract all text from this image. Return only the text, preserving line breaks and formatting.'

    try {
      const text = await this._callEdgeFunction(prompt, base64Image)
      return {
        text: text,
        confidence: 0.85 // Groq doesn't provide confidence, using estimate
      }
    } catch (error) {
      console.error('Vision service error (OCR):', error)
      throw new Error(`Failed to extract text: ${error.message}`)
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Remove data URL prefix from base64 if present
   */
  _cleanBase64(base64Image) {
    return base64Image.replace(/^data:image\/\w+;base64,/, '')
  }

  /**
   * Prompt for handwriting extraction and organization
   */
  _getHandwritingPrompt() {
    return `You are an expert at reading handwritten notes and organizing them into clean, beautifully formatted documents.

Analyze this handwritten image and convert it into clean, organized notes.

FORMAT YOUR RESPONSE AS CLEAN MARKDOWN:
- Use # for main title
- Use ## for section headings
- Use **bold** for key terms and important concepts
- Use - or * for bullet points
- Write clear, complete sentences
- Organize related information together
- Remove any artifacts, scribbles, or unclear marks

DO NOT include JSON, code blocks, or technical formatting.
DO NOT add meta-commentary like "Here are the notes" or "This is about..."
JUST provide the clean, formatted notes directly.

Example format:
# Cell Biology Notes

## Cell Structure
The cell is the basic unit of life. Key components include:
- **Nucleus**: Contains genetic material (DNA)
- **Mitochondria**: Powerhouse of the cell
- **Cell membrane**: Controls what enters and exits

## Cell Functions
Cells perform three main functions...

Be thorough but concise. Make it look professional and easy to read.`
  }

  /**
   * Prompt for flashcard generation from textbook/notes
   */
  _getFlashcardPrompt() {
    return `You are an expert educator creating effective flashcards for student learning.

Analyze this textbook page or notes image and create flashcards that will help students learn the material.

FLASHCARD CREATION RULES:
1. Identify KEY TERMS and their definitions
2. Extract IMPORTANT CONCEPTS that need explanation
3. Find FACTS, dates, formulas, or data points
4. Create questions that test understanding, not just memorization
5. Make the front (question) clear and specific
6. Make the back (answer) concise but complete
7. Add hints for complex topics (optional)
8. Rate difficulty: easy, medium, or hard

Create 5-15 high-quality flashcards (prioritize quality over quantity).

Return your response as a JSON object with this structure:
{
  "flashcards": [
    {
      "front": "What is...?",
      "back": "Clear, concise answer",
      "hint": "Optional hint for difficult cards",
      "difficulty": "easy | medium | hard"
    }
  ],
  "title": "suggested deck title",
  "subject": "detected subject area"
}

Focus on active recall and understanding.`
  }

  /**
   * Prompt for homework assignment extraction
   */
  _getHomeworkPrompt() {
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    return `You are an expert at analyzing homework assignments and extracting key information.

Analyze this homework assignment image and extract the following information:
- Title/name of the assignment
- Subject (Math, Chemistry, English, History, Physics, etc.)
- Due date (if visible) - format as YYYY-MM-DD
- Description/requirements of the assignment
- Estimated time to complete (e.g., "1h 30m", "2h", "45m")
- Priority level based on due date and complexity (low, medium, high)

TODAY'S DATE: ${today}

INSTRUCTIONS:
1. Read ALL text carefully from the image
2. Look for:
   - Assignment titles or headings
   - Due dates, deadlines, or "Due:" labels
   - Subject names or class names
   - Instructions, requirements, or questions to answer
   - Page numbers, chapter references, problem numbers
3. Estimate time based on complexity and length
4. Set priority:
   - HIGH: Due within 2 days or complex/long assignments
   - MEDIUM: Due within a week or moderate difficulty
   - LOW: Due later or quick/simple assignments

Return your response as a JSON object:
{
  "title": "Assignment name or topic",
  "subject": "Subject area",
  "dueDate": "YYYY-MM-DD or null if not found",
  "description": "Clear summary of what needs to be done",
  "estimatedTime": "1h 30m",
  "priority": "low | medium | high",
  "confidence": 0.95
}

If you can't find certain information, make educated guesses based on context.
BE ACCURATE with dates - if you see "Due: 12/15", convert it to proper YYYY-MM-DD format.`
  }

  /**
   * Parse AI response for notes extraction
   */
  _parseNotesResponse(aiResponse) {
    try {
      // Clean the response
      let cleanResponse = aiResponse.trim()

      // Remove any code block markers if present
      cleanResponse = cleanResponse.replace(/```markdown\s*/g, '').replace(/```\s*/g, '')

      // Extract title from first # heading
      const titleMatch = cleanResponse.match(/^#\s+(.+)$/m)
      const title = titleMatch ? titleMatch[1].trim() : 'Untitled Notes'

      // Detect subject from title or content
      const subjectKeywords = {
        'Chemistry': /chemistry|chemical|molecule|atom|reaction|compound/i,
        'Math': /math|calculus|algebra|geometry|equation|formula/i,
        'Biology': /biology|cell|organism|dna|protein|evolution/i,
        'Physics': /physics|force|energy|motion|wave|quantum/i,
        'History': /history|war|revolution|century|empire|ancient/i,
        'English': /literature|poem|novel|shakespeare|writing/i,
        'Computer Science': /programming|code|algorithm|software|computer/i,
      }

      let subject = 'General'
      for (const [subj, regex] of Object.entries(subjectKeywords)) {
        if (regex.test(cleanResponse)) {
          subject = subj
          break
        }
      }

      // Extract keywords (words in bold or headings)
      const boldWords = [...cleanResponse.matchAll(/\*\*([^*]+)\*\*/g)].map(m => m[1])
      const headings = [...cleanResponse.matchAll(/##\s+([^\n]+)/g)].map(m => m[1])
      const tags = [...new Set([...boldWords, ...headings])]
        .slice(0, 5)
        .map(tag => tag.trim())

      return {
        rawText: cleanResponse,
        formattedContent: cleanResponse,
        title: title,
        subject: subject,
        tags: tags,
        confidence: 0.9
      }
    } catch (error) {
      console.error('Failed to parse notes response:', error)
      // Fallback: use raw response as content
      return {
        rawText: aiResponse,
        formattedContent: aiResponse,
        title: 'Untitled Notes',
        subject: 'General',
        tags: [],
        confidence: 0.7
      }
    }
  }

  /**
   * Parse AI response for flashcards
   */
  _parseFlashcardsResponse(aiResponse) {
    try {
      // Try to extract JSON from response
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) ||
                        aiResponse.match(/\{[\s\S]*\}/)

      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const jsonStr = jsonMatch[1] || jsonMatch[0]
      const parsed = JSON.parse(jsonStr)

      // Validate flashcards array
      if (!Array.isArray(parsed.flashcards)) {
        throw new Error('Invalid flashcards format')
      }

      return {
        flashcards: parsed.flashcards.map((card, index) => ({
          front: card.front || `Question ${index + 1}`,
          back: card.back || 'No answer provided',
          hint: card.hint || null,
          difficulty: card.difficulty || 'medium'
        })),
        title: parsed.title || 'Untitled Deck',
        subject: parsed.subject || 'General'
      }
    } catch (error) {
      console.error('Failed to parse flashcards response:', error)
      // Fallback: create a single card with the response
      return {
        flashcards: [{
          front: 'Flashcard generation failed',
          back: 'Please try again with a different image',
          hint: null,
          difficulty: 'medium'
        }],
        title: 'Error Deck',
        subject: 'General'
      }
    }
  }

  /**
   * Parse AI response for homework assignment
   */
  _parseHomeworkResponse(aiResponse) {
    try {
      // Try to extract JSON from response
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) ||
                        aiResponse.match(/\{[\s\S]*\}/)

      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const jsonStr = jsonMatch[1] || jsonMatch[0]
      const parsed = JSON.parse(jsonStr)

      // Ensure required fields
      return {
        title: parsed.title || 'Untitled Assignment',
        subject: parsed.subject || 'General',
        dueDate: parsed.dueDate || null,
        description: parsed.description || 'No description provided',
        estimatedTime: parsed.estimatedTime || '1h',
        priority: parsed.priority || 'medium',
        confidence: parsed.confidence || 0.85
      }
    } catch (error) {
      console.error('Failed to parse homework response:', error)
      // Fallback: create a generic assignment
      return {
        title: 'Assignment Detected',
        subject: 'General',
        dueDate: null,
        description: 'Please review the scanned image for details',
        estimatedTime: '1h',
        priority: 'medium',
        confidence: 0.5
      }
    }
  }

  /**
   * Demo mode response for homework
   */
  _getDemoHomeworkResponse() {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 3)
    const dueDate = tomorrow.toISOString().split('T')[0]

    return {
      title: 'Chemistry Lab Report: Acid-Base Titration',
      subject: 'Chemistry',
      dueDate: dueDate,
      description: 'Complete lab report analyzing the titration of HCl with NaOH. Include calculations, observations, and error analysis. Submit both handwritten data tables and typed analysis.',
      estimatedTime: '2h 30m',
      priority: 'high',
      confidence: 0.95
    }
  }

  /**
   * Demo mode response for notes
   */
  _getDemoNotesResponse() {
    const demoContent = `# Chemistry Notes - Acid-Base Reactions

## Definition
An **acid-base reaction** involves the transfer of a **proton (H+)** from one species to another.

## Key Concepts
- **Bronsted-Lowry acids** are proton donors
- **Bases** are proton acceptors
- **Conjugate acid-base pairs** differ by one proton

## pH Scale
- pH < 7: **acidic**
- pH = 7: **neutral**
- pH > 7: **basic**

## Common Acids
- HCl (hydrochloric acid)
- H₂SO₄ (sulfuric acid)
- CH₃COOH (acetic acid)`

    return {
      rawText: demoContent,
      formattedContent: demoContent,
      title: 'Chemistry Notes - Acid-Base Reactions',
      subject: 'Chemistry',
      tags: ['acids', 'bases', 'pH', 'Bronsted-Lowry', 'proton transfer'],
      confidence: 0.95
    }
  }

  /**
   * Demo mode response for flashcards
   */
  _getDemoFlashcardsResponse() {
    return {
      flashcards: [
        {
          front: 'What is a Bronsted-Lowry acid?',
          back: 'A proton (H+) donor',
          hint: 'Think about what the acid gives away',
          difficulty: 'easy'
        },
        {
          front: 'What is a Bronsted-Lowry base?',
          back: 'A proton (H+) acceptor',
          hint: 'Think about what the base receives',
          difficulty: 'easy'
        },
        {
          front: 'What is the pH of a neutral solution?',
          back: '7',
          hint: 'Right in the middle of the pH scale',
          difficulty: 'easy'
        },
        {
          front: 'If a solution has pH < 7, is it acidic or basic?',
          back: 'Acidic',
          hint: 'Lower pH means more H+ ions',
          difficulty: 'easy'
        },
        {
          front: 'What is a conjugate acid-base pair?',
          back: 'Two species that differ by one proton (H+)',
          hint: 'They are related by the transfer of one proton',
          difficulty: 'medium'
        },
        {
          front: 'What is the chemical formula for hydrochloric acid?',
          back: 'HCl',
          difficulty: 'easy'
        },
        {
          front: 'What is the chemical formula for sulfuric acid?',
          back: 'H₂SO₄',
          difficulty: 'medium'
        },
        {
          front: 'What happens in an acid-base reaction?',
          back: 'A proton (H+) is transferred from the acid to the base',
          difficulty: 'medium'
        }
      ],
      title: 'Acid-Base Reactions',
      subject: 'Chemistry'
    }
  }

  /**
   * Check if service is properly configured
   */
  isReady() {
    return this.isConfigured
  }

  /**
   * Get configuration status
   */
  getStatus() {
    return {
      isConfigured: this.isConfigured,
      model: VISION_CONFIG.visionModel,
      provider: 'Groq'
    }
  }
}

// Export singleton instance
export default new VisionService()
