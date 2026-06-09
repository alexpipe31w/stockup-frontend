import { useState, useRef, useEffect } from 'react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import SectionHeader from '../components/landing/SectionHeader';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  { q: '¿Funciona con mi número de WhatsApp actual?',       a: 'Sí. Conectas tu número existente escaneando un código QR. No necesitas un número nuevo ni cambiar nada.' },
  { q: '¿Qué pasa si un cliente pregunta algo que el bot no sabe?', a: 'El bot avisa que pasará la conversación a una persona y te notifica. Puedes tomar el chat manualmente cuando quieras.' },
  { q: '¿Puedo cancelar en cualquier momento?',             a: 'Sí, sin penalidades ni contratos largos. Cancelas cuando quieras con un simple mensaje.' },
  { q: '¿Mis datos y los de mis clientes están seguros?',   a: 'Totalmente. Servidores seguros, datos nunca compartidos con terceros. Cumplimos la Ley 1581 de 2012 de Colombia.' },
];

function FaqItem({ faq, isOpen, onToggle }: { faq: { q: string; a: string }; isOpen: boolean; onToggle: () => void }) {
  const answerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  useEffect(() => { if (answerRef.current) setHeight(answerRef.current.scrollHeight); }, []);

  return (
    <div className="border-b border-white/[0.06]">
      <button onClick={onToggle} className="w-full flex items-center justify-between py-6 text-left group">
        <span className={`text-base sm:text-[17px] font-semibold pr-4 transition-colors duration-200 ${isOpen ? 'text-stockup-lime' : 'text-white group-hover:text-white/80'}`}>
          {faq.q}
        </span>
        <ChevronDown className={`w-4 h-4 text-white/40 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: isOpen ? height : 0, opacity: isOpen ? 1 : 0 }}>
        <div ref={answerRef} className="pb-6">
          <p className="text-white/55 text-base leading-relaxed">{faq.a}</p>
        </div>
      </div>
    </div>
  );
}

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const containerRef = useScrollReveal<HTMLDivElement>();

  return (
    <section className="py-20 lg:py-28 bg-stockup-secondary">
      <div className="container-stockup">
        <SectionHeader label="FAQ" title="Preguntas frecuentes" />
        <div ref={containerRef} className="max-w-[720px] mx-auto opacity-0">
          {FAQS.map((faq, i) => (
            <FaqItem key={i} faq={faq} isOpen={openIndex === i} onToggle={() => setOpenIndex(openIndex === i ? null : i)} />
          ))}
        </div>
      </div>
    </section>
  );
}
