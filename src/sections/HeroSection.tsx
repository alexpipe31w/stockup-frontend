import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import ParticleCanvas from '../components/landing/ParticleCanvas';
import GradientOrbs from '../components/landing/GradientOrbs';
import ChatMockup from '../components/landing/ChatMockup';
import WhatsAppIcon from '../components/landing/WhatsAppIcon';
import { ArrowRight } from 'lucide-react';

const TITLE_WORDS = [
  { text: 'Tu',       color: 'white' },
  { text: 'negocio',  color: 'white' },
  { text: 'vende',    color: 'white' },
  { text: 'en',       color: 'white' },
  { text: 'WhatsApp', color: 'lime' },
  { text: 'mientras', color: 'white' },
  { text: 'tú',       color: 'white' },
  { text: 'duermes',  color: 'white' },
];

const WA_LINK = 'https://wa.me/573142378407?text=Hola%20Alex%2C%20me%20interesa%20Stockup%20Messages%20para%20mi%20negocio%20%F0%9F%9A%80';

export default function HeroSection() {
  const wordsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline();
    tl.fromTo(badgeRef.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0.1);
    wordsRef.current.forEach((word, i) => {
      if (!word) return;
      tl.fromTo(word, { opacity: 0, y: 40, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.5, ease: 'power2.out' }, 0.3 + i * 0.12);
    });
    const waWord = wordsRef.current[4];
    if (waWord) tl.fromTo(waWord, { backgroundPosition: '-200% center' }, { backgroundPosition: '200% center', duration: 1.2, ease: 'power2.inOut' }, 1.2);
    tl.fromTo(subtitleRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 1.5);
    tl.fromTo(buttonsRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 1.8);
    return () => { tl.kill(); };
  }, []);

  return (
    <section className="relative min-h-screen flex items-center pt-[72px] pb-16 overflow-hidden">
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'url(/images/hero-bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <ParticleCanvas />
      <GradientOrbs />

      <div className="container-stockup relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
          <div className="flex-1 max-w-xl lg:max-w-none">
            <div ref={badgeRef} className="inline-flex items-center gap-2 mb-8 opacity-0">
              <span className="w-2 h-2 rounded-full bg-stockup-lime animate-pulse-dot" />
              <span className="text-white/55 text-xs sm:text-sm font-medium">4 negocios confían en nosotros</span>
            </div>

            <h1 className="text-[clamp(36px,6vw,72px)] font-black leading-[1.05] tracking-tight mb-6">
              {TITLE_WORDS.map((word, i) => (
                <span
                  key={i}
                  ref={(el) => { wordsRef.current[i] = el; }}
                  className="inline-block mr-[0.25em] opacity-0"
                  style={word.color === 'lime' ? {
                    backgroundImage: 'linear-gradient(90deg, #D4FF00, #e5ff4d, #D4FF00)',
                    backgroundSize: '200% auto',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  } : { color: 'white' }}
                >
                  {word.text}
                </span>
              ))}
            </h1>

            <p ref={subtitleRef} className="text-base sm:text-lg text-white/55 leading-relaxed mb-8 max-w-[480px] opacity-0">
              Un bot con inteligencia artificial atiende clientes, toma pedidos y agenda citas automáticamente, los 7 días de la semana. Por solo $24.000/mes.
            </p>

            <div ref={buttonsRef} className="flex flex-col sm:flex-row gap-4 opacity-0">
              <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="btn-primary text-[15px]">
                <WhatsAppIcon className="w-[18px] h-[18px] relative z-10" />
                <span className="relative z-10">Quiero empezar ahora</span>
              </a>
              <a href="#como-funciona" className="btn-outline text-[15px] group">
                <span>Ver cómo funciona</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </a>
            </div>
          </div>

          <div className="flex-shrink-0 flex justify-center lg:justify-end">
            <div className="scale-[0.85] sm:scale-100 origin-center">
              <ChatMockup />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
