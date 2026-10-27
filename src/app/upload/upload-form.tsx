"use client";

import { CircleAlert, FileText, LoaderCircle, UploadCloud, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { uploadDocuments, type UploadState } from "@/app/actions";
import { formatFileSize } from "@/lib/format";

const ACCEPTED = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILES = 5;
const MAX_BYTES = 10 * 1024 * 1024;

type Picked = { file: File; preview: string | null; error: string | null };

function check(file: File): string | null {
  if (!ACCEPTED.includes(file.type)) return "Unsupported type";
  if (file.size > MAX_BYTES) return "Over 10 MB";
  return null;
}

export function UploadForm() {
  const [state, formAction, pending] = useActionState<UploadState, FormData>(uploadDocuments, {});
  const inputRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [dragging, setDragging] = useState(false);

  // Keep the real <input> in sync so the form posts exactly what's listed.
  useEffect(() => {
    if (!inputRef.current) return;
    const dt = new DataTransfer();
    picked.forEach((p) => dt.items.add(p.file));
    inputRef.current.files = dt.files;
  }, [picked]);

  useEffect(() => () => picked.forEach((p) => p.preview && URL.revokeObjectURL(p.preview)), [picked]);

  function add(files: FileList | null) {
    if (!files?.length) return;
    setPicked((current) => {
      const seen = new Set(current.map((p) => `${p.file.name}:${p.file.size}`));
      const next = [...current];
      for (const file of files) {
        const id = `${file.name}:${file.size}`;
        if (seen.has(id)) continue;
        seen.add(id);
        next.push({
          file,
          preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
          error: check(file),
        });
      }
      return next;
    });
  }

  function remove(index: number) {
    setPicked((current) => current.filter((_, i) => i !== index));
  }

  const tooMany = picked.length > MAX_FILES;
  const invalid = picked.some((p) => p.error) || tooMany;
  const count = picked.length;

  return (
    <form action={formAction} className="space-y-5">
      <label
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          add(e.dataTransfer.files);
        }}
        className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
          dragging
            ? "border-accent bg-accent-soft/60"
            : "border-line-strong bg-surface hover:border-subtle hover:bg-surface-2/40"
        } has-[:focus-visible]:border-accent`}
      >
        <span
          className={`mb-4 grid h-12 w-12 place-items-center rounded-full transition-colors ${
            dragging ? "bg-accent text-accent-foreground" : "bg-accent-soft text-accent-soft-foreground"
          }`}
        >
          <UploadCloud className="h-5 w-5" aria-hidden />
        </span>
        <span className="font-medium">
          {dragging ? "Drop to add" : (
            <>
              Drag files here or <span className="text-accent underline-offset-4 group-hover:underline">browse</span>
            </>
          )}
        </span>
        <span className="mt-1.5 text-xs text-muted">PDF, JPG, PNG, WebP · up to 5 files · 10 MB each</span>
        <input
          ref={inputRef}
          type="file"
          name="files"
          accept={ACCEPTED.join(",")}
          multiple
          className="sr-only"
          onChange={(e) => {
            add(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {count > 0 && (
        <ul className="card divide-y divide-line">
          {picked.map((p, i) => (
            <li key={`${p.file.name}:${p.file.size}`} className="animate-rise flex items-center gap-3 px-4 py-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-surface-2 text-muted">
                {p.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                  <img src={p.preview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <FileText className="h-5 w-5" aria-hidden />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{p.file.name}</span>
                <span className={`flex items-center gap-1 text-xs ${p.error ? "text-danger" : "text-muted"}`}>
                  {p.error && <CircleAlert className="h-3.5 w-3.5" aria-hidden />}
                  {p.error ?? formatFileSize(p.file.size)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                disabled={pending}
                aria-label={`Remove ${p.file.name}`}
                className="btn-icon"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {(state.error || tooMany) && (
        <p role="alert" className="flex items-center gap-2 rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger">
          <CircleAlert className="h-4 w-4 shrink-0" aria-hidden />
          {tooMany ? `Remove ${count - MAX_FILES} — up to ${MAX_FILES} files at a time` : state.error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        {count > 0 && !pending && (
          <button type="button" className="btn-ghost" onClick={() => setPicked([])}>
            Clear
          </button>
        )}
        <button type="submit" className="btn-primary min-w-36" disabled={pending || count === 0 || invalid}>
          {pending ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
              Uploading…
            </>
          ) : count > 1 ? (
            `Extract ${count} files`
          ) : (
            "Extract"
          )}
        </button>
      </div>
    </form>
  );
}
