import { Link } from 'react-router-dom';

export default function LandingFooter() {
  return (
    <footer className="bg-stockup-secondary border-t border-white/[0.06] py-12">
      <div className="container-stockup">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-stockup-card border border-white/[0.06] rounded-lg flex items-center justify-center">
              <span className="text-stockup-lime font-extrabold text-sm">S</span>
            </div>
            <span className="text-white font-bold text-sm">Stockup Messages</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/terminos" className="text-white/55 hover:text-white text-[13px] transition-colors duration-200">
              Términos y Condiciones
            </Link>
            <Link to="/privacidad" className="text-white/55 hover:text-white text-[13px] transition-colors duration-200">
              Política de Privacidad
            </Link>
          </div>
        </div>
        <div className="text-center mt-8">
          <p className="text-white/40 text-[13px]">
            Desarrollado y diseñado por{' '}
            <a href="https://alex-rodriguez-portfol.vercel.app" target="_blank" rel="noopener noreferrer"
              className="text-white/55 hover:text-stockup-lime hover:underline transition-colors duration-200">
              Alex Rodríguez
            </a>
          </p>
        </div>
        <div className="text-center mt-4">
          <p className="text-white/30 text-xs">© 2026 Stockup Messages. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
