const ISO_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Date du jour à Paris, AAAA-MM-JJ (valeur d'un champ <input type="date">). */
export function todayIso(now: Date = new Date()): string {
  return ISO_FORMAT.format(now);
}
