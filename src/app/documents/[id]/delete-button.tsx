"use client";

import { Trash2 } from "lucide-react";
import { useRef } from "react";
import { deleteDocument } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

export function DeleteButton({ id, name }: { id: string; name: string }) {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button type="button" className="btn-icon hover:bg-danger-soft hover:text-danger" aria-label="Delete" onClick={() => dialog.current?.showModal()}>
        <Trash2 className="h-4 w-4" aria-hidden />
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="delete-title"
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-foreground shadow-lg backdrop:bg-black/40 backdrop:backdrop-blur-[2px]"
      >
        <div className="p-6">
          <div className="mb-4 grid h-10 w-10 place-items-center rounded-full bg-danger-soft text-danger">
            <Trash2 className="h-5 w-5" aria-hidden />
          </div>
          <h2 id="delete-title" className="text-lg font-semibold">
            Delete document?
          </h2>
          <p className="mt-1 text-sm break-words text-muted">{name} and its extracted data will be removed.</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-line bg-surface-2/50 px-6 py-4">
          <button type="button" className="btn-secondary" autoFocus onClick={() => dialog.current?.close()}>
            Cancel
          </button>
          <form action={deleteDocument.bind(null, id)}>
            <SubmitButton className="btn-danger" pendingLabel="Deleting…">
              Delete
            </SubmitButton>
          </form>
        </div>
      </dialog>
    </>
  );
}
