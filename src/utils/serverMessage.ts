/** El mensaje del servidor tal cual (class-validator lo manda como lista). */
export function serverMessage(err: any, fallback: string): string {
  const m = err?.response?.data?.message;
  if (Array.isArray(m)) return m.join('. ');
  return typeof m === 'string' && m ? m : fallback;
}
