#!/bin/bash

# Focus Flow Supabase Setup Script
# Run this in your terminal after getting an access token

echo "============================================"
echo "   Focus Flow - Supabase Setup Script"
echo "============================================"
echo ""

# Check for access token
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "ERROR: SUPABASE_ACCESS_TOKEN not set!"
    echo ""
    echo "Steps to fix:"
    echo "1. Go to: https://supabase.com/dashboard/account/tokens"
    echo "2. Click 'Generate new token'"
    echo "3. Copy the token"
    echo "4. Run: export SUPABASE_ACCESS_TOKEN='your-token-here'"
    echo "5. Then run this script again"
    exit 1
fi

PROJECT_REF="uhlgppoylqeiirpfhhqm"
cd "$(dirname "$0")"

echo "Step 1: Linking to Supabase project..."
npx supabase link --project-ref $PROJECT_REF

echo ""
echo "Step 2: Pushing database migrations..."
npx supabase db push

echo ""
echo "Step 3: Deploying Edge Functions..."

# Deploy each function
for func in ai-chat canvas-proxy groq-vision-proxy infinite-campus-proxy; do
    echo "  Deploying $func..."
    npx supabase functions deploy $func --no-verify-jwt
done

echo ""
echo "Step 4: Setting up secrets..."
echo ""
echo "You need to set the GROQ_API_KEY secret for AI features:"
echo "1. Get a free API key from: https://console.groq.com/keys"
echo "2. Run: npx supabase secrets set GROQ_API_KEY=your-groq-api-key"
echo ""

echo "============================================"
echo "   Setup Complete!"
echo "============================================"
echo ""
echo "Your app should now be fully connected to Supabase!"
echo "Run 'npm run dev' to start the development server."
