import { useRef, useEffect, useState } from 'react';

interface Stat { value: string; numericValue: number; prefix: string; suffix: string; label: string; isDecimal: boolean; }

const STATS: Stat[] = [
  { value: '24/7', numericValue: 24, prefix: '',  suffix: '/7', label: 'Siempre disponible',   isDecimal: false },
  { value: '$24K', numericValue: 24, prefix: '$', suffix: 'K',  label: 'Al mes, todo incluido', isDecimal: false },
  { value: '<1s',  numericValue: 1,  prefix: '<', suffix: 's',  label: 'Tiempo de respuesta',  isDecimal: true  },
  { value: '4+',   numericValue: 4,  prefix: '',  suffix: '+',  label: 'Negocios activos',      isDecimal: false },
];

function AnimatedCounter({ stat, inView }: { stat: Stat; inView: boolean }) {
  const [display, setDisplay] = useState('0');
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setDisplay(stat.value); return; }
    const startTime = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / 2000, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * stat.numericValue;
      setDisplay(stat.isDecimal ? stat.prefix + current.toFixed(1) + stat.suffix : stat.prefix + Math.floor(current) + stat.suffix);
      if (progress < 1) { rafRef.current = requestAnimationFrame(animate); } else { setDisplay(stat.value); }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [inView, stat]);

  return <span>{display}</span>;
}

export default function StatsBar() {
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } }, { threshold: 0.3 });
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="bg-stockup-secondary border-y border-white/[0.06] py-10 lg:py-12">
      <div className="container-stockup">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
          {STATS.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-white tracking-tight">
                <AnimatedCounter stat={stat} inView={inView} />
              </div>
              <p className="mt-2 text-sm text-white/55 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
