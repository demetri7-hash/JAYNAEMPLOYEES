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

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_for_date ON public.tasks(for_date);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_user ON public.tasks(assignee_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_role ON public.tasks(assignee_role_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

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

-- Sample task templates (optional)
INSERT INTO public.task_templates (title, description, default_notes, assignee_role_id, due_at) VALUES
    ('Open Kitchen Setup', 'Complete morning kitchen preparation', 'Check all equipment, verify inventory levels, prep mise en place', 'opening_line_cook', '08:00:00'),
    ('Food Safety Check', 'Complete daily food safety inspection', 'Check temperatures, inspect food quality, document findings', 'kitchen_manager', '09:00:00'),
    ('Inventory Count', 'Count and record inventory levels', 'Focus on high-turnover items, note any shortages', 'ordering_manager', '10:00:00'),
    ('Prep List Review', 'Review and assign daily prep tasks', 'Distribute tasks based on staff availability and priorities', 'lead_prep_cook', '11:00:00'),
    ('End of Day Cleanup', 'Complete closing procedures', 'Clean all stations, secure equipment, document any issues', 'closing_line_cook', '22:00:00')
ON CONFLICT DO NOTHING;
