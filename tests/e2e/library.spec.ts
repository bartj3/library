import { expect, test } from "@playwright/test";

function buildUniqueIsbn13() {
  const base = `978${Date.now().toString().slice(-9)}`;
  const sum = base.split("").reduce((total, digit, index) => {
    const value = Number(digit);
    return total + value * (index % 2 === 0 ? 1 : 3);
  }, 0);
  const checkDigit = (10 - (sum % 10)) % 10;

  return `${base}${checkDigit}`;
}

test("can create, update, and delete a book", async ({ page }) => {
  const title = `The Left Hand of Darkness ${Date.now()}`;

  await page.goto("/books/new");

  await page.locator("#title").fill(title);
  await page.locator("#authors").fill("Ursula K. Le Guin");
  await page.locator("#publishedDate").fill("1969");
  await page.locator("#ownedFormat").selectOption("ebook");
  await page.locator("#readingStatus").selectOption("read");
  await page.locator("#notes").fill("Playwright smoke test");

  await page.getByRole("button", { name: "Save book" }).click();

  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.locator("#readingStatus").selectOption("reading");
  await page.locator("#notes").fill("Updated by Playwright");
  await page.getByRole("button", { name: "Update book" }).click();

  await expect(page.locator("#notes")).toHaveValue("Updated by Playwright");
  await expect(page.locator("#readingStatus")).toHaveValue("reading");

  await page.getByRole("link", { name: "Back to library" }).click();
  await expect(page.getByText(title)).toBeVisible();

  await page.locator("a").filter({ hasText: title }).click();
  await page.getByRole("button", { name: "Delete book" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByText(title)).not.toBeVisible();
});

test("can prefill form fields from ISBN lookup", async ({ page }) => {
  await page.route("**/api/isbn-lookup", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        title: "A Wizard of Earthsea",
        subtitle: "The Earthsea Cycle",
        authors: ["Ursula K. Le Guin"],
        publishedDate: "1968",
        coverUrl: "https://example.com/earthsea.jpg",
        lookupSource: "openlibrary",
        isbn10: "0547773749",
        isbn13: "9780547773742",
      }),
    });
  });

  await page.goto("/books/new");

  await page.locator("#isbn").fill("9780547773742");
  await page.getByRole("button", { name: "Fetch details" }).click();

  await expect(page.locator("#title")).toHaveValue("A Wizard of Earthsea");
  await expect(page.locator("#subtitle")).toHaveValue("The Earthsea Cycle");
  await expect(page.locator("#authors")).toHaveValue("Ursula K. Le Guin");
  await expect(page.locator("#publishedDate")).toHaveValue("1968");
  await expect(page.locator("#coverUrl")).toHaveValue("https://example.com/earthsea.jpg");
  await expect(page.getByText("Metadata loaded from openlibrary.")).toBeVisible();
});

test("shows a validation error for an invalid ISBN on save", async ({ page }) => {
  await page.goto("/books/new");

  await page.locator("#title").fill(`Invalid ISBN ${Date.now()}`);
  await page.locator("#isbn").fill("123");
  await page.getByRole("button", { name: "Save book" }).click();

  await expect(
    page.getByText("Enter a valid ISBN-10 or ISBN-13, or leave the field blank."),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/books\/new$/);
});

test("shows a validation error for duplicate ISBNs", async ({ page }) => {
  const isbn = buildUniqueIsbn13();
  const firstTitle = `Duplicate ISBN A ${Date.now()}`;
  const secondTitle = `Duplicate ISBN B ${Date.now()}`;

  await page.goto("/books/new");
  await page.locator("#title").fill(firstTitle);
  await page.locator("#isbn").fill(isbn);
  await page.getByRole("button", { name: "Save book" }).click();

  await expect(page.getByRole("heading", { name: firstTitle })).toBeVisible();

  await page.goto("/books/new");
  await page.locator("#title").fill(secondTitle);
  await page.locator("#isbn").fill(isbn);
  await page.getByRole("button", { name: "Save book" }).click();

  await expect(page.getByText("That ISBN already exists in your library.")).toBeVisible();
  await expect(page).toHaveURL(/\/books\/new$/);
});

test("can search and filter the library list", async ({ page }) => {
  const prefix = `Library Filters ${Date.now()}`;

  await page.goto("/books/new");
  await page.locator("#title").fill(`${prefix} Alpha`);
  await page.locator("#authors").fill("Filter Author");
  await page.locator("#ownedFormat").selectOption("physical");
  await page.locator("#readingStatus").selectOption("unread");
  await page.getByRole("button", { name: "Save book" }).click();

  await page.goto("/books/new");
  await page.locator("#title").fill(`${prefix} Beta`);
  await page.locator("#authors").fill("Filter Author");
  await page.locator("#ownedFormat").selectOption("ebook");
  await page.locator("#readingStatus").selectOption("read");
  await page.getByRole("button", { name: "Save book" }).click();

  await page.goto("/books/new");
  await page.locator("#title").fill(`${prefix} Gamma`);
  await page.locator("#authors").fill("Filter Author");
  await page.locator("#ownedFormat").selectOption("both");
  await page.locator("#readingStatus").selectOption("read");
  await page.getByRole("button", { name: "Save book" }).click();

  await page.goto("/");
  await page.locator("#search").fill(prefix);
  await page.locator("#owned-format").selectOption("ebook");
  await page.locator("#reading-status").selectOption("read");
  await page.locator("#sort").selectOption("title-asc");
  await page.getByRole("button", { name: "Apply filters" }).click();

  await expect(page.getByText(`${prefix} Beta`)).toBeVisible();
  // Books owned in both formats count as ebooks (and as physical books).
  await expect(page.getByText(`${prefix} Gamma`)).toBeVisible();
  await expect(page.getByText(`${prefix} Alpha`)).not.toBeVisible();

  await page.locator("#owned-format").selectOption("both");
  await page.getByRole("button", { name: "Apply filters" }).click();

  await expect(page.getByText(`${prefix} Gamma`)).toBeVisible();
  await expect(page.getByText(`${prefix} Beta`)).not.toBeVisible();
});

test("tags books and filters the library by tag", async ({ page }) => {
  const prefix = `Tagged ${Date.now()}`;

  await page.goto("/books/new");
  await page.locator("#title").fill(`${prefix} Cookbook`);
  await page.locator("#authors").fill("Tag Author");
  await page.locator("#tags").fill("cooking, dutch");
  await page.getByRole("button", { name: "Save book" }).click();
  await expect(page.getByRole("heading", { name: `${prefix} Cookbook` })).toBeVisible();

  await page.goto("/books/new");
  await page.locator("#title").fill(`${prefix} Novel`);
  await page.locator("#authors").fill("Tag Author");
  await page.getByRole("button", { name: "Save book" }).click();
  await expect(page.getByRole("heading", { name: `${prefix} Novel` })).toBeVisible();

  await page.goto("/");
  await page.locator("#search").fill(prefix);
  await page.locator("#tag").selectOption("cooking");
  await page.getByRole("button", { name: "Apply filters" }).click();

  await expect(page.getByText(`${prefix} Cookbook`)).toBeVisible();
  await expect(page.getByText(`${prefix} Novel`)).not.toBeVisible();
});

test("applies batch tags during bulk import", async ({ page }) => {
  await page.goto("/import");
  await page.locator("#import-tags").fill("batch-test");
  await page.locator("#isbnList").fill("9785555555564");
  await page.getByRole("button", { name: "Import books" }).click();
  await expect(page.getByText("Imported 1 of 1 rows")).toBeVisible();

  await page.goto("/");
  await page.locator("#tag").selectOption("batch-test");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText("Unknown title (9785555555564)")).toBeVisible();
});

test("shows per-row results for bulk ISBN import issues", async ({ page }) => {
  const existingIsbn = buildUniqueIsbn13();
  const title = `Existing import duplicate ${Date.now()}`;

  await page.goto("/books/new");
  await page.locator("#title").fill(title);
  await page.locator("#isbn").fill(existingIsbn);
  await page.getByRole("button", { name: "Save book" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.goto("/import");
  await page.locator("#isbnList").fill(`isbn\n${existingIsbn}\n123\n${existingIsbn}`);
  await page.getByRole("button", { name: "Import books" }).click();

  await expect(page.getByText("Imported 0 of 3 rows")).toBeVisible();
  await expect(page.getByText("Already exists in your library.")).toBeVisible();
  await expect(page.getByText("Invalid ISBN.")).toBeVisible();
  await expect(page.getByText("Duplicate ISBN in this import batch.")).toBeVisible();
});

test("can bulk import valid ISBN rows and add them to the library", async ({ page }) => {
  await page.goto("/import");
  await page.locator("#import-owned-format").selectOption("both");
  await page.locator("#import-reading-status").selectOption("reading");
  await page
    .locator("#isbnList")
    .fill("9781111111113\n9782222222224");

  await page.getByRole("button", { name: "Import books" }).click();

  await expect(page.getByText("Imported 2 of 2 rows")).toBeVisible();
  await expect(page.getByText("Bulk Import Alpha")).toBeVisible();
  await expect(page.getByText("Bulk Import Beta")).toBeVisible();

  await page.goto("/");
  await page.locator("#search").fill("Bulk Import");
  await page.getByRole("button", { name: "Apply filters" }).click();

  await expect(page.getByText("Bulk Import Alpha")).toBeVisible();
  await expect(page.getByText("Bulk Import Beta")).toBeVisible();
  await expect(page.getByText("Import Author One")).toBeVisible();
  await expect(page.getByText("Import Author Two")).toBeVisible();
});

test("imports a valid ISBN without metadata as an ISBN-only book", async ({ page }) => {
  await page.goto("/import");
  await page.locator("#isbnList").fill("9785555555557");
  await page.getByRole("button", { name: "Import books" }).click();

  await expect(page.getByText("Imported 1 of 1 rows")).toBeVisible();
  await expect(
    page.getByText("No metadata found — imported with ISBN only."),
  ).toBeVisible();

  await page.goto("/");
  await page.locator("#search").fill("9785555555557");
  await page.getByRole("button", { name: "Apply filters" }).click();

  await expect(page.getByText("Unknown title (9785555555557)")).toBeVisible();
  await expect(page.getByText("Unknown author")).toBeVisible();
});

test("can import ISBNs from an uploaded csv file", async ({ page }) => {
  await page.goto("/import");

  await page.locator("#import-file").setInputFiles({
    name: "books.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("isbn\n9783333333335\n9784444444446\n"),
  });

  await expect(page.locator("#isbnList")).toHaveValue(
    "isbn\n9783333333335\n9784444444446\n",
  );

  await page.getByRole("button", { name: "Import books" }).click();

  await expect(page.getByText("Imported 2 of 2 rows")).toBeVisible();
  await expect(page.getByText("Bulk Import Gamma")).toBeVisible();
  await expect(page.getByText("Bulk Import Delta")).toBeVisible();
});
