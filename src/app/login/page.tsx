"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import clsx from "clsx";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    router.push(next);
    router.refresh();
  };

  return (
    <main className="mx-auto flex max-w-md flex-col px-4 py-16">
      <h1 className="text-2xl font-bold text-zinc-900">Sign in</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Access the provider admin portal.{" "}
        <Link href="/signup" className="font-medium text-teal-800 underline">
          Create an account
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
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          />
        </div>
        {err ? (
          <p role="alert" className="text-sm text-red-800">
            {err}
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
          {busy ? "Signing in…" : "Sign in"}
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

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-zinc-600">Loading…</p>}>
      <LoginForm />
    </Suspense>
  );
}
