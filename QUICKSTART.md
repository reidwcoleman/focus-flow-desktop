# 🚀 Quick Start Guide - Canvas Integration

Get your Canvas assignments synced to Focus Flow in **5 minutes**!

## Step 1: Get Your Canvas API Token (2 min)

1. Go to your Canvas website (e.g., `https://byui.instructure.com`)
2. Click your profile picture → **Settings**
3. Scroll to **"Approved Integrations"**
4. Click **"+ New Access Token"**
5. Purpose: `Focus Flow Desktop`
6. Click **"Generate Token"**
7. **COPY THE TOKEN** (you only see it once!) ⚠️

## Step 2: Configure Focus Flow (1 min)

1. Open Focus Flow Desktop
2. Click **"Account"** tab
3. Scroll to **Canvas Integration** section
4. Enter:
   - **Canvas URL:** `https://your-school.instructure.com`
   - **Canvas Token:** Paste the token you copied
5. Click **"Save"**
6. Click **"Test Connection"** to verify

✅ You should see: "Connected successfully! Welcome, [Your Name]!"

## Step 3: Sync Your Data (2 min)

1. Click **"Canvas"** tab in the navigation
2. Click **"Sync to App"** button (top-right)
3. Wait for sync to complete (5-30 seconds)

🎉 Done! Your Canvas data is now synced!

## What's Next?

View your synced data in Canvas Hub:

- **📚 Courses Tab** - All your active courses
- **📝 Assignments Tab** - Every assignment with due dates
- **📊 Grades Tab** - Current grades for each course

## Re-sync Later

Click **"Sync to App"** in Canvas Hub whenever you want to refresh your data.

---

**Need help?** See [CANVAS_SETUP.md](./CANVAS_SETUP.md) for detailed instructions and troubleshooting.

**Test the integration:** Open `http://localhost:5173/test-canvas.html` after running `npm run dev`
