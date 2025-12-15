# Infinite Campus Integration Setup Guide

## Overview

FocusFlow now integrates with Infinite Campus to automatically fetch your grades! This uses a secure backend proxy to bypass browser restrictions.

## What You Need

Students only need their **normal Infinite Campus login**:
- **District Name** (e.g., "Wake County", "WCPSS")
- **State** (e.g., "NC", "CA")
- **Username** (your student portal username)
- **Password** (your student portal password)

## Setup Instructions

### Step 1: Deploy the Edge Function

The backend proxy runs as a Supabase Edge Function. Deploy it once:

```bash
# Set your Supabase access token (get from https://app.supabase.com/account/tokens)
export SUPABASE_ACCESS_TOKEN=your_token_here

# Deploy the function
./deploy-ic-proxy.sh
```

**Alternative: Manual deployment**
```bash
supabase functions deploy infinite-campus-proxy
```

### Step 2: Run Database Migration

In your Supabase SQL Editor, run:

```sql
-- Copy and paste contents of:
supabase/migrations/20251215_add_infinite_campus.sql
```

This adds the necessary columns to store credentials.

### Step 3: Configure in App

1. Open FocusFlow and go to **Account Settings**
2. Find the **Infinite Campus** section
3. Enter your credentials:
   - District Name (e.g., "Wake County")
   - State (e.g., "NC")
   - Username
   - Password
4. Click **Test Connection** to verify
5. Click **Save**

### Step 4: Sync Grades

Once configured, you can:
- Click **Sync Grades** to fetch from Infinite Campus
- Grades will be stored in your database
- View grades in the Dashboard (coming soon)

## How It Works

```
Frontend (Browser)
    ↓
Supabase Edge Function (Backend Proxy)
    ↓
Infinite Campus Portal
    ↓
Your Grades → Stored in Database
```

The Edge Function:
1. Receives your credentials securely
2. Logs into Infinite Campus on your behalf
3. Fetches your grades
4. Returns them to the app
5. Grades are saved to your database

## Security Notes

- Credentials are stored encrypted in Supabase
- Edge Function runs on Supabase servers (not in browser)
- Your password is never exposed to the frontend
- Only you can access your grades (Row Level Security)

## Troubleshooting

### "Login failed - invalid credentials"
- Double-check your username and password
- Make sure District Name matches exactly (case doesn't matter)
- Verify State is correct 2-letter code

### "Failed to fetch grades"
- Try Test Connection first
- Check if Infinite Campus is down
- Verify district URL is correct

### "Edge Function not found"
- Make sure you deployed the function
- Check Supabase project settings
- Verify SUPABASE_URL in .env is correct

## District URL Patterns

The system tries these patterns automatically:
1. `https://[state][district].infinitecampus.org` (most common)
2. `https://[district].infinitecampus.org`
3. `https://[district]ky.infinitecampus.org` (Kentucky pattern)

If your district uses a different URL, you may need to manually configure it.

## Future Enhancements

Coming soon:
- [ ] Grades display widget on Dashboard
- [ ] Grade change notifications
- [ ] GPA calculator
- [ ] Grade history tracking
- [ ] What-if grade scenarios

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify Edge Function is deployed
3. Test with manual grade entry first
4. Check Supabase logs for errors
