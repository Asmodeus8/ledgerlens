import Link from "next/link";
import { Plus } from "lucide-react";
import { getSession } from "@/lib/session";
import { NavLinks } from "@/components/nav-links";
import { UserMenu } from "@/components/user-menu";

export async function SiteHeaderContent() {
  const session = await getSession();
  if (!session) return null;

  return (
    <>
      <NavLinks />
      <div className="ml-auto flex items-center gap-3">
        <Link href="/upload" className="btn-primary h-8 px-3">
          <Plus className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Upload</span>
        </Link>
        <UserMenu name={session.user.name} email={session.user.email} />
      </div>
    </>
  );
}
