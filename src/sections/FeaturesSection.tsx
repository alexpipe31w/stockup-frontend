import { Bot, Package, Calendar, Megaphone, BarChart2, Users } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import SectionHeader from '../components/landing/SectionHeader';

const FEATURES = [
  { Icon: Bot,       title: 'IA que responde sola',   desc: 'Tu bot atiende clientes 24/7 con respuestas inteligentes sobre productos, precios y disponibilidad. Sin que estés pendiente.' },
  { Icon: Package,   title: 'Pedidos automáticos',    desc: 'Los clientes hacen pedidos por WhatsApp y quedan registrados al instante, sin que toques nada.' },
  { Icon: Calendar,  title: 'Citas y agenda',         desc: 'Clientes agendan sus citas directamente desde el chat. Sin llamadas, sin malentendidos.' },
  { Icon: Megaphone, title: 'Campañas masivas',       desc: 'Envía promociones a toda tu base de clientes con un clic. Tasa de apertura del 90% en WhatsApp.' },
  { Icon: BarChart2, title: 'Reportes diarios',       desc: 'Recibe un resumen automático de ventas, pedidos y mensajes cada día en tu WhatsApp.' },
  { Icon: Users,     title: 'CRM de clientes',        desc: 'Historial completo de cada cliente: pedidos, conversaciones y datos en un solo lugar.' },
];

export default function FeaturesSection() {
  const gridRef = useScrollReveal<HTMLDivElement>({ childSelector: '.feature-card', stagger: 0.1 });

  return (
    <section id="features" className="py-20 lg:py-28 bg-stockup-secondary">
      <div className="container-stockup">
        <SectionHeader label="CARACTERÍSTICAS" title="Todo lo que tu negocio necesita" />
        <div ref={gridRef} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ Icon, title, desc }, i) => (
            <div key={i} className="feature-card card-feature group cursor-default">
              <div className="w-12 h-12 rounded-xl bg-stockup-lime/10 border border-stockup-lime/20 flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110">
                <Icon className="w-6 h-6 text-stockup-lime" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
              <p className="text-white/55 text-[15px] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
