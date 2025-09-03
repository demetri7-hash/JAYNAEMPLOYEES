"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase-browser";

type Task = {
  id: string | number;
  title?: string | null;
  name?: string | null; // fallback if schema uses name
  description?: string | null;
  notes?: string | null;
  for_date?: string | null;
  due_at?: string | null;
  status?: string | null;
  completed_at?: string | null;
  assignee_user_id?: string | null;
  assignee_role_id?: string | null;
};

export default function TodayPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [updatingIds, setUpdatingIds] = useState<Set<string | number>>(new Set());
  const [filter, setFilter] = useState<'all' | 'mine' | 'role'>('all');
  const [uid, setUid] = useState<string | null>(null);
  const [roleIds, setRoleIds] = useState<string[]>([]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    let sub: any = null;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) throw sessionErr;
        const _uid = sessionData.session?.user?.id;
        setUid(_uid || null);
        if (!_uid) {
          setTasks([]);
          setLoading(false);
          return;
        }

        // Load role IDs for this user
        const { data: userRoles, error: urErr } = await supabase
          .from("user_roles")
          .select("role_id")
          .eq("user_id", _uid);
        if (urErr) throw urErr;
        const _roleIds = (userRoles || []).map((r: any) => r.role_id);
        setRoleIds(_roleIds);

        // Query tasks directly assigned to the user for today
        const { data: userTasks, error: userTasksErr } = await supabase
          .from("task_instances")
          .select("*")
          .eq("for_date", today)
          .eq("assignee_user_id", _uid)
          .order("due_at", { ascending: true, nullsFirst: true });
        if (userTasksErr) throw userTasksErr;

        // Query tasks assigned to any of the user's roles for today
        let roleTasks: Task[] = [];
        if (_roleIds.length > 0) {
          const { data: _roleTasks, error: roleTasksErr } = await supabase
            .from("task_instances")
            .select("*")
            .eq("for_date", today)
            .in("assignee_role_id", _roleIds)
            .order("due_at", { ascending: true, nullsFirst: true });
          if (roleTasksErr) throw roleTasksErr;
          roleTasks = _roleTasks || [];
        }

        // Merge by id to avoid duplicates
        const byId = new Map<string | number, Task>();
        (userTasks || []).forEach((t: Task) => byId.set(t.id, t));
        roleTasks.forEach((t: Task) => byId.set(t.id, t));
        const merged = Array.from(byId.values());

        // Sort: incomplete first (based on completed_at or status), then due_at, then title/name
        merged.sort((a, b) => {
          const aDone = !!(a.completed_at || a.status === "completed" || a.status === "done");
          const bDone = !!(b.completed_at || b.status === "completed" || b.status === "done");
          if (aDone !== bDone) return aDone ? 1 : -1;
          const ad = a.due_at || "";
          const bd = b.due_at || "";
          if (ad !== bd) return ad.localeCompare(bd);
          const at = (a.title || a.name || "").toLowerCase();
          const bt = (b.title || b.name || "").toLowerCase();
          return at.localeCompare(bt);
        });

        setTasks(merged);

        // Subscribe to realtime changes for today
        sub = supabase
          .channel('today-tasks')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'task_instances',
            filter: `for_date=eq.${today}`,
          }, (payload: any) => {
            setTasks((prev) => {
              if (payload.eventType === 'INSERT') {
                // Add new task if not present
                if (!prev.some((t) => t.id === payload.new.id)) {
                  return [...prev, payload.new];
                }
                return prev;
              }
              if (payload.eventType === 'UPDATE') {
                // Update task
                return prev.map((t) => t.id === payload.new.id ? { ...t, ...payload.new } : t);
              }
              if (payload.eventType === 'DELETE') {
                // Remove task
                return prev.filter((t) => t.id !== payload.old.id);
              }
              return prev;
            });
          })
          .subscribe();
      } catch (e: any) {
        setError(e?.message || "Failed to load tasks");
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => {
      if (sub) sub.unsubscribe();
    };
  }, [today]);

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
      // Optimistic local update
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, ...patch } : t))
      );
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

  // Filter logic
  const filteredTasks = useMemo(() => {
    if (filter === 'mine' && uid) {
      return tasks.filter((t) => t.assignee_user_id === uid);
    }
    if (filter === 'role' && roleIds.length > 0) {
      return tasks.filter((t) => t.assignee_role_id && roleIds.includes(t.assignee_role_id));
    }
    return tasks;
  }, [tasks, filter, uid, roleIds]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Today’s Tasks</h1>
      <div className="flex gap-2 mb-2">
        <button
          className={`px-3 py-1 rounded border text-sm ${filter === 'all' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white'}`}
          onClick={() => setFilter('all')}
        >All</button>
        <button
          className={`px-3 py-1 rounded border text-sm ${filter === 'mine' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white'}`}
          onClick={() => setFilter('mine')}
        >Mine</button>
        <button
          className={`px-3 py-1 rounded border text-sm ${filter === 'role' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white'}`}
          onClick={() => setFilter('role')}
        >By Role</button>
      </div>
      {loading && <p className="text-gray-600">Loading…</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {!loading && !error && filteredTasks.length === 0 && (
        <p className="text-gray-600">No tasks for today.</p>
      )}
      <ul className="space-y-2">
        {filteredTasks.map((t) => {
          const title = t.title || t.name || `Task ${t.id}`;
          const done = !!(t.completed_at || t.status === "completed" || t.status === "done");
          return (
            <li key={t.id} className="rounded-lg bg-white p-3 border shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{title}</div>
                  {t.due_at && (
                    <div className="text-xs text-gray-500">Due: {new Date(t.due_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${done ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {done ? "Done" : "Pending"}
                  </span>
                  <button
                    disabled={updatingIds.has(t.id)}
                    onClick={() => toggleDone(t)}
                    className={`text-xs rounded px-2 py-1 border ${done ? "bg-white" : "bg-emerald-600 text-white border-emerald-600"}`}
                  >
                    {updatingIds.has(t.id) ? "…" : done ? "Undo" : "Mark done"}
                  </button>
                </div>
              </div>
              {t.notes && <div className="mt-2 text-sm text-gray-700">{t.notes}</div>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
