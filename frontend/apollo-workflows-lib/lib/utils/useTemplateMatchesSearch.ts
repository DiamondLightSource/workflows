export function templateMatchesSearch(
  search: string,
  name: string,
  title?: string | null,
  description?: string | null,
): boolean {
  const trimmedSearch = search.trim();
  if (!trimmedSearch) {
    console.log("No search for", name);
    return true;
  }

  const upperSearch = trimmedSearch.toUpperCase();

  return [name, title, description].some(
    (field): field is string =>
      typeof field === "string" && field.toUpperCase().includes(upperSearch),
  );
}
