import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function useScrollReveal<T extends HTMLElement>(
  options?: {
    y?: number;
    duration?: number;
    delay?: number;
    stagger?: number;
    childSelector?: string;
  }
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const { y = 30, duration = 0.6, delay = 0, stagger = 0, childSelector } = options || {};
    const targets = childSelector ? el.querySelectorAll(childSelector) : el;

    gsap.set(targets, { opacity: 0, y });

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        gsap.to(targets, {
          opacity: 1,
          y: 0,
          duration,
          delay,
          stagger: stagger || 0,
          ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
        });
      },
    });

    return () => { trigger.kill(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ref;
}
