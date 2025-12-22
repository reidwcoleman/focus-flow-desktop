/**
 * Supabase Quiz Service
 * Handles CRUD operations for quizzes, questions, and attempts
 */

import supabase from '../lib/supabase'
import authService from './authService'

class SupabaseQuizService {
  // ==================== QUIZ OPERATIONS ====================

  async getAllQuizzes() {
    try {
      const { user } = await authService.getCurrentUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) throw error

      return data.map(this._mapQuizFromDatabase)
    } catch (error) {
      console.error('Error fetching quizzes:', error)
      throw error
    }
  }

  async getQuizById(id) {
    try {
      const { user } = await authService.getCurrentUser()
      if (!user) throw new Error('Not authenticated')

      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (quizError) throw quizError

      const { data: questions, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', id)
        .order('order_index', { ascending: true })

      if (questionsError) throw questionsError

      return {
        ...this._mapQuizFromDatabase(quiz),
        questions: questions.map(this._mapQuestionFromDatabase)
      }
    } catch (error) {
      console.error('Error fetching quiz:', error)
      throw error
    }
  }

  async createQuiz(quizData) {
    try {
      const { user } = await authService.getCurrentUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('quizzes')
        .insert({
          user_id: user.id,
          title: quizData.title,
          description: quizData.description || null,
          subject: quizData.subject || 'General',
          source_file_id: quizData.sourceFileId || null,
          question_count: quizData.questionCount || 0,
          tags: quizData.tags || []
        })
        .select()
        .single()

      if (error) throw error

      return this._mapQuizFromDatabase(data)
    } catch (error) {
      console.error('Error creating quiz:', error)
      throw error
    }
  }

  async createBulkQuestions(quizId, questionsData) {
    try {
      const { user } = await authService.getCurrentUser()
      if (!user) throw new Error('Not authenticated')

      const questions = questionsData.map((q, index) => ({
        quiz_id: quizId,
        user_id: user.id,
        question_type: q.type,
        question_text: q.question,
        options: q.options ? JSON.stringify(q.options) : null,
        correct_answer: String(q.correctAnswer),
        explanation: q.explanation || null,
        difficulty: q.difficulty || 'medium',
        order_index: index
      }))

      const { data, error } = await supabase
        .from('quiz_questions')
        .insert(questions)
        .select()

      if (error) throw error

      // Update quiz question count
      await supabase
        .from('quizzes')
        .update({ question_count: questionsData.length })
        .eq('id', quizId)

      return data.map(this._mapQuestionFromDatabase)
    } catch (error) {
      console.error('Error creating questions:', error)
      throw error
    }
  }

  async updateQuiz(id, updates) {
    try {
      const { user } = await authService.getCurrentUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('quizzes')
        .update({
          title: updates.title,
          description: updates.description,
          subject: updates.subject,
          is_favorite: updates.isFavorite,
          tags: updates.tags,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error

      return this._mapQuizFromDatabase(data)
    } catch (error) {
      console.error('Error updating quiz:', error)
      throw error
    }
  }

  async deleteQuiz(id) {
    try {
      const { user } = await authService.getCurrentUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error

      return true
    } catch (error) {
      console.error('Error deleting quiz:', error)
      throw error
    }
  }

  async toggleQuizFavorite(id) {
    try {
      const quiz = await this.getQuizById(id)
      return await this.updateQuiz(id, { isFavorite: !quiz.isFavorite })
    } catch (error) {
      console.error('Error toggling favorite:', error)
      throw error
    }
  }

  // ==================== ATTEMPT OPERATIONS ====================

  async recordAttempt(quizId, attemptData) {
    try {
      const { user } = await authService.getCurrentUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('quiz_attempts')
        .insert({
          quiz_id: quizId,
          user_id: user.id,
          score: attemptData.score,
          total_questions: attemptData.totalQuestions,
          answers: attemptData.answers,
          time_spent_seconds: attemptData.timeSpentSeconds || null,
          completed_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      return this._mapAttemptFromDatabase(data)
    } catch (error) {
      console.error('Error recording attempt:', error)
      throw error
    }
  }

  async getAttemptHistory(quizId) {
    try {
      const { user } = await authService.getCurrentUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('quiz_id', quizId)
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })

      if (error) throw error

      return data.map(this._mapAttemptFromDatabase)
    } catch (error) {
      console.error('Error fetching attempt history:', error)
      throw error
    }
  }

  async getUserAttemptHistory(limit = 20) {
    try {
      const { user } = await authService.getCurrentUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('*, quizzes(title, subject)')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return data.map(attempt => ({
        ...this._mapAttemptFromDatabase(attempt),
        quizTitle: attempt.quizzes?.title,
        quizSubject: attempt.quizzes?.subject
      }))
    } catch (error) {
      console.error('Error fetching user attempts:', error)
      throw error
    }
  }

  // ==================== SEARCH ====================

  async searchQuizzes(query) {
    try {
      const { user } = await authService.getCurrentUser()
      if (!user) throw new Error('Not authenticated')

      const lowerQuery = query.toLowerCase()

      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('user_id', user.id)
        .or(`title.ilike.%${lowerQuery}%,description.ilike.%${lowerQuery}%,subject.ilike.%${lowerQuery}%`)
        .order('updated_at', { ascending: false })

      if (error) throw error

      return data.map(this._mapQuizFromDatabase)
    } catch (error) {
      console.error('Error searching quizzes:', error)
      throw error
    }
  }

  // ==================== STATISTICS ====================

  async getQuizStatistics(quizId) {
    try {
      const { user } = await authService.getCurrentUser()
      if (!user) throw new Error('Not authenticated')

      const { data: attempts, error } = await supabase
        .from('quiz_attempts')
        .select('score, total_questions, completed_at')
        .eq('quiz_id', quizId)
        .eq('user_id', user.id)

      if (error) throw error

      if (attempts.length === 0) {
        return {
          totalAttempts: 0,
          bestScore: 0,
          averageScore: 0,
          lastAttempt: null
        }
      }

      const scores = attempts.map(a => (a.score / a.total_questions) * 100)

      return {
        totalAttempts: attempts.length,
        bestScore: Math.max(...scores),
        averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
        lastAttempt: attempts[0].completed_at
      }
    } catch (error) {
      console.error('Error fetching quiz statistics:', error)
      throw error
    }
  }

  // ==================== MAPPERS ====================

  _mapQuizFromDatabase(dbQuiz) {
    return {
      id: dbQuiz.id,
      userId: dbQuiz.user_id,
      title: dbQuiz.title,
      description: dbQuiz.description,
      subject: dbQuiz.subject,
      sourceFileId: dbQuiz.source_file_id,
      questionCount: dbQuiz.question_count,
      bestScore: dbQuiz.best_score,
      isFavorite: dbQuiz.is_favorite,
      tags: dbQuiz.tags || [],
      createdAt: dbQuiz.created_at,
      updatedAt: dbQuiz.updated_at
    }
  }

  _mapQuestionFromDatabase(dbQuestion) {
    return {
      id: dbQuestion.id,
      quizId: dbQuestion.quiz_id,
      type: dbQuestion.question_type,
      question: dbQuestion.question_text,
      options: dbQuestion.options || [],
      correctAnswer: dbQuestion.correct_answer,
      explanation: dbQuestion.explanation,
      difficulty: dbQuestion.difficulty,
      orderIndex: dbQuestion.order_index,
      createdAt: dbQuestion.created_at
    }
  }

  _mapAttemptFromDatabase(dbAttempt) {
    return {
      id: dbAttempt.id,
      quizId: dbAttempt.quiz_id,
      userId: dbAttempt.user_id,
      score: dbAttempt.score,
      totalQuestions: dbAttempt.total_questions,
      percentage: (dbAttempt.score / dbAttempt.total_questions) * 100,
      answers: dbAttempt.answers,
      timeSpentSeconds: dbAttempt.time_spent_seconds,
      completedAt: dbAttempt.completed_at
    }
  }
}

export default new SupabaseQuizService()
