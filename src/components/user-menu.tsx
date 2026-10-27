"use client";

import { Download, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/(auth)/actions";

export function UserMenu({ name, email }: { name: string; email: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initial = (name || email).trim().charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account"
        className="grid h-8 w-8 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent-soft-foreground ring-offset-2 ring-offset-background transition hover:ring-2 hover:ring-line-strong"
      >
        {initial}
      </button>
      {open && (
        <div
          role="menu"
          className="animate-rise absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-lg"
        >
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="truncate text-xs text-muted">{email}</p>
          </div>
          <div className="my-1 h-px bg-line" />
          <a
            role="menuitem"
            href="/api/export"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-surface-2"
          >
            <Download className="h-4 w-4 text-muted" aria-hidden />
            Export CSV
          </a>
          <form action={signOut}>
            <button
              role="menuitem"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-surface-2"
            >
              <LogOut className="h-4 w-4 text-muted" aria-hidden />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
