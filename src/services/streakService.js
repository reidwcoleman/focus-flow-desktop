/**
 * Streak Service - Track daily login streaks
 */

import supabase from '../lib/supabase'

class StreakService {
  /**
   * Check and update user's login streak
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated streak data
   */
  async checkAndUpdateStreak(userId) {
    try {
      // Get current profile with streak data
      const { data: profile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('current_streak, longest_streak, last_login_date')
        .eq('id', userId)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError
      }

      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

      // If no profile exists yet, create with initial streak
      if (!profile) {
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            id: userId,
            current_streak: 1,
            longest_streak: 1,
            last_login_date: today,
          })
          .select('current_streak, longest_streak, last_login_date')
          .single()

        if (createError) throw createError
        return {
          currentStreak: 1,
          longestStreak: 1,
          isNewStreak: true,
        }
      }

      // If last login was today, no change needed
      if (profile.last_login_date === today) {
        return {
          currentStreak: profile.current_streak || 0,
          longestStreak: profile.longest_streak || 0,
          isNewStreak: false,
        }
      }

      // Calculate if streak continues or breaks
      let newStreak = 1
      let isNewStreak = false

      if (profile.last_login_date) {
        const lastLoginDate = new Date(profile.last_login_date + 'T00:00:00')
        const todayDate = new Date(today + 'T00:00:00')
        const diffTime = todayDate - lastLoginDate
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays === 1) {
          // Consecutive day - increment streak
          newStreak = (profile.current_streak || 0) + 1
          isNewStreak = true
        } else {
          // Streak broken - reset to 1
          newStreak = 1
        }
      }

      // Update longest streak if current is higher
      const newLongestStreak = Math.max(newStreak, profile.longest_streak || 0)

      // Update profile with new streak data
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          current_streak: newStreak,
          longest_streak: newLongestStreak,
          last_login_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (updateError) throw updateError

      // Log today's login to streak_history
      await this.logLogin(userId, today)

      console.log('🔥 Streak updated:', {
        current: newStreak,
        longest: newLongestStreak,
        isNew: isNewStreak,
      })

      return {
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        isNewStreak,
      }
    } catch (error) {
      console.error('❌ Failed to update streak:', error)
      // Return defaults on error - don't break the app
      return {
        currentStreak: 0,
        longestStreak: 0,
        isNewStreak: false,
      }
    }
  }

  /**
   * Get current streak data for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Streak data
   */
  async getStreak(userId) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('current_streak, longest_streak, last_login_date')
        .eq('id', userId)
        .single()

      if (error) throw error

      return {
        currentStreak: data?.current_streak || 0,
        longestStreak: data?.longest_streak || 0,
        lastLoginDate: data?.last_login_date,
      }
    } catch (error) {
      console.error('Failed to get streak:', error)
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastLoginDate: null,
      }
    }
  }

  /**
   * Log today's login to streak_history
   * @param {string} userId - User ID
   * @param {string} date - Date string (YYYY-MM-DD)
   */
  async logLogin(userId, date) {
    try {
      // Use upsert to avoid duplicate entries
      const { error } = await supabase
        .from('streak_history')
        .upsert(
          {
            user_id: userId,
            login_date: date,
            created_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,login_date',
            ignoreDuplicates: true,
          }
        )

      if (error && error.code !== '23505') {
        // Ignore unique constraint violations (23505)
        console.error('Failed to log login:', error)
      }
    } catch (error) {
      console.error('Failed to log login:', error)
    }
  }

  /**
   * Get streak history for a user (last 90 days)
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of login dates
   */
  async getStreakHistory(userId) {
    try {
      // Get last 90 days of history
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
      const startDate = ninetyDaysAgo.toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('streak_history')
        .select('login_date')
        .eq('user_id', userId)
        .gte('login_date', startDate)
        .order('login_date', { ascending: true })

      if (error) throw error

      // Return array of date strings
      return data.map(row => row.login_date)
    } catch (error) {
      console.error('Failed to get streak history:', error)
      return []
    }
  }
}

export default new StreakService()
