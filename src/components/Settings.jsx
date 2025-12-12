import { useState, useEffect } from 'react'
import canvasService from '../services/canvasService'

const Settings = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [canvasDomain, setCanvasDomain] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState('')
  const [userData, setUserData] = useState(null)

  useEffect(() => {
    setIsConnected(canvasService.isConnected())
    if (canvasService.isConnected()) {
      loadUserData()
    }
  }, [])

  const loadUserData = async () => {
    try {
      const user = await canvasService.getCurrentUser()
      setUserData(user)
    } catch (error) {
      console.error('Failed to load user data:', error)
    }
  }

  const handleConnect = async () => {
    setError('')
    setIsConnecting(true)

    try {
      // Set credentials
      canvasService.setCredentials(canvasDomain, accessToken)

      // Test connection by fetching user data
      const user = await canvasService.getCurrentUser()
      setUserData(user)
      setIsConnected(true)
      setCanvasDomain('')
      setAccessToken('')
    } catch (error) {
      console.error('Canvas connection error:', error)
      setError(error.message || 'Failed to connect to Canvas. Please check your domain and access token.')
      canvasService.disconnect()
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDemoMode = () => {
    canvasService.enableDemoMode()
    setIsConnected(true)
    loadUserData()
  }

  const handleDisconnect = () => {
    canvasService.disconnect()
    setIsConnected(false)
    setUserData(null)
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-soft border border-neutral-100">
        <h2 className="text-xl font-bold text-neutral-900 mb-1">Settings</h2>
        <p className="text-sm text-neutral-500">Manage your integrations and preferences</p>
      </div>

      {/* Canvas Integration */}
      <div className="bg-white rounded-2xl p-6 shadow-soft border border-neutral-100">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-md">
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-neutral-900 mb-1">Canvas LMS</h3>
            <p className="text-sm text-neutral-600">
              Connect your Canvas account to automatically import assignments and grades
            </p>
          </div>
          {isConnected && (
            <div className="flex-shrink-0 px-3 py-1 rounded-full bg-green-100 border border-green-200">
              <span className="text-green-700 text-xs font-semibold">Connected</span>
            </div>
          )}
        </div>

        {!isConnected ? (
          <div className="space-y-4">
            {/* CORS Warning Banner */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <h4 className="font-semibold text-amber-900 text-sm mb-1">Browser Limitation</h4>
                  <p className="text-xs text-amber-800">
                    Canvas may block direct browser requests (CORS). If connection fails, use <strong>Demo Mode</strong> to see how the integration works!
                  </p>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Canvas Domain
              </label>
              <input
                type="text"
                value={canvasDomain}
                onChange={(e) => setCanvasDomain(e.target.value)}
                placeholder="school.instructure.com"
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-neutral-900"
              />
              <p className="mt-1 text-xs text-neutral-500">
                Your school's Canvas domain (e.g., harvard.instructure.com)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Access Token
              </label>
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Enter your Canvas API token"
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-neutral-900"
              />
              <p className="mt-1 text-xs text-neutral-500">
                Generate from: Canvas → Account → Settings → New Access Token
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleConnect}
                disabled={!canvasDomain || !accessToken || isConnecting}
                className="w-full py-3 px-6 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                {isConnecting ? 'Connecting...' : 'Connect Canvas'}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white text-neutral-500">or</span>
                </div>
              </div>

              <button
                onClick={handleDemoMode}
                className="w-full py-3 px-6 bg-gradient-to-r from-accent-purple to-accent-pink text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
              >
                Try Demo Mode
              </button>
              <p className="text-xs text-center text-neutral-500">
                Demo mode shows sample data without connecting to Canvas
              </p>
            </div>

            {/* Instructions */}
            <div className="mt-6 p-4 bg-primary-50 border border-primary-200 rounded-xl">
              <h4 className="font-semibold text-primary-900 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                How to get your Canvas token
              </h4>
              <ol className="text-sm text-primary-800 space-y-2 ml-1">
                <li>1. Log into your Canvas account</li>
                <li>2. Click "Account" → "Settings"</li>
                <li>3. Scroll to "Approved Integrations"</li>
                <li>4. Click "+ New Access Token"</li>
                <li>5. Set purpose: "Focus Flow"</li>
                <li>6. Copy the generated token</li>
                <li>7. Paste it above and click Connect</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Demo Mode Badge */}
            {canvasService.isDemoMode() && (
              <div className="p-3 bg-gradient-to-r from-accent-purple/10 to-accent-pink/10 border border-accent-purple/30 rounded-xl">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-accent-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-sm font-semibold text-accent-purple">Demo Mode Active</span>
                </div>
                <p className="text-xs text-purple-700 mt-1">
                  Showing sample data. Connect real Canvas for live sync.
                </p>
              </div>
            )}

            {userData && (
              <div className="p-4 bg-neutral-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center text-white font-bold text-lg">
                    {userData.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <div className="font-semibold text-neutral-900">{userData.name}</div>
                    <div className="text-sm text-neutral-600">{userData.email || userData.login_id}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={async () => {
                  try {
                    const assignments = await canvasService.getAllAssignments()
                    alert(`Synced ${assignments.length} assignments from Canvas!`)
                  } catch (error) {
                    alert('Sync failed. Please try again.')
                  }
                }}
                className="py-2 px-4 bg-primary-500 text-white font-medium text-sm rounded-xl hover:bg-primary-600 transition-all active:scale-95"
              >
                Sync Now
              </button>
              <button
                onClick={handleDisconnect}
                className="py-2 px-4 bg-neutral-100 text-neutral-700 font-medium text-sm rounded-xl hover:bg-neutral-200 transition-all active:scale-95"
              >
                Disconnect
              </button>
            </div>

            <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-green-800">
                  Your Canvas assignments and grades will sync automatically every hour
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Other Settings */}
      <div className="bg-white rounded-2xl p-6 shadow-soft border border-neutral-100">
        <h3 className="font-bold text-neutral-900 mb-4">Preferences</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-neutral-900">AI Study Suggestions</div>
              <div className="text-sm text-neutral-500">Get personalized study recommendations</div>
            </div>
            <button className="w-12 h-7 bg-primary-500 rounded-full relative transition-all">
              <div className="absolute right-1 top-1 w-5 h-5 bg-white rounded-full shadow-md"></div>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-neutral-900">Due Date Reminders</div>
              <div className="text-sm text-neutral-500">Notifications for upcoming deadlines</div>
            </div>
            <button className="w-12 h-7 bg-primary-500 rounded-full relative transition-all">
              <div className="absolute right-1 top-1 w-5 h-5 bg-white rounded-full shadow-md"></div>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-neutral-900">Focus Mode</div>
              <div className="text-sm text-neutral-500">Block distracting apps during study</div>
            </div>
            <button className="w-12 h-7 bg-neutral-200 rounded-full relative transition-all">
              <div className="absolute left-1 top-1 w-5 h-5 bg-white rounded-full shadow-md"></div>
            </button>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="bg-white rounded-2xl p-6 shadow-soft border border-neutral-100">
        <h3 className="font-bold text-neutral-900 mb-4">About</h3>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-600">Version</span>
            <span className="font-medium text-neutral-900">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-600">Tier</span>
            <span className="font-medium bg-gradient-to-r from-primary-600 to-accent-purple bg-clip-text text-transparent">
              Premium
            </span>
          </div>
        </div>

        <button className="w-full mt-4 py-2 px-4 border-2 border-primary-500 text-primary-600 font-semibold text-sm rounded-xl hover:bg-primary-50 transition-all active:scale-95">
          Upgrade to Ultra
        </button>
      </div>
    </div>
  )
}

export default Settings
