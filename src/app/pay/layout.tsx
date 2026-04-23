import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pay — Quick Payment Pages",
  description: "Secure payment page",
};

export default function PayLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900">
      <a
        href="#pay-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:shadow"
      >
        Skip to payment form
      </a>
      {children}
    </div>
  );
}
