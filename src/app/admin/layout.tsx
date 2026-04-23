import Link from "next/link";
import { logout } from "@/app/admin/logout-action";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-zinc-100 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <Link href="/admin" className="text-lg font-semibold text-zinc-900">
            QPP Admin
          </Link>
          <nav aria-label="Admin" className="flex flex-wrap gap-4 text-sm font-medium">
            <Link href="/admin/pages" className="text-teal-800 underline-offset-4 hover:underline">
              Payment pages
            </Link>
            <Link href="/admin/reports" className="text-teal-800 underline-offset-4 hover:underline">
              Reports
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline"
              >
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
