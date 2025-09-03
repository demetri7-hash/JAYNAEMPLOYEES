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

export default function LeadPrepCookPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [updatingIds, setUpdatingIds] = useState<Set<string | number>>(new Set());
  const [filter, setFilter] = useState<'all' | 'mine' | 'prep'>('all');
  const [uid, setUid] = useState<string | null>(null);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Load tasks for lead prep cook
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

        // Load today's prep-related tasks
        const { data: allTasks, error: allErr } = await supabase
          .from("task_instances")
          .select("*")
          .eq("for_date", today)
          .order("due_at", { ascending: true, nullsFirst: true });
        if (allErr) throw allErr;
        setTasks(allTasks || []);

        // Subscribe to realtime changes
        sub = supabase
          .channel('lead-prep-tasks')
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
        setError(e?.message || "Failed to load prep tasks");
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => { if (sub) sub.unsubscribe(); };
  }, [today]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    if (filter === 'all') return tasks;
    if (filter === 'mine') return tasks.filter(t => t.assignee_user_id === uid);
    if (filter === 'prep') {
      return tasks.filter(t => {
        const title = (t.title || t.name || '').toLowerCase();
        return title.includes('prep') || title.includes('chop') || title.includes('slice') || 
               title.includes('dice') || title.includes('cut') || t.assignee_role_id === 'lead_prep_cook';
      });
    }
    return tasks;
  }, [tasks, filter, uid]);

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
      <h1 className="text-2xl font-bold text-center mb-4">🥗 Lead Prep Cook Dashboard</h1>
      
      {/* Prep Status Overview */}
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

      {/* Quick Links */}
      <div className="flex gap-3 mb-4">
        <a href="/today" className="rounded-lg bg-blue-100 px-3 py-2 text-blue-800 text-sm font-medium flex-1 text-center">
          📋 All Tasks
        </a>
        <a href="/kitchen_manager" className="rounded-lg bg-green-100 px-3 py-2 text-green-800 text-sm font-medium flex-1 text-center">
          🍽️ Kitchen
        </a>
        <a href="/inventory" className="rounded-lg bg-purple-100 px-3 py-2 text-purple-800 text-sm font-medium flex-1 text-center">
          📦 Inventory
        </a>
      </div>

      {/* Task Filters */}
      <div className="flex gap-2 mb-4">
        <button
          className={`px-3 py-2 rounded-lg text-sm font-medium ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          onClick={() => setFilter('all')}
        >📋 All Tasks</button>
        <button
          className={`px-3 py-2 rounded-lg text-sm font-medium ${filter === 'mine' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}
          onClick={() => setFilter('mine')}
        >👤 My Tasks</button>
        <button
          className={`px-3 py-2 rounded-lg text-sm font-medium ${filter === 'prep' ? 'bg-orange-600 text-white' : 'bg-gray-100'}`}
          onClick={() => setFilter('prep')}
        >🥗 Prep Only</button>
      </div>

      {loading && <p className="text-center text-gray-600">Loading prep tasks...</p>}
      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-sm">{error}</div>}

      {/* Tasks Display */}
      {filteredTasks.length > 0 ? (
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">
            🥗 Prep Tasks ({filteredTasks.length}) - {filter === 'all' ? 'All Tasks' : filter === 'mine' ? 'My Tasks' : 'Prep Only'}
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
                      👤 {task.assignee_user_id === uid ? "You" : task.assignee_user_id || "Unassigned"} | 👥 {task.assignee_role_id || "Unassigned"}
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
            <div className="text-4xl mb-2">🥗</div>
            <div className="font-medium mb-1">No prep tasks yet</div>
            <div className="text-sm">Check back or contact management for task assignments</div>
          </div>
        )
      )}

      {/* Prep Guidelines */}
      <div className="mt-6 rounded-lg bg-green-50 border border-green-200 p-4">
        <h3 className="font-semibold text-green-900 mb-2">🥗 Lead Prep Cook Guidelines</h3>
        <ul className="text-sm text-green-800 space-y-1">
          <li>• Supervise prep cooks and ensure quality standards</li>
          <li>• Monitor prep quantities and notify management of shortages</li>
          <li>• Complete all prep tasks before service periods</li>
          <li>• Maintain cleanliness and organization in prep areas</li>
          <li>• Train new prep team members on procedures</li>
        </ul>
      </div>
    </div>
  );
}
