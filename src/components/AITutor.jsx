/**
 * AITutor Component
 * Refined scholar's study aesthetic - warm, intellectual, premium chat experience
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
    { icon: '📅', label: 'Add Assignment', prompt: 'I need to add an assignment to my planner', featured: true },
    { icon: '✅', label: 'Add Task', prompt: 'Add a task to my to-do list', featured: true },
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
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-text-primary">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 rounded-md bg-surface-base/80 text-primary font-mono text-[0.85em]">$1</code>')
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
    <div className="h-full flex bg-surface-base">
      {/* History Sidebar */}
      <div
        className={`flex-shrink-0 border-r border-border bg-surface-elevated transition-all duration-300 ease-gentle overflow-hidden ${
          showHistory ? 'w-80' : 'w-0'
        }`}
      >
        <div className="w-80 h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="flex-shrink-0 p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">Conversations</h2>
              <button
                onClick={() => setShowHistory(false)}
                className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-overlay transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto p-3">
            {chatHistory.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-xl bg-surface-overlay flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-sm text-text-muted">No conversations yet</p>
                <p className="text-xs text-text-muted mt-1">Start chatting to save history</p>
              </div>
            ) : (
              <div className="space-y-1">
                {chatHistory.map((chat, index) => (
                  <div
                    key={chat.id}
                    className={`group relative rounded-xl transition-all duration-200 ${
                      currentChatId === chat.id
                        ? 'bg-primary/10 ring-1 ring-primary/20'
                        : 'hover:bg-surface-overlay'
                    }`}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <button
                      onClick={() => loadChat(chat.id)}
                      className="w-full p-3 text-left"
                    >
                      <p className="text-sm font-medium text-text-primary truncate pr-8">
                        {chat.title}
                      </p>
                      <p className="text-xs text-text-muted mt-1">
                        {formatDate(chat.updatedAt)}
                      </p>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteChat(chat.id) }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-text-muted hover:text-error hover:bg-error/10 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* New Chat Button */}
          <div className="flex-shrink-0 p-3 border-t border-border">
            <button
              onClick={startNewChat}
              className="w-full py-2.5 px-4 bg-primary hover:bg-primary-hover text-text-inverse rounded-xl font-medium transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Conversation
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex-shrink-0 border-b border-border bg-surface-elevated/80 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className={`p-2.5 rounded-xl transition-all ${
                    showHistory
                      ? 'bg-primary/10 text-primary'
                      : 'text-text-muted hover:text-text-primary hover:bg-surface-overlay'
                  }`}
                  title="Chat History"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                </button>

                <div className="flex items-center gap-3">
                  {/* AI Avatar */}
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent-mint flex items-center justify-center shadow-lg shadow-primary/20">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-surface-elevated" />
                  </div>

                  <div>
                    <h1 className="text-lg font-semibold text-text-primary">AI Tutor</h1>
                    <p className="text-xs text-text-muted">Always here to help</p>
                  </div>
                </div>
              </div>

              <button
                onClick={startNewChat}
                className="px-4 py-2 rounded-xl bg-surface-overlay hover:bg-surface-overlay/80 text-text-secondary hover:text-text-primary transition-all flex items-center gap-2 text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Chat
              </button>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-6">
            {/* Quick Suggestions for New Chat */}
            {isNewConversation && (
              <div className="mb-8 animate-fade-in">
                <p className="text-sm text-text-muted mb-4 text-center">Quick start with a topic:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {quickSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSend(suggestion.prompt)}
                      className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 text-sm group ${
                        suggestion.featured
                          ? 'bg-primary/10 hover:bg-primary/20 border border-primary/30 hover:border-primary/50'
                          : 'bg-surface-elevated hover:bg-surface-overlay border border-border hover:border-primary/30'
                      }`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <span className="text-lg">{suggestion.icon}</span>
                      <span className={`transition-colors ${
                        suggestion.featured
                          ? 'text-primary font-medium'
                          : 'text-text-secondary group-hover:text-text-primary'
                      }`}>
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
                  className={`flex gap-4 animate-fade-up ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                  style={{ animationDelay: `${index * 30}ms` }}
                  onMouseEnter={() => setHoveredMessage(message.id)}
                  onMouseLeave={() => setHoveredMessage(null)}
                >
                  {/* Avatar */}
                  {message.role === 'assistant' ? (
                    <div className="flex-shrink-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent-mint flex items-center justify-center shadow-md shadow-primary/10">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-shrink-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-cool to-accent-rose flex items-center justify-center shadow-md">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div className={`flex-1 max-w-[85%] ${message.role === 'user' ? 'flex flex-col items-end' : ''}`}>
                    <div
                      className={`relative rounded-2xl px-5 py-4 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-primary to-primary-hover text-white shadow-lg shadow-primary/20'
                          : message.isError
                          ? 'bg-error/10 border border-error/20 text-text-primary'
                          : 'bg-surface-elevated border border-border text-text-primary shadow-soft'
                      }`}
                    >
                      {/* Image */}
                      {message.image && (
                        <img
                          src={message.image}
                          alt="Uploaded"
                          className="max-w-full h-auto rounded-xl mb-3 shadow-md"
                        />
                      )}

                      {/* Content */}
                      <div
                        className={`text-sm leading-relaxed ${message.role === 'user' ? 'text-white' : ''}`}
                        dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                      />

                      {/* Timestamp on hover */}
                      <div
                        className={`absolute -bottom-5 text-xs text-text-muted transition-all duration-200 ${
                          hoveredMessage === message.id ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
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
                <div className="flex gap-4 animate-fade-in">
                  <div className="flex-shrink-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent-mint flex items-center justify-center shadow-md shadow-primary/10">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                  </div>
                  <div className="bg-surface-elevated border border-border rounded-2xl px-5 py-4 shadow-soft">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDuration: '1s' }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDuration: '1s', animationDelay: '0.2s' }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDuration: '1s', animationDelay: '0.4s' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} className="h-4" />
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 border-t border-border bg-surface-base">
          <div className="max-w-4xl mx-auto px-6 py-4">
            {/* Image Preview */}
            {uploadedImage && (
              <div className="mb-3 animate-scale-in">
                <div className="inline-flex items-start gap-2 p-2 bg-surface-elevated rounded-xl border border-border">
                  <img
                    src={uploadedImage}
                    alt="Preview"
                    className="h-20 rounded-lg object-cover"
                  />
                  <button
                    onClick={() => setUploadedImage(null)}
                    className="p-1 rounded-lg bg-surface-overlay hover:bg-error/20 text-text-muted hover:text-error transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Input Container */}
            <div className="relative bg-surface-elevated rounded-2xl border border-border focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/10 transition-all shadow-soft">
              <div className="flex items-end gap-2 p-2">
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
                  className="flex-shrink-0 p-2.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-overlay transition-colors"
                  title="Upload image"
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
                  placeholder="Ask me anything..."
                  rows={1}
                  className="flex-1 px-2 py-2.5 bg-transparent text-text-primary placeholder:text-text-muted focus:outline-none resize-none text-sm leading-relaxed"
                />

                {/* Send Button */}
                <button
                  onClick={() => handleSend()}
                  disabled={(!inputValue.trim() && !uploadedImage) || isLoading}
                  className="flex-shrink-0 p-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-primary shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Hint */}
            <p className="text-xs text-text-muted text-center mt-3">
              Press <kbd className="px-1.5 py-0.5 bg-surface-elevated rounded text-text-secondary font-mono text-[10px]">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 bg-surface-elevated rounded text-text-secondary font-mono text-[10px]">Shift + Enter</kbd> for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AITutor
