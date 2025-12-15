import supabase from '../lib/supabase'
import authService from './authService'
import { BADGES } from '../data/badges'

/**
 * XP & Gamification Service
 * Handles XP calculation, level progression, and badge unlocks
 */
class XPService {
  /**
   * Calculate XP for assignment completion
   */
  calculateAssignmentXP(assignment) {
    const BASE_XP = 100
    const PRIORITY_BONUS = { high: 50, medium: 25, low: 0 }
    const ON_TIME_BONUS = 25

    let xp = BASE_XP + (PRIORITY_BONUS[assignment.priority] || 0)

    // Check if completed before due date
    if (assignment.dueDate && assignment.completed) {
      const dueDate = new Date(assignment.dueDate)
      const completedDate = new Date()
      if (completedDate <= dueDate) {
        xp += ON_TIME_BONUS
      }
    }

    return xp
  }

  /**
   * Calculate XP for focus session
   */
  calculateFocusXP(durationMinutes) {
    const XP_PER_15_MIN = 25
    const MAX_XP = 200

    const blocks = Math.floor(durationMinutes / 15)
    return Math.min(blocks * XP_PER_15_MIN, MAX_XP)
  }

  /**
   * Calculate XP for streak bonus
   */
  calculateStreakXP(currentStreak) {
    const BASE_XP = 10
    const MAX_MULTIPLIER = 7

    const multiplier = Math.min(currentStreak, MAX_MULTIPLIER)
    return BASE_XP * multiplier
  }

  /**
   * Calculate XP for flashcard study
   */
  calculateFlashcardXP(cardsStudied, masteredCount = 0) {
    const XP_PER_CARD = 5
    const MASTERY_BONUS = 10

    return (cardsStudied * XP_PER_CARD) + (masteredCount * MASTERY_BONUS)
  }

  /**
   * Get XP required for a specific level
   */
  getXPForLevel(level) {
    if (level <= 1) return 0

    if (level <= 10) {
      // Early game: Exponential growth
      return Math.floor(100 * Math.pow(level, 1.5))
    } else if (level <= 25) {
      // Mid game: Linear growth (+500 per level)
      const base = this.getXPForLevel(10)
      return base + (level - 10) * 500
    } else {
      // Late game: Linear with higher increments (+1000 per level)
      const base = this.getXPForLevel(25)
      return base + (level - 25) * 1000
    }
  }

  /**
   * Calculate level from total XP
   */
  calculateLevel(totalXP) {
    let level = 1
    while (this.getXPForLevel(level + 1) <= totalXP) {
      level++
    }
    return level
  }

  /**
   * Get level title based on level
   */
  getLevelTitle(level) {
    if (level <= 5) return 'Freshman'
    if (level <= 10) return 'Sophomore'
    if (level <= 15) return 'Junior'
    if (level <= 20) return 'Senior'
    if (level <= 30) return 'Graduate'
    if (level <= 40) return 'Scholar'
    if (level <= 50) return 'Master'
    return 'Legend'
  }

  /**
   * Main method to award XP
   */
  async awardXP(actionType, details = {}) {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        console.error('Cannot award XP: User not logged in')
        return null
      }

      // Calculate XP based on action type
      let xpAmount = 0
      switch (actionType) {
        case 'assignment_complete':
          xpAmount = this.calculateAssignmentXP(details.assignment)
          break
        case 'focus_session':
          xpAmount = this.calculateFocusXP(details.durationMinutes)
          break
        case 'streak_bonus':
          xpAmount = this.calculateStreakXP(details.currentStreak)
          break
        case 'flashcard_study':
          xpAmount = this.calculateFlashcardXP(details.cardsStudied, details.masteredCount)
          break
        case 'daily_login':
          xpAmount = 15
          break
        case 'achievement_unlocked':
          xpAmount = details.xpReward || 50
          break
        default:
          console.error(`Unknown action type: ${actionType}`)
          return null
      }

      if (xpAmount <= 0) {
        return null
      }

      // Get current XP and level
      const currentData = await this.getXPData()
      const oldLevel = currentData.level

      // Use RPC function to increment XP atomically
      const { data: newTotalXP, error: rpcError } = await supabase
        .rpc('increment_user_xp', {
          user_uuid: userId,
          xp_to_add: xpAmount
        })

      if (rpcError) {
        console.error('Error incrementing XP:', rpcError)
        return null
      }

      // Calculate new level
      const newLevel = this.calculateLevel(newTotalXP)
      const leveledUp = newLevel > oldLevel

      // Update level if changed
      if (leveledUp) {
        const { error: levelError } = await supabase
          .from('user_profiles')
          .update({ current_level: newLevel })
          .eq('id', userId)

        if (levelError) {
          console.error('Error updating level:', levelError)
        }
      }

      // Log XP transaction
      const { error: transactionError } = await supabase
        .from('xp_transactions')
        .insert({
          user_id: userId,
          xp_amount: xpAmount,
          action_type: actionType,
          action_details: details
        })

      if (transactionError) {
        console.error('Error logging XP transaction:', transactionError)
      }

      // Check for new badge unlocks
      await this.checkAndAwardBadges()

      return {
        xpAwarded: xpAmount,
        newTotalXP,
        newLevel,
        leveledUp,
        oldLevel
      }
    } catch (error) {
      console.error('Error awarding XP:', error)
      return null
    }
  }

  /**
   * Get user's XP data for UI
   */
  async getXPData() {
    try {
      const userId = authService.getUserId()
      if (!userId) return null

      const { data, error } = await supabase
        .from('user_profiles')
        .select('total_xp, current_level')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching XP data:', error)
        return null
      }

      const totalXP = data.total_xp || 0
      const level = data.current_level || 1
      const xpForCurrentLevel = this.getXPForLevel(level)
      const xpForNextLevel = this.getXPForLevel(level + 1)
      const xpToNext = xpForNextLevel - totalXP
      const xpInCurrentLevel = totalXP - xpForCurrentLevel
      const xpNeededForCurrentLevel = xpForNextLevel - xpForCurrentLevel
      const progressPercent = Math.round((xpInCurrentLevel / xpNeededForCurrentLevel) * 100)

      return {
        totalXP,
        level,
        levelTitle: this.getLevelTitle(level),
        xpToNext,
        progressPercent,
        xpForCurrentLevel,
        xpForNextLevel
      }
    } catch (error) {
      console.error('Error getting XP data:', error)
      return null
    }
  }

  /**
   * Check and award new badges
   */
  async checkAndAwardBadges() {
    try {
      const userId = authService.getUserId()
      if (!userId) return

      // Get user's current badges
      const { data: currentBadges } = await supabase
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', userId)

      const currentBadgeIds = new Set(currentBadges?.map(b => b.badge_id) || [])

      // Get user stats for badge condition checking
      const stats = await this.getUserStatsForBadges()

      // Check each badge
      const newBadges = []
      for (const [badgeId, badge] of Object.entries(BADGES)) {
        if (currentBadgeIds.has(badgeId)) continue // Already unlocked

        if (badge.condition(stats)) {
          newBadges.push({
            user_id: userId,
            badge_id: badgeId
          })
        }
      }

      // Insert new badges
      if (newBadges.length > 0) {
        const { error } = await supabase
          .from('user_badges')
          .insert(newBadges)

        if (error) {
          console.error('Error awarding badges:', error)
        } else {
          // Award XP for each new badge
          for (const newBadge of newBadges) {
            const badge = BADGES[newBadge.badge_id]
            if (badge.xpReward) {
              await this.awardXP('achievement_unlocked', {
                badgeId: newBadge.badge_id,
                xpReward: badge.xpReward
              })
            }
          }
        }
      }

      return newBadges
    } catch (error) {
      console.error('Error checking badges:', error)
      return []
    }
  }

  /**
   * Get user stats for badge unlock conditions
   */
  async getUserStatsForBadges() {
    const userId = authService.getUserId()
    if (!userId) return {}

    try {
      // Get current streak
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('current_streak, current_level, total_xp')
        .eq('id', userId)
        .single()

      // Get total assignments completed
      const { count: totalAssignmentsCompleted } = await supabase
        .from('assignments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('completed', true)

      // Get total focus sessions
      const { count: totalFocusSessions } = await supabase
        .from('blocking_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      // Get total focus hours
      const { data: focusSessions } = await supabase
        .from('blocking_sessions')
        .select('duration_minutes')
        .eq('user_id', userId)

      const totalFocusHours = (focusSessions || []).reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / 60

      // Get flashcards mastered (placeholder - would need to track this)
      const flashcardsMastered = 0 // TODO: Track flashcard mastery

      return {
        currentStreak: profile?.current_streak || 0,
        level: profile?.current_level || 1,
        totalXP: profile?.total_xp || 0,
        totalAssignmentsCompleted: totalAssignmentsCompleted || 0,
        totalFocusSessions: totalFocusSessions || 0,
        totalFocusHours: Math.round(totalFocusHours),
        flashcardsMastered
      }
    } catch (error) {
      console.error('Error getting user stats:', error)
      return {}
    }
  }

  /**
   * Get user's unlocked badges
   */
  async getUserBadges() {
    try {
      const userId = authService.getUserId()
      if (!userId) return []

      const { data, error } = await supabase
        .from('user_badges')
        .select('badge_id, unlocked_at')
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false })

      if (error) {
        console.error('Error fetching badges:', error)
        return []
      }

      return data.map(b => ({
        ...BADGES[b.badge_id],
        unlockedAt: b.unlocked_at
      }))
    } catch (error) {
      console.error('Error getting badges:', error)
      return []
    }
  }

  /**
   * Get XP history (last N days)
   */
  async getXPHistory(days = 30) {
    try {
      const userId = authService.getUserId()
      if (!userId) return []

      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data, error } = await supabase
        .from('xp_transactions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching XP history:', error)
        return []
      }

      return data
    } catch (error) {
      console.error('Error getting XP history:', error)
      return []
    }
  }
}

const xpService = new XPService()
export default xpService
