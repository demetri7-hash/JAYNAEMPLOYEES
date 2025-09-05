"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase-browser";

type User = { id: string; email?: string; name?: string };
type Role = { id: string; name: string };

type Task = {
  id: string | number;
  title?: string | null;
  name?: string | null;
  description?: string | null;
  notes?: string | null;
  for_date?: string | null;
  due_at?: string | null;
  status?: string | null;
  completed_at?: string | null;
  assignee_user_id?: string | null;
  assignee_role_id?: string | null;
  completion_reason?: string | null;
};

type Template = {
  id: string | number;
  title?: string | null;
  name?: string | null;
  description?: string | null;
  default_notes?: string | null;
  assignee_role_id?: string | null;
  assignee_user_id?: string | null;
  due_at?: string | null;
};

export default function GeneralManagerPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [creating, setCreating] = useState(false);
  const [updatingIds, setUpdatingIds] = useState<Set<string | number>>(new Set());
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editNotes, setEditNotes] = useState<string>("");
  const [editReason, setEditReason] = useState<string>("");
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // UI state
  const [showCreate, setShowCreate] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showTemplateManagement, setShowTemplateManagement] = useState(false);

  // Forms state
  const [newTask, setNewTask] = useState({ title: "", notes: "", due_at: "", assignee_user_id: "", assignee_role_id: "" });
  const [creatingTask, setCreatingTask] = useState(false);
  
  const [newUser, setNewUser] = useState({ email: "", password: "", name: "", role_id: "" });
  const [creatingUser, setCreatingUser] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  
  const [newTemplate, setNewTemplate] = useState({ title: "", description: "", default_notes: "", assignee_role_id: "", assignee_user_id: "", due_at: "" });
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  // Bulk actions and assignment state
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  // Order approval state
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [showOrderApprovals, setShowOrderApprovals] = useState(false);

  // Load all today's tasks and templates
  useEffect(() => {
    let active = true;
    
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        
        // Load all today's tasks
        const { data: tasksData, error: tasksError } = await supabase
          .from("tasks")
          .select("*")
          .eq("for_date", today)
          .order("created_at", { ascending: false });

        if (tasksError) throw tasksError;
        
        // Load templates
        const { data: templatesData, error: templatesError } = await supabase
          .from("task_templates")
          .select("*")
          .order("created_at", { ascending: false });

        if (templatesError) throw templatesError;

        // Load users and roles (with error handling)
        const [usersRes, rolesRes] = await Promise.all([
          supabase.from("users").select("id, email, name").order("created_at", { ascending: false }).then(res => {
            if (res.error) console.warn("Users query error:", res.error);
            return res;
          }),
          supabase.from("roles").select("id, name").order("name", { ascending: true }).then(res => {
            if (res.error) console.warn("Roles query error:", res.error);
            return res;
          })
        ]);

        if (active) {
          setTasks(tasksData || []);
          setTemplates(templatesData || []);
          setUsers(usersRes.data || []);
          setRoles(rolesRes.data || []);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load data");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadData();
    
    // Set up real-time subscription
    const sub = supabase
      .channel("general-manager-tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        loadData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "task_templates" }, () => {
        loadData();
      })
      .subscribe();

    return () => { 
      active = false;
      if (sub) sub.unsubscribe();
    };
  }, [today]);

  // Create today's tasks from templates
  const createTasks = async () => {
    if (creating || templates.length === 0) return;
    setCreating(true);
    setError(null);

    try {
      const tasksToCreate = templates.map(template => ({
        title: template.title,
        name: template.name,
        description: template.description,
        notes: template.default_notes,
        for_date: today,
        due_at: template.due_at ? `${today}T${template.due_at}:00` : null,
        assignee_role_id: template.assignee_role_id,
        assignee_user_id: template.assignee_user_id,
        status: "pending"
      }));

      const { error } = await supabase.from("tasks").insert(tasksToCreate);
      if (error) throw error;
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tasks");
    } finally {
      setCreating(false);
    }
  };

  // Handle custom task creation
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creatingTask || !newTask.title.trim()) return;
    
    setCreatingTask(true);
    try {
      const taskData = {
        title: newTask.title.trim(),
        notes: newTask.notes.trim() || null,
        for_date: today,
        due_at: newTask.due_at ? `${today}T${newTask.due_at}:00` : null,
        assignee_user_id: newTask.assignee_user_id || null,
        assignee_role_id: newTask.assignee_role_id || null,
        status: "pending"
      };

      const { error } = await supabase.from("tasks").insert([taskData]);
      if (error) throw error;

      setNewTask({ title: "", notes: "", due_at: "", assignee_user_id: "", assignee_role_id: "" });
      setShowCreate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setCreatingTask(false);
    }
  };

  // Handle user creation
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creatingUser || !newUser.email.trim() || !newUser.password.trim()) return;

    setCreatingUser(true);
    setUserError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: newUser.email.trim(),
        password: newUser.password,
        options: {
          data: {
            name: newUser.name.trim() || null
          }
        }
      });

      if (error) throw error;

      if (data.user && newUser.role_id) {
        // Try to update user role in users table
        const { error: roleError } = await supabase
          .from("users")
          .update({ role: newUser.role_id })
          .eq("id", data.user.id);
        
        if (roleError) {
          console.warn("Role assignment failed:", roleError.message);
          // Fallback to user_roles table if it exists
          try {
            await supabase
              .from("user_roles")
              .insert([{ user_id: data.user.id, role_id: newUser.role_id }]);
          } catch (fallbackError) {
            console.warn("Fallback role assignment also failed:", fallbackError);
          }
        }
      }

      setNewUser({ email: "", password: "", name: "", role_id: "" });
    } catch (err) {
      setUserError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setCreatingUser(false);
    }
  };

  // Handle template creation
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creatingTemplate || !newTemplate.title.trim()) return;

    setCreatingTemplate(true);
    setTemplateError(null);
    try {
      const templateData = {
        title: newTemplate.title.trim(),
        name: newTemplate.title.trim(),
        description: newTemplate.description.trim() || null,
        default_notes: newTemplate.default_notes.trim() || null,
        assignee_role_id: newTemplate.assignee_role_id || null,
        assignee_user_id: newTemplate.assignee_user_id || null,
        due_at: newTemplate.due_at || null
      };

      const { error } = await supabase.from("task_templates").insert([templateData]);
      if (error) throw error;

      setNewTemplate({ title: "", description: "", default_notes: "", assignee_role_id: "", assignee_user_id: "", due_at: "" });
    } catch (err) {
      setTemplateError(err instanceof Error ? err.message : "Failed to create template");
    } finally {
      setCreatingTemplate(false);
    }
  };

  // Delete template
  const deleteTemplate = async (templateId: string | number) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    
    try {
      const { error } = await supabase
        .from("task_templates")
        .delete()
        .eq("id", templateId);
      
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete template");
    }
  };

  // Load pending orders for approval
  const loadPendingOrders = async () => {
    try {
      const { data: orders } = await supabase
        .from("orders")
        .select(`
          *, 
          vendor:vendors(name),
          order_items(*, inventory_item:inventory_items(name)),
          creator:users!created_by(name, email)
        `)
        .eq("status", "pending_approval")
        .order("created_at", { ascending: false });
      
      setPendingOrders(orders?.map(order => ({
        ...order,
        vendor_name: order.vendor?.name,
        creator_name: order.creator?.name || order.creator?.email,
        items: order.order_items || []
      })) || []);
    } catch (err) {
      console.warn("Could not load orders:", err);
      setPendingOrders([]);
    }
  };

  // Approve order
  const approveOrder = async (orderId: string) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id;
      
      const { error } = await supabase
        .from("orders")
        .update({
          status: "approved",
          approved_by: userId,
          approved_at: new Date().toISOString()
        })
        .eq("id", orderId);
      
      if (error) throw error;
      loadPendingOrders(); // Reload orders
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve order");
    }
  };

  // Reject order
  const rejectOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to reject this order?")) return;
    
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId);
      
      if (error) throw error;
      loadPendingOrders(); // Reload orders
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject order");
    }
  };

  // Load orders when order approvals section is opened
  useEffect(() => {
    if (showOrderApprovals) {
      loadPendingOrders();
    }
  }, [showOrderApprovals]);

  if (loading) {
    return (
      <div className="container mx-auto max-w-7xl p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900 mb-2">General Manager</h1>
        <p className="text-slate-600">Comprehensive management dashboard for restaurant operations</p>
      </div>

      {error && (
        <div className="alert alert-error mb-8">
          {error}
        </div>
      )}
      
      {/* Status Overview */}
      <div className="card mb-8">
        <div className="p-6">
          <h2 className="text-lg font-medium text-slate-900 mb-3">System Status</h2>
          <div className="text-sm text-slate-600">All systems operational. Dashboard ready for management activities.</div>
        </div>
      </div>
      
      {/* Primary Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <button
          className="btn btn-primary"
          onClick={createTasks}
          disabled={creating}
        >
          {creating ? "Generating..." : "Generate Daily Tasks"}
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => setShowCreate(!showCreate)}
        >
          {showCreate ? "Cancel" : "Create Custom Task"}
        </button>
        <button
          className="btn btn-outline"
          onClick={() => setShowUserManagement(!showUserManagement)}
        >
          {showUserManagement ? "Close" : "Manage Users"}
        </button>
        <button
          className="btn btn-outline"
          onClick={() => setShowTemplateManagement(!showTemplateManagement)}
        >
          {showTemplateManagement ? "Close" : "Task Templates"}
        </button>
        <button
          className={`btn ${pendingOrders.length > 0 ? 'btn-primary bg-yellow-500 border-yellow-500 hover:bg-yellow-600' : 'btn-outline'}`}
          onClick={() => setShowOrderApprovals(!showOrderApprovals)}
        >
          {showOrderApprovals ? "Close" : `Approve Orders${pendingOrders.length > 0 ? ` (${pendingOrders.length})` : ''}`}
        </button>
      </div>
      
      {/* Quick Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <a href="/inventory" className="card hover:shadow-md transition-shadow">
          <div className="p-4">
            <div className="text-sm font-medium text-slate-900">Inventory Management</div>
            <div className="text-xs text-slate-500 mt-1">Track stock levels and supplies</div>
          </div>
        </a>
        <a href="/prep" className="card hover:shadow-md transition-shadow">
          <div className="p-4">
            <div className="text-sm font-medium text-slate-900">Prep Workflow</div>
            <div className="text-xs text-slate-500 mt-1">Monitor food preparation tasks</div>
          </div>
        </a>
        <a href="/today" className="card hover:shadow-md transition-shadow">
          <div className="p-4">
            <div className="text-sm font-medium text-slate-900">Today's Overview</div>
            <div className="text-xs text-slate-500 mt-1">View current day operations</div>
          </div>
        </a>
      </div>

      {/* Custom task creation form */}
      {showCreate && (
        <div className="card mb-8">
          <div className="border-b border-slate-200 p-6">
            <h3 className="text-lg font-medium text-slate-900">Create Custom Task</h3>
            <p className="text-sm text-slate-600 mt-1">Create a one-time task with specific requirements</p>
          </div>
          <form className="p-6 space-y-4" onSubmit={handleCreateTask}>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Task Title</label>
              <input
                className="input w-full"
                placeholder="Enter task title"
                value={newTask.title}
                onChange={e => setNewTask(t => ({ ...t, title: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Description</label>
              <textarea
                className="input w-full"
                rows={3}
                placeholder="Additional notes or instructions"
                value={newTask.notes}
                onChange={e => setNewTask(t => ({ ...t, notes: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Due Time</label>
              <input
                className="input w-full"
                type="time"
                value={newTask.due_at}
                onChange={e => setNewTask(t => ({ ...t, due_at: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Assign to Person</label>
              <select
                className="input w-full"
                value={newTask.assignee_user_id}
                onChange={e => setNewTask(t => ({ ...t, assignee_user_id: e.target.value }))}
              >
                <option value="">Select person (optional)</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email || u.id}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Assign to Role</label>
              <select
                className="input w-full"
                value={newTask.assignee_role_id}
                onChange={e => setNewTask(t => ({ ...t, assignee_role_id: e.target.value }))}
              >
                <option value="">Select role (optional)</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="btn btn-primary flex-1"
                disabled={creatingTask}
              >
                {creatingTask ? "Creating..." : "Create Task"}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* User Management Section */}
      {showUserManagement && (
        <div className="card mb-8">
          <div className="border-b border-slate-200 p-6">
            <h3 className="text-lg font-medium text-slate-900">User Management</h3>
            <p className="text-sm text-slate-600 mt-1">Create and manage user accounts</p>
          </div>
          
          {/* Create New User Form */}
          <div className="p-6 border-b border-slate-200">
            <h4 className="text-base font-medium text-slate-900 mb-4">Create New User</h4>
            
            {userError && (
              <div className="alert alert-error mb-4">
                {userError}
              </div>
            )}
            
            <form className="space-y-4" onSubmit={handleCreateUser}>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Email Address</label>
                <input
                  className="input w-full"
                  type="email"
                  placeholder="Enter email address"
                  value={newUser.email}
                  onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Password</label>
                <input
                  className="input w-full"
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={newUser.password}
                  onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))}
                  minLength={6}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Full Name</label>
                <input
                  className="input w-full"
                  placeholder="Optional"
                  value={newUser.name}
                  onChange={e => setNewUser(u => ({ ...u, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Role Assignment</label>
                <select
                  className="input w-full"
                  value={newUser.role_id}
                  onChange={e => setNewUser(u => ({ ...u, role_id: e.target.value }))}
                >
                  <option value="">Select role (optional)</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={creatingUser}
              >
                {creatingUser ? "Creating User..." : "Create User"}
              </button>
            </form>
          </div>

          {/* Current Users List */}
          <div className="p-6 border-b border-slate-200">
            <h4 className="text-base font-medium text-slate-900 mb-4">Current Users ({users.length})</h4>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {users.length === 0 ? (
                <p className="text-slate-500 text-sm">No users found</p>
              ) : (
                users.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <div className="font-medium text-sm text-slate-900">{user.name || "No name"}</div>
                      <div className="text-xs text-slate-600">{user.email}</div>
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      ID: {user.id.slice(0, 8)}...
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Available Roles */}
          <div className="p-6">
            <h4 className="text-base font-medium text-slate-900 mb-4">Available Roles ({roles.length})</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {roles.map(role => (
                <div key={role.id} className="p-3 bg-slate-50 rounded-lg">
                  <div className="font-medium text-sm text-slate-900">{role.name}</div>
                  <div className="text-xs text-slate-600 font-mono">ID: {role.id}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Template Management Section */}
      {showTemplateManagement && (
        <div className="card mb-8">
          <div className="border-b border-slate-200 p-6">
            <h3 className="text-lg font-medium text-slate-900">Template Management</h3>
            <p className="text-sm text-slate-600 mt-1">Create reusable task templates for efficient operations</p>
          </div>
          
          {/* Create New Template Form */}
          <div className="p-6 border-b border-slate-200">
            <h4 className="text-base font-medium text-slate-900 mb-4">Create New Template</h4>
            
            {templateError && (
              <div className="alert alert-error mb-4">
                {templateError}
              </div>
            )}
            
            <form className="space-y-4" onSubmit={handleCreateTemplate}>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Template Title</label>
                <input
                  className="input w-full"
                  placeholder="Enter template title"
                  value={newTemplate.title}
                  onChange={e => setNewTemplate(t => ({ ...t, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Description</label>
                <textarea
                  className="input w-full"
                  rows={3}
                  placeholder="Template description"
                  value={newTemplate.description}
                  onChange={e => setNewTemplate(t => ({ ...t, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Default Notes</label>
                <textarea
                  className="input w-full"
                  rows={2}
                  placeholder="Default notes for tasks created from this template"
                  value={newTemplate.default_notes}
                  onChange={e => setNewTemplate(t => ({ ...t, default_notes: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Default Due Time</label>
                <input
                  className="input w-full"
                  type="time"
                  value={newTemplate.due_at}
                  onChange={e => setNewTemplate(t => ({ ...t, due_at: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Default Role Assignment</label>
                <select
                  className="input w-full"
                  value={newTemplate.assignee_role_id}
                  onChange={e => setNewTemplate(t => ({ ...t, assignee_role_id: e.target.value }))}
                >
                  <option value="">Select role (optional)</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={creatingTemplate}
              >
                {creatingTemplate ? "Creating Template..." : "Create Template"}
              </button>
            </form>
          </div>

          {/* Current Templates List */}
          <div className="p-6">
            <h4 className="text-base font-medium text-slate-900 mb-4">Current Templates ({templates.length})</h4>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {templates.length === 0 ? (
                <p className="text-slate-500 text-sm">No templates found</p>
              ) : (
                templates.map(template => (
                  <div key={template.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm text-slate-900">{template.title}</div>
                        {template.description && (
                          <div className="text-xs text-slate-600 mt-1">{template.description}</div>
                        )}
                        {template.default_notes && (
                          <div className="text-xs text-blue-600 mt-1">Notes: {template.default_notes}</div>
                        )}
                        <div className="flex gap-4 text-xs text-slate-500 mt-2">
                          {template.due_at && <span>Due: {template.due_at}</span>}
                          {template.assignee_role_id && (
                            <span>Role: {roles.find(r => r.id === template.assignee_role_id)?.name}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteTemplate(template.id)}
                        className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Order Approval Section */}
      {showOrderApprovals && (
        <div className="card mb-8">
          <div className="border-b border-slate-200 p-6">
            <h3 className="text-lg font-medium text-slate-900">Order Approvals</h3>
            <p className="text-sm text-slate-600 mt-1">Review and approve purchase orders from ordering managers</p>
          </div>
          
          <div className="p-6">
            {pendingOrders.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                <div className="text-4xl mb-4">✅</div>
                <div>No orders pending approval</div>
                <div className="text-sm mt-2">All orders have been processed</div>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingOrders.map(order => (
                  <div key={order.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="font-medium text-slate-900">{order.order_number}</div>
                        <div className="text-sm text-slate-600">{order.vendor_name}</div>
                        <div className="text-sm text-slate-500">
                          Created by: {order.creator_name} • 
                          Order Date: {new Date(order.order_date).toLocaleDateString()}
                          {order.expected_delivery && ` • Expected: ${new Date(order.expected_delivery).toLocaleDateString()}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-medium text-slate-900">${order.total_amount.toFixed(2)}</div>
                        <span className="px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-800">
                          Pending Approval
                        </span>
                      </div>
                    </div>
                    
                    {order.items && order.items.length > 0 && (
                      <div className="mb-4">
                        <div className="text-sm font-medium text-slate-900 mb-2">Order Items:</div>
                        <div className="space-y-1">
                          {order.items.map((item: any, index: number) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span>{item.inventory_item?.name || `Item ${item.inventory_item_id}`}</span>
                              <span>{item.quantity} × ${item.unit_cost.toFixed(2)} = ${item.total_cost.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {order.notes && (
                      <div className="mb-4 p-3 bg-blue-50 rounded text-sm">
                        <div className="font-medium text-blue-900 mb-1">Order Notes:</div>
                        <div className="text-blue-800">{order.notes}</div>
                      </div>
                    )}
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => approveOrder(order.id)}
                        className="btn btn-primary text-sm"
                      >
                        Approve Order
                      </button>
                      <button
                        onClick={() => rejectOrder(order.id)}
                        className="btn btn-outline text-sm border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                      >
                        Reject Order
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tasks Display */}
      {tasks.length > 0 && (
        <div className="card">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-lg font-medium text-slate-900">Today's Tasks ({tasks.length})</h2>
            <p className="text-sm text-slate-600 mt-1">Manage and track daily operational tasks</p>
          </div>
          
          <div className="p-6 space-y-4">
            {tasks.map((t) => {
              const title = t.title || t.name || `Task ${t.id}`;
              const done = !!(t.completed_at || t.status === "completed" || t.status === "done");
              const checked = selectedIds.has(t.id);
              return (
                <div key={t.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={e => {
                          setSelectedIds(prev => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(t.id);
                            else next.delete(t.id);
                            return next;
                          });
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div>
                        <div className="font-medium text-slate-900">{title}</div>
                        {t.due_at && (
                          <div className="text-sm text-slate-500">Due: {new Date(t.due_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                        )}
                      </div>
                    </div>
                    <div className={`px-2 py-1 text-xs font-medium rounded ${done ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {done ? 'Complete' : 'Pending'}
                    </div>
                  </div>
                  {t.notes && (
                    <div className="text-sm text-slate-600 pl-7">
                      {t.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {!loading && tasks.length === 0 && (
        <div className="card text-center">
          <div className="p-8">
            <div className="text-slate-400 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="font-medium text-slate-900 mb-1">No tasks for today yet</div>
            <div className="text-sm text-slate-600">Click "Generate Daily Tasks" to create from templates</div>
          </div>
        </div>
      )}
    </div>
  );
}
