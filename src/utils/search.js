export function normalizeSearchValue(value) {
  return String(value ?? "").toLowerCase();
}

export function includesSearchValue(value, query) {
  return normalizeSearchValue(value).includes(query);
}
