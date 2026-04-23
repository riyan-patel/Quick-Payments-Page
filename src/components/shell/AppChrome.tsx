/** Shared warm canvas for admin + auth (matches marketing look). */
export function AppChrome() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(168deg, oklch(0.99 0.03 95) 0%, oklch(0.97 0.025 85) 45%, oklch(0.96 0.02 100) 100%)`,
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage: `linear-gradient(oklch(0 0 0 / 0.03) 1px, transparent 1px),
            linear-gradient(90deg, oklch(0 0 0 / 0.03) 1px, transparent 1px)`,
          backgroundSize: "52px 52px",
          maskImage: "radial-gradient(ellipse 100% 80% at 50% -20%, black, transparent 65%)",
        }}
      />
      <div className="absolute -right-24 top-0 h-72 w-72 rounded-full bg-orange-200/25 blur-3xl" />
      <div className="absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-teal-200/20 blur-3xl" />
    </div>
  );
}
