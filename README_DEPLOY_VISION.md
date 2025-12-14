# 🚀 Deploy AI Vision - Enable Real Image Scanning

## Quick Start (2 minutes)

Your scanner is configured to use a **secure backend** (Supabase Edge Function) instead of exposing API keys in the frontend. To make it work, you need to:

1. **Deploy the Edge Function** (30 seconds)
2. **Set your Groq API Key** (1 minute)

## Step 1: Deploy Edge Function

Run the automated deployment script:

```bash
./deploy-vision.sh
```

This will:
- Check if Supabase CLI is installed
- Log you in to Supabase (if needed)
- Deploy the `ai-chat` edge function
- Check if GROQ_API_KEY is configured

### Manual Deployment (if script fails)

```bash
# Install Supabase CLI if needed
npm install -g supabase

# Login to Supabase
supabase login

# Deploy the function
supabase functions deploy ai-chat --project-ref uhlgppoylqeiirpfhhqm
```

## Step 2: Get Groq API Key

1. Go to https://console.groq.com/keys
2. Sign up/login (it's FREE!)
3. Click "Create API Key"
4. Copy your key (starts with `gsk_...`)

## Step 3: Set Secret in Supabase

```bash
supabase secrets set GROQ_API_KEY=gsk_your_key_here --project-ref uhlgppoylqeiirpfhhqm
```

**Important**: Replace `gsk_your_key_here` with your actual Groq API key!

## That's It! 🎉

Your scanner now uses real AI vision! Test it:

1. Open your app
2. Click the **Scan** button (center of nav bar)
3. Take a photo of homework, notes, or textbooks
4. Watch the AI actually read and understand it!

## How It Works

### Security Architecture

**Before (Insecure):**
```
Frontend → Groq API (with exposed API key)
```

**After (Secure):**
```
Frontend → Supabase Edge Function → Groq API
           (API key stored safely on backend)
```

### What Changed

1. **visionService.js** now calls Supabase Edge Function:
   ```javascript
   await supabase.functions.invoke('ai-chat', {
     body: {
       messages: [...],
       useVision: true
     }
   })
   ```

2. **Edge Function** (`/supabase/functions/ai-chat/index.ts`):
   - Receives image + prompt from frontend
   - Calls Groq API with secret key (stored in Supabase)
   - Returns AI response to frontend

3. **No API keys** in `.env` file anymore!
   - More secure (keys never exposed to users)
   - Easier deployment (no frontend config needed)
   - Better for production

## Troubleshooting

### "Edge function not found"
**Solution**: Run `./deploy-vision.sh` to deploy

### "GROQ_API_KEY not configured"
**Solution**: Run `supabase secrets set GROQ_API_KEY=your_key`

### "Failed to process image"
**Check**:
1. Is edge function deployed? `supabase functions list`
2. Is secret set? `supabase secrets list`
3. Check browser console for detailed error

### "Groq API error: 401 Unauthorized"
**Cause**: Invalid or missing Groq API key
**Solution**:
1. Get new key from https://console.groq.com/keys
2. Set it: `supabase secrets set GROQ_API_KEY=new_key`
3. Redeploy: `supabase functions deploy ai-chat`

### "Groq API error: 429 Rate Limit"
**Cause**: Too many requests (Groq free tier limits)
**Solution**: Wait a minute and try again

## Verify Deployment

### Check Function Status
```bash
supabase functions list --project-ref uhlgppoylqeiirpfhhqm
```

Should show:
```
┌────────────┬─────────┬────────────────────┐
│ NAME       │ STATUS  │ REGION             │
├────────────┼─────────┼────────────────────┤
│ ai-chat    │ ACTIVE  │ us-east-1          │
└────────────┴─────────┴────────────────────┘
```

### Check Secrets
```bash
supabase secrets list --project-ref uhlgppoylqeiirpfhhqm
```

Should include:
```
┌─────────────────┬──────────────┐
│ NAME            │ DIGEST       │
├─────────────────┼──────────────┤
│ GROQ_API_KEY    │ <hash>       │
└─────────────────┴──────────────┘
```

### Test Edge Function
```bash
curl -i --location --request POST \
  'https://uhlgppoylqeiirpfhhqm.supabase.co/functions/v1/ai-chat' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"messages":[{"role":"user","content":"Hello"}]}'
```

Should return:
```json
{
  "message": "Hello! How can I help you today?",
  "usage": {...}
}
```

## Cost & Limits

**Groq API (as of Dec 2024):**
- **Cost**: FREE! 🎉
- **Rate Limits**: ~30 requests per minute
- **Models**: Llama 3.3 70B and Llama 4 Scout (vision)

**Supabase Edge Functions:**
- **Cost**: FREE on free tier (up to 500k invocations/month)
- **After**: $0.50 per million invocations

**Realistically**: Your scanner usage will be well within free tier!

## Files Modified

- ✅ `mobile-app/src/services/visionService.js` - Updated to use edge function
- ✅ `supabase/functions/ai-chat/index.ts` - Already supports vision
- ✅ `deploy-vision.sh` - Automated deployment script
- ✅ `README_DEPLOY_VISION.md` - This file!

## Production Checklist

- [ ] Supabase CLI installed (`npm install -g supabase`)
- [ ] Logged in to Supabase (`supabase login`)
- [ ] Edge function deployed (`./deploy-vision.sh`)
- [ ] Groq API key set (`supabase secrets set GROQ_API_KEY=...`)
- [ ] Function tested (scan a real image!)
- [ ] Works on all scan modes (Homework, Notes, Flashcards)

## Summary

Your AI vision scanner now uses a **production-grade secure architecture**:
- ✅ API keys never exposed to frontend
- ✅ Backend handles all AI API calls
- ✅ CORS configured for your domain
- ✅ Easy to deploy and maintain
- ✅ Free to use (Groq + Supabase free tiers)

Deploy once, scan forever! 🚀
