-- Database Schema for Jayna Gyro Employee Management System
-- Run this in your Supabase SQL Editor

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email text,
  name text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create roles table
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create user_roles table (junction table)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role_id uuid REFERENCES public.roles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, role_id)
);

-- Task Templates table
CREATE TABLE task_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  default_role VARCHAR(50),
  default_due_time TIME,
  default_notes TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern VARCHAR(50), -- 'daily', 'weekly', 'monthly'
  points_value INTEGER DEFAULT 0,
  photo_required BOOLEAN DEFAULT false,
  notes_required BOOLEAN DEFAULT false,
  completion_percentage_required BOOLEAN DEFAULT true,
  is_transferable BOOLEAN DEFAULT false,
  transferable_to_roles TEXT[], -- Array of role names that can receive transfers
  can_be_edited_by_roles TEXT[], -- Array of roles that can edit this task type
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task Instances table (actual assigned tasks)
CREATE TABLE task_instances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES task_templates(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATE,
  due_time TIME,
  is_completed BOOLEAN DEFAULT false,
  completion_percentage INTEGER DEFAULT 0, -- 0, 25, 50, 75, 100
  completed_at TIMESTAMP WITH TIME ZONE,
  completion_notes TEXT,
  completion_photo_url TEXT,
  priority INTEGER DEFAULT 1,
  points_value INTEGER DEFAULT 0,
  photo_required BOOLEAN DEFAULT false,
  notes_required BOOLEAN DEFAULT false,
  completion_percentage_required BOOLEAN DEFAULT true,
  is_transferable BOOLEAN DEFAULT false,
  transferable_to_roles TEXT[],
  can_be_edited_by_roles TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task Transfers table
CREATE TABLE task_transfers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES task_instances(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  transfer_reason TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  response_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Task Photos table
CREATE TABLE task_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES task_instances(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  upload_type VARCHAR(20) DEFAULT 'completion', -- 'completion', 'progress', 'reference'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Points table (for rewards system)
CREATE TABLE user_points (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  points_earned INTEGER DEFAULT 0,
  points_spent INTEGER DEFAULT 0,
  current_balance INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Point Transactions table
CREATE TABLE point_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  task_id UUID REFERENCES task_instances(id) ON DELETE SET NULL,
  points INTEGER NOT NULL,
  transaction_type VARCHAR(20) NOT NULL, -- 'earned', 'spent', 'bonus', 'penalty'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create task_instances table
CREATE TABLE IF NOT EXISTS public.task_instances (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  notes text,
  for_date date NOT NULL,
  due_at timestamp with time zone,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  completed_at timestamp with time zone,
  completion_reason text,
  assignee_user_id uuid REFERENCES public.profiles(id),
  assignee_role_id uuid REFERENCES public.roles(id),
  template_id uuid REFERENCES public.task_templates(id),
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create daily_reports table
CREATE TABLE IF NOT EXISTS public.daily_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  report_type text NOT NULL,
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default roles
INSERT INTO public.roles (name, description) VALUES
  ('general_manager', 'General Manager - Full system access'),
  ('assistant_manager', 'Assistant Manager - Front of house management'),
  ('kitchen_manager', 'Kitchen Manager - Kitchen operations'),
  ('ordering_manager', 'Ordering Manager - Inventory and ordering'),
  ('server', 'Server - Customer service'),
  ('cashier', 'Cashier - Point of sale operations'),
  ('host', 'Host - Customer greeting and seating'),
  ('barista', 'Barista - Coffee and beverage preparation'),
  ('opening_line_cook', 'Opening Line Cook - Morning kitchen prep'),
  ('lead_prep_cook', 'Lead Prep Cook - Food preparation leadership'),
  ('opening_prep_cook', 'Opening Prep Cook - Morning food prep'),
  ('transition_line_cook', 'Transition Line Cook - Shift transition'),
  ('closing_line_cook', 'Closing Line Cook - Evening kitchen operations')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

-- Create policies (basic access for authenticated users)
CREATE POLICY "Enable read access for authenticated users" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON public.roles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON public.user_roles
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON public.task_templates
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON public.task_instances
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON public.daily_reports
  FOR ALL USING (auth.role() = 'authenticated');

-- Create update policy for profiles
CREATE POLICY "Enable update for users based on user_id" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users" ON public.profiles
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
