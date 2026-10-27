"use client";

import { Check, CircleAlert, LoaderCircle } from "lucide-react";
import { useActionState, useState, type ReactNode } from "react";
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

export function CorrectionForm({ id, values, reviewed }: { id: string; values: Values; reviewed: boolean }) {
  const [state, formAction, pending] = useActionState<CorrectionState, FormData>(
    saveCorrections.bind(null, id),
    {},
  );
  // Edits made after the last submit make the form dirty; submitting clears it.
  const [lastEdit, setLastEdit] = useState(0);
  const [lastSubmit, setLastSubmit] = useState(0);
  const dirty = lastEdit > lastSubmit;
  const justSaved = Boolean(state.savedAt) && !pending;
  const currency = values.currency ?? "";

  const invalid = (name: string) => (state.field === name && !dirty ? true : undefined);

  return (
    <form
      action={formAction}
      onChange={() => setLastEdit(Date.now())}
      onSubmit={() => setLastSubmit(Date.now())}
      className="card overflow-hidden"
    >
      <Section title="Details">
        <Field label="Vendor" name="vendorName" wide defaultValue={values.vendorName ?? ""} invalid={invalid("vendorName")} />
        <Field label="Document number" name="documentNumber" defaultValue={values.documentNumber ?? ""} />
        <div>
          <label className="label" htmlFor="category">
            Category
          </label>
          <select id="category" name="category" defaultValue={values.category ?? "Other"} className="input pr-8">
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <Field label="Issue date" name="issueDate" type="date" defaultValue={toDateInput(values.issueDate)} invalid={invalid("issueDate")} />
        <Field label="Due date" name="dueDate" type="date" defaultValue={toDateInput(values.dueDate)} invalid={invalid("dueDate")} />
      </Section>

      <Section title="Amounts">
        <Field
          label="Currency"
          name="currency"
          defaultValue={currency}
          maxLength={3}
          className="uppercase"
          placeholder="NGN"
          invalid={invalid("currency")}
        />
        <Amount label="Subtotal" name="subtotal" value={values.subtotal} currency={currency} invalid={invalid("subtotal")} />
        <Amount label="Tax" name="tax" value={values.tax} currency={currency} invalid={invalid("tax")} />
        <Amount label="Total" name="total" value={values.total} currency={currency} invalid={invalid("total")} strong />
      </Section>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line bg-surface-2/50 px-5 py-3">
        {state.error && !dirty && !pending && (
          <p role="alert" className="mr-auto flex items-center gap-1.5 text-sm text-danger">
            <CircleAlert className="h-4 w-4" aria-hidden />
            {state.error}
          </p>
        )}
        {justSaved && !dirty && (
          <p role="status" className="mr-auto flex items-center gap-1.5 text-sm text-muted">
            <Check className="h-4 w-4 text-accent" aria-hidden />
            Saved
          </p>
        )}
        {dirty || !reviewed ? (
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}
            {dirty ? "Save changes" : "Mark as reviewed"}
          </button>
        ) : (
          <span className="inline-flex h-9 items-center gap-1.5 text-sm text-muted">
            <Check className="h-4 w-4 text-accent" aria-hidden />
            Reviewed
          </span>
        )}
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-b border-line px-5 py-5 last-of-type:border-b-0">
      <legend className="sr-only">{title}</legend>
      <p aria-hidden className="mb-4 text-xs font-semibold tracking-wide text-subtle uppercase">
        {title}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Field({
  label,
  name,
  wide,
  invalid,
  type = "text",
  className = "",
  ...props
}: {
  label: string;
  name: string;
  wide?: boolean;
  invalid?: boolean;
  type?: string;
  className?: string;
  defaultValue: string;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input id={name} name={name} type={type} aria-invalid={invalid} className={`input ${className}`} {...props} />
    </div>
  );
}

function Amount({
  label,
  name,
  value,
  currency,
  invalid,
  strong,
}: {
  label: string;
  name: string;
  value: number | null;
  currency: string;
  invalid?: boolean;
  strong?: boolean;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type="number"
          step="0.01"
          inputMode="decimal"
          defaultValue={toAmountInput(value)}
          aria-invalid={invalid}
          className={`input money pr-12 ${strong ? "font-semibold" : ""}`}
        />
        {currency && (
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-subtle">
            {currency}
          </span>
        )}
      </div>
    </div>
  );
}
