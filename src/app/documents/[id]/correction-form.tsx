"use client";

import { useActionState } from "react";
import { saveCorrections, type CorrectionState } from "@/app/actions";
import { CATEGORIES } from "@/lib/categories";
import { toAmountInput, toDateInput } from "@/lib/format";

type Values = {
  vendorName: string | null;
  documentNumber: string | null;
  issueDate: Date | null;
  dueDate: Date | null;
  currency: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  category: string | null;
};

export function CorrectionForm({ id, values }: { id: string; values: Values }) {
  const [state, formAction, pending] = useActionState<CorrectionState, FormData>(
    saveCorrections.bind(null, id),
    {},
  );

  return (
    <form action={formAction} className="card grid gap-4 p-4 sm:grid-cols-2">
      <Field label="Vendor" name="vendorName" defaultValue={values.vendorName ?? ""} wide />
      <Field label="Document number" name="documentNumber" defaultValue={values.documentNumber ?? ""} />
      <div>
        <label className="label" htmlFor="category">
          Category
        </label>
        <select
          id="category"
          name="category"
          defaultValue={values.category ?? "Other"}
          className="input"
        >
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <Field label="Issue date" name="issueDate" type="date" defaultValue={toDateInput(values.issueDate)} />
      <Field label="Due date" name="dueDate" type="date" defaultValue={toDateInput(values.dueDate)} />
      <Field label="Currency" name="currency" defaultValue={values.currency ?? ""} maxLength={3} />
      <Field label="Subtotal" name="subtotal" type="number" defaultValue={toAmountInput(values.subtotal)} />
      <Field label="Tax" name="tax" type="number" defaultValue={toAmountInput(values.tax)} />
      <Field label="Total" name="total" type="number" defaultValue={toAmountInput(values.total)} />

      <div className="flex items-center gap-3 sm:col-span-2">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
        {state.error && <span className="text-sm text-danger">{state.error}</span>}
        {state.saved && !pending && <span className="text-sm text-muted">Saved</span>}
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  wide,
  type = "text",
  ...props
}: {
  label: string;
  name: string;
  wide?: boolean;
  type?: string;
  defaultValue: string;
  maxLength?: number;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        step={type === "number" ? "0.01" : undefined}
        className="input"
        {...props}
      />
    </div>
  );
}
