#!/bin/bash

echo "🚀 Deploying AI Vision Edge Function to Supabase"
echo "================================================"
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo "📦 Install it with: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if logged in
echo "🔐 Checking Supabase authentication..."
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase"
    echo "🔑 Please log in:"
    supabase login

    if [ $? -ne 0 ]; then
        echo "❌ Login failed"
        exit 1
    fi
fi

echo "✅ Logged in to Supabase"
echo ""

# Deploy the edge function
echo "📤 Deploying ai-chat edge function..."
supabase functions deploy ai-chat --project-ref uhlgppoylqeiirpfhhqm

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed"
    exit 1
fi

echo ""
echo "✅ Edge function deployed successfully!"
echo ""

# Check if GROQ_API_KEY secret is set
echo "🔍 Checking for GROQ_API_KEY secret..."
if ! supabase secrets list --project-ref uhlgppoylqeiirpfhhqm | grep -q "GROQ_API_KEY"; then
    echo "⚠️  GROQ_API_KEY secret not found!"
    echo ""
    echo "📝 To set your Groq API key:"
    echo "   1. Get your key from: https://console.groq.com/keys"
    echo "   2. Run: supabase secrets set GROQ_API_KEY=your_key_here --project-ref uhlgppoylqeiirpfhhqm"
    echo ""
else
    echo "✅ GROQ_API_KEY secret is set"
fi

echo ""
echo "================================================"
echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Make sure GROQ_API_KEY secret is configured (see above)"
echo "2. Test the scanner by taking a photo of homework/notes"
echo "3. The AI will now actually read and analyze your images!"
echo ""
echo "Edge Function URL:"
echo "https://uhlgppoylqeiirpfhhqm.supabase.co/functions/v1/ai-chat"
echo "================================================"
