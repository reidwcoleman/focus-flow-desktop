import { useState, useRef, useEffect } from 'react'
import visionService from '../services/visionService'
import { useStudy } from '../contexts/StudyContext'
import assignmentsService from '../services/assignmentsService'

const Scanner = ({ onClose, onCapture, initialScanMode = 'homework' }) => {
  const { addNote, addDeckWithCards } = useStudy()
  // Scan mode: homework, notes, flashcards
  const [scanMode, setScanMode] = useState(initialScanMode)

  // UI mode: camera, upload, processing, result
  const [mode, setMode] = useState('camera')

  // Captured data
  const [capturedImage, setCapturedImage] = useState(null)
  const [extractedText, setExtractedText] = useState('')
  const [assignmentData, setAssignmentData] = useState(null)
  const [notesData, setNotesData] = useState(null)
  const [flashcardsData, setFlashcardsData] = useState(null)

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState('')
  const [error, setError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  // Refs
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
      }
    } catch (error) {
      console.error('Camera access error:', error)
      alert('Unable to access camera. Please check permissions.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(videoRef.current, 0, 0)

      const imageData = canvas.toDataURL('image/jpeg')
      setCapturedImage(imageData)
      setMode('processing')
      stopCamera()
      processImage(imageData)
    }
  }

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageData = e.target.result
        setCapturedImage(imageData)
        setMode('processing')
        processImage(imageData)
      }
      reader.readAsDataURL(file)
    }
  }

  const processImage = async (imageData) => {
    setIsProcessing(true)
    setError(null)

    try {
      if (scanMode === 'homework') {
        // Process homework with AI vision
        setProcessingStep('Analyzing assignment with AI vision...')
        const result = await visionService.processHomeworkAssignment(imageData)

        setAssignmentData(result)
        setExtractedText(`📝 Assignment detected!\n\nTitle: ${result.title}\nDue: ${result.dueDate ? new Date(result.dueDate).toLocaleDateString() : 'Not specified'}\nSubject: ${result.subject}\n\nDescription: ${result.description}`)
      } else if (scanMode === 'notes') {
        // Process handwritten notes
        setProcessingStep('Reading handwriting...')
        const result = await visionService.processHandwrittenNotes(imageData)

        setNotesData(result)
        setExtractedText(`📝 Notes Extracted!\n\n${result.title}\n\n${result.rawText}`)
      } else if (scanMode === 'flashcards') {
        // Process textbook to flashcards
        setProcessingStep('Generating flashcards...')
        const result = await visionService.processTextbookToFlashcards(imageData)

        setFlashcardsData(result)
        setExtractedText(`🎴 ${result.flashcards.length} Flashcards Created!\n\nDeck: ${result.title}\nSubject: ${result.subject}`)
      }

      setMode('result')
    } catch (err) {
      console.error('Processing error:', err)
      setError(err.message || 'Failed to process image. Please try again.')
    } finally {
      setIsProcessing(false)
      setProcessingStep('')
    }
  }

  const saveAssignment = async () => {
    if (!assignmentData) return

    setIsSaving(true)
    setError(null)

    try {
      // Save assignment to Supabase
      const { data, error } = await assignmentsService.createAssignment({
        title: assignmentData.title,
        subject: assignmentData.subject,
        dueDate: assignmentData.dueDate,
        priority: assignmentData.priority || 'medium',
        timeEstimate: assignmentData.estimatedTime || assignmentData.timeEstimate,
        description: assignmentData.description,
        aiCaptured: true,
        source: 'scanner',
      })

      if (error) throw error

      console.log(`✅ Successfully saved assignment "${assignmentData.title}"`)

      // Also call onCapture if provided (for backwards compatibility)
      if (onCapture) {
        onCapture(assignmentData)
      }

      onClose()
    } catch (err) {
      console.error('❌ Failed to save assignment:', err)
      setError('Failed to save assignment. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const saveNotes = async () => {
    if (notesData) {
      setIsSaving(true)
      setError(null)

      try {
        // Save note to StudyContext with clean text content (not JSON)
        const noteContent = typeof notesData.formattedContent === 'string' && notesData.formattedContent.includes('{')
          ? notesData.rawText  // If formattedContent looks like JSON, use rawText instead
          : (notesData.formattedContent || notesData.rawText)

        const result = await addNote({
          title: notesData.customTitle || notesData.title,
          content: noteContent,
          rawText: notesData.rawText,
          sourceImage: capturedImage,
          subject: notesData.subject,
          tags: notesData.tags
        })

        if (result) {
          console.log(`✅ Successfully saved note "${result.title}"`)
          onClose()
        } else {
          console.error('❌ Failed to save note')
          setError('Failed to save note. Please try again.')
        }
      } catch (err) {
        console.error('❌ Error saving note:', err)
        setError(err.message || 'Failed to save note. Please try again.')
      } finally {
        setIsSaving(false)
      }
    }
  }

  const saveFlashcards = async () => {
    if (flashcardsData) {
      setIsSaving(true)
      setError(null)

      try {
        // Save deck with cards to StudyContext
        const result = await addDeckWithCards(
          {
            title: flashcardsData.title,
            description: `Generated from scanned image`,
            subject: flashcardsData.subject,
            sourceImage: capturedImage
          },
          flashcardsData.flashcards
        )

        if (result) {
          console.log(`✅ Successfully saved deck "${result.deck.title}" with ${result.cards.length} cards`)
          onClose()
        } else {
          console.error('❌ Failed to save flashcards')
          setError('Failed to save flashcards. Please try again.')
        }
      } catch (err) {
        console.error('❌ Error saving flashcards:', err)
        setError(err.message || 'Failed to save flashcards. Please try again.')
      } finally {
        setIsSaving(false)
      }
    }
  }

  const retake = () => {
    setCapturedImage(null)
    setExtractedText('')
    setAssignmentData(null)
    setNotesData(null)
    setFlashcardsData(null)
    setError(null)
    setMode('camera')
    startCamera()
  }

  // Start camera on mount
  useEffect(() => {
    if (mode === 'camera') {
      startCamera()
    }
    return () => stopCamera()
  }, [mode])

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900 flex items-center justify-center">
      {/* Mobile-sized container - matches app dimensions */}
      <div className="w-full h-full max-w-[28rem] mx-auto bg-neutral-900 relative">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-neutral-900 to-transparent p-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-white font-semibold">
              {scanMode === 'homework' && 'Scan Homework'}
              {scanMode === 'notes' && 'Scan Notes'}
              {scanMode === 'flashcards' && 'Scan Textbook'}
            </h2>
            <div className="w-10"></div>
          </div>

        {/* Mode Selector */}
        {mode === 'camera' && (
          <div className="flex gap-2 px-1">
            <button
              onClick={() => setScanMode('homework')}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                scanMode === 'homework'
                  ? 'bg-white text-neutral-900 shadow-soft'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Homework
            </button>
            <button
              onClick={() => setScanMode('notes')}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                scanMode === 'notes'
                  ? 'bg-white text-neutral-900 shadow-soft'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Notes
            </button>
            <button
              onClick={() => setScanMode('flashcards')}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                scanMode === 'flashcards'
                  ? 'bg-white text-neutral-900 shadow-soft'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Flashcards
            </button>
          </div>
        )}
      </div>

      {/* Camera View */}
      {mode === 'camera' && (
        <div className="relative w-full h-full">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Camera Frame Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[90%] h-[70%] border-4 border-white/50 rounded-3xl shadow-glow-lg"></div>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 pb-8 bg-gradient-to-t from-neutral-900 to-transparent">
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-all"
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>

              <button
                onClick={captureImage}
                className="w-20 h-20 rounded-full bg-white shadow-glow-lg hover:scale-105 transition-all active:scale-95 flex items-center justify-center"
              >
                <div className="w-16 h-16 rounded-full border-4 border-neutral-900"></div>
              </button>

              <div className="w-14 h-14"></div>
            </div>

            <p className="text-white/70 text-sm text-center mt-4">
              {scanMode === 'homework' && 'Align your homework within the frame'}
              {scanMode === 'notes' && 'Capture your handwritten notes clearly'}
              {scanMode === 'flashcards' && 'Point at the textbook page or notes'}
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      )}

      {/* Processing/Result View */}
      {(mode === 'processing' || mode === 'result') && (
        <div className="w-full h-full flex flex-col p-6">
          {/* Preview Image */}
          <div className="flex-shrink-0 mb-6">
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-64 object-cover rounded-2xl shadow-xl"
            />
          </div>

          {/* Processing State */}
          {isProcessing ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-primary-500/30"></div>
                <div className="absolute inset-0 rounded-full border-4 border-primary-500 border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-10 h-10 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">AI Processing...</h3>
              <p className="text-white/70 text-sm text-center">
                {processingStep || (
                  scanMode === 'homework' ? 'Extracting assignment details from your homework' :
                  scanMode === 'notes' ? 'Reading and organizing your handwritten notes' :
                  'Generating flashcards from your textbook'
                )}
              </p>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center px-6">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">Processing Failed</h3>
              <p className="text-white/70 text-sm text-center mb-6">{error}</p>
              <button
                onClick={retake}
                className="px-6 py-3 bg-white/10 backdrop-blur-sm text-white font-medium rounded-xl border border-white/20 hover:bg-white/20 transition-all active:scale-95"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-4">
              {/* HOMEWORK MODE RESULT */}
              {assignmentData && (
                <>
                  {/* Confidence Badge */}
                  <div className="flex items-center justify-center gap-2">
                    <div className="px-4 py-2 rounded-full bg-green-500/20 border border-green-500/50">
                      <span className="text-green-400 text-sm font-semibold">
                        {Math.round(assignmentData.confidence * 100)}% Confidence
                      </span>
                    </div>
                  </div>

                  {/* Assignment Card */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center shadow-glow">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-bold text-lg mb-1">{assignmentData.title}</h3>
                        <div className="flex items-center gap-3 text-sm text-white/70">
                          <span>{assignmentData.subject}</span>
                          <span>•</span>
                          <span>Due {new Date(assignmentData.dueDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-white/80 text-sm mb-4">{assignmentData.description}</p>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2 text-white/70">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{assignmentData.estimatedTime}</span>
                      </div>
                      <div className={`px-2 py-1 rounded-lg ${
                        assignmentData.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                        assignmentData.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        <span className="text-xs font-semibold capitalize">{assignmentData.priority}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <button
                      onClick={saveAssignment}
                      disabled={isSaving}
                      className="w-full py-4 px-6 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl shadow-glow-lg hover:shadow-glow transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Saving assignment...</span>
                        </div>
                      ) : (
                        'Add to My Assignments'
                      )}
                    </button>
                    <button
                      onClick={retake}
                      disabled={isSaving}
                      className="w-full py-3 px-6 bg-white/10 backdrop-blur-sm text-white font-medium rounded-xl border border-white/20 hover:bg-white/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Retake Photo
                    </button>
                  </div>
                </>
              )}

              {/* NOTES MODE RESULT */}
              {notesData && (
                <>
                  {/* Confidence Badge */}
                  <div className="flex items-center justify-center gap-2">
                    <div className="px-4 py-2 rounded-full bg-green-500/20 border border-green-500/50">
                      <span className="text-green-400 text-sm font-semibold">
                        {Math.round(notesData.confidence * 100)}% Confidence
                      </span>
                    </div>
                  </div>

                  {/* Notes Card */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
                    {/* Editable Title Input */}
                    <div className="mb-4">
                      <label className="block text-white/70 text-sm font-medium mb-2">Note Title</label>
                      <input
                        type="text"
                        defaultValue={notesData.title}
                        onChange={(e) => { notesData.customTitle = e.target.value }}
                        placeholder="Enter a name for your note..."
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-accent-purple/50 transition-all"
                      />
                    </div>

                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center shadow-glow-purple">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 text-sm text-white/70">
                          <span>{notesData.subject}</span>
                          {notesData.tags && notesData.tags.length > 0 && (
                            <>
                              <span>•</span>
                              <span>{notesData.tags.slice(0, 2).join(', ')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Formatted Content Preview */}
                    <div className="bg-white/5 rounded-xl p-4 mb-4 max-h-60 overflow-y-auto scrollbar-thin">
                      <div className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap">
                        {(typeof notesData.formattedContent === 'string' && notesData.formattedContent.includes('{'))
                          ? notesData.rawText
                          : (notesData.formattedContent || notesData.rawText)
                        }
                      </div>
                    </div>

                    {/* Tags */}
                    {notesData.tags && notesData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {notesData.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 rounded-lg bg-accent-purple/20 text-accent-purple-light text-xs font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <button
                      onClick={saveNotes}
                      disabled={isSaving}
                      className="w-full py-4 px-6 bg-gradient-to-r from-accent-purple to-accent-pink text-white font-semibold rounded-xl shadow-glow-purple hover:shadow-glow transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Saving note...</span>
                        </div>
                      ) : (
                        'Save to My Notes'
                      )}
                    </button>
                    <button
                      onClick={retake}
                      disabled={isSaving}
                      className="w-full py-3 px-6 bg-white/10 backdrop-blur-sm text-white font-medium rounded-xl border border-white/20 hover:bg-white/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Retake Photo
                    </button>
                  </div>
                </>
              )}

              {/* FLASHCARDS MODE RESULT */}
              {flashcardsData && (
                <>
                  {/* Deck Header */}
                  <div className="bg-gradient-to-br from-accent-cyan to-primary-500 rounded-2xl p-5 shadow-soft-lg">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-bold text-lg mb-1">{flashcardsData.title}</h3>
                        <div className="flex items-center gap-3 text-sm text-white/90">
                          <span>{flashcardsData.subject}</span>
                          <span>•</span>
                          <span>{flashcardsData.flashcards.length} cards created</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Flashcards Preview */}
                  <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
                    {flashcardsData.flashcards.map((card, index) => (
                      <div
                        key={index}
                        className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-accent-cyan/30 flex items-center justify-center">
                            <span className="text-accent-cyan-light text-xs font-bold">{index + 1}</span>
                          </div>
                          <div className="flex-1">
                            <div className="text-white/70 text-xs font-semibold mb-1">QUESTION</div>
                            <div className="text-white font-medium text-sm mb-3">{card.front}</div>
                            <div className="text-white/70 text-xs font-semibold mb-1">ANSWER</div>
                            <div className="text-white/90 text-sm">{card.back}</div>
                            {card.hint && (
                              <div className="mt-2 px-2 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                                <span className="text-yellow-400 text-xs">💡 Hint: {card.hint}</span>
                              </div>
                            )}
                          </div>
                          <div className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                            card.difficulty === 'hard' ? 'bg-red-500/20 text-red-400' :
                            card.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-green-500/20 text-green-400'
                          }`}>
                            {card.difficulty}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <button
                      onClick={saveFlashcards}
                      disabled={isSaving}
                      className="w-full py-4 px-6 bg-gradient-to-r from-accent-cyan to-primary-500 text-white font-semibold rounded-xl shadow-soft-lg hover:shadow-soft-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Saving {flashcardsData.flashcards.length} cards...</span>
                        </div>
                      ) : (
                        `Save Deck (${flashcardsData.flashcards.length} cards)`
                      )}
                    </button>
                    <button
                      onClick={retake}
                      disabled={isSaving}
                      className="w-full py-3 px-6 bg-white/10 backdrop-blur-sm text-white font-medium rounded-xl border border-white/20 hover:bg-white/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Retake Photo
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  )
}

export default Scanner
