# ⚡ AI Tutor Setup - Get FREE Groq (Lightning Fast!)

## Why Groq?

Groq is **100% FREE** and the **FASTEST** AI available:

- ✅ **No credit card needed** - Truly free forever
- ✅ **Blazing fast**: 100+ tokens/second (instant responses!)
- ✅ **High quality**: Powered by Meta's Llama 3.1 70B
- ✅ **Generous free tier**: 30 requests/minute
- ✅ **Easy setup**: Takes just 30 seconds

## Quick Setup (30 seconds!)

### Step 1: Get Your FREE API Key

1. Visit **[Groq Console](https://console.groq.com/keys)**
2. Click **"Sign In"** (use Google or GitHub)
3. Click **"Create API Key"**
4. Give it a name: "Focus Flow"
5. Copy the key (starts with `gsk_...`)

### Step 2: Add to Your App

1. In the `mobile-app` folder, create a `.env` file:
   ```bash
   touch .env
   ```

2. Open `.env` and add your key:
   ```
   VITE_GROQ_API_KEY=gsk_...your-key-here
   ```

3. Save the file

### Step 3: Restart & Enjoy!

1. Stop the dev server (Ctrl+C)
2. Restart it:
   ```bash
   npm run dev
   ```
3. Open the AI tab in the app
4. You should see "Groq Llama 3.1" instead of "Demo Mode"!

## Testing It Works

1. Go to the **AI** tab in Focus Flow
2. Type: "Explain photosynthesis"
3. You should get a detailed, **instant** AI response!

The response should appear in under 2 seconds - that's Groq's speed! ⚡

## Troubleshooting

### "Invalid API key" error?
- Make sure you copied the entire key
- Check for extra spaces in the `.env` file
- Key should look like: `gsk_abc123...` (starts with `gsk_`)
- Try creating a new API key

### Still seeing "Demo Mode"?
- Did you restart the dev server?
- Is the `.env` file in the `mobile-app` folder (not the root)?
- Is the variable named exactly `VITE_GROQ_API_KEY`?

### "Rate limit exceeded" error?
- Free tier allows 30 requests/minute
- Just wait 60 seconds and try again!

### Responses are slow?
- Groq should be **blazing fast** (under 2 seconds)
- If slow, check your internet connection
- Try again - first request is sometimes slower

## Why Groq is Perfect for Students

- **Instant help**: Get answers in seconds, not minutes
- **High quality**: Llama 3.1 70B is one of the best open models
- **Free forever**: No trial period, no credit card
- **Reliable**: Used by thousands of developers

## Free Tier Limits

- **30 requests per minute** - More than enough for studying!
- **14,400 requests per day** - Unlimited for practical use
- **No expiration** - Use it forever, completely free

## Security Note

- **Never commit your `.env` file to GitHub!**
- The `.gitignore` already protects it
- Keep your API keys private

## Need Help?

- Check the console (F12) for error messages
- Make sure you're signed into Groq Console
- Try creating a new API key if the old one doesn't work
- Visit [Groq Documentation](https://console.groq.com/docs)

---

**That's it! Enjoy lightning-fast AI tutoring, completely free!** ⚡🎉
