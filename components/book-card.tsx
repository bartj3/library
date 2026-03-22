type BookCardProps = {
  title: string;
  authors: string[];
  publishedDate?: string | null;
  coverUrl?: string | null;
  ownedFormat: string;
  readingStatus: string;
};

export function BookCard({
  title,
  authors,
  publishedDate,
  coverUrl,
  ownedFormat,
  readingStatus,
}: BookCardProps) {
  return (
    <article className="grid gap-4 rounded-[28px] border border-stone-200 bg-white p-4 shadow-[0_20px_60px_rgba(76,58,38,0.08)]">
      <div className="aspect-[3/4] overflow-hidden rounded-[20px] bg-stone-100">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#f4ecde,#e4d4ba)] text-sm uppercase tracking-[0.25em] text-stone-500">
            No Cover
          </div>
        )}
      </div>

      <div className="grid gap-2">
        <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
          <span className="rounded-full bg-stone-100 px-3 py-1">{ownedFormat}</span>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">
            {readingStatus}
          </span>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
          <p className="text-sm text-stone-600">{authors.join(", ") || "Unknown author"}</p>
        </div>

        <p className="text-sm text-stone-500">{publishedDate ?? "Unknown publication date"}</p>
      </div>
    </article>
  );
}
