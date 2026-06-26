import { useScrollReveal } from '../hooks/useScrollReveal';
import SectionHeader from '../components/landing/SectionHeader';
import WhatsAppIcon from '../components/landing/WhatsAppIcon';
import { Check } from 'lucide-react';

const WA_LINK = 'https://wa.me/573142378407?text=Hola%20Alex%2C%20me%20interesa%20Stockup%20Messages%20para%20mi%20negocio%20%F0%9F%9A%80';

const FEATURES_LIST = [
  'Bot de IA conectado a tu WhatsApp',
  'Registro automático de pedidos',
  'Agendamiento de citas',
  'Campañas masivas de WhatsApp',
  'Catálogo de productos y servicios',
  'CRM completo de clientes',
  'Reportes y métricas diarias',
  'Soporte directo con el desarrollador',
];

export default function PricingSection() {
  const cardRef = useScrollReveal<HTMLDivElement>();

  return (
    <section id="pricing" className="py-20 lg:py-28 bg-stockup-bg">
      <div className="container-stockup">
        <SectionHeader label="PRECIOS" title="Un precio. Sin sorpresas." subtitle="Todo incluido. Sin contratos. Cancela cuando quieras." />
        <div ref={cardRef} className="max-w-[420px] mx-auto opacity-0">
          <div className="relative bg-stockup-card border border-white/[0.08] rounded-[20px] p-8 sm:p-10 transition-all duration-400 hover:border-stockup-lime/15 hover:shadow-glow-lime-lg">
            <div className="absolute -top-0 right-0 bg-stockup-lime text-stockup-bg text-[11px] font-bold tracking-[0.08em] uppercase px-4 py-2 rounded-bl-xl rounded-tr-[20px]">
              MÁS POPULAR
            </div>
            <p className="text-center text-white/55 font-semibold text-lg mb-2">Plan Completo</p>
            <div className="text-center mb-6">
              <span className="text-5xl sm:text-[56px] font-black text-white tracking-tight">$52.000</span>
              <span className="text-white/55 text-lg ml-1">COP/mes</span>
            </div>
            <div className="border-t border-white/[0.06] my-6" />
            <ul className="space-y-3 mb-8">
              {FEATURES_LIST.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-stockup-lime flex-shrink-0 mt-1" />
                  <span className="text-white/75 text-[15px]">{feature}</span>
                </li>
              ))}
            </ul>
            <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="btn-primary w-full justify-center text-base py-4">
              <WhatsAppIcon className="w-5 h-5 relative z-10" />
              <span className="relative z-10">Empezar por WhatsApp</span>
            </a>
            <p className="text-center text-white/40 text-[13px] mt-4">Sin tarjeta de crédito necesaria</p>
          </div>
        </div>
      </div>
    </section>
  );
}
