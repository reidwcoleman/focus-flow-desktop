/**
 * Infinite Campus Proxy Edge Function
 * Bypasses CORS restrictions by proxying requests to Infinite Campus
 * Supports student portal login and grade retrieval
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LoginRequest {
  district: string
  state: string
  username: string
  password: string
}

interface GradesRequest {
  district: string
  state: string
  username: string
  password: string
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

    // Parse body once and pass to handlers
    const body = await req.json()
    const { action } = body

    if (action === 'login') {
      return await handleLogin(body)
    } else if (action === 'getGrades') {
      return await handleGetGrades(body)
    } else {
      throw new Error('Invalid action')
    }
  } catch (error) {
    console.error('Infinite Campus proxy error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function handleLogin(body: any): Promise<Response> {
  const { district, state, username, password }: LoginRequest = body

  // Construct Infinite Campus URL - try multiple patterns
  const districtCode = district.toLowerCase().replace(/\s+/g, '')
  const stateCode = state.toLowerCase()

  // Special handling for known districts
  const knownDistricts: { [key: string]: string } = {
    'wakecounty-nc': 'https://920.ncsis.gov',
    'wake-nc': 'https://920.ncsis.gov',
  }

  const districtKey = `${districtCode}-${stateCode}`

  // Try multiple URL patterns (order matters - most common first)
  const urlPatterns = knownDistricts[districtKey]
    ? [knownDistricts[districtKey]]  // Use known URL first
    : [
        `https://${districtCode}.infinitecampus.org`,                    // Pattern 1: just district
        `https://${stateCode}-${districtCode}.infinitecampus.org`,       // Pattern 2: state-district
        `https://${stateCode}${districtCode}.infinitecampus.org`,        // Pattern 3: stateDistrict
        `https://${districtCode}${stateCode}.infinitecampus.org`,        // Pattern 4: districtState (KY pattern)
      ]

  let baseUrl = ''
  let loginPageHtml = ''
  let lastError = null

  // Try each URL pattern until one works
  for (const testUrl of urlPatterns) {
    try {
      console.log(`📡 Trying: ${testUrl}`)

      // Wake County uses a different path format
      const isWakeCounty = testUrl.includes('ncsis.gov')
      const loginPageUrl = isWakeCounty
        ? `${testUrl}/campus/portal/students/psu920wakeco.jsp`
        : `${testUrl}/campus/portal/students/${districtCode}.jsp`

      const loginPageResponse = await fetch(loginPageUrl)

      if (loginPageResponse.ok) {
        baseUrl = testUrl
        loginPageHtml = await loginPageResponse.text()
        console.log(`✅ Found working URL: ${baseUrl}`)
        break
      }
    } catch (error) {
      lastError = error
      console.log(`❌ Failed: ${testUrl}`)
      continue
    }
  }

  if (!baseUrl || !loginPageHtml) {
    throw new Error(`Could not find valid Infinite Campus URL for ${district}, ${state}. Tried: ${urlPatterns.join(', ')}`)
  }

  try {
    // Extract appName from hidden input
    const appNameMatch = loginPageHtml.match(/name="appName"\s+value="([^"]+)"/)
    const appName = appNameMatch ? appNameMatch[1] : districtCode

    // Determine the correct portal URL
    const isWakeCounty = baseUrl.includes('ncsis.gov')
    const portalUrl = isWakeCounty
      ? `${baseUrl}/campus/portal/students/psu920wakeco.jsp`
      : `${baseUrl}/campus/portal/students/${districtCode}.jsp`

    // Step 2: Perform login POST request
    const loginData = new URLSearchParams({
      username: username,
      password: password,
      appName: appName,
      lang: 'en',
      portalUrl: portalUrl
    })

    const loginResponse = await fetch(`${baseUrl}/campus/verify.jsp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (compatible; FocusFlow/1.0)',
      },
      body: loginData.toString(),
      redirect: 'manual' // Don't follow redirects automatically
    })

    // Check for session cookies
    const cookies = loginResponse.headers.get('set-cookie')

    if (!cookies || loginResponse.status !== 302) {
      throw new Error('Login failed - invalid credentials')
    }

    // Extract session ID from cookies
    const sessionMatch = cookies.match(/JSESSIONID=([^;]+)/)
    const sessionId = sessionMatch ? sessionMatch[1] : null

    if (!sessionId) {
      throw new Error('Login failed - no session created')
    }

    console.log('✅ Login successful, session established')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Login successful',
        sessionId: sessionId,
        baseUrl: baseUrl
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('❌ Login error:', error)
    throw new Error(`Login failed: ${error.message}`)
  }
}

async function handleGetGrades(body: any): Promise<Response> {
  const { district, state, username, password }: GradesRequest = body

  // First, login to get session
  const loginBody = { action: 'login', district, state, username, password }

  const loginResponse = await handleLogin(loginBody)
  const loginData = await loginResponse.json()

  if (!loginData.success || !loginData.sessionId) {
    throw new Error('Failed to establish session')
  }

  const { sessionId, baseUrl } = loginData
  const districtCode = district.toLowerCase().replace(/\s+/g, '')

  try {
    // Fetch grades page
    const gradesUrl = `${baseUrl}/campus/portal/${districtCode}/grades.jsp`

    const gradesResponse = await fetch(gradesUrl, {
      headers: {
        'Cookie': `JSESSIONID=${sessionId}`,
        'User-Agent': 'Mozilla/5.0 (compatible; FocusFlow/1.0)',
      }
    })

    if (!gradesResponse.ok) {
      throw new Error(`Failed to fetch grades: ${gradesResponse.status}`)
    }

    const gradesHtml = await gradesResponse.text()

    // Parse grades from HTML
    const grades = parseGradesFromHtml(gradesHtml)

    console.log(`📊 Found ${grades.length} course grades`)

    return new Response(
      JSON.stringify({
        success: true,
        grades: grades
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('❌ Grades fetch error:', error)
    throw new Error(`Failed to fetch grades: ${error.message}`)
  }
}

function parseGradesFromHtml(html: string): Array<{
  courseName: string
  courseCode: string
  teacher: string
  period: string
  currentScore: number | null
  letterGrade: string | null
}> {
  const grades: Array<any> = []

  try {
    // Parse HTML to extract grade data
    // This is a simplified parser - real implementation would be more robust

    // Look for grade table rows
    const tableRowRegex = /<tr[^>]*class="[^"]*gradeRow[^"]*"[^>]*>(.*?)<\/tr>/gs
    const rows = html.matchAll(tableRowRegex)

    for (const row of rows) {
      const rowHtml = row[1]

      // Extract course name
      const courseNameMatch = rowHtml.match(/<td[^>]*class="[^"]*courseName[^"]*"[^>]*>([^<]+)</)
      const courseName = courseNameMatch ? courseNameMatch[1].trim() : null

      // Extract current grade
      const gradeMatch = rowHtml.match(/<td[^>]*class="[^"]*grade[^"]*"[^>]*>([^<]+)</)
      const gradeText = gradeMatch ? gradeMatch[1].trim() : null

      // Extract percentage
      const percentMatch = rowHtml.match(/(\d+(?:\.\d+)?)\s*%/)
      const percentage = percentMatch ? parseFloat(percentMatch[1]) : null

      if (courseName) {
        grades.push({
          courseName: courseName,
          courseCode: courseName, // Would extract from different field in real implementation
          teacher: '', // Would extract from HTML
          period: '', // Would extract from HTML
          currentScore: percentage,
          letterGrade: gradeText
        })
      }
    }

    // Fallback: If no grades found with structured parsing, try simpler approach
    if (grades.length === 0) {
      // Look for any percentage patterns in the HTML
      const percentMatches = html.matchAll(/([A-Z][a-z\s]+(?:[A-Z][a-z]+)*)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*%\s*\(([A-F][+-]?)\)/g)

      for (const match of percentMatches) {
        grades.push({
          courseName: match[1].trim(),
          courseCode: match[1].trim(),
          teacher: '',
          period: '',
          currentScore: parseFloat(match[2]),
          letterGrade: match[3]
        })
      }
    }
  } catch (error) {
    console.error('Error parsing grades HTML:', error)
  }

  return grades
}
