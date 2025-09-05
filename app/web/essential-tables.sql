-- Essential tables for JAYNA GYRO management system

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  email text UNIQUE NOT NULL,
  role text DEFAULT 'Employee',
  full_name text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "General managers can manage users" ON public.users;
CREATE POLICY "General managers can manage users" ON public.users FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role IN ('General Manager')
    )
);

-- Create vendors table
CREATE TABLE IF NOT EXISTS public.vendors (
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
);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Authenticated users can manage vendors" ON public.vendors FOR ALL USING (auth.uid() IS NOT NULL);

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
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
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view orders" ON public.orders FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY IF NOT EXISTS "Users can create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY IF NOT EXISTS "Users can update orders" ON public.orders FOR UPDATE USING (created_by = auth.uid() OR auth.uid() IS NOT NULL);

-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
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
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view assigned tasks" ON public.tasks FOR SELECT USING (assignee_user_id = auth.uid() OR created_by = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can update assigned tasks" ON public.tasks FOR UPDATE USING (assignee_user_id = auth.uid());

-- Insert sample data
INSERT INTO public.vendors (name, contact_person, email, phone) VALUES 
('Test Vendor', 'John Doe', 'john@testvendor.com', '555-0123')
ON CONFLICT DO NOTHING;
