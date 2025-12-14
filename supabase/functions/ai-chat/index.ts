// Supabase Edge Function for AI Chat
// This proxies requests to Groq API, keeping your API key secure

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
}

interface ChatRequest {
  messages: ChatMessage[]
  systemPrompt?: string
  useVision?: boolean
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Groq API key from environment
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY not configured in Supabase secrets')
    }

    // Optional: Verify user is authenticated
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Uncomment to require authentication:
    // const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    // if (authError || !user) {
    //   return new Response(
    //     JSON.stringify({ error: 'Unauthorized' }),
    //     { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    //   )
    // }

    // Parse request body
    const { messages, systemPrompt, useVision }: ChatRequest = await req.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: messages array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build messages array for Groq
    const groqMessages: ChatMessage[] = []

    // Add system prompt if provided
    if (systemPrompt) {
      groqMessages.push({
        role: 'system',
        content: systemPrompt,
      })
    }

    // Add conversation messages
    groqMessages.push(...messages)

    // Select model based on whether vision is needed (same model as scanner feature)
    const model = useVision ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.3-70b-versatile'
    const maxTokens = useVision ? 800 : 300 // More tokens for vision responses

    console.log('🔍 Using model:', model, 'Vision:', useVision)

    // Call Groq API
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: groqMessages,
        temperature: 0.7,
        max_tokens: maxTokens,
        top_p: 1,
      }),
    })

    if (!groqResponse.ok) {
      const errorData = await groqResponse.json()
      console.error('Groq API error:', errorData)

      return new Response(
        JSON.stringify({
          error: 'AI service error',
          details: errorData.error?.message || 'Unknown error'
        }),
        { status: groqResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get response from Groq
    const groqData = await groqResponse.json()
    const aiMessage = groqData.choices[0]?.message?.content || 'Sorry, I could not generate a response.'

    // Return AI response
    return new Response(
      JSON.stringify({
        message: aiMessage,
        usage: groqData.usage, // Optional: include token usage
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
