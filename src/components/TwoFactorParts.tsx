import { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Copy, Download, Check } from 'lucide-react';

/** QR para la app de autenticación y, debajo, la clave para escribirla a mano. */
export function TotpQr({ otpauthUri, secret }: { otpauthUri: string; secret: string }) {
  // En grupos de 4: se dicta y se copia mejor.
  const grouped = secret.match(/.{1,4}/g)?.join(' ') ?? secret;
  return (
    // Apilado siempre: también cabe en la tarjeta estrecha del login del superadmin.
    <div className="flex flex-col items-center gap-4">
      <div className="rounded-xl bg-white p-3 flex-shrink-0">
        <QRCodeCanvas value={otpauthUri} size={168} level="M" aria-label="Código QR para la app de autenticación" />
      </div>
      <div className="text-sm space-y-2 w-full">
        <p className="text-txt-secondary">
          Escanéalo con Google Authenticator, Microsoft Authenticator u otra app de códigos.
        </p>
        <p className="text-txt-tertiary text-xs">Si no puedes escanearlo, escribe esta clave en la app:</p>
        <code className="block font-mono text-xs text-center text-txt-primary bg-surface-overlay rounded-lg px-3 py-2 select-all">

          {grouped}
        </code>
      </div>
    </div>
  );
}

/** Códigos de recuperación: se muestran una sola vez, con copiar y descargar. */
export function RecoveryCodes({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false);
  const text = codes.join('\n');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sin permiso de portapapeles: queda descargar o copiarlos a mano.
    }
  };

  const download = () => {
    const blob = new Blob(
      [`Códigos de recuperación de Stockup Messages\nCada uno sirve una sola vez.\n\n${text}\n`],
      { type: 'text/plain;charset=utf-8' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'codigos-recuperacion-stockup.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-txt-secondary">
        Guárdalos fuera del correo y del teléfono (por ejemplo, impresos o en un gestor de contraseñas).
        Cada uno sirve una sola vez si pierdes el teléfono. <strong>No se volverán a mostrar.</strong>
      </p>
      <ul className="grid grid-cols-2 gap-2 font-mono text-sm text-txt-primary bg-surface-overlay rounded-xl p-4">
        {codes.map((c) => <li key={c}>{c}</li>)}
      </ul>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copy}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-surface-overlay text-txt-primary">
          {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          {copied ? 'Copiados' : 'Copiar'}
        </button>
        <button type="button" onClick={download}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-surface-overlay text-txt-primary">
          <Download size={14} aria-hidden="true" />
          Descargar .txt
        </button>
      </div>
    </div>
  );
}
