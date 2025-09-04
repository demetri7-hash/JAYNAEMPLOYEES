"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabase-browser";

type Task = {
  id: string | number;
  title?: string | null;
  description?: string | null;
  notes?: string | null;
  status?: string | null;
  completed_at?: string | null;
  completion_percent?: number | null;
  photo_required?: boolean | null;
  photo_url?: string | null;
  assignee_user_id?: string | null;
  assignee_role_id?: string | null;
  transferable?: boolean | null;
  due_at?: string | null;
  for_date?: string | null;
};

export default function TodayPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    const loadTasks = async () => {
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

        // Load tasks assigned directly to user
        const { data: userTasks, error: userTasksErr } = await supabase
          .from("task_instances")
          .select("*")
          .eq("for_date", today)
          .eq("assignee_user_id", _uid)
          .order("due_at", { ascending: true, nullsFirst: true });
        
        if (userTasksErr) throw userTasksErr;
        setTasks(userTasks || []);

      } catch (e: any) {
        setError(e?.message || "Failed to load tasks");
        console.error("Task loading error:", e);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [today]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-2xl mb-2">⏳</div>
          <p className="text-gray-600">Loading your tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">📋 Today's Tasks</h1>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'short', 
            day: 'numeric' 
          })}
        </div>
      </div>
      
      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="text-red-400 text-lg mr-3">⚠️</div>
            <div>
              <h3 className="text-red-800 font-medium">Error</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && tasks.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
          <p className="text-gray-600">No tasks assigned for today.</p>
        </div>
      )}

      {/* Basic tasks list */}
      <div className="space-y-3">
        {tasks.map((task) => {
          const title = task.title || `Task ${task.id}`;
          const isDone = !!(task.completed_at || task.status === "completed");
          const completion = task.completion_percent || 0;
          
          return (
            <div 
              key={task.id} 
              className={`bg-white rounded-lg border shadow-sm p-4 transition-all ${
                isDone ? 'opacity-75 border-emerald-200' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className={`font-medium ${isDone ? 'text-gray-600 line-through' : 'text-gray-900'}`}>
                    {title}
                  </h3>
                  {task.description && (
                    <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                  )}
                </div>
                
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  isDone 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : completion > 0 
                      ? 'bg-amber-100 text-amber-800' 
                      : 'bg-gray-100 text-gray-800'
                }`}>
                  {isDone ? '✅ Complete' : completion > 0 ? '🔄 In Progress' : '⭕ Pending'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
