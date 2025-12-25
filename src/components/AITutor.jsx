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
      content: "Hi! I'm your AI tutor. I can help with homework, studying, and exam prep. What would you like to work on?",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedImage, setUploadedImage] = useState(null)
  const [currentChatId, setCurrentChatId] = useState(null)
  const [chatHistory, setChatHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

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
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
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
    const confirmed = await confirmDialog('Delete Chat', 'Are you sure?')
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
      content: "Hi! I'm your AI tutor. I can help with homework, studying, and exam prep. What would you like to work on?",
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

  const handleSend = async () => {
    if ((!inputValue.trim() && !uploadedImage) || isLoading) return

    const userMessage = inputValue.trim()
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

      // Auto-save
      const savedChat = await aiChatService.saveConversation(updatedMessages, currentChatId)
      if (savedChat && !currentChatId) setCurrentChatId(savedChat.id)
      await loadChatHistory()
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Sorry, I encountered an error. ${err.message || 'Please try again.'}`,
        timestamp: new Date(),
        isError: true,
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const formatMessage = (content) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-surface-base px-1 rounded">$1</code>')
      .replace(/\n/g, '<br>')
  }

  return (
    <div className="h-screen flex flex-col bg-surface-base">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-surface-elevated">
        <h1 className="text-xl font-bold text-text-primary">AI Tutor</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 text-text-muted hover:text-text-primary transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button
            onClick={startNewChat}
            className="p-2 text-text-muted hover:text-text-primary transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* History Sidebar */}
        {showHistory && (
          <div className="w-64 border-r border-border bg-surface-elevated overflow-y-auto">
            <div className="p-3">
              <h2 className="text-sm font-semibold text-text-muted mb-3">Chat History</h2>
              {chatHistory.length === 0 ? (
                <p className="text-sm text-text-muted">No saved chats</p>
              ) : (
                <div className="space-y-2">
                  {chatHistory.map((chat) => (
                    <div
                      key={chat.id}
                      className={`p-2 rounded-lg cursor-pointer transition-colors ${
                        currentChatId === chat.id ? 'bg-primary/20' : 'hover:bg-surface-overlay'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <button
                          onClick={() => loadChat(chat.id)}
                          className="flex-1 text-left"
                        >
                          <p className="text-sm text-text-primary truncate">{chat.title}</p>
                          <p className="text-xs text-text-muted">
                            {new Date(chat.updatedAt).toLocaleDateString()}
                          </p>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteChat(chat.id) }}
                          className="p-1 text-text-muted hover:text-error"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl p-4 ${
                    message.role === 'user'
                      ? 'bg-primary text-white'
                      : message.isError
                      ? 'bg-error/20 border border-error/30 text-text-primary'
                      : 'bg-surface-elevated border border-border text-text-primary'
                  }`}
                >
                  {message.image && (
                    <img
                      src={message.image}
                      alt="Uploaded"
                      className="max-w-full h-auto rounded-lg mb-2"
                    />
                  )}
                  <div
                    className="text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                  />
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-surface-elevated border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Image Preview */}
          {uploadedImage && (
            <div className="px-4 py-2 border-t border-border bg-surface-elevated">
              <div className="relative inline-block">
                <img src={uploadedImage} alt="Preview" className="h-16 rounded-lg" />
                <button
                  onClick={() => setUploadedImage(null)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-error rounded-full flex items-center justify-center text-white"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-border bg-surface-elevated">
            <div className="flex items-end gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 text-text-muted hover:text-text-primary transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
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
                placeholder="Ask anything..."
                rows={1}
                className="flex-1 px-4 py-2.5 bg-surface-base border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary resize-none"
              />
              <button
                onClick={handleSend}
                disabled={(!inputValue.trim() && !uploadedImage) || isLoading}
                className="p-2.5 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AITutor
