# Book Library

Personal local-first book tracker for physical books and ebooks.

## Warning

This is a vibe coded application. Use it at your own risk.

It is intended to be run locally on your own machine. It is not designed to be secure, hardened, multi-user, or internet-facing.

Do not treat this as a production-ready application.

## What It Does

- track books you own
- store `physical`, `ebook`, or `both`
- store `unread`, `reading`, or `read`
- add books manually
- fetch metadata from ISBN
- bulk import ISBNs from pasted text or CSV/text files
- search, filter, and sort your library
- store the library itself in a versionable JSON file

## Stack

- Next.js
- React
- local JSON datastore
- Playwright

## Running Locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Data Storage

The app stores the library in `data/library.json`.

That file is intended to live alongside the codebase so you can version control the collection itself.

## Testing

Lint:

```bash
npm run lint
```

Production build:

```bash
npm run build
```

End-to-end tests:

```bash
npm run test:e2e
```

## Notes

- This app stores data locally.
- The library datastore is a JSON file, not a database.
- Metadata lookup depends on external book APIs.
- Google Books rejects anonymous API requests from many networks (HTTP 429 with a daily quota of 0). Set `GOOGLE_BOOKS_API_KEY` in `.env.local` with a [Google Cloud API key](https://console.cloud.google.com/apis/credentials) to make the Google Books fallback reliable.
- Bulk import is intended for convenience, not for perfectly clean data ingestion.
- There is no authentication, authorization, or security review.
- If you expose this app beyond your own machine, that is your responsibility.

## License

This project is released under the Unlicense. See [UNLICENSE](/home/bart/Development/Other/library/UNLICENSE).
