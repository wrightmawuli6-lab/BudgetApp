export function parseYearMonth(value) {
  const input = value || new Date().toISOString().slice(0, 7);
  const match = /^(\d{4})-(\d{2})$/.exec(input);
  if (!match) {
    throw new Error("month must be in YYYY-MM format");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    throw new Error("month must be between 01 and 12");
  }
  return { year, month, normalized: `${year}-${String(month).padStart(2, "0")}` };
}

export function monthBounds(yearMonth) {
  const { year, month } = parseYearMonth(yearMonth);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export function daysBetween(dateA, dateB) {
  const one = new Date(dateA);
  const two = new Date(dateB);
  const diffMs = Math.abs(two.getTime() - one.getTime());
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}