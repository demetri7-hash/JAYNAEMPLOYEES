import "../styles/globals.css";
import React from "react";
import Link from "next/link";
import Navigation from "../components/Navigation";

export const metadata = {
  title: "JAYNA Gyro",
  description: "Operations app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="border-b bg-white">
          <div className="mx-auto max-w-4xl p-4 flex items-center justify-between">
            <Link href="/" className="font-semibold text-lg">🥙 JAYNA Gyro</Link>
            <Navigation />
          </div>
        </header>
        <main className="mx-auto max-w-4xl p-4">{children}</main>
      </body>
    </html>
  );
}
