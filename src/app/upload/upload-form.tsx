"use client";

import { useActionState, useRef, useState } from "react";
import { uploadDocuments, type UploadState } from "@/app/actions";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp,image/gif";

export function UploadForm() {
  const [state, formAction, pending] = useActionState<UploadState, FormData>(
    uploadDocuments,
    {},
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);

  function syncNames() {
    setFileNames([...(inputRef.current?.files ?? [])].map((f) => f.name));
  }

  return (
    <form action={formAction} className="space-y-4">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (inputRef.current && e.dataTransfer.files.length > 0) {
            inputRef.current.files = e.dataTransfer.files;
            syncNames();
          }
        }}
        className={`card flex cursor-pointer flex-col items-center justify-center gap-2 border-dashed px-6 py-14 text-center ${
          dragging ? "border-accent" : ""
        }`}
      >
        <span className="font-medium">Drop files or click to choose</span>
        <span className="text-xs text-muted">PDF, JPEG, PNG, WebP · up to 5 files · 10MB each</span>
        <input
          ref={inputRef}
          type="file"
          name="files"
          accept={ACCEPT}
          multiple
          className="sr-only"
          onChange={syncNames}
        />
      </label>

      {fileNames.length > 0 && (
        <ul className="space-y-1 text-sm">
          {fileNames.map((name) => (
            <li key={name} className="truncate text-muted">
              {name}
            </li>
          ))}
        </ul>
      )}

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      <button type="submit" className="btn-primary" disabled={pending || fileNames.length === 0}>
        {pending ? "Uploading…" : "Upload and extract"}
      </button>
    </form>
  );
}
