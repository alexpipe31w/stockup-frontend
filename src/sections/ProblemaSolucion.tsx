import { useScrollReveal } from '../hooks/useScrollReveal';
import { Check } from 'lucide-react';

const BENEFICIOS = [
  'Tu bot responde al instante, 24 horas al día',
  'Registra pedidos automáticamente mientras descansas',
  'Agenda citas sin que intervengas',
  'Recibes un resumen diario de todo lo que pasó',
];

export default function ProblemaSolucion() {
  const leftRef = useScrollReveal<HTMLDivElement>();
  const rightRef = useScrollReveal<HTMLDivElement>({ delay: 0.2 });

  return (
    <section className="py-20 lg:py-28 bg-stockup-bg">
      <div className="container-stockup">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          <div ref={leftRef}>
            <span className="section-label text-white/30 block mb-4">EL PROBLEMA</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight mb-6">
              ¿Cuánto tiempo pierdes respondiendo los mismos mensajes?
            </h2>
            <div className="space-y-4 text-white/55 text-base sm:text-[17px] leading-relaxed mb-8">
              <p>Los clientes escriben de noche, fines de semana, mientras estás ocupado.</p>
              <p>Las mismas preguntas sobre el catálogo, los precios, la disponibilidad.</p>
              <p>Cada mensaje no respondido es una venta que se va con la competencia.</p>
            </div>
            <div className="hidden lg:block relative rounded-2xl overflow-hidden">
              <img src="/images/problema.jpg" alt="Persona estresada revisando mensajes" className="w-full h-64 object-cover rounded-2xl" />
              <div className="absolute inset-0 bg-gradient-to-r from-stockup-bg/60 to-transparent" />
            </div>
          </div>

          <div ref={rightRef}>
            <span className="section-label text-stockup-lime block mb-4">LA SOLUCIÓN</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight mb-6">
              Stockup Messages trabaja por ti
            </h2>
            <div className="space-y-4 mb-8">
              {BENEFICIOS.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-stockup-lime/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-stockup-lime" />
                  </div>
                  <span className="text-white/55 text-base sm:text-[17px]">{item}</span>
                </div>
              ))}
            </div>
            <div className="bg-stockup-card border border-white/[0.06] rounded-2xl p-6">
              <p className="text-stockup-lime text-base sm:text-lg font-semibold text-center leading-relaxed">
                Mientras tú duermes, tu negocio sigue vendiendo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
