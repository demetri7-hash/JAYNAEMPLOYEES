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

export default function KitchenManagerPage() {
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

  // Kitchen-specific state
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    notes: "",
    due_at: "",
    assignee_user_id: "",
    assignee_role_id: "",
  });
  const [creatingTask, setCreatingTask] = useState(false);

  // Kitchen-specific filters
  const [taskFilter, setTaskFilter] = useState<'all' | 'prep' | 'line' | 'cleaning'>('all');

  // Load users and roles
  useEffect(() => {
    const loadMeta = async () => {
      const { data: userData } = await supabase.from("profiles").select("id,email,name");
      setUsers(userData || []);
      const { data: roleData } = await supabase.from("roles").select("id,name");
      setRoles(roleData || []);
    };
    loadMeta();
  }, []);

  // Load kitchen-related tasks and templates
  useEffect(() => {
    let sub: any = null;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Load today's kitchen-related tasks (all tasks for kitchen manager oversight)
        const { data: allTasks, error: allErr } = await supabase
          .from("task_instances")
          .select("*")
          .eq("for_date", today)
          .order("due_at", { ascending: true, nullsFirst: true });
        if (allErr) throw allErr;
        setTasks(allTasks || []);

        // Load templates for kitchen operations
        const { data: tmpl, error: tmplErr } = await supabase
          .from("task_templates")
          .select("*");
        if (tmplErr) throw tmplErr;
        setTemplates(tmpl || []);

        // Subscribe to realtime changes
        sub = supabase
          .channel('kitchen-manager-tasks')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'task_instances',
            filter: `for_date=eq.${today}`,
          }, (payload: any) => {
            setTasks((prev) => {
              if (payload.eventType === 'INSERT') {
                if (!prev.some((t) => t.id === payload.new.id)) {
                  return [...prev, payload.new];
                }
                return prev;
              }
              if (payload.eventType === 'UPDATE') {
                return prev.map((t) => t.id === payload.new.id ? { ...t, ...payload.new } : t);
              }
              if (payload.eventType === 'DELETE') {
                return prev.filter((t) => t.id !== payload.old.id);
              }
              return prev;
            });
          })
          .subscribe();
      } catch (e: any) {
        setError(e?.message || "Failed to load kitchen data");
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => { if (sub) sub.unsubscribe(); };
  }, [today]);

  // Filter tasks by kitchen categories
  const filteredTasks = useMemo(() => {
    if (taskFilter === 'all') return tasks;
    
    return tasks.filter(task => {
      const title = (task.title || task.name || '').toLowerCase();
      switch (taskFilter) {
        case 'prep':
          return title.includes('prep') || title.includes('chop') || title.includes('slice') || title.includes('dice');
        case 'line':
          return title.includes('line') || title.includes('grill') || title.includes('fryer') || title.includes('station');
        case 'cleaning':
          return title.includes('clean') || title.includes('sanitize') || title.includes('wash') || title.includes('wipe');
        default:
          return true;
      }
    });
  }, [tasks, taskFilter]);

  // Create kitchen tasks from templates
  const createKitchenTasks = async () => {
    setCreating(true);
    setError(null);
    try {
      const kitchenTemplates = templates.filter(tmpl => {
        const title = (tmpl.title || tmpl.name || '').toLowerCase();
        return title.includes('kitchen') || title.includes('prep') || title.includes('line') || title.includes('cook');
      });
      
      const payloads = kitchenTemplates.map((tmpl) => ({
        title: tmpl.title || tmpl.name,
        description: tmpl.description,
        notes: tmpl.default_notes,
        for_date: today,
        assignee_role_id: tmpl.assignee_role_id,
        assignee_user_id: tmpl.assignee_user_id,
        due_at: tmpl.due_at,
        status: "pending",
      }));
      
      if (payloads.length === 0) throw new Error("No kitchen templates found");
      const { error: insErr } = await supabase.from("task_instances").insert(payloads);
      if (insErr) throw insErr;
    } catch (e: any) {
      setError(e?.message || "Failed to create kitchen tasks");
    } finally {
      setCreating(false);
    }
  };

  // Create custom task
  const handleCreateTask = async (e: any) => {
    e.preventDefault();
    setCreatingTask(true);
    try {
      const payload: any = {
        title: newTask.title,
        notes: newTask.notes,
        for_date: today,
        due_at: newTask.due_at || null,
        assignee_user_id: newTask.assignee_user_id || null,
        assignee_role_id: newTask.assignee_role_id || null,
        status: "pending",
      };
      if (!payload.title) throw new Error("Title required");
      const { error: insErr } = await supabase.from("task_instances").insert([payload]);
      if (insErr) throw insErr;
      setShowCreate(false);
      setNewTask({ title: "", notes: "", due_at: "", assignee_user_id: "", assignee_role_id: "" });
    } catch (e: any) {
      setError(e?.message || "Failed to create task");
    } finally {
      setCreatingTask(false);
    }
  };

  // Toggle task completion
  const toggleDone = async (task: Task) => {
    try {
      setUpdatingIds((prev) => new Set(prev).add(task.id));
      const done = !!(task.completed_at || task.status === "completed" || task.status === "done");
      const patch: any = done
        ? { completed_at: null, status: "pending" }
        : { completed_at: new Date().toISOString(), status: "completed" };
      const { error: updErr } = await supabase.from("task_instances").update(patch).eq("id", task.id);
      if (updErr) throw updErr;
    } catch (e: any) {
      setError(e?.message || "Failed to update task");
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  };

  // Edit task
  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setEditNotes(task.notes || "");
    setEditReason(task.completion_reason || "");
  };
  
  const saveEdit = async (task: Task) => {
    try {
      setUpdatingIds((prev) => new Set(prev).add(task.id));
      const patch: any = { notes: editNotes, completion_reason: editReason };
      const { error: updErr } = await supabase.from("task_instances").update(patch).eq("id", task.id);
      if (updErr) throw updErr;
      setEditingId(null);
    } catch (e: any) {
      setError(e?.message || "Failed to update notes/reason");
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  };

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-bold text-center mb-4">🍽️ Kitchen Manager Dashboard</h1>
      
      {/* Kitchen Status Overview */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-center">
          <div className="text-green-900 font-semibold">✅ Completed</div>
          <div className="text-2xl font-bold text-green-700">
            {filteredTasks.filter(t => t.completed_at || t.status === 'completed').length}
          </div>
        </div>
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center">
          <div className="text-amber-900 font-semibold">⏳ Pending</div>
          <div className="text-2xl font-bold text-amber-700">
            {filteredTasks.filter(t => !t.completed_at && t.status !== 'completed').length}
          </div>
        </div>
      </div>

      {/* Kitchen Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          className="rounded-lg bg-blue-600 px-4 py-3 text-white font-medium"
          onClick={createKitchenTasks}
          disabled={creating}
        >
          {creating ? "Creating…" : "🎯 Generate Kitchen Tasks"}
        </button>
        <button
          className="rounded-lg bg-green-600 px-4 py-3 text-white font-medium"
          onClick={() => setShowCreate(v => !v)}
        >
          {showCreate ? "❌ Cancel" : "➕ Create Kitchen Task"}
        </button>
      </div>

      {/* Quick Links */}
      <div className="flex gap-3 mb-4">
        <a href="/today" className="rounded-lg bg-purple-100 px-3 py-2 text-purple-800 text-sm font-medium flex-1 text-center">
          📋 All Tasks
        </a>
        <a href="/prep" className="rounded-lg bg-green-100 px-3 py-2 text-green-800 text-sm font-medium flex-1 text-center">
          🥗 Prep Flow
        </a>
        <a href="/inventory" className="rounded-lg bg-blue-100 px-3 py-2 text-blue-800 text-sm font-medium flex-1 text-center">
          📦 Inventory
        </a>
      </div>

      {/* Task Category Filters */}
      <div className="flex gap-2 mb-4">
        <button
          className={`px-3 py-2 rounded-lg text-sm font-medium ${taskFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          onClick={() => setTaskFilter('all')}
        >🍽️ All Tasks</button>
        <button
          className={`px-3 py-2 rounded-lg text-sm font-medium ${taskFilter === 'prep' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}
          onClick={() => setTaskFilter('prep')}
        >🥗 Prep</button>
        <button
          className={`px-3 py-2 rounded-lg text-sm font-medium ${taskFilter === 'line' ? 'bg-red-600 text-white' : 'bg-gray-100'}`}
          onClick={() => setTaskFilter('line')}
        >🔥 Line</button>
        <button
          className={`px-3 py-2 rounded-lg text-sm font-medium ${taskFilter === 'cleaning' ? 'bg-purple-600 text-white' : 'bg-gray-100'}`}
          onClick={() => setTaskFilter('cleaning')}
        >🧹 Cleaning</button>
      </div>

      {/* Custom Task Creation */}
      {showCreate && (
        <form className="space-y-3 p-4 border rounded-lg bg-green-50 mb-4" onSubmit={handleCreateTask}>
          <div className="font-semibold text-green-900">🍽️ Create Kitchen Task</div>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="Task title (e.g., 'Prep vegetables for lunch rush')"
            value={newTask.title}
            onChange={e => setNewTask(t => ({ ...t, title: e.target.value }))}
            required
          />
          <textarea
            className="w-full rounded-lg border px-3 py-2 text-sm"
            rows={3}
            placeholder="Detailed instructions"
            value={newTask.notes}
            onChange={e => setNewTask(t => ({ ...t, notes: e.target.value }))}
          />
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm"
            type="time"
            value={newTask.due_at}
            onChange={e => setNewTask(t => ({ ...t, due_at: e.target.value }))}
          />
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={newTask.assignee_role_id}
            onChange={e => setNewTask(t => ({ ...t, assignee_role_id: e.target.value }))}
          >
            <option value="">👥 Assign to role</option>
            {roles.filter(r => ['line_cook', 'prep_cook', 'lead_prep_cook'].includes(r.name)).map(r => 
              <option key={r.id} value={r.id}>{r.name}</option>
            )}
          </select>
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={newTask.assignee_user_id}
            onChange={e => setNewTask(t => ({ ...t, assignee_user_id: e.target.value }))}
          >
            <option value="">👤 Assign to specific person (optional)</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
          </select>
          <button
            type="submit"
            className="w-full rounded-lg bg-green-600 px-4 py-2 text-white font-medium"
            disabled={creatingTask}
          >{creatingTask ? "Creating…" : "✅ Create Task"}</button>
        </form>
      )}

      {loading && <p className="text-center text-gray-600">Loading kitchen operations...</p>}
      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-sm">{error}</div>}

      {/* Tasks Display */}
      {filteredTasks.length > 0 ? (
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">
            🍽️ Kitchen Tasks ({filteredTasks.length}) - {taskFilter === 'all' ? 'All Categories' : taskFilter.charAt(0).toUpperCase() + taskFilter.slice(1)}
          </h2>
          {filteredTasks.map((task) => {
            const title = task.title || task.name || `Task ${task.id}`;
            const done = !!(task.completed_at || task.status === "completed");
            return (
              <div key={task.id} className="rounded-lg bg-white p-4 border shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div>
                    <div className="font-medium text-lg">{title}</div>
                    {task.due_at && (
                      <div className="text-sm text-gray-500">⏰ Due: {new Date(task.due_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                    )}
                    <div className="text-sm text-gray-500">
                      👤 {task.assignee_user_id || "Unassigned"} | 👥 {task.assignee_role_id || "Unassigned"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm px-3 py-1 rounded-full font-medium ${done ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {done ? "✅ Done" : "⏳ Pending"}
                    </span>
                    <button
                      disabled={updatingIds.has(task.id)}
                      onClick={() => toggleDone(task)}
                      className={`text-sm rounded-lg px-3 py-1 border font-medium ${done ? "bg-white hover:bg-gray-50" : "bg-green-600 text-white"}`}
                    >
                      {updatingIds.has(task.id) ? "⏳" : done ? "↩️ Undo" : "✅ Mark Done"}
                    </button>
                    <button
                      className="text-sm rounded-lg px-3 py-1 border bg-blue-50 hover:bg-blue-100 font-medium"
                      onClick={() => startEdit(task)}
                    >✏️ Edit</button>
                  </div>
                </div>
                
                {editingId === task.id ? (
                  <form className="mt-3 space-y-3 p-3 bg-gray-50 rounded-lg" onSubmit={e => { e.preventDefault(); saveEdit(task); }}>
                    <textarea
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      rows={3}
                      value={editNotes}
                      onChange={e => setEditNotes(e.target.value)}
                      placeholder="Task notes"
                    />
                    <input
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      value={editReason}
                      onChange={e => setEditReason(e.target.value)}
                      placeholder="Completion reason"
                    />
                    <div className="flex gap-2">
                      <button type="submit" className="rounded-lg bg-green-600 px-4 py-2 text-white text-sm font-medium" disabled={updatingIds.has(task.id)}>💾 Save</button>
                      <button type="button" className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium" onClick={() => setEditingId(null)}>❌ Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    {task.notes && <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">📝 {task.notes}</div>}
                    {task.completion_reason && <div className="mt-1 text-xs text-gray-500">✅ {task.completion_reason}</div>}
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        !loading && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🍽️</div>
            <div className="font-medium mb-1">No kitchen tasks yet</div>
            <div className="text-sm">Create tasks to manage kitchen operations</div>
          </div>
        )
      )}
    </div>
  );
}
