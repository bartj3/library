import { readFile } from "node:fs/promises";

import { validateIsbn } from "@/lib/isbn";

export type NormalizedBookMetadata = {
  title: string;
  subtitle?: string;
  authors: string[];
  publishedDate?: string;
  coverUrl?: string;
  lookupSource: "openlibrary" | "googlebooks";
  isbn10?: string;
  isbn13?: string;
};

let metadataMocksPromise: Promise<Record<string, NormalizedBookMetadata> | null> | null = null;

async function loadMetadataMocks() {
  if (metadataMocksPromise) {
    return metadataMocksPromise;
  }

  const filePath = process.env.BOOK_METADATA_MOCKS_FILE;

  if (!filePath) {
    metadataMocksPromise = Promise.resolve(null);
    return metadataMocksPromise;
  }

  metadataMocksPromise = readFile(filePath, "utf8")
    .then((content) => JSON.parse(content) as Record<string, NormalizedBookMetadata>)
    .catch(() => null);

  return metadataMocksPromise;
}

type OpenLibraryBook = {
  title?: string;
  subtitle?: string;
  publish_date?: string;
  authors?: Array<{ name?: string }>;
  cover?: {
    large?: string;
    medium?: string;
    small?: string;
  };
  identifiers?: {
    isbn_10?: string[];
    isbn_13?: string[];
  };
};

function hasUsableMetadata(value: Partial<NormalizedBookMetadata> | null): value is NormalizedBookMetadata {
  return Boolean(value?.title && value.authors && value.authors.length > 0);
}

async function lookupOpenLibrary(isbn: string): Promise<NormalizedBookMetadata | null> {
  const params = new URLSearchParams({
    bibkeys: `ISBN:${isbn}`,
    format: "json",
    jscmd: "data",
  });

  const response = await fetch(`https://openlibrary.org/api/books?${params.toString()}`, {
    next: { revalidate: 60 * 60 },
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as Record<string, OpenLibraryBook>;
  const book = payload[`ISBN:${isbn}`];

  if (!book?.title) {
    return null;
  }

  return {
    title: book.title,
    subtitle: book.subtitle,
    authors: book.authors?.map((author) => author.name).filter(Boolean) as string[] ?? [],
    publishedDate: book.publish_date,
    coverUrl: book.cover?.large ?? book.cover?.medium ?? book.cover?.small,
    lookupSource: "openlibrary",
    isbn10: book.identifiers?.isbn_10?.[0],
    isbn13: book.identifiers?.isbn_13?.[0],
  };
}

function toHttps(url: string | undefined | null) {
  return url?.replace(/^http:\/\//, "https://");
}

// The Google Books API intermittently returns 503s (~30% of requests observed),
// so one retry meaningfully improves lookup reliability.
async function fetchGoogleBooks(params: URLSearchParams) {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;

  if (apiKey) {
    params.set("key", apiKey);
  }

  const url = `https://www.googleapis.com/books/v1/volumes?${params.toString()}`;
  let response = await fetch(url, {
    next: { revalidate: 60 * 60 },
  });

  if (response.status >= 500) {
    response = await fetch(url, {
      next: { revalidate: 60 * 60 },
    });
  }

  return response;
}

type GoogleBooksResponse = {
  items?: Array<{
    volumeInfo?: {
      title?: string;
      subtitle?: string;
      authors?: string[];
      publishedDate?: string;
      imageLinks?: {
        thumbnail?: string;
        smallThumbnail?: string;
      };
      industryIdentifiers?: Array<{
        type?: string;
        identifier?: string;
      }>;
    };
  }>;
};

async function lookupGoogleBooks(isbn: string): Promise<NormalizedBookMetadata | null> {
  const params = new URLSearchParams({
    q: `isbn:${isbn}`,
    maxResults: "1",
  });

  const response = await fetchGoogleBooks(params);

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as GoogleBooksResponse;
  const volume = payload.items?.[0]?.volumeInfo;

  if (!volume?.title) {
    return null;
  }

  const identifiers = volume.industryIdentifiers ?? [];

  return {
    title: volume.title,
    subtitle: volume.subtitle,
    authors: volume.authors ?? [],
    publishedDate: volume.publishedDate,
    coverUrl: toHttps(volume.imageLinks?.thumbnail ?? volume.imageLinks?.smallThumbnail),
    lookupSource: "googlebooks",
    isbn10: identifiers.find((entry) => entry.type === "ISBN_10")?.identifier,
    isbn13: identifiers.find((entry) => entry.type === "ISBN_13")?.identifier,
  };
}

type OpenLibrarySearchResponse = {
  docs?: Array<{
    cover_i?: number;
  }>;
};

async function searchOpenLibraryCover(title: string, author?: string): Promise<string | null> {
  const params = new URLSearchParams({
    title,
    limit: "1",
    fields: "cover_i",
  });

  if (author) {
    params.set("author", author);
  }

  const response = await fetch(`https://openlibrary.org/search.json?${params.toString()}`, {
    next: { revalidate: 60 * 60 },
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as OpenLibrarySearchResponse;
  const coverId = payload.docs?.[0]?.cover_i;

  return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null;
}

async function searchGoogleBooksCover(title: string, author?: string): Promise<string | null> {
  const query = author ? `intitle:"${title}" inauthor:"${author}"` : `intitle:"${title}"`;
  const params = new URLSearchParams({
    q: query,
    maxResults: "1",
  });

  const response = await fetchGoogleBooks(params);

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as GoogleBooksResponse;
  const imageLinks = payload.items?.[0]?.volumeInfo?.imageLinks;

  return toHttps(imageLinks?.thumbnail ?? imageLinks?.smallThumbnail) ?? null;
}

export async function lookupCoverByTitle(title: string, author?: string): Promise<string | null> {
  try {
    const openLibraryCover = await searchOpenLibraryCover(title, author);

    if (openLibraryCover) {
      return openLibraryCover;
    }

    return await searchGoogleBooksCover(title, author);
  } catch {
    return null;
  }
}

export async function lookupBookMetadata(input: string): Promise<NormalizedBookMetadata | null> {
  const { normalized, isValid } = validateIsbn(input);

  if (!normalized || !isValid) {
    return null;
  }

  const mocks = await loadMetadataMocks();
  const mockedResult = mocks?.[normalized];

  if (mockedResult) {
    return mockedResult;
  }

  const openLibrary = await lookupOpenLibrary(normalized);
  const googleBooks = hasUsableMetadata(openLibrary) ? null : await lookupGoogleBooks(normalized);

  const result = hasUsableMetadata(openLibrary)
    ? openLibrary
    : hasUsableMetadata(googleBooks)
      ? googleBooks
      : openLibrary ?? googleBooks;

  if (result?.title && !result.coverUrl) {
    result.coverUrl = (await lookupCoverByTitle(result.title, result.authors?.[0])) ?? undefined;
  }

  return result;
}
