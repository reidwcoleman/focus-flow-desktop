import { useState, useEffect } from 'react'
import authService from '../services/authService'
import canvasService from '../services/canvasService'
import { toast } from './Toast'

export default function Account() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isEditingName, setIsEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [canvasUrl, setCanvasUrl] = useState('')
  const [canvasToken, setCanvasToken] = useState('')
  const [isEditingCanvas, setIsEditingCanvas] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    const { user } = await authService.getCurrentUser()
    setUser(user)
    await authService.refreshUserProfile()
    const profile = authService.getUserProfile()
    setProfile(profile)
    setNewName(profile?.full_name || user?.email?.split('@')[0] || '')
    setCanvasUrl(profile?.canvas_url || '')
    setCanvasToken(profile?.canvas_token || '')
  }

  const handleSaveName = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      await authService.updateUserProfile({ full_name: newName.trim() })
      toast.success('Name updated')
      setIsEditingName(false)
      await loadUserData()
    } catch (err) {
      toast.error('Failed to update name')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveCanvas = async () => {
    if (!canvasUrl.trim() || !canvasToken.trim()) {
      toast.error('Both URL and token are required')
      return
    }
    setSaving(true)
    try {
      await authService.updateUserProfile({
        canvas_url: canvasUrl.trim(),
        canvas_token: canvasToken.trim()
      })
      toast.success('Canvas settings saved')
      setIsEditingCanvas(false)
      await loadUserData()
    } catch (err) {
      toast.error('Failed to save Canvas settings')
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    setTesting(true)
    try {
      const initialized = await canvasService.initializeFromProfile()
      if (!initialized) throw new Error('Failed to initialize')
      const userInfo = await canvasService.getCurrentUser()
      if (userInfo) {
        toast.success(`Connected as ${userInfo.name || 'Canvas User'}`)
      }
    } catch (err) {
      toast.error('Connection failed. Check your credentials.')
    } finally {
      setTesting(false)
    }
  }

  const handleLogout = async () => {
    await authService.signOut()
    window.location.reload()
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-text-primary">Account</h1>

      {/* Profile Section */}
      <div className="bg-surface-elevated rounded-xl p-4 border border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Profile</h2>

        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold">
            {(profile?.full_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-text-primary">{profile?.full_name || 'No name set'}</p>
            <p className="text-sm text-text-muted">{user?.email}</p>
          </div>
        </div>

        {isEditingName ? (
          <div className="space-y-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface-base border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
              placeholder="Your name"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditingName(false)}
                className="flex-1 py-2 bg-surface-base border border-border text-text-primary rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveName}
                disabled={saving}
                className="flex-1 py-2 bg-primary text-white rounded-lg disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsEditingName(true)}
            className="w-full py-2 bg-surface-base border border-border text-text-primary rounded-lg hover:bg-surface-overlay transition-colors"
          >
            Edit Name
          </button>
        )}
      </div>

      {/* Canvas Integration */}
      <div className="bg-surface-elevated rounded-xl p-4 border border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Canvas Integration</h2>

        {isEditingCanvas ? (
          <div className="space-y-3">
            <div>
              <label className="text-sm text-text-muted mb-1 block">Canvas URL</label>
              <input
                type="url"
                value={canvasUrl}
                onChange={(e) => setCanvasUrl(e.target.value)}
                className="w-full px-4 py-2.5 bg-surface-base border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
                placeholder="https://school.instructure.com"
              />
            </div>
            <div>
              <label className="text-sm text-text-muted mb-1 block">API Token</label>
              <input
                type="password"
                value={canvasToken}
                onChange={(e) => setCanvasToken(e.target.value)}
                className="w-full px-4 py-2.5 bg-surface-base border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
                placeholder="Your Canvas API token"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditingCanvas(false)}
                className="flex-1 py-2 bg-surface-base border border-border text-text-primary rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCanvas}
                disabled={saving}
                className="flex-1 py-2 bg-primary text-white rounded-lg disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {profile?.canvas_url ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success" />
                <span className="text-sm text-text-secondary">Connected to {profile.canvas_url}</span>
              </div>
            ) : (
              <p className="text-sm text-text-muted">Not configured</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditingCanvas(true)}
                className="flex-1 py-2 bg-surface-base border border-border text-text-primary rounded-lg hover:bg-surface-overlay transition-colors"
              >
                {profile?.canvas_url ? 'Edit' : 'Set Up'}
              </button>
              {profile?.canvas_url && (
                <button
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="flex-1 py-2 bg-primary text-white rounded-lg disabled:opacity-50"
                >
                  {testing ? 'Testing...' : 'Test Connection'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full py-3 bg-error/10 border border-error/30 text-error rounded-xl hover:bg-error/20 transition-colors"
      >
        Sign Out
      </button>
    </div>
  )
}
