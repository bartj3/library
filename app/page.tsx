import Link from "next/link";

import { BookCard } from "@/components/book-card";
import { LibraryFilters } from "@/components/library-filters";
import { getBooks } from "@/lib/queries";

type HomeProps = {
  searchParams?: Promise<{
    search?: string;
    ownedFormat?: string;
    readingStatus?: string;
    sort?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = (await searchParams) ?? {};
  const search = params.search?.trim() ?? "";
  const ownedFormat = params.ownedFormat ?? "all";
  const readingStatus = params.readingStatus ?? "all";
  const sort = params.sort ?? "recent";
  const books = await getBooks({
    search,
    ownedFormat,
    readingStatus,
    sort,
  });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-6 py-10 md:px-10">
      <section className="grid gap-6 rounded-[36px] border border-white/60 bg-[linear-gradient(135deg,rgba(255,248,239,0.96),rgba(241,226,204,0.92))] p-8 shadow-[0_30px_120px_rgba(76,58,38,0.12)] md:grid-cols-[1.4fr_0.9fr] md:p-10">
        <div className="grid gap-4">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-stone-500">
            Personal collection
          </p>
          <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-stone-950">
            Track every book you own, whether it lives on your shelf or your
            e-reader.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-stone-600">
            This scaffold already includes the SQLite schema, Prisma client, and ISBN
            lookup route. The next implementation slice is wiring the form to create
            and update records.
          </p>
        </div>

        <div className="grid gap-4 rounded-[28px] bg-stone-950 p-6 text-stone-50">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-stone-300">
              Current snapshot
            </p>
            <p className="mt-3 text-5xl font-semibold">{books.length}</p>
            <p className="mt-2 text-sm text-stone-300">books in the current view</p>
          </div>

          <Link
            href="/books/new"
            className="inline-flex w-fit rounded-full bg-[#f0d7ae] px-5 py-3 text-sm font-semibold text-stone-950 transition-transform hover:-translate-y-0.5"
          >
            Add a single book
          </Link>

          <Link
            href="/import"
            className="inline-flex w-fit rounded-full border border-stone-700 px-5 py-3 text-sm font-semibold text-stone-100 transition-transform hover:-translate-y-0.5"
          >
            Import by ISBN list
          </Link>
        </div>
      </section>

      <LibraryFilters
        search={search}
        ownedFormat={ownedFormat}
        readingStatus={readingStatus}
        sort={sort}
      />

      {books.length === 0 ? (
        <section className="grid min-h-72 place-items-center rounded-[32px] border border-dashed border-stone-300 bg-white/65 p-8 text-center">
          <div className="grid gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">
              No matching books
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-stone-900">
              Adjust your filters or add another book to the collection.
            </h2>
            <p className="max-w-xl text-sm leading-6 text-stone-600">
              Search works across title, author text, and ISBN values, and you can
              narrow the list by format, reading status, and sort order.
            </p>
          </div>
        </section>
      ) : (
        <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {books.map((book) => (
            <Link key={book.id} href={`/books/${book.id}`}>
              <BookCard
                title={book.title}
                authors={JSON.parse(book.authors) as string[]}
                publishedDate={book.publishedDate}
                coverUrl={book.coverUrl}
                ownedFormat={book.ownedFormat}
                readingStatus={book.readingStatus}
              />
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
