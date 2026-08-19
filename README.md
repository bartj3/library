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
- scan book barcodes with a phone or webcam at `/scan`
- search, filter, and sort your library
- tag books (comma-separated, autocompleted) and filter by tag; imports and scans can tag a whole batch
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

### Barcode scanning from a phone

Browsers only allow camera access over HTTPS (or on `localhost`), and Chrome refuses the camera entirely on pages with certificate errors — clicking through the warning is not enough. Set up a locally trusted certificate once with [mkcert](https://github.com/FiloSottile/mkcert):

```bash
mkcert -install
mkcert -key-file certificates/localhost-key.pem -cert-file certificates/localhost.pem localhost 127.0.0.1 ::1 <your-machine-ip>
```

On the phone, download the mkcert root certificate (`mkcert -CAROOT`, also served at `/rootCA.pem` if you copy it into `public/`) and install it via Android's *Install a CA certificate* setting.

Then build and serve production over HTTPS:

```bash
npm run build
npm run start:https
```

Open `https://<your-machine-ip>:3000/scan` on the phone. Scanning uses the native `BarcodeDetector` API where available and falls back to a WASM decoder elsewhere.

> **Warning**: Next.js dev mode blocks cross-origin requests to dev assets, so opening the dev server via the LAN IP (as a phone must) renders pages whose buttons silently do nothing — no errors anywhere ([vercel/next.js#91908](https://github.com/vercel/next.js/issues/91908)). This cost an evening to figure out. `next.config.ts` allows the `192.168.*.*` range via `allowedDevOrigins` (a bare `*` is rejected by Next) — adjust it if your LAN uses `10.x` or `172.16-31.x` addresses. The production server (`npm run start:https`) is unaffected.

## Data Storage

The app stores the library in `data/library.json`. The file is created automatically (as an empty library) on first run.

The `data/` directory is gitignored by this repo so your personal collection never ends up in a public fork. It is still meant to be version controlled — just separately: initialize a git repo inside `data/` and push it to a private remote.

```bash
cd data
git init -b main
printf '*.tmp\n' > .gitignore
git add library.json .gitignore
git commit -m "Initial library snapshot"
gh repo create <you>/library-data --private --source=. --push
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
- The library datastore is a JSON file, not a database.
- Metadata lookup depends on external book APIs.
- Google Books rejects anonymous API requests from many networks (HTTP 429 with a daily quota of 0). Set `GOOGLE_BOOKS_API_KEY` in `.env.local` with a [Google Cloud API key](https://console.cloud.google.com/apis/credentials) to make the Google Books fallback reliable.
- Bulk import is intended for convenience, not for perfectly clean data ingestion.
- There is no authentication, authorization, or security review.
- If you expose this app beyond your own machine, that is your responsibility.

## License

This project is released under the Unlicense. See [UNLICENSE](/home/bart/Development/Other/library/UNLICENSE).
