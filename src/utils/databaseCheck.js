/**
 * Database Diagnostic Utility
 * Checks if all required tables exist in Supabase
 */

import supabase from '../lib/supabase'

export const checkDatabaseTables = async () => {
  const tables = [
    'assignments',
    'calendar_activities',
    'study_sessions',
    'blocking_sessions',
    'blocking_lists',
    'scheduled_blocks',
    'streak_history',
  ]

  const results = {}

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .limit(1)

      if (error) {
        results[table] = {
          exists: false,
          error: error.message,
          code: error.code,
        }
      } else {
        results[table] = {
          exists: true,
          error: null,
        }
      }
    } catch (err) {
      results[table] = {
        exists: false,
        error: err.message,
      }
    }
  }

  return results
}

export const printDatabaseStatus = async () => {
  console.log('🔍 Checking database tables...')
  const results = await checkDatabaseTables()

  console.table(results)

  const missingTables = Object.entries(results)
    .filter(([_, status]) => !status.exists)
    .map(([table]) => table)

  if (missingTables.length > 0) {
    console.error('❌ Missing tables:', missingTables)
    console.error('👉 Please run COMPLETE_DATABASE_MIGRATION_V3.sql in Supabase!')
    console.error('👉 URL: https://supabase.com/dashboard/project/uhlgppoylqeiirpfhhqm/sql')
    return false
  } else {
    console.log('✅ All tables exist!')
    console.log('🔥 Streak calendar will now show your real login history!')
    return true
  }
}
