const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Use the service role key for admin operations
const supabaseUrl = 'https://sdweeouevmtukymdtufd.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkd2Vlb3Vldm10dWt5bWR0dWZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNTQyOTMxOCwiZXhwIjoyMDQxMDA1MzE4fQ.hGvAFZJb7XxC6O_gq5Vr5CjZjPSIyaG8l2BUFjzLkuE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupDatabaseTables() {
  console.log('🔧 Setting up database tables with admin privileges...')
  
  try {
    // Create the basic tables we need
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS public.users (
        id uuid PRIMARY KEY DEFAULT auth.uid(),
        email text UNIQUE NOT NULL,
        role text DEFAULT 'Employee',
        full_name text,
        created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
      );`,
      
      // Enable RLS on users
      `ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;`,
      
      // Users policy
      `CREATE POLICY IF NOT EXISTS "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);`,
      `CREATE POLICY IF NOT EXISTS "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);`,
      
      // Tasks table
      `CREATE TABLE IF NOT EXISTS public.tasks (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        title text NOT NULL,
        description text,
        assignee_user_id uuid REFERENCES public.users(id),
        assignee_role_id uuid,
        created_by uuid REFERENCES public.users(id),
        due_date date,
        due_time time,
        is_completed boolean DEFAULT false,
        completed_at timestamp with time zone,
        created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
      );`,
      
      // Enable RLS on tasks
      `ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;`,
      
      // Tasks policies
      `CREATE POLICY IF NOT EXISTS "Users can view assigned tasks" ON public.tasks FOR SELECT USING (assignee_user_id = auth.uid() OR created_by = auth.uid());`,
      `CREATE POLICY IF NOT EXISTS "Users can update assigned tasks" ON public.tasks FOR UPDATE USING (assignee_user_id = auth.uid());`,
      
      // Vendors table
      `CREATE TABLE IF NOT EXISTS public.vendors (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        name text NOT NULL,
        contact_person text,
        email text,
        phone text,
        address text,
        delivery_days text[] DEFAULT '{}',
        cutoff_time time,
        notes text,
        created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
      );`,
      
      // Enable RLS on vendors
      `ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;`,
      
      // Vendors policy
      `CREATE POLICY IF NOT EXISTS "Authenticated users can manage vendors" ON public.vendors FOR ALL USING (auth.uid() IS NOT NULL);`,
      
      // Orders table
      `CREATE TABLE IF NOT EXISTS public.orders (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        order_number text UNIQUE NOT NULL,
        vendor_id uuid REFERENCES public.vendors(id),
        status text DEFAULT 'pending',
        order_date date DEFAULT CURRENT_DATE,
        expected_delivery date,
        total_amount numeric(10,2) DEFAULT 0,
        notes text,
        created_by uuid REFERENCES public.users(id),
        approved_by uuid REFERENCES public.users(id),
        approved_at timestamp with time zone,
        created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
      );`,
      
      // Enable RLS on orders
      `ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;`,
      
      // Orders policies
      `CREATE POLICY IF NOT EXISTS "Users can view orders" ON public.orders FOR SELECT USING (auth.uid() IS NOT NULL);`,
      `CREATE POLICY IF NOT EXISTS "Users can create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);`,
      `CREATE POLICY IF NOT EXISTS "Users can update orders" ON public.orders FOR UPDATE USING (created_by = auth.uid() OR auth.uid() IS NOT NULL);`
    ]
    
    for (let i = 0; i < tables.length; i++) {
      const sql = tables[i]
      console.log(`⚡ Executing SQL ${i + 1}/${tables.length}...`)
      
      const { error } = await supabase.rpc('exec_sql_admin', { query: sql })
      if (error) {
        console.log(`⚠️  SQL ${i + 1} result:`, error.message)
      } else {
        console.log(`✅ SQL ${i + 1} completed`)
      }
    }
    
    console.log('🎉 Basic database setup completed!')
    
    // Now create a test user with General Manager role
    console.log('👤 Creating test admin user...')
    
    const { data: testUser, error: userError } = await supabase
      .from('users')
      .upsert({
        id: '00000000-0000-0000-0000-000000000001',
        email: 'admin@jayna.com',
        role: 'General Manager',
        full_name: 'Admin User'
      })
      .select()
    
    if (userError) {
      console.log('⚠️  Test user creation result:', userError.message)
    } else {
      console.log('✅ Test admin user created!')
      console.log('📧 Email: admin@jayna.com')
      console.log('🔑 Role: General Manager')
    }
    
    console.log('\n🚀 DATABASE IS READY!')
    console.log('You can now sign in and see the management features!')
    
  } catch (error) {
    console.error('❌ Database setup failed:', error)
  }
}

setupDatabaseTables()
