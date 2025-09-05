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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="spinner h-12 w-12 mx-auto"></div>
          <p className="text-gray-600 animate-pulse">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full">
          {/* Welcome Card */}
          <div className="card-elevated p-8 text-center animate-slide-up">
            <div className="mb-6">
              <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
                <span className="text-2xl">🥙</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to JAYNA</h1>
              <p className="text-gray-600">
                Your modern restaurant operations platform
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Sign in to access your tasks, manage operations, and stay connected with your team.
              </p>
              
              <Link 
                href="/auth" 
                className="btn btn-primary btn-lg w-full"
              >
                <span>Sign in to continue</span>
                <span className="ml-2">→</span>
              </Link>
            </div>

            {/* Feature Preview */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-4">What you'll get access to:</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2 text-gray-600">
                  <span>✅</span>
                  <span>Daily Tasks</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <span>📊</span>
                  <span>Management Tools</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <span>📦</span>
                  <span>Inventory System</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <span>👥</span>
                  <span>Team Coordination</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back!
        </h1>
        <p className="text-gray-600">
          Ready to tackle today's operations? Let's get started.
        </p>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Today's Tasks - Primary Action */}
        <Link 
          href="/today" 
          className="group card-elevated p-6 hover:scale-[1.02] transition-all duration-200 border-l-4 border-l-emerald-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">
                Today's Tasks
              </h2>
              <p className="text-gray-600 mb-4">
                View and manage your daily assignments
              </p>
              <div className="badge badge-success">
                Priority Access
              </div>
            </div>
            <div className="text-3xl group-hover:scale-110 transition-transform duration-200">
              ✅
            </div>
          </div>
        </Link>

        {/* Quick Stats Card */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Overview
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Active Operations</span>
              <span className="badge badge-info">Live</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">System Status</span>
              <span className="badge badge-success">Online</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Your Access Level</span>
              <span className="badge badge-neutral">Authenticated</span>
            </div>
          </div>
        </div>
      </div>

      {/* Role-Based Navigation */}
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Role-Based Access
          </h2>
          <p className="text-gray-600">
            Select your role to access specialized tools and features
          </p>
        </div>
        <RoleButtons />
      </div>

      {/* User Actions */}
      <div className="flex justify-center pt-8 border-t border-gray-200">
        <button
          onClick={async () => { await supabase.auth.signOut(); }}
          className="btn btn-ghost text-gray-600 hover:text-red-600"
        >
          <span>Sign out</span>
          <span className="ml-2">👋</span>
        </button>
      </div>
    </div>
  );
}
