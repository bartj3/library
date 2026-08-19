"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";

import { importBooksByIsbn } from "@/app/import/actions";
import {
  initialImportFormState,
  type ImportRowResult,
} from "@/lib/import-form-state";
import { validateIsbn } from "@/lib/isbn";

const ownedFormats = ["physical", "ebook", "both"];
const readingStatuses = ["unread", "reading", "read"];

const SCAN_INTERVAL_MS = 250;

type ScannedBook = {
  isbn: string;
  lookup: "pending" | "found" | "not-found";
  title?: string;
  authors?: string[];
  coverUrl?: string;
};

type CameraState = "idle" | "starting" | "scanning" | "unavailable" | "insecure";

type Detector = (video: HTMLVideoElement) => Promise<string[]>;

// Prefers the native BarcodeDetector API (Chrome on Android and desktop);
// falls back to the zxing-wasm decoder everywhere else.
async function createDetector(): Promise<Detector> {
  if ("BarcodeDetector" in window) {
    try {
      const formats = await window.BarcodeDetector.getSupportedFormats();

      if (formats.includes("ean_13")) {
        const detector = new window.BarcodeDetector({ formats: ["ean_13"] });

        return async (video) => {
          const barcodes = await detector.detect(video);
          return barcodes.map((barcode) => barcode.rawValue);
        };
      }
    } catch {
      // fall through to the wasm decoder
    }
  }

  const { readBarcodes } = await import("zxing-wasm/reader");
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  return async (video) => {
    if (!context || video.videoWidth === 0) {
      return [];
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const results = await readBarcodes(imageData, {
      formats: ["EAN-13"],
      maxNumberOfSymbols: 4,
    });

    return results.map((result) => result.text);
  };
}

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

export function BarcodeScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const seenRef = useRef(new Set<string>());
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scans, setScans] = useState<ScannedBook[]>([]);
  const [lastHit, setLastHit] = useState<string | null>(null);
  const [formState, formAction, isPending] = useActionState(
    importBooksByIsbn,
    initialImportFormState,
  );

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraState("idle");
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  // Scanned ISBNs already imported once; reset the queue so a second
  // shelf can be scanned without re-submitting the same books.
  useEffect(() => {
    if (formState.rows.length > 0) {
      seenRef.current.clear();
      setScans([]);
    }
  }, [formState]);

  const lookupIsbn = useCallback(async (isbn: string) => {
    try {
      const response = await fetch("/api/isbn-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isbn }),
      });

      if (!response.ok) {
        throw new Error("lookup failed");
      }

      const metadata = (await response.json()) as {
        title?: string;
        authors?: string[];
        coverUrl?: string;
      };

      setScans((current) =>
        current.map((scan) =>
          scan.isbn === isbn
            ? {
                ...scan,
                lookup: "found",
                title: metadata.title,
                authors: metadata.authors,
                coverUrl: metadata.coverUrl,
              }
            : scan,
        ),
      );
    } catch {
      setScans((current) =>
        current.map((scan) =>
          scan.isbn === isbn ? { ...scan, lookup: "not-found" } : scan,
        ),
      );
    }
  }, []);

  const handleDetection = useCallback(
    (rawValue: string) => {
      const validation = validateIsbn(rawValue);

      if (!validation.normalized || !validation.isValid || validation.kind !== "isbn13") {
        return;
      }

      const isbn = validation.normalized;

      // EAN-13 barcodes cover more than books; only 978/979 prefixes are ISBNs.
      if (!isbn.startsWith("978") && !isbn.startsWith("979")) {
        return;
      }

      if (seenRef.current.has(isbn)) {
        return;
      }

      seenRef.current.add(isbn);
      navigator.vibrate?.(100);
      setLastHit(isbn);
      setScans((current) => [{ isbn, lookup: "pending" }, ...current]);
      void lookupIsbn(isbn);
    },
    [lookupIsbn],
  );

  const startCamera = useCallback(async () => {
    if (!window.isSecureContext) {
      setCameraState("insecure");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState("unavailable");
      setCameraError("This browser does not support camera access.");
      return;
    }

    setCameraState("starting");
    setCameraError(null);

    let stream: MediaStream;

    try {
      // Open the camera before anything else so the permission prompt is
      // immediate; the decoder loads while the viewfinder is already live.
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
    } catch (error) {
      setCameraState("unavailable");
      setCameraError(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Camera permission was denied. If the address bar shows a certificate warning, the browser blocks the camera until the certificate is trusted."
          : `Could not start the camera: ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`,
      );
      return;
    }

    try {
      streamRef.current = stream;

      const video = videoRef.current;

      if (!video) {
        stopCamera();
        return;
      }

      video.srcObject = stream;
      await video.play();
      setCameraState("scanning");

      const detector = await createDetector();

      const tick = async () => {
        if (!streamRef.current || !videoRef.current) {
          return;
        }

        try {
          const values = await detector(videoRef.current);
          values.forEach(handleDetection);
        } catch {
          // ignore per-frame decode errors and keep scanning
        }

        if (streamRef.current) {
          window.setTimeout(tick, SCAN_INTERVAL_MS);
        }
      };

      void tick();
    } catch (error) {
      stopCamera();
      setCameraState("unavailable");
      setCameraError(
        `The camera works, but the barcode decoder failed to load: ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`,
      );
    }
  }, [handleDetection, stopCamera]);

  const removeScan = useCallback((isbn: string) => {
    seenRef.current.delete(isbn);
    setScans((current) => current.filter((scan) => scan.isbn !== isbn));
  }, []);

  return (
    <div className="grid gap-8">
      <section className="grid gap-6 rounded-[32px] border border-stone-200 bg-white p-6 shadow-[0_24px_80px_rgba(76,58,38,0.08)]">
        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
            Camera
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-stone-900">
            Point at a barcode
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-stone-600">
            Scan the EAN-13 barcode on the back of a book. Each new ISBN is added to the
            queue below with its metadata, and nothing is saved until you import.
          </p>
        </div>

        <div className="relative aspect-video overflow-hidden rounded-[20px] bg-stone-950">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`h-full w-full object-cover ${cameraState === "scanning" ? "" : "hidden"}`}
          />

          {cameraState !== "scanning" ? (
            <div className="absolute inset-0 grid place-items-center p-6 text-center">
              {cameraState === "insecure" ? (
                <p className="max-w-md text-sm leading-6 text-stone-300">
                  Camera access needs a secure connection. Start the app with{" "}
                  <code className="rounded bg-stone-800 px-1.5 py-0.5">npm run dev:https</code>{" "}
                  and open the https:// URL on this device.
                </p>
              ) : cameraState === "unavailable" ? (
                <div className="grid justify-items-center gap-4">
                  <p className="max-w-md text-sm leading-6 text-rose-300">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => void startCamera()}
                    className="rounded-2xl bg-[#f0d7ae] px-6 py-3 text-sm font-semibold text-stone-950"
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => void startCamera()}
                  disabled={cameraState === "starting"}
                  className="rounded-2xl bg-[#f0d7ae] px-6 py-3 text-sm font-semibold text-stone-950 disabled:opacity-70"
                >
                  {cameraState === "starting" ? "Starting camera..." : "Start scanning"}
                </button>
              )}
            </div>
          ) : (
            <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-2xl border-2 border-white/60" />
          )}
        </div>

        {cameraState === "scanning" ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={stopCamera}
              className="rounded-2xl border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700"
            >
              Stop camera
            </button>
            <p className="text-sm text-stone-500" aria-live="polite">
              {lastHit ? `Last scan: ${lastHit}` : "Waiting for a barcode..."}
            </p>
          </div>
        ) : null}
      </section>

      <form
        action={formAction}
        className="grid gap-6 rounded-[32px] border border-stone-200 bg-white p-6 shadow-[0_24px_80px_rgba(76,58,38,0.08)]"
      >
        <div className="grid gap-1">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
            Scan queue
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-stone-900">
            {scans.length === 0
              ? "No books scanned yet"
              : `${scans.length} book${scans.length === 1 ? "" : "s"} ready to import`}
          </h2>
        </div>

        {scans.length > 0 ? (
          <ul className="grid gap-3">
            {scans.map((scan) => (
              <li
                key={scan.isbn}
                className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3"
              >
                <div className="h-16 w-11 shrink-0 overflow-hidden rounded-lg bg-stone-200">
                  {scan.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={scan.coverUrl} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-stone-900">
                    {scan.lookup === "pending"
                      ? "Looking up..."
                      : scan.title ?? "No metadata found — will import with ISBN only"}
                  </p>
                  <p className="truncate text-sm text-stone-600">
                    {scan.authors?.join(", ") ?? ""}
                  </p>
                  <p className="font-mono text-xs text-stone-500">{scan.isbn}</p>
                </div>

                <button
                  type="button"
                  onClick={() => removeScan(scan.isbn)}
                  className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <input
          type="hidden"
          name="isbnList"
          value={scans.map((scan) => scan.isbn).join("\n")}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2" htmlFor="scan-owned-format">
            <span className="text-sm font-medium text-stone-700">Imported format</span>
            <select
              id="scan-owned-format"
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

          <label className="grid gap-2" htmlFor="scan-reading-status">
            <span className="text-sm font-medium text-stone-700">Reading status</span>
            <select
              id="scan-reading-status"
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

        {formState.error ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {formState.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending || scans.length === 0}
          className="rounded-2xl bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50 disabled:opacity-70"
        >
          {isPending
            ? "Importing..."
            : `Import ${scans.length || ""} book${scans.length === 1 ? "" : "s"}`.replace("  ", " ")}
        </button>
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
