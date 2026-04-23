import Link from "next/link";
import { ArrowRight, QrCode, Shield, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <main className="relative min-h-full overflow-hidden">
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: `
            linear-gradient(165deg, oklch(0.98 0.04 95) 0%, oklch(0.96 0.03 85) 45%, oklch(0.95 0.02 200) 100%)
          `,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-40"
        style={{
          backgroundImage: `
            linear-gradient(oklch(0 0 0 / 0.035) 1px, transparent 1px),
            linear-gradient(90deg, oklch(0 0 0 / 0.035) 1px, transparent 1px)
          `,
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent 75%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed -right-20 top-0 -z-10 h-80 w-80 rounded-full bg-amber-300/30 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed -left-20 bottom-0 -z-10 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl"
        aria-hidden
      />

      <div className="mx-auto flex max-w-3xl flex-col justify-center px-4 py-16 sm:px-6 sm:py-24">
        <p className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-foreground/10 bg-card/60 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground shadow-sm backdrop-blur-sm">
          <Sparkles className="size-3.5 text-amber-500" strokeWidth={1.5} />
          Quick Payment Pages
        </p>
        <h1 className="font-[family-name:var(--font-outfit)] text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl md:text-6xl">
          Branded pay links,
          <span className="mt-1 block bg-gradient-to-r from-amber-600 via-orange-500 to-rose-500 bg-clip-text text-transparent">
            zero friction
          </span>
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
          Configure amounts, custom fields, and receipts—then share a public link, embed a clean
          checkout, or drop a QR code anywhere.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/login"
              className={cn(
                buttonVariants({ size: "lg" }),
                "group h-12 rounded-full px-8 text-base no-underline shadow-md",
              )}
            >
              Admin sign in
              <ArrowRight className="ms-0.5 size-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/signup"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-12 rounded-full border-foreground/12 bg-card/80 px-8 text-base no-underline shadow-sm backdrop-blur-sm",
              )}
            >
              Create account
            </Link>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Shield,
              t: "Secure by default",
              d: "Stripe handles cards; we never store PAN data.",
            },
            { icon: QrCode, t: "Link or embed", d: "Hosted pages, iframe, and QR in one product." },
            {
              icon: Sparkles,
              t: "Your brand",
              d: "Logos, colors, and copy that match your org.",
            },
          ].map(({ icon: Icon, t, d }) => (
            <div
              key={t}
              className="rounded-2xl border border-foreground/6 bg-card/70 p-5 shadow-sm backdrop-blur-sm"
            >
              <div className="mb-2 flex size-9 items-center justify-center rounded-xl bg-foreground/5 text-foreground">
                <Icon className="size-4" strokeWidth={1.5} />
              </div>
              <p className="font-[family-name:var(--font-outfit)] text-sm font-semibold text-foreground">
                {t}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>

        <p className="mt-12 text-center text-xs text-muted-foreground sm:text-left">
          Next.js, Supabase, Stripe (test mode), and Resend.
        </p>
      </div>
    </main>
  );
}
