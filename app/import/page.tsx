import Link from "next/link";

import { ImportForm } from "@/components/import-form";

export default function ImportPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10 md:px-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">
            Import library
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-stone-950">
            Bring in existing books by ISBN
          </h1>
        </div>

        <Link
          href="/"
          className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700"
        >
          Back to library
        </Link>
      </div>

      <ImportForm />
    </main>
  );
}
