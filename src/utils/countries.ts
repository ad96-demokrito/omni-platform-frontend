/** Countries offered at signup / billing. The country decides the billing currency (India -> INR, otherwise USD). */
export const COUNTRY_CODES = [
  'IN', 'US', 'GB', 'AE', 'SA', 'SG', 'AU', 'CA', 'DE', 'FR', 'NL', 'ES', 'IT', 'IE', 'SE', 'CH',
  'BD', 'LK', 'NP', 'PK', 'ID', 'MY', 'TH', 'VN', 'PH', 'JP', 'KR', 'HK', 'NZ',
  'BR', 'MX', 'AR', 'CO', 'CL', 'PE',
  'NG', 'KE', 'GH', 'ZA', 'EG', 'MA',
  'QA', 'KW', 'OM', 'BH', 'JO', 'TR', 'IL',
  'PL', 'PT', 'BE', 'AT', 'DK', 'NO', 'FI', 'CZ', 'RO', 'GR', 'UA',
] as const;

/** Display name of a country in English; falls back to the code if the browser cannot name it. */
export function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Options sorted by name, with India first (the home market). */
export function countryOptions(): Array<{ code: string; name: string }> {
  const options = COUNTRY_CODES.map((code) => ({ code, name: countryName(code) }));
  options.sort((a, b) => (a.code === 'IN' ? -1 : b.code === 'IN' ? 1 : a.name.localeCompare(b.name)));
  return options;
}
