/**
 * Study Generation Service
 * AI-powered generation of quizzes, flashcards, and formatted notes
 * Always uses Deep Research mode (32,000 tokens) for comprehensive output
 */

import aiService from './aiService'
import supabaseQuizService from './supabaseQuizService'
import supabaseNotesService from './supabaseNotesService'
import supabaseFlashcardService from './supabaseFlashcardService'

class StudyGenerationService {
  constructor() {
    this.maxContentLength = 8000 // Reduced to save input tokens on Groq free tier
  }

  // ==================== QUIZ GENERATION ====================

  async generateQuiz(text, options = {}) {
    const {
      title,
      subject,
      multipleChoice = 10,
      trueFalse = 5,
      shortAnswer = 3
    } = options

    // Use UltraThink mode to get enough tokens for complete quiz JSON
    const previousDeepMode = aiService.useDeepResearch
    const previousUltraMode = aiService.useUltraThink
    aiService.useDeepResearch = false
    aiService.useUltraThink = true // Need 3000 tokens for complete quiz JSON

    try {
      const prompt = this._buildQuizPrompt(text, {
        multipleChoice,
        trueFalse,
        shortAnswer
      })

      const response = await aiService.sendMessage(prompt)
      const parsed = this._parseQuizResponse(response, { title, subject })

      return parsed
    } catch (error) {
      console.error('Quiz generation error:', error)
      throw new Error(`Failed to generate quiz: ${error.message}`)
    } finally {
      aiService.useDeepResearch = previousDeepMode
      aiService.useUltraThink = previousUltraMode
    }
  }

  async generateAndSaveQuiz(text, options = {}) {
    try {
      const quizData = await this.generateQuiz(text, options)

      // Create quiz in database
      const quiz = await supabaseQuizService.createQuiz({
        title: quizData.title,
        description: quizData.description || '',
        subject: quizData.subject,
        questionCount: quizData.questions.length,
        sourceFileId: options.sourceFileId || null
      })

      // Create all questions
      await supabaseQuizService.createBulkQuestions(quiz.id, quizData.questions)

      // Fetch complete quiz with questions
      return await supabaseQuizService.getQuizById(quiz.id)
    } catch (error) {
      console.error('Error saving quiz:', error)
      throw error
    }
  }

  // ==================== FLASHCARD GENERATION ====================

  async generateFlashcards(text, options = {}) {
    const { title, subject, cardCount = 30 } = options

    // Use UltraThink mode to get enough tokens for complete flashcards JSON
    const previousDeepMode = aiService.useDeepResearch
    const previousUltraMode = aiService.useUltraThink
    aiService.useDeepResearch = false
    aiService.useUltraThink = true // Need 3000 tokens for complete flashcards JSON

    try {
      const prompt = this._buildFlashcardsPrompt(text, { cardCount })
      const response = await aiService.sendMessage(prompt)
      const parsed = this._parseFlashcardsResponse(response, { title, subject })

      return parsed
    } catch (error) {
      console.error('Flashcard generation error:', error)
      throw new Error(`Failed to generate flashcards: ${error.message}`)
    } finally {
      aiService.useDeepResearch = previousDeepMode
      aiService.useUltraThink = previousUltraMode
    }
  }

  async generateAndSaveFlashcards(text, options = {}) {
    try {
      const flashcardData = await this.generateFlashcards(text, options)

      // Use existing StudyContext method
      const deck = await supabaseFlashcardService.createDeck({
        title: flashcardData.title,
        description: flashcardData.description || '',
        subject: flashcardData.subject
      })

      const cards = flashcardData.flashcards.map(card => ({
        deckId: deck.id,
        front: card.front,
        back: card.back,
        hint: card.hint || null,
        difficulty: card.difficulty || 'medium'
      }))

      for (const card of cards) {
        await supabaseFlashcardService.createCard(card)
      }

      return { deck, cardCount: cards.length }
    } catch (error) {
      console.error('Error saving flashcards:', error)
      throw error
    }
  }

  // ==================== NOTES GENERATION ====================

  async generateNotes(text, options = {}) {
    const { title, subject } = options

    // Use UltraThink mode to get enough tokens for complete JSON response
    const previousDeepMode = aiService.useDeepResearch
    const previousUltraMode = aiService.useUltraThink
    aiService.useDeepResearch = false
    aiService.useUltraThink = true // Need 3000 tokens for complete notes JSON

    try {
      const prompt = this._buildNotesPrompt(text)
      const response = await aiService.sendMessage(prompt)
      const parsed = this._parseNotesResponse(response, { title, subject })

      return parsed
    } catch (error) {
      console.error('Notes generation error:', error)
      throw new Error(`Failed to generate notes: ${error.message}`)
    } finally {
      aiService.useDeepResearch = previousDeepMode
      aiService.useUltraThink = previousUltraMode
    }
  }

  async generateAndSaveNotes(text, options = {}) {
    try {
      const notesData = await this.generateNotes(text, options)

      const note = await supabaseNotesService.createNote({
        title: notesData.title,
        content: notesData.content,
        subject: notesData.subject,
        tags: notesData.keyTerms?.map(kt => kt.term) || []
      })

      return note
    } catch (error) {
      console.error('Error saving notes:', error)
      throw error
    }
  }

  // ==================== PROMPT BUILDERS ====================

  _buildQuizPrompt(text, options) {
    const truncatedText = text.substring(0, this.maxContentLength)

    return `You must respond with ONLY a valid JSON object. No explanations, no markdown, no code blocks.

CONTENT:
"""
${truncatedText}
"""

Generate EXACTLY ${options.multipleChoice} multiple choice, ${options.trueFalse} true/false, and ${options.shortAnswer} short answer questions.

Return this JSON structure (your response must START with { and END with }):
{"title":"Quiz title","subject":"Subject","description":"Brief description","questions":[{"type":"multiple_choice","question":"Question text","options":["A","B","C","D"],"correctAnswer":"0","explanation":"Why correct","difficulty":"medium"},{"type":"true_false","question":"Statement","correctAnswer":"true","explanation":"Explanation","difficulty":"easy"},{"type":"short_answer","question":"Question","correctAnswer":"Expected answer","explanation":"Good answer criteria","difficulty":"hard"}]}

Rules:
- correctAnswer for multiple_choice: "0", "1", "2", or "3" (index)
- correctAnswer for true_false: "true" or "false"
- difficulty: "easy", "medium", or "hard"

IMPORTANT: Response must be valid JSON starting with { and ending with }. No other text.`
  }

  _buildFlashcardsPrompt(text, options) {
    const truncatedText = text.substring(0, this.maxContentLength)

    return `You must respond with ONLY a valid JSON object. No explanations, no markdown, no code blocks.

CONTENT:
"""
${truncatedText}
"""

Generate ${options.cardCount} flashcards.

Return this JSON structure (your response must START with { and END with }):
{"title":"Deck title","subject":"Subject","description":"Brief description","flashcards":[{"front":"Question or term","back":"Answer or definition","hint":"Memory aid","difficulty":"easy"},{"front":"Question 2","back":"Answer 2","hint":"Hint 2","difficulty":"medium"}]}

Guidelines:
- Front: Clear question or term
- Back: Complete answer (2-4 sentences)
- Hints for harder concepts
- difficulty: "easy", "medium", or "hard"
- Mix: 30% easy, 50% medium, 20% hard

IMPORTANT: Response must be valid JSON starting with { and ending with }. No other text.`
  }

  _buildNotesPrompt(text) {
    const truncatedText = text.substring(0, this.maxContentLength)

    return `You must respond with ONLY a valid JSON object. No explanations, no markdown, no code blocks.

SOURCE CONTENT:
"""
${truncatedText}
"""

Return this exact JSON structure:
{"title":"Notes title","subject":"Subject area","summary":"Brief overview","content":"Full notes text here with sections separated by double newlines","keyTerms":[{"term":"Term1","definition":"Definition1"}],"keyPoints":["Point 1","Point 2"]}

Instructions for content field:
- Write 20-40 comprehensive paragraphs
- Use double newlines between sections
- Use ALL CAPS for section headers
- Clear educational writing

IMPORTANT: Your response must START with { and END with }. Nothing else.`
  }

  // ==================== RESPONSE PARSERS ====================

  _parseQuizResponse(response, defaults = {}) {
    try {
      const jsonData = this._extractJSON(response)

      return {
        title: jsonData.title || defaults.title || 'Generated Quiz',
        subject: jsonData.subject || defaults.subject || 'General',
        description: jsonData.description || '',
        questions: (jsonData.questions || []).map((q, index) => ({
          type: this._normalizeQuestionType(q.type),
          question: q.question || '',
          options: q.options || [],
          correctAnswer: String(q.correctAnswer || ''),
          explanation: q.explanation || '',
          difficulty: q.difficulty || 'medium'
        }))
      }
    } catch (error) {
      console.error('Quiz parse error:', error)
      throw new Error(`Failed to parse quiz: ${error.message}`)
    }
  }

  _parseFlashcardsResponse(response, defaults = {}) {
    try {
      const jsonData = this._extractJSON(response)

      return {
        title: jsonData.title || defaults.title || 'Generated Flashcards',
        subject: jsonData.subject || defaults.subject || 'General',
        description: jsonData.description || '',
        flashcards: (jsonData.flashcards || []).map(card => ({
          front: card.front || '',
          back: card.back || '',
          hint: card.hint || null,
          difficulty: card.difficulty || 'medium'
        }))
      }
    } catch (error) {
      console.error('Flashcard parse error:', error)
      throw new Error(`Failed to parse flashcards: ${error.message}`)
    }
  }

  _parseNotesResponse(response, defaults = {}) {
    try {
      const jsonData = this._extractJSON(response)

      return {
        title: jsonData.title || defaults.title || 'Generated Notes',
        subject: jsonData.subject || defaults.subject || 'General',
        summary: jsonData.summary || '',
        content: jsonData.content || '',
        keyTerms: jsonData.keyTerms || [],
        keyPoints: jsonData.keyPoints || []
      }
    } catch (error) {
      console.error('Notes parse error:', error)
      throw new Error(`Failed to parse notes: ${error.message}`)
    }
  }

  _extractJSON(text) {
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid response: not a string')
    }

    // Remove any markdown code blocks
    let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '')

    // Try to find JSON object by looking for first { and last }
    const firstBrace = cleaned.indexOf('{')
    const lastBrace = cleaned.lastIndexOf('}')

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1)
    }

    // Sanitize JSON string by fixing common control character issues
    // This handles unescaped newlines, tabs, and other control chars in string values
    cleaned = this._sanitizeJSON(cleaned)

    // Try parsing the cleaned text
    try {
      const parsed = JSON.parse(cleaned)
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed
      }
    } catch (e) {
      console.error('JSON parse error:', e)
      console.error('Attempted to parse:', cleaned.substring(0, 500))
    }

    // Try various regex patterns as fallback
    const patterns = [
      /\{[\s\S]*\}/,
      /(\{[^}]+\})/
    ]

    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        try {
          const sanitized = this._sanitizeJSON(match[0])
          const parsed = JSON.parse(sanitized)
          if (typeof parsed === 'object' && parsed !== null) {
            return parsed
          }
        } catch (e) {
          continue
        }
      }
    }

    throw new Error('No valid JSON found in response')
  }

  _sanitizeJSON(jsonString) {
    // Fix unescaped control characters within JSON string values
    // Strategy: Find string values and escape unescaped control characters

    let result = ''
    let inString = false
    let escaped = false

    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString[i]
      const prevChar = i > 0 ? jsonString[i - 1] : ''

      // Track if we're inside a string
      if (char === '"' && prevChar !== '\\') {
        inString = !inString
        result += char
        continue
      }

      // If not in a string, just copy the character
      if (!inString) {
        result += char
        continue
      }

      // Inside a string - handle control characters
      if (char === '\\') {
        // Already escaped sequence - keep it
        result += char
        if (i + 1 < jsonString.length) {
          i++
          result += jsonString[i]
        }
        continue
      }

      // Escape unescaped control characters
      switch (char) {
        case '\n':
          result += '\\n'
          break
        case '\r':
          result += '\\r'
          break
        case '\t':
          result += '\\t'
          break
        case '\f':
          result += '\\f'
          break
        case '\b':
          result += '\\b'
          break
        default:
          // Remove other control characters (ASCII 0-31 and 127)
          if (char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) {
            result += ' ' // Replace with space
          } else {
            result += char
          }
      }
    }

    return result
  }

  _normalizeQuestionType(type) {
    const t = (type || '').toLowerCase().replace(/[_\s-]/g, '')
    if (['multiplechoice', 'mc'].includes(t)) return 'multiple_choice'
    if (['truefalse', 'tf'].includes(t)) return 'true_false'
    if (['shortanswer', 'short'].includes(t)) return 'short_answer'
    return 'multiple_choice'
  }
}

export default new StudyGenerationService()
