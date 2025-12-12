/**
 * Authentication Service
 * Handles user signup, login, logout, and session management with Supabase
 */

import supabase from '../lib/supabase'

class AuthService {
  constructor() {
    this.currentUser = null
    this.session = null
    this.userProfile = null
    this._loadSession()
  }

  /**
   * Load current session on initialization
   * @private
   */
  async _loadSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      this.session = session
      this.currentUser = session?.user || null

      // Load user profile if authenticated
      if (this.currentUser) {
        await this._loadUserProfile()
      }
    } catch (error) {
      console.error('Failed to load session:', error)
    }
  }

  /**
   * Load user profile from Supabase
   * @private
   */
  async _loadUserProfile() {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', this.currentUser.id)
        .single()

      if (error) throw error
      this.userProfile = data
    } catch (error) {
      console.error('Failed to load user profile:', error)
      this.userProfile = null
    }
  }

  /**
   * Sign up a new user
   * @param {string} email
   * @param {string} password
   * @param {Object} profileData - Optional profile data (full_name, canvas_url, canvas_token)
   * @returns {Promise<{user, session, error}>}
   */
  async signUp(email, password, profileData = {}) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        return { user: null, session: null, error }
      }

      this.currentUser = data.user
      this.session = data.session

      // Create user profile with provided data
      if (data.user && profileData) {
        try {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              id: data.user.id,
              email: data.user.email,
              full_name: profileData.full_name || null,
              canvas_url: profileData.canvas_url || null,
              canvas_token: profileData.canvas_token || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })

          if (profileError) {
            console.error('Failed to create user profile:', profileError)
            // Don't fail the signup if profile creation fails
            // The trigger should handle it, but this is a fallback
          } else {
            // Load the newly created profile
            await this._loadUserProfile()
          }
        } catch (profileErr) {
          console.error('Profile creation error:', profileErr)
          // Continue anyway - profile can be created later
        }
      }

      return { user: data.user, session: data.session, error: null }
    } catch (error) {
      console.error('Signup error:', error)
      return { user: null, session: null, error }
    }
  }

  /**
   * Sign in an existing user
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{user, session, error}>}
   */
  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { user: null, session: null, error }
      }

      this.currentUser = data.user
      this.session = data.session

      // Load user profile
      await this._loadUserProfile()

      return { user: data.user, session: data.session, error: null }
    } catch (error) {
      console.error('Sign in error:', error)
      return { user: null, session: null, error }
    }
  }

  /**
   * Sign out current user
   * @returns {Promise<{error}>}
   */
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut()

      this.currentUser = null
      this.session = null

      return { error }
    } catch (error) {
      console.error('Sign out error:', error)
      return { error }
    }
  }

  /**
   * Get current session
   * @returns {Promise<{session, error}>}
   */
  async getSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()

      this.session = session
      this.currentUser = session?.user || null

      return { session, error }
    } catch (error) {
      console.error('Get session error:', error)
      return { session: null, error }
    }
  }

  /**
   * Get current user
   * @returns {Promise<{user, error}>}
   */
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()

      this.currentUser = user

      return { user, error }
    } catch (error) {
      console.error('Get current user error:', error)
      return { user: null, error }
    }
  }

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    return this.currentUser !== null && this.session !== null
  }

  /**
   * Get user ID
   * @returns {string|null}
   */
  getUserId() {
    return this.currentUser?.id || null
  }

  /**
   * Subscribe to auth state changes
   * @param {Function} callback - Called when auth state changes
   * @returns {Object} Subscription object
   */
  onAuthStateChange(callback) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      this.session = session
      this.currentUser = session?.user || null
      callback(event, session)
    })

    return subscription
  }

  /**
   * Send password reset email
   * @param {string} email
   * @returns {Promise<{data, error}>}
   */
  async resetPassword(email) {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email)
      return { data, error }
    } catch (error) {
      console.error('Password reset error:', error)
      return { data: null, error }
    }
  }

  /**
   * Update user password
   * @param {string} newPassword
   * @returns {Promise<{user, error}>}
   */
  async updatePassword(newPassword) {
    try {
      const { data: { user }, error } = await supabase.auth.updateUser({
        password: newPassword
      })

      return { user, error }
    } catch (error) {
      console.error('Update password error:', error)
      return { user: null, error }
    }
  }

  /**
   * Get user profile
   * @returns {Object|null}
   */
  getUserProfile() {
    return this.userProfile
  }

  /**
   * Check if user is pro
   * @returns {boolean}
   */
  isPro() {
    return this.userProfile?.is_pro || false
  }

  /**
   * Get AI chat limit for current user
   * @returns {number}
   */
  getAiChatLimit() {
    return this.isPro() ? 250 : 3
  }

  /**
   * Refresh user profile
   * @returns {Promise<{profile, error}>}
   */
  async refreshUserProfile() {
    if (!this.currentUser) {
      return { profile: null, error: new Error('No user logged in') }
    }

    await this._loadUserProfile()
    return { profile: this.userProfile, error: null }
  }

  /**
   * Update user profile
   * @param {Object} updates - Profile fields to update (full_name, canvas_url, etc.)
   * @returns {Promise<{profile, error}>}
   */
  async updateUserProfile(updates) {
    if (!this.currentUser) {
      return { profile: null, error: new Error('No user logged in') }
    }

    try {
      // First check if profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', this.currentUser.id)
        .single()

      let result

      // Check if profile exists (fetchError will be PGRST116 if not found)
      if (existingProfile || (fetchError && fetchError.code !== 'PGRST116')) {
        // Update existing profile
        result = await supabase
          .from('user_profiles')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', this.currentUser.id)
          .select()
          .single()
      } else {
        // Create new profile - include required email field
        result = await supabase
          .from('user_profiles')
          .insert({
            id: this.currentUser.id,
            email: this.currentUser.email, // Required field
            ...updates,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()
      }

      if (result.error) throw result.error

      // Update local profile
      this.userProfile = result.data
      return { profile: result.data, error: null }
    } catch (error) {
      console.error('Update profile error:', error)
      return { profile: null, error }
    }
  }
}

// Export singleton instance
export default new AuthService()
