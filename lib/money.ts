/** Formats integer minor units (e.g. cents) as a display string, e.g.
 * formatMinorUnits(450, "USD") -> "$4.50". Never does money arithmetic —
 * purely presentational, using Intl.NumberFormat which handles the
 * minor-unit-to-major-unit conversion correctly per currency (not every
 * currency has exactly 2 minor-unit digits). */
export function formatMinorUnits(amountMinor: number, currency: string): string {
  const major = amountMinor / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(major);
  } catch {
    return `${major.toFixed(2)} ${currency}`;
  }
}
