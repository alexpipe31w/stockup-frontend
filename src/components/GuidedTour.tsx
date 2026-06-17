import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

export interface TourStep {
  /** Selector CSS del elemento real a resaltar (ej. '[data-tour="orders-new"]'). */
  target: string;
  title: string;
  body: string;
  /** 'click' = avanza cuando el usuario toca el elemento resaltado. 'next' = solo con el botón. */
  advanceOn?: 'click' | 'next';
  padding?: number;
}

const DEFAULT_PAD = 8;
const TT_W = 300;

/**
 * Tour guiado interactivo sin dependencias externas. Oscurece la pantalla y
 * deja un "spotlight" sobre el elemento real, con un tooltip paso a paso.
 * El overlay NO captura clicks (pointer-events: none) para que el usuario
 * pueda tocar el botón resaltado y no quede atascado — pensado para clientes
 * mayores con poca experiencia tecnológica.
 */
export default function GuidedTour({
  steps,
  run,
  onFinish,
}: {
  steps: TourStep[];
  run: boolean;
  onFinish: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  const elRef = useRef<HTMLElement | null>(null);

  const step = run ? steps[idx] : null;

  // Reinicia al (re)arrancar
  useEffect(() => { if (run) setIdx(0); }, [run]);

  const finish = useCallback(() => { setRect(null); onFinish(); }, [onFinish]);

  const next = useCallback(() => {
    setIdx(i => {
      if (i + 1 >= steps.length) { onFinish(); return i; }
      return i + 1;
    });
  }, [steps.length, onFinish]);

  const prev = useCallback(() => setIdx(i => Math.max(0, i - 1)), []);

  // Localiza y mide el target continuamente (sigue modales que se abren, scroll, animaciones)
  useEffect(() => {
    if (!step) return;
    let timer = 0;
    const tick = () => {
      const el = document.querySelector<HTMLElement>(step.target);
      if (el) {
        elRef.current = el;
        setRect(el.getBoundingClientRect());
      } else {
        elRef.current = null;
        setRect(null);
      }
      timer = window.setTimeout(tick, 150);
    };
    tick();
    return () => window.clearTimeout(timer);
  }, [step]);

  // Lleva el target a la vista al cambiar de paso
  useEffect(() => {
    if (!step) return;
    const t = setTimeout(() => {
      document.querySelector<HTMLElement>(step.target)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
    return () => clearTimeout(t);
  }, [idx, step]);

  // Avance por click en el elemento resaltado
  useEffect(() => {
    if (!step || step.advanceOn !== 'click') return;
    const handler = (e: MouseEvent) => {
      const el = elRef.current;
      if (el && (el === e.target || el.contains(e.target as Node))) {
        setTimeout(() => next(), 150); // deja que el click abra el modal / haga su efecto
      }
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [step, next]);

  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, []);

  if (!run || !step) return null;

  const pad = step.padding ?? DEFAULT_PAD;
  const hole = rect && rect.width > 0
    ? { x: rect.left - pad, y: rect.top - pad, w: rect.width + pad * 2, h: rect.height + pad * 2 }
    : null;

  // Posición del tooltip: debajo del target si hay espacio, si no encima; si no hay target, centrado.
  let ttTop = vp.h / 2 - 80;
  let ttLeft = vp.w / 2 - TT_W / 2;
  if (hole) {
    const belowY = hole.y + hole.h + 14;
    ttTop = belowY + 190 < vp.h ? belowY : Math.max(14, hole.y - 14 - 190);
    ttLeft = Math.min(Math.max(12, hole.x + hole.w / 2 - TT_W / 2), vp.w - TT_W - 12);
  }
  ttTop = Math.min(Math.max(12, ttTop), vp.h - 200);

  const isLast = idx + 1 >= steps.length;

  return createPortal(
    <div className="fixed inset-0 z-[100]" style={{ pointerEvents: 'none' }}>
      {/* Overlay oscuro con spotlight (solo visual, no bloquea clics) */}
      <svg width={vp.w} height={vp.h} className="absolute inset-0" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="tour-spotlight">
            <rect x={0} y={0} width={vp.w} height={vp.h} fill="white" />
            {hole && <rect x={hole.x} y={hole.y} width={hole.w} height={hole.h} rx={12} fill="black" />}
          </mask>
        </defs>
        <rect x={0} y={0} width={vp.w} height={vp.h} fill="rgba(0,0,0,0.62)" mask="url(#tour-spotlight)" />
        {hole && (
          <rect x={hole.x} y={hole.y} width={hole.w} height={hole.h} rx={12}
            fill="none" stroke="#D4FF00" strokeWidth={2.5} />
        )}
      </svg>

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="absolute rounded-2xl bg-surface-elevated border border-border-default shadow-2xl p-4"
          style={{ top: ttTop, left: ttLeft, width: TT_W, pointerEvents: 'auto' }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-lime">Paso {idx + 1} de {steps.length}</span>
            <button onClick={finish} className="text-xs text-txt-tertiary hover:text-txt-secondary">Saltar</button>
          </div>
          <h3 className="text-sm font-bold text-txt-primary mb-1">{step.title}</h3>
          <p className="text-sm text-txt-secondary leading-snug">{step.body}</p>
          {!hole && (
            <p className="text-xs text-txt-tertiary mt-2 italic">Buscando el botón en pantalla…</p>
          )}
          <div className="flex items-center justify-end gap-2 mt-3">
            {idx > 0 && (
              <button onClick={prev}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-txt-secondary border border-border-default hover:bg-surface-overlay transition">
                Atrás
              </button>
            )}
            <button onClick={next}
              className="px-4 py-1.5 rounded-lg text-xs font-bold text-[#0A0A0F] transition"
              style={{ background: 'linear-gradient(135deg,#D4FF00,#A3CC00)' }}>
              {isLast ? '¡Listo!' : 'Siguiente'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body,
  );
}
