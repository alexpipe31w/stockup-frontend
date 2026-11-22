import { useState } from 'react';
import {
  apiMessage,
  deleteWaCloudAccount,
  getWaCloudAccount,
  saveWaCloudAccount,
  verifyWaCloudAccount,
  type SaveWaCloudAccount,
  type WaCloudAccount,
} from '../services/api';

const ic =
  'w-full px-4 py-3 rounded-xl border border-border-default bg-surface-elevated focus:outline-none focus:ring-2 focus:bg-surface transition text-sm text-txt-primary placeholder:text-txt-tertiary';

const STATUS_TEXT: Record<WaCloudAccount['status'], { label: string; cls: string }> = {
  unverified: { label: 'Sin verificar', cls: 'bg-surface-overlay text-txt-secondary' },
  ok: { label: 'Verificado', cls: 'bg-green-50 text-green-700' },
  error: { label: 'Error', cls: 'bg-red-50 text-red-600' },
};

const httpStatus = (err: unknown) =>
  (err as { response?: { status?: number } })?.response?.status;

/**
 * Bloque 8a: credenciales de la API oficial de WhatsApp (Meta Cloud API). Solo se guardan y
 * se comprueban; el cambio de proveedor llega con 8b/8c. Plegado por defecto: la carga se
 * hace al abrirlo.
 */
export default function WhatsAppCloudPanel({ storeId }: { storeId: string }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState<WaCloudAccount | null>(null);
  const [form, setForm] = useState({ phoneNumberId: '', wabaId: '', accessToken: '', appSecret: '' });
  const [busy, setBusy] = useState<'save' | 'verify' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const applyAccount = (acc: WaCloudAccount | null) => {
    setAccount(acc);
    setForm({
      phoneNumberId: acc?.phoneNumberId ?? '',
      wabaId: acc?.wabaId ?? '',
      accessToken: '',
      appSecret: '',
    });
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getWaCloudAccount(storeId);
      applyAccount(res.data);
      setLoaded(true);
    } catch (err) {
      if (httpStatus(err) === 404) {
        applyAccount(null);
        setLoaded(true);
      } else {
        setError(apiMessage(err, 'No se pudieron cargar las credenciales. Intenta de nuevo.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !loaded && !loading) void load();
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('save');
    setError(null);
    setNotice(null);
    const body: SaveWaCloudAccount = {
      phoneNumberId: form.phoneNumberId.trim(),
      wabaId: form.wabaId.trim(),
      ...(form.accessToken.trim() && { accessToken: form.accessToken.trim() }),
      ...(form.appSecret.trim() && { appSecret: form.appSecret.trim() }),
    };
    try {
      const res = await saveWaCloudAccount(storeId, body);
      applyAccount(res.data);
      setNotice(res.data.status === 'ok' ? 'Guardado.' : 'Guardado. Ahora pulsa Verificar para comprobarlo con Meta.');
    } catch (err) {
      setError(apiMessage(err, 'No se pudieron guardar las credenciales.'));
    } finally {
      setBusy(null);
    }
  };

  const verify = async () => {
    setBusy('verify');
    setError(null);
    setNotice(null);
    try {
      const res = await verifyWaCloudAccount(storeId);
      setAccount(res.data);
    } catch (err) {
      setError(apiMessage(err, 'No se pudo verificar. Intenta de nuevo.'));
      // 409: las credenciales cambiaron en otra sesión; recargar muestra el estado real.
      if (httpStatus(err) === 409) void load();
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy('delete');
    setError(null);
    setNotice(null);
    try {
      await deleteWaCloudAccount(storeId);
      applyAccount(null);
      setConfirmDelete(false);
      setNotice('Credenciales borradas.');
    } catch (err) {
      setError(apiMessage(err, 'No se pudieron borrar las credenciales.'));
    } finally {
      setBusy(null);
    }
  };

  const creating = account === null;
  const canSave =
    /^\d{5,32}$/.test(form.phoneNumberId.trim()) &&
    /^\d{5,32}$/.test(form.wabaId.trim()) &&
    (!creating || (form.accessToken.trim() !== '' && form.appSecret.trim() !== ''));
  const status = account ? STATUS_TEXT[account.status] : null;

  return (
    <div className="mt-6 bg-surface rounded-2xl border border-border-subtle shadow-sm">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 p-6 text-left"
      >
        <div>
          <h2 className="font-semibold text-txt-primary">API oficial de Meta (beta)</h2>
          <p className="text-sm text-txt-tertiary mt-0.5">
            Conexión sin QR con la API de WhatsApp Business. Por ahora solo se guardan y comprueban las credenciales.
          </p>
        </div>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`shrink-0 text-txt-tertiary transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="px-6 pb-6">
          {loading && <p className="text-sm text-txt-secondary">Cargando…</p>}

          {!loading && !loaded && error && (
            <div className="flex items-center justify-between gap-3 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
              <span>{error}</span>
              <button type="button" onClick={() => void load()} className="font-semibold underline">
                Reintentar
              </button>
            </div>
          )}

          {loaded && (
            <>
              {account && status && (
                <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
                  <span className={`px-2.5 py-1 rounded-full font-medium ${status.cls}`}>{status.label}</span>
                  {account.status === 'ok' && (
                    <span className="text-txt-secondary">
                      {account.displayPhone}
                      {account.verifiedName ? ` · ${account.verifiedName}` : ''}
                    </span>
                  )}
                  {account.status === 'error' && account.lastError && (
                    <span className="text-red-600">{account.lastError}</span>
                  )}
                </div>
              )}

              <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-sm text-txt-secondary">
                  Phone number ID
                  <input
                    className={`${ic} mt-1`}
                    inputMode="numeric"
                    autoComplete="off"
                    value={form.phoneNumberId}
                    onChange={(e) => setForm({ ...form, phoneNumberId: e.target.value })}
                  />
                </label>
                <label className="text-sm text-txt-secondary">
                  WhatsApp Business Account ID
                  <input
                    className={`${ic} mt-1`}
                    inputMode="numeric"
                    autoComplete="off"
                    value={form.wabaId}
                    onChange={(e) => setForm({ ...form, wabaId: e.target.value })}
                  />
                </label>
                <label className="text-sm text-txt-secondary sm:col-span-2">
                  Token de acceso (usuario del sistema)
                  <input
                    className={`${ic} mt-1`}
                    type="password"
                    autoComplete="new-password"
                    placeholder={account ? `Dejar vacío para no cambiarlo (actual ${account.accessTokenHint})` : ''}
                    value={form.accessToken}
                    onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
                  />
                </label>
                <label className="text-sm text-txt-secondary sm:col-span-2">
                  App secret
                  <input
                    className={`${ic} mt-1`}
                    type="password"
                    autoComplete="new-password"
                    placeholder={account ? 'Dejar vacío para no cambiarlo' : '32 caracteres'}
                    value={form.appSecret}
                    onChange={(e) => setForm({ ...form, appSecret: e.target.value })}
                  />
                </label>

                {error && (
                  <p className="sm:col-span-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
                )}
                {notice && (
                  <p className="sm:col-span-2 text-sm text-green-700 bg-green-50 rounded-xl px-4 py-3">{notice}</p>
                )}

                <div className="sm:col-span-2 flex flex-wrap gap-3 mt-1">
                  <button
                    type="submit"
                    disabled={!canSave || busy !== null}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#0A0A0F] disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #D4FF00, #A3CC00)' }}
                  >
                    {busy === 'save' ? 'Guardando…' : 'Guardar'}
                  </button>
                  {account && (
                    <button
                      type="button"
                      onClick={() => void verify()}
                      disabled={busy !== null}
                      className="px-5 py-2.5 rounded-xl border border-border-default text-txt-primary text-sm font-semibold hover:bg-surface-elevated transition disabled:opacity-50"
                    >
                      {busy === 'verify' ? 'Verificando…' : 'Verificar con Meta'}
                    </button>
                  )}
                  {account && !confirmDelete && (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      disabled={busy !== null}
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition disabled:opacity-50 sm:ml-auto"
                    >
                      Borrar credenciales
                    </button>
                  )}
                  {account && confirmDelete && (
                    <span className="flex items-center gap-2 sm:ml-auto text-sm">
                      <span className="text-txt-secondary">¿Borrar?</span>
                      <button
                        type="button"
                        onClick={() => void remove()}
                        disabled={busy !== null}
                        className="px-4 py-2 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition"
                      >
                        {busy === 'delete' ? 'Borrando…' : 'Sí, borrar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        disabled={busy !== null}
                        className="px-4 py-2 rounded-xl font-semibold text-txt-secondary hover:bg-surface-elevated transition"
                      >
                        No
                      </button>
                    </span>
                  )}
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
