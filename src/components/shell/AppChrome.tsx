/** Shared canvas for admin + auth: warm cream (light) / deep neutral (dark). */
export function AppChrome() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
      {/* Base always follows theme tokens */}
      <div className="absolute inset-0 bg-background" />
      {/* Light: warm mesh + orbs */}
      <div
        className="absolute inset-0 dark:hidden"
        style={{
          background: `linear-gradient(168deg, oklch(0.99 0.03 95) 0%, oklch(0.97 0.025 85) 45%, oklch(0.96 0.02 100) 100%)`,
        }}
      />
      <div
        className="absolute inset-0 opacity-40 dark:hidden"
        style={{
          backgroundImage: `linear-gradient(oklch(0 0 0 / 0.03) 1px, transparent 1px),
            linear-gradient(90deg, oklch(0 0 0 / 0.03) 1px, transparent 1px)`,
          backgroundSize: "52px 52px",
          maskImage: "radial-gradient(ellipse 100% 80% at 50% -20%, black, transparent 65%)",
        }}
      />
      <div className="absolute -right-24 top-0 h-72 w-72 rounded-full bg-orange-200/25 blur-3xl dark:hidden" />
      <div className="absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-teal-200/20 blur-3xl dark:hidden" />
      {/* Dark: cool deep gradient + subtle grid + orbs */}
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          background: `linear-gradient(168deg, oklch(0.16 0.02 260) 0%, oklch(0.14 0.015 255) 45%, oklch(0.12 0.02 270) 100%)`,
        }}
      />
      <div
        className="absolute inset-0 hidden opacity-25 dark:block"
        style={{
          backgroundImage: `linear-gradient(oklch(1 0 0 / 0.04) 1px, transparent 1px),
            linear-gradient(90deg, oklch(1 0 0 / 0.04) 1px, transparent 1px)`,
          backgroundSize: "52px 52px",
          maskImage: "radial-gradient(ellipse 100% 80% at 50% -20%, white, transparent 65%)",
        }}
      />
      <div className="absolute -right-24 top-0 hidden h-72 w-72 rounded-full bg-teal-500/20 blur-3xl dark:block" />
      <div className="absolute -left-20 bottom-0 hidden h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl dark:block" />
    </div>
  );
}
