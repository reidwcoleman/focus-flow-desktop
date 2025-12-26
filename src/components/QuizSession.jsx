import { useState } from 'react'
import { useStudy } from '../contexts/StudyContext'

const QuizSession = ({ quiz, onComplete, onExit }) => {
  const { recordQuizAttempt } = useStudy()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [showResults, setShowResults] = useState(false)
  const [startTime] = useState(Date.now())
  const [results, setResults] = useState(null)

  const currentQuestion = quiz.questions[currentIndex]
  const progress = ((currentIndex + 1) / quiz.questions.length) * 100

  // ==================== FUZZY MATCHING FOR SHORT ANSWERS ====================

  /**
   * Normalize text for comparison:
   * - Lowercase
   * - Remove punctuation
   * - Normalize whitespace
   * - Remove common filler words
   */
  const normalizeText = (text) => {
    if (!text) return ''
    return text
      .toLowerCase()
      .replace(/[.,!?;:'"()\[\]{}\-_]/g, ' ') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }

  /**
   * Extract key words from text (remove common stop words)
   */
  const extractKeyWords = (text) => {
    const stopWords = new Set([
      'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
      'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
      'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
      'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here',
      'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more',
      'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
      'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or',
      'because', 'until', 'while', 'although', 'though', 'after', 'before',
      'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she',
      'we', 'they', 'what', 'which', 'who', 'whom', 'whose', 'also'
    ])

    const normalized = normalizeText(text)
    return normalized
      .split(' ')
      .filter(word => word.length > 1 && !stopWords.has(word))
  }

  /**
   * Calculate similarity score between two strings (0-1)
   */
  const calculateSimilarity = (str1, str2) => {
    const s1 = normalizeText(str1)
    const s2 = normalizeText(str2)

    // Exact match after normalization
    if (s1 === s2) return 1.0

    // Check if one contains the other
    if (s1.includes(s2) || s2.includes(s1)) return 0.9

    // Word-based matching
    const words1 = extractKeyWords(str1)
    const words2 = extractKeyWords(str2)

    if (words1.length === 0 || words2.length === 0) {
      // Fall back to character comparison for very short answers
      return s1 === s2 ? 1.0 : 0
    }

    // Count matching words
    let matchCount = 0
    for (const word1 of words1) {
      for (const word2 of words2) {
        // Check for exact match or if one word contains the other (handles plurals)
        if (word1 === word2 ||
            (word1.length > 3 && word2.length > 3 &&
             (word1.includes(word2) || word2.includes(word1)))) {
          matchCount++
          break
        }
      }
    }

    // Calculate overlap ratio
    const maxWords = Math.max(words1.length, words2.length)
    const minWords = Math.min(words1.length, words2.length)

    // Score based on how many key words match
    const overlapScore = matchCount / maxWords

    // Bonus if most of the shorter answer's words are found
    const coverageScore = matchCount / minWords

    return Math.min(1.0, (overlapScore * 0.6) + (coverageScore * 0.4))
  }

  /**
   * Check if short answer is correct using fuzzy matching
   * Returns { isCorrect: boolean, similarity: number }
   */
  const checkShortAnswer = (userAnswer, correctAnswer) => {
    if (!userAnswer || !userAnswer.trim()) {
      return { isCorrect: false, similarity: 0 }
    }

    const similarity = calculateSimilarity(userAnswer, correctAnswer)

    // Consider correct if similarity is above threshold (60%)
    // This allows for minor differences in wording, punctuation, etc.
    const isCorrect = similarity >= 0.6

    return { isCorrect, similarity }
  }

  // ==================== HANDLERS ====================

  const handleAnswer = (answer) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer
    }))
  }

  const handleNext = () => {
    if (currentIndex < quiz.questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      completeQuiz()
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const completeQuiz = async () => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000)
    let correctCount = 0

    const detailedAnswers = quiz.questions.map(q => {
      const userAnswer = answers[q.id]
      let isCorrect = false
      let similarity = null

      if (q.questionType === 'multiple_choice' || q.type === 'multiple_choice') {
        isCorrect = userAnswer === q.correctAnswer
      } else if (q.questionType === 'true_false' || q.type === 'true_false') {
        isCorrect = userAnswer === q.correctAnswer
      } else if (q.questionType === 'short_answer' || q.type === 'short_answer') {
        const result = checkShortAnswer(userAnswer, q.correctAnswer)
        isCorrect = result.isCorrect
        similarity = result.similarity
      }

      if (isCorrect) correctCount++

      return {
        questionId: q.id,
        question: q.questionText || q.question,
        questionType: q.questionType || q.type,
        userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect,
        similarity,
        explanation: q.explanation
      }
    })

    const quizResults = {
      score: correctCount,
      totalQuestions: quiz.questions.length,
      percentage: (correctCount / quiz.questions.length) * 100,
      timeSpentSeconds: timeSpent,
      detailedAnswers
    }

    setResults(quizResults)
    setShowResults(true)

    try {
      await recordQuizAttempt(quiz.id, {
        score: correctCount,
        totalQuestions: quiz.questions.length,
        answers: detailedAnswers,
        timeSpentSeconds: timeSpent
      })
    } catch (error) {
      console.error('Failed to record attempt:', error)
    }
  }

  // Get question type (handle both formats)
  const getQuestionType = (q) => q.questionType || q.type
  const getQuestionText = (q) => q.questionText || q.question

  // ==================== RESULTS SCREEN ====================

  if (showResults && results) {
    return (
      <div className="min-h-screen bg-surface-base p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Results Header */}
          <div className="text-center py-8">
            <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center mb-6 ${
              results.percentage >= 80 ? 'bg-success/20' : results.percentage >= 60 ? 'bg-warning/20' : 'bg-error/20'
            }`}>
              <div className="text-center">
                <div className={`text-5xl font-bold ${
                  results.percentage >= 80 ? 'text-success' : results.percentage >= 60 ? 'text-warning' : 'text-error'
                }`}>
                  {Math.round(results.percentage)}%
                </div>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-text-primary mb-3">Quiz Complete!</h2>
            <p className="text-text-muted text-lg">
              {results.score} out of {results.totalQuestions} correct
              <span className="mx-2">•</span>
              {Math.floor(results.timeSpentSeconds / 60)}:{(results.timeSpentSeconds % 60).toString().padStart(2, '0')}
            </p>
          </div>

          {/* Question Breakdown */}
          <div className="bg-surface-elevated rounded-2xl border border-border overflow-hidden">
            <div className="p-5 border-b border-border">
              <h3 className="text-xl font-semibold text-text-primary">Question Breakdown</h3>
            </div>
            <div className="divide-y divide-border">
              {results.detailedAnswers.map((answer, index) => (
                <div key={index} className={`p-5 ${
                  answer.isCorrect ? 'bg-success/5' : 'bg-error/5'
                }`}>
                  <div className="flex items-start gap-4">
                    {/* Status Icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      answer.isCorrect ? 'bg-success/20' : 'bg-error/20'
                    }`}>
                      {answer.isCorrect ? (
                        <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Question */}
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <p className="font-medium text-text-primary">
                          <span className="text-text-muted">Q{index + 1}:</span> {answer.question}
                        </p>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium flex-shrink-0 ${
                          answer.questionType === 'short_answer'
                            ? 'bg-warning/15 text-warning'
                            : answer.questionType === 'true_false'
                            ? 'bg-accent-cool/15 text-accent-cool'
                            : 'bg-primary/15 text-primary'
                        }`}>
                          {answer.questionType?.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Answers */}
                      <div className="space-y-2">
                        <div className={`p-3 rounded-xl ${
                          answer.isCorrect ? 'bg-success/10 border border-success/20' : 'bg-error/10 border border-error/20'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-text-muted uppercase tracking-wide">Your Answer</span>
                            {answer.similarity !== null && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                answer.isCorrect ? 'bg-success/20 text-success' : 'bg-error/20 text-error'
                              }`}>
                                {Math.round(answer.similarity * 100)}% match
                              </span>
                            )}
                          </div>
                          <p className={`${answer.isCorrect ? 'text-success' : 'text-error'}`}>
                            {answer.userAnswer || '(No answer provided)'}
                          </p>
                        </div>

                        {!answer.isCorrect && (
                          <div className="p-3 rounded-xl bg-success/10 border border-success/20">
                            <span className="text-xs font-medium text-text-muted uppercase tracking-wide block mb-1">Correct Answer</span>
                            <p className="text-success">{answer.correctAnswer}</p>
                          </div>
                        )}

                        {answer.explanation && (
                          <div className="p-3 rounded-xl bg-surface-base border border-border mt-3">
                            <span className="text-xs font-medium text-text-muted uppercase tracking-wide block mb-1">Explanation</span>
                            <p className="text-text-secondary text-sm">{answer.explanation}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setCurrentIndex(0)
                setAnswers({})
                setShowResults(false)
                setResults(null)
              }}
              className="flex-1 py-3.5 px-6 bg-primary hover:bg-primary-hover text-text-inverse font-medium rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retake Quiz
            </button>
            <button
              onClick={onComplete || onExit}
              className="flex-1 py-3.5 px-6 bg-surface-elevated border border-border text-text-primary font-medium rounded-xl hover:bg-surface-overlay transition-all"
            >
              Return to Study Hub
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ==================== QUIZ TAKING SCREEN ====================

  return (
    <div className="min-h-screen bg-surface-base p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-text-primary">{quiz.title}</h2>
            <p className="text-text-muted mt-1">Question {currentIndex + 1} of {quiz.questions.length}</p>
          </div>
          <button
            onClick={onExit}
            className="w-10 h-10 rounded-xl bg-surface-elevated border border-border flex items-center justify-center hover:bg-surface-overlay hover:border-error/50 transition-all group"
          >
            <svg className="w-5 h-5 text-text-muted group-hover:text-error transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-surface-elevated rounded-full h-2">
          <div
            className="h-full bg-gradient-to-r from-success to-accent-cool rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question Card */}
        <div className="bg-surface-elevated rounded-2xl border border-border overflow-hidden">
          {/* Question Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-3 mb-4">
              <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                currentQuestion.difficulty === 'easy' ? 'bg-success/15 text-success' :
                currentQuestion.difficulty === 'hard' ? 'bg-error/15 text-error' :
                'bg-warning/15 text-warning'
              }`}>
                {currentQuestion.difficulty}
              </span>
              <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                getQuestionType(currentQuestion) === 'short_answer'
                  ? 'bg-warning/15 text-warning'
                  : getQuestionType(currentQuestion) === 'true_false'
                  ? 'bg-accent-cool/15 text-accent-cool'
                  : 'bg-primary/15 text-primary'
              }`}>
                {getQuestionType(currentQuestion)?.replace('_', ' ')}
              </span>
            </div>
            <h3 className="text-xl font-medium text-text-primary leading-relaxed">
              {getQuestionText(currentQuestion)}
            </h3>
          </div>

          {/* Answer Section */}
          <div className="p-6">
            {/* Multiple Choice */}
            {getQuestionType(currentQuestion) === 'multiple_choice' && (
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => (
                  <label
                    key={index}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      answers[currentQuestion.id] === index.toString()
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 hover:bg-surface-overlay'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      answers[currentQuestion.id] === index.toString()
                        ? 'border-primary bg-primary'
                        : 'border-border'
                    }`}>
                      {answers[currentQuestion.id] === index.toString() && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="flex-1 text-text-primary">{option}</span>
                    <span className="text-text-muted text-sm font-medium">
                      {String.fromCharCode(65 + index)}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {/* True/False */}
            {getQuestionType(currentQuestion) === 'true_false' && (
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleAnswer('true')}
                  className={`py-8 rounded-xl border-2 font-semibold transition-all flex flex-col items-center gap-3 ${
                    answers[currentQuestion.id] === 'true'
                      ? 'border-success bg-success/15 text-success'
                      : 'border-border text-text-primary hover:border-success/50 hover:bg-success/5'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    answers[currentQuestion.id] === 'true' ? 'bg-success/20' : 'bg-surface-base'
                  }`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-lg">True</span>
                </button>
                <button
                  onClick={() => handleAnswer('false')}
                  className={`py-8 rounded-xl border-2 font-semibold transition-all flex flex-col items-center gap-3 ${
                    answers[currentQuestion.id] === 'false'
                      ? 'border-error bg-error/15 text-error'
                      : 'border-border text-text-primary hover:border-error/50 hover:bg-error/5'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    answers[currentQuestion.id] === 'false' ? 'bg-error/20' : 'bg-surface-base'
                  }`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <span className="text-lg">False</span>
                </button>
              </div>
            )}

            {/* Short Answer */}
            {getQuestionType(currentQuestion) === 'short_answer' && (
              <div className="space-y-4">
                <div className="relative">
                  <textarea
                    value={answers[currentQuestion.id] || ''}
                    onChange={(e) => handleAnswer(e.target.value)}
                    placeholder="Type your answer here..."
                    className="w-full h-40 p-5 bg-surface-base border-2 border-border rounded-xl text-text-primary placeholder-text-muted resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-lg"
                  />
                  <div className="absolute bottom-4 right-4 flex items-center gap-2">
                    {answers[currentQuestion.id] && (
                      <span className="text-xs text-text-muted">
                        {answers[currentQuestion.id].length} characters
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                  <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-primary">Flexible Grading</p>
                    <p className="text-xs text-text-muted mt-1">
                      Your answer will be graded on meaning, not exact wording. Minor spelling or punctuation differences are okay.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center bg-surface-elevated rounded-xl border border-border p-4">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-surface-base border border-border text-text-primary font-medium rounded-lg hover:bg-surface-overlay transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm text-text-muted">
              {Object.keys(answers).length} of {quiz.questions.length} answered
            </span>
            <div className="flex gap-1">
              {quiz.questions.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    answers[quiz.questions[idx].id]
                      ? 'bg-success'
                      : idx === currentIndex
                      ? 'bg-primary'
                      : 'bg-border'
                  }`}
                />
              ))}
            </div>
          </div>

          <button
            onClick={handleNext}
            disabled={!answers[currentQuestion.id]}
            className="flex items-center gap-2 px-5 py-2.5 bg-success hover:bg-success/90 text-white font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {currentIndex === quiz.questions.length - 1 ? 'Finish Quiz' : 'Next'}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default QuizSession
