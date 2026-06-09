import { useRef, useEffect } from 'react';

export default function AuthGridBg() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!ref.current) return;
      const dx = (e.clientX / window.innerWidth - 0.5) * 2;
      const dy = (e.clientY / window.innerHeight - 0.5) * 2;
      ref.current.style.transform =
        `perspective(900px) rotateY(${dx * 7}deg) rotateX(${-dy * 7}deg) scale(1.08)`;
    };
    const onLeave = () => {
      if (ref.current)
        ref.current.style.transform =
          'perspective(900px) rotateY(0deg) rotateX(0deg) scale(1)';
    };
    window.addEventListener('mousemove', onMove);
    document.documentElement.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      document.documentElement.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes grid-breathe {
          0%, 100% { opacity: 0.2; }
          50%       { opacity: 0.5; }
        }
      `}</style>
      <div
        ref={ref}
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(212,255,0,0.22) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          animation: 'grid-breathe 4s ease-in-out infinite',
          transition: 'transform 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          transformOrigin: 'center center',
          willChange: 'transform',
        }}
      />
    </>
  );
}
