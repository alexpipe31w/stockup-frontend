// Las tiendas operan en hora de Colombia (UTC-5 fijo, sin horario de verano), y así se
// muestran todas las fechas del panel. Un <input type="datetime-local"> no lleva zona:
// estas dos funciones lo leen y lo escriben siempre en hora de Colombia, sea cual sea
// la zona del navegador. Nunca uses iso.slice(0, 16): eso es hora UTC (+5 h).

const OFFSET = '-05:00';
const OFFSET_MS = 5 * 60 * 60 * 1000;

/** ISO (UTC) → "YYYY-MM-DDTHH:mm" en hora de Colombia, para un datetime-local. */
export function isoToBogotaInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Date(d.getTime() - OFFSET_MS).toISOString().slice(0, 16);
}

/** "YYYY-MM-DDTHH:mm" leído como hora de Colombia → Date. */
export function bogotaInputToDate(value: string): Date {
  return new Date(`${value}:00${OFFSET}`);
}

/** "YYYY-MM-DDTHH:mm" leído como hora de Colombia → ISO (UTC). */
export function bogotaInputToIso(value: string): string {
  return bogotaInputToDate(value).toISOString();
}
