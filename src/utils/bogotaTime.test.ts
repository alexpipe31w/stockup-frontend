import { isoToBogotaInput, bogotaInputToIso, bogotaInputToDate, bogotaDayStartIso, bogotaDayEndExclusiveIso, lastIncludedBogotaDay, bogotaDay } from './bogotaTime';

describe('bogotaTime (C-1: editar una cita no la mueve)', () => {
  it('muestra la hora de Colombia, no la UTC', () => {
    // 15:00 UTC = 10:00 en Bogotá
    expect(isoToBogotaInput('2026-11-20T15:00:00.000Z')).toBe('2026-11-20T10:00');
  });

  it('cruza el día hacia atrás cuando toca', () => {
    // 02:30 UTC del 21 = 21:30 del 20 en Bogotá
    expect(isoToBogotaInput('2026-11-21T02:30:00.000Z')).toBe('2026-11-20T21:30');
  });

  it('ida y vuelta deja la misma hora (antes sumaba +5 h en cada guardado)', () => {
    const iso = '2026-11-20T15:00:00.000Z';
    expect(bogotaInputToIso(isoToBogotaInput(iso))).toBe(iso);
  });

  it('lee el input como hora de Colombia sea cual sea la zona del navegador', () => {
    expect(bogotaInputToDate('2026-11-20T10:00').toISOString()).toBe('2026-11-20T15:00:00.000Z');
  });

  it('vacío o inválido devuelve cadena vacía', () => {
    expect(isoToBogotaInput(null)).toBe('');
    expect(isoToBogotaInput('no-es-fecha')).toBe('');
  });
});

describe('rangos de días de promociones (C-7: "Hasta" incluye el día)', () => {
  it('el fin es la medianoche SIGUIENTE en Colombia', () => {
    expect(bogotaDayEndExclusiveIso('2026-11-30')).toBe('2026-12-01T05:00:00.000Z');
    expect(bogotaDayStartIso('2026-11-30')).toBe('2026-11-30T05:00:00.000Z');
  });

  it('una promo de un solo día tiene inicio < fin', () => {
    expect(bogotaDayStartIso('2026-11-30') < bogotaDayEndExclusiveIso('2026-11-30')).toBe(true);
  });

  it('la lista muestra el último día incluido, no el siguiente', () => {
    expect(lastIncludedBogotaDay(bogotaDayEndExclusiveIso('2026-11-30'))).toBe('2026-11-30');
    expect(lastIncludedBogotaDay('2026-12-31T05:00:00.000Z')).toBe('2026-12-30');
    expect(bogotaDay(bogotaDayStartIso('2026-01-01'))).toBe('2026-01-01');
  });
});
