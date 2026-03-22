import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { randomUUID } from "node:crypto";

export type BookRecord = {
  id: string;
  isbn13: string | null;
  isbn10: string | null;
  title: string;
  subtitle: string | null;
  authors: string;
  publishedDate: string | null;
  coverUrl: string | null;
  ownedFormat: string;
  readingStatus: string;
  notes: string | null;
  lookupSource: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BookInput = Omit<BookRecord, "id" | "createdAt" | "updatedAt">;

export class DuplicateIsbnError extends Error {
  constructor() {
    super("That ISBN already exists in your library.");
  }
}

function getLibraryFilePath() {
  const configuredPath = process.env.LIBRARY_DATA_FILE ?? "data/library.json";

  if (isAbsolute(configuredPath)) {
    return configuredPath;
  }

  return resolve(/* turbopackIgnore: true */ process.cwd(), configuredPath);
}

async function ensureLibraryFile() {
  const filePath = getLibraryFilePath();

  await mkdir(dirname(filePath), { recursive: true });

  try {
    await readFile(filePath, "utf8");
  } catch {
    await writeFile(filePath, "[]\n", "utf8");
  }

  return filePath;
}

async function writeBooks(books: BookRecord[]) {
  const filePath = await ensureLibraryFile();
  const tempPath = `${filePath}.tmp`;
  const content = `${JSON.stringify(books, null, 2)}\n`;

  await writeFile(tempPath, content, "utf8");
  await rename(tempPath, filePath);
}

export async function readBooks() {
  const filePath = await ensureLibraryFile();
  const content = await readFile(filePath, "utf8");

  try {
    const parsed = JSON.parse(content) as unknown;
    return Array.isArray(parsed) ? (parsed as BookRecord[]) : [];
  } catch {
    return [];
  }
}

function hasDuplicateIsbn(books: BookRecord[], candidate: BookInput, excludeId?: string) {
  const candidateIsbns = [candidate.isbn10, candidate.isbn13].filter(Boolean);

  if (candidateIsbns.length === 0) {
    return false;
  }

  return books.some((book) => {
    if (excludeId && book.id === excludeId) {
      return false;
    }

    return candidateIsbns.some((isbn) => isbn === book.isbn10 || isbn === book.isbn13);
  });
}

export async function createBookRecord(input: BookInput) {
  const books = await readBooks();

  if (hasDuplicateIsbn(books, input)) {
    throw new DuplicateIsbnError();
  }

  const timestamp = new Date().toISOString();
  const book: BookRecord = {
    id: randomUUID(),
    ...input,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  books.push(book);
  await writeBooks(books);

  return book;
}

export async function updateBookRecord(id: string, input: BookInput) {
  const books = await readBooks();
  const index = books.findIndex((book) => book.id === id);

  if (index === -1) {
    throw new Error("Book not found.");
  }

  if (hasDuplicateIsbn(books, input, id)) {
    throw new DuplicateIsbnError();
  }

  const nextBook: BookRecord = {
    ...books[index],
    ...input,
    updatedAt: new Date().toISOString(),
  };

  books[index] = nextBook;
  await writeBooks(books);

  return nextBook;
}

export async function deleteBookRecord(id: string) {
  const books = await readBooks();
  const nextBooks = books.filter((book) => book.id !== id);

  await writeBooks(nextBooks);
}

export async function findBookById(id: string) {
  const books = await readBooks();
  return books.find((book) => book.id === id) ?? null;
}

export async function findBookByIsbn(isbn: string) {
  const books = await readBooks();
  return (
    books.find((book) => book.isbn10 === isbn || book.isbn13 === isbn) ?? null
  );
}

export async function replaceBooks(books: BookRecord[]) {
  await writeBooks(books);
}
