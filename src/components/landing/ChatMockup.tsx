import { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';

interface Message { id: number; sender: 'client' | 'bot'; text: string; time: string; }

const MESSAGES: Message[] = [
  { id: 1, sender: 'client', text: 'Hola, ¿están abiertos? Quiero hacer un pedido 🙏', time: '11:47 PM' },
  { id: 2, sender: 'bot',    text: '¡Hola! 😊 Sí, estamos disponibles. ¿Qué te gustaría ordenar?', time: '11:47 PM' },
  { id: 3, sender: 'client', text: 'El combo familiar grande', time: '11:48 PM' },
  { id: 4, sender: 'bot',    text: 'Perfecto 🎉 El Combo Familiar está en $65.000. ¿Me confirmas tu dirección?', time: '11:48 PM' },
  { id: 5, sender: 'client', text: 'Calle 12 #34-56, Barrio El Centro', time: '11:48 PM' },
  { id: 6, sender: 'bot',    text: '✅ ¡Pedido registrado! Tu orden llega en 40 minutos. ¡Gracias por tu compra!', time: '11:49 PM' },
];

export default function ChatMockup() {
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<(HTMLDivElement | null)[]>([]);
  const [showTyping, setShowTyping] = useState<number[]>([]);
  const [visibleMessages, setVisibleMessages] = useState<number[]>([]);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) { setVisibleMessages(MESSAGES.map((m) => m.id)); return; }

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1 });
    tl.fromTo(containerRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 });

    let t = 0.5;
    MESSAGES.forEach((msg, index) => {
      if (msg.sender === 'bot' && index > 0) {
        tl.call(() => setShowTyping((p) => [...p, msg.id]), [], t);
        t += 1.5;
        tl.call(() => { setShowTyping((p) => p.filter((id) => id !== msg.id)); setVisibleMessages((p) => [...p, msg.id]); }, [], t);
        t += 0.3;
        const el = messagesRef.current[index];
        if (el) tl.fromTo(el, { opacity: 0, y: 10, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'power2.out' }, t);
        t += 0.5;
      } else {
        tl.call(() => setVisibleMessages((p) => [...p, msg.id]), [], t);
        t += 0.3;
        const el = messagesRef.current[index];
        if (el) tl.fromTo(el, { opacity: 0, y: 10, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'power2.out' }, t);
        t += 1.5;
      }
    });

    t += 2;
    tl.to(containerRef.current, { opacity: 0, duration: 0.5 }, t);
    tl.call(() => { setVisibleMessages([]); setShowTyping([]); }, [], t + 0.5);

    return () => { tl.kill(); };
  }, []);

  return (
    <div className="animate-float animate-shadow-pulse">
      <div ref={containerRef} className="w-[320px] sm:w-[340px] bg-stockup-bg border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl">
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <span className="text-white text-sm font-semibold">Tu Negocio 🏪</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse-dot" />
            <span className="text-green-400 text-xs">Bot activo • En línea</span>
          </div>
        </div>
        <div className="p-4 space-y-3 min-h-[360px]">
          {MESSAGES.map((msg, index) => {
            const isVisible = visibleMessages.includes(msg.id);
            const isTyping = showTyping.includes(msg.id);
            return (
              <div
                key={msg.id}
                ref={(el) => { messagesRef.current[index] = el; }}
                className={`${isVisible ? 'block' : 'hidden'} ${msg.sender === 'client' ? 'flex justify-end' : 'flex justify-start'}`}
              >
                {isTyping ? (
                  <div className="bg-stockup-lime-dark rounded-[4px_16px_16px_16px] px-4 py-3 flex items-center gap-1">
                    {[0, 0.15, 0.3].map((d, i) => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-stockup-lime animate-typing-dot" style={{ animationDelay: `${d}s` }} />
                    ))}
                  </div>
                ) : (
                  <div className={`max-w-[85%] px-3.5 py-2.5 ${msg.sender === 'bot' ? 'bg-stockup-lime-dark rounded-[4px_16px_16px_16px]' : 'bg-stockup-chat-client rounded-[16px_16px_4px_16px]'}`}>
                    <p className="text-white text-[13px] leading-relaxed">{msg.text}</p>
                    <p className="text-white/30 text-[10px] mt-1">{msg.time}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
