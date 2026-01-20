// Session-scoped guard to reduce ID collisions within a single client run.
const generatedIds = new Set();

export function generateId(prefix) {
  let id = "";
  do {
    const timePart = Date.now().toString(36);
    const randomPart = Math.random().toString(36).slice(2, 6);
    id = `${prefix}${timePart}${randomPart}`;
  } while (generatedIds.has(id));
  generatedIds.add(id);
  return id;
}
