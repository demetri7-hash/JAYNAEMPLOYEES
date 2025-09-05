import "../styles/globals.css";
import React from "react";
import Link from "next/link";
import Navigation from "../components/Navigation";

export const metadata = {
  title: "JAYNA Gyro Operations",
  description: "Modern restaurant management platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-gray-50 font-sans antialiased">
        {/* Modern Header with Glass Effect */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              {/* Logo */}
              <Link 
                href="/" 
                className="flex items-center space-x-3 text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white">
                  🥙
                </div>
                <span>JAYNA</span>
              </Link>
              
              {/* Navigation */}
              <Navigation />
            </div>
          </div>
        </header>

        {/* Main Content with Professional Layout */}
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <div className="animate-fade-in">
              {children}
            </div>
          </div>
        </main>

        {/* Modern Footer */}
        <footer className="border-t border-gray-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between text-sm text-gray-500">
              <div className="flex items-center space-x-4">
                <span>© 2025 JAYNA Gyro</span>
                <span>•</span>
                <span>Operations Platform</span>
              </div>
              <div className="mt-2 sm:mt-0">
                <span>Built with precision and care</span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
