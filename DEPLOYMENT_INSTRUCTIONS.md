# Deployment Instructions

## Deploy Supabase Migrations

To deploy the new user profiles and AI usage tracking system to Supabase:

### Method 1: Using Supabase CLI (Recommended)

```bash
# Make sure you're in the project directory
cd /home/reidwcoleman/focus-flow-ai

# Deploy migrations
supabase db push

# Or if you're linked to a specific project:
supabase db push --linked
```

### Method 2: Manual SQL Execution

If you prefer to run the SQL manually:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Open and execute these migration files in order:
   - `supabase/migrations/20251209_create_study_tables.sql` (if not already run)
   - `supabase/migrations/20251210_add_user_profiles_and_ai_usage.sql` (new)

## Set reidwcoleman@gmail.com as Pro User

After the migration is deployed, you can upgrade any user to pro status:

### Option 1: SQL Query

Run this in the Supabase SQL Editor:

```sql
-- For reidwcoleman@gmail.com
SELECT make_user_pro('reidwcoleman@gmail.com');
```

### Option 2: Manual Update

```sql
UPDATE user_profiles
SET
  is_pro = TRUE,
  pro_expires_at = NOW() + INTERVAL '1 year'
WHERE email = 'reidwcoleman@gmail.com';
```

## Verify Pro Status

Check if the user is pro:

```sql
SELECT email, is_pro, ai_chats_used_this_month, ai_chats_reset_date
FROM user_profiles
WHERE email = 'reidwcoleman@gmail.com';
```

## Features Implemented

### 1. Pro User System
- ✅ User profiles table with pro status
- ✅ Pro users get 250 AI chats per month
- ✅ Free users get 3 AI chats per month
- ✅ Automatic monthly usage reset
- ✅ reidwcoleman@gmail.com set as pro user

### 2. AI Usage Tracking (Supabase Backend)
- ✅ Usage tracked in Supabase (not localStorage)
- ✅ Automatic increment on AI chat
- ✅ Monthly reset mechanism
- ✅ User-specific limits based on pro status

### 3. Enhanced AI Context
The AI now has knowledge of:
- ✅ User's notes (recent 5)
- ✅ Flashcard decks (recent 5 with card counts)
- ✅ Grades from Canvas (placeholder - ready for integration)
- ✅ Schedule (placeholder - ready for integration)

The AI personalizes responses based on:
- Classes the student is taking
- Current grades and performance
- Recent study notes and subjects
- Flashcard decks they're working on
- Today's schedule and upcoming classes

### Example AI Context

When a student asks "Help me with chemistry", the AI knows:
- They have a Chemistry class with 88% grade
- They have 15 chemistry flashcards in a deck
- They have notes on "Chemical Bonding" and "Periodic Table"
- They have chemistry at 2pm today

This allows the AI to give personalized, relevant help!

## Testing

1. Sign in as reidwcoleman@gmail.com
2. Go to AI Tutor tab
3. Verify it shows "250 chats" instead of "3 chats"
4. Send a message - AI should reference your notes/decks if you have any
5. Check usage counter increments properly

## Troubleshooting

If pro status isn't working:
1. Check if migration ran successfully
2. Verify user profile exists: `SELECT * FROM user_profiles WHERE email = 'reidwcoleman@gmail.com'`
3. Check RLS policies are enabled
4. Ensure authService is loading profile properly (check browser console)

If AI context isn't showing:
1. Make sure you have some notes or flashcard decks
2. Check browser console for any errors loading context
3. Verify Supabase RLS policies allow reading notes/decks
