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
};

export default function TodayPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [updatingIds, setUpdatingIds] = useState<Set<string | number>>(new Set());

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) throw sessionErr;
        const uid = sessionData.session?.user?.id;
        if (!uid) {
          setTasks([]);
          setLoading(false);
          return;
        }

        // Load role IDs for this user
        const { data: userRoles, error: urErr } = await supabase
          .from("user_roles")
          .select("role_id")
          .eq("user_id", uid);
        if (urErr) throw urErr;
        const roleIds = (userRoles || []).map((r: any) => r.role_id);

        // Query tasks directly assigned to the user for today
        const { data: userTasks, error: userTasksErr } = await supabase
          .from("task_instances")
          .select("*")
          .eq("for_date", today)
          .eq("assignee_user_id", uid)
          .order("due_at", { ascending: true, nullsFirst: true });
        if (userTasksErr) throw userTasksErr;

        // Query tasks assigned to any of the user's roles for today
        let roleTasks: Task[] = [];
        if (roleIds.length > 0) {
          const { data: _roleTasks, error: roleTasksErr } = await supabase
            .from("task_instances")
            .select("*")
            .eq("for_date", today)
            .in("assignee_role_id", roleIds)
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
      } catch (e: any) {
        setError(e?.message || "Failed to load tasks");
      } finally {
        setLoading(false);
      }
    };
    load();
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

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Today’s Tasks</h1>
      {loading && <p className="text-gray-600">Loading…</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {!loading && !error && tasks.length === 0 && (
        <p className="text-gray-600">No tasks for today.</p>
      )}
      <ul className="space-y-2">
        {tasks.map((t) => {
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
