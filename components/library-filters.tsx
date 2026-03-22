import Link from "next/link";

const ownedFormats = ["all", "physical", "ebook", "both"];
const readingStatuses = ["all", "unread", "reading", "read"];
const sortOptions = [
  { value: "recent", label: "Recently added" },
  { value: "title-asc", label: "Title A-Z" },
  { value: "title-desc", label: "Title Z-A" },
];

type LibraryFiltersProps = {
  search: string;
  ownedFormat: string;
  readingStatus: string;
  sort: string;
};

export function LibraryFilters({
  search,
  ownedFormat,
  readingStatus,
  sort,
}: LibraryFiltersProps) {
  return (
    <form className="grid gap-4 rounded-[28px] border border-stone-200 bg-white/80 p-5 shadow-[0_20px_60px_rgba(76,58,38,0.08)] backdrop-blur">
      <div className="grid gap-2">
        <label className="text-sm font-medium text-stone-700" htmlFor="search">
          Search
        </label>
        <input
          id="search"
          name="search"
          defaultValue={search}
          placeholder="Title, author, or ISBN"
          className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-stone-700" htmlFor="owned-format">
            Ownership
          </label>
          <select
            id="owned-format"
            name="ownedFormat"
            defaultValue={ownedFormat}
            className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none"
          >
            {ownedFormats.map((format) => (
              <option key={format} value={format}>
                {format}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium text-stone-700" htmlFor="reading-status">
            Reading status
          </label>
          <select
            id="reading-status"
            name="readingStatus"
            defaultValue={readingStatus}
            className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none"
          >
            {readingStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium text-stone-700" htmlFor="sort">
            Sort
          </label>
          <select
            id="sort"
            name="sort"
            defaultValue={sort}
            className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className="rounded-2xl bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50"
        >
          Apply filters
        </button>
        <Link
          href="/"
          className="rounded-2xl border border-stone-200 px-5 py-3 text-sm font-medium text-stone-700"
        >
          Clear
        </Link>
      </div>
    </form>
  );
}
