import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pay — Quick Payment Pages",
  description: "Secure payment page",
};

export default function PayLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-qpp="pay"
      className="relative min-h-full overflow-x-hidden text-foreground"
    >
      {/* Layered background: warm gradient, mesh, soft orbs, grain */}
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(168deg, oklch(0.97 0.04 95) 0%, oklch(0.94 0.03 85) 40%, oklch(0.95 0.02 200) 100%)
            `,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.45]"
          style={{
            backgroundImage: `
              linear-gradient(oklch(0 0 0 / 0.04) 1px, transparent 1px),
              linear-gradient(90deg, oklch(0 0 0 / 0.04) 1px, transparent 1px)
            `,
            backgroundSize: "48px 48px",
            maskImage:
              "radial-gradient(ellipse 90% 70% at 50% 0%, black 20%, transparent 70%)",
          }}
        />
        <div
          className="absolute -top-40 -left-32 h-[32rem] w-[32rem] rounded-full opacity-[0.55] blur-3xl"
          style={{ background: "var(--qpp-ambient-1)" }}
        />
        <div
          className="absolute top-1/4 -right-24 h-[26rem] w-[26rem] rounded-full opacity-45 blur-3xl"
          style={{ background: "var(--qpp-ambient-2)" }}
        />
        <div
          className="absolute -bottom-32 left-1/4 h-[22rem] w-[22rem] rounded-full opacity-40 blur-3xl"
          style={{ background: "var(--qpp-ambient-3)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.35] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: "128px 128px",
          }}
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-oklch(0.96 0.02 85 / 0.5)"
          aria-hidden
        />
      </div>
      <a
        href="#pay-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:border focus:border-foreground/10 focus:bg-card focus:px-3 focus:py-2 focus:shadow-lg"
      >
        Skip to payment form
      </a>
      {children}
    </div>
  );
}
