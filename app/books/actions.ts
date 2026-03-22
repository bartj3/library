"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { type BookFormState } from "@/lib/book-form-state";
import { validateIsbn } from "@/lib/isbn";

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function emptyToNull(value: string) {
  return value ? value : null;
}

function parseAuthors(value: string) {
  return value
    .split(",")
    .map((author) => author.trim())
    .filter(Boolean);
}

function parseIsbn(value: string) {
  if (!value) {
    return {
      isbn10: null,
      isbn13: null,
    };
  }

  const validation = validateIsbn(value);

  if (!validation.normalized || !validation.isValid) {
    throw new Error("Enter a valid ISBN-10 or ISBN-13, or leave the field blank.");
  }

  return {
    isbn10: validation.kind === "isbn10" ? validation.normalized : null,
    isbn13: validation.kind === "isbn13" ? validation.normalized : null,
  };
}

function parseBookInput(formData: FormData) {
  const title = getStringValue(formData, "title");
  const authors = parseAuthors(getStringValue(formData, "authors"));

  if (!title) {
    throw new Error("Title is required.");
  }

  const parsedIsbn = parseIsbn(getStringValue(formData, "isbn"));
  const metadataIsbn10 = emptyToNull(getStringValue(formData, "metadataIsbn10"));
  const metadataIsbn13 = emptyToNull(getStringValue(formData, "metadataIsbn13"));

  return {
    title,
    subtitle: emptyToNull(getStringValue(formData, "subtitle")),
    authors: JSON.stringify(authors),
    isbn10: parsedIsbn.isbn10 ?? metadataIsbn10,
    isbn13: parsedIsbn.isbn13 ?? metadataIsbn13,
    publishedDate: emptyToNull(getStringValue(formData, "publishedDate")),
    coverUrl: emptyToNull(getStringValue(formData, "coverUrl")),
    ownedFormat: getStringValue(formData, "ownedFormat") || "physical",
    readingStatus: getStringValue(formData, "readingStatus") || "unread",
    notes: emptyToNull(getStringValue(formData, "notes")),
    lookupSource: emptyToNull(getStringValue(formData, "lookupSource")),
  };
}

function getPrismaErrorMessage(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return "That ISBN already exists in your library.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong while saving the book.";
}

function isRedirectControlFlow(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.startsWith("NEXT_REDIRECT")
  );
}

export async function createBook(
  _previousState: BookFormState,
  formData: FormData,
): Promise<BookFormState> {
  try {
    const data = parseBookInput(formData);

    const book = await db.book.create({
      data,
    });

    revalidatePath("/");
    redirect(`/books/${book.id}`);
  } catch (error) {
    if (isRedirectControlFlow(error)) {
      throw error;
    }

    return {
      error: getPrismaErrorMessage(error),
    };
  }
}

export async function updateBook(
  id: string,
  _previousState: BookFormState,
  formData: FormData,
): Promise<BookFormState> {
  try {
    const data = parseBookInput(formData);

    await db.book.update({
      where: { id },
      data,
    });

    revalidatePath("/");
    revalidatePath(`/books/${id}`);
    redirect(`/books/${id}`);
  } catch (error) {
    if (isRedirectControlFlow(error)) {
      throw error;
    }

    return {
      error: getPrismaErrorMessage(error),
    };
  }
}

export async function deleteBook(id: string) {
  await db.book.delete({
    where: { id },
  });

  revalidatePath("/");
  redirect("/");
}
