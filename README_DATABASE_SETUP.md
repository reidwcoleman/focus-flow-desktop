# 🔧 Database Setup - FIX ALL ERRORS

## Quick Fix (2 minutes)

All your 404/400/406 errors are because the database tables don't exist yet. Run this ONE TIME to fix everything:

### Step 1: Open Supabase SQL Editor
https://supabase.com/dashboard/project/uhlgppoylqeiirpfhhqm/sql

### Step 2: Copy and Run SQL
1. Open `COMPLETE_DATABASE_MIGRATION.sql` from your project root
2. Copy ALL the SQL code
3. Paste into Supabase SQL Editor
4. Click **RUN** (or press Cmd/Ctrl + Enter)

### Step 3: Verify Success
You should see output like:
```
table_name          | row_count
--------------------|----------
assignments         | 0
calendar_activities | 0
study_sessions      | 0
blocking_sessions   | 0
blocking_lists      | 0
scheduled_blocks    | 0
```

All tables should show `rowsecurity: true`

## What This Fixes

✅ **Homework Scanner** - Can save scanned assignments
✅ **AI Planner** - Can create calendar activities
✅ **Analytics** - Tracks study sessions
✅ **Focus Mode** - Complete app blocking system

## After Running SQL

Refresh your app and all these errors will disappear:
- ❌ `404 study_sessions`
- ❌ `404 blocking_sessions`
- ❌ `400 blocking_sessions`
- ❌ `406 blocking_sessions`

Everything will work perfectly! 🎉

## Tables Created

1. **assignments** - Homework from scanner/Canvas
2. **calendar_activities** - AI-generated schedule
3. **study_sessions** - Analytics tracking
4. **blocking_sessions** - Active focus sessions
5. **blocking_lists** - Reusable app presets
6. **scheduled_blocks** - Recurring schedules

All with RLS security and auto-updating timestamps!
