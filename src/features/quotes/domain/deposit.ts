/** Pourcentages d'acompte proposés à l'envoi (maquette « Mon entreprise » : 20 à 50 %). 0 = pas d'acompte. */
export const DEPOSIT_OPTIONS: readonly number[] = [0, 20, 30, 40, 50];
export const DEFAULT_DEPOSIT_PERCENT = 30;

export function isDepositPercent(value: number): boolean {
  return DEPOSIT_OPTIONS.includes(value);
}

/** Acompte en centimes, arrondi comme en SQL : round(ttc × % / 100). */
export function depositCents(ttcCents: number, percent: number): number {
  return Math.floor((ttcCents * percent + 50) / 100);
}
