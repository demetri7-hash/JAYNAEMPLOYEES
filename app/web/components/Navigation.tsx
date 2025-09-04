"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase-browser";
import Link from "next/link";

export default function Navigation() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        setUser(sessionData.session?.user || null);
      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <nav className="space-x-2 text-sm">
        <Link href="/">Home</Link>
        <Link href="/today">Today</Link>
        <span className="text-gray-400">Loading...</span>
      </nav>
    );
  }

  if (!user) {
    return (
      <nav className="space-x-2 text-sm">
        <Link href="/">Home</Link>
        <Link href="/auth">Sign in</Link>
      </nav>
    );
  }

  return (
    <div className="flex items-center space-x-2 text-sm">
      <Link href="/" className="hover:text-emerald-600">Home</Link>
      <Link href="/today" className="hover:text-emerald-600">Today</Link>
      
      {/* Manager Dashboard Links */}
      <Link href="/general_manager" className="hover:text-emerald-600">GM</Link>
      <Link href="/assistant_manager" className="hover:text-emerald-600">AM</Link>
      <Link href="/kitchen_manager" className="hover:text-emerald-600">KM</Link>
      <Link href="/ordering_manager" className="hover:text-emerald-600">OM</Link>
      
      <button 
        onClick={handleSignOut}
        className="text-red-600 hover:text-red-700"
      >
        Sign out
      </button>
    </div>
  );
}
