import { useState, useRef, useEffect } from 'react'
import visionService from '../services/visionService'
import { useStudy } from '../contexts/StudyContext'
import assignmentsService from '../services/assignmentsService'
import { toast } from './Toast'

const Scanner = ({ onClose, onCapture, initialScanMode = 'homework' }) => {
  const { addNote, addDeckWithCards } = useStudy()
  const [scanMode, setScanMode] = useState(initialScanMode)
  const [mode, setMode] = useState('camera')
  const [capturedImage, setCapturedImage] = useState(null)
  const [assignmentData, setAssignmentData] = useState(null)
  const [notesData, setNotesData] = useState(null)
  const [flashcardsData, setFlashcardsData] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState('')
  const [error, setError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

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
      toast.error('Unable to access camera. Please check permissions.')
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
        setProcessingStep('Analyzing assignment...')
        const result = await visionService.processHomeworkAssignment(imageData)
        setAssignmentData(result)
      } else if (scanMode === 'notes') {
        setProcessingStep('Reading handwriting...')
        const result = await visionService.processHandwrittenNotes(imageData)
        setNotesData(result)
      } else if (scanMode === 'flashcards') {
        setProcessingStep('Generating flashcards...')
        const result = await visionService.processTextbookToFlashcards(imageData)
        setFlashcardsData(result)
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
      const { error } = await assignmentsService.createAssignment({
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
      if (onCapture) onCapture(assignmentData)
      onClose()
    } catch (err) {
      console.error('Failed to save assignment:', err)
      setError('Failed to save assignment. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const saveNotes = async () => {
    if (!notesData) return
    setIsSaving(true)
    setError(null)

    try {
      const noteContent = typeof notesData.formattedContent === 'string' && notesData.formattedContent.includes('{')
        ? notesData.rawText
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
        onClose()
      } else {
        setError('Failed to save note. Please try again.')
      }
    } catch (err) {
      setError(err.message || 'Failed to save note. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const saveFlashcards = async () => {
    if (!flashcardsData) return
    setIsSaving(true)
    setError(null)

    try {
      const result = await addDeckWithCards(
        {
          title: flashcardsData.title,
          description: 'Generated from scanned image',
          subject: flashcardsData.subject,
          sourceImage: capturedImage
        },
        flashcardsData.flashcards
      )

      if (result) {
        onClose()
      } else {
        setError('Failed to save flashcards. Please try again.')
      }
    } catch (err) {
      setError(err.message || 'Failed to save flashcards. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const retake = () => {
    setCapturedImage(null)
    setAssignmentData(null)
    setNotesData(null)
    setFlashcardsData(null)
    setError(null)
    setMode('camera')
    startCamera()
  }

  useEffect(() => {
    if (mode === 'camera') startCamera()
    return () => stopCamera()
  }, [mode])

  return (
    <div className="fixed inset-0 z-50 bg-surface-base flex items-center justify-center">
      <div className="w-full h-full max-w-4xl mx-auto relative">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-surface-base to-transparent">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-lg bg-surface-elevated border border-border flex items-center justify-center text-text-primary hover:bg-surface-overlay transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-text-primary font-bold text-lg">
              {scanMode === 'homework' && 'Scan Homework'}
              {scanMode === 'notes' && 'Scan Notes'}
              {scanMode === 'flashcards' && 'Scan Textbook'}
            </h2>
            <div className="w-10" />
          </div>
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

            {/* Mode Selector */}
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20">
              <div className="flex gap-2 bg-surface-base/90 backdrop-blur-sm p-1.5 rounded-lg border border-border">
                {['homework', 'notes', 'flashcards'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setScanMode(m)}
                    className={`py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      scanMode === m
                        ? 'bg-primary text-white'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Camera Frame */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[85%] h-[70%] border-2 border-primary/50 rounded-xl" />
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 pb-8 bg-gradient-to-t from-surface-base to-transparent">
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-14 h-14 rounded-lg bg-surface-elevated border border-border flex items-center justify-center text-text-primary hover:bg-surface-overlay transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>

                <button
                  onClick={captureImage}
                  className="w-20 h-20 rounded-full bg-primary flex items-center justify-center hover:bg-primary-hover transition-colors"
                >
                  <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </button>

                <div className="w-14 h-14" />
              </div>

              <p className="text-text-muted text-sm text-center mt-4">
                {scanMode === 'homework' && 'Align your homework within the frame'}
                {scanMode === 'notes' && 'Capture your handwritten notes'}
                {scanMode === 'flashcards' && 'Point at the textbook page'}
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
          <div className="w-full h-full flex flex-col md:flex-row gap-6 p-6 pt-20">
            {/* Preview Image */}
            <div className="flex-shrink-0 md:w-1/2">
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-64 md:h-full max-h-[500px] object-cover rounded-xl border border-border"
              />
            </div>

            {/* Processing State */}
            {isProcessing ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="w-16 h-16 mb-4">
                  <div className="w-full h-full rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                </div>
                <h3 className="text-text-primary font-bold text-xl mb-2">Processing...</h3>
                <p className="text-text-muted text-sm text-center">{processingStep}</p>
              </div>
            ) : error ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-error/20 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-text-primary font-bold text-xl mb-2">Processing Failed</h3>
                <p className="text-text-muted text-sm text-center mb-6 max-w-sm">{error}</p>
                <button
                  onClick={retake}
                  className="px-6 py-3 bg-surface-elevated border border-border text-text-primary font-medium rounded-lg hover:bg-surface-overlay transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-4">
                {/* Assignment Result */}
                {assignmentData && (
                  <>
                    <div className="flex justify-center">
                      <span className="px-3 py-1 rounded-full bg-success/20 text-success text-sm font-medium">
                        {Math.round(assignmentData.confidence * 100)}% Confidence
                      </span>
                    </div>

                    <div className="bg-surface-elevated rounded-xl p-4 border border-border">
                      <h3 className="text-text-primary font-bold text-lg mb-2">{assignmentData.title}</h3>
                      <div className="flex items-center gap-3 text-sm text-text-muted mb-3">
                        <span>{assignmentData.subject}</span>
                        <span>•</span>
                        <span>Due {new Date(assignmentData.dueDate).toLocaleDateString()}</span>
                      </div>
                      <p className="text-text-secondary text-sm mb-3">{assignmentData.description}</p>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-text-muted">{assignmentData.estimatedTime}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          assignmentData.priority === 'high' ? 'bg-error/20 text-error' :
                          assignmentData.priority === 'medium' ? 'bg-warning/20 text-warning' :
                          'bg-success/20 text-success'
                        }`}>
                          {assignmentData.priority}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={saveAssignment}
                        disabled={isSaving}
                        className="w-full py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
                      >
                        {isSaving ? 'Saving...' : 'Add to Assignments'}
                      </button>
                      <button
                        onClick={retake}
                        disabled={isSaving}
                        className="w-full py-3 bg-surface-elevated border border-border text-text-primary font-medium rounded-lg hover:bg-surface-overlay transition-colors disabled:opacity-50"
                      >
                        Retake Photo
                      </button>
                    </div>
                  </>
                )}

                {/* Notes Result */}
                {notesData && (
                  <>
                    <div className="flex justify-center">
                      <span className="px-3 py-1 rounded-full bg-success/20 text-success text-sm font-medium">
                        {Math.round(notesData.confidence * 100)}% Confidence
                      </span>
                    </div>

                    <div className="bg-surface-elevated rounded-xl p-4 border border-border">
                      <div className="mb-3">
                        <label className="block text-text-muted text-sm mb-1">Note Title</label>
                        <input
                          type="text"
                          defaultValue={notesData.title}
                          onChange={(e) => { notesData.customTitle = e.target.value }}
                          placeholder="Enter a name..."
                          className="w-full px-3 py-2 bg-surface-base border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div className="flex items-center gap-2 text-sm text-text-muted mb-3">
                        <span>{notesData.subject}</span>
                      </div>
                      <div className="bg-surface-base rounded-lg p-3 max-h-48 overflow-y-auto">
                        <p className="text-text-secondary text-sm whitespace-pre-wrap">
                          {(typeof notesData.formattedContent === 'string' && notesData.formattedContent.includes('{'))
                            ? notesData.rawText
                            : (notesData.formattedContent || notesData.rawText)
                          }
                        </p>
                      </div>
                      {notesData.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {notesData.tags.map((tag, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-accent/20 text-accent text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={saveNotes}
                        disabled={isSaving}
                        className="w-full py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
                      >
                        {isSaving ? 'Saving...' : 'Save to Notes'}
                      </button>
                      <button
                        onClick={retake}
                        disabled={isSaving}
                        className="w-full py-3 bg-surface-elevated border border-border text-text-primary font-medium rounded-lg hover:bg-surface-overlay transition-colors disabled:opacity-50"
                      >
                        Retake Photo
                      </button>
                    </div>
                  </>
                )}

                {/* Flashcards Result */}
                {flashcardsData && (
                  <>
                    <div className="bg-primary rounded-xl p-4">
                      <h3 className="text-white font-bold text-lg">{flashcardsData.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-white/80 mt-1">
                        <span>{flashcardsData.subject}</span>
                        <span>•</span>
                        <span>{flashcardsData.flashcards.length} cards</span>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {flashcardsData.flashcards.map((card, i) => (
                        <div key={i} className="bg-surface-elevated rounded-lg p-3 border border-border">
                          <div className="flex items-start gap-2">
                            <span className="w-6 h-6 rounded bg-accent/20 text-accent text-xs flex items-center justify-center font-bold flex-shrink-0">
                              {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-text-primary text-sm font-medium mb-1">{card.front}</p>
                              <p className="text-text-muted text-sm">{card.back}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={saveFlashcards}
                        disabled={isSaving}
                        className="w-full py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
                      >
                        {isSaving ? 'Saving...' : `Save Deck (${flashcardsData.flashcards.length} cards)`}
                      </button>
                      <button
                        onClick={retake}
                        disabled={isSaving}
                        className="w-full py-3 bg-surface-elevated border border-border text-text-primary font-medium rounded-lg hover:bg-surface-overlay transition-colors disabled:opacity-50"
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
