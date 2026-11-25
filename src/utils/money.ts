/**
 * Money formatting for billing screens. Always driven by the amount's own currency, so an Indian
 * workspace sees ₹1,499 and a US one $29 — never a hard-coded symbol.
 */

/** Locale used for digit grouping: Indian lakh grouping (1,49,990) for INR, plain en-US otherwise. */
function localeFor(currency: string): string {
  return currency.toUpperCase() === 'INR' ? 'en-IN' : 'en-US';
}

export interface FormatMoneyOptions {
  /** Drop ".00" on whole amounts (plan cards); invoices keep two decimals. */
  compact?: boolean;
}

export function formatMoney(amount: number, currency: string, options: FormatMoneyOptions = {}): string {
  const code = (currency || 'USD').toUpperCase();
  const isWhole = Number.isInteger(amount);
  const hideDecimals = options.compact && isWhole;
  try {
    return new Intl.NumberFormat(localeFor(code), {
      style: 'currency',
      currency: code,
      minimumFractionDigits: hideDecimals ? 0 : 2,
      maximumFractionDigits: hideDecimals ? 0 : 2,
    }).format(amount);
  } catch {
    // An unknown currency code must not break the page.
    return `${code} ${amount.toFixed(2)}`;
  }
}

/**
 * Preview of the tax added at checkout, for showing a breakdown BEFORE the customer commits. Rounds in whole
 * paise/cents exactly like the server; the server's figures are the ones that are charged.
 */
export function previewTax(subtotal: number, ratePercent: number): { taxAmount: number; total: number } {
  if (ratePercent <= 0 || subtotal <= 0) return { taxAmount: 0, total: subtotal };
  const subtotalMinor = Math.round(subtotal * 100);
  const taxMinor = Math.round((subtotalMinor * ratePercent) / 100);
  return { taxAmount: taxMinor / 100, total: (subtotalMinor + taxMinor) / 100 };
}

/** "-1" is the "unlimited" value used for plan limits. */
export function formatLimit(value: number): string {
  return value < 0 ? 'Unlimited' : value.toLocaleString();
}

/** Percentage saved by paying yearly instead of 12 monthly payments; 0 when there is no saving. */
export function yearlySavingsPercent(monthly: number, yearly: number): number {
  if (monthly <= 0 || yearly <= 0) return 0;
  const saving = 1 - yearly / (monthly * 12);
  return saving > 0 ? Math.round(saving * 100) : 0;
}

/**
 * Best-effort guess of the visitor's country for the signup form (a default the user can change).
 * Uses the browser's locale region, then the time zone for India; null when unknown.
 */
export function guessCountryCode(): string | null {
  try {
    const region = new Intl.Locale(navigator.language).region;
    if (region && /^[A-Z]{2}$/.test(region)) return region;
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone === 'Asia/Kolkata' || zone === 'Asia/Calcutta') return 'IN';
  } catch {
    // Locale APIs unavailable: leave the field for the user to fill in.
  }
  return null;
}
