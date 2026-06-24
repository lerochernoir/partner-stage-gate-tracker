import Link from "next/link";
import { logoutAction } from "@/lib/actions/auth";
import { hasAnyRole, type AppUser } from "@/lib/auth/session";
import { ROLE_CODES } from "@/lib/auth/roles";

const baseNav = [
  { href: "/partners", label: "Partners" },
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
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand">Blue Yonder</div>
          <p className="brand-subtitle">Alliance Stage Gate Tracker</p>
        </div>
        <nav className="nav-list" aria-label="Primary navigation">
          {visibleNav.map((item) => (
            <Link key={item.href} className="nav-link" href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="content-shell">
        <header className="topbar">
          <div>
            <strong>{user.name}</strong>
            <p>{user.email}</p>
          </div>
          <form action={logoutAction}>
            <button className="button secondary" type="submit">
              Log out
            </button>
          </form>
        </header>
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
