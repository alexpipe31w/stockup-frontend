import { Link } from 'react-router-dom';

const WA = 'https://wa.me/573142378407?text=Hola%20Alex%2C%20me%20interesa%20Stockup%20Messages%20para%20mi%20negocio%20%F0%9F%9A%80';

const CLIENTS = [
  { name: 'Frutaza',            sector: 'Mermeladas Amazónicas',  url: 'https://www.frutaza.com.co/',              emoji: '🍓' },
  { name: 'Coffee Masfred',     sector: 'Café del Huila',         url: 'https://coffee-masfred.vercel.app/',       emoji: '☕' },
  { name: 'Panel Plus Solar',   sector: 'Energía Solar',          url: 'https://panelplussolar.com.co/',           emoji: '☀️' },
  { name: 'DuvCORE Technology', sector: 'Tecnología',             url: 'https://duvcore-technology.vercel.app/',   emoji: '💻' },
];

const FEATURES = [
  { icon: '🤖', title: 'IA que responde sola',     desc: 'Tu bot atiende clientes 24/7 con respuestas inteligentes sobre productos, precios y disponibilidad.' },
  { icon: '📦', title: 'Pedidos automáticos',       desc: 'Los clientes hacen pedidos por WhatsApp y quedan registrados instantáneamente sin que toques nada.' },
  { icon: '📅', title: 'Citas y agenda',            desc: 'Los clientes agendan directamente desde el chat. Sin llamadas, sin malentendidos, sin cancelaciones.' },
  { icon: '📢', title: 'Campañas masivas',          desc: 'Envía promociones a toda tu base de clientes en segundos. Todo por WhatsApp, con alta tasa de apertura.' },
  { icon: '📊', title: 'Reportes diarios',          desc: 'Recibe un resumen automático de mensajes, pedidos y ventas cada día directo en tu WhatsApp.' },
  { icon: '👥', title: 'CRM de clientes',           desc: 'Historial completo de cada cliente: sus pedidos, conversaciones y datos en un solo lugar.' },
];

const STEPS = [
  { n: '01', title: 'Conectas en minutos',     desc: 'Escaneas un QR y tu WhatsApp queda vinculado a la plataforma. Sin apps extra, sin técnicos.' },
  { n: '02', title: 'Configuras tu negocio',   desc: 'Subes tu catálogo, horario y describes tus servicios. La IA aprende todo de eso.' },
  { n: '03', title: 'El bot trabaja por ti',   desc: 'Responde clientes, registra pedidos y agenda citas automáticamente. Tú solo revisas el resumen.' },
];

const CHAT = [
  { side: 'l', time: '11:47 PM', text: 'Hola buenas, ¿están abiertos? Quiero hacer un pedido 🙏' },
  { side: 'r', time: '11:47 PM', text: '¡Hola! 😊 Sí, estamos disponibles. ¿Qué producto te interesa?' },
  { side: 'l', time: '11:48 PM', text: 'El combo familiar grande' },
  { side: 'r', time: '11:48 PM', text: 'Perfecto 🎉 El Combo Familiar está en $65.000 con domicilio incluido. ¿Me confirmas tu dirección?' },
  { side: 'l', time: '11:48 PM', text: 'Calle 12 #34-56, Barrio El Centro' },
  { side: 'r', time: '11:49 PM', text: '✅ ¡Pedido registrado! Tu orden llega en 40 minutos. ¡Gracias por preferimos!' },
];

const FAQS = [
  { q: '¿Funciona con mi número de WhatsApp actual?',
    a: 'Sí. Conectas tu número existente escaneando un código QR. No necesitas un número nuevo ni cambiar nada.' },
  { q: '¿Qué pasa si un cliente pregunta algo que el bot no sabe?',
    a: 'El bot avisa que pasará la conversación a una persona y te notifica. Puedes tomar el chat manualmente cuando quieras.' },
  { q: '¿Puedo cancelar en cualquier momento?',
    a: 'Sí, sin penalidades ni contratos. Cancelas cuando quieras con un simple mensaje.' },
  { q: '¿Mis datos y los de mis clientes están seguros?',
    a: 'Totalmente. Los datos se almacenan en servidores seguros, nunca se comparten con terceros. Cumplimos la Ley 1581 de 2012.' },
];

function Check() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#D4FF00" strokeWidth="3.5">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

function WaIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.523 5.847L.057 23.886a.5.5 0 0 0 .611.61l6.101-1.459A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.897 0-3.67-.52-5.186-1.426l-.373-.218-3.865.924.955-3.772-.242-.389A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
    </svg>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white" style={{ fontFamily: 'system-ui,-apple-system,sans-serif' }}>

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0A0A0F]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#D4FF00] flex items-center justify-center">
              <span className="text-[#0A0A0F] font-black text-sm leading-none">S</span>
            </div>
            <span className="font-bold text-white text-sm sm:text-base">Stockup Messages</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="#precios" className="hidden sm:block text-sm text-white/50 hover:text-white transition">Precios</a>
            <a href={WA} target="_blank" rel="noopener noreferrer"
              className="hidden sm:block text-sm text-white/50 hover:text-white transition">Contacto</a>
            <Link to="/login"
              className="px-4 py-2 rounded-xl bg-[#D4FF00] text-[#0A0A0F] text-sm font-bold hover:bg-[#c9f200] transition">
              Ingresar
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="pt-28 pb-20 px-5">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-14 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#D4FF00]/10 border border-[#D4FF00]/20 text-[#D4FF00] text-xs font-bold mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4FF00] animate-pulse inline-block" />
              4 negocios activos en Colombia
            </div>
            <h1 className="text-4xl sm:text-5xl font-black leading-[1.1] mb-5">
              Tu negocio vende en
              <span className="text-[#D4FF00]"> WhatsApp</span><br />
              mientras tú duermes
            </h1>
            <p className="text-white/55 text-lg leading-relaxed mb-8">
              Un bot con inteligencia artificial atiende a tus clientes, registra pedidos y agenda citas
              automáticamente — los 7 días de la semana.{' '}
              <strong className="text-white font-semibold">Por solo $24.000/mes.</strong>
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href={WA} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#D4FF00] text-[#0A0A0F] font-bold text-base hover:bg-[#c9f200] transition shadow-lg shadow-[#D4FF00]/20">
                <WaIcon /> Quiero empezar ahora
              </a>
              <a href="#como-funciona"
                className="flex items-center justify-center px-6 py-3.5 rounded-xl border border-white/10 text-white/60 font-medium text-base hover:border-white/25 hover:text-white transition">
                Ver cómo funciona →
              </a>
            </div>
          </div>

          {/* Chat demo */}
          <div className="relative flex justify-center">
            <div className="w-full max-w-[320px] rounded-3xl border border-white/8 overflow-hidden shadow-2xl bg-[#111117]">
              {/* WA header */}
              <div className="bg-[#1a1a24] px-4 py-3 flex items-center gap-3 border-b border-white/5">
                <div className="w-10 h-10 rounded-full bg-[#D4FF00] flex items-center justify-center flex-shrink-0">
                  <span className="text-[#0A0A0F] font-black text-sm">S</span>
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">Tu Negocio 🏪</p>
                  <p className="text-[11px] text-green-400">Bot activo • En línea</p>
                </div>
              </div>
              {/* Messages */}
              <div className="p-4 space-y-2.5 bg-[#0d0d14] min-h-72">
                {CHAT.map((m, i) => (
                  <div key={i} className={`flex ${m.side === 'r' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[82%] px-3 py-2 rounded-2xl text-xs leading-relaxed
                      ${m.side === 'r'
                        ? 'bg-[#1f3d1f] text-green-100 rounded-br-sm'
                        : 'bg-[#1c1c2a] text-white/80 rounded-bl-sm'}`}>
                      <p>{m.text}</p>
                      <p className={`text-right mt-0.5 text-[10px] opacity-50`}>{m.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -inset-6 bg-[#D4FF00]/4 rounded-[40px] blur-3xl -z-10" />
          </div>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="border-y border-white/5 bg-white/[0.02] py-10 px-5">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { v: '24/7',   l: 'Siempre disponible' },
            { v: '$24K',   l: 'Al mes, todo incluido' },
            { v: '< 1s',   l: 'Tiempo de respuesta' },
            { v: '4+',     l: 'Negocios activos' },
          ].map(s => (
            <div key={s.l}>
              <p className="text-3xl font-black text-[#D4FF00]">{s.v}</p>
              <p className="text-sm text-white/45 mt-1">{s.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section className="py-24 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black mb-3">Todo lo que tu negocio necesita</h2>
            <p className="text-white/45 text-lg max-w-lg mx-auto">
              Una plataforma completa para nunca perder un cliente por no responder a tiempo.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(f => (
              <div key={f.title}
                className="bg-[#111117] border border-white/5 rounded-2xl p-6 hover:border-[#D4FF00]/25 transition group cursor-default">
                <div className="w-12 h-12 rounded-xl bg-[#D4FF00]/8 flex items-center justify-center text-2xl mb-4 group-hover:bg-[#D4FF00]/15 transition">
                  {f.icon}
                </div>
                <h3 className="font-bold text-white mb-2 text-base">{f.title}</h3>
                <p className="text-sm text-white/45 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section id="como-funciona" className="py-24 px-5 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black mb-3">Arranca en 15 minutos</h2>
            <p className="text-white/45 text-lg">Sin instalaciones. Sin código. Sin técnicos.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#D4FF00]/8 border border-[#D4FF00]/20 flex items-center justify-center mx-auto mb-5">
                  <span className="text-[#D4FF00] font-black text-2xl">{s.n}</span>
                </div>
                <h3 className="font-bold text-white mb-2 text-base">{s.title}</h3>
                <p className="text-sm text-white/45 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Clients ────────────────────────────────────────────────────────── */}
      <section className="py-24 px-5">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-bold text-white/35 uppercase tracking-widest mb-10">
            Negocios que ya confían en Stockup Messages
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {CLIENTS.map(c => (
              <a key={c.name} href={c.url} target="_blank" rel="noopener noreferrer"
                className="bg-[#111117] border border-white/5 rounded-2xl p-5 hover:border-[#D4FF00]/25 transition group">
                <div className="w-12 h-12 rounded-xl bg-[#D4FF00]/8 flex items-center justify-center mx-auto mb-3 text-2xl group-hover:bg-[#D4FF00]/15 transition">
                  {c.emoji}
                </div>
                <p className="font-bold text-white text-sm leading-tight">{c.name}</p>
                <p className="text-xs text-white/35 mt-1">{c.sector}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────────── */}
      <section id="precios" className="py-24 px-5 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-black mb-3">Un precio. Sin sorpresas.</h2>
          <p className="text-white/45 mb-10 text-base">Todo incluido. Sin contratos. Cancela cuando quieras.</p>
          <div className="bg-[#111117] border border-[#D4FF00]/30 rounded-3xl p-8 relative overflow-hidden shadow-2xl shadow-[#D4FF00]/5">
            <div className="absolute top-5 right-5 bg-[#D4FF00] text-[#0A0A0F] text-[11px] font-black px-3 py-1 rounded-full tracking-wide">
              MÁS POPULAR
            </div>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-3">Plan Completo</p>
            <div className="flex items-baseline gap-1 justify-center mb-1">
              <span className="text-white/40 text-lg font-medium">$</span>
              <span className="text-5xl font-black text-white">24.000</span>
            </div>
            <p className="text-white/35 text-sm mb-8">COP / mes · Facturación mensual</p>
            <ul className="text-left space-y-3 mb-8">
              {[
                'Bot de IA conectado a tu WhatsApp',
                'Registro automático de pedidos',
                'Agendamiento de citas sin complicaciones',
                'Campañas masivas de WhatsApp',
                'Catálogo de productos y servicios',
                'CRM completo de clientes',
                'Reportes y métricas diarias',
                'Soporte directo con el desarrollador',
              ].map(item => (
                <li key={item} className="flex items-center gap-3 text-sm text-white/65">
                  <span className="w-5 h-5 rounded-full bg-[#D4FF00]/10 flex items-center justify-center flex-shrink-0">
                    <Check />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <a href={WA} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[#D4FF00] text-[#0A0A0F] font-bold text-base hover:bg-[#c9f200] transition">
              <WaIcon /> Empezar por WhatsApp
            </a>
            <p className="text-white/25 text-xs mt-4">Sin tarjeta de crédito necesaria</p>
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-5">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-12">Preguntas frecuentes</h2>
          <div className="space-y-4">
            {FAQS.map(f => (
              <div key={f.q} className="bg-[#111117] border border-white/5 rounded-2xl p-6">
                <h3 className="font-bold text-white mb-2 text-base">{f.q}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────────── */}
      <section className="py-24 px-5 text-center border-t border-white/5">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black mb-4">
            ¿Listo para que tu negocio trabaje solo?
          </h2>
          <p className="text-white/45 text-lg mb-8">
            Escríbeme por WhatsApp y en menos de 24 horas tu bot está activo.
          </p>
          <a href={WA} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-[#D4FF00] text-[#0A0A0F] font-bold text-lg hover:bg-[#c9f200] transition shadow-2xl shadow-[#D4FF00]/20">
            <WaIcon /> Hablar con Alex ahora
          </a>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10 px-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-white/30">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#D4FF00] flex items-center justify-center">
              <span className="text-[#0A0A0F] font-black text-xs">S</span>
            </div>
            <span className="font-semibold text-white/50">Stockup Messages</span>
          </div>

          <div className="flex items-center gap-5 flex-wrap justify-center text-xs">
            <Link to="/terminos" className="hover:text-white transition">Términos y Condiciones</Link>
            <Link to="/privacidad" className="hover:text-white transition">Política de Privacidad</Link>
            <a href={WA} target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Contacto</a>
          </div>

          <div className="text-center sm:text-right text-xs">
            <p>
              Desarrollado y diseñado por{' '}
              <a href="https://alex-rodriguez-portfol.vercel.app/" target="_blank" rel="noopener noreferrer"
                className="text-[#D4FF00]/60 hover:text-[#D4FF00] transition font-semibold">
                Alex Rodríguez
              </a>
            </p>
            <p className="mt-0.5">© {new Date().getFullYear()} Stockup Messages. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
