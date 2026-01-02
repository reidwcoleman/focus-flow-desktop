/**
 * AITutor Component
 * Premium minimalist chat interface - Linear/Apple inspired
 */

import { useState, useEffect, useRef } from 'react'
import aiService from '../services/aiService'
import aiChatService from '../services/aiChatService'
import { toast } from './Toast'
import { confirmDialog } from './ConfirmDialog'

const AITutor = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: "Hello! I'm your AI tutor. I can help you with homework, explain concepts, and prepare for exams.\n\n**Pro tip:** You can also add assignments to your planner just by telling me! Try saying \"Add math homework due Friday\" or \"I have a biology test next week.\"",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedImage, setUploadedImage] = useState(null)
  const [currentChatId, setCurrentChatId] = useState(null)
  const [chatHistory, setChatHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [hoveredMessage, setHoveredMessage] = useState(null)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  const quickSuggestions = [
    { icon: '📅', label: 'Add Assignment', prompt: 'I need to add an assignment to my planner' },
    { icon: '✅', label: 'Add Task', prompt: 'Add a task to my to-do list' },
    { icon: '📐', label: 'Math Help', prompt: 'Help me solve a math problem' },
    { icon: '📝', label: 'Essay Review', prompt: 'Review my essay and give feedback' },
  ]

  useEffect(() => {
    aiService.loadUserContext()
    loadChatHistory()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px'
    }
  }, [inputValue])

  const loadChatHistory = async () => {
    const chats = await aiChatService.getRecentChats()
    setChatHistory(chats)
  }

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

  const deleteChat = async (chatId) => {
    const confirmed = await confirmDialog('Delete Chat', 'Are you sure you want to delete this conversation?')
    if (confirmed) {
      await aiChatService.deleteChat(chatId)
      await loadChatHistory()
      if (currentChatId === chatId) startNewChat()
    }
  }

  const startNewChat = () => {
    setMessages([{
      id: Date.now(),
      role: 'assistant',
      content: "Hello! I'm your AI tutor. I can help you with homework, explain concepts, and prepare for exams.\n\n**Pro tip:** You can also add assignments to your planner just by telling me! Try saying \"Add math homework due Friday\" or \"I have a biology test next week.\"",
      timestamp: new Date(),
    }])
    setCurrentChatId(null)
    setShowHistory(false)
    aiService.clearHistory()
  }

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => setUploadedImage(event.target.result)
    reader.readAsDataURL(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSend = async (promptOverride = null) => {
    const messageText = promptOverride || inputValue.trim()
    if ((!messageText && !uploadedImage) || isLoading) return

    const userMessage = messageText
    const imageData = uploadedImage
    setInputValue('')
    setUploadedImage(null)

    const newUserMessage = {
      id: Date.now(),
      role: 'user',
      content: userMessage || '[Image uploaded]',
      image: imageData,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, newUserMessage])
    setIsLoading(true)

    try {
      let aiResponse
      if (aiService.isConfigured()) {
        aiResponse = await aiService.sendMessage(userMessage, imageData)
      } else {
        aiResponse = await aiService.getDemoResponse(userMessage)
      }

      const newAiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      }
      const updatedMessages = [...messages, newUserMessage, newAiMessage]
      setMessages(updatedMessages)

      const savedChat = await aiChatService.saveConversation(updatedMessages, currentChatId)
      if (savedChat && !currentChatId) setCurrentChatId(savedChat.id)
      await loadChatHistory()
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: `I apologize, but I encountered an error. ${err.message || 'Please try again.'}`,
        timestamp: new Date(),
        isError: true,
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const formatMessage = (content) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-medium">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-[0.9em] font-mono">$1</code>')
      .replace(/\n/g, '<br>')
  }

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDate = (date) => {
    const d = new Date(date)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (d.toDateString() === today.toDateString()) return 'Today'
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const isNewConversation = messages.length === 1 && messages[0].role === 'assistant'

  return (
    <div className="h-full flex bg-gradient-to-b from-surface-base to-surface-base/95">
      {/* History Sidebar - Glass Panel */}
      <div
        className={`flex-shrink-0 transition-all duration-500 ease-out overflow-hidden ${
          showHistory ? 'w-72' : 'w-0'
        }`}
      >
        <div className="w-72 h-full flex flex-col bg-surface-elevated/40 backdrop-blur-xl">
          {/* Sidebar Header */}
          <div className="flex-shrink-0 p-5 pb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary tracking-tight">History</h2>
              <button
                onClick={() => setShowHistory(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            {chatHistory.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-xs text-text-muted">No conversations yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {chatHistory.map((chat, index) => (
                  <div
                    key={chat.id}
                    className={`group relative rounded-xl transition-all duration-200 ${
                      currentChatId === chat.id
                        ? 'bg-primary/10'
                        : 'hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                    style={{
                      animation: 'fadeSlideIn 0.3s ease-out forwards',
                      animationDelay: `${index * 40}ms`,
                      opacity: 0
                    }}
                  >
                    <button
                      onClick={() => loadChat(chat.id)}
                      className="w-full p-3 text-left"
                    >
                      <p className="text-sm text-text-primary truncate pr-6 font-medium">
                        {chat.title}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {formatDate(chat.updatedAt)}
                      </p>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteChat(chat.id) }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-text-muted hover:text-error hover:bg-error/10 opacity-0 group-hover:opacity-100 transition-all duration-200"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* New Chat Button */}
          <div className="flex-shrink-0 p-3">
            <button
              onClick={startNewChat}
              className="w-full py-2.5 px-4 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/25 active:scale-[0.98]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Chat
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Minimal Header */}
        <header className="flex-shrink-0">
          <div className="max-w-3xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className={`p-2 rounded-xl transition-all duration-200 ${
                    showHistory
                      ? 'bg-primary/10 text-primary'
                      : 'text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                </button>

                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary via-primary to-accent-mint flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-surface-base" />
                  </div>
                  <span className="text-sm font-semibold text-text-primary">AI Tutor</span>
                </div>
              </div>

              <button
                onClick={startNewChat}
                className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-200"
                title="New Chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-4">
            {/* Quick Suggestions */}
            {isNewConversation && (
              <div className="mb-10 mt-8">
                <p className="text-xs text-text-muted mb-4 text-center uppercase tracking-wider font-medium">Quick Start</p>
                <div className="grid grid-cols-2 gap-2">
                  {quickSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSend(suggestion.prompt)}
                      className="group p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.04] hover:border-primary/20 transition-all duration-300 text-left"
                      style={{
                        animation: 'fadeSlideUp 0.4s ease-out forwards',
                        animationDelay: `${index * 80}ms`,
                        opacity: 0
                      }}
                    >
                      <span className="text-xl mb-2 block">{suggestion.icon}</span>
                      <span className="text-sm font-medium text-text-primary group-hover:text-primary transition-colors">
                        {suggestion.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="space-y-6">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                  style={{
                    animation: 'fadeSlideUp 0.4s ease-out forwards',
                    animationDelay: `${Math.min(index * 50, 200)}ms`,
                    opacity: 0
                  }}
                  onMouseEnter={() => setHoveredMessage(message.id)}
                  onMouseLeave={() => setHoveredMessage(null)}
                >
                  {/* Avatar */}
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent-mint flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div className={`flex-1 max-w-[85%] ${message.role === 'user' ? 'flex flex-col items-end' : ''}`}>
                    <div
                      className={`relative rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-primary to-blue-600 text-white shadow-lg shadow-primary/20'
                          : message.isError
                          ? 'bg-red-50 dark:bg-red-900/20 text-text-primary border border-red-200 dark:border-red-800/30'
                          : 'bg-black/[0.03] dark:bg-white/[0.05] text-text-primary'
                      }`}
                    >
                      {/* Image */}
                      {message.image && (
                        <img
                          src={message.image}
                          alt="Uploaded"
                          className="max-w-full h-auto rounded-xl mb-3"
                        />
                      )}

                      {/* Content */}
                      <div
                        className={`text-[14px] leading-relaxed ${message.role === 'user' ? 'text-white' : 'text-text-primary'}`}
                        dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                      />

                      {/* Timestamp */}
                      <div
                        className={`absolute -bottom-5 text-[10px] text-text-muted transition-all duration-300 ${
                          hoveredMessage === message.id ? 'opacity-100' : 'opacity-0'
                        } ${message.role === 'user' ? 'right-0' : 'left-0'}`}
                      >
                        {formatTime(message.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isLoading && (
                <div className="flex gap-3" style={{ animation: 'fadeSlideUp 0.3s ease-out forwards' }}>
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent-mint flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="bg-black/[0.03] dark:bg-white/[0.05] rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} className="h-6" />
            </div>
          </div>
        </div>

        {/* Input Area - Floating Glass Bar */}
        <div className="flex-shrink-0 pb-6 pt-2">
          <div className="max-w-3xl mx-auto px-6">
            {/* Image Preview */}
            {uploadedImage && (
              <div className="mb-3" style={{ animation: 'scaleIn 0.2s ease-out forwards' }}>
                <div className="inline-flex items-start gap-2 p-2 bg-black/[0.03] dark:bg-white/[0.05] rounded-xl">
                  <img
                    src={uploadedImage}
                    alt="Preview"
                    className="h-16 rounded-lg object-cover"
                  />
                  <button
                    onClick={() => setUploadedImage(null)}
                    className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-text-muted hover:text-error transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Input Container */}
            <div className="relative bg-black/[0.03] dark:bg-white/[0.05] rounded-2xl transition-all duration-300 focus-within:bg-black/[0.05] dark:focus-within:bg-white/[0.08] focus-within:ring-2 focus-within:ring-primary/20">
              <div className="flex items-end gap-1 p-1.5">
                {/* File Upload */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-shrink-0 p-2.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>

                {/* Textarea */}
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
                  placeholder="Message AI Tutor..."
                  rows={1}
                  className="flex-1 px-2 py-2.5 bg-transparent text-text-primary placeholder:text-text-muted/60 focus:outline-none resize-none text-[14px] leading-relaxed"
                />

                {/* Send Button */}
                <button
                  onClick={() => handleSend()}
                  disabled={(!inputValue.trim() && !uploadedImage) || isLoading}
                  className="flex-shrink-0 p-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/30"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Hint */}
            <p className="text-[10px] text-text-muted/60 text-center mt-2.5">
              <kbd className="px-1 py-0.5 bg-black/5 dark:bg-white/5 rounded text-[9px] font-medium">Enter</kbd> to send · <kbd className="px-1 py-0.5 bg-black/5 dark:bg-white/5 rounded text-[9px] font-medium">Shift + Enter</kbd> for new line
            </p>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}

export default AITutor
