import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteBook, updateBook } from "@/app/books/actions";
import { BookForm } from "@/components/book-form";
import { getAllTags, getBookById } from "@/lib/queries";
import { parseBookTags } from "@/lib/tags";

type BookPageProps = {
  params: Promise<{ id: string }>;
};

export default async function BookPage({ params }: BookPageProps) {
  const { id } = await params;
  const book = await getBookById(id);

  if (!book) {
    notFound();
  }

  const tagSuggestions = await getAllTags();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10 md:px-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">
            Book details
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-stone-950">
            {book.title}
          </h1>
        </div>

        <Link
          href="/"
          className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700"
        >
          Back to library
        </Link>
      </div>

      <BookForm
        mode="edit"
        action={updateBook.bind(null, book.id)}
        deleteAction={deleteBook.bind(null, book.id)}
        initialValues={{
          title: book.title,
          subtitle: book.subtitle,
          authors: JSON.parse(book.authors) as string[],
          isbn13: book.isbn13,
          isbn10: book.isbn10,
          publishedDate: book.publishedDate,
          coverUrl: book.coverUrl,
          ownedFormat: book.ownedFormat,
          readingStatus: book.readingStatus,
          notes: book.notes,
          lookupSource: book.lookupSource,
          tags: parseBookTags(book.tags),
        }}
        tagSuggestions={tagSuggestions}
      />
    </main>
  );
}
