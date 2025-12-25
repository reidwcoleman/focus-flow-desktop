import { useState, useRef } from 'react'
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

  const fileInputRef = useRef(null)

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
    setCapturedImage(null)
    setAssignmentData(null)
    setNotesData(null)
    setFlashcardsData(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
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

      {/* Upload Area */}
      {!capturedImage && !isProcessing && (
        <div className="animate-fade-up">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full p-12 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-surface-elevated hover:bg-surface-overlay transition-all group"
          >
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-text-primary font-medium mb-1">Upload an image</p>
              <p className="text-text-muted text-sm">Click to browse or drag and drop</p>
            </div>
          </button>
        </div>
      )}

      {/* Processing State */}
      {isProcessing && (
        <div className="text-center py-16 animate-fade-up">
          <div className="w-12 h-12 mx-auto mb-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-text-primary font-medium">{processingStep}</p>
          <p className="text-text-muted text-sm mt-1">This may take a moment...</p>
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
        <div className="bg-surface-elevated rounded-2xl p-6 border border-border animate-fade-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="text-xl">📝</span>
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">Assignment Detected</h3>
              <p className="text-xs text-text-muted">Review and save to your tasks</p>
            </div>
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
      )}

      {/* Results - Notes */}
      {notesData && !isProcessing && (
        <div className="bg-surface-elevated rounded-2xl p-6 border border-border animate-fade-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent-warm/10 flex items-center justify-center">
              <span className="text-xl">📓</span>
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">Notes Extracted</h3>
              <p className="text-xs text-text-muted">Review your digitized notes</p>
            </div>
          </div>

          <div className="p-4 bg-surface-base rounded-xl mb-6 max-h-64 overflow-y-auto">
            <p className="text-text-primary whitespace-pre-wrap text-sm leading-relaxed">
              {notesData.content || notesData.text || 'No text detected'}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={resetScan}
              className="flex-1 py-2.5 px-4 rounded-xl bg-surface-base text-text-secondary font-medium hover:bg-surface-overlay transition-colors"
            >
              Scan Another
            </button>
            <button
              onClick={handleSaveNotes}
              disabled={isSaving}
              className="flex-1 py-2.5 px-4 rounded-xl bg-accent-warm text-white font-medium hover:opacity-90 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Notes'}
            </button>
          </div>
        </div>
      )}

      {/* Results - Flashcards */}
      {flashcardsData && !isProcessing && (
        <div className="bg-surface-elevated rounded-2xl p-6 border border-border animate-fade-up">
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
      )}

      {/* Image Preview */}
      {capturedImage && !isProcessing && (
        <div className="mt-6 animate-fade-up">
          <p className="text-xs text-text-muted mb-2">Scanned Image</p>
          <img
            src={capturedImage}
            alt="Scanned"
            className="w-full max-w-md rounded-xl border border-border"
          />
        </div>
      )}
    </div>
  )
}

export default ScanPage
