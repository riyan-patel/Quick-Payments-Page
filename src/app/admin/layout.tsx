import Link from "next/link";
import { logout } from "@/app/admin/logout-action";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-muted text-foreground">
      <header className="border-b bg-background shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <Link href="/admin" className="text-lg font-semibold tracking-tight">
            QPP Admin
          </Link>
          <nav aria-label="Admin" className="flex flex-wrap items-center gap-1 text-sm font-medium">
            <Link
              href="/admin/pages"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-foreground",
              )}
            >
              Payment pages
            </Link>
            <Link
              href="/admin/reports"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-foreground",
              )}
            >
              Reports
            </Link>
            <form action={logout} className="inline">
              <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
                Sign out
              </Button>
            </form>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
