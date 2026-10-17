import { Link, useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';

/** Franja fija mientras la tienda está en solo lectura por impago (la API responde 402 a los cambios). */
export default function ReadOnlyBanner() {
  const { readOnly } = useSubscription();
  const { pathname } = useLocation();
  if (!readOnly) return null;

  return (
    <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 bg-warning/10 border-b border-warning/20 text-warning text-sm">
      <Lock size={15} className="flex-shrink-0" aria-hidden="true" />
      <p className="flex-1 min-w-0">
        <strong className="font-semibold">Modo solo lectura por falta de pago.</strong>{' '}
        Puedes ver tu información, pero no hacer cambios. Si la tienda está enlazada a StockUp, renueva tu plan allí.
      </p>
      {pathname !== '/subscription' && (
        <Link to="/subscription" className="font-semibold underline underline-offset-2 whitespace-nowrap">
          Renovar plan
        </Link>
      )}
    </div>
  );
}
