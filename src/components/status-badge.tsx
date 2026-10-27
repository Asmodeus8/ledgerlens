import type { DocumentStatus } from "@/generated/prisma/enums";

const styles: Record<DocumentStatus, string> = {
  PROCESSING: "text-muted border-line animate-pulse",
  READY: "text-accent border-accent/40",
  FAILED: "text-danger border-danger/40",
};

const labels: Record<DocumentStatus, string> = {
  PROCESSING: "Processing",
  READY: "Ready",
  FAILED: "Failed",
};

export function StatusBadge({ status, reviewed }: { status: DocumentStatus; reviewed?: boolean }) {
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {status === "READY" && reviewed ? "Reviewed" : labels[status]}
    </span>
  );
}
