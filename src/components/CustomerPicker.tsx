import { useEffect, useRef, useState } from 'react';
import { searchCustomers, CustomerSearchResult } from '../services/api';
import { serverMessage } from '../utils/serverMessage';

// Selector de clientes (P-9). Busca en el servidor entre TODOS los clientes de la tienda;
// antes cada pantalla filtraba en memoria los 2000 primeros (o mostraba un <select> con todos)
// y los que quedaban fuera del tope no se encontraban.

const DEBOUNCE_MS = 250;

export default function CustomerPicker({ storeId, value, onChange, emptyHint, inputId }: {
  storeId: string;
  value: CustomerSearchResult | null;
  onChange: (c: CustomerSearchResult | null) => void;
  /** Texto cuando no hay coincidencias (p. ej. "Cambia a Nuevo para crearlo"). */
  emptyHint?: string;
  inputId?: string;
}) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<CustomerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const requestRef = useRef(0);

  useEffect(() => {
    const q = query.trim();
    const request = ++requestRef.current;
    if (!q) { setResults([]); setLoading(false); setError(''); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchCustomers(storeId, q);
        if (request === requestRef.current) { setResults(res.data); setError(''); }
      } catch (err) {
        if (request === requestRef.current) { setResults([]); setError(serverMessage(err, 'No se pudo buscar clientes.')); }
      } finally {
        if (request === requestRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, storeId]);

  if (value) {
    return (
      <div className="flex items-center justify-between bg-surface-elevated border border-border-default rounded-xl px-4 py-3">
        <div>
          <p className="font-medium text-txt-primary text-sm">{value.name ?? 'Sin nombre'}</p>
          <p className="text-xs text-txt-secondary font-mono">{value.phone}</p>
        </div>
        <button type="button" onClick={() => { onChange(null); setQuery(''); }} className="text-xs text-lime hover:underline">
          Cambiar
        </button>
      </div>
    );
  }

  const q = query.trim();
  return (
    <div className="relative">
      <input
        id={inputId}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por nombre, teléfono o cédula..."
        autoComplete="off"
        className="w-full px-4 py-2.5 text-sm border border-border-default bg-surface-elevated text-txt-primary placeholder:text-txt-tertiary rounded-xl focus:outline-none focus:ring-2 focus:ring-lime/30"
      />
      {q && results.length > 0 && (
        <div className="absolute w-full bg-surface border border-border-default rounded-xl shadow-lg mt-1 overflow-hidden z-10 max-h-72 overflow-y-auto">
          {results.map((c) => (
            <button type="button" key={c.customerId} onClick={() => { onChange(c); setQuery(''); }}
              className="w-full text-left px-4 py-2.5 hover:bg-surface-elevated transition">
              <p className="text-sm font-medium text-txt-primary">{c.name ?? 'Sin nombre'}</p>
              <p className="text-xs text-txt-tertiary font-mono">{c.phone}{c.cedula ? ` · CC ${c.cedula}` : ''}</p>
            </button>
          ))}
        </div>
      )}
      {q && loading && results.length === 0 && <p className="mt-2 text-xs text-txt-tertiary">Buscando...</p>}
      {q && error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
      {q && !loading && !error && results.length === 0 && (
        <p className="mt-2 text-xs text-txt-tertiary">Sin coincidencias.{emptyHint ? ` ${emptyHint}` : ''}</p>
      )}
    </div>
  );
}
