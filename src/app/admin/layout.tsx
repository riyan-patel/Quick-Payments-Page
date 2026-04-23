import { AdminHeader } from "@/components/admin/AdminHeader";
import { AppChrome } from "@/components/shell/AppChrome";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-app="admin" className="relative min-h-full text-foreground">
      <AppChrome />
      <AdminHeader />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</div>
    </div>
  );
}
