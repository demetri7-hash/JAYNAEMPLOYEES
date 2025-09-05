-- Quick setup for JAYNA GYRO - Copy and paste this into Supabase SQL Editor

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  email text UNIQUE NOT NULL,
  role text DEFAULT 'Employee',
  full_name text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create basic policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Create vendors table for ordering system
CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  delivery_days text[] DEFAULT '{}',
  cutoff_time time,
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage vendors" ON public.vendors;
CREATE POLICY "Authenticated users can manage vendors" ON public.vendors FOR ALL USING (auth.uid() IS NOT NULL);

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number text UNIQUE NOT NULL,
  vendor_id uuid REFERENCES public.vendors(id),
  status text DEFAULT 'pending',
  order_date date DEFAULT CURRENT_DATE,
  total_amount numeric(10,2) DEFAULT 0,
  notes text,
  created_by uuid REFERENCES public.users(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage orders" ON public.orders;
CREATE POLICY "Users can manage orders" ON public.orders FOR ALL USING (auth.uid() IS NOT NULL);

-- Insert test data
INSERT INTO public.vendors (name, contact_person, email) VALUES 
('Test Vendor', 'John Doe', 'john@test.com')
ON CONFLICT DO NOTHING;

-- Success message
SELECT 'Database setup completed! You can now use all management features!' as message;
