import Link from "next/link";
import { getSession } from "@/lib/session";
import { signOut } from "@/app/(auth)/actions";

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/documents", label: "Documents" },
];

export async function SiteHeaderContent() {
  const session = await getSession();
  if (!session) return null;

  return (
    <>
      <nav className="flex gap-4 text-sm text-muted">
        {nav.map((item) => (
          <Link key={item.href} href={item.href} className="hover:text-foreground">
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-3 text-sm">
        <a href="/api/export" className="hidden text-muted hover:text-foreground sm:inline">
          Export CSV
        </a>
        <Link href="/upload" className="btn-primary">
          Upload
        </Link>
        <span className="hidden max-w-40 truncate text-muted md:inline" title={session.user.email}>
          {session.user.email}
        </span>
        <form action={signOut}>
          <button className="text-muted hover:text-foreground">Sign out</button>
        </form>
      </div>
    </>
  );
}
