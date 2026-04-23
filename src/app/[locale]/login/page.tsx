"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Link, useRouter } from "@/i18n/navigation";
import { AppChrome } from "@/components/shell/AppChrome";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { ThemeModeToggle } from "@/components/theme/ThemeModeToggle";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginForm() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
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
    <div data-app="auth" className="relative flex min-h-full flex-col">
      <AppChrome />
      <div className="absolute end-4 top-4 z-10 flex items-center gap-2">
        <ThemeModeToggle />
        <LocaleSwitcher />
      </div>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl sm:text-3xl">{t("signIn")}</CardTitle>
            <CardDescription>
              {t("signInDescription")}{" "}
              <Link href="/signup" className="font-medium text-primary underline underline-offset-4">
                {t("createAccount")}
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
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
              {err ? (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertDescription>{err}</AlertDescription>
                </Alert>
              ) : null}
              <Button
                type="submit"
                className="h-11 w-full rounded-full text-base font-semibold shadow-sm"
                disabled={busy}
              >
                {busy ? t("signingIn") : t("signIn")}
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

export default function LoginPage() {
  const t = useTranslations("common");
  return (
    <Suspense fallback={<p className="p-8 text-center text-muted-foreground">{t("loading")}</p>}>
      <LoginForm />
    </Suspense>
  );
}
