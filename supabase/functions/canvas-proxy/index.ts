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

    console.log('📡 Proxying Canvas request:', {
      url,
      method: req.method,
      tokenPreview: canvasToken.substring(0, 10) + '...',
      tokenLength: canvasToken.length,
      endpoint: canvasEndpoint
    })

    // Forward the request to Canvas
    // Canvas API accepts tokens in Authorization header as "Bearer <token>"
    const canvasResponse = await fetch(url, {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${canvasToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
    })

    console.log('📊 Canvas response:', {
      status: canvasResponse.status,
      statusText: canvasResponse.statusText,
      contentType: canvasResponse.headers.get('content-type')
    })

    // Handle Canvas response
    let data
    const contentType = canvasResponse.headers.get('content-type')

    try {
      if (contentType && contentType.includes('application/json')) {
        data = await canvasResponse.json()
      } else {
        // Canvas returned non-JSON (HTML error page, etc.)
        const text = await canvasResponse.text()
        console.error('⚠️ Canvas returned non-JSON response:', text.substring(0, 200))

        if (!canvasResponse.ok) {
          // Return helpful error based on status code
          let errorMessage = 'Canvas API request failed'
          if (canvasResponse.status === 401) {
            errorMessage = 'Invalid Canvas access token. Please check that your token is correct and has not expired.'
          } else if (canvasResponse.status === 403) {
            errorMessage = 'Access denied. Your Canvas token may not have the required permissions.'
          } else if (canvasResponse.status === 404) {
            errorMessage = 'Canvas endpoint not found. Please check your Canvas URL is correct (e.g., https://school.instructure.com)'
          }

          return new Response(
            JSON.stringify({
              error: errorMessage,
              status: canvasResponse.status,
              details: text.substring(0, 200)
            }),
            {
              status: canvasResponse.status,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          )
        }

        data = { message: text }
      }
    } catch (parseError) {
      console.error('Failed to parse Canvas response:', parseError)
      return new Response(
        JSON.stringify({
          error: 'Failed to parse Canvas API response',
          details: parseError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

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
