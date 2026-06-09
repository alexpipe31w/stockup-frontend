import { useScrollReveal } from '../hooks/useScrollReveal';
import GradientOrbs from '../components/landing/GradientOrbs';
import WhatsAppIcon from '../components/landing/WhatsAppIcon';
import { Clock } from 'lucide-react';

const WA_LINK = 'https://wa.me/573142378407?text=Hola%20Alex%2C%20me%20interesa%20Stockup%20Messages%20para%20mi%20negocio%20%F0%9F%9A%80';

export default function CtaFinalSection() {
  const contentRef = useScrollReveal<HTMLDivElement>();

  return (
    <section id="contact" className="relative py-24 lg:py-32 bg-stockup-bg border-y border-white/[0.06] overflow-hidden">
      <GradientOrbs />
      <div className="container-stockup relative z-10">
        <div ref={contentRef} className="text-center max-w-2xl mx-auto opacity-0">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight mb-6">
            ¿Listo para que tu negocio trabaje solo?
          </h2>
          <p className="text-lg text-white/55 mb-10 leading-relaxed">
            Escríbeme por WhatsApp y en menos de 24 horas tu bot está activo.
          </p>
          <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="btn-primary text-base sm:text-[17px] px-9 py-5 rounded-xl inline-flex">
            <WhatsAppIcon className="w-5 h-5 relative z-10" />
            <span className="relative z-10">Hablar con Alex ahora</span>
          </a>
          <div className="flex items-center justify-center gap-2 mt-6">
            <Clock className="w-4 h-4 text-white/40" />
            <span className="text-white/40 text-[13px]">Respuesta garantizada en menos de 1 hora</span>
          </div>
        </div>
      </div>
    </section>
  );
}
