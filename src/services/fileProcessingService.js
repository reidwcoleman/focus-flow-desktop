/**
 * File Processing Service
 * Multi-format file text extraction with adapters for PDF, DOCX, TXT, and images
 */

import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'
import visionService from './visionService'

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString()

class FileProcessingService {
  constructor() {
    this.supportedTypes = {
      pdf: ['application/pdf'],
      docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'],
      txt: ['text/plain'],
      image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg']
    }

    this.maxFileSizeMB = 25
    this.maxChunkSize = 8000 // characters per AI request
  }

  /**
   * Main entry point - process any supported file
   */
  async processFile(file, options = {}) {
    const { onProgress = () => {} } = options

    this.validateFile(file)
    const fileType = this.detectFileType(file)

    onProgress({ stage: 'extracting', progress: 10, message: 'Extracting text...' })

    // Extract text based on file type
    let extractedContent
    switch (fileType) {
      case 'pdf':
        extractedContent = await this.extractFromPDF(file, onProgress)
        break
      case 'docx':
        extractedContent = await this.extractFromDOCX(file, onProgress)
        break
      case 'txt':
        extractedContent = await this.extractFromTXT(file, onProgress)
        break
      case 'image':
        extractedContent = await this.extractFromImage(file, onProgress)
        break
      default:
        throw new Error(`Unsupported file type: ${file.type}`)
    }

    return {
      text: extractedContent.text,
      metadata: {
        ...extractedContent.metadata,
        fileName: file.name,
        fileType,
        fileSize: file.size
      }
    }
  }

  /**
   * Extract text from PDF using PDF.js
   */
  async extractFromPDF(file, onProgress) {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

      const numPages = pdf.numPages
      const textChunks = []

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum)
        const textContent = await page.getTextContent()

        const pageText = textContent.items
          .map(item => item.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()

        textChunks.push({ pageNumber: pageNum, text: pageText })

        const progress = 10 + (pageNum / numPages) * 40
        onProgress({
          stage: 'extracting',
          progress,
          message: `Reading page ${pageNum}/${numPages}...`
        })
      }

      return {
        text: textChunks.map(c => c.text).join('\n\n'),
        chunks: textChunks,
        metadata: {
          pageCount: numPages,
          title: file.name.replace('.pdf', '')
        }
      }
    } catch (error) {
      console.error('PDF extraction error:', error)
      throw new Error(`Failed to extract PDF: ${error.message}`)
    }
  }

  /**
   * Extract text from DOCX using mammoth
   */
  async extractFromDOCX(file, onProgress) {
    try {
      const arrayBuffer = await file.arrayBuffer()

      onProgress({ stage: 'extracting', progress: 20, message: 'Parsing document...' })

      const result = await mammoth.extractRawText({ arrayBuffer })

      onProgress({ stage: 'extracting', progress: 40, message: 'Analyzing structure...' })

      return {
        text: result.value,
        metadata: {
          title: file.name.replace(/\.docx?$/, ''),
          wordCount: result.value.split(/\s+/).length
        }
      }
    } catch (error) {
      console.error('DOCX extraction error:', error)
      throw new Error(`Failed to extract DOCX: ${error.message}`)
    }
  }

  /**
   * Extract text from TXT file
   */
  async extractFromTXT(file, onProgress) {
    try {
      onProgress({ stage: 'extracting', progress: 30, message: 'Reading file...' })

      const text = await file.text()

      return {
        text,
        metadata: {
          title: file.name.replace('.txt', ''),
          lineCount: text.split('\n').length,
          wordCount: text.split(/\s+/).length
        }
      }
    } catch (error) {
      console.error('TXT extraction error:', error)
      throw new Error(`Failed to read TXT: ${error.message}`)
    }
  }

  /**
   * Extract text from image using visionService OCR
   */
  async extractFromImage(file, onProgress) {
    try {
      onProgress({ stage: 'extracting', progress: 20, message: 'Processing image...' })

      const base64 = await this.fileToBase64(file)

      onProgress({ stage: 'extracting', progress: 35, message: 'Running OCR...' })

      const result = await visionService.extractText(base64)

      return {
        text: result.text || '',
        metadata: {
          title: file.name.replace(/\.[^.]+$/, ''),
          isImage: true
        }
      }
    } catch (error) {
      console.error('Image extraction error:', error)
      throw new Error(`Failed to extract from image: ${error.message}`)
    }
  }

  /**
   * Convert file to base64
   */
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  /**
   * Detect file type from MIME type or extension
   */
  detectFileType(file) {
    const mimeType = file.type.toLowerCase()

    // Check MIME type first
    for (const [type, mimes] of Object.entries(this.supportedTypes)) {
      if (mimes.some(m => mimeType.includes(m) || mimeType === m)) {
        return type
      }
    }

    // Fallback to extension
    const ext = file.name.split('.').pop().toLowerCase()
    if (ext === 'pdf') return 'pdf'
    if (ext === 'docx' || ext === 'doc') return 'docx'
    if (ext === 'txt') return 'txt'
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image'

    return null
  }

  /**
   * Validate file size and type
   */
  validateFile(file) {
    if (!file) {
      throw new Error('No file provided')
    }

    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > this.maxFileSizeMB) {
      throw new Error(`File too large: ${sizeMB.toFixed(1)}MB (max ${this.maxFileSizeMB}MB)`)
    }

    if (!this.detectFileType(file)) {
      throw new Error(`Unsupported file type: ${file.type || file.name}`)
    }
  }

  /**
   * Split large text into manageable chunks
   */
  splitIntoChunks(text, maxSize = this.maxChunkSize) {
    const chunks = []
    const paragraphs = text.split(/\n\n+/)
    let current = ''

    for (const para of paragraphs) {
      if ((current + para).length > maxSize && current) {
        chunks.push(current.trim())
        current = para
      } else {
        current += (current ? '\n\n' : '') + para
      }
    }

    if (current.trim()) {
      chunks.push(current.trim())
    }

    return chunks
  }
}

export default new FileProcessingService()
