"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase-browser";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const pathname = usePathname();

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
    setShowMobileMenu(false);
  };

  const isActive = (path: string) => pathname === path;

  if (loading) {
    return (
      <div className="flex items-center space-x-4">
        <div className="animate-pulse">
          <div className="h-4 w-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <nav className="flex items-center space-x-1">
        <Link 
          href="/" 
          className={`nav-link ${isActive('/') ? 'nav-link-active' : ''}`}
        >
          Home
        </Link>
        <Link 
          href="/auth" 
          className="btn btn-primary btn-sm"
        >
          Sign in
        </Link>
      </nav>
    );
  }

  const navItems = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/today', label: 'Tasks', icon: '✅' },
  ];

  return (
    <nav className="flex items-center space-x-1">
      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center space-x-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link flex items-center space-x-2 ${
              isActive(item.href) ? 'nav-link-active' : ''
            }`}
          >
            <span className="text-sm">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
        
        {/* User Menu */}
        <div className="relative ml-4 flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-medium text-xs">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <span className="hidden lg:block font-medium">
              {user.email?.split('@')[0]}
            </span>
          </div>
          
          <button
            onClick={handleSignOut}
            className="btn btn-ghost btn-sm text-gray-600 hover:text-red-600"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Mobile Menu Button */}
      <div className="md:hidden">
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="btn btn-ghost btn-sm"
        >
          {showMobileMenu ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="modal-overlay" onClick={() => setShowMobileMenu(false)}>
            <div className="absolute top-16 right-4 w-64">
              <div className="bg-white rounded-xl shadow-xl border border-gray-200 py-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMobileMenu(false)}
                    className={`flex items-center space-x-3 px-4 py-3 text-sm hover:bg-gray-50 ${
                      isActive(item.href) ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
                
                <div className="border-t border-gray-200 mt-2 pt-2">
                  <div className="px-4 py-2 text-sm text-gray-500 flex items-center space-x-2">
                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-medium text-xs">
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                    <span>{user.email?.split('@')[0]}</span>
                  </div>
                  
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
