#!/bin/bash

# Deploy Groq Vision Proxy Edge Function
# This function provides AI vision capabilities to all users

echo "🚀 Deploying Groq Vision Proxy Edge Function..."

export SUPABASE_ACCESS_TOKEN=sbp_363110f2d41f5f2f9feaba0bee1f13f14ca4b6c0

# Set the Groq API key secret (stored in environment variable)
echo "🔑 Setting Groq API key secret..."
if [ -z "$GROQ_API_KEY" ]; then
  echo "❌ Error: GROQ_API_KEY environment variable not set"
  echo "Please run: export GROQ_API_KEY=your_key_here"
  exit 1
fi

supabase secrets set GROQ_API_KEY=$GROQ_API_KEY --project-ref uhlgppoylqeiirpfhhqm

# Deploy the function
echo "📦 Deploying function..."
supabase functions deploy groq-vision-proxy --project-ref uhlgppoylqeiirpfhhqm --no-verify-jwt

echo "✅ Groq Vision Proxy deployed successfully!"
echo "🔗 URL: https://uhlgppoylqeiirpfhhqm.supabase.co/functions/v1/groq-vision-proxy"
