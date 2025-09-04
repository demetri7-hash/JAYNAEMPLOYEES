"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase-browser";

export default function TodayPage() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const uid = sessionData.session?.user?.id;
        
        if (uid) {
          const today = new Date().toISOString().slice(0, 10);
          const { data } = await supabase
            .from("task_instances")
            .select("*")
            .eq("for_date", today)
            .eq("assignee_user_id", uid);
          setTasks(data || []);
        }
      } catch (e) {
        console.error("Failed to load tasks:", e);
      } finally {
        setLoading(false);
      }
    };
    loadTasks();
  }, []);

  if (loading) return <div>Loading tasks...</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">📋 Today's Tasks</h1>
      {tasks.length === 0 ? (
        <p className="text-gray-600">No tasks for today!</p>
      ) : (
        <ul className="space-y-3">
          {tasks.map((task) => (
            <li key={task.id} className="bg-white p-4 border rounded-lg">
              <div className="font-medium">{task.title || `Task ${task.id}`}</div>
              <div className="text-sm text-gray-600 mt-1">
                Status: {task.status || "pending"}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
