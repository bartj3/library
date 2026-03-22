import { db } from "@/lib/db";

export type LibraryQuery = {
  search?: string;
  ownedFormat?: string;
  readingStatus?: string;
  sort?: string;
};

const ownedFormats = new Set(["physical", "ebook", "both"]);
const readingStatuses = new Set(["unread", "reading", "read"]);

export async function getBooks(query: LibraryQuery = {}) {
  const search = query.search?.trim() ?? "";
  const ownedFormat =
    query.ownedFormat && ownedFormats.has(query.ownedFormat) ? query.ownedFormat : undefined;
  const readingStatus =
    query.readingStatus && readingStatuses.has(query.readingStatus)
      ? query.readingStatus
      : undefined;
  const sort = query.sort ?? "recent";

  const orderBy =
    sort === "title-asc"
      ? [{ title: "asc" as const }]
      : sort === "title-desc"
        ? [{ title: "desc" as const }]
        : [{ createdAt: "desc" as const }];

  return db.book.findMany({
    where: {
      ...(ownedFormat ? { ownedFormat } : {}),
      ...(readingStatus ? { readingStatus } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search } },
              { authors: { contains: search } },
              { isbn10: { contains: search } },
              { isbn13: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy,
  });
}

export async function getBookById(id: string) {
  return db.book.findUnique({
    where: { id },
  });
}
