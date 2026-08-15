import Link from "next/link";
import { requireUser } from "@/lib/session";

const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/proposals", label: "Proposals" },
  { href: "/clients", label: "Clients" },
  { href: "/blocks", label: "Content Blocks" },
  { href: "/price-book", label: "Price Book" },
  { href: "/templates", label: "Templates" },
] as const;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-base font-bold text-neutral-900">
              Redtree <span className="text-brand-green-dark">Proposals</span>
            </Link>
            <nav className="flex items-center gap-5 text-sm font-medium text-neutral-600">
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-neutral-900">
                  {link.label}
                </Link>
              ))}
              {user.role === "ADMIN" && (
                <Link href="/admin/settings" className="hover:text-neutral-900">
                  Admin
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm text-neutral-600">
            <span>
              {user.name} <span className="text-neutral-400">({user.role})</span>
            </span>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="font-medium text-neutral-600 hover:text-neutral-900">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
