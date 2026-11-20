/**
 * Saisie et affichage des montants et quantités, sans virgule flottante :
 * montants en centimes, quantités en millièmes (1,5 h → 1500).
 */
const EURO_PATTERN = /^\d{1,7}(?:[.,]\d{1,2})?$/;
const QUANTITY_PATTERN = /^\d{1,6}(?:[.,]\d{1,3})?$/;

function clean(value: string): string {
  return value
    .trim()
    .replace(/[\s  ]/g, '')
    .replace(/€$/, '');
}

function toScaledInteger(value: string, decimals: number): number {
  const [whole = '0', fraction = ''] = value.replace(',', '.').split('.');
  return Number(whole) * 10 ** decimals + Number(fraction.padEnd(decimals, '0'));
}

/** "55,33" → 5533 ; "1 200" → 120000 ; invalide → null. */
export function parseEuroToCents(value: string): number | null {
  const cleaned = clean(value);
  return EURO_PATTERN.test(cleaned) ? toScaledInteger(cleaned, 2) : null;
}

/** "2,5" → 2500 ; invalide ou nul → null. */
export function parseQuantityToMilli(value: string): number | null {
  const cleaned = clean(value);
  if (!QUANTITY_PATTERN.test(cleaned)) return null;
  const milli = toScaledInteger(cleaned, 3);
  return milli > 0 ? milli : null;
}

/** 2500 → "2.5" (format attendu par Postgres). */
export function milliToDecimalString(milli: number): string {
  const whole = Math.floor(milli / 1000);
  const fraction = String(milli % 1000)
    .padStart(3, '0')
    .replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : String(whole);
}

/** 2500 → "2,5" (saisie / affichage). */
export function formatQuantity(milli: number): string {
  return milliToDecimalString(milli).replace('.', ',');
}

/** 5533 → "55,33" (valeur de champ, sans symbole). */
export function centsToInput(cents: number): string {
  const euros = Math.floor(cents / 100);
  const rest = cents % 100;
  return rest === 0 ? String(euros) : `${euros},${String(rest).padStart(2, '0')}`;
}

const EURO_FORMAT = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

/** 5533 → "55,33 €". */
export function formatCents(cents: number): string {
  return EURO_FORMAT.format(cents / 100);
}
