/**
 * App Blocking Service - Complete Focus Mode System
 * Manages blocking sessions, lists, and schedules
 */

import supabase from '../lib/supabase'

class AppBlockingService {
  // ========================================
  // BLOCKING SESSIONS
  // ========================================

  async getBlockingSessions() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('blocking_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Failed to get blocking sessions:', error)
      return []
    }
  }

  async getActiveSession() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const now = new Date().toISOString()

      const { data, error } = await supabase
        .from('blocking_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .gt('end_time', now)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data || null
    } catch (error) {
      console.error('Failed to get active session:', error)
      return null
    }
  }

  async createSession(sessionData) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { blockedApps, duration, customEndTime, blockingListId, sessionType } = sessionData

      const startTime = new Date()
      const endTime = customEndTime || new Date(startTime.getTime() + duration * 60 * 1000)

      const sessionPayload = {
        user_id: user.id,
        blocking_list_id: blockingListId || null,
        blocked_apps: blockedApps,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: duration,
        session_type: sessionType || 'manual',
        is_active: true,
      }

      console.log('📝 Creating session with payload:', sessionPayload)

      const { data, error } = await supabase
        .from('blocking_sessions')
        .insert(sessionPayload)
        .select()
        .single()

      if (error) {
        console.error('❌ Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        })
        throw error
      }

      // Increment usage count if using a blocking list
      if (blockingListId) {
        await this.incrementListUsage(blockingListId)
      }

      console.log('✅ Created blocking session:', data)
      return data
    } catch (error) {
      console.error('❌ Failed to create session:', error)

      // Check if table exists
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        throw new Error('Database table missing! Please run COMPLETE_DATABASE_MIGRATION.sql in Supabase')
      }

      throw error
    }
  }

  async endSession(sessionId) {
    try {
      const { data, error } = await supabase
        .from('blocking_sessions')
        .update({
          is_active: false,
          actual_end_time: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .select()
        .single()

      if (error) throw error

      console.log('✅ Ended blocking session:', data)
      return data
    } catch (error) {
      console.error('❌ Failed to end session:', error)
      throw error
    }
  }

  async getStats() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: sessions, error } = await supabase
        .from('blocking_sessions')
        .select('*')
        .eq('user_id', user.id)

      if (error) throw error

      const totalSessions = sessions.length
      const completedSessions = sessions.filter(s => !s.is_active).length
      const totalMinutesBlocked = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
      const mostBlockedApps = this.getMostBlockedApps(sessions)

      return {
        totalSessions,
        completedSessions,
        totalMinutesBlocked,
        totalHoursBlocked: Math.floor(totalMinutesBlocked / 60),
        mostBlockedApps,
      }
    } catch (error) {
      console.error('Failed to get stats:', error)
      return {
        totalSessions: 0,
        completedSessions: 0,
        totalMinutesBlocked: 0,
        totalHoursBlocked: 0,
        mostBlockedApps: [],
      }
    }
  }

  getMostBlockedApps(sessions) {
    const appCounts = {}

    sessions.forEach(session => {
      session.blocked_apps.forEach(app => {
        appCounts[app] = (appCounts[app] || 0) + 1
      })
    })

    return Object.entries(appCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([app, count]) => ({ app, count }))
  }

  // ========================================
  // BLOCKING LISTS
  // ========================================

  async getBlockingLists() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('blocking_lists')
        .select('*')
        .eq('user_id', user.id)
        .order('usage_count', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Failed to get blocking lists:', error)
      return []
    }
  }

  async createBlockingList(listData) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { name, description, appIds, icon, color, isDefault } = listData

      const { data, error } = await supabase
        .from('blocking_lists')
        .insert({
          user_id: user.id,
          name,
          description: description || null,
          app_ids: appIds,
          icon: icon || '🎯',
          color: color || '#3B82F6',
          is_default: isDefault || false,
        })
        .select()
        .single()

      if (error) throw error

      console.log('✅ Created blocking list:', data)
      return data
    } catch (error) {
      console.error('❌ Failed to create blocking list:', error)
      throw error
    }
  }

  async updateBlockingList(listId, updates) {
    try {
      const { data, error } = await supabase
        .from('blocking_lists')
        .update(updates)
        .eq('id', listId)
        .select()
        .single()

      if (error) throw error

      console.log('✅ Updated blocking list:', data)
      return data
    } catch (error) {
      console.error('❌ Failed to update blocking list:', error)
      throw error
    }
  }

  async deleteBlockingList(listId) {
    try {
      const { error } = await supabase
        .from('blocking_lists')
        .delete()
        .eq('id', listId)

      if (error) throw error

      console.log('✅ Deleted blocking list')
      return true
    } catch (error) {
      console.error('❌ Failed to delete blocking list:', error)
      throw error
    }
  }

  async incrementListUsage(listId) {
    try {
      const { error } = await supabase.rpc('increment', {
        table_name: 'blocking_lists',
        row_id: listId,
        column_name: 'usage_count',
      })

      if (error) {
        // Fallback if RPC doesn't exist
        const { data: list } = await supabase
          .from('blocking_lists')
          .select('usage_count')
          .eq('id', listId)
          .single()

        if (list) {
          await supabase
            .from('blocking_lists')
            .update({ usage_count: (list.usage_count || 0) + 1 })
            .eq('id', listId)
        }
      }
    } catch (error) {
      console.error('Failed to increment usage:', error)
    }
  }

  // ========================================
  // SCHEDULED BLOCKS
  // ========================================

  async getScheduledBlocks() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('scheduled_blocks')
        .select(`
          *,
          blocking_list:blocking_lists(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Failed to get scheduled blocks:', error)
      return []
    }
  }

  async createScheduledBlock(scheduleData) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { name, blockingListId, scheduleType, startTime, endTime, daysOfWeek, startDate, isEnabled } = scheduleData

      const { data, error } = await supabase
        .from('scheduled_blocks')
        .insert({
          user_id: user.id,
          blocking_list_id: blockingListId,
          name,
          schedule_type: scheduleType,
          start_time: startTime,
          end_time: endTime,
          days_of_week: daysOfWeek || null,
          start_date: startDate || null,
          is_enabled: isEnabled !== undefined ? isEnabled : true,
        })
        .select()
        .single()

      if (error) throw error

      console.log('✅ Created scheduled block:', data)
      return data
    } catch (error) {
      console.error('❌ Failed to create scheduled block:', error)
      throw error
    }
  }

  async updateScheduledBlock(scheduleId, updates) {
    try {
      const { data, error } = await supabase
        .from('scheduled_blocks')
        .update(updates)
        .eq('id', scheduleId)
        .select()
        .single()

      if (error) throw error

      console.log('✅ Updated scheduled block:', data)
      return data
    } catch (error) {
      console.error('❌ Failed to update scheduled block:', error)
      throw error
    }
  }

  async deleteScheduledBlock(scheduleId) {
    try {
      const { error } = await supabase
        .from('scheduled_blocks')
        .delete()
        .eq('id', scheduleId)

      if (error) throw error

      console.log('✅ Deleted scheduled block')
      return true
    } catch (error) {
      console.error('❌ Failed to delete scheduled block:', error)
      throw error
    }
  }

  async toggleScheduledBlock(scheduleId, isEnabled) {
    return this.updateScheduledBlock(scheduleId, { is_enabled: isEnabled })
  }

  // ========================================
  // UTILITIES
  // ========================================

  generateShortcutURL(apps, minutes) {
    const params = new URLSearchParams({
      apps: apps.join(','),
      duration: minutes,
      action: 'block',
    })

    return `shortcuts://run-shortcut?name=FocusFlowBlock&input=${encodeURIComponent(params.toString())}`
  }
}

export default new AppBlockingService()
