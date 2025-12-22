import { useState } from 'react'
import assignmentsService from '../services/assignmentsService'
import authService from '../services/authService'
import { toast } from './Toast'

const BulkUpload = ({ onClose, onSuccess }) => {
  const [dragActive, setDragActive] = useState(false)
  const [uploadType, setUploadType] = useState('assignments') // assignments or courses
  const [textInput, setTextInput] = useState('')
  const [processing, setProcessing] = useState(false)

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
      const file = e.dataTransfer.files[0]
      await handleFile(file)
    }
  }

  const handleFileInput = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const text = e.target.result
      setTextInput(text)
      await processInput(text)
    }
    reader.readAsText(file)
  }

  const parseAssignmentsText = (text) => {
    const assignments = []
    const lines = text.split('\n').filter(line => line.trim())

    for (const line of lines) {
      // Support multiple formats:
      // 1. "Title, Subject, Due Date, Priority"
      // 2. "Title | Subject | Due Date | Priority"
      // 3. "Title - Subject - Due Date - Priority"
      const parts = line.split(/[,|\-\t]/).map(p => p.trim())

      if (parts.length >= 2) {
        assignments.push({
          title: parts[0],
          subject: parts[1] || 'General',
          dueDate: parts[2] || null,
          priority: parts[3]?.toLowerCase() || 'medium',
          description: parts[4] || null,
          source: 'manual'
        })
      }
    }

    return assignments
  }

  const processInput = async (text) => {
    setProcessing(true)
    try {
      const { user } = await authService.getCurrentUser()
      if (!user) {
        toast.error('You must be logged in to upload assignments')
        return
      }

      if (uploadType === 'assignments') {
        const assignments = parseAssignmentsText(text)

        if (assignments.length === 0) {
          toast.error('No valid assignments found. Check your format!')
          setProcessing(false)
          return
        }

        let successCount = 0
        for (const assignment of assignments) {
          try {
            await assignmentsService.createAssignment({
              ...assignment,
              user_id: user.id
            })
            successCount++
          } catch (err) {
            console.error(`Failed to create assignment: ${assignment.title}`, err)
          }
        }

        toast.success(`Successfully uploaded ${successCount}/${assignments.length} assignments!`)
        if (onSuccess) onSuccess()
        setTimeout(() => onClose(), 1500)
      }
    } catch (error) {
      console.error('Upload failed:', error)
      toast.error(`Upload failed: ${error.message}`)
    } finally {
      setProcessing(false)
    }
  }

  const handleManualSubmit = async () => {
    if (!textInput.trim()) {
      toast.error('Please enter some data to upload')
      return
    }
    await processInput(textInput)
  }

  const exampleFormat = uploadType === 'assignments'
    ? `Math Homework, Math, 2025-12-25, high
Science Lab Report, Science, 2025-12-28, medium
English Essay, English, 2025-12-30, low`
    : `Course Name, Course Code, Credits
Advanced Mathematics, MATH 301, 3
Introduction to Physics, PHYS 101, 4`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-dark-bg-primary rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-dark-border-subtle">
        {/* Header */}
        <div className="sticky top-0 bg-dark-bg-primary border-b border-dark-border-subtle p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-dark-text-primary mb-1">Bulk Upload</h2>
            <p className="text-sm text-dark-text-secondary">Upload multiple items at once</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg bg-dark-bg-secondary border border-dark-border-subtle flex items-center justify-center text-dark-text-primary hover:bg-dark-bg-tertiary transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Upload Type Selector */}
          <div className="flex gap-2 bg-dark-bg-secondary p-1 rounded-lg border border-dark-border-subtle">
            <button
              onClick={() => setUploadType('assignments')}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all ${
                uploadType === 'assignments'
                  ? 'bg-gradient-to-r from-primary-500 to-accent-cyan text-white'
                  : 'text-dark-text-secondary hover:text-dark-text-primary'
              }`}
            >
              Assignments
            </button>
            <button
              onClick={() => setUploadType('courses')}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all ${
                uploadType === 'courses'
                  ? 'bg-gradient-to-r from-primary-500 to-accent-cyan text-white'
                  : 'text-dark-text-secondary hover:text-dark-text-primary'
              }`}
            >
              Courses
            </button>
          </div>

          {/* Drag & Drop Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
              dragActive
                ? 'border-primary-500 bg-primary-500/10'
                : 'border-dark-border-subtle bg-dark-bg-secondary/50'
            }`}
          >
            <input
              type="file"
              accept=".txt,.csv"
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>

              <div>
                <p className="text-dark-text-primary font-semibold mb-1">
                  Drop your file here or click to browse
                </p>
                <p className="text-sm text-dark-text-secondary">
                  Supports .txt and .csv files
                </p>
              </div>
            </div>
          </div>

          {/* Manual Text Input */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-dark-text-primary">
              Or paste your data here:
            </label>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={exampleFormat}
              className="w-full h-48 p-4 bg-dark-bg-secondary border border-dark-border-subtle rounded-lg text-dark-text-primary placeholder-dark-text-muted focus:outline-none focus:border-primary-500 transition-colors font-mono text-sm"
            />
          </div>

          {/* Format Guide */}
          <div className="bg-dark-bg-secondary/50 border border-dark-border-subtle rounded-lg p-4">
            <h3 className="text-sm font-semibold text-dark-text-primary mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Format Guide
            </h3>
            <div className="text-sm text-dark-text-secondary space-y-1">
              <p>• One item per line</p>
              <p>• Separate fields with commas (,) pipes (|) or dashes (-)</p>
              {uploadType === 'assignments' && (
                <>
                  <p>• Format: <code className="bg-dark-bg-tertiary px-2 py-1 rounded text-primary-400">Title, Subject, Due Date, Priority</code></p>
                  <p>• Example: <code className="bg-dark-bg-tertiary px-2 py-1 rounded text-accent-cyan">Math Homework, Math, 2025-12-25, high</code></p>
                </>
              )}
              {uploadType === 'courses' && (
                <>
                  <p>• Format: <code className="bg-dark-bg-tertiary px-2 py-1 rounded text-primary-400">Course Name, Course Code, Credits</code></p>
                  <p>• Example: <code className="bg-dark-bg-tertiary px-2 py-1 rounded text-accent-cyan">Advanced Math, MATH 301, 3</code></p>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleManualSubmit}
              disabled={processing || !textInput.trim()}
              className="flex-1 py-3 px-6 bg-gradient-to-r from-primary-500 to-accent-cyan text-white font-semibold rounded-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                `Upload ${uploadType === 'assignments' ? 'Assignments' : 'Courses'}`
              )}
            </button>
            <button
              onClick={onClose}
              disabled={processing}
              className="px-6 py-3 bg-dark-bg-secondary border border-dark-border-subtle text-dark-text-primary font-semibold rounded-lg hover:bg-dark-bg-tertiary transition-all disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BulkUpload
