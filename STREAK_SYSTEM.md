# Streak System - Daily Login Tracking

## Summary

The streak system tracks consecutive days of app usage and resets if you miss a day. Now includes visual notifications when streaks break or continue.

## How It Works

### Daily Login Check

When you log in each day, the system:

1. **Checks your last login date**
2. **Calculates the gap** between last login and today
3. **Updates your streak** based on the gap

### Streak Logic

```javascript
const diffDays = Math.floor((today - lastLogin) / (24 * 60 * 60 * 1000))

if (diffDays === 0) {
  // Same day - no change
  return currentStreak
}

if (diffDays === 1) {
  // Consecutive day - streak continues! 🔥
  return currentStreak + 1
}

if (diffDays > 1) {
  // Missed a day - streak broken! 💔
  return 1 (reset)
}
```

## Scenarios

### ✅ Streak Continues

**Example:**
- Monday: Login (streak = 1)
- Tuesday: Login (streak = 2) ← Next day
- Wednesday: Login (streak = 3) ← Next day

**Result:** Toast notification: "🔥 Streak: 3 days!"

### ❌ Streak Breaks

**Example:**
- Monday: Login (streak = 5)
- Tuesday: *No login* ← Missed a day
- Wednesday: Login (streak = 1) ← Reset

**Result:** Toast notification: "Your streak was broken! Starting fresh today."

**Console log:**
```
💔 Streak broken! Missed 1 day(s). Old streak: 5, starting fresh.
```

### 📅 Multiple Days Missed

**Example:**
- Monday: Login (streak = 10)
- Tuesday-Friday: *No logins* ← Missed 4 days
- Saturday: Login (streak = 1) ← Reset

**Result:** Same as above, streak resets to 1

**Console log:**
```
💔 Streak broken! Missed 4 day(s). Old streak: 10, starting fresh.
```

## User Notifications

### Streak Broken (Warning)
- **Trigger:** `diffDays > 1` and had existing streak
- **Message:** "Your streak was broken! Starting fresh today."
- **Color:** Amber (warning)
- **Icon:** ⚠️

### Streak Continued (Success)
- **Trigger:** `diffDays === 1` and streak > 1
- **Message:** "🔥 Streak: X days!"
- **Color:** Green (success)
- **Icon:** ✓

### First Day / Same Day
- **Trigger:** `diffDays === 0` or first login
- **Message:** None (no spam)

## Data Tracked

### user_profiles table
```sql
{
  current_streak: 5,      -- Your current active streak
  longest_streak: 15,     -- Your all-time best
  last_login_date: '2025-12-18'  -- Last day you logged in
}
```

### streak_history table
```sql
{
  user_id: 'abc123',
  login_date: '2025-12-18',
  created_at: '2025-12-18T10:30:00Z'
}
```

## Console Logging

### Streak Continued
```
🔥 Streak continued! Day 7
🔥 Streak updated: { current: 7, longest: 15, isNew: true, broken: false }
```

### Streak Broken
```
💔 Streak broken! Missed 2 day(s). Old streak: 6, starting fresh.
🔥 Streak updated: { current: 1, longest: 15, isNew: false, broken: true }
```

## XP Rewards

### Daily Login
- **Trigger:** Every login (even if streak breaks)
- **XP:** Based on `daily_login` event in XP service

### Streak Bonus
- **Trigger:** When streak increases (not on breaks)
- **XP:** Based on `streak_bonus` event in XP service
- **Scales with streak:** Higher streaks = more bonus XP

## Technical Implementation

### streakService.js

```javascript
async checkAndUpdateStreak(userId) {
  // Get user's last login
  const profile = await getProfile(userId)

  // Calculate day difference
  const diffDays = calculateDayDiff(profile.last_login_date, today)

  // Update streak
  if (diffDays === 1) {
    newStreak = currentStreak + 1
    streakBroken = false
  } else if (diffDays > 1) {
    newStreak = 1
    streakBroken = true
  }

  // Save to database
  await updateProfile({
    current_streak: newStreak,
    longest_streak: max(newStreak, longest),
    last_login_date: today
  })

  // Award XP
  await awardDailyLoginXP()
  if (!streakBroken) await awardStreakBonusXP()

  return { currentStreak, longestStreak, isNewStreak, streakBroken }
}
```

### App.jsx

```javascript
// On login
const streakResult = await streakService.checkAndUpdateStreak(user.id)

// Show notifications
if (streakResult.streakBroken) {
  toast.warning('Your streak was broken! Starting fresh today.')
} else if (streakResult.isNewStreak && streakResult.currentStreak > 1) {
  toast.success(`🔥 Streak: ${streakResult.currentStreak} days!`)
}
```

## Edge Cases

### Same Day Login (Multiple Times)
- **Behavior:** No change to streak
- **Reason:** Already counted for today

### First Ever Login
- **Behavior:** Streak = 1
- **Notification:** None
- **Reason:** Starting fresh

### Timezone Handling
- **Uses:** UTC dates (YYYY-MM-DD format)
- **Calculation:** Based on calendar days, not 24-hour periods
- **Example:** Login 11:59pm Monday, then 12:01am Tuesday = 1 day streak

### Leap Year / Month Boundaries
- **Works:** Date math handles all edge cases
- **Uses:** Native JavaScript Date object

## User Experience

### Motivation
- ✅ Encourages daily engagement
- ✅ Gamification element
- ✅ Visual feedback (toast notifications)
- ✅ Tracks longest streak (achievement)

### Forgiveness
- ❌ No grace period (miss = reset)
- ❌ No "freeze" days
- ✅ Longest streak preserved (motivation to beat it)
- ✅ Clear feedback when broken

## Future Enhancements

Potential improvements:
- **Freeze days** - Allow 1-2 "sick days" per month
- **Streak insurance** - Use XP to protect streak
- **Weekly streaks** - Track different time periods
- **Streak milestones** - Special rewards at 7, 30, 100 days
- **Leaderboard** - Compare with friends
- **Recovery mode** - 2x XP for 3 days after breaking streak

## Testing

To test streak breaking:

1. **Login today** (streak = 1)
2. **Manually update database** to set last_login_date = 2 days ago:
   ```sql
   UPDATE user_profiles
   SET last_login_date = '2025-12-16', current_streak = 5
   WHERE id = 'your-user-id'
   ```
3. **Reload app** or logout/login
4. **Check console** for "💔 Streak broken!" message
5. **Check notification** for warning toast
6. **Verify database** shows current_streak = 1

## Build Info

- **Build Time:** 17.15s
- **Bundle Size:** 805 KB (205 KB gzipped)
- **Commit:** `67f8d77`
- **Status:** Deployed ✅

---

**Updated:** December 18, 2025
**Status:** Production Ready ✅
