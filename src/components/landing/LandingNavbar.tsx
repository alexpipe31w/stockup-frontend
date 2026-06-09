import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Características', href: '#features' },
  { label: 'Precios',         href: '#pricing' },
  { label: 'Contacto',        href: '#contact' },
];

export default function LandingNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (href: string) => {
    setIsMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 h-[72px] transition-all duration-300 ${
      isScrolled ? 'bg-stockup-bg/80 backdrop-blur-[20px] border-b border-white/[0.06]' : 'bg-transparent border-b border-transparent'
    }`}>
      <div className="container-stockup h-full flex items-center justify-between">
        <a href="#" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-stockup-card border border-white/[0.06] rounded-[10px] flex items-center justify-center">
            <span className="text-stockup-lime font-extrabold text-lg">S</span>
          </div>
          <span className="text-white font-bold text-[15px] tracking-[0.01em] hidden sm:block">Stockup Messages</span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <button key={link.href} onClick={() => scrollTo(link.href)}
              className="text-white/55 hover:text-white text-sm font-medium transition-colors duration-200">
              {link.label}
            </button>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="text-white/55 hover:text-white text-sm font-medium transition-colors duration-200">
            Iniciar sesión
          </Link>
          <Link to="/register"
            className="bg-stockup-lime text-stockup-bg text-sm font-bold px-5 py-2.5 rounded-[10px] hover:brightness-110 transition-all duration-200">
            Empezar gratis
          </Link>
        </div>

        <button className="md:hidden text-white p-2" onClick={() => setIsMobileOpen(!isMobileOpen)} aria-label="Menu">
          {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 top-[72px] bg-stockup-bg/95 backdrop-blur-[20px] z-40">
          <div className="flex flex-col items-center gap-8 pt-12">
            {NAV_LINKS.map((link) => (
              <button key={link.href} onClick={() => scrollTo(link.href)}
                className="text-white/70 hover:text-white text-lg font-medium transition-colors">
                {link.label}
              </button>
            ))}
            <Link to="/register" onClick={() => setIsMobileOpen(false)}
              className="bg-stockup-lime text-stockup-bg font-bold px-6 py-3 rounded-xl mt-4">
              Empezar gratis
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
