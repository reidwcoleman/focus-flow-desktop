# 🚀 Supabase Edge Function Deployment Guide

This guide shows you how to deploy the AI chat backend to Supabase, keeping your API key secure.

## Why Use Supabase Edge Functions?

✅ **Security**: API key stays on the backend
✅ **Scalability**: Handle unlimited users
✅ **Control**: Add rate limiting, auth, usage tracking
✅ **Production-Ready**: No exposed secrets in frontend

---

## Prerequisites

1. **Supabase Account**: [Create free account](https://supabase.com)
2. **Supabase CLI**: Install it first

```bash
# Install Supabase CLI
npm install -g supabase

# Or with homebrew (macOS)
brew install supabase/tap/supabase
```

---

## Step 1: Initialize Supabase (If Not Already Done)

```bash
# Login to Supabase
supabase login

# Link to your existing project (or create new one)
supabase link --project-ref your-project-ref

# You can find your project ref in your Supabase dashboard URL:
# https://supabase.com/dashboard/project/YOUR-PROJECT-REF
```

---

## Step 2: Deploy the Edge Function

```bash
# Deploy the ai-chat function
supabase functions deploy ai-chat

# This will upload the function to Supabase
```

---

## Step 3: Set the Groq API Key Secret

Your Groq API key needs to be stored securely in Supabase:

```bash
# Set the secret (replace with your actual Groq API key)
supabase secrets set GROQ_API_KEY=gsk_YOUR_GROQ_API_KEY_HERE
```

**Alternatively, set it in the Supabase Dashboard:**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Edge Functions** → **Secrets**
4. Add secret:
   - **Name**: `GROQ_API_KEY`
   - **Value**: `gsk_YOUR_GROQ_API_KEY_HERE`

---

## Step 4: Update Your Frontend .env File

Update `/mobile-app/.env`:

```bash
# Remove the direct API mode
# VITE_USE_DIRECT_API=true
# VITE_GROQ_API_KEY=...

# Add your Supabase URL
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
```

**Find your Supabase URL:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **Project URL**

---

## Step 5: Test the Edge Function

```bash
# Test locally first (optional)
supabase functions serve ai-chat

# Then test with curl
curl -X POST 'http://localhost:54321/functions/v1/ai-chat' \
  -H 'Content-Type: application/json' \
  -d '{
    "messages": [{"role": "user", "content": "Explain photosynthesis"}],
    "systemPrompt": "You are a helpful tutor."
  }'
```

**Test the deployed function:**

```bash
curl -X POST 'https://your-project-ref.supabase.co/functions/v1/ai-chat' \
  -H 'Content-Type: application/json' \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

---

## Step 6: Restart Your App

```bash
cd mobile-app
npm run dev
```

Now your app uses the secure backend! 🎉

---

## Verification Checklist

- [ ] Edge function deployed successfully
- [ ] GROQ_API_KEY secret is set in Supabase
- [ ] VITE_SUPABASE_URL is in .env
- [ ] VITE_USE_DIRECT_API is removed/commented out
- [ ] App is running and AI chat works
- [ ] Browser DevTools Network tab shows requests to Supabase (not Groq)

---

## Optional: Enable User Authentication

To require users to be logged in before using AI chat:

### 1. Uncomment auth code in Edge Function

Edit `supabase/functions/ai-chat/index.ts` and uncomment:

```typescript
// Uncomment these lines:
const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
if (authError || !user) {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
```

### 2. Update frontend to send auth token

In `aiService.js`, update the fetch call:

```javascript
const response = await fetch(AI_CONFIG.edgeFunctionUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseAuthToken}`, // Add auth token
  },
  // ...
})
```

### 3. Redeploy

```bash
supabase functions deploy ai-chat
```

---

## Troubleshooting

### Function not found
- Make sure you deployed: `supabase functions deploy ai-chat`
- Check function name matches: `ai-chat`

### 401 Unauthorized
- Verify GROQ_API_KEY secret is set
- Check secret name is exactly `GROQ_API_KEY`

### CORS errors
- Edge function includes CORS headers
- Make sure you're calling from allowed origin

### Rate limiting
- Groq free tier: 30 requests/min, 14,400/day
- Consider adding rate limiting in Edge Function if needed

---

## Monitoring & Logs

View Edge Function logs in real-time:

```bash
supabase functions logs ai-chat
```

Or view them in the Supabase Dashboard:
1. Go to **Edge Functions**
2. Click on **ai-chat**
3. View **Logs** tab

---

## Cost Estimate

- **Supabase Edge Functions**: 500K requests/month FREE, then $2 per 1M requests
- **Groq API**: 100% FREE (generous limits)

**Total cost for most student apps: $0/month** 🎉

---

## Next Steps

Once deployed, you can add:

- ✅ **Rate Limiting**: Limit requests per user
- ✅ **Usage Tracking**: Store chat history in Supabase database
- ✅ **Analytics**: Track popular questions
- ✅ **Advanced Features**: Streaming responses, custom models

---

**Questions?** Check the [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
