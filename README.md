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

## Stack

- Next.js
- React
- Prisma
- SQLite
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

## Database

The app uses SQLite through Prisma.

Useful commands:

```bash
npm run db:generate
npm run db:migrate
```

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
- Metadata lookup depends on external book APIs.
- Bulk import is intended for convenience, not for perfectly clean data ingestion.
- There is no authentication, authorization, or security review.
- If you expose this app beyond your own machine, that is your responsibility.

## License

This project is released under the Unlicense. See [UNLICENSE](/home/bart/Development/Other/library/UNLICENSE).
