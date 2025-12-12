/**
 * Supabase Client Configuration
 * Singleton instance for Supabase database and auth with demo mode support
 */

import { createClient } from '@supabase/supabase-js'

// Check if we're in demo mode (missing env vars)
export const isDemoMode = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY

if (isDemoMode) {
  console.warn('⚠️ Running in DEMO MODE - Supabase not configured')
  console.warn('To enable full functionality, add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file')
}

// Mock Supabase client for demo mode
const createMockClient = () => {
  const mockAuth = {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    signUp: async () => ({ data: { user: null, session: null }, error: { message: 'Demo mode - auth disabled' } }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: 'Demo mode - auth disabled' } }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    resetPasswordForEmail: async () => ({ data: null, error: { message: 'Demo mode - auth disabled' } }),
    updateUser: async () => ({ data: { user: null }, error: { message: 'Demo mode - auth disabled' } })
  }

  const mockFrom = () => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: null, error: { code: 'PGRST116', message: 'Demo mode - no data' } }),
        limit: async () => ({ data: [], error: null })
      }),
      limit: async () => ({ data: [], error: null }),
      single: async () => ({ data: null, error: { code: 'PGRST116', message: 'Demo mode - no data' } })
    }),
    insert: () => ({
      select: () => ({
        single: async () => ({ data: null, error: { message: 'Demo mode - read only' } })
      })
    }),
    update: () => ({
      eq: () => ({
        select: () => ({
          single: async () => ({ data: null, error: { message: 'Demo mode - read only' } })
        })
      })
    }),
    delete: () => ({
      eq: async () => ({ data: null, error: { message: 'Demo mode - read only' } })
    })
  })

  return {
    auth: mockAuth,
    from: mockFrom
  }
}

// Create real or mock Supabase client
export const supabase = isDemoMode
  ? createMockClient()
  : createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    )

export default supabase
