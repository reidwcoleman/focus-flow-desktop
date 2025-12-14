/**
 * Account Component
 * User profile management with Canvas integration and logout
 */

import { useState, useEffect } from 'react'
import authService from '../services/authService'
import canvasService from '../services/canvasService'

export default function Account() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isEditingName, setIsEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [canvasUrl, setCanvasUrl] = useState('')
  const [canvasToken, setCanvasToken] = useState('')
  const [showCanvasToken, setShowCanvasToken] = useState(false)
  const [isEditingCanvas, setIsEditingCanvas] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    const { user } = await authService.getCurrentUser()
    setUser(user)

    // Refresh profile from server
    await authService.refreshUserProfile()
    const profile = authService.getUserProfile()

    setProfile(profile)
    setNewName(profile?.full_name || user?.email?.split('@')[0] || '')
    setCanvasUrl(profile?.canvas_url || '')
    setCanvasToken(profile?.canvas_token || '')
  }

  const handleSaveName = async () => {
    if (!newName.trim()) {
      setError('Name cannot be empty')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const result = await authService.updateUserProfile({ full_name: newName.trim() })

      if (result.error) {
        console.error('Update error:', result.error)
        setError(`Failed to update name: ${result.error.message || 'Unknown error'}`)
      } else {
        setSuccess('Name updated successfully!')
        setIsEditingName(false)
        await loadUserData()
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err) {
      console.error('Update exception:', err)
      setError(`Failed to update name: ${err.message || 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveCanvas = async () => {
    if (!canvasUrl.trim()) {
      setError('Canvas URL is required')
      return
    }

    if (!canvasToken.trim()) {
      setError('Canvas API key is required')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      console.log('📝 Saving Canvas credentials...', { canvasUrl: canvasUrl.trim() })
      const result = await authService.updateUserProfile({
        canvas_url: canvasUrl.trim(),
        canvas_token: canvasToken.trim()
      })

      console.log('💾 Update result:', result)

      if (result.error) {
        console.error('❌ Update error:', result.error)
        setError(`Failed to update Canvas credentials: ${result.error.message || 'Unknown error'}`)
      } else {
        console.log('✅ Canvas credentials saved successfully')
        setSuccess('Canvas integration updated! Test connection to verify.')
        setIsEditingCanvas(false)
        await loadUserData()
        setTimeout(() => setSuccess(''), 5000)
      }
    } catch (err) {
      console.error('❌ Exception saving Canvas credentials:', err)
      setError(`Failed to update Canvas credentials: ${err.message || 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setError('')
    setSuccess('')

    try {
      // Reinitialize Canvas with new credentials
      await canvasService.initializeFromProfile()

      // Try to fetch user info to test connection
      const userInfo = await canvasService.getCurrentUser()

      if (userInfo) {
        setSuccess(`✅ Connected successfully! Welcome, ${userInfo.name || 'Canvas User'}!`)
        setTimeout(() => setSuccess(''), 5000)
      }
    } catch (err) {
      setError(`Connection failed: ${err.message}`)
    } finally {
      setTesting(false)
    }
  }

  const handleSyncAssignments = async () => {
    setSyncing(true)
    setError('')
    setSuccess('')

    try {
      const result = await canvasService.syncToDatabase()

      if (result.success) {
        setSuccess(`✅ ${result.message}`)
        setTimeout(() => setSuccess(''), 5000)
      } else {
        setError(result.message || 'Sync failed')
      }
    } catch (err) {
      setError(`Sync failed: ${err.message}`)
    } finally {
      setSyncing(false)
    }
  }

  const handleLogout = async () => {
    const { error } = await authService.signOut()
    if (error) {
      setError('Failed to log out. Please try again.')
    }
    // The auth state change will trigger the app to show the login screen
  }

  return (
    <div className="space-y-6 lg:space-y-8 animate-fadeIn pb-8 lg:pb-12">
      {/* Header - Desktop Optimized */}
      <div className="text-center mb-8 lg:mb-12">
        <div className="w-20 h-20 lg:w-32 lg:h-32 mx-auto mb-4 lg:mb-6 rounded-full bg-gradient-to-br from-primary-500 to-accent-cyan flex items-center justify-center shadow-glow-cyan-lg">
          <svg className="w-10 h-10 lg:w-16 lg:h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h1 className="text-2xl lg:text-4xl font-bold text-dark-text-primary mb-1 lg:mb-3">Account Settings</h1>
        <p className="text-dark-text-muted text-sm lg:text-lg">{user?.email}</p>
      </div>

      {/* Success/Error Messages - Desktop Optimized */}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl lg:rounded-2xl p-4 lg:p-6 animate-fadeIn">
          <p className="text-green-400 text-sm lg:text-base text-center">{success}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl lg:rounded-2xl p-4 lg:p-6 animate-fadeIn">
          <p className="text-red-400 text-sm lg:text-base text-center">{error}</p>
        </div>
      )}

      {/* Desktop 2-Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">

        {/* Left Column: Profile & Account Info */}
        <div className="space-y-6 lg:space-y-8">
          {/* Profile Name Card */}
          <div className="bg-dark-bg-secondary rounded-2xl lg:rounded-3xl p-5 lg:p-8 border border-dark-border-glow shadow-dark-card hover:shadow-dark-soft-lg transition-all duration-200">
            <div className="flex items-center justify-between mb-3 lg:mb-5">
              <h2 className="text-lg lg:text-2xl font-semibold text-dark-text-primary flex items-center gap-2 lg:gap-3">
                <svg className="w-5 h-5 lg:w-7 lg:h-7 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Display Name
              </h2>
              {!isEditingName && (
                <button
                  onClick={() => setIsEditingName(true)}
                  className="text-primary-500 hover:text-primary-400 transition-colors text-sm lg:text-base font-medium"
                >
                  Edit
                </button>
              )}
            </div>

            {isEditingName ? (
              <div className="space-y-3 lg:space-y-4">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-dark-bg-primary border border-dark-border-glow rounded-xl lg:rounded-2xl px-4 lg:px-6 py-3 lg:py-4 text-dark-text-primary text-sm lg:text-lg placeholder-dark-text-muted focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                  placeholder="Enter your name"
                  autoFocus
                />
                <div className="flex gap-2 lg:gap-3">
                  <button
                    onClick={handleSaveName}
                    disabled={saving}
                    className="flex-1 bg-gradient-to-r from-primary-600 to-accent-cyan text-white font-semibold py-2.5 lg:py-3.5 text-sm lg:text-base rounded-xl lg:rounded-2xl hover:shadow-glow-cyan-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingName(false)
                      setNewName(profile?.full_name || user?.email?.split('@')[0] || '')
                    }}
                    disabled={saving}
                    className="flex-1 bg-dark-bg-primary border border-dark-border-glow text-dark-text-secondary font-semibold py-2.5 lg:py-3.5 text-sm lg:text-base rounded-xl lg:rounded-2xl hover:bg-dark-bg-surface transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-dark-text-primary text-lg lg:text-2xl">
                {profile?.full_name || user?.email?.split('@')[0] || 'Not set'}
              </p>
            )}
          </div>

          {/* Account Info Card */}
          <div className="bg-dark-bg-secondary rounded-2xl lg:rounded-3xl p-5 lg:p-8 border border-dark-border-glow shadow-dark-card hover:shadow-dark-soft-lg transition-all duration-200">
            <h2 className="text-lg lg:text-2xl font-semibold text-dark-text-primary mb-4 lg:mb-6 flex items-center gap-2 lg:gap-3">
              <svg className="w-5 h-5 lg:w-7 lg:h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Account Information
            </h2>

            <div className="space-y-3 lg:space-y-5">
              <div>
                <p className="text-xs lg:text-sm text-dark-text-muted mb-1 lg:mb-2">Email</p>
                <p className="text-dark-text-primary text-base lg:text-xl">{user?.email}</p>
              </div>
              <div>
                <p className="text-xs lg:text-sm text-dark-text-muted mb-1 lg:mb-2">Account Type</p>
                <div className="flex items-center gap-2">
                  <span className={`px-3 lg:px-4 py-1 lg:py-2 rounded-full text-xs lg:text-sm font-semibold ${
                    profile?.is_pro
                      ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border border-yellow-500/30'
                      : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                  }`}>
                    {profile?.is_pro ? 'Pro' : 'Free'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Canvas Integration */}
        <div className="space-y-6 lg:space-y-8">
          {/* Canvas Integration Card */}
          <div className="bg-dark-bg-secondary rounded-2xl lg:rounded-3xl p-5 lg:p-8 border border-dark-border-glow shadow-dark-card hover:shadow-dark-soft-lg transition-all duration-200">
            <div className="flex items-center justify-between mb-3 lg:mb-5">
              <h2 className="text-lg lg:text-2xl font-semibold text-dark-text-primary flex items-center gap-2 lg:gap-3">
                <svg className="w-5 h-5 lg:w-7 lg:h-7 text-accent-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Canvas Integration
              </h2>
              {!isEditingCanvas && (
                <button
                  onClick={() => setIsEditingCanvas(true)}
                  className="text-primary-500 hover:text-primary-400 transition-colors text-sm lg:text-base font-medium"
                >
                  Edit
                </button>
              )}
            </div>

            {isEditingCanvas ? (
              <div className="space-y-4 lg:space-y-6">
                {/* Canvas URL */}
                <div>
                  <label className="block text-sm lg:text-base font-medium text-dark-text-secondary mb-2 lg:mb-3">
                    Canvas URL
                  </label>
                  <input
                    type="url"
                    value={canvasUrl}
                    onChange={(e) => setCanvasUrl(e.target.value)}
                    className="w-full bg-dark-bg-primary border border-dark-border-glow rounded-xl lg:rounded-2xl px-4 lg:px-6 py-3 lg:py-4 text-dark-text-primary text-sm lg:text-lg placeholder-dark-text-muted focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                    placeholder="https://wcpss.instructure.com"
                    autoFocus
                  />
                  <p className="text-xs lg:text-sm text-dark-text-muted mt-1.5 lg:mt-2">
                    Example: https://wcpss.instructure.com
                  </p>
                </div>

                {/* Canvas API Key */}
                <div>
                  <label className="block text-sm lg:text-base font-medium text-dark-text-secondary mb-2 lg:mb-3">
                    Canvas API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showCanvasToken ? 'text' : 'password'}
                      value={canvasToken}
                      onChange={(e) => setCanvasToken(e.target.value)}
                      className="w-full bg-dark-bg-primary border border-dark-border-glow rounded-xl lg:rounded-2xl px-4 lg:px-6 py-3 lg:py-4 pr-12 lg:pr-14 text-dark-text-primary placeholder-dark-text-muted focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all font-mono text-sm lg:text-base"
                      placeholder="Paste your Canvas API token"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCanvasToken(!showCanvasToken)}
                      className="absolute right-3 lg:right-4 top-1/2 -translate-y-1/2 text-dark-text-muted hover:text-dark-text-primary transition-colors"
                    >
                      {showCanvasToken ? (
                        <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="text-xs lg:text-sm text-dark-text-muted mt-1.5 lg:mt-2">
                    Get your API key from: Canvas → Account → Settings → New Access Token
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-2 lg:gap-3">
                  <button
                    onClick={handleSaveCanvas}
                    disabled={saving}
                    className="flex-1 bg-gradient-to-r from-accent-purple to-accent-pink text-white font-semibold py-2.5 lg:py-3.5 text-sm lg:text-base rounded-xl lg:rounded-2xl hover:shadow-glow-purple-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingCanvas(false)
                      setCanvasUrl(profile?.canvas_url || '')
                      setCanvasToken(profile?.canvas_token || '')
                    }}
                    disabled={saving}
                    className="flex-1 bg-dark-bg-primary border border-dark-border-glow text-dark-text-secondary font-semibold py-2.5 lg:py-3.5 text-sm lg:text-base rounded-xl lg:rounded-2xl hover:bg-dark-bg-surface transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 lg:space-y-5">
                {/* Status */}
                <div>
                  <p className="text-sm lg:text-base text-dark-text-secondary mb-1 lg:mb-2">Canvas URL:</p>
                  <p className="text-dark-text-primary text-base lg:text-xl">
                    {profile?.canvas_url || 'Not configured'}
                  </p>
                </div>

                {profile?.canvas_url && profile?.canvas_token && (
                  <>
                    <div className="flex items-center gap-2 text-xs lg:text-sm text-green-400">
                      <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Configured
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 lg:gap-3 pt-2 lg:pt-3">
                      <button
                        onClick={handleTestConnection}
                        disabled={testing}
                        className="flex-1 bg-dark-bg-primary border border-primary-500/50 text-primary-500 font-semibold py-2.5 lg:py-3.5 text-sm lg:text-base rounded-xl lg:rounded-2xl hover:bg-primary-500/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {testing ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 lg:w-5 lg:h-5 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
                            Testing...
                          </span>
                        ) : (
                          'Test Connection'
                        )}
                      </button>
                      <button
                        onClick={handleSyncAssignments}
                        disabled={syncing}
                        className="flex-1 bg-gradient-to-r from-accent-purple to-accent-pink text-white font-semibold py-2.5 lg:py-3.5 text-sm lg:text-base rounded-xl lg:rounded-2xl hover:shadow-glow-purple-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {syncing ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 lg:w-5 lg:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Syncing...
                          </span>
                        ) : (
                          'Sync Assignments'
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Logout Button - Desktop Optimized */}
      <button
        onClick={handleLogout}
        className="w-full bg-red-500/10 border border-red-500/30 text-red-400 font-semibold py-3.5 lg:py-5 text-sm lg:text-lg rounded-xl lg:rounded-2xl hover:bg-red-500/20 hover:border-red-500/50 transition-all duration-200 flex items-center justify-center gap-2 lg:gap-3"
      >
        <svg className="w-5 h-5 lg:w-7 lg:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Log Out
      </button>
    </div>
  )
}
