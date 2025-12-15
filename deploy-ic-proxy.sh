#!/bin/bash

# Deploy Infinite Campus Proxy Edge Function to Supabase
# Run this script to deploy the Edge Function

echo "🚀 Deploying Infinite Campus Proxy Edge Function..."

# Check if SUPABASE_ACCESS_TOKEN is set
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "❌ Error: SUPABASE_ACCESS_TOKEN environment variable not set"
  echo "Please set it with: export SUPABASE_ACCESS_TOKEN=your_token_here"
  echo "Get your token from: https://app.supabase.com/account/tokens"
  exit 1
fi

# Deploy the function
supabase functions deploy infinite-campus-proxy

if [ $? -eq 0 ]; then
  echo "✅ Edge Function deployed successfully!"
  echo ""
  echo "📝 Next steps:"
  echo "1. Make sure SUPABASE_URL and SUPABASE_ANON_KEY are set in your .env"
  echo "2. Test the integration in Account Settings"
  echo "3. Sync grades from Infinite Campus"
else
  echo "❌ Deployment failed"
  exit 1
fi
