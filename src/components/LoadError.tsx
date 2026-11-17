// Pantalla para cuando la carga inicial de un formulario falla. Sustituye al formulario:
// mostrar valores por defecto con "Guardar" habilitado pisaría la configuración real.
export default function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="bg-surface rounded-2xl border border-border-subtle p-6 text-center space-y-3">
      <p className="text-sm text-txt-primary font-medium">{message}</p>
      <p className="text-xs text-txt-tertiary">
        No se muestra el formulario para no guardar valores por defecto encima de los tuyos.
      </p>
      <button type="button" onClick={onRetry}
        className="px-4 py-2 rounded-xl text-sm font-semibold bg-lime text-black hover:opacity-90 transition">
        Reintentar
      </button>
    </div>
  );
}
