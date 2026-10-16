/**
 * Convierte una descripcion que puede venir como HTML (Tiptap en StockUp, via sync)
 * en texto plano seguro. DOMParser no ejecuta scripts ni carga recursos; solo se lee
 * textContent y el resultado se pinta como texto JSX (escapado), nunca como HTML.
 */
export function plainText(html: string | null | undefined): string {
  if (!html) return '';
  if (!/[<&]/.test(html)) return html.trim();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,style').forEach(n => n.remove());
  // Separa bloques con un espacio para que "<p>a</p><p>b</p>" no quede como "ab".
  doc.querySelectorAll('p,div,br,li,h1,h2,h3,h4,h5,h6').forEach(n => n.append(' '));
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}
