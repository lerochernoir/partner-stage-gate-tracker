import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/actions/auth";
import { hasAnyRole, type AppUser } from "@/lib/auth/session";
import { ROLE_CODES } from "@/lib/auth/roles";

const baseNav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/partners", label: "Partners" },
  { href: "/packages", label: "Packages" },
  { href: "/approvals/my", label: "My Approvals" },
  { href: "/decisions", label: "Decision Logs" },
  { href: "/admin/users", label: "Users", roles: [ROLE_CODES.systemAdmin] },
];

export function AppShell({
  user,
  children,
}: {
  user: AppUser;
  children: React.ReactNode;
}) {
  const visibleNav = baseNav.filter(
    (item) => !item.roles || hasAnyRole(user, item.roles),
  );

  return (
    <div className="grid min-h-screen bg-muted/30 lg:grid-cols-[280px_1fr]">
      <aside className="border-r bg-slate-950 p-6 text-white">
        <div>
  <Image
    src="/images/castlegate-logo.png"
    alt="CastleGate"
    width={210}
    height={95}
    priority
    className="h-auto w-full max-w-[210px] object-contain"
  />
  <p className="mt-2 text-sm text-slate-300">
    Partner Governance Platform
  </p>
</div>
        <nav className="mt-8 grid gap-1" aria-label="Primary navigation">
          {visibleNav.map((item) => (
            <Link
              key={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-100 hover:bg-white/10"
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-6 py-4 backdrop-blur">
          <div>
            <strong className="text-sm">{user.name}</strong>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <form action={logoutAction}>
            <Button type="submit" variant="outline">
              Log out
            </Button>
          </form>
        </header>
        <main className="p-6">{children}</main>
        <footer className="border-t px-6 py-4 text-xs text-muted-foreground">
          CastleGate · Partner Governance Platform
        </footer>
      </div>
    </div>
  );
}
