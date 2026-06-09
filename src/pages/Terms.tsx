import { Link } from 'react-router-dom';

const UPDATED = '9 de junio de 2026';

export default function Terms() {
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
        <h1 className="text-3xl font-black mb-2">Términos y Condiciones</h1>
        <p className="text-white/40 text-sm mb-12">Última actualización: {UPDATED}</p>

        <div className="space-y-10 text-white/70 leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-white mb-3">1. Aceptación de los términos</h2>
            <p>
              Al acceder o utilizar la plataforma Stockup Messages (en adelante "el Servicio"), usted acepta quedar
              vinculado por estos Términos y Condiciones, así como por nuestra Política de Privacidad. Si no está de
              acuerdo con alguna de estas condiciones, no podrá utilizar el Servicio. El uso continuado del Servicio
              constituye aceptación de cualquier modificación a estos términos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">2. Descripción del servicio</h2>
            <p className="mb-3">
              Stockup Messages es una plataforma SaaS (Software como Servicio) que permite a negocios automatizar la
              atención al cliente a través de WhatsApp mediante inteligencia artificial. El Servicio incluye:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-white/60">
              <li>Conexión de número de WhatsApp mediante código QR (tecnología no oficial de terceros)</li>
              <li>Bot de IA para respuesta automática de mensajes</li>
              <li>Gestión de pedidos, citas, productos y servicios</li>
              <li>Campañas de mensajería masiva</li>
              <li>CRM de clientes y reportes de actividad</li>
            </ul>
            <p className="mt-3 text-white/50 text-sm">
              <strong className="text-white/70">Aviso importante:</strong> La integración con WhatsApp se realiza mediante
              tecnología de terceros (Baileys) que no está oficialmente respaldada por Meta/WhatsApp Inc. El uso de esta
              tecnología puede implicar riesgos de suspensión de la cuenta por parte de WhatsApp. Stockup Messages no se
              hace responsable de dichas suspensiones.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">3. Registro y cuenta de usuario</h2>
            <p className="mb-3">
              Para utilizar el Servicio debe registrarse con información veraz y actualizada. Usted es responsable de:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-white/60">
              <li>Mantener la confidencialidad de sus credenciales de acceso</li>
              <li>Todas las actividades que ocurran bajo su cuenta</li>
              <li>Notificar de inmediato cualquier uso no autorizado de su cuenta</li>
              <li>Asegurarse de que la información de registro sea exacta y esté actualizada</li>
            </ul>
            <p className="mt-3">
              Nos reservamos el derecho de suspender o cancelar cuentas que proporcionen información falsa o que
              violen estos términos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">4. Suscripción y pagos</h2>
            <p className="mb-3">
              El Servicio se ofrece bajo un modelo de suscripción mensual. Al suscribirse, usted acepta las siguientes
              condiciones:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-white/60">
              <li>El precio actual del plan es de <strong className="text-white/80">$24.000 COP por mes</strong>, sujeto a cambios con previo aviso de 30 días</li>
              <li>Los pagos son mensuales y no reembolsables una vez procesados</li>
              <li>La cancelación puede realizarse en cualquier momento; el acceso continúa hasta el final del período pagado</li>
              <li>El incumplimiento en el pago resultará en la suspensión del acceso al Servicio</li>
              <li>Los precios están expresados en Pesos Colombianos (COP) e incluyen los impuestos aplicables</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">5. Uso aceptable</h2>
            <p className="mb-3">
              Al utilizar el Servicio, usted se compromete a no:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-white/60">
              <li>Enviar mensajes no solicitados (spam) a través de las campañas de WhatsApp</li>
              <li>Usar el Servicio para actividades ilegales, fraudulentas o que violen los derechos de terceros</li>
              <li>Intentar acceder sin autorización a sistemas, datos o cuentas de otros usuarios</li>
              <li>Distribuir malware, virus u otros códigos maliciosos</li>
              <li>Infringir las Políticas de Uso Aceptable de WhatsApp / Meta</li>
              <li>Recopilar datos personales de terceros sin su consentimiento</li>
              <li>Usar el Servicio para acosar, intimidar o discriminar a personas</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">6. Propiedad intelectual</h2>
            <p>
              Todos los derechos de propiedad intelectual sobre el Servicio, incluyendo código fuente, diseño, logotipos,
              textos y funcionalidades, son propiedad exclusiva de Stockup Messages y su desarrollador, Alex Rodríguez.
              Queda prohibida la reproducción, distribución, modificación o uso comercial no autorizado de cualquier
              elemento del Servicio. El usuario conserva todos los derechos sobre el contenido que cargue en la
              plataforma (catálogos, imágenes, descripciones).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">7. Limitación de responsabilidad</h2>
            <p className="mb-3">
              En la máxima medida permitida por la ley colombiana, Stockup Messages no será responsable por:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-white/60">
              <li>Pérdidas de datos derivadas de fallos técnicos o causas de fuerza mayor</li>
              <li>Suspensiones de cuentas de WhatsApp por parte de Meta Inc.</li>
              <li>Lucro cesante, pérdida de clientes o daños indirectos de cualquier naturaleza</li>
              <li>Interrupciones del Servicio por mantenimiento, actualizaciones o causas externas</li>
              <li>Contenido publicado por usuarios que infrinja derechos de terceros</li>
            </ul>
            <p className="mt-3">
              La responsabilidad total de Stockup Messages frente al usuario no superará en ningún caso el monto pagado
              por la suscripción en el último mes calendario.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">8. Disponibilidad del servicio</h2>
            <p>
              Nos esforzamos por mantener el Servicio disponible de forma continua, pero no garantizamos disponibilidad
              del 100%. Realizamos mantenimientos programados con previo aviso. En caso de interrupciones no programadas
              que excedan las 24 horas en un mes calendario, el usuario podrá solicitar un descuento proporcional en su
              próxima factura.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">9. Modificaciones al servicio y términos</h2>
            <p>
              Nos reservamos el derecho de modificar el Servicio, sus características o estos Términos en cualquier
              momento. Los cambios materiales serán notificados con al menos 30 días de anticipación mediante el correo
              electrónico registrado o a través de la plataforma. El uso continuado del Servicio después de dicha
              notificación constituye aceptación de los cambios.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">10. Terminación</h2>
            <p>
              Cualquiera de las partes puede terminar el contrato en cualquier momento. Stockup Messages puede suspender
              o cancelar el acceso sin previo aviso en caso de violación grave de estos términos, actividades ilegales o
              riesgo para otros usuarios. Tras la cancelación, los datos del usuario serán conservados por 30 días para
              eventual recuperación, luego de lo cual serán eliminados permanentemente.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">11. Ley aplicable y jurisdicción</h2>
            <p>
              Estos Términos se rigen por las leyes de la República de Colombia. Cualquier disputa derivada de este
              acuerdo será sometida a la jurisdicción de los tribunales competentes de Colombia. Las partes acuerdan
              intentar resolver cualquier controversia de manera amigable antes de acudir a instancias judiciales.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">12. Contacto</h2>
            <p>
              Para cualquier consulta sobre estos Términos, puede contactarnos a través de WhatsApp al número{' '}
              <a href="https://wa.me/573142378407" target="_blank" rel="noopener noreferrer"
                className="text-[#D4FF00] hover:underline">+57 314 237 8407</a> o consultando el perfil del desarrollador en{' '}
              <a href="https://alex-rodriguez-portfol.vercel.app/" target="_blank" rel="noopener noreferrer"
                className="text-[#D4FF00] hover:underline">alex-rodriguez-portfol.vercel.app</a>.
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
          <Link to="/privacidad" className="hover:text-white transition">Política de Privacidad</Link>
        </div>
      </footer>
    </div>
  );
}
