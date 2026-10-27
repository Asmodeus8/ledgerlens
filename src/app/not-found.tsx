import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <div className="mb-5 grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-muted">
        <FileQuestion className="h-5 w-5" aria-hidden />
      </div>
      <h1 className="text-xl font-semibold tracking-tight">Not found</h1>
      <p className="mt-1 text-sm text-muted">This page doesn&apos;t exist or isn&apos;t yours.</p>
      <Link href="/" className="btn-secondary mt-6">
        Back to overview
      </Link>
    </div>
  );
}
