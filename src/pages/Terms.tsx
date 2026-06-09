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
        <div className="mb-12">
          <h1 className="text-3xl font-black mb-2">Términos y Condiciones</h1>
          <p className="text-white/40 text-sm mb-4">Última actualización: {UPDATED}</p>
          <div className="bg-[#D4FF00]/5 border border-[#D4FF00]/15 rounded-xl p-4 text-sm text-white/70">
            <strong className="text-white/90">Aviso importante:</strong> Al registrarse y usar Stockup Messages usted
            acepta estos términos en su totalidad. Si no está de acuerdo con alguna cláusula, no debe usar el Servicio.
            Recomendamos leer este documento completo antes de continuar.
          </div>
        </div>

        <div className="space-y-10 text-white/70 leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-white mb-3">1. Partes del acuerdo</h2>
            <p>
              El presente acuerdo se celebra entre <strong className="text-white/90">Alex Rodríguez</strong>, desarrollador
              independiente y propietario de Stockup Messages, con domicilio en Colombia (en adelante "el Proveedor"),
              y la persona natural o jurídica que se registra en la plataforma (en adelante "el Cliente" o "el Usuario").
              Al hacer clic en "Acepto los Términos y Condiciones" durante el registro, el Cliente manifiesta su consentimiento
              libre, previo, expreso e informado con la totalidad de las cláusulas aquí establecidas.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">2. Descripción del servicio</h2>
            <p className="mb-3">
              Stockup Messages es una plataforma SaaS (Software como Servicio) que permite a negocios automatizar la
              atención al cliente a través de WhatsApp mediante inteligencia artificial. El Servicio incluye:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-white/60">
              <li>Conexión de número de WhatsApp del negocio mediante código QR</li>
              <li>Bot de inteligencia artificial para respuesta automática de mensajes</li>
              <li>Gestión de pedidos, citas, productos y servicios</li>
              <li>Campañas de mensajería masiva a clientes del negocio</li>
              <li>CRM de clientes y reportes de actividad</li>
              <li>Panel de administración web para gestión del negocio</li>
            </ul>
            <p className="mt-3 text-sm text-white/50">
              El Proveedor se reserva el derecho de modificar, ampliar o reducir las funcionalidades del Servicio
              con previo aviso al Cliente según lo establecido en la sección 17.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">3. Riesgo de API no oficial de WhatsApp</h2>
            <div className="bg-red-500/8 border border-red-500/20 rounded-xl p-4 space-y-3 text-sm">
              <p>
                <strong className="text-white/90">ADVERTENCIA EXPRESA — LEA CON ATENCIÓN:</strong> La integración
                con WhatsApp se realiza mediante tecnología de terceros (Baileys) que opera de forma no oficial y
                no está respaldada ni autorizada por Meta Platforms Inc. (empresa propietaria de WhatsApp).
              </p>
              <p>
                Al aceptar estos términos, el Cliente reconoce y acepta los siguientes riesgos:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-white/60">
                <li>Meta puede suspender o banear temporalmente o permanentemente el número de WhatsApp del negocio en cualquier momento y sin previo aviso</li>
                <li>La suspensión puede ocurrir incluso si el uso del Servicio ha sido moderado y dentro de las buenas prácticas recomendadas</li>
                <li>Stockup Messages no tiene control sobre las decisiones de Meta respecto a suspensiones de cuentas</li>
                <li>Una suspensión de WhatsApp no da derecho a reembolso, compensación o descuento por parte del Proveedor</li>
                <li>El Cliente es el único responsable de las consecuencias derivadas de usar tecnología no oficial con su número de WhatsApp</li>
              </ul>
              <p className="text-white/50">
                El Proveedor recomienda al Cliente mantener canales de comunicación alternativos con sus clientes y no
                depender exclusivamente de WhatsApp para su operación comercial.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">4. Herramientas de inteligencia artificial</h2>
            <p className="mb-3">
              El Servicio utiliza modelos de lenguaje de terceros (incluyendo, pero no limitado a, Groq, OpenAI y Anthropic)
              para generar respuestas automáticas en los chats de WhatsApp del Cliente. Al respecto:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-white/60">
              <li>Las respuestas generadas por IA pueden contener errores, inexactitudes o contenido inadecuado</li>
              <li>El Cliente es responsable de configurar correctamente el contexto, catálogo y restricciones del bot</li>
              <li>El Proveedor no garantiza que el bot responda correctamente en el 100% de los casos</li>
              <li>Los fragmentos de conversaciones necesarios para generar respuestas pueden ser procesados por los proveedores de IA según sus propias políticas de privacidad</li>
              <li>El Cliente acepta no usar el bot para generar contenido ilegal, engañoso, discriminatorio o que infrinja derechos de terceros</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">5. Registro y cuenta de usuario</h2>
            <p className="mb-3">
              Para utilizar el Servicio debe registrarse con información veraz y actualizada. El Cliente se compromete a:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-white/60">
              <li>Proporcionar información de registro exacta, completa y vigente</li>
              <li>Mantener la confidencialidad de sus credenciales de acceso</li>
              <li>Ser responsable de todas las actividades que ocurran bajo su cuenta</li>
              <li>Notificar de inmediato al Proveedor ante cualquier uso no autorizado de su cuenta</li>
              <li>No compartir su cuenta con terceros no autorizados</li>
              <li>Actualizar su información cuando ésta cambie</li>
            </ul>
            <p className="mt-3">
              El Proveedor se reserva el derecho de suspender o cancelar cuentas que proporcionen información falsa,
              que violen estos términos o que representen un riesgo para la seguridad del Servicio o de otros usuarios.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">6. Suscripción y pagos</h2>
            <p className="mb-3">
              El Servicio se ofrece bajo un modelo de suscripción mensual prepagada. Al suscribirse, el Cliente acepta:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-white/60">
              <li>El precio vigente es de <strong className="text-white/80">$24.000 COP por mes</strong>, sujeto a cambios con previo aviso de 30 días</li>
              <li>Los pagos son procesados por MercadoPago y se rigen también por sus términos y condiciones</li>
              <li>La suscripción se activa al confirmarse el pago por parte del procesador de pagos</li>
              <li>El acceso al Servicio continúa hasta el último día del período pagado, incluso si cancela antes</li>
              <li>El incumplimiento en el pago resultará en la suspensión del acceso al Servicio sin previo aviso</li>
              <li>Los precios están expresados en Pesos Colombianos (COP)</li>
              <li>El Proveedor podrá ofrecer descuentos, promociones o planes adicionales a su discreción</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">7. Política de reembolsos</h2>
            <p className="mb-3">
              Dada la naturaleza digital del Servicio y los costos de infraestructura asociados:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-white/60">
              <li><strong className="text-white/80">No se realizan reembolsos</strong> una vez procesado el pago, salvo las excepciones establecidas a continuación</li>
              <li>Si el Servicio presenta indisponibilidad total (no parcial) por más de 72 horas continuas en un mes, el Cliente puede solicitar un crédito proporcional para el siguiente mes</li>
              <li>Si el Proveedor decide discontinuar el Servicio completamente, se notificará con 60 días de anticipación y se realizará un reembolso proporcional de los días no utilizados</li>
              <li>Las suspensiones de cuentas de WhatsApp por parte de Meta no constituyen motivo de reembolso</li>
            </ul>
            <p className="mt-3 text-sm text-white/50">
              Las solicitudes de crédito o reembolso bajo las excepciones anteriores deben realizarse dentro de los
              15 días calendario siguientes al evento, contactando al Proveedor por WhatsApp.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">8. Uso aceptable</h2>
            <p className="mb-3">
              Al utilizar el Servicio, el Cliente se compromete expresamente a NO:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-white/60">
              <li>Enviar mensajes no solicitados (spam) o comunicaciones masivas a personas que no han dado su consentimiento</li>
              <li>Usar el Servicio para actividades ilegales, fraudulentas o que violen los derechos de terceros</li>
              <li>Intentar acceder sin autorización a sistemas, datos o cuentas de otros usuarios</li>
              <li>Distribuir malware, virus u otros códigos maliciosos a través del Servicio</li>
              <li>Infringir las Políticas de Uso Aceptable de WhatsApp / Meta</li>
              <li>Recopilar o almacenar datos personales de terceros sin su consentimiento expreso</li>
              <li>Usar el Servicio para acosar, intimidar, amenazar o discriminar a personas</li>
              <li>Hacer ingeniería inversa, descompilar o intentar extraer el código fuente del Servicio</li>
              <li>Revender, sublicenciar o ceder el acceso al Servicio a terceros sin autorización escrita del Proveedor</li>
              <li>Usar el Servicio para fines distintos a la gestión legítima de un negocio comercial</li>
            </ul>
            <p className="mt-3">
              El incumplimiento de cualquiera de estas prohibiciones puede resultar en la suspensión inmediata
              de la cuenta sin derecho a reembolso, y puede dar lugar a acciones legales.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">9. Mensajería masiva y cumplimiento anti-spam</h2>
            <p className="mb-3">
              La función de campañas de WhatsApp está diseñada para comunicaciones legítimas con clientes
              que han tenido contacto previo con el negocio. El Cliente asume la responsabilidad exclusiva de:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-white/60">
              <li>Obtener el consentimiento válido de cada destinatario antes de incluirlo en cualquier campaña</li>
              <li>Cumplir con la Ley 1581 de 2012 y el Decreto 1074 de 2015 en el manejo de datos personales de sus clientes</li>
              <li>Cumplir con la Ley 527 de 1999 sobre mensajes comerciales electrónicos</li>
              <li>Incluir mecanismos de opt-out (cancelar suscripción) en sus comunicaciones masivas</li>
              <li>Respetar los horarios razonables de envío y no saturar a los destinatarios</li>
              <li>No enviar contenido engañoso, falso o que induzca a error</li>
            </ul>
            <p className="mt-3 text-sm text-white/50">
              El Proveedor puede suspender el acceso a las campañas masivas si detecta patrones de uso que violen
              estas condiciones, sin previo aviso y sin derecho a reembolso.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">10. Contenido del usuario</h2>
            <p>
              El Cliente conserva todos los derechos sobre el contenido que cargue en la plataforma (catálogos,
              imágenes, descripciones de productos y servicios, conversaciones con sus clientes). Al subir contenido,
              el Cliente garantiza que: (a) tiene los derechos necesarios sobre dicho contenido; (b) su publicación
              no infringe derechos de propiedad intelectual, privacidad o cualquier otro derecho de terceros; y
              (c) el contenido no es ilegal, ofensivo o inapropiado. El Proveedor no monitorea el contenido subido
              por los usuarios, pero puede eliminarlo si recibe notificación válida de infracción.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">11. Propiedad intelectual</h2>
            <p>
              Todos los derechos de propiedad intelectual sobre el Servicio, incluyendo código fuente, diseño,
              logotipos, textos, algoritmos, metodologías y funcionalidades, son propiedad exclusiva del Proveedor.
              La suscripción otorga al Cliente únicamente una licencia de uso limitada, no exclusiva, intransferible
              y revocable para acceder al Servicio durante el período de vigencia de su suscripción. Queda
              expresamente prohibida la reproducción, distribución, modificación, ingeniería inversa o uso
              comercial no autorizado de cualquier elemento del Servicio.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">12. Confidencialidad</h2>
            <p>
              Ambas partes se comprometen a mantener la confidencialidad de la información no pública a la que tengan
              acceso en virtud de este acuerdo. El Proveedor no divulgará a terceros la información comercial,
              de clientes o conversaciones del negocio del Cliente, salvo requerimiento legal expreso de autoridad
              competente. Esta obligación de confidencialidad subsistirá por 2 años tras la terminación del acuerdo.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">13. Limitación de responsabilidad</h2>
            <p className="mb-3">
              En la máxima medida permitida por la ley colombiana, el Proveedor no será responsable por:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-white/60">
              <li>Pérdidas de datos derivadas de fallos técnicos, desastres naturales o causas de fuerza mayor</li>
              <li>Suspensiones de cuentas de WhatsApp por parte de Meta Platforms Inc.</li>
              <li>Lucro cesante, pérdida de clientes, pérdida de ingresos o daños indirectos de cualquier naturaleza</li>
              <li>Interrupciones del Servicio por mantenimiento programado o imprevisto</li>
              <li>Contenido generado por IA que resulte incorrecto, inadecuado o que cause perjuicios al Cliente o a sus clientes</li>
              <li>Contenido publicado por el Cliente que infrinja derechos de terceros</li>
              <li>Daños causados por el mal uso del Servicio por parte del Cliente o de terceros que accedan con sus credenciales</li>
              <li>Fallas en los servicios de terceros (proveedores de IA, procesadores de pago, hosting, etc.)</li>
            </ul>
            <p className="mt-3">
              <strong className="text-white/80">Tope de responsabilidad:</strong> La responsabilidad total máxima del
              Proveedor frente al Cliente no superará en ningún caso el monto pagado por la suscripción en el
              último mes calendario anterior al evento que generó el daño.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">14. Indemnización</h2>
            <p>
              El Cliente se compromete a defender, indemnizar y mantener indemne al Proveedor, sus colaboradores
              y representantes, frente a cualquier reclamación, demanda, pérdida, daño, costo o gasto (incluidos
              honorarios legales razonables) que surja de: (a) el uso del Servicio por parte del Cliente en violación
              de estos términos; (b) el contenido subido o generado por el Cliente; (c) la violación de derechos
              de terceros, incluidos clientes del negocio del Cliente; o (d) el incumplimiento de leyes aplicables,
              incluyendo las relacionadas con protección de datos y mensajería comercial.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">15. Fuerza mayor</h2>
            <p>
              Ninguna de las partes será responsable por el incumplimiento de sus obligaciones cuando dicho
              incumplimiento sea causado por eventos de fuerza mayor o caso fortuito, incluyendo pero no limitado a:
              desastres naturales, pandemias, cortes masivos de Internet, fallas de proveedores de infraestructura
              crítica, actos de gobierno, huelgas, o cualquier otro evento fuera del control razonable de la parte
              afectada. La parte que invoque la fuerza mayor deberá notificar a la otra en el menor tiempo posible
              y realizar sus mejores esfuerzos para mitigar el impacto.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">16. Disponibilidad del servicio</h2>
            <p>
              El Proveedor se esfuerza por mantener el Servicio disponible de forma continua, pero no garantiza
              una disponibilidad del 100%. El Servicio puede estar temporalmente no disponible por mantenimientos
              programados (con previo aviso cuando sea posible) o por causas fuera del control del Proveedor.
              En caso de interrupciones no programadas que excedan las 24 horas continuas en un mes calendario,
              el Cliente puede solicitar un crédito proporcional para el siguiente período de facturación, sujeto
              a verificación por parte del Proveedor.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">17. Terminación del acuerdo</h2>
            <p className="mb-3">
              Este acuerdo puede terminar de las siguientes formas:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-white/60">
              <li><strong className="text-white/80">Por el Cliente:</strong> cancelando la suscripción en cualquier momento. El acceso continúa hasta el final del período pagado</li>
              <li><strong className="text-white/80">Por el Proveedor — causa justificada:</strong> suspensión inmediata ante violación grave de estos términos, actividades ilegales o riesgo para otros usuarios, sin derecho a reembolso</li>
              <li><strong className="text-white/80">Por el Proveedor — discontinuación:</strong> con 60 días de preaviso y reembolso proporcional de días no utilizados</li>
              <li><strong className="text-white/80">Por falta de pago:</strong> suspensión del acceso tras el vencimiento del período pagado, con posibilidad de reactivación al regularizar el pago</li>
            </ul>
            <p className="mt-3">
              Tras la terminación, los datos del Cliente serán conservados por 30 días para eventual recuperación,
              luego de lo cual serán eliminados permanentemente según lo establecido en la Política de Privacidad.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">18. Modificaciones a los términos</h2>
            <p>
              El Proveedor se reserva el derecho de modificar estos Términos en cualquier momento. Los cambios
              materiales (aquellos que afecten derechos u obligaciones sustanciales del Cliente) serán notificados
              con al menos 30 días de anticipación mediante el correo electrónico registrado o a través de la
              plataforma. Los cambios menores (correcciones, aclaraciones o mejoras de redacción) pueden realizarse
              sin previo aviso. El uso continuado del Servicio después de la notificación constituye aceptación de
              los nuevos términos. Si el Cliente no acepta los cambios, puede cancelar su suscripción antes de la
              fecha de vigencia de los mismos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">19. Divisibilidad e integralidad</h2>
            <p>
              Si alguna cláusula de estos Términos es declarada inválida o inaplicable por un tribunal competente,
              las demás cláusulas permanecerán vigentes en su totalidad. Estos Términos, junto con la Política
              de Privacidad, constituyen el acuerdo completo entre las partes respecto al uso del Servicio y
              reemplazan cualquier comunicación, negociación o acuerdo previo sobre el mismo objeto.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">20. Ley aplicable y resolución de conflictos</h2>
            <p>
              Estos Términos se rigen por las leyes de la República de Colombia, en particular por el Código de
              Comercio, la Ley 527 de 1999, la Ley 1480 de 2011 (Estatuto del Consumidor) y demás normas aplicables.
              En caso de controversia, las partes acuerdan agotar primero una etapa de negociación directa de al
              menos 15 días hábiles. Si no se llega a un acuerdo, la disputa será resuelta por los jueces
              competentes de la República de Colombia, con renuncia expresa a cualquier otro fuero.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">21. Contacto</h2>
            <p>
              Para consultas sobre estos Términos, reclamos o cualquier comunicación legal, contáctenos por
              WhatsApp al{' '}
              <a href="https://wa.me/573142378407" target="_blank" rel="noopener noreferrer"
                className="text-[#D4FF00] hover:underline">+57 314 237 8407</a>
              {' '}o a través del portafolio del desarrollador en{' '}
              <a href="https://alex-rodriguez-portfol.vercel.app/" target="_blank" rel="noopener noreferrer"
                className="text-[#D4FF00] hover:underline">alex-rodriguez-portfol.vercel.app</a>.
              Responderemos en un plazo máximo de 5 días hábiles.
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
