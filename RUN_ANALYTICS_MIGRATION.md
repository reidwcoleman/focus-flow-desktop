# Analytics Migration - Run in Supabase

## Setup Real Analytics Tracking

This migration creates tables to track real user study sessions and analytics data.

### Steps to Deploy:

1. **Go to Supabase SQL Editor:**
   - Visit: https://supabase.com/dashboard/project/uhlgppoylqeiirpfhhqm/sql

2. **Run the Migration:**
   - Copy the SQL from: `supabase/migrations/20251211_create_analytics_tables.sql`
   - Paste into the SQL editor
   - Click "Run"

3. **What This Creates:**

   **📊 `study_sessions` Table:**
   - Tracks all study sessions (duration, subject, focus score)
   - Auto-populated from completed study activities in calendar
   - Used to calculate weekly activity charts

   **⚡ Auto-Tracking Trigger:**
   - When you mark a "study" calendar activity as complete
   - Automatically logs it as a study session
   - No manual tracking needed!

4. **How It Works:**

   - **Assignments:** Already tracked in the `assignments` table
   - **Study Time:** Automatically tracked when you complete calendar activities
   - **Analytics Tab:** Shows real data from your account:
     - Total study hours (last 30 days)
     - Assignment completion rate
     - Weekly activity breakdown
     - Subject-by-subject analysis
     - AI-powered recommendations

5. **Verify It Works:**
   - After running migration, go to Planning tab
   - Mark a study activity as complete
   - Check Analytics tab to see it reflected in the charts!

### What You'll See:

✅ **Real Stats**
- Actual study hours from completed activities
- Assignment completion rate
- Weekly activity chart
- Subject breakdown with real data

✅ **AI Recommendations**
- Personalized based on your actual progress
- Suggests areas to focus on
- Adapts to your study patterns

## Troubleshooting

**If analytics show 0:**
- Add some assignments in Dashboard
- Add study sessions in Planning tab
- Mark them as complete to see data appear

**Manual Study Session:**
You can also manually log study sessions (future feature) using the analytics service.
