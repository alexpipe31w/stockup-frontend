import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SectionHeader from '../components/landing/SectionHeader';

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  { num: '01', title: 'Conectas en minutos',     desc: 'Escaneas un código QR y tu WhatsApp queda vinculado a la plataforma. Sin apps extra.' },
  { num: '02', title: 'Configuras tu negocio',   desc: 'Subes tu catálogo, horario y describes tus servicios. La IA aprende todo de eso.' },
  { num: '03', title: 'El bot trabaja por ti',   desc: 'Responde clientes, registra pedidos y agenda citas automáticamente. Tú solo revisas el resumen.' },
];

export default function ComoFunciona() {
  const sectionRef = useRef<HTMLElement>(null);
  const lineRef = useRef<SVGLineElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      cardsRef.current.forEach((card, i) => {
        if (!card) return;
        gsap.fromTo(card, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, delay: i * 0.15, ease: 'power2.out', scrollTrigger: { trigger: sectionRef.current, start: 'top 75%', once: true } });
      });
      if (lineRef.current) {
        gsap.set(lineRef.current, { strokeDasharray: '8 8', strokeDashoffset: 1000 });
        gsap.to(lineRef.current, { strokeDashoffset: 0, duration: 2, ease: 'power2.inOut', scrollTrigger: { trigger: sectionRef.current, start: 'top 60%', once: true } });
      }
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="como-funciona" ref={sectionRef} className="py-20 lg:py-28 bg-stockup-bg">
      <div className="container-stockup">
        <SectionHeader label="CÓMO FUNCIONA" title="Arranca en 15 minutos" subtitle="Sin instalaciones. Sin código. Sin técnicos." />
        <div className="relative">
          <svg className="hidden lg:block absolute top-1/2 left-0 right-0 -translate-y-1/2 w-full h-2 pointer-events-none" style={{ zIndex: 0 }} preserveAspectRatio="none">
            <defs>
              <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="rgba(212,255,0,0.2)" />
                <stop offset="50%"  stopColor="rgba(212,255,0,0.6)" />
                <stop offset="100%" stopColor="rgba(212,255,0,0.2)" />
              </linearGradient>
            </defs>
            <line ref={lineRef} x1="10%" y1="1" x2="90%" y2="1" stroke="url(#lineGrad)" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <div className="grid lg:grid-cols-3 gap-6 relative z-10">
            {STEPS.map((step, i) => (
              <div key={i} ref={(el) => { cardsRef.current[i] = el; }} className="bg-stockup-card border border-white/[0.06] rounded-2xl p-8 text-center opacity-0">
                <span className="text-5xl font-black text-stockup-lime/40 block mb-4">{step.num}</span>
                <h3 className="text-xl lg:text-[22px] font-bold text-white mb-3">{step.title}</h3>
                <p className="text-white/55 text-base leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
