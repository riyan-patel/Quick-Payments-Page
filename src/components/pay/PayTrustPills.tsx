import { CreditCard, Lock, Shield } from "lucide-react";

const items = [
  { icon: Lock, label: "Encrypted" },
  { icon: Shield, label: "PCI-aware" },
  { icon: CreditCard, label: "Stripe" },
] as const;

export function PayTrustPills() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
      {items.map(({ icon: Icon, label }) => (
        <div
          key={label}
          className="inline-flex items-center gap-1.5 rounded-full border border-foreground/8 bg-foreground/[0.04] px-3 py-1.5 text-[0.7rem] font-medium tracking-wide text-muted-foreground shadow-[0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-sm dark:border-foreground/12 dark:bg-foreground/[0.07] dark:shadow-[0_1px_0_rgba(255,255,255,0.06)]"
        >
          <Icon
            className="size-3.5"
            style={{ color: "var(--qpp-pri, var(--primary))" }}
            strokeWidth={1.75}
            aria-hidden
          />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
