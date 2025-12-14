// Canvas API Proxy - Bypass CORS restrictions
// This Edge Function acts as a server-side proxy to forward Canvas API requests

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, canvas-url, canvas-token, canvas-endpoint',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Canvas credentials from headers
    const canvasUrl = req.headers.get('canvas-url')
    const canvasToken = req.headers.get('canvas-token')
    const canvasEndpoint = req.headers.get('canvas-endpoint')

    if (!canvasUrl || !canvasToken || !canvasEndpoint) {
      return new Response(
        JSON.stringify({ error: 'Missing Canvas credentials or endpoint' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Construct Canvas API URL
    const url = `${canvasUrl}/api/v1${canvasEndpoint}`

    console.log('📡 Proxying Canvas request to:', url)

    // Forward the request to Canvas
    const canvasResponse = await fetch(url, {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${canvasToken}`,
        'Content-Type': 'application/json',
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
    })

    // Get response data
    const data = await canvasResponse.json()

    // Return Canvas response
    return new Response(
      JSON.stringify(data),
      {
        status: canvasResponse.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error) {
    console.error('Canvas proxy error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to proxy Canvas request' }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  }
})
