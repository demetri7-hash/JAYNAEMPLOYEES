-- Enhanced Database Schema for Jayna Restaurant Management System
-- Includes all original functionality PLUS task transfers, rewards, photo requirements, etc.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text UNIQUE NOT NULL,
  full_name text,
  phone text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Roles table 
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- User Roles table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id uuid REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, role_id)
);

-- Enhanced Task Templates table
CREATE TABLE IF NOT EXISTS public.task_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  default_role_id uuid REFERENCES public.roles(id),
  default_due_time time,
  default_notes text,
  is_recurring boolean DEFAULT false,
  recurrence_pattern text, -- 'daily', 'weekly', 'monthly'
  points_value integer DEFAULT 0,
  photo_required boolean DEFAULT false,
  notes_required boolean DEFAULT false,
  completion_percentage_required boolean DEFAULT true,
  is_transferable boolean DEFAULT false,
  transferable_to_roles text[], -- Array of role names
  can_be_edited_by_roles text[], -- Array of role names that can edit this task type
  priority_level integer DEFAULT 1, -- 1=low, 2=medium, 3=high, 4=urgent
  estimated_duration_minutes integer DEFAULT 30,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enhanced Task Instances table (actual assigned tasks)
CREATE TABLE IF NOT EXISTS public.task_instances (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid REFERENCES public.task_templates(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  notes text,
  for_date date NOT NULL,
  due_at timestamp with time zone,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  completion_percentage integer DEFAULT 0 CHECK (completion_percentage IN (0, 25, 50, 75, 100)),
  completed_at timestamp with time zone,
  completion_notes text,
  completion_photo_url text,
  assignee_user_id uuid REFERENCES public.profiles(id),
  assignee_role_id uuid REFERENCES public.roles(id),
  created_by uuid REFERENCES public.profiles(id),
  points_value integer DEFAULT 0,
  photo_required boolean DEFAULT false,
  notes_required boolean DEFAULT false,
  completion_percentage_required boolean DEFAULT true,
  is_transferable boolean DEFAULT false,
  transferable_to_roles text[],
  can_be_edited_by_roles text[],
  priority_level integer DEFAULT 1,
  priority_order integer DEFAULT 1, -- For drag-and-drop ordering within priority level
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Task Transfers table (NEW)
CREATE TABLE IF NOT EXISTS public.task_transfers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid REFERENCES public.task_instances(id) ON DELETE CASCADE,
  from_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  transfer_reason text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  response_notes text,
  transfer_deadline timestamp with time zone DEFAULT (now() + interval '24 hours'),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  responded_at timestamp with time zone
);

-- Task Photos table (NEW)
CREATE TABLE IF NOT EXISTS public.task_photos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid REFERENCES public.task_instances(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  upload_type text DEFAULT 'completion' CHECK (upload_type IN ('completion', 'progress', 'reference', 'before', 'after')),
  caption text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- User Points table (NEW - Rewards System)
CREATE TABLE IF NOT EXISTS public.user_points (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  total_points_earned integer DEFAULT 0,
  total_points_spent integer DEFAULT 0,
  current_balance integer DEFAULT 0,
  weekly_points integer DEFAULT 0,
  monthly_points integer DEFAULT 0,
  last_weekly_reset date DEFAULT CURRENT_DATE,
  last_monthly_reset date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Point Transactions table (NEW - Rewards History)
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.task_instances(id) ON DELETE SET NULL,
  points integer NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('earned', 'spent', 'bonus', 'penalty', 'adjustment')),
  description text,
  awarded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Daily Reports table
CREATE TABLE IF NOT EXISTS public.daily_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  report_type text NOT NULL,
  notes text,
  data jsonb, -- For structured report data
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Notifications table (NEW - For alerts and transfers)
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error', 'transfer')),
  is_read boolean DEFAULT false,
  related_task_id uuid REFERENCES public.task_instances(id) ON DELETE SET NULL,
  related_transfer_id uuid REFERENCES public.task_transfers(id) ON DELETE SET NULL,
  action_url text, -- URL to take action on the notification
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default roles
INSERT INTO public.roles (name, description) VALUES
  ('general_manager', 'General Manager - Full system access and oversight'),
  ('assistant_manager', 'Assistant Manager - Front of house management and support'),
  ('kitchen_manager', 'Kitchen Manager - Kitchen operations and staff oversight'),
  ('ordering_manager', 'Ordering Manager - Inventory, ordering, and supplier management'),
  ('lead_prep_cook', 'Lead Prep Cook - Food preparation leadership and coordination'),
  ('server', 'Server - Customer service and table management'),
  ('cashier', 'Cashier - Point of sale operations and transactions'),
  ('host', 'Host - Customer greeting, seating, and flow management'),
  ('barista', 'Barista - Coffee and beverage preparation'),
  ('opening_line_cook', 'Opening Line Cook - Morning kitchen preparation'),
  ('opening_prep_cook', 'Opening Prep Cook - Morning food preparation'),
  ('transition_line_cook', 'Transition Line Cook - Shift transition and handoff'),
  ('closing_line_cook', 'Closing Line Cook - Evening kitchen operations and cleanup')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Enhanced RLS Policies

-- Profiles policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Managers can create profiles" ON public.profiles FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('general_manager', 'assistant_manager')
  )
);

-- Roles policies  
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.roles;
CREATE POLICY "Users can view all roles" ON public.roles FOR SELECT USING (auth.role() = 'authenticated');

-- User Roles policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.user_roles;
CREATE POLICY "Users can view all user roles" ON public.user_roles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Managers can manage user roles" ON public.user_roles FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('general_manager', 'assistant_manager')
  )
);

-- Task Templates policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.task_templates;
CREATE POLICY "Users can view task templates" ON public.task_templates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Managers can manage task templates" ON public.task_templates FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('general_manager', 'assistant_manager', 'kitchen_manager', 'ordering_manager', 'lead_prep_cook')
  )
);

-- Task Instances policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.task_instances;
CREATE POLICY "Users can view own tasks" ON public.task_instances FOR SELECT USING (
  assignee_user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('general_manager', 'assistant_manager', 'kitchen_manager', 'ordering_manager', 'lead_prep_cook')
  )
);
CREATE POLICY "Users can update own tasks" ON public.task_instances FOR UPDATE USING (
  assignee_user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('general_manager', 'assistant_manager', 'kitchen_manager', 'ordering_manager', 'lead_prep_cook')
  )
);
CREATE POLICY "Managers can create tasks" ON public.task_instances FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('general_manager', 'assistant_manager', 'kitchen_manager', 'ordering_manager', 'lead_prep_cook')
  )
);

-- Task Transfers policies
CREATE POLICY "Users can view transfers involving them" ON public.task_transfers FOR SELECT USING (
  from_user_id = auth.uid() OR to_user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('general_manager', 'assistant_manager', 'kitchen_manager', 'ordering_manager', 'lead_prep_cook')
  )
);
CREATE POLICY "Users can create transfers from their tasks" ON public.task_transfers FOR INSERT WITH CHECK (
  from_user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.task_instances ti 
    WHERE ti.id = task_id AND ti.assignee_user_id = auth.uid() AND ti.is_transferable = true
  )
);
CREATE POLICY "Users can respond to transfers to them" ON public.task_transfers FOR UPDATE USING (
  to_user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('general_manager', 'assistant_manager')
  )
);

-- Task Photos policies
CREATE POLICY "Users can manage photos for their tasks" ON public.task_photos FOR ALL USING (
  uploaded_by = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.task_instances ti 
    WHERE ti.id = task_id AND ti.assignee_user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('general_manager', 'assistant_manager', 'kitchen_manager', 'ordering_manager', 'lead_prep_cook')
  )
);

-- User Points policies
CREATE POLICY "Users can view own points" ON public.user_points FOR SELECT USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('general_manager', 'assistant_manager')
  )
);
CREATE POLICY "System can manage points" ON public.user_points FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('general_manager', 'assistant_manager')
  )
);

-- Point Transactions policies
CREATE POLICY "Users can view own transactions" ON public.point_transactions FOR SELECT USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('general_manager', 'assistant_manager')
  )
);
CREATE POLICY "Managers can create transactions" ON public.point_transactions FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('general_manager', 'assistant_manager')
  )
);

-- Daily Reports policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.daily_reports;
CREATE POLICY "Users can view reports they created" ON public.daily_reports FOR SELECT USING (
  created_by = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('general_manager', 'assistant_manager', 'kitchen_manager', 'ordering_manager', 'lead_prep_cook')
  )
);
CREATE POLICY "Users can create reports" ON public.daily_reports FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Managers can manage reports" ON public.daily_reports FOR UPDATE USING (
  created_by = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('general_manager', 'assistant_manager', 'kitchen_manager', 'ordering_manager', 'lead_prep_cook')
  )
);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('general_manager', 'assistant_manager', 'kitchen_manager', 'ordering_manager', 'lead_prep_cook')
  )
);

-- Create helpful functions

-- Function to update user points after task completion
CREATE OR REPLACE FUNCTION update_user_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Only award points when task is completed (not just updated)
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Insert point transaction
    INSERT INTO public.point_transactions (user_id, task_id, points, transaction_type, description)
    VALUES (NEW.assignee_user_id, NEW.id, NEW.points_value, 'earned', 'Task completion: ' || NEW.title);
    
    -- Update user points balance
    INSERT INTO public.user_points (user_id, total_points_earned, current_balance)
    VALUES (NEW.assignee_user_id, NEW.points_value, NEW.points_value)
    ON CONFLICT (user_id) DO UPDATE SET
      total_points_earned = user_points.total_points_earned + NEW.points_value,
      current_balance = user_points.current_balance + NEW.points_value,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic point awarding
DROP TRIGGER IF EXISTS trigger_update_user_points ON public.task_instances;
CREATE TRIGGER trigger_update_user_points
  AFTER UPDATE ON public.task_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_user_points();

-- Function to create notification for task transfer
CREATE OR REPLACE FUNCTION create_transfer_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (
    user_id, 
    title, 
    message, 
    type, 
    related_task_id, 
    related_transfer_id,
    expires_at
  )
  VALUES (
    NEW.to_user_id,
    'Task Transfer Request',
    'You have received a task transfer request for: ' || (SELECT title FROM public.task_instances WHERE id = NEW.task_id),
    'transfer',
    NEW.task_id,
    NEW.id,
    NEW.transfer_deadline
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for transfer notifications
DROP TRIGGER IF EXISTS trigger_create_transfer_notification ON public.task_transfers;
CREATE TRIGGER trigger_create_transfer_notification
  AFTER INSERT ON public.task_transfers
  FOR EACH ROW
  EXECUTE FUNCTION create_transfer_notification();

-- Vendors table (NEW - For Ordering Manager)
CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  company_name text,
  contact_person text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  zip_code text,
  website text,
  notes text,
  preferred_contact_method text DEFAULT 'email' CHECK (preferred_contact_method IN ('email', 'phone', 'fax', 'portal')),
  payment_terms text, -- "Net 30", "COD", etc.
  delivery_schedule text, -- "Mon/Wed/Fri", "Daily", etc.
  minimum_order_amount decimal(10,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inventory Categories table (NEW)
CREATE TABLE IF NOT EXISTS public.inventory_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  parent_category_id uuid REFERENCES public.inventory_categories(id),
  sort_order integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inventory Items table (NEW - Comprehensive inventory management)
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  sku text UNIQUE,
  barcode text,
  category_id uuid REFERENCES public.inventory_categories(id),
  primary_vendor_id uuid REFERENCES public.vendors(id),
  unit_of_measure text NOT NULL, -- "lbs", "cases", "each", "gallons", etc.
  package_size text, -- "50 lbs", "24 count", etc.
  cost_per_unit decimal(10,4),
  selling_price decimal(10,2),
  current_stock integer DEFAULT 0,
  minimum_stock integer DEFAULT 0,
  maximum_stock integer DEFAULT 0,
  reorder_point integer DEFAULT 0,
  shelf_life_days integer,
  storage_location text,
  storage_requirements text, -- "Refrigerated", "Frozen", "Dry", etc.
  allergen_info text[],
  dietary_restrictions text[], -- "Gluten-Free", "Vegan", etc.
  notes text,
  photo_url text,
  is_active boolean DEFAULT true,
  last_ordered_date date,
  last_received_date date,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Vendor Items table (NEW - Many-to-many for multiple vendors per item)
CREATE TABLE IF NOT EXISTS public.vendor_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE,
  inventory_item_id uuid REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  vendor_sku text,
  vendor_name text, -- What the vendor calls this item
  vendor_package_size text,
  vendor_unit_cost decimal(10,4),
  minimum_order_quantity integer DEFAULT 1,
  lead_time_days integer DEFAULT 1,
  is_preferred boolean DEFAULT false,
  notes text,
  last_price_update timestamp with time zone DEFAULT timezone('utc'::text, now()),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(vendor_id, inventory_item_id)
);

-- Order Lists table (NEW - Custom ordering lists)
CREATE TABLE IF NOT EXISTS public.order_lists (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  list_type text DEFAULT 'custom' CHECK (list_type IN ('custom', 'weekly', 'daily', 'emergency', 'seasonal')),
  is_template boolean DEFAULT false,
  total_estimated_cost decimal(10,2) DEFAULT 0,
  order_frequency text, -- "Weekly", "Bi-weekly", etc.
  next_order_date date,
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Order List Items table (NEW - Items in each order list)
CREATE TABLE IF NOT EXISTS public.order_list_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_list_id uuid REFERENCES public.order_lists(id) ON DELETE CASCADE,
  inventory_item_id uuid REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES public.vendors(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_cost decimal(10,4),
  total_cost decimal(10,2),
  priority integer DEFAULT 1, -- 1=low, 2=medium, 3=high, 4=urgent
  notes text,
  is_ordered boolean DEFAULT false,
  ordered_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Purchase Orders table (NEW - Formal orders to vendors)
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  po_number text UNIQUE NOT NULL,
  vendor_id uuid REFERENCES public.vendors(id),
  order_list_id uuid REFERENCES public.order_lists(id),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'confirmed', 'partial', 'received', 'cancelled')),
  order_date date DEFAULT CURRENT_DATE,
  expected_delivery_date date,
  actual_delivery_date date,
  subtotal decimal(10,2) DEFAULT 0,
  tax_amount decimal(10,2) DEFAULT 0,
  shipping_cost decimal(10,2) DEFAULT 0,
  total_amount decimal(10,2) DEFAULT 0,
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  approved_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Purchase Order Items table (NEW)
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  inventory_item_id uuid REFERENCES public.inventory_items(id),
  vendor_item_id uuid REFERENCES public.vendor_items(id),
  quantity_ordered integer NOT NULL,
  quantity_received integer DEFAULT 0,
  unit_cost decimal(10,4),
  total_cost decimal(10,2),
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inventory Transactions table (NEW - Stock movements)
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_item_id uuid REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('received', 'used', 'wasted', 'adjustment', 'transfer')),
  quantity integer NOT NULL, -- Positive for additions, negative for subtractions
  unit_cost decimal(10,4),
  reference_id uuid, -- Could reference PO, task, etc.
  reference_type text, -- 'purchase_order', 'task_completion', 'manual_adjustment'
  location_from text,
  location_to text,
  expiration_date date,
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default inventory categories
INSERT INTO public.inventory_categories (name, description, sort_order) VALUES
  ('Proteins', 'Meat, poultry, seafood, and plant-based proteins', 1),
  ('Dairy & Eggs', 'Milk, cheese, butter, eggs, and dairy alternatives', 2),
  ('Produce', 'Fresh fruits, vegetables, and herbs', 3),
  ('Pantry Staples', 'Grains, flour, sugar, spices, and dry goods', 4),
  ('Beverages', 'Coffee, tea, juices, sodas, and other drinks', 5),
  ('Frozen Items', 'Frozen vegetables, fruits, and prepared items', 6),
  ('Cleaning Supplies', 'Sanitizers, detergents, and cleaning equipment', 7),
  ('Paper Products', 'Napkins, cups, containers, and disposables', 8),
  ('Kitchen Equipment', 'Small appliances, utensils, and tools', 9),
  ('Condiments & Sauces', 'Dressings, sauces, oils, and flavor enhancers', 10)
ON CONFLICT (name) DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for new tables

-- Vendors policies
CREATE POLICY "Ordering staff can view vendors" ON public.vendors FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('general_manager', 'assistant_manager', 'ordering_manager', 'kitchen_manager')
  )
);
CREATE POLICY "Ordering managers can manage vendors" ON public.vendors FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('general_manager', 'assistant_manager', 'ordering_manager')
  )
);

-- Inventory Categories policies
CREATE POLICY "Staff can view categories" ON public.inventory_categories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Managers can manage categories" ON public.inventory_categories FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('general_manager', 'assistant_manager', 'ordering_manager')
  )
);

-- Inventory Items policies
CREATE POLICY "Staff can view inventory items" ON public.inventory_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Ordering staff can manage inventory" ON public.inventory_items FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('general_manager', 'assistant_manager', 'ordering_manager', 'kitchen_manager')
  )
);

-- Vendor Items policies
CREATE POLICY "Staff can view vendor items" ON public.vendor_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Ordering staff can manage vendor items" ON public.vendor_items FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('general_manager', 'assistant_manager', 'ordering_manager')
  )
);

-- Order Lists policies
CREATE POLICY "Staff can view order lists" ON public.order_lists FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Ordering staff can manage order lists" ON public.order_lists FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('general_manager', 'assistant_manager', 'ordering_manager', 'kitchen_manager')
  )
);

-- Order List Items policies
CREATE POLICY "Staff can view order list items" ON public.order_list_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Ordering staff can manage order list items" ON public.order_list_items FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('general_manager', 'assistant_manager', 'ordering_manager', 'kitchen_manager')
  )
);

-- Purchase Orders policies
CREATE POLICY "Staff can view purchase orders" ON public.purchase_orders FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Ordering staff can manage purchase orders" ON public.purchase_orders FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('general_manager', 'assistant_manager', 'ordering_manager')
  )
);

-- Purchase Order Items policies
CREATE POLICY "Staff can view purchase order items" ON public.purchase_order_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Ordering staff can manage purchase order items" ON public.purchase_order_items FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('general_manager', 'assistant_manager', 'ordering_manager')
  )
);

-- Inventory Transactions policies
CREATE POLICY "Staff can view inventory transactions" ON public.inventory_transactions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Staff can create inventory transactions" ON public.inventory_transactions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Managers can manage inventory transactions" ON public.inventory_transactions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('general_manager', 'assistant_manager', 'ordering_manager', 'kitchen_manager')
  )
);

-- Function to update inventory after transactions
CREATE OR REPLACE FUNCTION update_inventory_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Update current stock based on transaction
  UPDATE public.inventory_items 
  SET 
    current_stock = current_stock + NEW.quantity,
    updated_at = NOW()
  WHERE id = NEW.inventory_item_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic stock updates
DROP TRIGGER IF EXISTS trigger_update_inventory_stock ON public.inventory_transactions;
CREATE TRIGGER trigger_update_inventory_stock
  AFTER INSERT ON public.inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_stock();

-- Function to generate PO numbers
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.po_number IS NULL THEN
    NEW.po_number := 'PO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('po_sequence')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for PO numbers
CREATE SEQUENCE IF NOT EXISTS po_sequence START 1;

-- Create trigger for PO number generation
DROP TRIGGER IF EXISTS trigger_generate_po_number ON public.purchase_orders;
CREATE TRIGGER trigger_generate_po_number
  BEFORE INSERT ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_po_number();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_task_instances_assignee_date ON public.task_instances(assignee_user_id, for_date);
CREATE INDEX IF NOT EXISTS idx_task_instances_status ON public.task_instances(status);
CREATE INDEX IF NOT EXISTS idx_task_transfers_to_user ON public.task_transfers(to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON public.point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON public.inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_vendor ON public.inventory_items(primary_vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_items_vendor ON public.vendor_items(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_items_item ON public.vendor_items(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_order_list_items_list ON public.order_list_items(order_list_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor ON public.purchase_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item ON public.inventory_transactions(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON public.inventory_items(current_stock, reorder_point) WHERE current_stock <= reorder_point;
