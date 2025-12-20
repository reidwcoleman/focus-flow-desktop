# Canvas LMS Integration Setup Guide

This guide will help you set up Canvas LMS integration in Focus Flow Desktop to automatically sync your assignments, courses, and grades.

## Prerequisites

- A Canvas LMS account (from your school/institution)
- Access to generate an API token in Canvas
- Focus Flow Desktop app with a user account

## Step 1: Generate Your Canvas API Token

1. **Log in to your Canvas account** at your institution's Canvas URL (e.g., `https://school.instructure.com`)

2. **Navigate to Account Settings:**
   - Click on your profile picture in the top-left corner
   - Select "Settings" from the dropdown menu

3. **Generate a New Access Token:**
   - Scroll down to the "Approved Integrations" section
   - Click the "+ New Access Token" button
   - Give it a purpose/name (e.g., "Focus Flow Desktop")
   - Set an expiry date (optional - leave blank for no expiration)
   - Click "Generate Token"

4. **Copy your token immediately:**
   - ⚠️ **IMPORTANT:** Canvas only shows the token once!
   - Copy the entire token (it's a long string of characters)
   - Save it somewhere safe (you'll need it in the next step)

## Step 2: Configure Canvas in Focus Flow Desktop

1. **Open Focus Flow Desktop** and log in to your account

2. **Go to Account Settings:**
   - Click on the "Account" tab in the navigation

3. **Enter Canvas Credentials:**
   - **Canvas URL:** Enter your institution's Canvas URL
     - Format: `https://school.instructure.com`
     - Example: `https://canvas.harvard.edu`
     - ⚠️ Make sure to include `https://` at the beginning

   - **Canvas API Token:** Paste the token you copied from Canvas
     - This should be a long alphanumeric string
     - No spaces at the beginning or end

4. **Save your credentials:**
   - Click the "Save" button
   - You should see a success message

5. **Test the connection:**
   - Click "Test Connection" button
   - If successful, you'll see: "✅ Connected successfully! Welcome, [Your Name]!"
   - If it fails, verify your URL and token are correct

## Step 3: Sync Your Canvas Data

1. **Navigate to Canvas Hub:**
   - Click on the "Canvas" tab in the navigation

2. **Sync your data:**
   - Click the "Sync to App" button in the top-right corner
   - Wait for the sync to complete (usually takes 5-30 seconds)
   - You should see: "✅ Sync Complete! 📚 Courses: X | 📝 Assignments: Y | 📊 Grades: Z"

3. **View your synced data:**
   - **Courses Tab:** See all your active Canvas courses
   - **Assignments Tab:** View all assignments with due dates, points, and submission status
   - **Grades Tab:** Check your current grades for each course

## What Gets Synced?

### Courses
- Course name and code
- Term information
- Enrollment type (student, teacher, etc.)

### Assignments
- Assignment title and description
- Due dates
- Points possible
- Submission status (submitted/not submitted)
- Grades received
- Direct links to assignments in Canvas

### Grades
- Current letter grade and percentage
- Final grade (if available)
- Progress tracking for each course

## Troubleshooting

### "Invalid Canvas token" Error

**Possible causes:**
- Token was copied incorrectly (check for extra spaces)
- Token has expired (generate a new one)
- Token was revoked in Canvas settings

**Solution:** Generate a new API token and update it in Account settings

### "Canvas URL not found" Error

**Possible causes:**
- URL format is incorrect
- Missing `https://` prefix
- Wrong Canvas domain

**Solution:**
- Verify the URL format: `https://your-school.instructure.com`
- Check your institution's Canvas login page for the exact URL

### No assignments showing up

**Possible causes:**
- Sync hasn't been run yet
- No assignments in your Canvas courses
- Assignments don't have due dates

**Solution:**
1. Click "Sync to App" in Canvas Hub
2. Check the Assignments tab after sync completes
3. Verify you have assignments in Canvas itself

### Sync is slow or times out

**Possible causes:**
- You have many courses/assignments
- Network connection issues

**Solution:**
- Wait a bit longer (first sync can take up to 60 seconds)
- Check your internet connection
- Try syncing again

## How Often Should I Sync?

- **Manual sync:** Click "Sync to App" in Canvas Hub whenever you want the latest data
- **Recommended frequency:** Sync once per day or whenever you know assignments have been updated
- The app will remember your last sync and only update changed data

## Privacy & Security

- ✅ Your Canvas token is stored securely in your user profile (encrypted at rest)
- ✅ API requests are proxied through Supabase Edge Functions (your token never leaves our secure backend)
- ✅ Only YOU can see your Canvas data (Row Level Security policies enforce this)
- ✅ Your Canvas credentials are never shared with third parties

## Need Help?

If you're still having issues:

1. **Check the browser console** (F12 → Console tab) for detailed error messages
2. **Verify in Canvas** that your API token is still active
3. **Try disconnecting and reconnecting** Canvas in Account settings
4. **Contact support** with screenshots of any error messages

## Advanced: What's Happening Behind the Scenes?

When you click "Sync to App", here's what happens:

1. **Fetch courses** from Canvas API (`/api/v1/courses`)
2. **For each course:**
   - Fetch assignments (`/api/v1/courses/{id}/assignments`)
   - Fetch enrollment/grade data
3. **Save to database:**
   - Upsert courses to `canvas_courses` table
   - Upsert assignments to `assignments` table (with deduplication)
   - Upsert grades to `course_grades` table
4. **Update UI** with fresh data

The sync uses **upserts** (insert or update), so:
- ✅ No duplicate assignments
- ✅ Updated data overwrites old data
- ✅ New assignments are added automatically
- ✅ Deleted assignments in Canvas remain in your local database (won't be removed)

---

**Happy studying! 📚✨**
