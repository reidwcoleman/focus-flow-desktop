# Deploy AI Chat Function to Supabase

The AI chat function has been updated with new models and token limits. You need to deploy it to Supabase.

## Quick Deploy (Choose One Method)

### Method 1: Using Supabase Access Token (Fastest)

1. **Get your access token** from [Supabase Account Settings](https://supabase.com/dashboard/account/tokens)

2. **Run this command** (replace `your_token_here` with your actual token):

```bash
export SUPABASE_ACCESS_TOKEN=your_token_here
./deploy-vision.sh
```

Or run directly:

```bash
SUPABASE_ACCESS_TOKEN=your_token_here supabase functions deploy ai-chat --project-ref uhlgppoylqeiirpfhhqm
```

### Method 2: Using Supabase Login

```bash
supabase login
./deploy-vision.sh
```

## What Gets Updated

The deployment will update your ai-chat edge function with:

✅ **Standard Mode**: 2000 max tokens (was 300)
✅ **UltraThink Mode**: 8000 max tokens (stable llama-3.3-70b model)
✅ **Deep Research Mode**: 12000 max tokens (upgraded llama-3.3-70b-specdec model)
✅ **Vision Mode**: 800 max tokens

## Verify Deployment

After deploying, test it by:
1. Open your Focus Flow app
2. Go to the AI Tutor tab
3. Send a message in each mode (Standard, UltraThink, Deep Research)
4. Responses should now be longer and higher quality!

## Troubleshooting

**"Access token not provided"**
- Make sure you've set `SUPABASE_ACCESS_TOKEN` or run `supabase login`

**"GROQ_API_KEY not found"**
- Set your Groq API key: `supabase secrets set GROQ_API_KEY=your_key --project-ref uhlgppoylqeiirpfhhqm`

**Function not updating**
- Check Supabase dashboard → Edge Functions → ai-chat for any errors
- View logs: `supabase functions logs ai-chat --project-ref uhlgppoylqeiirpfhhqm`
