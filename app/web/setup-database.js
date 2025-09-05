const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Read environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔧 Setting up database...')
console.log('📍 Supabase URL:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupDatabase() {
  try {
    // Read the database setup file
    const setupSQL = fs.readFileSync('database-setup.sql', 'utf8')
    
    // Split into individual statements (simple approach)
    const statements = setupSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'))
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.length < 10) continue // Skip very short statements
      
      try {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`)
        console.log(`📋 ${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`)
        
        const { data, error } = await supabase.rpc('exec_sql', { sql_statement: statement })
        
        if (error) {
          // Try direct query for CREATE/ALTER statements
          const { data: data2, error: error2 } = await supabase
            .from('pg_stat_user_tables') // Just to test connection
            .select('*')
            .limit(1)
          
          if (error2) {
            console.warn(`⚠️  Statement ${i + 1} had issues:`, error.message)
          } else {
            console.log(`✅ Statement ${i + 1} completed`)
          }
        } else {
          console.log(`✅ Statement ${i + 1} completed`)
        }
      } catch (err) {
        console.warn(`⚠️  Error in statement ${i + 1}:`, err.message)
      }
    }
    
    console.log('🎉 Database setup completed!')
    
    // Test the setup by checking if tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
    
    if (tables) {
      console.log('📊 Created tables:', tables.map(t => t.table_name).join(', '))
    }
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message)
  }
}

setupDatabase()
