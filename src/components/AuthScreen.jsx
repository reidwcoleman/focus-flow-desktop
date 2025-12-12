/**
 * Auth Screen Component
 * Handles user sign up and sign in
 */

import { useState } from 'react'
import authService from '../services/authService'

const AuthScreen = ({ onAuthSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showCanvasSetup, setShowCanvasSetup] = useState(false)
  const [canvasUrl, setCanvasUrl] = useState('')
  const [canvasToken, setCanvasToken] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    console.log('🔐 Auth attempt:', { isSignUp, email, hasPassword: !!password })

    // Validate inputs
    if (!email || !email.trim()) {
      setError('Email is required')
      setLoading(false)
      return
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      let result
      if (isSignUp) {
        console.log('📝 Signing up...')
        // Prepare profile data for signup
        const profileData = {
          full_name: fullName.trim() || null,
          canvas_url: canvasUrl.trim() || null,
          canvas_token: canvasToken.trim() || null,
        }
        result = await authService.signUp(email.trim(), password, profileData)
      } else {
        console.log('🔑 Signing in...')
        result = await authService.signIn(email.trim(), password)
      }

      console.log('📊 Auth result:', { success: !result.error, error: result.error?.message })

      if (result.error) {
        setError(result.error.message || 'Authentication failed')
      } else {
        // Success!
        console.log('✅ Auth successful!')
        if (onAuthSuccess) {
          onAuthSuccess(result.user)
        }
      }
    } catch (err) {
      console.error('❌ Auth exception:', err)
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-bg-primary via-dark-navy to-dark-navy-light flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-dark-bg-secondary rounded-3xl shadow-2xl border border-dark-border-glow p-8 animate-fadeInUp">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-cyan flex items-center justify-center shadow-glow-cyan">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-dark-text-primary mb-2">Focus Flow AI</h1>
          <p className="text-dark-text-secondary">AI-powered study companion</p>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name Input - Only for Sign Up */}
          {isSignUp && (
            <div>
              <label className="block text-dark-text-primary text-sm font-semibold mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="John Doe"
                className="w-full px-4 py-3 rounded-xl bg-dark-bg-tertiary border border-dark-border-glow text-dark-text-primary placeholder:text-dark-text-muted focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              />
            </div>
          )}

          {/* Email Input */}
          <div>
            <label className="block text-dark-text-primary text-sm font-semibold mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full px-4 py-3 rounded-xl bg-dark-bg-tertiary border border-dark-border-glow text-dark-text-primary placeholder:text-dark-text-muted focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
            />
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-dark-text-primary text-sm font-semibold mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                className="w-full px-4 py-3 pr-12 rounded-xl bg-dark-bg-tertiary border border-dark-border-glow text-dark-text-primary placeholder:text-dark-text-muted focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-text-muted hover:text-dark-text-primary transition-colors"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-dark-text-muted">At least 6 characters</p>
          </div>

          {/* Canvas Integration Toggle - Only for Sign Up */}
          {isSignUp && (
            <div className="border-t border-dark-border-glow pt-4">
              <button
                type="button"
                onClick={() => setShowCanvasSetup(!showCanvasSetup)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-dark-bg-tertiary border border-dark-border-glow hover:border-primary-500/50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-accent-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <div className="text-left">
                    <p className="text-dark-text-primary font-semibold text-sm">Canvas LMS Integration</p>
                    <p className="text-dark-text-muted text-xs">Optional - Set up later</p>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-dark-text-muted transition-transform ${showCanvasSetup ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Canvas Setup Fields */}
              {showCanvasSetup && (
                <div className="mt-3 space-y-3 animate-fadeIn">
                  <div>
                    <label className="block text-dark-text-primary text-sm font-semibold mb-2">
                      Canvas URL
                    </label>
                    <input
                      type="url"
                      value={canvasUrl}
                      onChange={(e) => setCanvasUrl(e.target.value)}
                      placeholder="https://your-school.instructure.com"
                      className="w-full px-4 py-3 rounded-xl bg-dark-bg-tertiary border border-dark-border-glow text-dark-text-primary placeholder:text-dark-text-muted focus:outline-none focus:border-accent-purple focus:ring-2 focus:ring-accent-purple/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-dark-text-primary text-sm font-semibold mb-2">
                      Canvas Access Token
                    </label>
                    <input
                      type="password"
                      value={canvasToken}
                      onChange={(e) => setCanvasToken(e.target.value)}
                      placeholder="Your Canvas API token"
                      className="w-full px-4 py-3 rounded-xl bg-dark-bg-tertiary border border-dark-border-glow text-dark-text-primary placeholder:text-dark-text-muted focus:outline-none focus:border-accent-purple focus:ring-2 focus:ring-accent-purple/20 transition-all"
                    />
                    <p className="text-xs text-dark-text-muted mt-2">
                      Generate a token from your Canvas Account Settings → Approved Integrations
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-red-900/20 border border-red-700/40 animate-fadeIn">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 bg-gradient-to-r from-primary-500 to-accent-cyan text-white font-bold rounded-xl shadow-soft-lg hover:shadow-glow-cyan transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>{isSignUp ? 'Creating account...' : 'Signing in...'}</span>
              </div>
            ) : (
              isSignUp ? 'Create Account' : 'Sign In'
            )}
          </button>
        </form>

        {/* Toggle Sign Up / Sign In */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError(null)
            }}
            className="text-primary-500 hover:text-primary-400 font-semibold transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
          </button>
        </div>

        {/* Info */}
        {isSignUp && (
          <div className="mt-6 p-4 rounded-xl bg-primary-500/10 border border-primary-500/30">
            <p className="text-primary-400 text-sm text-center">
              📧 You'll receive a confirmation email after signing up
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AuthScreen
