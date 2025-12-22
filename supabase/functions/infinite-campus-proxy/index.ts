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
  lunchNumber: string
  username: string
  password: string
}

interface GradesRequest {
  lunchNumber: string
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
  const { lunchNumber, username, password }: LoginRequest = body

  // NCEdCloud authentication flow for Wake County
  console.log('🔐 Starting NCEdCloud authentication...')
  console.log(`📋 Lunch Number: ${lunchNumber}, Username: ${username}`)

  const ncedcloudLoginUrl = 'https://my.ncedcloud.org'
  const infiniteCampusUrl = 'https://920.ncsis.gov'

  try {
    // For Wake County, we need to use the standard username/password login
    // NCEdCloud SSO requires too many browser-specific steps
    console.log('🔑 Step 1: Logging in with username/password...')

    // Try direct login using standard IC credentials
    const loginUrl = `${infiniteCampusUrl}/campus/verify.jsp`
    const loginData = new URLSearchParams({
      username: username,
      password: password,
      appName: 'psu920wakeco'
      // Note: NOT using nonBrowser=true for login, only for API requests
    })

    const loginResponse = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': `${infiniteCampusUrl}/campus/portal/students/psu920wakeco.jsp`
      },
      body: loginData.toString(),
      redirect: 'manual'
    })

    console.log(`🔑 Login response status: ${loginResponse.status}`)

    const cookies = loginResponse.headers.get('set-cookie')
    console.log(`🍪 Cookies received: ${cookies ? 'Yes' : 'No'}`)

    if (!cookies || loginResponse.status !== 302) {
      const responseText = await loginResponse.text()
      console.error(`❌ Login failed - Status: ${loginResponse.status}`)
      console.error(`Response preview: ${responseText.substring(0, 500)}`)
      throw new Error('❌ Invalid username or password. Please check your credentials.')
    }

    // Extract session cookies
    let icCookies = cookies.split(',').map(c => c.split(';')[0]).join('; ')
    console.log(`🍪 Session cookies: ${icCookies.substring(0, 100)}...`)

    // Follow redirect to complete login
    let currentUrl = loginResponse.headers.get('location')
    console.log(`🔄 Following redirect: ${currentUrl}...`)

    // Follow up to 5 redirects to complete the SAML authentication flow
    for (let i = 0; i < 5 && currentUrl; i++) {
      const fullUrl = currentUrl.startsWith('http') ? currentUrl : `${infiniteCampusUrl}${currentUrl}`
      console.log(`🔄 Step ${i + 2}: Following redirect ${i + 1}/5: ${fullUrl.substring(0, 100)}...`)

      const redirectResp = await fetch(fullUrl, {
        headers: {
          'Cookie': icCookies,
          'User-Agent': 'Mozilla/5.0 (compatible; FocusFlow/1.0)',
        },
        redirect: 'manual'
      })

      console.log(`🔄 Redirect ${i + 1} response status: ${redirectResp.status}`)

      // Capture any new cookies
      const newCookies = redirectResp.headers.get('set-cookie')
      if (newCookies) {
        const additionalCookies = newCookies.split(',').map(c => c.split(';')[0]).join('; ')
        icCookies = `${icCookies}; ${additionalCookies}`
        console.log(`🍪 Got new cookies from redirect ${i + 1}`)
      }

      // Check for next redirect
      currentUrl = redirectResp.headers.get('location')

      // If status is 200, we've reached the final destination
      if (redirectResp.status === 200) {
        console.log(`✅ Reached final authenticated page after ${i + 1} redirects`)
        break
      }
    }

    console.log('✅ NCEdCloud + IC authentication successful!')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Login successful via NCEdCloud',
        sessionId: icCookies,
        baseUrl: infiniteCampusUrl
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
  const { lunchNumber, username, password }: GradesRequest = body

  // First, login to get session via NCEdCloud
  const loginBody = { action: 'login', lunchNumber, username, password }

  const loginResponse = await handleLogin(loginBody)
  const loginData = await loginResponse.json()

  if (!loginData.success || !loginData.sessionId) {
    throw new Error('Failed to establish NCEdCloud session')
  }

  const { sessionId, baseUrl } = loginData

  try {
    console.log('📊 Step 1: Attempting to fetch grades from JSON API...')

    // Primary approach: Try JSON API endpoint first
    const jsonGradesUrl = `${baseUrl}/campus/resources/portal/grades`

    const jsonResponse = await fetch(jsonGradesUrl, {
      headers: {
        'Cookie': sessionId,  // sessionId now contains all cookies
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; FocusFlow/1.0)',
      }
    })

    console.log(`📊 JSON API response status: ${jsonResponse.status}`)
    const contentType = jsonResponse.headers.get('content-type')
    console.log(`📊 Content-Type: ${contentType}`)

    if (jsonResponse.ok && contentType?.includes('application/json')) {
      // Successfully got JSON response
      const gradesData = await jsonResponse.json()
      console.log(`📊 JSON data received (${JSON.stringify(gradesData).length} chars)`)
      console.log(`📊 JSON preview: ${JSON.stringify(gradesData).substring(0, 500)}`)

      const grades = parseGradesFromJson(gradesData)

      if (grades.length > 0) {
        console.log(`✅ Successfully parsed ${grades.length} grades from JSON API`)
        console.log(`📊 Sample grade: ${JSON.stringify(grades[0])}`)

        return new Response(
          JSON.stringify({ success: true, grades }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        console.log('⚠️ JSON API returned 0 grades, falling back to HTML parsing...')
      }
    } else {
      console.log(`⚠️ JSON API not available (status: ${jsonResponse.status}, content-type: ${contentType})`)
      console.log('📄 Falling back to HTML parsing...')
    }

    // Fallback: Try HTML scraping from various paths
    const isWakeCounty = baseUrl.includes('ncsis.gov')
    const gradePaths = isWakeCounty ? [
      `${baseUrl}/campus/portal/students/psu920wakeco.jsp`,  // Main authenticated student portal
      `${baseUrl}/campus/resources/portal/grades`,  // Same as JSON endpoint but may return HTML
      `${baseUrl}/campus/nav-wrapper/grades/report/card`,
      `${baseUrl}/campus/portal/portal.xsl?x=resource.PortletResourceManager.Grades`,
    ] : [`${baseUrl}/campus/portal/${districtCode}/grades.jsp`]

    let gradesHtml = ''
    let gradesUrl = ''

    for (const testPath of gradePaths) {
      console.log(`📊 Trying HTML path: ${testPath}`)

      const gradesResponse = await fetch(testPath, {
        headers: {
          'Cookie': sessionId,
          'User-Agent': 'Mozilla/5.0 (compatible; FocusFlow/1.0)',
        }
      })

      console.log(`📊 HTML response status for ${testPath}: ${gradesResponse.status}`)

      if (gradesResponse.ok) {
        gradesHtml = await gradesResponse.text()
        gradesUrl = testPath
        console.log(`✅ Found working HTML URL: ${gradesUrl}`)
        break
      } else {
        console.log(`❌ Failed - Status: ${gradesResponse.status}`)
      }
    }

    if (!gradesHtml) {
      console.error(`❌ All grades paths failed. Tried: ${gradePaths.join(', ')}`)
      throw new Error(`Failed to fetch grades: No valid grades path found`)
    }

    // Parse grades from HTML
    console.log(`📄 HTML length: ${gradesHtml.length} characters`)
    console.log(`📄 HTML preview: ${gradesHtml.substring(0, 1000)}`)

    const grades = parseGradesFromHtml(gradesHtml)

    console.log(`📊 Found ${grades.length} course grades from HTML`)
    if (grades.length > 0) {
      console.log(`📊 Sample grade: ${JSON.stringify(grades[0])}`)
    } else {
      console.error('⚠️ WARNING: 0 grades found! Both JSON and HTML parsing failed.')
      console.error(`⚠️ HTML length: ${gradesHtml.length}`)
      console.error(`⚠️ HTML contains "grade": ${gradesHtml.toLowerCase().includes('grade')}`)
      console.error(`⚠️ HTML contains "class": ${gradesHtml.toLowerCase().includes('class')}`)
      console.error(`⚠️ HTML contains "score": ${gradesHtml.toLowerCase().includes('score')}`)
      console.error(`⚠️ First 2000 chars: ${gradesHtml.substring(0, 2000)}`)
    }

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

/**
 * Parse grades from JSON response (preferred method)
 */
function parseGradesFromJson(data: any): Array<{
  courseName: string
  courseCode: string
  teacher: string
  period: string
  currentScore: number | null
  letterGrade: string | null
}> {
  const grades: Array<any> = []

  try {
    console.log('📊 Parsing grades from JSON data...')

    // Handle nested structure: data -> schools -> terms -> courses
    const items = Array.isArray(data) ? data : (data.grades || data.terms || [data])

    for (const item of items) {
      const schools = item.schools || [item]
      for (const school of schools) {
        const terms = school.terms || [school]
        for (const term of terms) {
          const courses = term.courses || term.sections || [term]
          for (const course of courses) {
            const courseName = course.courseName || course.name || course.sectionName || ''

            if (courseName) {
              grades.push({
                courseName,
                courseCode: course.courseNumber || course.courseId || '',
                teacher: course.teacherDisplay || course.teacher || '',
                period: course.sectionNumber || course.period || '',
                currentScore: extractScore(course),
                letterGrade: extractLetterGrade(course)
              })
            }
          }
        }
      }
    }

    console.log(`✅ Parsed ${grades.length} courses from JSON`)
  } catch (error) {
    console.error('❌ Error parsing grades JSON:', error)
  }

  return grades
}

/**
 * Extract score percentage from various possible locations in course object
 */
function extractScore(course: any): number | null {
  return course.score?.percent ?? course.percent ??
         course.grade?.percent ?? course.progressGrade?.percent ??
         course.finalGrade?.percent ?? null
}

/**
 * Extract letter grade from various possible locations in course object
 */
function extractLetterGrade(course: any): string | null {
  return course.score?.letterGrade ?? course.letterGrade ??
         course.grade?.letter ?? course.finalGrade?.letter ?? null
}

/**
 * Parse grades from HTML response (fallback method)
 */
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
    console.log('📊 Parsing grades from HTML (fallback)...')

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

    // Fallback: If no grades found with structured parsing, try broader patterns
    if (grades.length === 0) {
      console.log('⚠️ No grades found with standard parsing, trying fallback patterns...')

      // Try multiple patterns for different Infinite Campus HTML structures
      const patterns = [
        // Pattern 1: Standard format with percentage and letter grade
        /([A-Z][a-z\s]+(?:[A-Z][a-z]+)*)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*%\s*\(([A-F][+-]?)\)/g,
        // Pattern 2: Just percentage
        /<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>(\d+(?:\.\d+)?)\s*%<\/td>/g,
        // Pattern 3: Course name and grade in adjacent cells
        /<td[^>]*class="[^"]*course[^"]*"[^>]*>([^<]+)<\/td>[\s\S]*?<td[^>]*>([A-F][+-]?|\d+(?:\.\d+)?%?)<\/td>/gi,
      ]

      for (const pattern of patterns) {
        const matches = html.matchAll(pattern)
        for (const match of matches) {
          const courseName = match[1]?.trim()
          const gradeValue = match[2]?.trim()
          const letterGrade = match[3]?.trim() || null

          if (courseName && gradeValue) {
            // Parse percentage if it exists
            const percentMatch = gradeValue.match(/(\d+(?:\.\d+)?)/)
            const percentage = percentMatch ? parseFloat(percentMatch[1]) : null

            grades.push({
              courseName: courseName,
              courseCode: courseName,
              teacher: '',
              period: '',
              currentScore: percentage,
              letterGrade: letterGrade || (gradeValue.match(/[A-F][+-]?/) ? gradeValue : null)
            })
          }
        }
        if (grades.length > 0) break
      }
    }

    console.log(`${grades.length > 0 ? '✅' : '❌'} Parsed ${grades.length} courses from HTML`)
  } catch (error) {
    console.error('Error parsing grades HTML:', error)
  }

  return grades
}
