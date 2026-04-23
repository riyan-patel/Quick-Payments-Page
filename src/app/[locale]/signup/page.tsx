"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { withLocalePath } from "@/lib/locale-path";
import { AppChrome } from "@/components/shell/AppChrome";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { ThemeModeToggle } from "@/components/theme/ThemeModeToggle";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const t = useTranslations("auth");
  const s = useTranslations("authSignup");
  const locale = useLocale() as Locale;
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
    const nextAfterAuth = withLocalePath(locale, "/admin");
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextAfterAuth)}` },
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setMsg(s("confirmMessage"));
  };

  return (
    <div data-app="auth" className="relative flex min-h-full flex-col">
      <AppChrome />
      <div className="absolute end-4 top-4 z-10 flex items-center gap-2">
        <ThemeModeToggle />
        <LocaleSwitcher />
      </div>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl sm:text-3xl">{s("title")}</CardTitle>
            <CardDescription>
              {s("description")}{" "}
              <Link href="/login" className="font-medium text-primary underline underline-offset-4">
                {s("signIn")}
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("email")}</Label>
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
                <Label htmlFor="password">{t("password")}</Label>
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
                <p className="text-xs text-muted-foreground">{s("atLeast8")}</p>
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
                {busy ? s("creating") : s("title")}
              </Button>
            </form>
            <p className="mt-8 text-center text-sm text-muted-foreground">
              <Link href="/" className="underline underline-offset-4">
                {t("home")}
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
