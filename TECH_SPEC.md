# Book Library App Tech Spec

## Goal

Build a personal local-first web app to track owned books. The app should support physical books, ebooks, or both, and allow the user to record whether a book is unread, currently being read, or already read.

The app is intended for a single user on a local machine. Technical simplicity is the primary constraint.

## Product Scope

### Core Use Cases

1. Add a book manually.
2. Add a book by ISBN and fetch metadata automatically.
3. Edit a saved book later.
4. Browse the library.
5. Search and filter the library.
6. Mark a book as unread, reading, or read.
7. Mark ownership as physical, ebook, or both.

### Explicit Product Decisions

- The app is local-only.
- There is no authentication.
- The library is stored in a local JSON file.
- A book may be saved without an ISBN.
- Duplicate titles are allowed.
- Different ISBNs are treated as distinct records.
- Ownership is `physical`, `ebook`, or `both`.
- Reading state is `unread`, `reading`, or `read`.
- ISBN lookup never saves automatically; user confirmation is required.
- Manual editing is always available, including when metadata lookup is incomplete.

### Out of Scope for V1

- Multi-user support
- Cloud sync
- Lending tracking
- Purchase history
- Multiple copies per edition
- Tags, shelves, or reviews
- Export

## Technical Stack

- Next.js with App Router
- TypeScript
- Node.js file-backed JSON datastore
- Route handlers or server actions for writes and metadata lookup
- Minimal styling without a heavy component library in the first pass

## Architecture

This is a single-project local web app.

- Next.js provides the UI and local server routes.
- Server-side code reads and writes a local JSON file.
- External metadata lookup happens server-side via third-party book APIs.

No separate backend service should be introduced for V1.

## Data Model

V1 uses a single `Book` record shape stored in a JSON array.

### Book Fields

- `id`: unique identifier
- `isbn13`: optional unique ISBN-13
- `isbn10`: optional unique ISBN-10
- `title`: required
- `subtitle`: optional
- `authors`: required serialized list of author names
- `publishedDate`: optional string
- `coverUrl`: optional string
- `ownedFormat`: required enum-like string
- `readingStatus`: required enum-like string
- `notes`: optional free text
- `lookupSource`: optional string showing which metadata source was used
- `createdAt`: timestamp
- `updatedAt`: timestamp

### Data Modeling Notes

- `authors` should be stored as a serialized JSON array in V1.
- `publishedDate` should remain a string because upstream APIs may return year-only or partial dates.
- Separate author or edition tables are intentionally deferred.

## Routes and Pages

### Pages

- `/`: library list page
- `/books/new`: add-book page
- `/books/[id]`: detail and edit page
- `/import`: bulk import from pasted ISBNs or CSV/text files (post-V1)
- `/scan`: camera barcode scanning into the import flow (post-V1)

### API / Server Endpoints

- `/api/isbn-lookup`: accepts an ISBN, normalizes it, performs metadata lookup, and returns a normalized payload

## Library Page Requirements

The library page must support:

- Listing all books
- Showing cover thumbnails when available
- Searching by title, author, or ISBN
- Filtering by ownership format
- Filtering by reading status
- Sorting by title and recently added

## Add and Edit Flow

### Manual Entry

The form must allow manual creation of a record without ISBN lookup.

### ISBN Lookup Flow

1. User enters an ISBN.
2. App normalizes and validates the input.
3. App queries metadata sources server-side.
4. App returns a normalized response.
5. Form fields are prefilled.
6. User reviews or edits the values.
7. User explicitly saves the book.

### Error Handling

- Invalid ISBNs should fail early with a clear message.
- Missing metadata should not block manual entry.
- Failed lookups should leave the form usable.
- Duplicate ISBNs should be prevented or warned clearly.

## Metadata Lookup Strategy

### Primary Source

- Open Library

### Fallback Source

- Google Books

### Lookup Rules

- Normalize input before querying external APIs.
- Prefer Open Library first.
- Use Google Books only when Open Library has no usable result.
- Convert external data into one internal normalized shape.
- Do not store raw third-party payloads in the database.
- Send `GOOGLE_BOOKS_API_KEY` when configured; Google Books grants zero
  anonymous quota on many networks.
- Retry Google Books once on 5xx responses (the API is flaky).
- When a lookup finds metadata without a cover, search covers by
  title/author (Open Library search, then Google Books).

### Normalized Lookup Response

The app should map external responses into this shape:

- `title`
- `subtitle`
- `authors`
- `publishedDate`
- `coverUrl`
- `lookupSource`
- `isbn10`
- `isbn13`

## Status

All V1 milestones and acceptance criteria below are complete. Post-V1
additions so far: bulk ISBN import, camera barcode scanning, cover
lookup fallback by title, HTTPS serving for phone camera access, and a
separately version-controlled (private) library datastore.

## Milestones

### Milestone 1

- Scaffold Next.js app
- Define the JSON record shape
- Add file-backed persistence

### Milestone 2

- Build manual create, read, update, and delete flows
- Build the library list page
- Add search, filters, and sorting

### Milestone 3

- Add ISBN normalization and validation
- Add metadata lookup endpoint
- Prefill the form from lookup results

### Milestone 4

- Improve empty states, errors, and loading states
- Add cover thumbnails and polish the library UI

## Acceptance Criteria for V1

V1 is complete when:

- Books can be added manually.
- Books can be added by ISBN with metadata autofill.
- Fetched metadata can be edited before save.
- Books persist in the local JSON datastore.
- Saved books appear on the library page.
- The library page supports search and filtering.
- Each book can store ownership format and reading status.

## Initial File Layout

```text
app/
  page.tsx
  books/
    new/
      page.tsx
    [id]/
      page.tsx
  api/
    isbn-lookup/
      route.ts

components/
  book-form.tsx
  book-card.tsx
  library-filters.tsx
  search-input.tsx

lib/
  library-store.ts
  isbn.ts
  book-metadata.ts
  queries.ts

data/
  library.json
```
