import { type BookRecord, readBooks } from "@/lib/library-store";
import { parseBookTags } from "@/lib/tags";

export type LibraryQuery = {
  search?: string;
  ownedFormat?: string;
  readingStatus?: string;
  tag?: string;
  sort?: string;
};

const ownedFormats = new Set(["physical", "ebook", "both"]);
const readingStatuses = new Set(["unread", "reading", "read"]);

export async function getBooks(query: LibraryQuery = {}) {
  const books = await readBooks();
  const search = query.search?.trim() ?? "";
  const ownedFormat =
    query.ownedFormat && ownedFormats.has(query.ownedFormat) ? query.ownedFormat : undefined;
  const readingStatus =
    query.readingStatus && readingStatuses.has(query.readingStatus)
      ? query.readingStatus
      : undefined;
  const tag = query.tag?.trim() || undefined;
  const sort = query.sort ?? "recent";

  const orderBy =
    sort === "title-asc"
      ? [{ title: "asc" as const }]
      : sort === "title-desc"
        ? [{ title: "desc" as const }]
        : [{ createdAt: "desc" as const }];

  const normalizedSearch = search.toLowerCase();

  return books
    .filter((book) => {
      // Books owned in "both" formats match the physical and ebook filters.
      if (
        ownedFormat &&
        book.ownedFormat !== ownedFormat &&
        book.ownedFormat !== "both"
      ) {
        return false;
      }

      if (readingStatus && book.readingStatus !== readingStatus) {
        return false;
      }

      if (tag && !parseBookTags(book.tags).includes(tag)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        book.title,
        book.authors,
        book.isbn10 ?? "",
        book.isbn13 ?? "",
      ].some((value) => value.toLowerCase().includes(normalizedSearch));
    })
    .sort((left, right) => compareBooks(left, right, orderBy));
}

export async function getAllTags() {
  const books = await readBooks();
  const tags = new Set(books.flatMap((book) => parseBookTags(book.tags)));
  return [...tags].sort((left, right) => left.localeCompare(right));
}

export async function getBookById(id: string) {
  const books = await readBooks();
  return books.find((book) => book.id === id) ?? null;
}

function compareBooks(
  left: BookRecord,
  right: BookRecord,
  orderBy: Array<Record<string, "asc" | "desc">>,
) {
  const [entry] = orderBy;
  const [[field, direction]] = Object.entries(entry) as Array<
    [keyof Pick<BookRecord, "title" | "createdAt">, "asc" | "desc"]
  >;
  const leftValue = left[field] ?? "";
  const rightValue = right[field] ?? "";
  const result = String(leftValue).localeCompare(String(rightValue));

  return direction === "asc" ? result : -result;
}
