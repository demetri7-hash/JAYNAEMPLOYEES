"use client";
import { useState } from "react";
import { supabase } from "../lib/supabase-browser";
import { useRouter } from "next/navigation";

export default function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Auth error");
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{mode === "signin" ? "Sign in" : "Sign up"}</h1>
      <form onSubmit={submit} className="space-y-3">
        <input
          className="w-full rounded border px-3 py-2"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full rounded border px-3 py-2"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full rounded bg-black px-4 py-2 text-white" type="submit">
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
      <button
        className="text-sm text-gray-600 underline"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
      >
        {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
      </button>
    </div>
  );
}
