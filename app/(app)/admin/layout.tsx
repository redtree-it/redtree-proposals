import Link from "next/link";
import { requireAdmin } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div>
      <div className="mb-6 flex gap-4 border-b border-neutral-200 text-sm font-medium text-neutral-600">
        <Link href="/admin/settings" className="border-b-2 border-transparent px-1 pb-3 hover:border-brand-green hover:text-neutral-900">
          Settings
        </Link>
        <Link href="/admin/users" className="border-b-2 border-transparent px-1 pb-3 hover:border-brand-green hover:text-neutral-900">
          Users
        </Link>
      </div>
      {children}
    </div>
  );
}
