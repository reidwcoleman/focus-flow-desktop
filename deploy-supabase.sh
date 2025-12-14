#!/bin/bash

# Focus Flow - Supabase Deployment Script
# This script deploys the AI chat Edge Function and sets the API key

set -e  # Exit on error

echo "🚀 Focus Flow - Supabase Deployment"
echo "===================================="
echo ""

# Step 1: Login (if not already logged in)
echo "📝 Step 1: Login to Supabase..."
echo "This will open your browser for authentication."
read -p "Press Enter to continue..."
supabase login

echo ""
echo "✅ Logged in successfully!"
echo ""

# Step 2: Get project reference
echo "📋 Step 2: Link to your Supabase project"
echo ""
echo "You can find your project reference in your Supabase dashboard URL:"
echo "https://supabase.com/dashboard/project/YOUR-PROJECT-REF"
echo ""
read -p "Enter your Supabase project reference: " PROJECT_REF

if [ -z "$PROJECT_REF" ]; then
    echo "❌ Error: Project reference cannot be empty"
    exit 1
fi

echo ""
echo "🔗 Linking to project: $PROJECT_REF..."
supabase link --project-ref "$PROJECT_REF"

echo ""
echo "✅ Project linked successfully!"
echo ""

# Step 3: Deploy the Edge Function
echo "📦 Step 3: Deploying AI chat Edge Function..."
supabase functions deploy ai-chat

echo ""
echo "✅ Edge Function deployed successfully!"
echo ""

# Step 4: Set the Groq API Key
echo "🔐 Step 4: Setting Groq API key..."
echo ""
read -p "Enter your Groq API key: " GROQ_KEY

if [ -z "$GROQ_KEY" ]; then
    echo "❌ Error: Groq API key cannot be empty"
    exit 1
fi

echo ""
echo "Setting API key as Supabase secret..."
supabase secrets set GROQ_API_KEY="$GROQ_KEY"

echo ""
echo "✅ API key secret set successfully!"
echo ""

# Step 5: Get the Supabase URL
echo "📝 Step 5: Updating your .env file..."
echo ""

# Get Supabase URL
SUPABASE_URL=$(supabase status --output json 2>/dev/null | grep -o '"API URL":"[^"]*"' | cut -d'"' -f4 || echo "")

if [ -z "$SUPABASE_URL" ]; then
    SUPABASE_URL="https://$PROJECT_REF.supabase.co"
fi

echo "Your Supabase URL: $SUPABASE_URL"
echo ""

# Update .env file
cd mobile-app

cat > .env << EOF
# PRODUCTION MODE - Using Supabase Edge Function
VITE_SUPABASE_URL=$SUPABASE_URL

# Local development fallback (comment out for production)
# VITE_USE_DIRECT_API=true
# VITE_GROQ_API_KEY=your-groq-api-key-here
EOF

echo "✅ .env file updated!"
echo ""
cd ..

# Step 6: Test the deployment
echo "🧪 Step 6: Testing the deployed function..."
echo ""
read -p "Press Enter to run a test request..."

RESPONSE=$(curl -s -X POST "$SUPABASE_URL/functions/v1/ai-chat" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Say hello!"}]}')

echo ""
echo "Response from Edge Function:"
echo "$RESPONSE"
echo ""

# Final instructions
echo "===================================="
echo "🎉 Deployment Complete!"
echo "===================================="
echo ""
echo "✅ Edge Function deployed to: $SUPABASE_URL/functions/v1/ai-chat"
echo "✅ API key set as secret: GROQ_API_KEY"
echo "✅ .env file updated with Supabase URL"
echo ""
echo "🔄 Next steps:"
echo "1. Restart your dev server: cd mobile-app && npm run dev"
echo "2. Your app will now use the secure backend!"
echo "3. Check the AI tab - it should say 'Powered by Groq Llama 3.1 (Secure)'"
echo ""
echo "🔒 Your API key is now secure on the backend!"
echo ""
