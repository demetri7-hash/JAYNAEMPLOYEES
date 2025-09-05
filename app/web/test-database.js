const { createClient } = require('@supabase/supabase-js')

// Read environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDatabase() {
  try {
    console.log('🔍 Testing database connection...')
    
    // Test basic connection
    const { data: authTest, error: authError } = await supabase.auth.getSession()
    console.log('🔐 Auth connection:', authError ? 'Failed' : 'Success')
    
    // Check existing tables
    console.log('📊 Checking existing tables...')
    
    // Test users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
    
    if (usersError) {
      console.log('❌ Users table not found:', usersError.message)
    } else {
      console.log('✅ Users table exists')
    }
    
    // Test roles table
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('*')
      .limit(1)
    
    if (rolesError) {
      console.log('❌ Roles table not found:', rolesError.message)
    } else {
      console.log('✅ Roles table exists')
    }
    
    // Test vendors table (new table)
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('*')
      .limit(1)
    
    if (vendorsError) {
      console.log('❌ Vendors table not found:', vendorsError.message)
      console.log('📝 This table needs to be created manually in Supabase dashboard')
    } else {
      console.log('✅ Vendors table exists')
    }
    
    // Test orders table (new table)
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .limit(1)
    
    if (ordersError) {
      console.log('❌ Orders table not found:', ordersError.message)
      console.log('📝 This table needs to be created manually in Supabase dashboard')
    } else {
      console.log('✅ Orders table exists')
    }
    
    console.log('\n🚀 NEXT STEPS:')
    console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/sdweeouevmtukymdtufd')
    console.log('2. Navigate to the SQL Editor')
    console.log('3. Copy and paste the contents of database-setup.sql')
    console.log('4. Run the SQL to create all tables')
    console.log('5. Come back and test the application')
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message)
  }
}

testDatabase()
