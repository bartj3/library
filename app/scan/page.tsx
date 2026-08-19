import Link from "next/link";

import { BarcodeScanner } from "@/components/barcode-scanner";
import { getAllTags } from "@/lib/queries";

export default async function ScanPage() {
  const tagSuggestions = await getAllTags();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10 md:px-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">
            Scan barcodes
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-stone-950">
            Add books with your camera
          </h1>
        </div>

        <Link
          href="/"
          className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700"
        >
          Back to library
        </Link>
      </div>

      <noscript>
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          JavaScript is disabled in this browser, so the scanner cannot run. Enable it
          for this site in your browser settings.
        </p>
      </noscript>

      <BarcodeScanner tagSuggestions={tagSuggestions} />
    </main>
  );
}
