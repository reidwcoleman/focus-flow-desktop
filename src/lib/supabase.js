/**
 * Supabase Client Configuration
 * Singleton instance for Supabase database and auth
 */

import { createClient } from '@supabase/supabase-js'

// Supabase credentials - safe to expose publicly (protected by RLS)
const supabaseUrl = 'https://uhlgppoylqeiirpfhhqm.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobGdwcG95bHFlaWlycGZoaHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMDI4OTEsImV4cCI6MjA4MDg3ODg5MX0.DCW8hcNJ-6Aq_nxt05IU6ogOb69V-oqUNnNhnKiaSvw'

export const isDemoMode = false

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

export default supabase
