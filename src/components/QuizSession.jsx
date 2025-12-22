import { useState, useEffect } from 'react'
import { useStudy } from '../contexts/StudyContext'
import { toast } from './Toast'

const QuizSession = ({ quiz, onComplete, onExit }) => {
  const { recordQuizAttempt } = useStudy()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [showResults, setShowResults] = useState(false)
  const [startTime] = useState(Date.now())
  const [results, setResults] = useState(null)

  const currentQuestion = quiz.questions[currentIndex]
  const progress = ((currentIndex + 1) / quiz.questions.length) * 100

  // Handle answer selection
  const handleAnswer = (answer) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer
    }))
  }

  // Navigate to next question
  const handleNext = () => {
    if (currentIndex < quiz.questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      completeQuiz()
    }
  }

  // Navigate to previous question
  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  // Complete quiz and calculate score
  const completeQuiz = async () => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000)
    let correctCount = 0

    const detailedAnswers = quiz.questions.map(q => {
      const userAnswer = answers[q.id]
      let isCorrect = false

      if (q.type === 'multiple_choice') {
        isCorrect = userAnswer === q.correctAnswer
      } else if (q.type === 'true_false') {
        isCorrect = userAnswer === q.correctAnswer
      } else if (q.type === 'short_answer') {
        // Simple check - could be enhanced with fuzzy matching
        const userLower = (userAnswer || '').toLowerCase().trim()
        const correctLower = q.correctAnswer.toLowerCase().trim()
        isCorrect = userLower.includes(correctLower) || correctLower.includes(userLower)
      }

      if (isCorrect) correctCount++

      return {
        questionId: q.id,
        question: q.question,
        userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect,
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

    // Record attempt in database
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

  // Results screen
  if (showResults && results) {
    return (
      <div className="min-h-screen bg-dark-bg-primary p-6">
        <div className="max-w-4xl mx-auto">
          {/* Results Header */}
          <div className="text-center mb-8">
            <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center mb-6 ${
              results.percentage >= 80 ? 'bg-green-500/20' : results.percentage >= 60 ? 'bg-yellow-500/20' : 'bg-red-500/20'
            }`}>
              <div className="text-center">
                <div className={`text-4xl font-bold ${
                  results.percentage >= 80 ? 'text-green-500' : results.percentage >= 60 ? 'text-yellow-500' : 'text-red-500'
                }`}>
                  {Math.round(results.percentage)}%
                </div>
                <div className="text-sm text-dark-text-secondary">Score</div>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-dark-text-primary mb-2">Quiz Complete!</h2>
            <p className="text-dark-text-secondary">
              {results.score} out of {results.totalQuestions} correct • Time: {Math.floor(results.timeSpentSeconds / 60)}:{(results.timeSpentSeconds % 60).toString().padStart(2, '0')}
            </p>
          </div>

          {/* Question Breakdown */}
          <div className="bg-dark-bg-secondary rounded-xl border border-dark-border-subtle p-6 mb-6">
            <h3 className="text-xl font-bold text-dark-text-primary mb-4">Question Breakdown</h3>
            <div className="space-y-4">
              {results.detailedAnswers.map((answer, index) => (
                <div key={index} className={`p-4 rounded-lg border ${
                  answer.isCorrect ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      answer.isCorrect ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {answer.isCorrect ? (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-dark-text-primary mb-2">Q{index + 1}: {answer.question}</p>
                      <div className="space-y-1 text-sm">
                        <p className={answer.isCorrect ? 'text-green-400' : 'text-red-400'}>
                          Your answer: {answer.userAnswer || '(No answer)'}
                        </p>
                        {!answer.isCorrect && (
                          <p className="text-green-400">
                            Correct answer: {answer.correctAnswer}
                          </p>
                        )}
                        {answer.explanation && (
                          <p className="text-dark-text-secondary mt-2 pt-2 border-t border-dark-border-subtle">
                            {answer.explanation}
                          </p>
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
              className="flex-1 py-3 px-6 bg-gradient-to-r from-primary-500 to-accent-cyan text-white font-semibold rounded-lg hover:scale-[1.02] transition-all"
            >
              Retake Quiz
            </button>
            <button
              onClick={onComplete || onExit}
              className="flex-1 py-3 px-6 bg-dark-bg-secondary border border-dark-border-subtle text-dark-text-primary font-semibold rounded-lg hover:bg-dark-bg-tertiary transition-all"
            >
              Return to Study Hub
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Quiz taking screen
  return (
    <div className="min-h-screen bg-dark-bg-primary p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-dark-text-primary">{quiz.title}</h2>
            <p className="text-dark-text-secondary">Question {currentIndex + 1} of {quiz.questions.length}</p>
          </div>
          <button
            onClick={onExit}
            className="w-10 h-10 rounded-lg bg-dark-bg-secondary border border-dark-border-subtle flex items-center justify-center hover:bg-dark-bg-tertiary transition-colors"
          >
            <svg className="w-6 h-6 text-dark-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-dark-bg-secondary rounded-full h-2 mb-8">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-accent-cyan rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* Question Card */}
        <div className="bg-dark-bg-secondary rounded-xl border border-dark-border-subtle p-8 mb-6">
          {/* Question */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                currentQuestion.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                currentQuestion.difficulty === 'hard' ? 'bg-red-500/20 text-red-400' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>
                {currentQuestion.difficulty}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary-500/20 text-primary-400">
                {currentQuestion.type.replace('_', ' ')}
              </span>
            </div>
            <h3 className="text-xl font-semibold text-dark-text-primary">
              {currentQuestion.question}
            </h3>
          </div>

          {/* Answer Options */}
          {currentQuestion.type === 'multiple_choice' && (
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <label
                  key={index}
                  className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                    answers[currentQuestion.id] === index.toString()
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-dark-border-subtle hover:border-primary-500/50 hover:bg-dark-bg-tertiary'
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    checked={answers[currentQuestion.id] === index.toString()}
                    onChange={() => handleAnswer(index.toString())}
                    className="w-5 h-5"
                  />
                  <span className="flex-1 text-dark-text-primary">{option}</span>
                </label>
              ))}
            </div>
          )}

          {currentQuestion.type === 'true_false' && (
            <div className="flex gap-4">
              <button
                onClick={() => handleAnswer('true')}
                className={`flex-1 py-6 rounded-lg border-2 font-semibold transition-all ${
                  answers[currentQuestion.id] === 'true'
                    ? 'border-green-500 bg-green-500/20 text-green-400'
                    : 'border-dark-border-subtle text-dark-text-primary hover:border-green-500/50'
                }`}
              >
                True
              </button>
              <button
                onClick={() => handleAnswer('false')}
                className={`flex-1 py-6 rounded-lg border-2 font-semibold transition-all ${
                  answers[currentQuestion.id] === 'false'
                    ? 'border-red-500 bg-red-500/20 text-red-400'
                    : 'border-dark-border-subtle text-dark-text-primary hover:border-red-500/50'
                }`}
              >
                False
              </button>
            </div>
          )}

          {currentQuestion.type === 'short_answer' && (
            <textarea
              value={answers[currentQuestion.id] || ''}
              onChange={(e) => handleAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full h-32 p-4 bg-dark-bg-tertiary border border-dark-border-subtle rounded-lg text-dark-text-primary resize-none focus:outline-none focus:border-primary-500 transition-colors"
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="px-6 py-3 bg-dark-bg-secondary border border-dark-border-subtle text-dark-text-primary font-semibold rounded-lg hover:bg-dark-bg-tertiary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>

          <div className="text-sm text-dark-text-secondary">
            {Object.keys(answers).length} of {quiz.questions.length} answered
          </div>

          <button
            onClick={handleNext}
            disabled={!answers[currentQuestion.id]}
            className="px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-cyan text-white font-semibold rounded-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {currentIndex === quiz.questions.length - 1 ? 'Finish Quiz' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default QuizSession
