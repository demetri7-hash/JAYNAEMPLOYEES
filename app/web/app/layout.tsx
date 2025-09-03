import "../styles/globals.css";
import React from "react";
import Link from "next/link";

export const metadata = {
  title: "JAYNA Gyro",
  description: "Operations app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="border-b bg-white">
          <div className="mx-auto max-w-md p-4 flex items-center justify-between">
            <Link href="/" className="font-semibold">JAYNA Gyro</Link>
            <nav className="space-x-4 text-sm">
              <Link href="/">Home</Link>
              <Link href="/today">Today</Link>
              <Link href="/auth">Sign in</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-md p-4">{children}</main>
      </body>
    </html>
  );
}
