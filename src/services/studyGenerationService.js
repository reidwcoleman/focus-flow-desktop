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
    this.maxContentLength = 15000 // Max chars to send to AI
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

    // Enable Deep Research mode
    const previousMode = aiService.useDeepResearch
    aiService.useDeepResearch = true

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
      aiService.useDeepResearch = previousMode
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

    const previousMode = aiService.useDeepResearch
    aiService.useDeepResearch = true

    try {
      const prompt = this._buildFlashcardsPrompt(text, { cardCount })
      const response = await aiService.sendMessage(prompt)
      const parsed = this._parseFlashcardsResponse(response, { title, subject })

      return parsed
    } catch (error) {
      console.error('Flashcard generation error:', error)
      throw new Error(`Failed to generate flashcards: ${error.message}`)
    } finally {
      aiService.useDeepResearch = previousMode
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

    const previousMode = aiService.useDeepResearch
    aiService.useDeepResearch = true

    try {
      const prompt = this._buildNotesPrompt(text)
      const response = await aiService.sendMessage(prompt)
      const parsed = this._parseNotesResponse(response, { title, subject })

      return parsed
    } catch (error) {
      console.error('Notes generation error:', error)
      throw new Error(`Failed to generate notes: ${error.message}`)
    } finally {
      aiService.useDeepResearch = previousMode
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

    return `You are an expert educator creating a comprehensive study quiz.

CONTENT TO ANALYZE:
"""
${truncatedText}
"""

Generate a quiz with EXACTLY:
- ${options.multipleChoice} multiple choice questions (4 options each, one correct)
- ${options.trueFalse} true/false questions
- ${options.shortAnswer} short answer questions

Return ONLY valid JSON with NO markdown formatting, using this exact structure:
{
  "title": "Quiz title based on content",
  "subject": "Subject area (e.g., Biology, History)",
  "description": "Brief description of topics covered",
  "questions": [
    {
      "type": "multiple_choice",
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "0",
      "explanation": "Why this answer is correct",
      "difficulty": "medium"
    },
    {
      "type": "true_false",
      "question": "Statement to evaluate",
      "correctAnswer": "true",
      "explanation": "Explanation",
      "difficulty": "easy"
    },
    {
      "type": "short_answer",
      "question": "Open-ended question",
      "correctAnswer": "Expected answer",
      "explanation": "What makes a good answer",
      "difficulty": "hard"
    }
  ]
}

Requirements:
- Test understanding, not just memorization
- Clear, specific questions
- Detailed explanations that teach
- Mix of difficulty levels
- correctAnswer for multiple_choice must be index "0", "1", "2", or "3"
- correctAnswer for true_false must be "true" or "false"
- Return ONLY the JSON object, no extra text`
  }

  _buildFlashcardsPrompt(text, options) {
    const truncatedText = text.substring(0, this.maxContentLength)

    return `You are an expert educator creating flashcards for optimal learning.

CONTENT:
"""
${truncatedText}
"""

Generate ${options.cardCount} high-quality flashcards covering all key concepts.

Return ONLY valid JSON with NO markdown formatting:
{
  "title": "Deck title",
  "subject": "Subject area",
  "description": "What these cards cover",
  "flashcards": [
    {
      "front": "Question or term",
      "back": "Answer or definition",
      "hint": "Optional memory aid",
      "difficulty": "easy"
    }
  ]
}

Guidelines:
- Front: Clear, specific question or term
- Back: Concise but complete answer (2-4 sentences)
- Include hints for harder concepts
- Cover all key terms, concepts, formulas
- Mix difficulty levels (30% easy, 50% medium, 20% hard)
- Return ONLY the JSON object, no extra text`
  }

  _buildNotesPrompt(text) {
    const truncatedText = text.substring(0, this.maxContentLength)

    return `You are an expert at creating well-organized study notes.

SOURCE CONTENT:
"""
${truncatedText}
"""

Create comprehensive formatted study notes (20-40 paragraphs).

Return ONLY valid JSON with NO markdown formatting:
{
  "title": "Notes title",
  "subject": "Subject area",
  "summary": "2-3 sentence overview",
  "content": "Full formatted notes (plain text, use blank lines for sections)",
  "keyTerms": [{"term": "Term", "definition": "Definition"}],
  "keyPoints": ["Main point 1", "Main point 2"]
}

Format for 'content' field:
- Use blank lines between sections
- ALL CAPS for main section headers
- Bullet points with "• " prefix
- Clear, educational writing
- 20-40 comprehensive paragraphs

Return ONLY the JSON object, no extra text`
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
    // Try to extract JSON from various formats
    const patterns = [
      /```json\s*([\s\S]*?)\s*```/,
      /```\s*([\s\S]*?)\s*```/,
      /\{[\s\S]*\}/
    ]

    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        try {
          return JSON.parse(match[1] || match[0])
        } catch (e) {
          continue
        }
      }
    }

    // Try parsing the whole text
    try {
      return JSON.parse(text)
    } catch (e) {
      throw new Error('No valid JSON found in response')
    }
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
