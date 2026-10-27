import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { UploadForm } from "./upload-form";

export const metadata: Metadata = { title: "Upload" };

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Upload" description="Receipts, invoices and bills" />
      <UploadForm />
    </div>
  );
}
