import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { connectWhatsApp, getWhatsAppQR, getWhatsAppStatus, disconnectWhatsApp } from '../services/api';
import { QRCodeCanvas } from 'qrcode.react';

export default function WhatsAppPage() {
  const { storeId } = useAuth();
  const [connected, setConnected] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const res = await getWhatsAppStatus(storeId);
      setConnected(res.data.connected);
      if (res.data.connected) setQr(null);
    } catch {}
  }, [storeId]);

  const fetchQR = useCallback(async () => {
    try {
      const res = await getWhatsAppQR(storeId);
      if (res.data.qr) setQr(res.data.qr);
    } catch {}
  }, [storeId]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await checkStatus();
      setLoading(false);
    };
    init();
  }, [checkStatus]);

  // Poll QR every 3s while not connected
  useEffect(() => {
    if (connected || loading) return;
    fetchQR();
    const interval = setInterval(async () => {
      await checkStatus();
      await fetchQR();
    }, 3000);
    return () => clearInterval(interval);
  }, [connected, loading, checkStatus, fetchQR]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await connectWhatsApp(storeId);
      await fetchQR();
    } catch {} finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await disconnectWhatsApp(storeId);
      setConnected(false);
      setQr(null);
    } catch {} finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="flex items-center gap-3 text-slate-500">
          <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 11-6.219-8.56"/>
          </svg>
          Verificando estado...
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">WhatsApp</h1>
      <p className="text-slate-500 mb-8">Conecta tu número de WhatsApp para activar el bot</p>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 flex flex-col items-center gap-6">

        {/* Estado */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
          connected
            ? 'bg-green-50 text-green-600'
            : 'bg-orange-50 text-orange-500'
        }`}>
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-orange-400'} animate-pulse`}/>
          {connected ? 'Conectado' : 'Desconectado'}
        </div>

        {connected ? (
          <>
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.5">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.22 1.18 2 2 0 012.18 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.56-.56a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                </svg>
              </div>
              <p className="text-slate-700 font-medium">Tu WhatsApp está activo</p>
              <p className="text-slate-400 text-sm">El bot está respondiendo mensajes automáticamente</p>
            </div>

            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="px-6 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition disabled:opacity-50"
            >
              {disconnecting ? 'Desconectando...' : 'Desconectar WhatsApp'}
            </button>
          </>
        ) : (
          <>
            {!qr ? (
              <>
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.22 1.18 2 2 0 012.18 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.56-.56a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                    </svg>
                  </div>
                  <p className="text-slate-700 font-medium">WhatsApp no conectado</p>
                  <p className="text-slate-400 text-sm">Haz clic en conectar para generar el código QR</p>
                </div>

                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="px-6 py-3 rounded-xl text-white text-sm font-semibold transition disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #9333ea)' }}
                >
                  {connecting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M21 12a9 9 0 11-6.219-8.56"/>
                      </svg>
                      Generando QR...
                    </span>
                  ) : 'Conectar WhatsApp'}
                </button>
              </>
            ) : (
              <>
                <div className="text-center">
                  <p className="text-slate-700 font-medium mb-1">Escanea este código QR</p>
                  <p className="text-slate-400 text-sm">Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo</p>
                </div>

                {/* QR renderizado como texto en monospace */}
                <div className="bg-white border-2 border-slate-100 rounded-xl p-4 overflow-auto max-w-full">
                    <QRCodeCanvas value={qr} size={240} />
                </div>

                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                  </svg>
                  Actualizando automáticamente...
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
