export function parseTagsInput(value: string) {
  return [...new Set(
    value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
  )];
}

export function parseBookTags(serialized: string | undefined | null) {
  if (!serialized) {
    return [];
  }

  try {
    const parsed = JSON.parse(serialized) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}
