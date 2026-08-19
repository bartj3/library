export type ImportRowResult = {
  input: string;
  status:
    | "imported"
    | "imported-no-metadata"
    | "invalid"
    | "duplicate-library"
    | "duplicate-input"
    | "failed";
  message: string;
};

export type ImportFormState = {
  error: string | null;
  importedCount: number;
  rows: ImportRowResult[];
};

export const initialImportFormState: ImportFormState = {
  error: null,
  importedCount: 0,
  rows: [],
};
