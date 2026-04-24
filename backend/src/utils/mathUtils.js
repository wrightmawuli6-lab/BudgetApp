export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function toMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}