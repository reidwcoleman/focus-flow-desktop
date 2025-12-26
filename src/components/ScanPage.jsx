import { useState, useRef, useEffect } from 'react'
import visionService from '../services/visionService'
import { useStudy } from '../contexts/StudyContext'
import assignmentsService from '../services/assignmentsService'
import { toast } from './Toast'

const ScanPage = () => {
  const { addNote, addDeckWithCards } = useStudy()
  const [scanMode, setScanMode] = useState('homework')
  const [capturedImage, setCapturedImage] = useState(null)
  const [assignmentData, setAssignmentData] = useState(null)
  const [notesData, setNotesData] = useState(null)
  const [flashcardsData, setFlashcardsData] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState('')
  const [error, setError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState(null)

  const fileInputRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const startCamera = async () => {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setCameraActive(true)
    } catch (err) {
      console.error('Camera error:', err)
      setCameraError('Could not access camera. Please check permissions.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)

    const imageData = canvas.toDataURL('image/jpeg', 0.9)
    stopCamera()
    setCapturedImage(imageData)
    processImage(imageData)
  }

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageData = e.target.result
        setCapturedImage(imageData)
        processImage(imageData)
      }
      reader.readAsDataURL(file)
    }
  }

  const processImage = async (imageData) => {
    setIsProcessing(true)
    setError(null)
    setAssignmentData(null)
    setNotesData(null)
    setFlashcardsData(null)

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
    } catch (err) {
      console.error('Processing error:', err)
      setError(err.message || 'Failed to process image. Please try again.')
    } finally {
      setIsProcessing(false)
      setProcessingStep('')
    }
  }

  const handleSaveAssignment = async () => {
    if (!assignmentData) return
    setIsSaving(true)
    try {
      await assignmentsService.createAssignment({
        title: assignmentData.title || 'Untitled Assignment',
        subject: assignmentData.subject || 'General',
        dueDate: assignmentData.dueDate || null,
        priority: assignmentData.priority || 'medium',
        timeEstimate: assignmentData.estimatedTime || null,
        source: 'scanner',
      })
      toast.success('Assignment saved!')
      resetScan()
    } catch (err) {
      toast.error('Failed to save assignment')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveNotes = async () => {
    if (!notesData) return
    setIsSaving(true)
    try {
      await addNote({
        title: notesData.title || 'Scanned Notes',
        content: notesData.content || notesData.text || '',
        subject: notesData.subject || 'General',
      })
      toast.success('Notes saved!')
      resetScan()
    } catch (err) {
      toast.error('Failed to save notes')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveFlashcards = async () => {
    if (!flashcardsData?.cards?.length) return
    setIsSaving(true)
    try {
      await addDeckWithCards({
        name: flashcardsData.deckName || 'Scanned Flashcards',
        description: flashcardsData.description || '',
        subject: flashcardsData.subject || 'General',
      }, flashcardsData.cards)
      toast.success(`Created deck with ${flashcardsData.cards.length} cards!`)
      resetScan()
    } catch (err) {
      toast.error('Failed to save flashcards')
    } finally {
      setIsSaving(false)
    }
  }

  const resetScan = () => {
    stopCamera()
    setCapturedImage(null)
    setAssignmentData(null)
    setNotesData(null)
    setFlashcardsData(null)
    setError(null)
    setCameraError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const dismissNotes = () => {
    setNotesData(null)
    setCapturedImage(null)
  }

  const downloadNotes = () => {
    if (!notesData) return

    const title = notesData.title || 'Scanned Notes'
    const content = notesData.content || notesData.text || ''
    const subject = notesData.subject || 'General'
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Create markdown content
    const markdown = `# ${title}\n\n**Subject:** ${subject}  \n**Date:** ${date}\n\n---\n\n${content}`

    // Create blob and download
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success('Notes downloaded!')
  }

  const scanModes = [
    { id: 'homework', label: 'Homework', icon: '📝', description: 'Scan assignments to track' },
    { id: 'notes', label: 'Notes', icon: '📓', description: 'Digitize handwritten notes' },
    { id: 'flashcards', label: 'Flashcards', icon: '🎴', description: 'Generate study cards' },
  ]

  return (
    <div className="min-h-screen p-6 md:p-8 lg:p-10 max-w-4xl mx-auto">
      {/* Header */}
      <header className="mb-8 animate-fade-up">
        <h1 className="text-3xl font-semibold text-text-primary tracking-tight">Scan</h1>
        <p className="text-text-secondary mt-1">Import homework, notes, or create flashcards</p>
      </header>

      {/* Scan Mode Selection */}
      <div className="grid grid-cols-3 gap-3 mb-8 animate-fade-up">
        {scanModes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => { setScanMode(mode.id); resetScan() }}
            className={`p-4 rounded-xl border transition-all text-left ${
              scanMode === mode.id
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-surface-elevated border-border text-text-muted hover:border-primary/20'
            }`}
          >
            <div className="text-2xl mb-2">{mode.icon}</div>
            <div className="font-medium text-sm">{mode.label}</div>
            <div className="text-xs mt-1 opacity-70">{mode.description}</div>
          </button>
        ))}
      </div>

      {/* Hidden canvas for capturing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera View */}
      {cameraActive && !capturedImage && !isProcessing && (
        <div className="animate-fade-up">
          <div className="relative rounded-2xl overflow-hidden bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full aspect-[4/3] object-cover"
            />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
              <button
                onClick={stopCamera}
                className="w-12 h-12 rounded-full bg-surface-elevated/90 backdrop-blur text-text-primary flex items-center justify-center hover:bg-surface-overlay transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <button
                onClick={capturePhoto}
                className="w-16 h-16 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
              >
                <div className="w-12 h-12 rounded-full border-4 border-primary" />
              </button>
              <div className="w-12 h-12" /> {/* Spacer for symmetry */}
            </div>
          </div>
          <p className="text-center text-text-muted text-sm mt-3">Position your document and tap to capture</p>
        </div>
      )}

      {/* Upload Area */}
      {!capturedImage && !isProcessing && !cameraActive && (
        <div className="animate-fade-up space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />

          {/* Camera Error */}
          {cameraError && (
            <div className="bg-error/10 border border-error/20 rounded-xl p-3 text-center">
              <p className="text-error text-sm">{cameraError}</p>
            </div>
          )}

          {/* Two-button layout */}
          <div className="grid grid-cols-2 gap-4">
            {/* Take Photo Button */}
            <button
              onClick={startCamera}
              className="p-8 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-surface-elevated hover:bg-surface-overlay transition-all group"
            >
              <div className="text-center">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="text-text-primary font-medium mb-1">Take Photo</p>
                <p className="text-text-muted text-xs">Use your camera</p>
              </div>
            </button>

            {/* Upload File Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-8 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-surface-elevated hover:bg-surface-overlay transition-all group"
            >
              <div className="text-center">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-text-primary font-medium mb-1">Upload Image</p>
                <p className="text-text-muted text-xs">Browse files</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Processing State */}
      {isProcessing && (
        <div className="animate-fade-up">
          {/* Show captured image during processing */}
          {capturedImage && (
            <div className="mb-6">
              <div className="relative rounded-2xl overflow-hidden border border-border">
                <img
                  src={capturedImage}
                  alt="Processing"
                  className="w-full max-h-[400px] object-contain bg-surface-base"
                />
                {/* Processing overlay */}
                <div className="absolute inset-0 bg-surface-base/80 backdrop-blur-sm flex flex-col items-center justify-center">
                  <div className="w-16 h-16 mb-4 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <p className="text-text-primary font-semibold text-lg">{processingStep}</p>
                  <p className="text-text-muted text-sm mt-1">Analyzing your image...</p>
                </div>
              </div>
            </div>
          )}
          {!capturedImage && (
            <div className="text-center py-16">
              <div className="w-12 h-12 mx-auto mb-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-text-primary font-medium">{processingStep}</p>
              <p className="text-text-muted text-sm mt-1">This may take a moment...</p>
            </div>
          )}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-error/10 border border-error/20 rounded-xl p-4 mb-6 animate-fade-up">
          <p className="text-error text-sm">{error}</p>
          <button
            onClick={resetScan}
            className="mt-2 text-sm text-error/70 hover:text-error underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Results - Homework */}
      {assignmentData && !isProcessing && (
        <div className="animate-fade-up">
          {/* Show captured image */}
          {capturedImage && (
            <div className="mb-6">
              <p className="text-xs text-text-muted mb-2 font-medium uppercase tracking-wide">Scanned Image</p>
              <div className="rounded-2xl overflow-hidden border border-border bg-surface-base">
                <img
                  src={capturedImage}
                  alt="Scanned homework"
                  className="w-full max-h-[300px] object-contain"
                />
              </div>
            </div>
          )}

          <div className="bg-surface-elevated rounded-2xl p-6 border border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="text-xl">📝</span>
              </div>
              <div>
                <h3 className="font-semibold text-text-primary">Assignment Detected</h3>
                <p className="text-xs text-text-muted">Review and save to your tasks</p>
              </div>
              {assignmentData.confidence && (
                <span className="ml-auto px-2.5 py-1 rounded-full bg-success/15 text-success text-xs font-medium">
                  {Math.round(assignmentData.confidence * 100)}% match
                </span>
              )}
            </div>

            <div className="space-y-3 mb-6">
              <div className="p-3 bg-surface-base rounded-lg">
                <p className="text-xs text-text-muted mb-1">Title</p>
                <p className="text-text-primary font-medium">{assignmentData.title || 'Untitled'}</p>
              </div>
              {assignmentData.subject && (
                <div className="p-3 bg-surface-base rounded-lg">
                  <p className="text-xs text-text-muted mb-1">Subject</p>
                  <p className="text-text-primary">{assignmentData.subject}</p>
                </div>
              )}
              {assignmentData.dueDate && (
                <div className="p-3 bg-surface-base rounded-lg">
                  <p className="text-xs text-text-muted mb-1">Due Date</p>
                  <p className="text-text-primary">{assignmentData.dueDate}</p>
                </div>
              )}
              {assignmentData.description && (
                <div className="p-3 bg-surface-base rounded-lg">
                  <p className="text-xs text-text-muted mb-1">Description</p>
                  <p className="text-text-secondary text-sm">{assignmentData.description}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={resetScan}
                className="flex-1 py-2.5 px-4 rounded-xl bg-surface-base text-text-secondary font-medium hover:bg-surface-overlay transition-colors"
              >
                Scan Another
              </button>
              <button
                onClick={handleSaveAssignment}
                disabled={isSaving}
                className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-white font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results - Notes */}
      {notesData && !isProcessing && (
        <div className="animate-fade-up">
          {/* Show captured image prominently */}
          {capturedImage && (
            <div className="mb-6">
              <p className="text-xs text-text-muted mb-2 font-medium uppercase tracking-wide">Scanned Image</p>
              <div className="rounded-2xl overflow-hidden border border-border bg-surface-base">
                <img
                  src={capturedImage}
                  alt="Scanned notes"
                  className="w-full max-h-[300px] object-contain"
                />
              </div>
            </div>
          )}

          {/* Document-style notes card */}
          <div className="bg-surface-elevated rounded-2xl border border-border overflow-hidden shadow-lg shadow-black/5">
            {/* Header with gradient accent */}
            <div className="relative bg-gradient-to-r from-accent-warm/10 via-accent-warm/5 to-transparent p-6 border-b border-border">
              {/* Close button */}
              <button
                onClick={dismissNotes}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-base/80 hover:bg-surface-overlay flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Title and metadata */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent-warm/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-accent-warm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0 pr-8">
                  <h3 className="text-xl font-semibold text-text-primary mb-1">
                    {notesData.title || 'Scanned Notes'}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    {notesData.subject && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent-warm/20 text-accent-warm">
                        {notesData.subject}
                      </span>
                    )}
                    <span className="text-xs text-text-muted">
                      {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {notesData.confidence && (
                      <span className="px-2 py-0.5 rounded-full bg-success/15 text-success text-xs font-medium">
                        {Math.round(notesData.confidence * 100)}% confidence
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Content area - styled like a document */}
            <div className="p-6">
              <div className="bg-surface-base rounded-xl p-6 min-h-[200px] max-h-[400px] overflow-y-auto border border-border/50">
                {/* Decorative line accent */}
                <div className="w-12 h-1 bg-accent-warm/30 rounded-full mb-4" />

                {/* Notes content with nice typography */}
                <div className="prose prose-sm max-w-none">
                  <p className="text-text-primary whitespace-pre-wrap leading-relaxed text-[15px]">
                    {notesData.content || notesData.text || 'No text detected'}
                  </p>
                </div>
              </div>

              {/* Word count */}
              <p className="text-xs text-text-muted mt-3 text-right">
                {(notesData.content || notesData.text || '').split(/\s+/).filter(Boolean).length} words
              </p>
            </div>

            {/* Action buttons */}
            <div className="px-6 pb-6">
              <div className="flex gap-3">
                <button
                  onClick={downloadNotes}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-surface-base hover:bg-surface-overlay text-text-secondary font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
                <button
                  onClick={resetScan}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-surface-base hover:bg-surface-overlay text-text-secondary font-medium transition-colors"
                >
                  Scan Another
                </button>
                <button
                  onClick={handleSaveNotes}
                  disabled={isSaving}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-accent-warm text-white font-medium hover:opacity-90 transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save to Library'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results - Flashcards */}
      {flashcardsData && !isProcessing && (
        <div className="animate-fade-up">
          {/* Show captured image prominently */}
          {capturedImage && (
            <div className="mb-6">
              <p className="text-xs text-text-muted mb-2 font-medium uppercase tracking-wide">Scanned Image</p>
              <div className="rounded-2xl overflow-hidden border border-border bg-surface-base">
                <img
                  src={capturedImage}
                  alt="Scanned textbook"
                  className="w-full max-h-[300px] object-contain"
                />
              </div>
            </div>
          )}

          <div className="bg-surface-elevated rounded-2xl p-6 border border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-accent-cool/10 flex items-center justify-center">
                <span className="text-xl">🎴</span>
              </div>
              <div>
                <h3 className="font-semibold text-text-primary">Flashcards Generated</h3>
                <p className="text-xs text-text-muted">{flashcardsData.cards?.length || 0} cards created</p>
              </div>
            </div>

            <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
              {flashcardsData.cards?.slice(0, 5).map((card, i) => (
                <div key={i} className="p-3 bg-surface-base rounded-lg">
                  <p className="text-xs text-text-muted mb-1">Card {i + 1}</p>
                  <p className="text-text-primary text-sm font-medium">{card.front}</p>
                  <p className="text-text-secondary text-sm mt-1">{card.back}</p>
                </div>
              ))}
              {flashcardsData.cards?.length > 5 && (
                <p className="text-center text-text-muted text-sm py-2">
                  +{flashcardsData.cards.length - 5} more cards
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={resetScan}
                className="flex-1 py-2.5 px-4 rounded-xl bg-surface-base text-text-secondary font-medium hover:bg-surface-overlay transition-colors"
              >
                Scan Another
              </button>
              <button
                onClick={handleSaveFlashcards}
                disabled={isSaving || !flashcardsData.cards?.length}
                className="flex-1 py-2.5 px-4 rounded-xl bg-accent-cool text-white font-medium hover:opacity-90 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Deck'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScanPage
