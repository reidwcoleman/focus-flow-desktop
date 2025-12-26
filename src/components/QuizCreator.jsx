/**
 * QuizCreator Component
 * Multi-step wizard for creating quizzes from uploaded files
 */

import { useState } from 'react'
import fileProcessingService from '../services/fileProcessingService'
import studyGenerationService from '../services/studyGenerationService'
import { useStudy } from '../contexts/StudyContext'
import { toast } from './Toast'

const QuizCreator = ({ onComplete, onBack, onStartQuiz }) => {
  const { loadQuizzes, getQuizById } = useStudy()

  // Wizard state
  const [step, setStep] = useState('upload') // upload, preview, options, generating, complete
  const [file, setFile] = useState(null)
  const [extractedText, setExtractedText] = useState('')
  const [metadata, setMetadata] = useState({})
  const [dragActive, setDragActive] = useState(false)

  // Quiz configuration
  const [quizConfig, setQuizConfig] = useState({
    title: '',
    subject: '',
    multipleChoice: 10,
    trueFalse: 5,
    shortAnswer: 3
  })

  // Generation state
  const [progress, setProgress] = useState({ message: '', percent: 0 })
  const [generatedQuiz, setGeneratedQuiz] = useState(null)

  // ==================== FILE HANDLING ====================

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0])
    }
  }

  const processFile = async (selectedFile) => {
    try {
      setFile(selectedFile)
      setProgress({ message: 'Extracting text from file...', percent: 20 })

      const result = await fileProcessingService.processFile(selectedFile, {
        onProgress: (p) => setProgress({ message: p.message || 'Processing...', percent: p.progress || 30 })
      })

      setExtractedText(result.text)
      setMetadata(result.metadata)

      // Set default title from filename
      const defaultTitle = selectedFile.name.replace(/\.[^.]+$/, '')
      setQuizConfig(prev => ({ ...prev, title: defaultTitle }))

      setStep('preview')
    } catch (error) {
      console.error('File processing error:', error)
      toast.error(error.message || 'Failed to process file')
      setFile(null)
    }
  }

  // ==================== QUIZ GENERATION ====================

  const startGeneration = async () => {
    setStep('generating')
    setProgress({ message: 'Preparing content...', percent: 10 })

    try {
      setProgress({ message: 'Generating quiz questions with AI...', percent: 30 })

      const quiz = await studyGenerationService.generateAndSaveQuiz(extractedText, {
        title: quizConfig.title || 'Generated Quiz',
        subject: quizConfig.subject || 'General',
        multipleChoice: quizConfig.multipleChoice,
        trueFalse: quizConfig.trueFalse,
        shortAnswer: quizConfig.shortAnswer
      })

      setProgress({ message: 'Quiz created successfully!', percent: 100 })
      setGeneratedQuiz(quiz)

      await loadQuizzes()
      setStep('complete')
      toast.success('Quiz created successfully!')
    } catch (error) {
      console.error('Quiz generation error:', error)
      toast.error(error.message || 'Failed to generate quiz')
      setStep('options')
    }
  }

  const handleTakeQuiz = async () => {
    if (generatedQuiz && onStartQuiz) {
      const fullQuiz = await getQuizById(generatedQuiz.id)
      onStartQuiz(fullQuiz)
    }
  }

  // ==================== STEP RENDERERS ====================

  const renderUploadStep = () => (
    <div className="animate-fade-in">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
          dragActive
            ? 'border-success bg-success/10'
            : 'border-border hover:border-success/50 bg-surface-elevated'
        }`}
      >
        <input
          type="file"
          accept=".pdf,.docx,.doc,.txt,.jpg,.jpeg,.png,.gif,.webp"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="space-y-6">
          {/* Upload Icon */}
          <div className="w-20 h-20 mx-auto rounded-2xl bg-success/15 flex items-center justify-center">
            <svg className="w-10 h-10 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>

          {/* Text */}
          <div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">
              Drop your file here or click to browse
            </h3>
            <p className="text-text-muted">
              Upload study materials to generate a custom quiz
            </p>
          </div>

          {/* Supported formats */}
          <div className="flex items-center justify-center gap-6 pt-2">
            {[
              { icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z', label: 'PDF' },
              { icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', label: 'DOCX' },
              { icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', label: 'TXT' },
              { icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', label: 'Images' }
            ].map((format) => (
              <div key={format.label} className="flex items-center gap-2 text-text-muted">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={format.icon} />
                </svg>
                <span className="text-sm">{format.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="mt-6 p-4 bg-surface-elevated rounded-xl border border-border">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-success/15 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="font-medium text-text-primary">Tips for best results</h4>
            <ul className="mt-2 text-sm text-text-muted space-y-1">
              <li>Upload lecture notes, textbook chapters, or study guides</li>
              <li>Clear, well-organized content generates better questions</li>
              <li>Max file size: 25 MB</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )

  const renderPreviewStep = () => (
    <div className="animate-fade-in space-y-6">
      {/* File Info Card */}
      <div className="bg-surface-elevated rounded-xl p-5 border border-border">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-success/15 flex items-center justify-center">
            <svg className="w-7 h-7 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-text-primary">{file?.name}</h3>
            <div className="flex items-center gap-3 mt-1 text-sm text-text-muted">
              {metadata.pageCount && <span>{metadata.pageCount} pages</span>}
              {metadata.wordCount && <span>{metadata.wordCount} words</span>}
              <span>{(file?.size / 1024).toFixed(0)} KB</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-success/15 flex items-center justify-center">
            <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Extracted Text */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-text-primary">
            Extracted Content
          </label>
          <span className="text-xs text-text-muted">
            {extractedText.length.toLocaleString()} characters
          </span>
        </div>
        <textarea
          value={extractedText}
          onChange={(e) => setExtractedText(e.target.value)}
          className="w-full h-72 p-4 bg-surface-base border border-border rounded-xl text-text-primary font-mono text-sm resize-none focus:outline-none focus:border-success/50 focus:ring-1 focus:ring-success/20 transition-all"
          placeholder="Extracted text will appear here..."
        />
        <p className="text-xs text-text-muted">
          You can edit the text before generating your quiz
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => setStep('options')}
          disabled={!extractedText.trim()}
          className="flex-1 py-3 px-6 bg-success hover:bg-success/90 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          Continue
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
        <button
          onClick={() => {
            setFile(null)
            setExtractedText('')
            setStep('upload')
          }}
          className="px-6 py-3 bg-surface-elevated border border-border text-text-primary font-medium rounded-xl hover:bg-surface-overlay transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  )

  const renderOptionsStep = () => (
    <div className="animate-fade-in space-y-6">
      {/* Quiz Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-text-primary">Quiz Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">Quiz Title</label>
            <input
              type="text"
              value={quizConfig.title}
              onChange={(e) => setQuizConfig(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter quiz title..."
              className="w-full px-4 py-3 bg-surface-base border border-border rounded-xl text-text-primary focus:outline-none focus:border-success/50 focus:ring-1 focus:ring-success/20 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">Subject</label>
            <input
              type="text"
              value={quizConfig.subject}
              onChange={(e) => setQuizConfig(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="e.g., Chemistry, History..."
              className="w-full px-4 py-3 bg-surface-base border border-border rounded-xl text-text-primary focus:outline-none focus:border-success/50 focus:ring-1 focus:ring-success/20 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Question Types */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-text-primary">Question Types</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Multiple Choice */}
          <div className="p-5 bg-surface-elevated rounded-xl border border-border hover:border-success/30 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-text-primary">Multiple Choice</h4>
                <p className="text-xs text-text-muted">4 options each</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="50"
                value={quizConfig.multipleChoice}
                onChange={(e) => setQuizConfig(prev => ({ ...prev, multipleChoice: parseInt(e.target.value) || 0 }))}
                className="w-20 px-3 py-2 bg-surface-base border border-border rounded-lg text-text-primary text-center focus:outline-none focus:border-success/50"
              />
              <span className="text-sm text-text-muted">questions</span>
            </div>
          </div>

          {/* True/False */}
          <div className="p-5 bg-surface-elevated rounded-xl border border-border hover:border-success/30 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-accent-cool/15 flex items-center justify-center">
                <svg className="w-5 h-5 text-accent-cool" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-text-primary">True / False</h4>
                <p className="text-xs text-text-muted">Statement based</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="50"
                value={quizConfig.trueFalse}
                onChange={(e) => setQuizConfig(prev => ({ ...prev, trueFalse: parseInt(e.target.value) || 0 }))}
                className="w-20 px-3 py-2 bg-surface-base border border-border rounded-lg text-text-primary text-center focus:outline-none focus:border-success/50"
              />
              <span className="text-sm text-text-muted">questions</span>
            </div>
          </div>

          {/* Short Answer */}
          <div className="p-5 bg-surface-elevated rounded-xl border border-border hover:border-success/30 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-warning/15 flex items-center justify-center">
                <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-text-primary">Short Answer</h4>
                <p className="text-xs text-text-muted">Written response</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="50"
                value={quizConfig.shortAnswer}
                onChange={(e) => setQuizConfig(prev => ({ ...prev, shortAnswer: parseInt(e.target.value) || 0 }))}
                className="w-20 px-3 py-2 bg-surface-base border border-border rounded-lg text-text-primary text-center focus:outline-none focus:border-success/50"
              />
              <span className="text-sm text-text-muted">questions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Total Questions */}
      <div className="p-4 bg-success/10 border border-success/30 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span className="font-medium text-success">Total Questions</span>
          </div>
          <span className="text-2xl font-bold text-success">
            {quizConfig.multipleChoice + quizConfig.trueFalse + quizConfig.shortAnswer}
          </span>
        </div>
      </div>

      {/* AI Info */}
      <div className="p-4 bg-primary/10 border border-primary/30 rounded-xl">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-primary mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-primary">AI-Powered Generation</p>
            <p className="text-sm text-text-muted mt-1">
              Using UltraThink mode for high-quality, contextually relevant questions. Generation takes 15-30 seconds.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={startGeneration}
          disabled={quizConfig.multipleChoice + quizConfig.trueFalse + quizConfig.shortAnswer === 0}
          className="flex-1 py-3 px-6 bg-success hover:bg-success/90 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Generate Quiz
        </button>
        <button
          onClick={() => setStep('preview')}
          className="px-6 py-3 bg-surface-elevated border border-border text-text-primary font-medium rounded-xl hover:bg-surface-overlay transition-all"
        >
          Back
        </button>
      </div>
    </div>
  )

  const renderGeneratingStep = () => (
    <div className="animate-fade-in text-center py-12">
      {/* Spinner */}
      <div className="w-24 h-24 mx-auto mb-8 relative">
        <div className="absolute inset-0 rounded-full border-4 border-success/20" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-success animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-10 h-10 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
      </div>

      {/* Text */}
      <h3 className="text-2xl font-semibold text-text-primary mb-3">
        Creating Your Quiz
      </h3>
      <p className="text-text-muted mb-8 max-w-md mx-auto">
        {progress.message || 'Analyzing content and generating questions...'}
      </p>

      {/* Progress Bar */}
      <div className="max-w-md mx-auto">
        <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-success to-accent-cool transition-all duration-500 ease-out"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <p className="text-sm text-text-muted mt-3">
          This may take 15-30 seconds
        </p>
      </div>
    </div>
  )

  const renderCompleteStep = () => (
    <div className="animate-fade-in space-y-8">
      {/* Success Icon */}
      <div className="text-center py-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-success/20 flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-semibold text-text-primary mb-2">
          Quiz Created!
        </h3>
        <p className="text-text-muted">
          Your quiz is ready to take
        </p>
      </div>

      {/* Quiz Summary */}
      {generatedQuiz && (
        <div className="bg-surface-elevated rounded-2xl border border-border overflow-hidden">
          <div className="p-5 bg-gradient-to-r from-success/10 to-transparent border-b border-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/15 flex items-center justify-center">
                <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-text-primary">{generatedQuiz.title}</h4>
                <p className="text-sm text-text-muted">{generatedQuiz.subject}</p>
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-surface-base rounded-xl">
                <div className="text-2xl font-bold text-primary">{generatedQuiz.questions?.filter(q => q.questionType === 'multiple_choice').length || 0}</div>
                <div className="text-xs text-text-muted mt-1">Multiple Choice</div>
              </div>
              <div className="text-center p-4 bg-surface-base rounded-xl">
                <div className="text-2xl font-bold text-accent-cool">{generatedQuiz.questions?.filter(q => q.questionType === 'true_false').length || 0}</div>
                <div className="text-xs text-text-muted mt-1">True/False</div>
              </div>
              <div className="text-center p-4 bg-surface-base rounded-xl">
                <div className="text-2xl font-bold text-warning">{generatedQuiz.questions?.filter(q => q.questionType === 'short_answer').length || 0}</div>
                <div className="text-xs text-text-muted mt-1">Short Answer</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleTakeQuiz}
          className="flex-1 py-3 px-6 bg-success hover:bg-success/90 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          </svg>
          Take Quiz Now
        </button>
        <button
          onClick={() => {
            setFile(null)
            setExtractedText('')
            setGeneratedQuiz(null)
            setStep('upload')
            setQuizConfig({
              title: '',
              subject: '',
              multipleChoice: 10,
              trueFalse: 5,
              shortAnswer: 3
            })
          }}
          className="px-6 py-3 bg-surface-elevated border border-border text-text-primary font-medium rounded-xl hover:bg-surface-overlay transition-all flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create Another
        </button>
      </div>

      {/* Return Link */}
      <button
        onClick={() => onComplete && onComplete()}
        className="w-full py-3 text-text-muted hover:text-text-primary transition-colors text-sm font-medium"
      >
        Return to Study Hub
      </button>
    </div>
  )

  // ==================== PROGRESS STEPS ====================

  const steps = [
    { key: 'upload', label: 'Upload' },
    { key: 'preview', label: 'Preview' },
    { key: 'options', label: 'Configure' },
    { key: 'generating', label: 'Generate' },
    { key: 'complete', label: 'Done' }
  ]

  const currentStepIndex = steps.findIndex(s => s.key === step)

  // ==================== MAIN RENDER ====================

  return (
    <div className="min-h-screen bg-surface-base p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-surface-elevated border border-border flex items-center justify-center hover:bg-surface-overlay transition-colors group"
          >
            <svg className="w-5 h-5 text-text-muted group-hover:text-text-primary group-hover:-translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Create Quiz</h1>
            <p className="text-text-muted">Upload study materials to generate a custom quiz</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2">
          {steps.map((s, index) => {
            const isActive = index === currentStepIndex
            const isCompleted = index < currentStepIndex

            return (
              <div key={s.key} className="flex items-center flex-1">
                <div className="flex-1 flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-success text-white'
                        : isCompleted
                        ? 'bg-success/20 text-success'
                        : 'bg-surface-elevated text-text-muted border border-border'
                    }`}
                  >
                    {isCompleted ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 rounded-full transition-colors ${
                      isCompleted ? 'bg-success' : 'bg-border'
                    }`} />
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Content */}
        <div className="bg-surface-elevated rounded-2xl border border-border p-6 lg:p-8">
          {step === 'upload' && renderUploadStep()}
          {step === 'preview' && renderPreviewStep()}
          {step === 'options' && renderOptionsStep()}
          {step === 'generating' && renderGeneratingStep()}
          {step === 'complete' && renderCompleteStep()}
        </div>
      </div>
    </div>
  )
}

export default QuizCreator
