"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase-browser";
import Link from "next/link";
import RoleButtons from "../components/RoleButtons";

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (loading) return <div>Loading…</div>;

  if (!session) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Welcome</h1>
        <p className="text-sm text-gray-600">Sign in to see your tasks.</p>
        <Link href="/auth" className="inline-block rounded bg-black px-4 py-2 text-white">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/today" className="block rounded-lg bg-emerald-600 px-4 py-3 text-white text-center text-lg font-semibold">Today’s Tasks</Link>
      <RoleButtons />
      <button
        onClick={async () => { await supabase.auth.signOut(); }}
        className="text-sm text-gray-600 underline"
      >Sign out</button>
    </div>
  );
}
