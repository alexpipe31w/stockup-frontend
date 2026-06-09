import { Leaf, Coffee, Sun, Monitor, ArrowUpRight } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import SectionHeader from '../components/landing/SectionHeader';

const CLIENTES = [
  { Icon: Leaf,    name: 'Frutaza',            sector: 'Mermeladas Amazónicas',   url: 'https://www.frutaza.com.co' },
  { Icon: Coffee,  name: 'Coffee Masfred',     sector: 'Café Especial del Huila', url: 'https://coffee-masfred.vercel.app/' },
  { Icon: Sun,     name: 'Panel Plus Solar',   sector: 'Energía Solar',           url: 'https://panelplussolar.com.co/' },
  { Icon: Monitor, name: 'DuvCORE Technology', sector: 'Tecnología',              url: 'https://duvcore-technology.vercel.app/' },
];

export default function ClientesSection() {
  const gridRef = useScrollReveal<HTMLDivElement>({ childSelector: '.client-card', stagger: 0.1 });

  return (
    <section className="py-20 lg:py-28 bg-stockup-secondary">
      <div className="container-stockup">
        <SectionHeader label="CLIENTES" title="Negocios que ya confían en Stockup Messages" />
        <div ref={gridRef} className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {CLIENTES.map(({ Icon, name, sector, url }, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
              className="client-card group relative bg-stockup-card border border-white/[0.06] rounded-2xl p-8 transition-all duration-400 hover:border-stockup-lime/25 hover:shadow-glow-lime cursor-pointer opacity-0">
              <ArrowUpRight className="absolute top-4 right-4 w-4 h-4 text-white/30 transition-colors duration-200 group-hover:text-white" />
              <div className="w-14 h-14 rounded-2xl bg-stockup-lime/10 border border-stockup-lime/20 flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-105">
                <Icon className="w-7 h-7 text-stockup-lime" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">{name}</h3>
              <p className="text-sm text-white/55">{sector}</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
