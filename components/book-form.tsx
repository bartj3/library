"use client";

import { useActionState, useState } from "react";

import { initialBookFormState, type BookFormState } from "@/lib/book-form-state";

type BookFormProps = {
  mode: "create" | "edit";
  action: (
    state: BookFormState,
    formData: FormData,
  ) => BookFormState | Promise<BookFormState>;
  deleteAction?: () => void | Promise<void>;
  initialValues?: {
    title?: string;
    subtitle?: string | null;
    authors?: string[];
    isbn13?: string | null;
    isbn10?: string | null;
    publishedDate?: string | null;
    coverUrl?: string | null;
    ownedFormat?: string;
    readingStatus?: string;
    notes?: string | null;
    lookupSource?: string | null;
  };
};

type LookupResponse = {
  error?: string;
  title?: string;
  subtitle?: string;
  authors?: string[];
  publishedDate?: string;
  coverUrl?: string;
  lookupSource?: string;
  isbn10?: string;
  isbn13?: string;
};

const ownedFormats = ["physical", "ebook", "both"];
const readingStatuses = ["unread", "reading", "read"];

export function BookForm({ mode, action, deleteAction, initialValues }: BookFormProps) {
  const [formState, formAction, isPending] = useActionState(
    action,
    initialBookFormState,
  );
  const [isbn, setIsbn] = useState(initialValues?.isbn13 ?? initialValues?.isbn10 ?? "");
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [subtitle, setSubtitle] = useState(initialValues?.subtitle ?? "");
  const [authors, setAuthors] = useState(initialValues?.authors?.join(", ") ?? "");
  const [publishedDate, setPublishedDate] = useState(initialValues?.publishedDate ?? "");
  const [ownedFormat, setOwnedFormat] = useState(initialValues?.ownedFormat ?? "physical");
  const [readingStatus, setReadingStatus] = useState(initialValues?.readingStatus ?? "unread");
  const [coverUrl, setCoverUrl] = useState(initialValues?.coverUrl ?? "");
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  const [lookupSource, setLookupSource] = useState(initialValues?.lookupSource ?? "");
  const [metadataIsbn10, setMetadataIsbn10] = useState(initialValues?.isbn10 ?? "");
  const [metadataIsbn13, setMetadataIsbn13] = useState(initialValues?.isbn13 ?? "");
  const [lookupError, setLookupError] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);

  async function handleLookup() {
    if (!isbn.trim()) {
      setLookupError("Enter an ISBN before fetching details.");
      return;
    }

    setLookupError("");
    setIsLookingUp(true);

    try {
      const response = await fetch("/api/isbn-lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isbn }),
      });

      const payload = (await response.json()) as LookupResponse;

      if (!response.ok) {
        setLookupError(payload.error ?? "Lookup failed.");
        return;
      }

      setTitle(payload.title ?? "");
      setSubtitle(payload.subtitle ?? "");
      setAuthors(payload.authors?.join(", ") ?? "");
      setPublishedDate(payload.publishedDate ?? "");
      setCoverUrl(payload.coverUrl ?? "");
      setLookupSource(payload.lookupSource ?? "");
      setMetadataIsbn10(payload.isbn10 ?? "");
      setMetadataIsbn13(payload.isbn13 ?? "");
    } catch {
      setLookupError("Lookup failed. Check your connection and try again.");
    } finally {
      setIsLookingUp(false);
    }
  }

  return (
    <form
      action={formAction}
      className="grid gap-6 rounded-[32px] border border-stone-200 bg-white p-6 shadow-[0_24px_80px_rgba(76,58,38,0.08)]"
    >
      <div className="grid gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
          {mode === "create" ? "New entry" : "Edit entry"}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
          {mode === "create" ? "Add a book" : "Update book details"}
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-stone-600">
          Add books manually or fetch metadata from an ISBN before saving the record.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
        <label className="grid gap-2" htmlFor="isbn">
          <span className="text-sm font-medium text-stone-700">ISBN</span>
          <input
            id="isbn"
            name="isbn"
            value={isbn}
            onChange={(event) => {
              setIsbn(event.target.value);
              setLookupError("");
            }}
            placeholder="9780000000000"
            className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() => void handleLookup()}
          disabled={isLookingUp}
          className="rounded-2xl bg-stone-900 px-4 py-3 text-sm font-medium text-stone-50 disabled:cursor-wait disabled:opacity-70"
        >
          {isLookingUp ? "Fetching..." : "Fetch details"}
        </button>
      </div>

      <input type="hidden" name="lookupSource" value={lookupSource} />
      <input type="hidden" name="metadataIsbn10" value={metadataIsbn10} />
      <input type="hidden" name="metadataIsbn13" value={metadataIsbn13} />

      {lookupSource ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Metadata loaded from {lookupSource}.
        </p>
      ) : null}

      {lookupError ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {lookupError}
        </p>
      ) : null}

      {formState.error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {formState.error}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2" htmlFor="title">
          <span className="text-sm font-medium text-stone-700">Title</span>
          <input
            id="title"
            name="title"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Book title"
            className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none"
          />
        </label>
        <label className="grid gap-2" htmlFor="subtitle">
          <span className="text-sm font-medium text-stone-700">Subtitle</span>
          <input
            id="subtitle"
            name="subtitle"
            value={subtitle}
            onChange={(event) => setSubtitle(event.target.value)}
            placeholder="Optional subtitle"
            className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2" htmlFor="authors">
          <span className="text-sm font-medium text-stone-700">Authors</span>
          <input
            id="authors"
            name="authors"
            value={authors}
            onChange={(event) => setAuthors(event.target.value)}
            placeholder="Author One, Author Two"
            className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none"
          />
        </label>
        <label className="grid gap-2" htmlFor="publishedDate">
          <span className="text-sm font-medium text-stone-700">Published date</span>
          <input
            id="publishedDate"
            name="publishedDate"
            value={publishedDate}
            onChange={(event) => setPublishedDate(event.target.value)}
            placeholder="1998 or 1998-06-01"
            className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2" htmlFor="ownedFormat">
          <span className="text-sm font-medium text-stone-700">Owned format</span>
          <select
            id="ownedFormat"
            name="ownedFormat"
            value={ownedFormat}
            onChange={(event) => setOwnedFormat(event.target.value)}
            className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none"
          >
            {ownedFormats.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2" htmlFor="readingStatus">
          <span className="text-sm font-medium text-stone-700">Reading status</span>
          <select
            id="readingStatus"
            name="readingStatus"
            value={readingStatus}
            onChange={(event) => setReadingStatus(event.target.value)}
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

      <label className="grid gap-2" htmlFor="coverUrl">
        <span className="text-sm font-medium text-stone-700">Cover URL</span>
        <input
          id="coverUrl"
          name="coverUrl"
          value={coverUrl}
          onChange={(event) => setCoverUrl(event.target.value)}
          placeholder="https://..."
          className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none"
        />
      </label>

      <label className="grid gap-2" htmlFor="notes">
        <span className="text-sm font-medium text-stone-700">Notes</span>
        <textarea
          id="notes"
          name="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Optional notes"
          rows={5}
          className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none"
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-2xl bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50"
        >
          {isPending ? "Saving..." : mode === "create" ? "Save book" : "Update book"}
        </button>
        {mode === "edit" ? (
          <button
            formAction={deleteAction}
            className="rounded-2xl border border-stone-200 px-5 py-3 text-sm font-medium text-stone-700"
          >
            Delete book
          </button>
        ) : null}
      </div>
    </form>
  );
}
