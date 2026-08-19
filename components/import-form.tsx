"use client";

import { useActionState, useState } from "react";

import { importBooksByIsbn } from "@/app/import/actions";
import {
  initialImportFormState,
  type ImportRowResult,
} from "@/lib/import-form-state";

const ownedFormats = ["physical", "ebook", "both"];
const readingStatuses = ["unread", "reading", "read"];

function rowClasses(status: ImportRowResult["status"]) {
  if (status === "imported") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }

  if (
    status === "imported-no-metadata" ||
    status === "duplicate-library" ||
    status === "duplicate-input"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  return "border-rose-200 bg-rose-50 text-rose-900";
}

export function ImportForm() {
  const [formState, formAction, isPending] = useActionState(
    importBooksByIsbn,
    initialImportFormState,
  );
  const [isbnList, setIsbnList] = useState("");

  async function handleFileChange(file: File | null) {
    if (!file) {
      return;
    }

    const text = await file.text();
    setIsbnList(text);
  }

  return (
    <div className="grid gap-8">
      <form
        action={formAction}
        className="grid gap-6 rounded-[32px] border border-stone-200 bg-white p-6 shadow-[0_24px_80px_rgba(76,58,38,0.08)]"
      >
        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
            Bulk import
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
            Import books from ISBN lines
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-stone-600">
            Paste one ISBN per line or load a `.csv`/text file whose first column is the
            ISBN.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2" htmlFor="import-file">
            <span className="text-sm font-medium text-stone-700">CSV or text file</span>
            <input
              id="import-file"
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              onChange={(event) => {
                void handleFileChange(event.target.files?.[0] ?? null);
              }}
              className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 outline-none"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2" htmlFor="import-owned-format">
              <span className="text-sm font-medium text-stone-700">Imported format</span>
              <select
                id="import-owned-format"
                name="ownedFormat"
                defaultValue="physical"
                className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none"
              >
                {ownedFormats.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2" htmlFor="import-reading-status">
              <span className="text-sm font-medium text-stone-700">Reading status</span>
              <select
                id="import-reading-status"
                name="readingStatus"
                defaultValue="unread"
                className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none"
              >
                {readingStatuses.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <label className="grid gap-2" htmlFor="isbnList">
          <span className="text-sm font-medium text-stone-700">ISBN list</span>
          <textarea
            id="isbnList"
            name="isbnList"
            value={isbnList}
            onChange={(event) => setIsbnList(event.target.value)}
            rows={12}
            placeholder={`isbn\n9780547773742\n9780141182803`}
            className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 font-mono text-sm text-stone-900 outline-none"
          />
        </label>

        {formState.error ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {formState.error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-2xl bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50 disabled:opacity-70"
          >
            {isPending ? "Importing..." : "Import books"}
          </button>
        </div>
      </form>

      {formState.rows.length > 0 ? (
        <section className="grid gap-4 rounded-[32px] border border-stone-200 bg-white p-6 shadow-[0_24px_80px_rgba(76,58,38,0.08)]">
          <div className="grid gap-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
              Import results
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-stone-900">
              Imported {formState.importedCount} of {formState.rows.length} rows
            </h2>
          </div>

          <div className="grid gap-3">
            {formState.rows.map((row, index) => (
              <div
                key={`${row.input}-${index}`}
                className={`grid gap-1 rounded-2xl border px-4 py-3 ${rowClasses(row.status)}`}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]">
                  <span>{row.status}</span>
                  <span>{row.input}</span>
                </div>
                <p className="text-sm">{row.message}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
