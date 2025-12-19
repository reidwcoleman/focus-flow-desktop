/**
 * Canvas API Test Script
 * Tests if the Canvas API integration can fetch assignments
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://uhlgppoylqeiirpfhhqm.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobGdwcG95bHFlaWlycGZoaHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMDI4OTEsImV4cCI6MjA4MDg3ODg5MX0.DCW8hcNJ-6Aq_nxt05IU6ogOb69V-oqUNnNhnKiaSvw'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testCanvasAPI() {
  console.log('🔍 Testing Canvas API Integration...\n')

  try {
    // 1. Check if user is logged in
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ Not logged in. Please log in to the app first.')
      return
    }

    console.log(`✅ Logged in as: ${user.email}`)

    // 2. Get user's Canvas credentials from profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('canvas_url, canvas_token')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('❌ Failed to get profile:', profileError.message)
      return
    }

    if (!profile?.canvas_url || !profile?.canvas_token) {
      console.error('❌ Canvas credentials not configured. Please set them in Account settings.')
      return
    }

    console.log(`✅ Canvas URL: ${profile.canvas_url}`)
    console.log(`✅ Canvas Token: ${profile.canvas_token.substring(0, 10)}...\n`)

    // 3. Test Canvas API by fetching user info
    console.log('📡 Testing Canvas connection (fetching user info)...')
    const userResponse = await fetch(`${SUPABASE_URL}/functions/v1/canvas-proxy`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'canvas-url': profile.canvas_url,
        'canvas-token': profile.canvas_token,
        'canvas-endpoint': '/users/self',
      }
    })

    if (!userResponse.ok) {
      const errorText = await userResponse.text()
      console.error(`❌ Canvas API error (${userResponse.status}):`, errorText)
      return
    }

    const userData = await userResponse.json()
    console.log(`✅ Connected to Canvas as: ${userData.name}\n`)

    // 4. Fetch courses
    console.log('📚 Fetching courses...')
    const coursesResponse = await fetch(`${SUPABASE_URL}/functions/v1/canvas-proxy`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'canvas-url': profile.canvas_url,
        'canvas-token': profile.canvas_token,
        'canvas-endpoint': '/courses?enrollment_state=active&per_page=100',
      }
    })

    if (!coursesResponse.ok) {
      const errorText = await coursesResponse.text()
      console.error(`❌ Failed to fetch courses (${coursesResponse.status}):`, errorText)
      return
    }

    const courses = await coursesResponse.json()
    console.log(`✅ Found ${courses.length} courses:`)
    courses.forEach(course => {
      console.log(`   - ${course.name} (ID: ${course.id})`)
    })

    // 5. Fetch assignments for each course
    console.log('\n📝 Fetching assignments...')
    let totalAssignments = 0

    for (const course of courses.slice(0, 3)) { // Test first 3 courses
      console.log(`\n   Course: ${course.name}`)

      const assignmentsResponse = await fetch(`${SUPABASE_URL}/functions/v1/canvas-proxy`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
          'canvas-url': profile.canvas_url,
          'canvas-token': profile.canvas_token,
          'canvas-endpoint': `/courses/${course.id}/assignments?include[]=submission&per_page=100`,
        }
      })

      if (!assignmentsResponse.ok) {
        console.log(`   ⚠️  Failed to fetch assignments for ${course.name}`)
        continue
      }

      const assignments = await assignmentsResponse.json()
      console.log(`   ✅ Found ${assignments.length} assignments`)

      assignments.slice(0, 3).forEach(assignment => {
        console.log(`      - ${assignment.name} (Due: ${assignment.due_at || 'No due date'})`)
      })

      totalAssignments += assignments.length
    }

    console.log(`\n🎉 Success! Total assignments found: ${totalAssignments}`)
    console.log('\n✨ Canvas API integration is working correctly!')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error(error)
  }
}

testCanvasAPI()
