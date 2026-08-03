export function formatNumber(
  value: string | number,
  maximumFractionDigits = 2,
  locale = "ru-RU",
): string {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return String(value);
  }
  return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(parsed);
}
