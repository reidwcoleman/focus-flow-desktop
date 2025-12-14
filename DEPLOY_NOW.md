# 🚀 Deploy AI Vision NOW (3 Easy Steps)

Your Groq API key is ready! Now let's deploy the edge function.

## Option 1: Supabase Dashboard (Easiest - 2 minutes)

### Step 1: Deploy Edge Function

1. Go to: https://supabase.com/dashboard/project/uhlgppoylqeiirpfhhqm/functions
2. Click **"Deploy a new function"**
3. Click **"Import from filesystem"** or **"New function"**
4. If using filesystem:
   - Name: `ai-chat`
   - Upload: `/home/reidwcoleman/focus-flow-ai/supabase/functions/ai-chat/index.ts`
5. If creating new:
   - Name: `ai-chat`
   - Copy/paste the content of `/supabase/functions/ai-chat/index.ts`
6. Click **"Deploy function"**
7. Wait 30-60 seconds for deployment

### Step 2: Set Groq API Key Secret

1. Go to: https://supabase.com/dashboard/project/uhlgppoylqeiirpfhhqm/settings/vault/secrets
2. Click **"New secret"**
3. Name: `GROQ_API_KEY`
4. Value: `<your-groq-api-key-provided-earlier>`
5. Click **"Create secret"**

### Step 3: Test It!

1. Open your app: http://localhost:5174
2. Click the **Scan** button (center of nav bar)
3. Choose **Homework**, **Notes**, or **Flashcards**
4. Take a photo or upload an image
5. Watch the AI **actually read and analyze it**! 🎉

---

## Option 2: Command Line (If you have Supabase CLI)

### Get Supabase Access Token

1. Go to: https://supabase.com/dashboard/account/tokens
2. Click **"Generate new token"**
3. Name it: `CLI Access`
4. Copy the token

### Deploy with Token

```bash
cd /home/reidwcoleman/focus-flow-ai

# Set your access token
export SUPABASE_ACCESS_TOKEN="sbp_your_token_here"

# Deploy the function
supabase functions deploy ai-chat --project-ref uhlgppoylqeiirpfhhqm

# Set the Groq API key secret
supabase secrets set GROQ_API_KEY=<your-groq-api-key> --project-ref uhlgppoylqeiirpfhhqm
```

---

## Verify It's Working

### Check Function Status

Go to: https://supabase.com/dashboard/project/uhlgppoylqeiirpfhhqm/functions

You should see:
- **ai-chat** function listed
- Status: **Active** (green checkmark)

### Check Secret

Go to: https://supabase.com/dashboard/project/uhlgppoylqeiirpfhhqm/settings/vault/secrets

You should see:
- **GROQ_API_KEY** in the list

### Test Scanner

1. Open app
2. Scan button → Homework mode
3. Take photo of any homework/notes
4. Should see "Analyzing assignment with AI vision..."
5. AI extracts real data from your image!

---

## Troubleshooting

### "Failed to invoke function"
**Fix**: Make sure function is deployed and shows "Active" status

### "GROQ_API_KEY not configured"
**Fix**: Make sure secret is set (check vault/secrets page)

### "Groq API error: 401"
**Fix**: Double-check the API key in secrets matches the key you provided

### Still not working?
Check browser console (F12) for detailed error messages

---

## What This Does

When you scan an image:
1. **Frontend** sends image + prompt to Supabase Edge Function
2. **Edge Function** calls Groq API with your secret key (secure!)
3. **Groq AI** analyzes the image and returns text
4. **Scanner** displays the extracted data

All secure, all fast, all free! 🎉

---

## Summary

✅ **Groq API Key**: Ready (you provided it earlier)
⏳ **Edge Function**: Deploy through dashboard (2 minutes)
⏳ **Secret**: Set in vault (30 seconds)
🎯 **Result**: Scanner uses real AI vision!

**Start here**: https://supabase.com/dashboard/project/uhlgppoylqeiirpfhhqm/functions

Deploy the `ai-chat` function and you're done! 🚀
