import { CircleAlert, CircleCheck, CircleDashed, LoaderCircle } from "lucide-react";
import type { DocumentStatus } from "@/generated/prisma/enums";

const variants = {
  processing: {
    label: "Processing",
    icon: LoaderCircle,
    spin: true,
    className: "bg-surface-2 text-muted",
  },
  review: {
    label: "To review",
    icon: CircleDashed,
    spin: false,
    className: "bg-warning-soft text-warning",
  },
  reviewed: {
    label: "Reviewed",
    icon: CircleCheck,
    spin: false,
    className: "bg-accent-soft text-accent-soft-foreground",
  },
  failed: {
    label: "Failed",
    icon: CircleAlert,
    spin: false,
    className: "bg-danger-soft text-danger",
  },
} as const;

export function statusVariant(status: DocumentStatus, reviewed: boolean) {
  if (status === "PROCESSING") return "processing";
  if (status === "FAILED") return "failed";
  return reviewed ? "reviewed" : "review";
}

export function StatusBadge({ status, reviewed }: { status: DocumentStatus; reviewed: boolean }) {
  const v = variants[statusVariant(status, reviewed)];
  const Icon = v.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full py-0.5 pr-2 pl-1.5 text-xs font-medium whitespace-nowrap ${v.className}`}
    >
      <Icon className={`h-3.5 w-3.5 ${v.spin ? "animate-spin" : ""}`} aria-hidden />
      {v.label}
    </span>
  );
}
