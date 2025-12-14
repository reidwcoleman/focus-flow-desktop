# Fix Supabase Authentication - CRITICAL STEPS

You're getting **400** and **422** errors because Supabase is blocking GitHub Pages.

## Required Changes in Supabase Dashboard:

### 1️⃣ Auth URL Configuration
**Link:** https://supabase.com/dashboard/project/uhlgppoylqeiirpfhhqm/auth/url-configuration

**Changes needed:**
```
Site URL: https://reidwcoleman.github.io/focus-flow-ai/

Additional Redirect URLs (add all these):
https://reidwcoleman.github.io/focus-flow-ai/
https://reidwcoleman.github.io
http://localhost:5173
```

### 2️⃣ Email Auth Settings  
**Link:** https://supabase.com/dashboard/project/uhlgppoylqeiirpfhhqm/auth/providers

**Under Email provider, DISABLE:**
- ❌ Enable email confirmations → Turn OFF
- ❌ Secure email change → Turn OFF
- ✅ Enable signup → Keep ON

### 3️⃣ Auth Settings
**Link:** https://supabase.com/dashboard/project/uhlgppoylqeiirpfhhqm/settings/auth

**Check these:**
- ✅ Enable signup → ON
- JWT expiry → 3600 (default is fine)

---

## After Making Changes:

1. Click **"Save"** in each section
2. Wait **1 minute** for changes to propagate
3. Clear browser cache: `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
4. Try signup/login again at: https://reidwcoleman.github.io/focus-flow-ai/

---

## Still Not Working?

**Option A:** Test locally first to verify credentials work:
```bash
cd mobile-app
npm run dev
# Then go to http://localhost:5173 and try signup
```

**Option B:** Check Supabase logs:
https://supabase.com/dashboard/project/uhlgppoylqeiirpfhhqm/logs/auth-logs

The logs will show exactly why signup/login is failing.

---

## Expected Behavior After Fix:

✅ **Signup:** Create account with email/password  
✅ **Login:** Sign in with credentials  
✅ **Database:** Access all features (assignments, notes, etc.)  
✅ **AI:** Chat with AI tutor
