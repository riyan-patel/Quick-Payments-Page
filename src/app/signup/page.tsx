"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import clsx from "clsx";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setBusy(true);
    const supabase = createClient();
    const origin = window.location.origin;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${origin}/auth/callback?next=/admin` },
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setMsg("Check your email to confirm your account, then sign in.");
  };

  return (
    <main className="mx-auto flex max-w-md flex-col px-4 py-16">
      <h1 className="text-2xl font-bold text-zinc-900">Create account</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-teal-800 underline">
          Sign in
        </Link>
      </p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium text-zinc-800">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium text-zinc-800">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          />
          <p className="text-xs text-zinc-500">At least 8 characters.</p>
        </div>
        {err ? (
          <p role="alert" className="text-sm text-red-800">
            {err}
          </p>
        ) : null}
        {msg ? (
          <p role="status" className="text-sm text-emerald-800">
            {msg}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className={clsx(
            "w-full rounded-lg bg-teal-700 py-2.5 text-sm font-semibold text-white",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-900",
            "disabled:opacity-60",
          )}
        >
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="mt-8 text-center text-sm text-zinc-500">
        <Link href="/" className="underline">
          Home
        </Link>
      </p>
    </main>
  );
}
