import { NextResponse } from "next/server";

import { lookupBookMetadata } from "@/lib/book-metadata";
import { validateIsbn } from "@/lib/isbn";

export async function POST(request: Request) {
  const body = (await request.json()) as { isbn?: string };
  const isbn = body.isbn?.trim() ?? "";
  const validation = validateIsbn(isbn);

  if (!validation.normalized || !validation.isValid) {
    return NextResponse.json(
      { error: "Please provide a valid ISBN-10 or ISBN-13." },
      { status: 400 },
    );
  }

  const metadata = await lookupBookMetadata(validation.normalized);

  if (!metadata) {
    return NextResponse.json(
      { error: "No metadata found for that ISBN." },
      { status: 404 },
    );
  }

  return NextResponse.json(metadata);
}
