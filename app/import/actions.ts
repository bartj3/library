"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import {
  initialImportFormState,
  type ImportFormState,
  type ImportRowResult,
} from "@/lib/import-form-state";
import { validateIsbn } from "@/lib/isbn";
import { lookupBookMetadata } from "@/lib/book-metadata";

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseInputLines(raw: string) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [firstCell] = line.split(",");
      return firstCell?.trim() ?? "";
    })
    .filter((line) => line.toLowerCase() !== "isbn");
}

export async function importBooksByIsbn(
  _previousState: ImportFormState,
  formData: FormData,
): Promise<ImportFormState> {
  const raw = getStringValue(formData, "isbnList");
  const ownedFormat = getStringValue(formData, "ownedFormat") || "physical";
  const readingStatus = getStringValue(formData, "readingStatus") || "unread";
  const lines = parseInputLines(raw);

  if (lines.length === 0) {
    return {
      ...initialImportFormState,
      error: "Add at least one ISBN before importing.",
    };
  }

  const seen = new Set<string>();
  const rows: ImportRowResult[] = [];
  let importedCount = 0;

  for (const input of lines) {
    const validation = validateIsbn(input);

    if (!validation.normalized || !validation.isValid) {
      rows.push({
        input,
        status: "invalid",
        message: "Invalid ISBN.",
      });
      continue;
    }

    if (seen.has(validation.normalized)) {
      rows.push({
        input,
        status: "duplicate-input",
        message: "Duplicate ISBN in this import batch.",
      });
      continue;
    }

    seen.add(validation.normalized);

    const existingBook = await db.book.findFirst({
      where: {
        OR: [
          { isbn10: validation.normalized },
          { isbn13: validation.normalized },
        ],
      },
      select: {
        id: true,
      },
    });

    if (existingBook) {
      rows.push({
        input,
        status: "duplicate-library",
        message: "Already exists in your library.",
      });
      continue;
    }

    try {
      const metadata = await lookupBookMetadata(validation.normalized);

      if (!metadata) {
        rows.push({
          input,
          status: "not-found",
          message: "No metadata found for this ISBN.",
        });
        continue;
      }

      await db.book.create({
        data: {
          title: metadata.title,
          subtitle: metadata.subtitle ?? null,
          authors: JSON.stringify(metadata.authors),
          isbn10:
            validation.kind === "isbn10"
              ? validation.normalized
              : metadata.isbn10 ?? null,
          isbn13:
            validation.kind === "isbn13"
              ? validation.normalized
              : metadata.isbn13 ?? null,
          publishedDate: metadata.publishedDate ?? null,
          coverUrl: metadata.coverUrl ?? null,
          ownedFormat,
          readingStatus,
          notes: null,
          lookupSource: metadata.lookupSource,
        },
      });

      importedCount += 1;
      rows.push({
        input,
        status: "imported",
        message: metadata.title,
      });
    } catch {
      rows.push({
        input,
        status: "failed",
        message: "Unexpected error during import.",
      });
    }
  }

  revalidatePath("/");

  return {
    error: null,
    importedCount,
    rows,
  };
}
