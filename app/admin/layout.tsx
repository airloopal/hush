import { requireStaff } from "@/lib/admin/require-staff";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald text-emerald-foreground text-sm font-semibold">
              H
            </span>
            <span className="font-semibold tracking-tight">Hush Ops</span>
          </div>
          <span className="text-xs text-text-muted">
            Signed in as {staff.username ? `@${staff.username}` : staff.id} · {staff.role}
          </span>
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
}
