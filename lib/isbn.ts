type IsbnValidationResult = {
  normalized: string | null;
  isValid: boolean;
  kind: "isbn10" | "isbn13" | null;
};

function cleanIsbn(input: string) {
  return input.replace(/[^0-9Xx]/g, "").toUpperCase();
}

function isValidIsbn10(value: string) {
  if (!/^\d{9}[\dX]$/.test(value)) {
    return false;
  }

  const sum = value.split("").reduce((total, char, index) => {
    const digit = char === "X" ? 10 : Number(char);
    return total + digit * (10 - index);
  }, 0);

  return sum % 11 === 0;
}

function isValidIsbn13(value: string) {
  if (!/^\d{13}$/.test(value)) {
    return false;
  }

  const sum = value.split("").reduce((total, char, index) => {
    const digit = Number(char);
    return total + digit * (index % 2 === 0 ? 1 : 3);
  }, 0);

  return sum % 10 === 0;
}

export function validateIsbn(input: string): IsbnValidationResult {
  const normalized = cleanIsbn(input);

  if (normalized.length === 10) {
    return {
      normalized,
      isValid: isValidIsbn10(normalized),
      kind: "isbn10",
    };
  }

  if (normalized.length === 13) {
    return {
      normalized,
      isValid: isValidIsbn13(normalized),
      kind: "isbn13",
    };
  }

  return {
    normalized: normalized || null,
    isValid: false,
    kind: null,
  };
}
