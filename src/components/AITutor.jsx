import { useState, useEffect, useRef } from 'react'
import aiService from '../services/aiService'
import authService from '../services/authService'
import aiChatService from '../services/aiChatService'

const AITutor = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: "Hi! I'm your AI tutor with full access to your personal data.\n\n**I can see:**\n• Canvas Assignments - What's due and when\n• Your Calendar - All events and schedules\n• Study Schedule - Your study hours and sessions\n• Notes - All your scanned notes\n• Flashcards - Your decks and progress\n• Study Streak - Your consistency and habits\n\n**I can help you with:**\n• Study planning and scheduling\n• Homework and concept explanations\n• Exam preparation strategies\n• Analyzing images and solving problems\n• Personalized study advice based on your data\n\nWhat would you like to work on?",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState('')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [usageCount, setUsageCount] = useState(0)
  const [modeUsage, setModeUsage] = useState({ deepResearch: 0, ultraThink: 0, standard: 0 })
  const [currentChatId, setCurrentChatId] = useState(null)
  const [chatHistory, setChatHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [saveStatus, setSaveStatus] = useState('') // 'saving', 'saved', 'error'
  const [uploadedImage, setUploadedImage] = useState(null)
  const [showDataInfo, setShowDataInfo] = useState(() => {
    // Check if user has already seen the info banner
    return !localStorage.getItem('ai_data_info_dismissed')
  })
  const [ultraThinkEnabled, setUltraThinkEnabled] = useState(aiService.isUltraThinkEnabled())
  const [deepResearchEnabled, setDeepResearchEnabled] = useState(aiService.isDeepResearchEnabled())
  const [modeExplanation, setModeExplanation] = useState(null) // For showing mode info
  const lastMessageRef = useRef(null)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  // Check usage limit and load AI context on component mount
  useEffect(() => {
    const initialize = async () => {
      // Load user context for AI
      await aiService.loadUserContext()

      // Check usage
      const count = await aiService.getUsageCount()
      setUsageCount(count)

      const hasRequests = await aiService.hasRemainingRequests()
      if (!hasRequests) {
        setShowUpgradeModal(true)
      }

      // Load chat history
      await loadChatHistory()
    }
    initialize()
  }, [])

  // Hide info banner when user sends first message
  useEffect(() => {
    if (messages.length > 1 && showDataInfo) {
      setShowDataInfo(false)
      localStorage.setItem('ai_data_info_dismissed', 'true')
    }
  }, [messages.length, showDataInfo])

  // Load chat history
  const loadChatHistory = async () => {
    const chats = await aiChatService.getRecentChats()
    setChatHistory(chats)
  }

  // Save conversation
  const saveConversation = async () => {
    if (messages.length <= 1) return // Don't save if only initial message

    setSaveStatus('saving')
    try {
      const savedChat = await aiChatService.saveConversation(messages, currentChatId)
      if (savedChat) {
        setCurrentChatId(savedChat.id)
        setSaveStatus('saved')
        await loadChatHistory()
        setTimeout(() => setSaveStatus(''), 2000)
      } else {
        setSaveStatus('error')
        setTimeout(() => setSaveStatus(''), 2000)
      }
    } catch (err) {
      console.error('Failed to save conversation:', err)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus(''), 2000)
    }
  }

  // Load a previous chat
  const loadChat = async (chatId) => {
    const chat = await aiChatService.getChatById(chatId)
    if (chat) {
      setMessages(chat.messages.map((m, i) => ({
        ...m,
        id: Date.now() + i,
        timestamp: new Date(m.timestamp)
      })))
      setCurrentChatId(chat.id)
      setShowHistory(false)
      aiService.clearHistory()
    }
  }

  // Delete a chat
  const deleteChat = async (chatId) => {
    if (confirm('Delete this chat?')) {
      const success = await aiChatService.deleteChat(chatId)
      if (success) {
        await loadChatHistory()
        if (currentChatId === chatId) {
          startNewChat()
        }
      }
    }
  }

  // Start a new chat
  const startNewChat = () => {
    setMessages([{
      id: Date.now(),
      role: 'assistant',
      content: "Hi! I'm your AI tutor with full access to your personal data.\n\n**I can see:**\n• Canvas Assignments - What's due and when\n• Your Calendar - All events and schedules\n• Study Schedule - Your study hours and sessions\n• Notes - All your scanned notes\n• Flashcards - Your decks and progress\n• Study Streak - Your consistency and habits\n\n**I can help you with:**\n• Study planning and scheduling\n• Homework and concept explanations\n• Exam preparation strategies\n• Analyzing images and solving problems\n• Personalized study advice based on your data\n\nWhat would you like to work on?",
      timestamp: new Date(),
    }])
    setCurrentChatId(null)
    setShowHistory(false)
    aiService.clearHistory()
  }

  // Auto-scroll to top of last message when new AI responses arrive
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      // Only scroll to top of message for AI responses
      if (lastMessage.role === 'assistant') {
        scrollToLastMessage()
      }
    }
  }, [messages])

  // Auto-scroll when typing indicator appears
  useEffect(() => {
    if (isTyping) {
      scrollToLastMessage()
    }
  }, [isTyping])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [inputValue])

  const scrollToLastMessage = () => {
    // Scroll to the START of the last message (not the bottom)
    lastMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      setTimeout(() => setError(''), 3000)
      return
    }

    // Convert to base64
    const reader = new FileReader()
    reader.onload = (event) => {
      setUploadedImage(event.target.result)
    }
    reader.readAsDataURL(file)

    // Reset file input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSend = async () => {
    if ((!inputValue.trim() && !uploadedImage) || isLoading) return

    // Check usage limit before sending
    const hasRequests = await aiService.hasRemainingRequests()
    if (!hasRequests) {
      setShowUpgradeModal(true)
      return
    }

    const userMessage = inputValue.trim()
    const imageData = uploadedImage
    setInputValue('')
    setUploadedImage(null)
    setError('')

    // Add user message
    const newUserMessage = {
      id: Date.now(),
      role: 'user',
      content: userMessage || '📷 [Image uploaded]',
      image: imageData,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, newUserMessage])

    // Show typing indicator
    setIsTyping(true)
    setIsLoading(true)

    try {
      // Get AI response
      let aiResponse
      if (aiService.isConfigured()) {
        // Send message with optional image
        aiResponse = await aiService.sendMessage(userMessage, imageData)
      } else {
        aiResponse = await aiService.getDemoResponse(userMessage)
      }

      // Increment usage count for specific mode after successful response
      const currentMode = aiService.getCurrentMode()
      const newCount = await aiService.incrementUsageByMode(currentMode)
      setUsageCount(newCount)

      // Add AI response
      const newAiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      }
      const updatedMessages = [...messages, newUserMessage, newAiMessage]
      setMessages(updatedMessages)

      // Auto-save conversation after AI response
      setTimeout(async () => {
        try {
          const savedChat = await aiChatService.saveConversation(updatedMessages, currentChatId)
          if (savedChat && !currentChatId) {
            setCurrentChatId(savedChat.id)
          }
          await loadChatHistory()
        } catch (error) {
          console.error('Auto-save failed:', error)
        }
      }, 500)

      // Check if user has reached limit for this mode (for free users)
      if (!authService.isPro()) {
        const hasRequests = await aiService.hasRemainingRequests()
        if (!hasRequests) {
          setTimeout(() => setShowUpgradeModal(true), 1000)
        }
      }
    } catch (err) {
      console.error('AI Error:', err)
      setError(err.message || 'Failed to get response. Please try again.')

      // Add error message
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `I'm having trouble processing that right now. ${err.message || 'Please try again.'}`,
        timestamp: new Date(),
        isError: true,
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
      setIsLoading(false)
    }
  }

  const handleQuickQuestion = (question) => {
    setInputValue(question)
    textareaRef.current?.focus()
  }

  const quickQuestions = deepResearchEnabled ? [
    "Research the history of calculus",
    "Compare quantum mechanics interpretations",
    "Analyze the causes of World War I",
    "Explore theories of human consciousness",
  ] : ultraThinkEnabled ? [
    "Explain quantum mechanics with deep reasoning",
    "Break down calculus concepts step-by-step",
    "What assignments should I prioritize and why?",
    "Create a comprehensive study plan",
  ] : [
    "What's on my schedule?",
    "What assignments are due?",
    "Study tips",
    "Quiz me",
  ]

  const setRegularChat = async () => {
    aiService.setRegularMode()
    setUltraThinkEnabled(false)
    setDeepResearchEnabled(false)

    // Show explanation only if not seen before (check Supabase)
    const hasSeen = await authService.hasSeenModeExplanation('regular')
    if (!hasSeen) {
      setModeExplanation({
        mode: 'regular',
        title: '💬 Regular Chat Mode',
        description: 'Quick and efficient responses for straightforward questions. Perfect for homework help, quick explanations, and general tutoring.',
        tokens: '2,000 tokens',
        features: ['Fast responses', 'Clear and concise', 'Great for homework help', 'Quick concept explanations']
      })
    }
  }

  const toggleUltraThink = async () => {
    const newState = aiService.toggleUltraThink()
    setUltraThinkEnabled(newState)
    setDeepResearchEnabled(false) // They're mutually exclusive

    // Show explanation when enabling, only if not seen before (check Supabase)
    if (newState) {
      const hasSeen = await authService.hasSeenModeExplanation('ultrathink')
      if (!hasSeen) {
        setModeExplanation({
          mode: 'ultrathink',
          title: '🧠 UltraThink Mode',
          description: 'Thoughtful reasoning mode with clear step-by-step explanations and organized analysis. Great for understanding complex topics without overwhelming detail.',
          tokens: '5,000 tokens',
          features: ['Clear step-by-step logic', 'Well-organized explanations', 'Helpful examples and analogies', 'Balanced depth and clarity']
        })
      }
    }
  }

  const toggleDeepResearch = async () => {
    const newState = aiService.toggleDeepResearch()
    setDeepResearchEnabled(newState)
    setUltraThinkEnabled(false) // They're mutually exclusive

    // Show explanation when enabling, only if not seen before (check Supabase)
    if (newState) {
      const hasSeen = await authService.hasSeenModeExplanation('deepresearch')
      if (!hasSeen) {
        setModeExplanation({
          mode: 'deepresearch',
          title: '📚 Deep Research Mode',
          description: 'ULTRA-COMPREHENSIVE academic research mode providing exhaustive, encyclopedic analysis with maximum scholarly depth. Delivers extensive multi-perspective investigation, complete historical context, theoretical frameworks, and interdisciplinary connections. Perfect for research papers, thesis work, and advanced academic study.',
          tokens: '16,000 tokens',
          features: ['Exhaustive multi-perspective analysis', 'Complete historical development', 'Theoretical frameworks and paradigms', 'Interdisciplinary connections', 'Extensive case studies and examples', 'Critical debates and controversies', 'Scholarly rigor and depth']
        })
      }
    }
  }

  const closeModeExplanation = async () => {
    if (modeExplanation?.mode) {
      // Save to Supabase instead of localStorage
      await authService.markModeExplanationSeen(modeExplanation.mode)
    }
    setModeExplanation(null)
  }

  const formatMessageContent = (content) => {
    // Enhanced markdown parser with beautiful styling

    // Handle DeepSeek R1 thinking blocks <think>...</think>
    content = content.replace(/<think>([\s\S]*?)<\/think>/gi, (match, thinkContent) => {
      return '\n<div class="my-4 p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-xl border-l-4 border-purple-500"><div class="flex items-center gap-2 mb-2"><svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg><span class="text-sm font-bold text-purple-400">💭 Reasoning Process</span></div><div class="text-sm text-purple-200 leading-relaxed italic opacity-90">' + thinkContent.trim() + '</div></div>\n'
    })

    // First, handle display math blocks ($$...$$) before line splitting
    content = content.replace(/\$\$([^\$]+)\$\$/g, (match, mathContent) => {
      return '\n<div class="my-3 p-3 bg-dark-bg-tertiary rounded-lg border border-dark-border-subtle text-center"><span class="italic text-dark-text-primary font-serif text-base">' + mathContent.trim() + '</span></div>\n'
    })

    const lines = content.split('\n')
    const formatted = []
    let inCodeBlock = false

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i]

      // Code blocks (```)
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock
        continue
      }

      if (inCodeBlock) {
        formatted.push('<div class="bg-dark-bg-tertiary rounded-lg px-3 md:px-4 py-2 md:py-2.5 my-2 font-mono text-xs md:text-sm lg:text-base text-accent-cyan border border-dark-border-subtle">' + line + '</div>')
        continue
      }

      // H1 headers (# Text)
      if (line.match(/^#\s+(.+)$/)) {
        const text = line.replace(/^#\s+/, '')
        formatted.push('<div class="text-base md:text-lg lg:text-xl font-bold text-dark-text-primary mt-4 mb-2 pb-2 border-b border-dark-border-subtle">' + text + '</div>')
        continue
      }

      // H2 headers (## Text)
      if (line.match(/^##\s+(.+)$/)) {
        const text = line.replace(/^##\s+/, '')
        formatted.push('<div class="text-base md:text-lg font-bold text-dark-text-primary mt-3 mb-2">' + text + '</div>')
        continue
      }

      // H3 headers (### Text)
      if (line.match(/^###\s+(.+)$/)) {
        const text = line.replace(/^###\s+/, '')
        formatted.push('<div class="text-sm md:text-base lg:text-lg font-semibold text-dark-text-primary mt-3 mb-1">' + text + '</div>')
        continue
      }

      // Headers with colons (WORD: or **WORD:**)
      if (line.match(/^(\*\*)?[A-Z][A-Za-z\s]+(\*\*)?:$/)) {
        const text = line.replace(/\*\*/g, '').replace(/:$/, '')
        formatted.push('<div class="text-sm md:text-base lg:text-lg font-bold text-primary-400 mt-3 mb-1.5">' + text + '</div>')
        continue
      }

      // Bullet points (- or *)
      if (line.trim().match(/^[-*]\s+(.+)$/)) {
        let text = line.trim().replace(/^[-*]\s+/, '')
        // Process inline formatting
        text = processInlineFormatting(text)
        formatted.push('<div class="flex gap-2 md:gap-2.5 my-1.5 md:my-2 ml-2"><span class="text-primary-400 flex-shrink-0 mt-0.5 text-sm md:text-base lg:text-lg">•</span><span class="flex-1 text-sm md:text-base lg:text-lg">' + text + '</span></div>')
        continue
      }

      // Numbered lists (1. 2. etc)
      if (line.trim().match(/^\d+\.\s+(.+)$/)) {
        const match = line.trim().match(/^(\d+)\.\s+(.+)$/)
        let text = match[2]
        const number = match[1]
        text = processInlineFormatting(text)
        formatted.push('<div class="flex gap-2 md:gap-2.5 my-1.5 md:my-2 ml-2"><span class="text-primary-400 flex-shrink-0 font-semibold min-w-[20px] text-sm md:text-base lg:text-lg">' + number + '.</span><span class="flex-1 text-sm md:text-base lg:text-lg">' + text + '</span></div>')
        continue
      }

      // Empty lines create spacing
      if (line.trim() === '') {
        formatted.push('<div class="h-2 md:h-3"></div>')
        continue
      }

      // Regular paragraphs
      line = processInlineFormatting(line)
      formatted.push('<div class="my-1.5 md:my-2 leading-relaxed text-sm md:text-base lg:text-lg">' + line + '</div>')
    }

    return formatted.join('')
  }

  // Process inline formatting (bold, italic, code, etc)
  const processInlineFormatting = (text) => {
    // LaTeX inline math ($...$) - render as italicized math or strip $ signs
    // This handles expressions like $x$, $x + y$, etc.
    text = text.replace(/\$([^\$]+)\$/g, (match, mathContent) => {
      return '<span class="italic text-dark-text-primary font-serif">' + mathContent + '</span>'
    })

    // Inline code (`code`) - use function to avoid $ interpretation issues
    text = text.replace(/`([^`]+)`/g, (match, code) => {
      return '<code class="px-1.5 py-0.5 rounded bg-dark-bg-tertiary text-accent-cyan font-mono text-[13px] border border-dark-border-subtle">' + code + '</code>'
    })

    // Bold + Italic (***text***)
    text = text.replace(/\*\*\*(.+?)\*\*\*/g, (match, content) => {
      return '<strong class="font-bold italic text-dark-text-primary">' + content + '</strong>'
    })

    // Bold (**text**)
    text = text.replace(/\*\*(.+?)\*\*/g, (match, content) => {
      return '<strong class="font-semibold text-dark-text-primary">' + content + '</strong>'
    })

    // Italic (*text* or _text_)
    text = text.replace(/\*(.+?)\*/g, (match, content) => {
      return '<em class="italic text-dark-text-secondary">' + content + '</em>'
    })
    text = text.replace(/_(.+?)_/g, (match, content) => {
      return '<em class="italic text-dark-text-secondary">' + content + '</em>'
    })

    // Links [text](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
      return '<a href="' + url + '" class="text-primary-400 hover:text-primary-300 underline" target="_blank" rel="noopener noreferrer">' + linkText + '</a>'
    })

    return text
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] h-full relative">
      {/* Clean Minimal Header */}
      <div className="flex-shrink-0 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark-text-primary tracking-tight">AI Tutor</h2>
            <p className="text-xs md:text-sm lg:text-base text-dark-text-secondary mt-0.5">
              {aiService.isConfigured() ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse-soft shadow-glow-cyan"></span>
                  Powered by {aiService.getProviderName()}
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  Demo Mode
                </span>
              )}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Auto-save indicator */}
            {currentChatId && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/30">
                <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs font-medium text-green-500">Auto-saved</span>
              </div>
            )}

            {/* New chat button */}
            <button
              onClick={startNewChat}
              className="p-2.5 rounded-xl bg-gradient-to-br from-primary-500 to-accent-cyan hover:from-primary-600 hover:to-accent-cyan-dark text-white transition-all duration-200 active:scale-95 shadow-glow-cyan"
              title="New chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Usage Counter */}
        <div className="mt-3 flex items-center justify-between px-3 py-2 bg-primary-500/10 rounded-xl border border-primary-500/30 shadow-dark-soft">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-sm font-medium text-dark-text-primary">
              {authService.isPro()
                ? `${usageCount}/250 AI chats`
                : `${aiService.getLimits().free - usageCount} free chats left`
              }
            </span>
          </div>
          {!authService.isPro() && (
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="text-xs font-semibold text-accent-purple hover:text-accent-purple-light transition-colors"
            >
              Upgrade
            </button>
          )}
        </div>

        {/* Mode Indicator Banners */}
        {ultraThinkEnabled && (
          <div className="mt-2.5 p-2.5 md:p-3 bg-gradient-to-r from-purple-500/20 to-purple-600/20 rounded-xl border border-purple-400/50 shadow-dark-soft animate-fadeIn">
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 flex-1">
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-gradient-to-br from-purple-500/80 to-purple-700/80 flex items-center justify-center shadow-md border border-purple-400/30">
                  <svg className="w-4.5 h-4.5 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm md:text-base font-bold text-purple-200">💭 UltraThink Active</h3>
                  </div>
                  <p className="text-xs text-purple-300/80 hidden md:block">Deep reasoning enabled</p>
                </div>
              </div>
              <button
                onClick={toggleUltraThink}
                className="px-2.5 py-1 bg-purple-500/40 hover:bg-purple-500/60 border border-purple-400/50 rounded-lg text-white text-xs font-semibold transition-all active:scale-95"
              >
                Disable
              </button>
            </div>
          </div>
        )}

        {deepResearchEnabled && (
          <div className="mt-2.5 p-2.5 md:p-3 bg-gradient-to-r from-blue-500/20 to-cyan-600/20 rounded-xl border border-blue-400/50 shadow-dark-soft animate-fadeIn">
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 flex-1">
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-gradient-to-br from-blue-500/80 to-cyan-700/80 flex items-center justify-center shadow-md border border-blue-400/30">
                  <svg className="w-4.5 h-4.5 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm md:text-base font-bold text-blue-200">📚 Deep Research Active</h3>
                  </div>
                  <p className="text-xs text-blue-300/80 hidden md:block">Comprehensive analysis enabled</p>
                </div>
              </div>
              <button
                onClick={toggleDeepResearch}
                className="px-2.5 py-1 bg-blue-500/40 hover:bg-blue-500/60 border border-blue-400/50 rounded-lg text-white text-xs font-semibold transition-all active:scale-95"
              >
                Disable
              </button>
            </div>
          </div>
        )}

        {/* AI Data Access Info Banner */}
        {showDataInfo && (
          <div className="mt-3 p-3 bg-gradient-to-r from-accent-cyan/10 to-primary-500/10 rounded-xl border border-accent-cyan/30 shadow-dark-soft animate-fadeIn">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500/30 to-accent-cyan/30 flex items-center justify-center border border-primary-500/40">
                  <svg className="w-4 h-4 text-accent-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-dark-text-primary">I have access to your data</h4>
                  <p className="text-[11px] text-dark-text-secondary">Ask me about anything below</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDataInfo(false)
                  localStorage.setItem('ai_data_info_dismissed', 'true')
                }}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-dark-bg-tertiary transition-all active:scale-95"
                title="Dismiss"
              >
                <svg className="w-3.5 h-3.5 text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Data sources grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
              {/* Canvas Assignments */}
              <div className="flex items-center gap-1.5 p-2 bg-dark-bg-tertiary rounded-lg border border-dark-border-subtle">
                <svg className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-[11px] font-semibold text-dark-text-primary">Assignments</span>
              </div>

              {/* Calendar */}
              <div className="flex items-center gap-1.5 p-2 bg-dark-bg-tertiary rounded-lg border border-dark-border-subtle">
                <svg className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-[11px] font-semibold text-dark-text-primary">Calendar</span>
              </div>

              {/* Study Schedule */}
              <div className="flex items-center gap-1.5 p-2 bg-dark-bg-tertiary rounded-lg border border-dark-border-subtle">
                <svg className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[11px] font-semibold text-dark-text-primary">Schedule</span>
              </div>

              {/* Notes */}
              <div className="flex items-center gap-1.5 p-2 bg-dark-bg-tertiary rounded-lg border border-dark-border-subtle">
                <svg className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="text-[11px] font-semibold text-dark-text-primary">Notes</span>
              </div>

              {/* Flashcards */}
              <div className="flex items-center gap-1.5 p-2 bg-dark-bg-tertiary rounded-lg border border-dark-border-subtle">
                <svg className="w-3.5 h-3.5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="text-[11px] font-semibold text-dark-text-primary">Flashcards</span>
              </div>

              {/* Study Streak */}
              <div className="flex items-center gap-1.5 p-2 bg-dark-bg-tertiary rounded-lg border border-dark-border-subtle">
                <svg className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                </svg>
                <span className="text-[11px] font-semibold text-dark-text-primary">Streak</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat History Quick Access */}
      {chatHistory.length > 0 && messages.length === 1 && (
        <div className="flex-shrink-0 mb-4 animate-fadeIn">
          <button
            onClick={() => setShowHistory(true)}
            className="w-full p-4 bg-gradient-to-r from-accent-purple/10 to-primary-500/10 border-2 border-accent-purple/30 rounded-2xl hover:from-accent-purple/20 hover:to-primary-500/20 hover:border-accent-purple/50 transition-all active:scale-[0.99] shadow-dark-soft relative overflow-hidden group"
          >
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-accent-purple/0 via-accent-purple/10 to-accent-purple/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-purple to-accent-purple-dark flex items-center justify-center shadow-glow-purple animate-pulse-soft">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-dark-text-primary">📜 View Past Conversations</div>
                  <div className="text-xs text-dark-text-secondary">{chatHistory.length} saved chat{chatHistory.length !== 1 ? 's' : ''} • Click to browse</div>
                </div>
              </div>
              <svg className="w-5 h-5 text-accent-purple group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
      )}

      {/* Quick Questions */}
      <div className="flex-shrink-0 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          {quickQuestions.map((question, index) => (
            <button
              key={index}
              onClick={() => handleQuickQuestion(question)}
              className="flex-shrink-0 px-3 md:px-3.5 lg:px-4 py-1.5 md:py-2 bg-dark-bg-secondary border border-dark-border-glow hover:border-accent-purple hover:bg-accent-purple/10 rounded-full text-xs md:text-sm lg:text-base font-medium text-dark-text-primary hover:text-accent-purple-light transition-all duration-200 active:scale-95 shadow-dark-soft"
            >
              {question}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 scroll-smooth scrollbar-thin">
        {messages.map((message, index) => (
          <div
            key={message.id}
            ref={index === messages.length - 1 ? lastMessageRef : null}
            className={`flex gap-2.5 ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeInUp`}
            style={{ animationDelay: `${index * 0.02}s` }}
          >
            {/* Assistant Avatar */}
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 mt-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-purple to-accent-purple-dark flex items-center justify-center shadow-soft">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
              </div>
            )}

            {/* Message Content */}
            <div className={`flex flex-col ${message.role === 'user' ? 'max-w-[85%] md:max-w-[75%] lg:max-w-[65%] items-end' : 'max-w-full md:max-w-full lg:max-w-[98%] xl:max-w-[95%] items-start'}`}>
              <div className={`rounded-2xl ${
                message.role === 'assistant'
                  ? message.isError
                    ? 'bg-red-900/20 border border-red-700/40 shadow-dark-soft px-4 md:px-5 py-3 md:py-3.5'
                    : 'bg-dark-bg-secondary border border-dark-border-glow shadow-dark-soft-md px-4 md:px-5 lg:px-6 py-3 md:py-4 lg:py-5'
                  : 'bg-gradient-to-br from-accent-purple via-accent-purple-dark to-accent-purple-dark text-white shadow-glow-purple px-3 md:px-4 lg:px-5 py-2 md:py-3 lg:py-4'
              }`}>
                {/* Show image if message has one */}
                {message.image && (
                  <img
                    src={message.image}
                    alt="Uploaded"
                    className="max-w-[200px] max-h-[200px] rounded-xl mb-3 border border-dark-border-subtle shadow-dark-soft object-cover"
                  />
                )}
                <div
                  className={`${
                    message.role === 'assistant'
                      ? message.isError
                        ? 'text-red-400 text-[15px] leading-[1.8]'
                        : 'text-dark-text-primary text-[16px] leading-[1.8]'
                      : 'text-white text-[15px] leading-relaxed'
                  }`}
                  dangerouslySetInnerHTML={{
                    __html: formatMessageContent(message.content)
                  }}
                />
              </div>
              <div className={`mt-1.5 px-2 text-[11px] text-dark-text-muted font-medium`}>
                {message.timestamp.toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </div>
            </div>

            {/* User Avatar */}
            {message.role === 'user' && (
              <div className="flex-shrink-0 mt-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-cyan flex items-center justify-center shadow-glow-cyan">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div ref={lastMessageRef} className="flex gap-2.5 animate-fadeInUp">
            <div className="flex-shrink-0 mt-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-purple to-accent-purple-dark flex items-center justify-center shadow-glow-purple">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
            </div>
            <div className="bg-dark-bg-secondary border border-dark-border-glow rounded-2xl px-4 py-3 shadow-dark-soft-md">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex-shrink-0 mb-3 p-3 bg-red-900/20 border border-red-700/40 rounded-xl animate-fadeIn shadow-dark-soft">
          <p className="text-sm text-red-400 font-medium">{error}</p>
        </div>
      )}

      {/* Premium Input Area */}
      <div className="flex-shrink-0 bg-dark-bg-secondary rounded-2xl p-3 shadow-dark-soft-md border border-dark-border-glow focus-within:border-accent-purple focus-within:shadow-glow-purple transition-all duration-200">
        {/* Image Preview */}
        {uploadedImage && (
          <div className="mb-3 relative inline-block animate-fadeIn">
            <img
              src={uploadedImage}
              alt="Uploaded"
              className="max-w-[200px] max-h-[200px] rounded-xl border-2 border-dark-border-glow shadow-dark-soft object-cover"
            />
            <button
              onClick={() => setUploadedImage(null)}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-all active:scale-95"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex items-end gap-2.5">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageUpload}
            className="hidden"
          />

          {/* Image upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="flex-shrink-0 w-9 h-9 rounded-lg bg-dark-bg-tertiary hover:bg-primary-500/20 border border-dark-border-glow hover:border-primary-500/50 flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            title="Upload or scan image"
          >
            <svg className="w-5 h-5 text-dark-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>

          {/* Regular Chat Mode button */}
          <button
            onClick={setRegularChat}
            disabled={isLoading}
            className={`flex-shrink-0 w-9 h-9 rounded-lg border-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center ${
              !ultraThinkEnabled && !deepResearchEnabled
                ? 'bg-gradient-to-br from-green-500/30 to-emerald-600/30 border-green-500 shadow-glow-green'
                : 'bg-dark-bg-tertiary border-dark-border-glow hover:border-green-500/50 hover:bg-green-500/10'
            }`}
            title={!ultraThinkEnabled && !deepResearchEnabled ? 'Regular Chat: Standard mode active' : 'Switch to Regular Chat mode'}
          >
            <svg className={`w-5 h-5 ${!ultraThinkEnabled && !deepResearchEnabled ? 'text-green-400' : 'text-dark-text-muted'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>

          {/* UltraThink toggle */}
          <button
            onClick={toggleUltraThink}
            disabled={isLoading}
            className={`relative flex-shrink-0 flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 ${
              ultraThinkEnabled
                ? 'bg-purple-500/25 border-purple-400/60 shadow-md'
                : 'bg-dark-bg-tertiary border-dark-border-glow hover:border-purple-500/50 hover:bg-purple-500/10'
            }`}
            title={ultraThinkEnabled ? 'UltraThink mode enabled - Click to disable' : 'Enable UltraThink for advanced reasoning'}
          >
            <svg className={`w-4 h-4 flex-shrink-0 ${ultraThinkEnabled ? 'text-purple-300' : 'text-dark-text-muted'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span className={`text-xs font-medium whitespace-nowrap hidden md:inline ${ultraThinkEnabled ? 'text-purple-200' : 'text-dark-text-muted'}`}>
              {ultraThinkEnabled ? 'Ultra' : 'Ultra'}
            </span>
          </button>

          {/* Deep Research toggle */}
          <button
            onClick={toggleDeepResearch}
            disabled={isLoading}
            className={`relative flex-shrink-0 flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 ${
              deepResearchEnabled
                ? 'bg-blue-500/25 border-blue-400/60 shadow-md'
                : 'bg-dark-bg-tertiary border-dark-border-glow hover:border-blue-500/50 hover:bg-blue-500/10'
            }`}
            title={deepResearchEnabled ? 'Deep Research mode enabled - Click to disable' : 'Enable Deep Research for extensive analysis'}
          >
            <svg className={`w-4 h-4 flex-shrink-0 ${deepResearchEnabled ? 'text-blue-300' : 'text-dark-text-muted'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className={`text-xs font-medium whitespace-nowrap hidden md:inline ${deepResearchEnabled ? 'text-blue-200' : 'text-dark-text-muted'}`}>
              {deepResearchEnabled ? 'Research' : 'Research'}
            </span>
          </button>

          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder={uploadedImage ? "Ask about this image..." : "Ask me anything..."}
            className="flex-1 resize-none bg-transparent text-dark-text-primary placeholder:text-dark-text-muted focus:outline-none py-2 text-[15px] leading-relaxed"
            rows={1}
            disabled={isLoading}
            style={{ maxHeight: '120px' }}
          />

          <button
            onClick={handleSend}
            disabled={(!inputValue.trim() && !uploadedImage) || isLoading}
            className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-accent-purple to-accent-purple-dark hover:from-accent-purple-dark hover:to-accent-purple-dark disabled:from-dark-bg-tertiary disabled:to-dark-navy-dark flex items-center justify-center transition-all duration-200 disabled:cursor-not-allowed active:scale-95 shadow-glow-purple disabled:shadow-none"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Chat History Modal */}
      {showHistory && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fadeIn flex items-center justify-center p-4"
          onClick={() => setShowHistory(false)}
        >
          <div
            className="w-full max-w-md bg-dark-bg-secondary rounded-3xl border border-dark-border-glow shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-fadeInUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-dark-border-glow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-purple to-accent-purple-dark flex items-center justify-center shadow-glow-purple-sm">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-dark-text-primary">Past Conversations</h3>
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-1.5 rounded-lg hover:bg-dark-bg-tertiary transition-all active:scale-95"
                >
                  <svg className="w-5 h-5 text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-dark-text-muted">Click any chat to continue where you left off</p>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatHistory.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-dark-bg-tertiary flex items-center justify-center border border-dark-border-glow">
                    <svg className="w-8 h-8 text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-sm text-dark-text-secondary font-medium">No chat history yet</p>
                  <p className="text-xs text-dark-text-muted mt-1">Your conversations are auto-saved!</p>
                  <p className="text-xs text-dark-text-muted">Start chatting and they'll appear here.</p>
                </div>
              ) : (
                chatHistory.map((chat) => (
                  <div
                    key={chat.id}
                    className={`group p-3 rounded-xl border transition-all cursor-pointer ${
                      currentChatId === chat.id
                        ? 'bg-primary-500/10 border-primary-500/40 shadow-glow-cyan-sm'
                        : 'bg-dark-bg-tertiary border-dark-border-subtle hover:border-primary-500/30 hover:bg-dark-navy-dark'
                    }`}
                    onClick={() => loadChat(chat.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-dark-text-primary truncate mb-1">
                          {chat.title}
                        </h4>
                        <p className="text-xs text-dark-text-muted">
                          {new Date(chat.updated_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteChat(chat.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all active:scale-95"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mode Explanation Modal */}
      {modeExplanation && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={closeModeExplanation}
        >
          <div
            className="bg-dark-bg-secondary border border-dark-border-glow rounded-2xl p-6 max-w-md w-full shadow-2xl animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="text-3xl">{modeExplanation.title.split(' ')[0]}</div>
              <h3 className="text-xl font-bold text-dark-text-primary">{modeExplanation.title.substring(2)}</h3>
            </div>

            <p className="text-dark-text-secondary mb-4 leading-relaxed">
              {modeExplanation.description}
            </p>

            <div className="bg-dark-bg-tertiary rounded-lg p-3 mb-4">
              <div className="text-xs text-dark-text-muted font-semibold mb-1">Max Response Length</div>
              <div className="text-primary-500 font-bold">{modeExplanation.tokens}</div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="text-xs text-dark-text-muted font-semibold">Features:</div>
              {modeExplanation.features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-dark-text-secondary">{feature}</span>
                </div>
              ))}
            </div>

            <button
              onClick={closeModeExplanation}
              className="w-full py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-semibold transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-dark-bg-secondary rounded-3xl shadow-2xl border border-dark-border-glow max-w-sm w-full p-6 animate-fadeInUp">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent-purple to-accent-purple-dark flex items-center justify-center shadow-glow-purple">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-2xl font-bold text-dark-text-primary text-center mb-2">
              Upgrade to Pro
            </h3>

            {/* Description */}
            <p className="text-dark-text-secondary text-center mb-6">
              You've used all your free AI chats. Upgrade to Pro for 250 chats per month plus exclusive features!
            </p>

            {/* Features List */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-accent-purple/20 flex items-center justify-center border border-accent-purple/40">
                  <svg className="w-3 h-3 text-accent-purple-light" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm text-dark-text-primary font-medium">250 AI chats per month</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-accent-purple/20 flex items-center justify-center border border-accent-purple/40">
                  <svg className="w-3 h-3 text-accent-purple-light" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm text-dark-text-primary font-medium">Priority support</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-accent-purple/20 flex items-center justify-center border border-accent-purple/40">
                  <svg className="w-3 h-3 text-accent-purple-light" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm text-dark-text-primary font-medium">Advanced study analytics</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-accent-purple/20 flex items-center justify-center border border-accent-purple/40">
                  <svg className="w-3 h-3 text-accent-purple-light" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm text-dark-text-primary font-medium">Export study notes</span>
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-gradient-to-r from-primary-500/10 to-accent-purple/10 rounded-xl p-4 mb-6 border border-primary-500/30">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl font-bold text-dark-text-primary">$4.99</span>
                <span className="text-dark-text-secondary font-medium">/month</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => {
                  // In a real app, this would navigate to payment flow
                  alert('Payment integration coming soon! Pro features will be available shortly.')
                }}
                className="w-full py-3.5 bg-gradient-to-r from-accent-purple to-accent-purple-dark hover:from-accent-purple-dark hover:to-accent-purple-dark text-white font-semibold rounded-xl shadow-glow-purple hover:shadow-glow-purple-lg transition-all duration-200 active:scale-98"
              >
                Upgrade Now
              </button>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="w-full py-3 text-dark-text-secondary hover:text-dark-text-primary font-medium transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AITutor
