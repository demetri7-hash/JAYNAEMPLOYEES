"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase-browser";

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

export default function OpeningLineCookPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [updatingIds, setUpdatingIds] = useState<Set<string | number>>(new Set());
  const [uid, setUid] = useState<string | null>(null);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Load tasks for opening line cook
  useEffect(() => {
    let sub: any = null;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const _uid = sessionData.session?.user?.id;
        setUid(_uid || null);

        if (!_uid) {
          setTasks([]);
          setLoading(false);
          return;
        }

        // Get user's role IDs
        const { data: userRoles } = await supabase
          .from("user_roles")
          .select("role_id")
          .eq("user_id", _uid);
        const roleIds = (userRoles || []).map((r) => r.role_id);

        // Load today's tasks assigned to this user or their roles
        const { data: allTasks, error: allErr } = await supabase
          .from("task_instances")
          .select("*")
          .eq("for_date", today)
          .or(`assignee_user_id.eq.${_uid},assignee_role_id.in.(${roleIds.join(",")})`)
          .order("due_at", { ascending: true, nullsFirst: true });
        if (allErr) throw allErr;
        setTasks(allTasks || []);

        // Subscribe to realtime changes
        sub = supabase
          .channel('opening-line-cook-tasks')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'task_instances',
            filter: `for_date=eq.${today}`,
          }, (payload: any) => {
            setTasks((prev) => {
              if (payload.eventType === 'INSERT') {
                const newTask = payload.new;
                if (newTask.assignee_user_id === _uid || roleIds.includes(newTask.assignee_role_id)) {
                  if (!prev.some((t) => t.id === newTask.id)) {
                    return [...prev, newTask];
                  }
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
        setError(e?.message || "Failed to load tasks");
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => { if (sub) sub.unsubscribe(); };
  }, [today]);

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

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-bold text-center mb-4">🌅 Opening Line Cook</h1>
      
      {/* Quick Status */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-center">
          <div className="text-green-900 font-semibold">✅ Completed</div>
          <div className="text-2xl font-bold text-green-700">
            {tasks.filter(t => t.completed_at || t.status === 'completed').length}
          </div>
        </div>
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center">
          <div className="text-amber-900 font-semibold">⏳ To Do</div>
          <div className="text-2xl font-bold text-amber-700">
            {tasks.filter(t => !t.completed_at && t.status !== 'completed').length}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="flex gap-3 mb-4">
        <a href="/today" className="rounded-lg bg-blue-100 px-3 py-2 text-blue-800 text-sm font-medium flex-1 text-center">
          📋 All Tasks
        </a>
        <a href="/kitchen_manager" className="rounded-lg bg-green-100 px-3 py-2 text-green-800 text-sm font-medium flex-1 text-center">
          🍽️ Kitchen
        </a>
      </div>

      {loading && <p className="text-center text-gray-600">Loading your tasks...</p>}
      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-sm">{error}</div>}

      {/* Tasks Display */}
      {tasks.length > 0 ? (
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">🌅 Your Opening Tasks ({tasks.length})</h2>
          {tasks.map((task) => {
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
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm px-3 py-1 rounded-full font-medium ${done ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {done ? "✅ Done" : "⏳ To Do"}
                    </span>
                    <button
                      disabled={updatingIds.has(task.id)}
                      onClick={() => toggleDone(task)}
                      className={`text-sm rounded-lg px-3 py-1 border font-medium ${done ? "bg-white hover:bg-gray-50" : "bg-green-600 text-white"}`}
                    >
                      {updatingIds.has(task.id) ? "⏳" : done ? "↩️ Undo" : "✅ Mark Done"}
                    </button>
                  </div>
                </div>
                
                {task.notes && <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">📝 {task.notes}</div>}
                {task.completion_reason && <div className="mt-1 text-xs text-gray-500">✅ {task.completion_reason}</div>}
              </div>
            );
          })}
        </div>
      ) : (
        !loading && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🌅</div>
            <div className="font-medium mb-1">No opening tasks assigned yet</div>
            <div className="text-sm">Check with management or view all tasks</div>
          </div>
        )
      )}

      {/* Opening Guidelines */}
      <div className="mt-6 rounded-lg bg-blue-50 border border-blue-200 p-4">
        <h3 className="font-semibold text-blue-900 mb-2">🌅 Opening Line Cook Checklist</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Turn on all cooking equipment and let preheat</li>
          <li>• Check grill, fryer, and other stations are clean</li>
          <li>• Stock your station with needed ingredients</li>
          <li>• Verify prep items are ready for service</li>
          <li>• Complete food safety temperature checks</li>
          <li>• Notify management when ready for service</li>
        </ul>
      </div>
    </div>
  );
}
