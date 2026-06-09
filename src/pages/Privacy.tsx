import { Link } from 'react-router-dom';

const UPDATED = '9 de junio de 2026';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white" style={{ fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <nav className="border-b border-white/5 bg-[#0A0A0F]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#D4FF00] flex items-center justify-center">
              <span className="text-[#0A0A0F] font-black text-xs">S</span>
            </div>
            <span className="font-bold text-white text-sm">Stockup Messages</span>
          </Link>
          <Link to="/" className="text-sm text-white/50 hover:text-white transition">← Volver</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-5 py-16">
        <h1 className="text-3xl font-black mb-2">Política de Privacidad</h1>
        <p className="text-white/40 text-sm mb-12">Última actualización: {UPDATED}</p>

        <div className="space-y-10 text-white/70 leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-white mb-3">1. Responsable del tratamiento</h2>
            <p>
              El responsable del tratamiento de datos personales es <strong className="text-white/90">Alex Rodríguez</strong>,
              desarrollador y propietario de Stockup Messages, con domicilio en Colombia. Para contactar al responsable:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-white/60 mt-3">
              <li>WhatsApp: <a href="https://wa.me/573142378407" target="_blank" rel="noopener noreferrer"
                className="text-[#D4FF00] hover:underline">+57 314 237 8407</a></li>
              <li>Portafolio: <a href="https://alex-rodriguez-portfol.vercel.app/" target="_blank" rel="noopener noreferrer"
                className="text-[#D4FF00] hover:underline">alex-rodriguez-portfol.vercel.app</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">2. Marco legal aplicable</h2>
            <p>
              Esta política se rige por las siguientes normas colombianas en materia de protección de datos personales:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-white/60 mt-3">
              <li><strong className="text-white/80">Ley 1581 de 2012</strong> — Disposiciones generales para la protección de datos personales</li>
              <li><strong className="text-white/80">Decreto 1074 de 2015</strong> — Decreto Único Reglamentario del Sector Comercio</li>
              <li><strong className="text-white/80">Ley 527 de 1999</strong> — Comercio electrónico y firmas digitales</li>
              <li><strong className="text-white/80">Circular Externa 002 de 2015</strong> — Superintendencia de Industria y Comercio</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">3. Datos personales que recopilamos</h2>
            <p className="mb-3">Recopilamos las siguientes categorías de datos:</p>

            <div className="space-y-4">
              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                <h3 className="font-semibold text-white/90 mb-2 text-sm">Datos del titular de la cuenta (negocio)</h3>
                <ul className="list-disc list-inside space-y-1 text-white/55 text-sm">
                  <li>Nombre completo y nombre del negocio</li>
                  <li>Correo electrónico</li>
                  <li>Número de teléfono / WhatsApp</li>
                  <li>Contraseña (almacenada cifrada con bcrypt)</li>
                </ul>
              </div>

              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                <h3 className="font-semibold text-white/90 mb-2 text-sm">Datos de clientes del negocio</h3>
                <ul className="list-disc list-inside space-y-1 text-white/55 text-sm">
                  <li>Número de teléfono de WhatsApp</li>
                  <li>Nombre (cuando el cliente lo proporciona voluntariamente)</li>
                  <li>Dirección de entrega (cuando aplica para pedidos)</li>
                  <li>Historial de conversaciones y pedidos</li>
                </ul>
              </div>

              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                <h3 className="font-semibold text-white/90 mb-2 text-sm">Datos de uso de la plataforma</h3>
                <ul className="list-disc list-inside space-y-1 text-white/55 text-sm">
                  <li>Logs de actividad y acceso</li>
                  <li>Métricas de uso del bot y campañas</li>
                  <li>Imágenes subidas al catálogo (almacenadas en Cloudinary)</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">4. Finalidad del tratamiento</h2>
            <p className="mb-3">Los datos personales son tratados exclusivamente para las siguientes finalidades:</p>
            <ul className="list-disc list-inside space-y-1.5 text-white/60">
              <li>Prestación del Servicio de automatización de WhatsApp</li>
              <li>Gestión de cuentas, suscripciones y facturación</li>
              <li>Soporte técnico y atención al cliente</li>
              <li>Generación de reportes y estadísticas para el titular de la cuenta</li>
              <li>Mejora del Servicio mediante análisis de uso (datos anonimizados)</li>
              <li>Cumplimiento de obligaciones legales</li>
            </ul>
            <p className="mt-3 text-sm text-white/50">
              <strong className="text-white/70">No utilizamos</strong> los datos para publicidad de terceros,
              perfilamiento comercial ajeno al Servicio ni los vendemos a ninguna entidad externa.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">5. Base legal para el tratamiento</h2>
            <p>
              El tratamiento de datos se realiza con base en el <strong className="text-white/80">consentimiento libre,
              previo, expreso e informado</strong> del titular, otorgado al momento del registro y aceptación de estos
              términos. Para datos de clientes finales (usuarios de WhatsApp), el titular de la cuenta es responsable de
              obtener el consentimiento correspondiente antes de incorporar dichos datos a la plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">6. Subencargados y transferencia de datos</h2>
            <p className="mb-3">
              Para la prestación del Servicio utilizamos los siguientes proveedores externos que pueden tener acceso
              a datos personales:
            </p>
            <ul className="space-y-3 text-sm">
              {[
                { name: 'InstaPods',   purpose: 'Alojamiento del servidor',          country: 'EE.UU.' },
                { name: 'Cloudinary',  purpose: 'Almacenamiento de imágenes',        country: 'EE.UU.' },
                { name: 'Groq / OpenAI / Anthropic', purpose: 'Procesamiento de IA para respuestas del bot', country: 'EE.UU.' },
                { name: 'Neon / PostgreSQL', purpose: 'Base de datos (backup)',       country: 'EE.UU.' },
                { name: 'MercadoPago', purpose: 'Procesamiento de pagos',            country: 'Argentina / Colombia' },
              ].map(p => (
                <li key={p.name} className="bg-white/[0.03] border border-white/5 rounded-xl p-3 flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#D4FF00]/50 mt-1.5 flex-shrink-0" />
                  <div>
                    <strong className="text-white/80">{p.name}</strong>
                    <span className="text-white/40"> — {p.purpose} ({p.country})</span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-white/50">
              Todos los proveedores están sujetos a sus propias políticas de privacidad y ofrecen garantías adecuadas
              de protección de datos según el GDPR o regulaciones equivalentes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">7. Retención de datos</h2>
            <ul className="list-disc list-inside space-y-1.5 text-white/60">
              <li><strong className="text-white/80">Mensajes activos:</strong> almacenados durante el período de suscripción activa</li>
              <li><strong className="text-white/80">Conversaciones archivadas:</strong> 90 días tras la inactividad, luego eliminadas permanentemente</li>
              <li><strong className="text-white/80">Datos de cuenta:</strong> conservados durante la vigencia de la suscripción y 30 días adicionales tras la cancelación</li>
              <li><strong className="text-white/80">Datos de facturación:</strong> conservados por el tiempo exigido por la legislación tributaria colombiana (5 años)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">8. Derechos del titular</h2>
            <p className="mb-3">
              De conformidad con la Ley 1581 de 2012, usted tiene los siguientes derechos:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-white/60">
              <li><strong className="text-white/80">Acceso:</strong> conocer qué datos personales suyos están siendo tratados</li>
              <li><strong className="text-white/80">Rectificación:</strong> corregir datos inexactos o incompletos</li>
              <li><strong className="text-white/80">Supresión:</strong> solicitar la eliminación de sus datos cuando no sea legalmente necesario conservarlos</li>
              <li><strong className="text-white/80">Oposición:</strong> oponerse al tratamiento de sus datos en determinadas circunstancias</li>
              <li><strong className="text-white/80">Portabilidad:</strong> recibir sus datos en formato estructurado y legible</li>
              <li><strong className="text-white/80">Revocación del consentimiento:</strong> retirar el consentimiento dado en cualquier momento</li>
            </ul>
            <p className="mt-3">
              Para ejercer estos derechos, contáctenos por WhatsApp al{' '}
              <a href="https://wa.me/573142378407" target="_blank" rel="noopener noreferrer"
                className="text-[#D4FF00] hover:underline">+57 314 237 8407</a>.
              Responderemos en un plazo máximo de 15 días hábiles conforme a la ley.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">9. Seguridad de los datos</h2>
            <p>
              Implementamos medidas técnicas y organizativas adecuadas para proteger sus datos personales, incluyendo:
              cifrado de contraseñas con bcrypt, comunicaciones cifradas mediante HTTPS/TLS, autenticación mediante
              tokens JWT, y acceso restringido a datos por roles de usuario. Sin embargo, ningún sistema es
              completamente infalible; en caso de brecha de seguridad que afecte sus datos, le notificaremos dentro
              de los 72 horas siguientes a su detección.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">10. Cookies y tecnologías de seguimiento</h2>
            <p>
              La plataforma utiliza almacenamiento local del navegador (localStorage) exclusivamente para mantener
              la sesión activa del usuario. No utilizamos cookies de terceros ni tecnologías de seguimiento
              publicitario. El sitio web de presentación no usa cookies de análisis ni de publicidad.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">11. Menores de edad</h2>
            <p>
              El Servicio está dirigido exclusivamente a personas mayores de 18 años o a negocios legalmente
              constituidos. No recopilamos intencionalmente datos personales de menores. Si detectamos que un
              menor ha proporcionado datos sin consentimiento parental, los eliminaremos de inmediato.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">12. Cambios a esta política</h2>
            <p>
              Podemos actualizar esta Política de Privacidad periódicamente. Los cambios sustanciales serán
              notificados con al menos 30 días de anticipación. La fecha de última actualización al inicio de
              este documento refleja la versión vigente.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">13. Autoridad de control</h2>
            <p>
              Si considera que sus derechos han sido vulnerados y no ha obtenido respuesta satisfactoria, puede
              presentar una queja ante la{' '}
              <strong className="text-white/80">Superintendencia de Industria y Comercio (SIC)</strong>{' '}
              de Colombia, autoridad competente en materia de protección de datos personales.
            </p>
          </section>

        </div>
      </div>

      <footer className="border-t border-white/5 py-8 px-5 text-center text-xs text-white/25">
        <p>© {new Date().getFullYear()} Stockup Messages · Desarrollado por{' '}
          <a href="https://alex-rodriguez-portfol.vercel.app/" target="_blank" rel="noopener noreferrer"
            className="text-[#D4FF00]/50 hover:text-[#D4FF00] transition">Alex Rodríguez</a>
        </p>
        <div className="flex justify-center gap-5 mt-3">
          <Link to="/" className="hover:text-white transition">Inicio</Link>
          <Link to="/terminos" className="hover:text-white transition">Términos y Condiciones</Link>
        </div>
      </footer>
    </div>
  );
}
