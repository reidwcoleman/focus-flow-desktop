import { useState } from 'react'
import fileProcessingService from '../services/fileProcessingService'
import studyGenerationService from '../services/studyGenerationService'
import { useStudy } from '../contexts/StudyContext'
import { toast } from './Toast'

const FileUploadSection = ({ onComplete, onBack }) => {
  const { addNote, addDeck, addQuiz, loadNotes, loadFlashcards, loadQuizzes } = useStudy()

  const [step, setStep] = useState('select') // select, preview, options, generating, complete
  const [file, setFile] = useState(null)
  const [extractedText, setExtractedText] = useState('')
  const [metadata, setMetadata] = useState({})
  const [dragActive, setDragActive] = useState(false)

  const [generateOptions, setGenerateOptions] = useState({
    notes: true,
    flashcards: true,
    quiz: true,
    quizConfig: {
      multipleChoice: 10,
      trueFalse: 5,
      shortAnswer: 3
    }
  })

  const [progress, setProgress] = useState({
    stage: '',
    progress: 0,
    message: ''
  })

  const [generatedContent, setGeneratedContent] = useState({
    notes: null,
    flashcards: null,
    quiz: null
  })

  // ====================  STEP 1: FILE SELECTION ====================

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
      await processFileSelection(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await processFileSelection(e.target.files[0])
    }
  }

  const processFileSelection = async (selectedFile) => {
    try {
      setFile(selectedFile)
      setProgress({ stage: 'extracting', progress: 0, message: 'Processing file...' })

      // Extract text from file
      const result = await fileProcessingService.processFile(selectedFile, {
        onProgress: setProgress
      })

      setExtractedText(result.text)
      setMetadata(result.metadata)
      setStep('preview')
    } catch (error) {
      console.error('File processing error:', error)
      toast.error(error.message || 'Failed to process file')
      setFile(null)
    }
  }

  // ==================== STEP 2: CONTENT PREVIEW ====================

  const renderPreviewStep = () => (
    <div className="space-y-6">
      {/* File Info */}
      <div className="bg-dark-bg-secondary rounded-lg p-4 border border-dark-border-subtle">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-primary-500/20 flex items-center justify-center">
            {metadata.fileType === 'pdf' && (
              <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            )}
            {metadata.fileType === 'docx' && (
              <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            {metadata.fileType === 'txt' && (
              <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            {metadata.fileType === 'image' && (
              <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-dark-text-primary font-semibold">{file.name}</h3>
            <p className="text-sm text-dark-text-secondary">
              {metadata.pageCount && `${metadata.pageCount} pages • `}
              {metadata.wordCount && `${metadata.wordCount} words • `}
              {(file.size / 1024).toFixed(0)} KB
            </p>
          </div>
        </div>
      </div>

      {/* Extracted Text Preview */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-dark-text-primary">
          Extracted Text ({extractedText.length} characters)
        </label>
        <textarea
          value={extractedText}
          onChange={(e) => setExtractedText(e.target.value)}
          className="w-full h-64 p-4 bg-dark-bg-secondary border border-dark-border-subtle rounded-lg text-dark-text-primary font-mono text-sm resize-none focus:outline-none focus:border-primary-500 transition-colors"
          placeholder="Extracted text will appear here..."
        />
        <p className="text-xs text-dark-text-muted">You can edit the text before generating content</p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setStep('options')}
          disabled={!extractedText.trim()}
          className="flex-1 py-3 px-6 bg-gradient-to-r from-primary-500 to-accent-cyan text-white font-semibold rounded-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue to Generation Options
        </button>
        <button
          onClick={() => {
            setFile(null)
            setExtractedText('')
            setStep('select')
          }}
          className="px-6 py-3 bg-dark-bg-secondary border border-dark-border-subtle text-dark-text-primary font-semibold rounded-lg hover:bg-dark-bg-tertiary transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  )

  // ==================== STEP 3: GENERATION OPTIONS ====================

  const renderOptionsStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-dark-text-primary">What would you like to generate?</h3>

        {/* Notes Option */}
        <label className="flex items-start gap-3 p-4 bg-dark-bg-secondary rounded-lg border border-dark-border-subtle cursor-pointer hover:border-primary-500/50 transition-colors">
          <input
            type="checkbox"
            checked={generateOptions.notes}
            onChange={(e) => setGenerateOptions(prev => ({ ...prev, notes: e.target.checked }))}
            className="mt-1 w-5 h-5 rounded border-dark-border-glow bg-dark-bg-tertiary checked:bg-primary-500"
          />
          <div className="flex-1">
            <div className="font-semibold text-dark-text-primary">Formatted Study Notes</div>
            <p className="text-sm text-dark-text-secondary mt-1">
              Comprehensive notes with key terms, summaries, and organized sections
            </p>
          </div>
        </label>

        {/* Flashcards Option */}
        <label className="flex items-start gap-3 p-4 bg-dark-bg-secondary rounded-lg border border-dark-border-subtle cursor-pointer hover:border-primary-500/50 transition-colors">
          <input
            type="checkbox"
            checked={generateOptions.flashcards}
            onChange={(e) => setGenerateOptions(prev => ({ ...prev, flashcards: e.target.checked }))}
            className="mt-1 w-5 h-5 rounded border-dark-border-glow bg-dark-bg-tertiary checked:bg-primary-500"
          />
          <div className="flex-1">
            <div className="font-semibold text-dark-text-primary">Flashcard Deck</div>
            <p className="text-sm text-dark-text-secondary mt-1">
              20-30 flashcards with hints, covering all key concepts
            </p>
          </div>
        </label>

        {/* Quiz Option */}
        <label className="flex items-start gap-3 p-4 bg-dark-bg-secondary rounded-lg border border-dark-border-subtle cursor-pointer hover:border-primary-500/50 transition-colors">
          <input
            type="checkbox"
            checked={generateOptions.quiz}
            onChange={(e) => setGenerateOptions(prev => ({ ...prev, quiz: e.target.checked }))}
            className="mt-1 w-5 h-5 rounded border-dark-border-glow bg-dark-bg-tertiary checked:bg-primary-500"
          />
          <div className="flex-1">
            <div className="font-semibold text-dark-text-primary">Comprehensive Quiz</div>
            <p className="text-sm text-dark-text-secondary mt-1 mb-3">
              Test your understanding with multiple question types
            </p>

            {generateOptions.quiz && (
              <div className="space-y-2 pl-1">
                <div className="flex items-center gap-3">
                  <label className="text-sm text-dark-text-secondary w-32">Multiple Choice:</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={generateOptions.quizConfig.multipleChoice}
                    onChange={(e) => setGenerateOptions(prev => ({
                      ...prev,
                      quizConfig: { ...prev.quizConfig, multipleChoice: parseInt(e.target.value) || 0 }
                    }))}
                    className="w-20 px-3 py-1 bg-dark-bg-tertiary border border-dark-border-subtle rounded text-dark-text-primary focus:outline-none focus:border-primary-500"
                  />
                  <span className="text-sm text-dark-text-muted">questions</span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-dark-text-secondary w-32">True/False:</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={generateOptions.quizConfig.trueFalse}
                    onChange={(e) => setGenerateOptions(prev => ({
                      ...prev,
                      quizConfig: { ...prev.quizConfig, trueFalse: parseInt(e.target.value) || 0 }
                    }))}
                    className="w-20 px-3 py-1 bg-dark-bg-tertiary border border-dark-border-subtle rounded text-dark-text-primary focus:outline-none focus:border-primary-500"
                  />
                  <span className="text-sm text-dark-text-muted">questions</span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-dark-text-secondary w-32">Short Answer:</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={generateOptions.quizConfig.shortAnswer}
                    onChange={(e) => setGenerateOptions(prev => ({
                      ...prev,
                      quizConfig: { ...prev.quizConfig, shortAnswer: parseInt(e.target.value) || 0 }
                    }))}
                    className="w-20 px-3 py-1 bg-dark-bg-tertiary border border-dark-border-subtle rounded text-dark-text-primary focus:outline-none focus:border-primary-500"
                  />
                  <span className="text-sm text-dark-text-muted">questions</span>
                </div>
              </div>
            )}
          </div>
        </label>
      </div>

      {/* AI Mode Info */}
      <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-primary-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-primary-400">Deep Research AI Mode</p>
            <p className="text-sm text-dark-text-secondary mt-1">
              Using advanced AI (32,000 tokens) for comprehensive, high-quality content generation. This may take 30-60 seconds.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={startGeneration}
          disabled={!generateOptions.notes && !generateOptions.flashcards && !generateOptions.quiz}
          className="flex-1 py-3 px-6 bg-gradient-to-r from-primary-500 to-accent-cyan text-white font-semibold rounded-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Generate Study Materials
        </button>
        <button
          onClick={() => setStep('preview')}
          className="px-6 py-3 bg-dark-bg-secondary border border-dark-border-subtle text-dark-text-primary font-semibold rounded-lg hover:bg-dark-bg-tertiary transition-all"
        >
          Back
        </button>
      </div>
    </div>
  )

  // ==================== STEP 4: GENERATION PROGRESS ====================

  const startGeneration = async () => {
    setStep('generating')
    const results = { notes: null, flashcards: null, quiz: null }

    try {
      // Generate Notes
      if (generateOptions.notes) {
        setProgress({ stage: 'generating', progress: 10, message: 'Generating study notes...' })
        results.notes = await studyGenerationService.generateAndSaveNotes(extractedText, {
          title: metadata.title || file.name.replace(/\.[^.]+$/, ''),
          subject: 'General'
        })
        setProgress({ stage: 'generating', progress: 35, message: 'Notes complete!' })
      }

      // Generate Flashcards
      if (generateOptions.flashcards) {
        setProgress({ stage: 'generating', progress: 40, message: 'Creating flashcard deck...' })
        results.flashcards = await studyGenerationService.generateAndSaveFlashcards(extractedText, {
          title: metadata.title || file.name.replace(/\.[^.]+$/, '') + ' - Flashcards',
          subject: 'General'
        })
        setProgress({ stage: 'generating', progress: 70, message: 'Flashcards complete!' })
      }

      // Generate Quiz
      if (generateOptions.quiz) {
        setProgress({ stage: 'generating', progress: 75, message: 'Building quiz...' })
        results.quiz = await studyGenerationService.generateAndSaveQuiz(extractedText, {
          title: metadata.title || file.name.replace(/\.[^.]+$/, '') + ' - Quiz',
          subject: 'General',
          ...generateOptions.quizConfig
        })
        setProgress({ stage: 'generating', progress: 100, message: 'Quiz complete!' })
      }

      setGeneratedContent(results)
      setProgress({ stage: 'complete', progress: 100, message: 'All done!' })

      // Reload data
      await Promise.all([loadNotes(), loadFlashcards(), loadQuizzes()])

      setStep('complete')
      toast.success('Study materials generated successfully!')
    } catch (error) {
      console.error('Generation error:', error)
      toast.error(error.message || 'Failed to generate content')
      setStep('options')
    }
  }

  const renderGeneratingStep = () => (
    <div className="space-y-6 text-center py-8">
      <div className="w-20 h-20 mx-auto rounded-full bg-primary-500/20 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
      </div>

      <div>
        <h3 className="text-xl font-bold text-dark-text-primary mb-2">
          Generating Study Materials
        </h3>
        <p className="text-dark-text-secondary">{progress.message}</p>
      </div>

      <div className="w-full max-w-md mx-auto bg-dark-bg-secondary rounded-full h-3 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary-500 to-accent-cyan transition-all duration-500"
          style={{ width: `${progress.progress}%` }}
        ></div>
      </div>

      <p className="text-sm text-dark-text-muted">
        Using Deep Research AI mode for maximum quality
      </p>
    </div>
  )

  // ==================== STEP 5: COMPLETION ====================

  const renderCompleteStep = () => (
    <div className="space-y-6">
      <div className="text-center py-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-dark-text-primary mb-2">
          Generation Complete!
        </h3>
        <p className="text-dark-text-secondary">Your study materials are ready</p>
      </div>

      <div className="grid gap-4">
        {generatedContent.notes && (
          <div className="p-4 bg-dark-bg-secondary rounded-lg border border-dark-border-subtle">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-dark-text-primary">Study Notes Created</h4>
                <p className="text-sm text-dark-text-secondary mt-1">{generatedContent.notes.title}</p>
              </div>
              <button
                onClick={() => onComplete && onComplete()}
                className="px-4 py-2 bg-primary-500/20 text-primary-400 rounded-lg hover:bg-primary-500/30 transition-colors text-sm font-semibold"
              >
                View Notes
              </button>
            </div>
          </div>
        )}

        {generatedContent.flashcards && (
          <div className="p-4 bg-dark-bg-secondary rounded-lg border border-dark-border-subtle">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-dark-text-primary">Flashcard Deck Created</h4>
                <p className="text-sm text-dark-text-secondary mt-1">
                  {generatedContent.flashcards.cardCount} cards
                </p>
              </div>
              <button
                onClick={() => onComplete && onComplete()}
                className="px-4 py-2 bg-accent-cyan/20 text-accent-cyan rounded-lg hover:bg-accent-cyan/30 transition-colors text-sm font-semibold"
              >
                Study Now
              </button>
            </div>
          </div>
        )}

        {generatedContent.quiz && (
          <div className="p-4 bg-dark-bg-secondary rounded-lg border border-dark-border-subtle">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-dark-text-primary">Quiz Created</h4>
                <p className="text-sm text-dark-text-secondary mt-1">
                  {generatedContent.quiz.questionCount || generatedContent.quiz.questions?.length} questions
                </p>
              </div>
              <button
                onClick={() => onComplete && onComplete()}
                className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-sm font-semibold"
              >
                Take Quiz
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => {
          setFile(null)
          setExtractedText('')
          setStep('select')
          setGeneratedContent({ notes: null, flashcards: null, quiz: null })
          onComplete && onComplete()
        }}
        className="w-full py-3 px-6 bg-gradient-to-r from-primary-500 to-accent-cyan text-white font-semibold rounded-lg hover:scale-[1.02] transition-all"
      >
        Return to Study Hub
      </button>
    </div>
  )

  // ==================== MAIN RENDER ====================

  const renderSelectStep = () => (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-all ${
        dragActive
          ? 'border-primary-500 bg-primary-500/10'
          : 'border-dark-border-subtle bg-dark-bg-secondary/50'
      }`}
    >
      <input
        type="file"
        accept=".pdf,.docx,.doc,.txt,.jpg,.jpeg,.png,.gif,.webp"
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />

      <div className="space-y-4">
        <div className="w-20 h-20 mx-auto rounded-full bg-primary-500/20 flex items-center justify-center">
          <svg className="w-10 h-10 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>

        <div>
          <p className="text-dark-text-primary font-semibold text-lg mb-2">
            Drop your file here or click to browse
          </p>
          <p className="text-sm text-dark-text-secondary">
            Supports PDF, DOCX, TXT, and images
          </p>
        </div>

        <div className="flex items-center justify-center gap-4 pt-4">
          <div className="flex items-center gap-2 text-dark-text-muted text-sm">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
            </svg>
            PDF
          </div>
          <div className="flex items-center gap-2 text-dark-text-muted text-sm">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
            </svg>
            DOCX
          </div>
          <div className="flex items-center gap-2 text-dark-text-muted text-sm">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
            </svg>
            TXT
          </div>
          <div className="flex items-center gap-2 text-dark-text-muted text-sm">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
            Images
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          {onBack && (
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-lg bg-dark-bg-secondary border border-dark-border-subtle flex items-center justify-center hover:bg-dark-bg-tertiary transition-colors"
            >
              <svg className="w-5 h-5 text-dark-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div>
            <h2 className="text-2xl font-bold text-dark-text-primary">Upload Study Materials</h2>
            <p className="text-dark-text-secondary">Transform your files into quizzes, flashcards, and notes</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 mt-4">
          {['Select', 'Preview', 'Options', 'Generate', 'Complete'].map((label, index) => {
            const stepNames = ['select', 'preview', 'options', 'generating', 'complete']
            const currentIndex = stepNames.indexOf(step)
            const isActive = currentIndex === index
            const isCompleted = currentIndex > index

            return (
              <div key={label} className="flex items-center flex-1">
                <div className={`flex-1 h-1 rounded-full ${isCompleted || isActive ? 'bg-primary-500' : 'bg-dark-border-subtle'}`}></div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  isActive ? 'bg-primary-500 text-white' : isCompleted ? 'bg-green-500 text-white' : 'bg-dark-bg-tertiary text-dark-text-muted'
                }`}>
                  {isCompleted ? '✓' : index + 1}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-dark-bg-primary rounded-xl border border-dark-border-subtle p-6">
        {step === 'select' && renderSelectStep()}
        {step === 'preview' && renderPreviewStep()}
        {step === 'options' && renderOptionsStep()}
        {step === 'generating' && renderGeneratingStep()}
        {step === 'complete' && renderCompleteStep()}
      </div>
    </div>
  )
}

export default FileUploadSection
