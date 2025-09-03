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

  // Bulk actions and assignment state
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  
  // Custom task creation state
  const [showCreate, setShowCreate] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    notes: "",
    due_at: "",
    assignee_user_id: "",
    assignee_role_id: "",
  });
  const [creatingTask, setCreatingTask] = useState(false);

  // Load users and roles for assignment/transfer
  useEffect(() => {
    const loadMeta = async () => {
      const { data: userData } = await supabase.from("profiles").select("id,email,name");
      setUsers(userData || []);
      const { data: roleData } = await supabase.from("roles").select("id,name");
      setRoles(roleData || []);
    };
    loadMeta();
  }, []);

  // Load all today's tasks and templates
  useEffect(() => {
    let sub: any = null;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Load all today's tasks
        const { data: allTasks, error: allErr } = await supabase
          .from("task_instances")
          .select("*")
          .eq("for_date", today)
          .order("due_at", { ascending: true, nullsFirst: true });
        if (allErr) throw allErr;
        setTasks(allTasks || []);

        // Load templates
        const { data: tmpl, error: tmplErr } = await supabase
          .from("task_templates")
          .select("*");
        if (tmplErr) throw tmplErr;
        setTemplates(tmpl || []);

        // Subscribe to realtime changes for today
        sub = supabase
          .channel('gm-tasks')
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
        setError(e?.message || "Failed to load tasks/templates");
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => { if (sub) sub.unsubscribe(); };
  }, [today]);

  // Create today's tasks from templates
  const createTasks = async () => {
    setCreating(true);
    setError(null);
    try {
      // For each template, create a task_instance for today
      const payloads = templates.map((tmpl) => ({
        title: tmpl.title || tmpl.name,
        description: tmpl.description,
        notes: tmpl.default_notes,
        for_date: today,
        assignee_role_id: tmpl.assignee_role_id,
        assignee_user_id: tmpl.assignee_user_id,
        due_at: tmpl.due_at,
        status: "pending",
      }));
      if (payloads.length === 0) throw new Error("No templates found");
      const { error: insErr } = await supabase
        .from("task_instances")
        .insert(payloads);
      if (insErr) throw insErr;
    } catch (e: any) {
      setError(e?.message || "Failed to create tasks");
    } finally {
      setCreating(false);
    }
  };

  // Custom task creation handler
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

  // Mark done/undo
  const toggleDone = async (task: Task) => {
    try {
      setUpdatingIds((prev) => new Set(prev).add(task.id));
      const done = !!(task.completed_at || task.status === "completed" || task.status === "done");
      const patch: any = done
        ? { completed_at: null, status: "pending" }
        : { completed_at: new Date().toISOString(), status: "completed" };
      const { error: updErr } = await supabase
        .from("task_instances")
        .update(patch)
        .eq("id", task.id);
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

  // Edit notes/completion reason
  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setEditNotes(task.notes || "");
    setEditReason(task.completion_reason || "");
  };
  
  const saveEdit = async (task: Task) => {
    try {
      setUpdatingIds((prev) => new Set(prev).add(task.id));
      const patch: any = {
        notes: editNotes,
        completion_reason: editReason,
      };
      const { error: updErr } = await supabase
        .from("task_instances")
        .update(patch)
        .eq("id", task.id);
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
      <h1 className="text-2xl font-bold text-center mb-4">JAYNA Gyro - General Manager</h1>
      
      {/* Announcements section */}
      <div className="rounded bg-yellow-50 border border-yellow-200 p-3 mb-4">
        <div className="font-semibold text-yellow-900 mb-1">📢 Daily Announcements</div>
        <div className="text-sm text-yellow-800">Welcome to your management dashboard! All systems ready for operations.</div>
      </div>
      
      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          className="rounded-lg bg-emerald-600 px-4 py-3 text-white font-medium text-center"
          onClick={createTasks}
          disabled={creating}
        >
          {creating ? "Creating…" : "🎯 Generate Today's Tasks"}
        </button>
        <button
          className="rounded-lg bg-blue-600 px-4 py-3 text-white font-medium text-center"
          onClick={() => setShowCreate((v) => !v)}
        >
          {showCreate ? "❌ Cancel" : "➕ Create Custom Task"}
        </button>
      </div>
      
      {/* Quick links */}
      <div className="flex gap-3 mb-4">
        <a href="/inventory" className="rounded-lg bg-purple-100 px-4 py-2 text-purple-800 text-sm font-medium text-center flex-1">
          📦 Inventory
        </a>
        <a href="/prep" className="rounded-lg bg-green-100 px-4 py-2 text-green-800 text-sm font-medium text-center flex-1">
          🥗 Prep Flow
        </a>
        <a href="/today" className="rounded-lg bg-blue-100 px-4 py-2 text-blue-800 text-sm font-medium text-center flex-1">
          📋 Today's View
        </a>
      </div>
      
      {/* Custom task creation form */}
      {showCreate && (
        <form className="space-y-3 p-4 border rounded-lg bg-blue-50 mb-4" onSubmit={handleCreateTask}>
          <div className="font-semibold text-blue-900">✨ Create Custom Task</div>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="Task title (required)"
            value={newTask.title}
            onChange={e => setNewTask(t => ({ ...t, title: e.target.value }))}
            required
          />
          <textarea
            className="w-full rounded-lg border px-3 py-2 text-sm"
            rows={3}
            placeholder="Additional notes or instructions"
            value={newTask.notes}
            onChange={e => setNewTask(t => ({ ...t, notes: e.target.value }))}
          />
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm"
            type="time"
            value={newTask.due_at}
            onChange={e => setNewTask(t => ({ ...t, due_at: e.target.value }))}
            placeholder="Due time (optional)"
          />
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={newTask.assignee_user_id}
            onChange={e => setNewTask(t => ({ ...t, assignee_user_id: e.target.value }))}
          >
            <option value="">👤 Assign to specific person (optional)</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email || u.id}</option>)}
          </select>
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={newTask.assignee_role_id}
            onChange={e => setNewTask(t => ({ ...t, assignee_role_id: e.target.value }))}
          >
            <option value="">👥 Assign to role (optional)</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white font-medium"
            disabled={creatingTask}
          >{creatingTask ? "Creating…" : "✅ Create Task"}</button>
        </form>
      )}
      
      {loading && <p className="text-center text-gray-600">Loading tasks...</p>}
      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-sm">{error}</div>}
      
      {/* Task Management Section */}
      {tasks.length > 0 && (
        <>
          {/* Bulk actions bar */}
          <div className="bg-gray-50 border rounded-lg p-3 mb-4">
            <div className="text-sm font-medium mb-2">🔧 Bulk Actions ({selectedIds.size} selected)</div>
            <div className="flex flex-wrap gap-2">
              <button
                className="px-3 py-1 rounded-lg text-sm bg-emerald-600 text-white disabled:bg-gray-300"
                disabled={selectedIds.size === 0}
                onClick={async () => {
                  for (const id of selectedIds) await toggleDone(tasks.find(t => t.id === id)!);
                  setSelectedIds(new Set());
                }}
              >✅ Toggle Done</button>
              <button
                className="px-3 py-1 rounded-lg text-sm bg-blue-600 text-white disabled:bg-gray-300"
                disabled={selectedIds.size === 0}
                onClick={() => {
                  const first = tasks.find(t => t.id === Array.from(selectedIds)[0]);
                  if (first) startEdit(first);
                }}
              >✏️ Edit Notes</button>
              <button
                className="px-3 py-1 rounded-lg text-sm bg-red-600 text-white disabled:bg-gray-300"
                disabled={selectedIds.size === 0}
                onClick={async () => {
                  if (!window.confirm("Delete selected tasks?")) return;
                  for (const id of selectedIds) {
                    await supabase.from("task_instances").delete().eq("id", id);
                  }
                  setSelectedIds(new Set());
                }}
              >🗑️ Delete</button>
              <select
                className="px-2 py-1 rounded-lg border text-sm disabled:bg-gray-100"
                disabled={selectedIds.size === 0}
                onChange={async (e) => {
                  const val = e.target.value;
                  if (!val) return;
                  for (const id of selectedIds) {
                    await supabase.from("task_instances").update({ assignee_user_id: val }).eq("id", id);
                  }
                  setSelectedIds(new Set());
                }}
              >
                <option value="">👤 Assign to user</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email || u.id}</option>)}
              </select>
              <select
                className="px-2 py-1 rounded-lg border text-sm disabled:bg-gray-100"
                disabled={selectedIds.size === 0}
                onChange={async (e) => {
                  const val = e.target.value;
                  if (!val) return;
                  for (const id of selectedIds) {
                    await supabase.from("task_instances").update({ assignee_role_id: val }).eq("id", id);
                  }
                  setSelectedIds(new Set());
                }}
              >
                <option value="">👥 Assign to role</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>
          
          {/* Tasks list */}
          <div className="space-y-3">
            <h2 className="font-semibold text-lg">📋 Today's Tasks ({tasks.length})</h2>
            {tasks.map((t) => {
              const title = t.title || t.name || `Task ${t.id}`;
              const done = !!(t.completed_at || t.status === "completed" || t.status === "done");
              const checked = selectedIds.has(t.id);
              return (
                <div key={t.id} className="rounded-lg bg-white p-4 border shadow-sm">
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
                        className="w-4 h-4"
                      />
                      <div>
                        <div className="font-medium text-lg">{title}</div>
                        {t.due_at && (
                          <div className="text-sm text-gray-500">⏰ Due: {new Date(t.due_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                        )}
                        <div className="text-sm text-gray-500">
                          👤 User: {t.assignee_user_id || "Unassigned"} | 👥 Role: {t.assignee_role_id || "Unassigned"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm px-3 py-1 rounded-full font-medium ${done ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {done ? "✅ Done" : "⏳ Pending"}
                      </span>
                      <button
                        disabled={updatingIds.has(t.id)}
                        onClick={() => toggleDone(t)}
                        className={`text-sm rounded-lg px-3 py-1 border font-medium ${done ? "bg-white hover:bg-gray-50" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
                      >
                        {updatingIds.has(t.id) ? "⏳" : done ? "↩️ Undo" : "✅ Done"}
                      </button>
                      <button
                        className="text-sm rounded-lg px-3 py-1 border bg-blue-50 hover:bg-blue-100 font-medium"
                        onClick={() => startEdit(t)}
                      >✏️ Edit</button>
                    </div>
                  </div>
                  
                  {editingId === t.id ? (
                    <form
                      className="mt-3 space-y-3 p-3 bg-gray-50 rounded-lg"
                      onSubmit={e => { e.preventDefault(); saveEdit(t); }}
                    >
                      <textarea
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        rows={3}
                        value={editNotes}
                        onChange={e => setEditNotes(e.target.value)}
                        placeholder="Task notes or instructions"
                      />
                      <input
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        value={editReason}
                        onChange={e => setEditReason(e.target.value)}
                        placeholder="Completion reason (optional)"
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="rounded-lg bg-emerald-600 px-4 py-2 text-white text-sm font-medium"
                          disabled={updatingIds.has(t.id)}
                        >💾 Save Changes</button>
                        <button
                          type="button"
                          className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium"
                          onClick={() => setEditingId(null)}
                        >❌ Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      {t.notes && <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">📝 {t.notes}</div>}
                      {t.completion_reason && <div className="mt-1 text-xs text-gray-500">✅ Completed: {t.completion_reason}</div>}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
      
      {!loading && tasks.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📋</div>
          <div className="font-medium mb-1">No tasks for today yet</div>
          <div className="text-sm">Click "Generate Today's Tasks" to create from templates</div>
        </div>
      )}
    </div>
  );
}
