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
        <div className="mb-12">
          <h1 className="text-3xl font-black mb-2">Política de Privacidad</h1>
          <p className="text-white/40 text-sm mb-4">Última actualización: {UPDATED}</p>
          <div className="bg-[#D4FF00]/5 border border-[#D4FF00]/15 rounded-xl p-4 text-sm text-white/70">
            Esta política describe cómo Stockup Messages recopila, usa, almacena y protege sus datos personales,
            en cumplimiento de la <strong className="text-white/90">Ley 1581 de 2012</strong> (Régimen de Protección
            de Datos Personales de Colombia) y demás normas aplicables.
          </div>
        </div>

        <div className="space-y-10 text-white/70 leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-white mb-3">1. Responsable del tratamiento</h2>
            <p className="mb-3">
              El responsable del tratamiento de datos personales es:
            </p>
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 text-sm space-y-1.5">
              <p><strong className="text-white/80">Nombre:</strong> Alex Rodríguez</p>
              <p><strong className="text-white/80">Rol:</strong> Desarrollador y propietario de Stockup Messages</p>
              <p><strong className="text-white/80">País:</strong> Colombia</p>
              <p>
                <strong className="text-white/80">WhatsApp:</strong>{' '}
                <a href="https://wa.me/573142378407" target="_blank" rel="noopener noreferrer"
                  className="text-[#D4FF00] hover:underline">+57 314 237 8407</a>
              </p>
              <p>
                <strong className="text-white/80">Portafolio:</strong>{' '}
                <a href="https://alex-rodriguez-portfol.vercel.app/" target="_blank" rel="noopener noreferrer"
                  className="text-[#D4FF00] hover:underline">alex-rodriguez-portfol.vercel.app</a>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">2. Marco legal aplicable</h2>
            <ul className="list-disc list-inside space-y-1.5 text-white/60">
              <li><strong className="text-white/80">Ley 1581 de 2012</strong> — Régimen general de protección de datos personales</li>
              <li><strong className="text-white/80">Decreto 1074 de 2015</strong> — Decreto Único Reglamentario del Sector Comercio</li>
              <li><strong className="text-white/80">Ley 527 de 1999</strong> — Comercio electrónico y mensajes de datos</li>
              <li><strong className="text-white/80">Ley 1480 de 2011</strong> — Estatuto del Consumidor</li>
              <li><strong className="text-white/80">Circular Externa 002 de 2015 (SIC)</strong> — Políticas de tratamiento de datos</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">3. Roles en el tratamiento de datos</h2>
            <p className="mb-3">
              Stockup Messages opera en dos roles diferenciados según el tipo de datos:
            </p>
            <div className="space-y-3">
              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                <h3 className="font-semibold text-white/90 mb-2 text-sm">Responsable del tratamiento (datos del Cliente-negocio)</h3>
                <p className="text-sm text-white/55">
                  Respecto a los datos del titular de la cuenta (nombre, email, teléfono del negocio), Stockup Messages actúa
                  como <strong className="text-white/70">Responsable</strong> y determina los fines y medios del tratamiento.
                </p>
              </div>
              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                <h3 className="font-semibold text-white/90 mb-2 text-sm">Encargado del tratamiento (datos de clientes finales)</h3>
                <p className="text-sm text-white/55">
                  Respecto a los datos de los clientes del negocio (usuarios de WhatsApp que interactúan con el bot),
                  Stockup Messages actúa como <strong className="text-white/70">Encargado</strong> por instrucción del
                  Cliente-negocio, quien es el Responsable de esos datos y debe garantizar el consentimiento de sus propios clientes.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">4. Datos personales que recopilamos</h2>
            <div className="space-y-4">
              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                <h3 className="font-semibold text-white/90 mb-2 text-sm">Datos del titular de la cuenta (negocio)</h3>
                <ul className="list-disc list-inside space-y-1 text-white/55 text-sm">
                  <li>Nombre completo y nombre del negocio</li>
                  <li>Correo electrónico (verificado mediante código OTP)</li>
                  <li>Número de teléfono / WhatsApp del negocio</li>
                  <li>Contraseña (almacenada cifrada con bcrypt, irreversible)</li>
                  <li>Información de pago (procesada y almacenada por MercadoPago; no tenemos acceso a datos de tarjetas)</li>
                </ul>
              </div>
              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                <h3 className="font-semibold text-white/90 mb-2 text-sm">Datos de clientes del negocio (usuarios de WhatsApp)</h3>
                <ul className="list-disc list-inside space-y-1 text-white/55 text-sm">
                  <li>Número de teléfono de WhatsApp (identificador principal)</li>
                  <li>Nombre (cuando el cliente lo proporciona voluntariamente)</li>
                  <li>Dirección de entrega (cuando aplica para pedidos)</li>
                  <li>Historial de conversaciones con el bot</li>
                  <li>Historial de pedidos y citas agendadas</li>
                </ul>
              </div>
              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                <h3 className="font-semibold text-white/90 mb-2 text-sm">Datos de uso de la plataforma</h3>
                <ul className="list-disc list-inside space-y-1 text-white/55 text-sm">
                  <li>Logs de actividad y acceso a la plataforma</li>
                  <li>Métricas de uso del bot y campañas (anonimizadas para análisis)</li>
                  <li>Imágenes de catálogo subidas (almacenadas en Cloudinary)</li>
                  <li>Configuraciones del negocio y del bot</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">5. Finalidad del tratamiento</h2>
            <p className="mb-3">Los datos personales son tratados exclusivamente para:</p>
            <ul className="list-disc list-inside space-y-1.5 text-white/60">
              <li>Prestación del Servicio de automatización de WhatsApp</li>
              <li>Verificación de identidad mediante código OTP al registrarse</li>
              <li>Gestión de cuentas, suscripciones y facturación</li>
              <li>Procesamiento de pagos a través de MercadoPago</li>
              <li>Soporte técnico y atención al Cliente</li>
              <li>Generación de reportes y estadísticas para el titular de la cuenta</li>
              <li>Mejora del Servicio mediante análisis de uso (datos anonimizados o agregados)</li>
              <li>Envío de comunicaciones relacionadas con el Servicio (actualizaciones, mantenimientos, cambios en términos)</li>
              <li>Cumplimiento de obligaciones legales y requerimientos de autoridades competentes</li>
            </ul>
            <p className="mt-3 text-sm text-white/50">
              <strong className="text-white/70">No utilizamos</strong> los datos para publicidad de terceros,
              perfilamiento comercial ajeno al Servicio, ni los vendemos, arrendamos o cedemos a entidades externas.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">6. Base legal para el tratamiento</h2>
            <p className="mb-3">
              El tratamiento de datos personales se fundamenta en las siguientes bases legales:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-white/60">
              <li><strong className="text-white/80">Consentimiento:</strong> otorgado de forma libre, previa, expresa e informada al aceptar estos términos durante el registro</li>
              <li><strong className="text-white/80">Ejecución del contrato:</strong> datos necesarios para prestar el Servicio contratado</li>
              <li><strong className="text-white/80">Obligación legal:</strong> datos de facturación conservados por exigencia de la legislación tributaria colombiana</li>
              <li><strong className="text-white/80">Interés legítimo:</strong> datos de uso para garantizar la seguridad y correcto funcionamiento del Servicio</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">7. Subencargados y transferencias internacionales</h2>
            <p className="mb-3">
              Para prestar el Servicio utilizamos los siguientes proveedores externos que pueden tener acceso a datos personales.
              Todos están sujetos a contratos que garantizan niveles adecuados de protección:
            </p>
            <ul className="space-y-3 text-sm">
              {[
                { name: 'InstaPods', purpose: 'Alojamiento del servidor backend', country: 'EE.UU.', safeguard: 'Contratos de procesamiento de datos' },
                { name: 'Cloudinary', purpose: 'Almacenamiento y transformación de imágenes de catálogo', country: 'EE.UU.', safeguard: 'Cumplimiento GDPR / cláusulas contractuales estándar' },
                { name: 'Groq / OpenAI / Anthropic', purpose: 'Modelos de IA para generación de respuestas del bot', country: 'EE.UU.', safeguard: 'Data processing agreements / políticas de uso de API' },
                { name: 'Neon (PostgreSQL)', purpose: 'Respaldo de base de datos', country: 'EE.UU.', safeguard: 'Cifrado en tránsito y en reposo' },
                { name: 'MercadoPago', purpose: 'Procesamiento de pagos de suscripciones', country: 'Argentina / Colombia', safeguard: 'PCI DSS certificado, regulado por Banco de la República' },
                { name: 'Vercel', purpose: 'Alojamiento del frontend / panel web', country: 'EE.UU.', safeguard: 'Certificación SOC 2, cláusulas contractuales estándar' },
              ].map(p => (
                <li key={p.name} className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#D4FF00]/50 mt-1.5 flex-shrink-0" />
                    <div>
                      <strong className="text-white/80">{p.name}</strong>
                      <span className="text-white/40"> ({p.country})</span>
                      <p className="text-white/50 mt-0.5">{p.purpose}</p>
                      <p className="text-white/35 text-xs mt-0.5">Salvaguarda: {p.safeguard}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">8. Retención de datos</h2>
            <ul className="list-disc list-inside space-y-1.5 text-white/60">
              <li><strong className="text-white/80">Datos de cuenta activa:</strong> conservados durante toda la vigencia de la suscripción</li>
              <li><strong className="text-white/80">Conversaciones activas:</strong> almacenadas durante el período de suscripción activa</li>
              <li><strong className="text-white/80">Conversaciones archivadas:</strong> 90 días tras ser archivadas, luego eliminadas permanentemente</li>
              <li><strong className="text-white/80">Datos de cuenta cancelada:</strong> 30 días adicionales tras la cancelación para posible recuperación, luego eliminados</li>
              <li><strong className="text-white/80">Datos de facturación:</strong> 5 años según exigencia de legislación tributaria colombiana (DIAN)</li>
              <li><strong className="text-white/80">Logs de seguridad:</strong> 6 meses para investigación de incidentes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">9. Seguridad de los datos</h2>
            <p className="mb-3">
              Implementamos las siguientes medidas técnicas y organizativas para proteger sus datos personales:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-white/60">
              <li>Cifrado de contraseñas con bcrypt (hash unidireccional, irreversible)</li>
              <li>Comunicaciones cifradas mediante HTTPS/TLS en todos los endpoints</li>
              <li>Autenticación mediante tokens JWT con expiración controlada</li>
              <li>Acceso restringido a datos según roles de usuario</li>
              <li>Servidores con actualizaciones de seguridad regulares</li>
              <li>Variables de entorno para credenciales (nunca hardcodeadas)</li>
            </ul>
            <p className="mt-3 text-sm text-white/50">
              Ningún sistema es completamente infalible. En caso de brecha de seguridad que comprometa sus datos,
              notificaremos a los afectados dentro de las 72 horas siguientes a su detección, conforme a lo
              establecido en la sección 15 de esta política.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">10. Derechos del titular</h2>
            <p className="mb-3">
              De conformidad con la Ley 1581 de 2012, usted tiene los siguientes derechos sobre sus datos personales:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-white/60">
              <li><strong className="text-white/80">Acceso (Habeas Data):</strong> conocer qué datos personales suyos están siendo tratados, con qué finalidad y a quién han sido entregados</li>
              <li><strong className="text-white/80">Rectificación:</strong> solicitar la corrección de datos inexactos o incompletos</li>
              <li><strong className="text-white/80">Actualización:</strong> solicitar que sus datos sean actualizados</li>
              <li><strong className="text-white/80">Supresión:</strong> solicitar la eliminación de sus datos cuando no sea legalmente necesario conservarlos o cuando hayan cesado las finalidades que justificaron el tratamiento</li>
              <li><strong className="text-white/80">Oposición:</strong> oponerse al tratamiento de sus datos en determinadas circunstancias</li>
              <li><strong className="text-white/80">Portabilidad:</strong> recibir sus datos en formato estructurado, de uso común y legible por máquina</li>
              <li><strong className="text-white/80">Revocación del consentimiento:</strong> retirar el consentimiento otorgado en cualquier momento, sin que ello afecte la licitud del tratamiento previo</li>
            </ul>
            <p className="mt-3">
              Para ejercer estos derechos, contáctenos por WhatsApp al{' '}
              <a href="https://wa.me/573142378407" target="_blank" rel="noopener noreferrer"
                className="text-[#D4FF00] hover:underline">+57 314 237 8407</a>.
              Responderemos en un plazo máximo de <strong className="text-white/80">15 días hábiles</strong> conforme
              al artículo 14 de la Ley 1581 de 2012. Si la solicitud requiere información adicional para su verificación,
              ese plazo se computará desde que se reciba la documentación completa.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">11. Cookies y almacenamiento local</h2>
            <p className="mb-3">
              La plataforma utiliza las siguientes tecnologías de almacenamiento en el navegador:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-white/60">
              <li><strong className="text-white/80">localStorage:</strong> almacena el token de sesión (JWT) y datos básicos del perfil para mantener la sesión activa. Se elimina al cerrar sesión</li>
              <li><strong className="text-white/80">Cookies funcionales:</strong> no utilizamos cookies propias más allá de las estrictamente necesarias para el funcionamiento del Servicio</li>
            </ul>
            <p className="mt-3 text-sm text-white/50">
              <strong className="text-white/70">No utilizamos</strong> cookies de terceros, cookies de seguimiento
              publicitario, ni herramientas de analítica que identifiquen usuarios individuales (como Google Analytics
              en su configuración predeterminada). El sitio de presentación (landing page) tampoco usa cookies de rastreo.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">12. Procesamiento de datos por inteligencia artificial</h2>
            <p className="mb-3">
              Para generar respuestas automáticas en WhatsApp, el Servicio envía fragmentos de conversaciones a
              proveedores externos de IA (Groq, OpenAI, Anthropic). Al respecto:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-white/60">
              <li>Solo se envían los mensajes necesarios para generar la respuesta contextual (no el historial completo)</li>
              <li>Cada proveedor de IA tiene sus propios términos sobre retención de datos de API; generalmente no retienen datos de producción para entrenamiento sin consentimiento explícito</li>
              <li>El Cliente-negocio debe informar a sus clientes finales que el chat es atendido por un bot de IA</li>
              <li>No realizamos decisiones automatizadas con efectos jurídicos significativos sobre los titulares de los datos</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">13. Menores de edad</h2>
            <p>
              El Servicio está dirigido exclusivamente a personas mayores de 18 años o a negocios legalmente constituidos.
              No recopilamos intencionalmente datos personales de menores de edad. Si un menor proporciona sus datos
              a través del sistema de WhatsApp de un cliente (negocio usuario del Servicio), la responsabilidad de
              obtener el consentimiento parental recae sobre el negocio (Cliente). Si como Proveedor detectamos que
              un menor nos ha proporcionado directamente datos de registro, los eliminaremos de inmediato.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">14. Comunicaciones y marketing</h2>
            <p>
              Podemos enviar comunicaciones relacionadas con el Servicio al correo electrónico registrado, incluyendo:
              notificaciones de mantenimiento, actualizaciones importantes, cambios en términos y alertas de seguridad.
              Estas comunicaciones son de carácter funcional y no pueden desactivarse mientras la cuenta esté activa.
              No enviamos comunicaciones de marketing de terceros. Si en el futuro ofreciéramos comunicaciones
              promocionales opcionales, incluiremos un mecanismo de opt-out en cada mensaje.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">15. Procedimiento de notificación de brechas de seguridad</h2>
            <p className="mb-3">
              En caso de incidente de seguridad que comprometa datos personales, el Proveedor:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-white/60">
              <li>Evaluará el alcance y gravedad de la brecha en las primeras 24 horas de su detección</li>
              <li>Notificará a los titulares afectados dentro de las <strong className="text-white/80">72 horas</strong> siguientes a la detección, indicando qué datos fueron comprometidos y qué medidas se están tomando</li>
              <li>Reportará el incidente a la Superintendencia de Industria y Comercio (SIC) cuando así lo exija la normatividad</li>
              <li>Tomará medidas correctivas inmediatas para contener el incidente y evitar su repetición</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">16. Cambios a esta política</h2>
            <p>
              Podemos actualizar esta Política de Privacidad periódicamente para reflejar cambios en el Servicio,
              en la legislación aplicable o en nuestras prácticas. Los cambios sustanciales serán notificados con
              al menos 30 días de anticipación al correo electrónico registrado. La fecha de última actualización
              al inicio de este documento siempre reflejará la versión vigente. El uso continuado del Servicio
              tras la notificación implica aceptación de los cambios.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">17. Autoridad de control</h2>
            <p>
              Si considera que sus derechos sobre datos personales han sido vulnerados y no ha obtenido respuesta
              satisfactoria por parte del Proveedor en el plazo legal, puede presentar una queja ante la{' '}
              <strong className="text-white/80">Superintendencia de Industria y Comercio (SIC)</strong> de Colombia,
              autoridad competente en materia de protección de datos personales conforme al artículo 19 de la
              Ley 1581 de 2012. Sitio web: <span className="text-white/50">www.sic.gov.co</span>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">18. Contacto para asuntos de privacidad</h2>
            <p>
              Para ejercer sus derechos, resolver dudas sobre esta política o reportar cualquier incidente relacionado
              con sus datos personales:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-white/60 mt-3">
              <li>
                WhatsApp:{' '}
                <a href="https://wa.me/573142378407" target="_blank" rel="noopener noreferrer"
                  className="text-[#D4FF00] hover:underline">+57 314 237 8407</a>
              </li>
              <li>
                Portafolio:{' '}
                <a href="https://alex-rodriguez-portfol.vercel.app/" target="_blank" rel="noopener noreferrer"
                  className="text-[#D4FF00] hover:underline">alex-rodriguez-portfol.vercel.app</a>
              </li>
            </ul>
            <p className="mt-3 text-sm text-white/50">
              Tiempo de respuesta máximo: 15 días hábiles conforme a la Ley 1581 de 2012.
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
