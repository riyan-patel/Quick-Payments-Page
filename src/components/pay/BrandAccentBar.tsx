import { cn } from "@/lib/utils";

/** Two brand colors as a **flat** split line (no CSS gradients). */
export function BrandAccentBar({
  primary,
  secondary,
  className,
}: {
  primary: string;
  secondary: string;
  className?: string;
}) {
  return (
    <div className={cn("flex h-1 w-full shrink-0", className)} aria-hidden>
      <div className="h-full min-w-0 flex-1" style={{ backgroundColor: primary }} />
      <div className="h-full min-w-0 flex-1" style={{ backgroundColor: secondary }} />
    </div>
  );
}
