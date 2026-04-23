"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AppChrome } from "@/components/shell/AppChrome";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <div data-app="auth" className="relative flex min-h-full flex-col">
      <AppChrome />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl sm:text-3xl">Create account</CardTitle>
            <CardDescription>
              Already registered?{" "}
              <Link href="/login" className="font-medium text-primary underline underline-offset-4">
                Sign in
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-xl"
                />
                <p className="text-xs text-muted-foreground">At least 8 characters.</p>
              </div>
              {err ? (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertDescription>{err}</AlertDescription>
                </Alert>
              ) : null}
              {msg ? (
                <div
                  role="status"
                  className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground"
                >
                  {msg}
                </div>
              ) : null}
              <Button
                type="submit"
                className="h-11 w-full rounded-full text-base font-semibold shadow-sm"
                disabled={busy}
              >
                {busy ? "Creating…" : "Create account"}
              </Button>
            </form>
            <p className="mt-8 text-center text-sm text-muted-foreground">
              <Link href="/" className="underline underline-offset-4">
                Home
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
