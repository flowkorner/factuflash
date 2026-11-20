import type { UnitDb } from '@/lib/supabase/database.types';

export type Unit = UnitDb;

export const UNITS: readonly { value: Unit; label: string }[] = [
  { value: 'u', label: 'unité' },
  { value: 'h', label: 'heure' },
  { value: 'jour', label: 'jour' },
  { value: 'forfait', label: 'forfait' },
  { value: 'm', label: 'm' },
  { value: 'm2', label: 'm²' },
  { value: 'm3', label: 'm³' },
  { value: 'kg', label: 'kg' },
  { value: 'lot', label: 'lot' },
];

const UNIT_VALUES: readonly string[] = UNITS.map((unit) => unit.value);

export function isUnit(value: string): value is Unit {
  return UNIT_VALUES.includes(value);
}

/** Libellé court après une quantité : « 2,5 h », « 12 m² ». */
export const UNIT_SHORT: Record<Unit, string> = {
  u: 'u',
  h: 'h',
  jour: 'j',
  forfait: 'forfait',
  m: 'm',
  m2: 'm²',
  m3: 'm³',
  kg: 'kg',
  lot: 'lot',
};
