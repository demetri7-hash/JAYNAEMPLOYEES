-- Simple database structure for JAYNA restaurant app

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT,
    name TEXT,
    role TEXT DEFAULT 'general_manager',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Roles table (optional, for more complex role management)
CREATE TABLE IF NOT EXISTS public.roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Insert default roles
INSERT INTO public.roles (id, name, description) VALUES
    ('general_manager', 'General Manager', 'Full operations management'),
    ('kitchen_manager', 'Kitchen Manager', 'Kitchen operations oversight'),
    ('assistant_manager', 'Assistant Manager', 'Operations support and coordination'),
    ('ordering_manager', 'Ordering Manager', 'Inventory and supplier management'),
    ('lead_prep_cook', 'Lead Prep Cook', 'Prep coordination and leadership'),
    ('opening_prep_cook', 'Opening Prep Cook', 'Food preparation and inventory'),
    ('opening_line_cook', 'Opening Line Cook', 'Morning kitchen preparation and setup'),
    ('transition_line_cook', 'Transition Line Cook', 'Shift handoff and continuity'),
    ('closing_line_cook', 'Closing Line Cook', 'Evening service and cleanup')
ON CONFLICT (id) DO NOTHING;

-- Tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
    id BIGSERIAL PRIMARY KEY,
    title TEXT,
    name TEXT,
    description TEXT,
    notes TEXT,
    for_date DATE,
    due_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending',
    completed_at TIMESTAMP WITH TIME ZONE,
    assignee_user_id UUID REFERENCES public.users(id),
    assignee_role_id TEXT REFERENCES public.roles(id),
    completion_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Task templates table
CREATE TABLE IF NOT EXISTS public.task_templates (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    name TEXT,
    description TEXT,
    default_notes TEXT,
    assignee_role_id TEXT REFERENCES public.roles(id),
    assignee_user_id UUID REFERENCES public.users(id),
    due_at TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Vendors table for ordering system
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    delivery_days TEXT[] DEFAULT '{}',
    cutoff_time TIME,
    minimum_order DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Inventory items table
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    vendor_id UUID REFERENCES public.vendors(id),
    unit_type TEXT NOT NULL,
    cost_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0,
    current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
    minimum_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
    maximum_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
    last_ordered DATE,
    last_count_date DATE,
    notes TEXT,
    photo_url TEXT,
    barcode TEXT,
    storage_location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    vendor_id UUID REFERENCES public.vendors(id) NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'ordered', 'received', 'cancelled')),
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    order_date DATE NOT NULL,
    expected_delivery DATE,
    notes TEXT,
    created_by UUID REFERENCES public.users(id) NOT NULL,
    approved_by UUID REFERENCES public.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Order items table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    inventory_item_id UUID REFERENCES public.inventory_items(id) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Inventory counts table
CREATE TABLE IF NOT EXISTS public.inventory_counts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    list_name TEXT NOT NULL,
    assigned_to UUID REFERENCES public.users(id) NOT NULL,
    items UUID[] DEFAULT '{}',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    due_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_counts ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "General managers can manage users" ON public.users FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('general_manager', 'assistant_manager')
    )
);

-- Roles policies
CREATE POLICY "Everyone can view roles" ON public.roles FOR SELECT USING (true);

-- Tasks policies
CREATE POLICY "Users can view all tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Users can update their tasks" ON public.tasks FOR UPDATE USING (
    assignee_user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('general_manager', 'kitchen_manager', 'assistant_manager')
    )
);
CREATE POLICY "Managers can insert tasks" ON public.tasks FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('general_manager', 'kitchen_manager', 'assistant_manager', 'ordering_manager')
    )
);

-- Task templates policies  
CREATE POLICY "Everyone can view templates" ON public.task_templates FOR SELECT USING (true);
CREATE POLICY "Managers can manage templates" ON public.task_templates FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('general_manager', 'kitchen_manager', 'assistant_manager')
    )
);

-- Vendor policies
CREATE POLICY "Users can view vendors" ON public.vendors FOR SELECT USING (true);
CREATE POLICY "Ordering managers can manage vendors" ON public.vendors FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('general_manager', 'ordering_manager', 'assistant_manager')
    )
);

-- Inventory items policies
CREATE POLICY "Users can view inventory" ON public.inventory_items FOR SELECT USING (true);
CREATE POLICY "Ordering managers can manage inventory" ON public.inventory_items FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('general_manager', 'ordering_manager', 'assistant_manager', 'kitchen_manager')
    )
);

-- Orders policies
CREATE POLICY "Users can view all orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Ordering managers can create orders" ON public.orders FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('ordering_manager', 'general_manager', 'assistant_manager')
    )
);
CREATE POLICY "Managers can update orders" ON public.orders FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('general_manager', 'assistant_manager')
    )
);

-- Order items policies
CREATE POLICY "Users can view order items" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "Order creators can manage order items" ON public.order_items FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.orders o 
        JOIN public.users u ON u.id = auth.uid()
        WHERE o.id = order_id 
        AND (o.created_by = auth.uid() OR u.role IN ('general_manager', 'assistant_manager'))
    )
);

-- Inventory counts policies
CREATE POLICY "Users can view inventory counts" ON public.inventory_counts FOR SELECT USING (true);
CREATE POLICY "Ordering managers can manage counts" ON public.inventory_counts FOR ALL USING (
    assigned_to = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('general_manager', 'ordering_manager', 'assistant_manager')
    )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_for_date ON public.tasks(for_date);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_user ON public.tasks(assignee_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_role ON public.tasks(assignee_role_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_orders_vendor ON public.orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON public.orders(created_by);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON public.inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_vendor ON public.inventory_items(vendor_id);

-- Function to automatically insert user record when someone signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        'general_manager'  -- Default role for new users
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update order total when order items change
CREATE OR REPLACE FUNCTION public.update_order_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.orders 
    SET total_amount = (
        SELECT COALESCE(SUM(total_cost), 0) 
        FROM public.order_items 
        WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
    ),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers to update order totals
DROP TRIGGER IF EXISTS update_order_total_on_insert ON public.order_items;
CREATE TRIGGER update_order_total_on_insert
    AFTER INSERT ON public.order_items
    FOR EACH ROW EXECUTE FUNCTION public.update_order_total();

DROP TRIGGER IF EXISTS update_order_total_on_update ON public.order_items;
CREATE TRIGGER update_order_total_on_update
    AFTER UPDATE ON public.order_items
    FOR EACH ROW EXECUTE FUNCTION public.update_order_total();

DROP TRIGGER IF EXISTS update_order_total_on_delete ON public.order_items;
CREATE TRIGGER update_order_total_on_delete
    AFTER DELETE ON public.order_items
    FOR EACH ROW EXECUTE FUNCTION public.update_order_total();

-- Sample task templates (optional)
INSERT INTO public.task_templates (title, description, default_notes, assignee_role_id, due_at) VALUES
    ('Open Kitchen Setup', 'Complete morning kitchen preparation', 'Check all equipment, verify inventory levels, prep mise en place', 'opening_line_cook', '08:00:00'),
    ('Food Safety Check', 'Complete daily food safety inspection', 'Check temperatures, inspect food quality, document findings', 'kitchen_manager', '09:00:00'),
    ('Inventory Count', 'Count and record inventory levels', 'Focus on high-turnover items, note any shortages', 'ordering_manager', '10:00:00'),
    ('Prep List Review', 'Review and assign daily prep tasks', 'Distribute tasks based on staff availability and priorities', 'lead_prep_cook', '11:00:00'),
    ('End of Day Cleanup', 'Complete closing procedures', 'Clean all stations, secure equipment, document any issues', 'closing_line_cook', '22:00:00')
ON CONFLICT DO NOTHING;

-- Sample vendors (optional)
INSERT INTO public.vendors (name, contact_person, email, phone, address, delivery_days, cutoff_time, minimum_order) VALUES
    ('Mediterranean Fresh Foods', 'John Doe', 'orders@medfresh.com', '555-0123', '123 Supplier St, Food City, CA 90210', ARRAY['monday', 'wednesday', 'friday'], '14:00:00', 150.00),
    ('Premium Meat Company', 'Sarah Johnson', 'orders@premiummeat.com', '555-0456', '456 Meat Market Ave, Butcher Town, CA 90211', ARRAY['tuesday', 'thursday'], '12:00:00', 200.00),
    ('Fresh Produce Direct', 'Mike Rodriguez', 'orders@freshproduce.com', '555-0789', '789 Farm Road, Veggie Valley, CA 90212', ARRAY['monday', 'wednesday', 'friday'], '16:00:00', 100.00)
ON CONFLICT DO NOTHING;

-- Sample inventory items (optional)
INSERT INTO public.inventory_items (name, category, unit_type, cost_per_unit, current_stock, minimum_stock, maximum_stock, storage_location) VALUES
    ('Ground Lamb', 'Meat', 'lbs', 8.50, 15, 20, 100, 'Walk-in Freezer A'),
    ('Pita Bread', 'Bread', 'each', 0.75, 50, 30, 200, 'Dry Storage Room 1'),
    ('Tahini', 'Condiments', 'jar', 12.00, 8, 5, 25, 'Walk-in Cooler B'),
    ('Tomatoes', 'Vegetables', 'lbs', 2.25, 25, 15, 75, 'Walk-in Cooler A'),
    ('Feta Cheese', 'Dairy', 'lbs', 6.50, 12, 10, 40, 'Walk-in Cooler B')
ON CONFLICT DO NOTHING;
