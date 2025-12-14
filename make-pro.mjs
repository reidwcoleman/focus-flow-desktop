import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from mobile-app/.env
dotenv.config({ path: path.join(__dirname, 'mobile-app', '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function makePro() {
  try {
    console.log('Setting reidwcoleman@gmail.com as pro user...')

    // Calculate expiry date (1 year from now)
    const expiryDate = new Date()
    expiryDate.setFullYear(expiryDate.getFullYear() + 1)

    // Update user profile
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        is_pro: true,
        pro_expires_at: expiryDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('email', 'reidwcoleman@gmail.com')
      .select()

    if (error) {
      console.error('Error:', error)
      process.exit(1)
    }

    if (data && data.length > 0) {
      console.log('✅ Success! User is now pro:')
      console.log(JSON.stringify(data[0], null, 2))
    } else {
      console.log('⚠️  No user profile found for reidwcoleman@gmail.com')
      console.log('Please sign in to the app first to create your profile.')
    }
  } catch (err) {
    console.error('Unexpected error:', err)
    process.exit(1)
  }
}

makePro()
