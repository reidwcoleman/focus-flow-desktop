# Focus Flow - Quick Start Guide

## ✅ Everything is Working!

The app is running at: **http://localhost:5173/**

## 🎯 How to Use Each Feature

### 1. **Homework Scanner** 📸
**Steps:**
1. Click "Scan Homework" button on Dashboard
2. Allow camera access when prompted
3. Point camera at homework
4. Tap the white circle button to capture
5. Review AI-extracted assignment
6. Tap "Add to My Assignments"

**Note:** If camera doesn't work, tap "Upload" icon to select image from files.

---

### 2. **Canvas Integration** 🎓

#### Option A: Demo Mode (Works Instantly)
1. Go to **Settings** tab (gear icon at bottom)
2. Scroll down to Canvas LMS section
3. Click **"Try Demo Mode"** button (purple gradient)
4. Go back to **Dashboard** tab
5. See 5 Canvas assignments automatically loaded!

#### Option B: Real Canvas (Advanced - Requires Backend)
Real Canvas connection needs a backend proxy due to CORS.
For now, use Demo Mode to see full functionality.

---

### 3. **AI Tutor** 💬

#### Option A: Demo Mode (Works Instantly)
1. Tap **AI** tab (sparkle icon)
2. Type question in text box
3. Tap send button (purple arrow)
4. Get smart demo responses instantly

#### Option B: Real AI - 100% FREE! ⚡ (Groq - Lightning Fast)
1. Get **FREE** API key from [Groq Console](https://console.groq.com/keys)
2. Sign in with Google/GitHub
3. Click "Create API Key"
4. Create `.env` file in mobile-app folder:
   ```
   VITE_GROQ_API_KEY=gsk_your-key-here
   ```
5. Restart the dev server (`npm run dev`)
6. Now get **instant AI tutoring** powered by Groq - completely free!

**Why Groq?**
- ✅ 100% FREE (no credit card needed)
- ✅ LIGHTNING FAST (100+ tokens/second!)
- ✅ 30 requests/min, 14,400 requests/day
- ✅ Powered by Llama 3.1 70B (high quality)
- ✅ Perfect for students!

---

### 4. **Study Planner** 📅
1. Tap **Plan** tab (calendar icon)
2. View AI-optimized study schedule
3. Tap "Start Now" to begin current task
4. See progress throughout the day

---

### 5. **Analytics** 📊
1. Tap **Stats** tab (chart icon)
2. View grade predictions
3. See weekly activity charts
4. Get AI recommendations

---

## 🚀 Quick Test Flow

**Try this 3-minute demo:**

1. **Enable Canvas Demo Mode**
   - Settings → "Try Demo Mode"

2. **View Assignments**
   - Dashboard → See 5 Canvas assignments

3. **Scan Homework**
   - Dashboard → "Scan Homework" → Capture photo

4. **Ask AI Tutor**
   - AI tab → Type "Explain photosynthesis"

5. **Check Stats**
   - Stats tab → See grade predictions

---

## ❓ Troubleshooting

**Scanner not working?**
- Check camera permissions in browser
- Try upload option instead
- Make sure you're on HTTPS or localhost

**Canvas not connecting?**
- Use "Demo Mode" for testing
- Real Canvas requires backend proxy

**App not loading?**
- Refresh browser (Ctrl+R / Cmd+R)
- Check console for errors (F12)

---

## 🎨 Features Working

✅ Homework scanner with camera
✅ Canvas demo mode with 5 courses
✅ AI tutor chat
✅ Study planner with timeline
✅ Grade predictions
✅ Analytics dashboard
✅ Premium UI with gradients
✅ Bottom navigation
✅ Settings page

Everything is ready to use!
