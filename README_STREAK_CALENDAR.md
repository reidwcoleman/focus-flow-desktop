# 🔥 Streak Calendar - How It Works

## What You'll See

The streak calendar **already displays real data** from your database! Here's what each color means:

- 🟢 **Green Day** = You logged in that day (had a streak)
- ⚫ **Gray Day** = You didn't log in (missed streak)
- 🔥 **Orange/Red with Fire** = Today (if you logged in)
- 🌫️ **Faded Gray** = Future days (can't log in yet)

## How It Works

### Automatic Tracking
Every time you log in or return to the app:
1. **App.jsx** checks your streak using `streakService.checkAndUpdateStreak()`
2. **streakService** updates your `user_profiles` table with current/longest streak
3. **streakService** logs today's date in the `streak_history` table

### Calendar Display
When you tap the streak card:
1. **StreakCalendar.jsx** loads last 90 days from `streak_history` table
2. For each day in the calendar month:
   - Checks if that date exists in `streak_history`
   - Colors it **green** if found (you logged in)
   - Colors it **gray** if not found (you missed)
   - Special styling for **today** with fire emoji

## Database Setup

### Step 1: Run Migration
Open Supabase SQL Editor:
```
https://supabase.com/dashboard/project/uhlgppoylqeiirpfhhqm/sql
```

### Step 2: Copy & Paste
Open `COMPLETE_DATABASE_MIGRATION_V3.sql` and run it in Supabase.

This creates the `streak_history` table:
```sql
CREATE TABLE streak_history (
  id UUID,
  user_id UUID,
  login_date DATE,  -- YYYY-MM-DD format
  created_at TIMESTAMP
);
```

### Step 3: Verify
Check your browser console. You should see:
```
✅ All tables exist!
🔥 Streak calendar will now show your real login history!
```

## How Data Populates

### First Login
- Creates `streak_history` entry for today
- Calendar shows **1 green day** (today)

### Next Day Login (Consecutive)
- Adds new entry to `streak_history`
- Calendar now shows **2 green days**
- Current streak increases: 1 → 2

### Skip a Day
- No entry added for missed day
- Calendar shows **gray day** for skipped date
- Current streak resets to 1 on next login

### Over Time
- Calendar fills with your actual login pattern
- Green days = days you were active
- Gray days = days you were inactive
- You can navigate months to see full 90-day history

## Stats Displayed

The calendar shows:
- **Current Streak** - Consecutive days logged in (from today backwards)
- **Best Streak** - Longest streak you've ever had
- **90 Days %** - Percentage of last 90 days you logged in

## Troubleshooting

### Calendar shows all gray days
**Cause**: `streak_history` table is empty (first time using app)
**Fix**: Just wait! As you use the app daily, green days will appear.

### Calendar shows "Loading..."
**Cause**: `streak_history` table doesn't exist
**Fix**: Run `COMPLETE_DATABASE_MIGRATION_V3.sql` in Supabase

### Streak not increasing
**Cause**: Database check failing
**Fix**: Check browser console for errors, run migration

## Technical Details

### Files Involved
- `streakService.js` - Handles streak logic and database operations
- `StreakCalendar.jsx` - Renders the calendar UI
- `Dashboard.jsx` - Shows streak card and opens calendar modal
- `App.jsx` - Triggers streak updates on login/visibility

### Database Tables
- `user_profiles.current_streak` - Your current consecutive days
- `user_profiles.longest_streak` - Your all-time best
- `user_profiles.last_login_date` - Last day you logged in
- `streak_history.login_date` - One row per day you logged in

### When Streaks Update
- On app load (if you're logged in)
- When you log in
- When you switch back to the tab (visibility change)
- Every 5 minutes (background check)

### Streak Logic
```javascript
// Same day = no change
if (lastLogin === today) return currentStreak

// Yesterday = increment streak
if (lastLogin === yesterday) return currentStreak + 1

// Older = reset to 1
return 1
```

## Privacy & Security

- ✅ Row Level Security (RLS) enabled
- ✅ You can only see YOUR streak data
- ✅ No one else can see when you log in
- ✅ Auto-deletes if you delete your account (CASCADE)

## Summary

**The streak calendar is already smart!** It automatically tracks every login and displays your real activity history. Just run the migration and start using the app - your green days will build up naturally over time.

Green = Active 🟢
Gray = Inactive ⚫
Fire = Today 🔥
