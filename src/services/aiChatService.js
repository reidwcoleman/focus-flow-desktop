/**
 * AI Chat Service
 * Handles CRUD operations for AI chat history using Supabase
 */

import supabase from '../lib/supabase'
import authService from './authService'

class AIChatService {
  /**
   * Get all chats for current user
   * @returns {Promise<Array>}
   */
  async getAllChats() {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('ai_chats')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Failed to fetch AI chats:', error)
      return []
    }
  }

  /**
   * Get chat by ID
   * @param {string} id - Chat ID
   * @returns {Promise<Object|null>}
   */
  async getChatById(id) {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('ai_chats')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Failed to fetch chat:', error)
      return null
    }
  }

  /**
   * Create a new chat
   * @param {Object} chatData - { title, messages }
   * @returns {Promise<Object|null>}
   */
  async createChat(chatData) {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('ai_chats')
        .insert({
          user_id: userId,
          title: chatData.title,
          messages: chatData.messages || []
        })
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Failed to create chat:', error)
      return null
    }
  }

  /**
   * Update a chat
   * @param {string} id - Chat ID
   * @param {Object} updates - { title?, messages? }
   * @returns {Promise<Object|null>}
   */
  async updateChat(id, updates) {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('ai_chats')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Failed to update chat:', error)
      return null
    }
  }

  /**
   * Delete a chat
   * @param {string} id - Chat ID
   * @returns {Promise<boolean>}
   */
  async deleteChat(id) {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const { error } = await supabase
        .from('ai_chats')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (error) throw error

      return true
    } catch (error) {
      console.error('Failed to delete chat:', error)
      return false
    }
  }

  /**
   * Save current conversation
   * @param {Array} messages - Array of message objects
   * @param {string|null} chatId - Existing chat ID or null for new chat
   * @returns {Promise<Object|null>}
   */
  async saveConversation(messages, chatId = null) {
    try {
      // Generate title from first user message
      const firstUserMessage = messages.find(m => m.role === 'user')
      const title = firstUserMessage
        ? firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '')
        : 'New Conversation'

      const chatData = {
        title,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp
        }))
      }

      if (chatId) {
        // Update existing chat
        return await this.updateChat(chatId, chatData)
      } else {
        // Create new chat
        return await this.createChat(chatData)
      }
    } catch (error) {
      console.error('Failed to save conversation:', error)
      return null
    }
  }

  /**
   * Get recent chats (limit to 10)
   * @returns {Promise<Array>}
   */
  async getRecentChats() {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('ai_chats')
        .select('id, title, created_at, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(10)

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Failed to fetch recent chats:', error)
      return []
    }
  }

  /**
   * Search chats by title
   * @param {string} query - Search query
   * @returns {Promise<Array>}
   */
  async searchChats(query) {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('ai_chats')
        .select('*')
        .eq('user_id', userId)
        .ilike('title', `%${query}%`)
        .order('updated_at', { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Failed to search chats:', error)
      return []
    }
  }
}

// Export singleton instance
export default new AIChatService()
