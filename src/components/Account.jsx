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
  const [syncing, setSyncing] = useState(false)

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

  const handleSyncCanvas = async () => {
    setSyncing(true)
    try {
      const result = await canvasService.syncToDatabase()
      if (result.success) {
        toast.success(result.synced > 0 ? `Synced ${result.synced} assignments from Canvas` : 'All assignments up to date')
      } else {
        throw new Error('Sync failed')
      }
    } catch (err) {
      toast.error('Failed to sync Canvas assignments')
    } finally {
      setSyncing(false)
    }
  }

  const handleLogout = async () => {
    await authService.signOut()
    window.location.reload()
  }

  return (
    <div className="min-h-screen p-6 md:p-8 lg:p-10 max-w-2xl mx-auto">
      {/* Header */}
      <header className="mb-10 animate-fade-up">
        <h1 className="text-3xl font-semibold text-text-primary tracking-tight">Account</h1>
        <p className="text-text-secondary mt-1">Manage your profile and settings</p>
      </header>

      <div className="space-y-6 animate-fade-up stagger-1">
        {/* Profile Section */}
        <div className="bg-surface-elevated rounded-2xl p-6">
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-5">Profile</h2>

          <div className="flex items-center gap-5 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-accent-warm/15 flex items-center justify-center text-accent-warm text-xl font-semibold">
              {(profile?.full_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-text-primary text-lg">{profile?.full_name || 'No name set'}</p>
              <p className="text-sm text-text-muted">{user?.email}</p>
            </div>
          </div>

          {isEditingName ? (
            <div className="space-y-4">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="input"
                placeholder="Your name"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setIsEditingName(false)}
                  className="flex-1 py-3 bg-surface-overlay text-text-secondary rounded-xl hover:bg-surface-overlay/80 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveName}
                  disabled={saving}
                  className="flex-1 py-3 bg-primary text-text-inverse rounded-xl hover:bg-primary-hover transition-colors font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className="w-full py-3 bg-surface-base text-text-secondary rounded-xl hover:bg-surface-overlay hover:text-text-primary transition-all font-medium"
            >
              Edit Name
            </button>
          )}
        </div>

        {/* Canvas Integration */}
        <div className="bg-surface-elevated rounded-2xl p-6 animate-fade-up stagger-2">
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-5">Canvas Integration</h2>

          {isEditingCanvas ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-text-secondary mb-2 block">Canvas URL</label>
                <input
                  type="url"
                  value={canvasUrl}
                  onChange={(e) => setCanvasUrl(e.target.value)}
                  className="input"
                  placeholder="https://school.instructure.com"
                />
              </div>
              <div>
                <label className="text-sm text-text-secondary mb-2 block">API Token</label>
                <input
                  type="password"
                  value={canvasToken}
                  onChange={(e) => setCanvasToken(e.target.value)}
                  className="input"
                  placeholder="Your Canvas API token"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsEditingCanvas(false)}
                  className="flex-1 py-3 bg-surface-overlay text-text-secondary rounded-xl hover:bg-surface-overlay/80 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCanvas}
                  disabled={saving}
                  className="flex-1 py-3 bg-primary text-text-inverse rounded-xl hover:bg-primary-hover transition-colors font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {profile?.canvas_url ? (
                <div className="flex items-center gap-3 p-4 bg-surface-base rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-sm text-text-secondary">Connected to Canvas</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-surface-base rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-text-muted" />
                  <span className="text-sm text-text-muted">Not configured</span>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setIsEditingCanvas(true)}
                  className="flex-1 py-3 bg-surface-base text-text-secondary rounded-xl hover:bg-surface-overlay hover:text-text-primary transition-all font-medium"
                >
                  {profile?.canvas_url ? 'Edit Settings' : 'Set Up'}
                </button>
                {profile?.canvas_url && (
                  <button
                    onClick={handleTestConnection}
                    disabled={testing}
                    className="flex-1 py-3 bg-primary/10 text-primary rounded-xl hover:bg-primary/15 transition-colors font-medium disabled:opacity-50"
                  >
                    {testing ? 'Testing...' : 'Test Connection'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sign Out */}
        <button
          onClick={handleLogout}
          className="w-full py-3.5 bg-error/10 text-error rounded-2xl hover:bg-error/15 transition-colors font-medium animate-fade-up stagger-3"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
