export type ImportRowResult = {
  input: string;
  status:
    | "imported"
    | "invalid"
    | "duplicate-library"
    | "duplicate-input"
    | "not-found"
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
