import { payPageBackgroundStyle, payPageBackgroundStyleDark } from "@/lib/brand-gradient-theme";

type Props = { brandPrimary: string; brandSecondary: string };

/**
 * Full-bleed brand canvas — light mesh + orbs, or dark mesh + orbs (separate layers; `html.dark`).
 */
export function PayPageBrandBackdrop({ brandPrimary, brandSecondary }: Props) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-background" />
      <div
        className="absolute inset-0 dark:hidden"
        style={payPageBackgroundStyle(brandPrimary, brandSecondary)}
      />
      <div
        className="absolute inset-0 hidden dark:block"
        style={payPageBackgroundStyleDark(brandPrimary, brandSecondary)}
      />
      <div
        className="absolute -top-40 -left-32 h-[32rem] w-[32rem] rounded-full opacity-[0.5] blur-3xl dark:hidden"
        style={{ background: "var(--qpp-ambient-1)" }}
      />
      <div
        className="absolute top-1/4 -right-24 h-[26rem] w-[26rem] rounded-full opacity-45 blur-3xl dark:hidden"
        style={{ background: "var(--qpp-ambient-2)" }}
      />
      <div
        className="absolute -bottom-32 left-1/4 h-[22rem] w-[22rem] rounded-full opacity-40 blur-3xl dark:hidden"
        style={{ background: "var(--qpp-ambient-3)" }}
      />
      <div
        className="absolute -top-40 -left-32 hidden h-[32rem] w-[32rem] rounded-full opacity-[0.35] blur-3xl dark:block"
        style={{ background: "var(--qpp-ambient-1)" }}
      />
      <div
        className="absolute top-1/4 -right-24 hidden h-[26rem] w-[26rem] rounded-full opacity-30 blur-3xl dark:block"
        style={{ background: "var(--qpp-ambient-2)" }}
      />
      <div
        className="absolute -bottom-32 left-1/4 hidden h-[22rem] w-[22rem] rounded-full opacity-25 blur-3xl dark:block"
        style={{ background: "var(--qpp-ambient-3)" }}
      />
    </div>
  );
}
