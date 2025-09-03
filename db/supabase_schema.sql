-- JAYNA Employees — Supabase Schema
-- Apply this in Supabase SQL Editor. Safe to run on a fresh project.

-- Extensions
create extension if not exists pgcrypto;
create extension if not exists pgjwt;
create extension if not exists pg_trgm;
create extension if not exists vector; -- optional future search

-- Auth-profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text generated always as (auth.email()) stored,
  display_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Roles
create table if not exists public.roles (
  id serial primary key,
  name text unique not null
);

insert into public.roles(name)
  values
  ('general_manager'),
  ('assistant_manager'),
  ('kitchen_manager'),
  ('ordering_manager'),
  ('lead_prep_cook'),
  ('prep_cook'),
  ('line_cook')
  on conflict do nothing;

create table if not exists public.user_roles (
  user_id uuid references public.profiles(id) on delete cascade,
  role_id int references public.roles(id) on delete cascade,
  primary key (user_id, role_id)
);

-- Helper: is_manager
create or replace function public.is_manager(uid uuid)
returns boolean language sql stable as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = uid and r.name in (
      'general_manager','assistant_manager','kitchen_manager','ordering_manager','lead_prep_cook'
    )
  );
$$;

-- Flows (home screen buttons)
create table if not exists public.flows (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  label text not null
);

insert into public.flows(key, label) values
  ('opening_line_cook', 'Opening Line Cook'),
  ('transition_line_cook', 'Transition Line Cook'),
  ('closing_line_cook', 'Closing Line Cook'),
  ('opening_prep_cook', 'Opening Prep Cook'),
  ('lead_prep_cook', 'Lead Prep Cook'),
  ('kitchen_manager', 'Kitchen Manager'),
  ('ordering_manager', 'Ordering Manager'),
  ('assistant_manager', 'Assistant Manager'),
  ('general_manager', 'General Manager')
  on conflict do nothing;

create table if not exists public.flow_roles (
  flow_id uuid references public.flows(id) on delete cascade,
  role_id int references public.roles(id) on delete cascade,
  primary key (flow_id, role_id)
);

-- Default mapping: same-named roles get access; line cooks see their 3
insert into public.flow_roles(flow_id, role_id)
select f.id, r.id from public.flows f, public.roles r
where (f.key like '%line_cook%' and r.name = 'line_cook')
   or (f.key like '%prep_cook%' and r.name in ('prep_cook','lead_prep_cook'))
   or (f.key in ('kitchen_manager') and r.name = 'kitchen_manager')
   or (f.key in ('ordering_manager') and r.name = 'ordering_manager')
   or (f.key in ('assistant_manager') and r.name = 'assistant_manager')
   or (f.key in ('general_manager') and r.name = 'general_manager')
on conflict do nothing;

-- Enums
do $$ begin
  create type public.task_status as enum ('pending','in_progress','completed','returned');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transfer_status as enum ('pending','accepted','rejected');
exception when duplicate_object then null; end $$;

-- Task templates
create table if not exists public.task_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  flow_id uuid references public.flows(id) on delete set null,
  priority int not null default 3, -- 1 high .. 5 low
  requires_completion_percent boolean not null default true,
  requires_photo boolean not null default false,
  transferable boolean not null default false,
  editable_by_role_ids int[] not null default '{}',
  recurrence jsonb, -- e.g., {"type":"daily"} or {"type":"weekly","days":[1,3,5]}
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Template assignment targets (by user or by role)
create table if not exists public.template_assignees (
  template_id uuid references public.task_templates(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role_id int references public.roles(id) on delete cascade,
  primary key (template_id, user_id, role_id)
);

-- Daily task instances
create table if not exists public.task_instances (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.task_templates(id) on delete set null,
  for_date date not null,
  assignee_user_id uuid references public.profiles(id) on delete set null,
  assignee_role_id int references public.roles(id) on delete set null,
  status public.task_status not null default 'pending',
  completion_percent int check (completion_percent in (0,25,50,75,100)) ,
  notes text,
  requires_photo boolean not null default false, -- snapshot from template
  priority int not null default 3,
  due_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists task_instances_by_user_date
  on public.task_instances(assignee_user_id, for_date);

-- Attachments (images)
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  task_instance_id uuid references public.task_instances(id) on delete cascade,
  storage_path text not null,
  url text,
  created_at timestamptz default now()
);

-- Transfers
create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  task_instance_id uuid references public.task_instances(id) on delete cascade,
  from_user_id uuid references public.profiles(id) on delete set null,
  to_user_id uuid references public.profiles(id) on delete set null,
  status public.transfer_status not null default 'pending',
  created_at timestamptz default now(),
  responded_at timestamptz
);

-- Notifications (in-app)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  type text not null,
  payload jsonb,
  read_at timestamptz,
  created_at timestamptz default now()
);

-- Inventory for Prep flow
create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text,
  category text,
  par numeric,
  active boolean not null default true,
  created_at timestamptz default now(),
  created_by uuid references public.profiles(id)
);

create table if not exists public.inventory_sessions (
  id uuid primary key default gen_random_uuid(),
  session_date date not null,
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.inventory_counts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.inventory_sessions(id) on delete cascade,
  item_id uuid references public.inventory_items(id) on delete cascade,
  quantity numeric,
  counted_at timestamptz default now()
);

-- Prep Planner
create table if not exists public.prep_plans (
  id uuid primary key default gen_random_uuid(),
  plan_date date not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table if not exists public.prep_plan_tasks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references public.prep_plans(id) on delete cascade,
  title text not null,
  template_id uuid references public.task_templates(id) on delete set null,
  position int not null default 0,
  assigned_user_id uuid references public.profiles(id) on delete set null,
  status public.task_status not null default 'pending',
  completion_percent int check (completion_percent in (0,25,50,75,100)),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Storage bucket for attachments
select storage.create_bucket('attachments', public := true);

-- RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.task_templates enable row level security;
alter table public.template_assignees enable row level security;
alter table public.task_instances enable row level security;
alter table public.attachments enable row level security;
alter table public.transfers enable row level security;
alter table public.notifications enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_sessions enable row level security;
alter table public.inventory_counts enable row level security;
alter table public.prep_plans enable row level security;
alter table public.prep_plan_tasks enable row level security;

-- Profiles: user can see self; managers can see all
create policy if not exists profiles_self_select on public.profiles
for select using (
  auth.uid() = id or public.is_manager(auth.uid())
);

create policy if not exists profiles_self_update on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

-- User roles: managers manage; users can read own
create policy if not exists user_roles_select on public.user_roles
for select using (
  public.is_manager(auth.uid()) or user_id = auth.uid()
);

create policy if not exists user_roles_manage on public.user_roles
for all using (public.is_manager(auth.uid())) with check (public.is_manager(auth.uid()));

-- Templates: managers read/write; non-managers read only if relevant
create policy if not exists templates_select on public.task_templates
for select using (
  public.is_manager(auth.uid()) or exists (
    select 1 from public.template_assignees ta
    where ta.template_id = task_templates.id and (ta.user_id = auth.uid() or ta.role_id in (
      select role_id from public.user_roles where user_id = auth.uid()
    ))
  )
);

create policy if not exists templates_manage on public.task_templates
for all using (public.is_manager(auth.uid())) with check (public.is_manager(auth.uid()));

-- Template assignees: managers only
create policy if not exists template_assignees_all on public.template_assignees
for all using (public.is_manager(auth.uid())) with check (public.is_manager(auth.uid()));

-- Task instances: owner or manager can read; owner can update own; manager can all
create policy if not exists task_instances_select on public.task_instances
for select using (
  assignee_user_id = auth.uid() or public.is_manager(auth.uid())
);

create policy if not exists task_instances_update on public.task_instances
for update using (
  assignee_user_id = auth.uid() or public.is_manager(auth.uid())
) with check (
  assignee_user_id = auth.uid() or public.is_manager(auth.uid())
);

create policy if not exists task_instances_insert on public.task_instances
for insert with check (
  public.is_manager(auth.uid())
);

-- Attachments: visible to task owner/managers; insert by owner/managers
create policy if not exists attachments_select on public.attachments
for select using (
  exists (select 1 from public.task_instances ti where ti.id = attachments.task_instance_id and (ti.assignee_user_id = auth.uid() or public.is_manager(auth.uid())))
);

create policy if not exists attachments_insert on public.attachments
for insert with check (
  exists (select 1 from public.task_instances ti where ti.id = attachments.task_instance_id and (ti.assignee_user_id = auth.uid() or public.is_manager(auth.uid())))
);

-- Transfers: participants and managers can read; inserts by owner; updates by recipient/managers
create policy if not exists transfers_select on public.transfers
for select using (
  from_user_id = auth.uid() or to_user_id = auth.uid() or public.is_manager(auth.uid())
);

create policy if not exists transfers_insert on public.transfers
for insert with check (
  from_user_id = auth.uid()
);

create policy if not exists transfers_update on public.transfers
for update using (
  to_user_id = auth.uid() or public.is_manager(auth.uid())
) with check (
  to_user_id = auth.uid() or public.is_manager(auth.uid())
);

-- Notifications: per-user
create policy if not exists notifications_self on public.notifications
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Inventory: managers and lead prep can manage; all prep cooks can read/write counts
create policy if not exists inventory_items_select on public.inventory_items
for select using (true);

create policy if not exists inventory_items_manage on public.inventory_items
for all using (
  public.is_manager(auth.uid())
) with check (public.is_manager(auth.uid()));

create policy if not exists inventory_sessions_all on public.inventory_sessions
for all using (
  public.is_manager(auth.uid()) or exists (
    select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.name in ('lead_prep_cook','prep_cook')
  )
) with check (
  public.is_manager(auth.uid()) or exists (
    select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.name in ('lead_prep_cook','prep_cook')
  )
);

create policy if not exists inventory_counts_all on public.inventory_counts
for all using (
  public.is_manager(auth.uid()) or exists (
    select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.name in ('lead_prep_cook','prep_cook')
  )
) with check (
  public.is_manager(auth.uid()) or exists (
    select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.name in ('lead_prep_cook','prep_cook')
  )
);

-- Prep plans: managers and prep roles
create policy if not exists prep_plans_all on public.prep_plans
for all using (
  public.is_manager(auth.uid()) or exists (
    select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.name in ('lead_prep_cook','prep_cook')
  )
) with check (
  public.is_manager(auth.uid()) or exists (
    select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.name in ('lead_prep_cook','prep_cook')
  )
);

create policy if not exists prep_plan_tasks_all on public.prep_plan_tasks
for all using (
  public.is_manager(auth.uid()) or exists (
    select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.name in ('lead_prep_cook','prep_cook')
  )
) with check (
  public.is_manager(auth.uid()) or exists (
    select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.name in ('lead_prep_cook','prep_cook')
  )
);

-- Realtime: turn on for task_instances, transfers, notifications
-- In Supabase dashboard, enable Realtime for these tables.

-- Seed example inventory items (optional)
insert into public.inventory_items(name, unit, category, par)
values ('Tomatoes', 'lbs', 'Produce', 20), ('Onions', 'lbs', 'Produce', 15)
 on conflict do nothing;
