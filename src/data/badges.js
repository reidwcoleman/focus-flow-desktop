/**
 * Badge Definitions for FocusFlow Gamification System
 * Each badge has unlock conditions based on user stats
 */

export const BADGES = {
  // ========================================
  // Streak Achievements
  // ========================================
  streak_3: {
    id: 'streak_3',
    name: 'Getting Started',
    description: 'Maintain a 3-day streak',
    icon: '🔥',
    tier: 'bronze',
    xpReward: 50,
    condition: (stats) => stats.currentStreak >= 3
  },
  streak_7: {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '🔥',
    tier: 'silver',
    xpReward: 100,
    condition: (stats) => stats.currentStreak >= 7
  },
  streak_14: {
    id: 'streak_14',
    name: 'Two Week Champion',
    description: 'Maintain a 14-day streak',
    icon: '🔥',
    tier: 'silver',
    xpReward: 200,
    condition: (stats) => stats.currentStreak >= 14
  },
  streak_30: {
    id: 'streak_30',
    name: 'Monthly Master',
    description: 'Maintain a 30-day streak',
    icon: '🔥',
    tier: 'gold',
    xpReward: 500,
    condition: (stats) => stats.currentStreak >= 30
  },
  streak_100: {
    id: 'streak_100',
    name: 'Centurion',
    description: 'Maintain a 100-day streak',
    icon: '🔥',
    tier: 'platinum',
    xpReward: 1000,
    condition: (stats) => stats.currentStreak >= 100
  },

  // ========================================
  // Assignment Achievements
  // ========================================
  first_assignment: {
    id: 'first_assignment',
    name: 'First Steps',
    description: 'Complete your first assignment',
    icon: '📝',
    tier: 'bronze',
    xpReward: 50,
    condition: (stats) => stats.totalAssignmentsCompleted >= 1
  },
  assignments_10: {
    id: 'assignments_10',
    name: 'Task Master',
    description: 'Complete 10 assignments',
    icon: '📝',
    tier: 'silver',
    xpReward: 150,
    condition: (stats) => stats.totalAssignmentsCompleted >= 10
  },
  assignments_25: {
    id: 'assignments_25',
    name: 'Productive Student',
    description: 'Complete 25 assignments',
    icon: '📝',
    tier: 'silver',
    xpReward: 250,
    condition: (stats) => stats.totalAssignmentsCompleted >= 25
  },
  assignments_50: {
    id: 'assignments_50',
    name: 'Assignment Ace',
    description: 'Complete 50 assignments',
    icon: '📝',
    tier: 'gold',
    xpReward: 300,
    condition: (stats) => stats.totalAssignmentsCompleted >= 50
  },
  assignments_100: {
    id: 'assignments_100',
    name: 'Completion Legend',
    description: 'Complete 100 assignments',
    icon: '📝',
    tier: 'platinum',
    xpReward: 500,
    condition: (stats) => stats.totalAssignmentsCompleted >= 100
  },

  // ========================================
  // Focus Session Achievements
  // ========================================
  first_focus: {
    id: 'first_focus',
    name: 'Focus Initiate',
    description: 'Complete your first focus session',
    icon: '🎯',
    tier: 'bronze',
    xpReward: 50,
    condition: (stats) => stats.totalFocusSessions >= 1
  },
  focus_sessions_10: {
    id: 'focus_sessions_10',
    name: 'Concentration Starter',
    description: 'Complete 10 focus sessions',
    icon: '🎯',
    tier: 'bronze',
    xpReward: 100,
    condition: (stats) => stats.totalFocusSessions >= 10
  },
  focus_hours_10: {
    id: 'focus_hours_10',
    name: 'Deep Worker',
    description: 'Spend 10 hours in focus mode',
    icon: '🎯',
    tier: 'silver',
    xpReward: 200,
    condition: (stats) => stats.totalFocusHours >= 10
  },
  focus_hours_25: {
    id: 'focus_hours_25',
    name: 'Flow State Practitioner',
    description: 'Spend 25 hours in focus mode',
    icon: '🎯',
    tier: 'silver',
    xpReward: 300,
    condition: (stats) => stats.totalFocusHours >= 25
  },
  focus_hours_50: {
    id: 'focus_hours_50',
    name: 'Flow State Master',
    description: 'Spend 50 hours in focus mode',
    icon: '🎯',
    tier: 'gold',
    xpReward: 500,
    condition: (stats) => stats.totalFocusHours >= 50
  },
  focus_hours_100: {
    id: 'focus_hours_100',
    name: 'Zen Master',
    description: 'Spend 100 hours in focus mode',
    icon: '🎯',
    tier: 'platinum',
    xpReward: 1000,
    condition: (stats) => stats.totalFocusHours >= 100
  },

  // ========================================
  // Flashcard Achievements
  // ========================================
  flashcards_mastered_25: {
    id: 'flashcards_mastered_25',
    name: 'Quick Learner',
    description: 'Master 25 flashcards',
    icon: '🃏',
    tier: 'bronze',
    xpReward: 75,
    condition: (stats) => stats.flashcardsMastered >= 25
  },
  flashcards_mastered_100: {
    id: 'flashcards_mastered_100',
    name: 'Memory Champion',
    description: 'Master 100 flashcards',
    icon: '🃏',
    tier: 'silver',
    xpReward: 200,
    condition: (stats) => stats.flashcardsMastered >= 100
  },
  flashcards_mastered_500: {
    id: 'flashcards_mastered_500',
    name: 'Knowledge Vault',
    description: 'Master 500 flashcards',
    icon: '🃏',
    tier: 'gold',
    xpReward: 500,
    condition: (stats) => stats.flashcardsMastered >= 500
  },

  // ========================================
  // Level Achievements
  // ========================================
  level_5: {
    id: 'level_5',
    name: 'Climbing Up',
    description: 'Reach Level 5',
    icon: '⭐',
    tier: 'bronze',
    xpReward: 100,
    condition: (stats) => stats.level >= 5
  },
  level_10: {
    id: 'level_10',
    name: 'Rising Star',
    description: 'Reach Level 10',
    icon: '⭐',
    tier: 'silver',
    xpReward: 250,
    condition: (stats) => stats.level >= 10
  },
  level_25: {
    id: 'level_25',
    name: 'Elite Student',
    description: 'Reach Level 25',
    icon: '🌟',
    tier: 'gold',
    xpReward: 500,
    condition: (stats) => stats.level >= 25
  },
  level_50: {
    id: 'level_50',
    name: 'Legendary Scholar',
    description: 'Reach Level 50',
    icon: '🌟',
    tier: 'platinum',
    xpReward: 1000,
    condition: (stats) => stats.level >= 50
  },

  // ========================================
  // XP Milestones
  // ========================================
  xp_1000: {
    id: 'xp_1000',
    name: 'XP Collector',
    description: 'Earn 1,000 total XP',
    icon: '💎',
    tier: 'bronze',
    xpReward: 100,
    condition: (stats) => stats.totalXP >= 1000
  },
  xp_5000: {
    id: 'xp_5000',
    name: 'XP Hoarder',
    description: 'Earn 5,000 total XP',
    icon: '💎',
    tier: 'silver',
    xpReward: 250,
    condition: (stats) => stats.totalXP >= 5000
  },
  xp_10000: {
    id: 'xp_10000',
    name: 'XP Magnate',
    description: 'Earn 10,000 total XP',
    icon: '💎',
    tier: 'gold',
    xpReward: 500,
    condition: (stats) => stats.totalXP >= 10000
  },
  xp_25000: {
    id: 'xp_25000',
    name: 'XP Emperor',
    description: 'Earn 25,000 total XP',
    icon: '💎',
    tier: 'platinum',
    xpReward: 1000,
    condition: (stats) => stats.totalXP >= 25000
  }
}

export const BADGE_TIERS = {
  bronze: {
    color: '#CD7F32',
    bgColor: 'bg-amber-900/20',
    borderColor: 'border-amber-700/50',
    priority: 1
  },
  silver: {
    color: '#C0C0C0',
    bgColor: 'bg-gray-500/20',
    borderColor: 'border-gray-400/50',
    priority: 2
  },
  gold: {
    color: '#FFD700',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/50',
    priority: 3
  },
  platinum: {
    color: '#E5E4E2',
    bgColor: 'bg-cyan-500/20',
    borderColor: 'border-cyan-400/50',
    priority: 4
  }
}
