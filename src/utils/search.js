export function normalizeSearchValue(value) {
  const text = String(value ?? "");
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function includesSearchValue(value, query) {
  return normalizeSearchValue(value).includes(normalizeSearchValue(query));
}
