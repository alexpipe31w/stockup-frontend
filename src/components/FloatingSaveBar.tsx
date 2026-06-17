import { motion, AnimatePresence } from 'framer-motion';
import { Check, Save } from 'lucide-react';

/**
 * Botón flotante de guardar que aparece solo cuando el formulario tiene
 * cambios sin guardar. Se posiciona sobre el bottom nav (z-[55] > nav z-50,
 * pero < modales z-[60]) y respeta el safe-area en móvil.
 */
export default function FloatingSaveBar({
  dirty,
  saving,
  saved,
  onSave,
  label = 'Guardar cambios',
}: {
  dirty: boolean;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
  label?: string;
}) {
  const show = dirty || saving || saved;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed z-[55] right-4 md:right-6 bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-6"
        >
          <button
            type="button"
            onClick={onSave}
            disabled={saving || saved}
            className="flex items-center gap-2 pl-4 pr-5 py-3 rounded-2xl font-semibold text-[#0A0A0F] shadow-lg shadow-black/40 transition disabled:opacity-80"
            style={{ background: 'linear-gradient(135deg, #D4FF00, #A3CC00)' }}
          >
            {saved ? <Check size={18} /> : <Save size={18} />}
            {saving ? 'Guardando...' : saved ? 'Guardado' : label}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
