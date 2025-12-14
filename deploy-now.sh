#!/bin/bash

echo "🚀 Deploying ai-chat Edge Function to Supabase"
echo "=============================================="
echo ""

# Check if already logged in
if supabase projects list &>/dev/null; then
    echo "✅ Already logged in to Supabase"
else
    echo "📝 Opening browser for Supabase login..."
    supabase login
fi

echo ""
echo "🔗 Linking to project uhlgppoylqeiirpfhhqm..."
supabase link --project-ref uhlgppoylqeiirpfhhqm

echo ""
echo "📦 Deploying ai-chat function..."
supabase functions deploy ai-chat --no-verify-jwt

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🎯 Deep Research mode is now live!"
echo "   - Standard Mode: 300 tokens"
echo "   - UltraThink Mode: 8000 tokens (DeepSeek R1)"
echo "   - Deep Research Mode: 12000 tokens (Llama 3.3 70B)"
echo ""
