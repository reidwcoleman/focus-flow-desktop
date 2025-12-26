/**
 * Groq Vision Proxy Edge Function
 * Provides AI vision capabilities to all users using a shared API key
 * Handles OCR, homework scanning, note digitization, and flashcard generation
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GROQ_CONFIG = {
  apiKey: Deno.env.get('GROQ_API_KEY') || '',
  endpoint: 'https://api.groq.com/openai/v1/chat/completions',
  model: 'llama-3.2-90b-vision-preview', // Groq vision model
  maxTokens: 2000,
  temperature: 0.2,
}

interface VisionRequest {
  prompt: string
  base64Image: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify Supabase authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse request body
    const body: VisionRequest = await req.json()
    const { prompt, base64Image } = body

    if (!prompt || !base64Image) {
      throw new Error('Missing prompt or base64Image')
    }

    // Clean base64 image (remove data URL prefix if present)
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '')

    console.log('📤 Calling Groq Vision API for user:', user.id)

    // Call Groq Vision API
    const groqResponse = await fetch(GROQ_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_CONFIG.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${cleanBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: GROQ_CONFIG.maxTokens,
        temperature: GROQ_CONFIG.temperature
      })
    })

    if (!groqResponse.ok) {
      const errorData = await groqResponse.json().catch(() => ({}))
      console.error('❌ Groq API error:', errorData)
      throw new Error(errorData.error?.message || `Groq API error: ${groqResponse.status}`)
    }

    const data = await groqResponse.json()
    const content = data.choices[0].message.content

    console.log('✅ Groq Vision API success')

    return new Response(
      JSON.stringify({
        success: true,
        content: content
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Groq Vision proxy error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
