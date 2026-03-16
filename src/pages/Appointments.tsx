import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Customer {
  customerId: string;
  name: string | null;
  phone: string;
  cedula: string | null;
  city: string | null;
}

interface Appointment {
  appointmentId: string;
  type: 'cita' | 'visita_tecnica' | 'otro';
  scheduledAt: string;
  description: string | null;
  address: string | null;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes: string | null;
  customer: Customer;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  cita:          { label: 'Cita',          icon: '📅' },
  visita_tecnica:{ label: 'Visita técnica', icon: '🔧' },
  otro:          { label: 'Agendamiento',  icon: '📌' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Pendiente',  color: '#b45309', bg: '#fef3c7' },
  confirmed: { label: 'Confirmada', color: '#1d4ed8', bg: '#dbeafe' },
  completed: { label: 'Completada', color: '#15803d', bg: '#dcfce7' },
  cancelled: { label: 'Cancelada',  color: '#b91c1c', bg: '#fee2e2' },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota',
  });
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    timeZone: 'America/Bogota',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CO', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota',
  });
}

// ─── Componentes pequeños ─────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: '#374151', bg: '#f3f4f6' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: 9999,
      fontSize: 12,
      fontWeight: 500,
      color: cfg.color,
      background: cfg.bg,
    }}>
      {cfg.label}
    </span>
  );
}

function StatsCard({ icon, label, value, color }: {
  icon: string; label: string; value: number; color: string;
}) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      padding: '16px 20px',
      flex: 1,
      minWidth: 130,
    }}>
      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 600, color }}>{value}</div>
      <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, todayCount: 0, upcoming: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [updating, setUpdating] = useState(false);

  // ── Carga ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (filterStatus) params.status = filterStatus;
      if (filterType)   params.type   = filterType;

      const [apptRes, statsRes] = await Promise.all([
        api.get('/appointments', { params }),
        api.get('/appointments/stats'),
      ]);

      setAppointments(apptRes.data);
      setStats(statsRes.data);
    } catch {
      setError('Error cargando agendamientos. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType]);

  useEffect(() => { load(); }, [load]);

  // ── Cambiar estado de cita ────────────────────────────────────────────────

  const updateStatus = async (appt: Appointment, newStatus: string) => {
    setUpdating(true);
    try {
      await api.patch(`/appointments/${appt.appointmentId}`, { status: newStatus });
      setAppointments(prev =>
        prev.map(a => a.appointmentId === appt.appointmentId
          ? { ...a, status: newStatus as any }
          : a
        )
      );
      if (selected?.appointmentId === appt.appointmentId) {
        setSelected(prev => prev ? { ...prev, status: newStatus as any } : null);
      }
    } catch {
      alert('Error actualizando el estado. Intenta de nuevo.');
    } finally {
      setUpdating(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto', fontFamily: 'inherit' }}>

      {/* Encabezado */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#111827', margin: 0 }}>
          Agendamientos
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
          Citas y visitas técnicas gestionadas por la IA
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatsCard icon="📋" label="Total"      value={stats.total}      color="#111827" />
        <StatsCard icon="⏳" label="Pendientes" value={stats.pending}    color="#b45309" />
        <StatsCard icon="📅" label="Hoy"        value={stats.todayCount} color="#1d4ed8" />
        <StatsCard icon="🔜" label="Próximas"   value={stats.upcoming}   color="#15803d" />
      </div>

      {/* Filtros */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap',
        background: '#fff', border: '1px solid #e5e7eb',
        borderRadius: 10, padding: '12px 16px',
      }}>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={selectStyle}
        >
          <option value="">Todos los estados</option>
          <option value="pending">Pendientes</option>
          <option value="confirmed">Confirmadas</option>
          <option value="completed">Completadas</option>
          <option value="cancelled">Canceladas</option>
        </select>

        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          style={selectStyle}
        >
          <option value="">Todos los tipos</option>
          <option value="cita">Citas</option>
          <option value="visita_tecnica">Visitas técnicas</option>
          <option value="otro">Otros</option>
        </select>

        <button onClick={load} style={btnSecondaryStyle} disabled={loading}>
          {loading ? 'Cargando...' : '🔄 Actualizar'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: '#fee2e2', color: '#b91c1c',
          borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 14,
        }}>
          {error}
        </div>
      )}

      {/* Tabla + Detalle */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

        {/* Tabla */}
        <div style={{
          flex: 1, background: '#fff',
          border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden',
        }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
              Cargando agendamientos...
            </div>
          ) : appointments.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📅</div>
              <div>No hay agendamientos aún.</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                La IA los crea automáticamente cuando un cliente agenda por WhatsApp.
              </div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {['Tipo', 'Cliente', 'Fecha', 'Hora', 'Estado', ''].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {appointments.map(appt => {
                  const typeInfo = TYPE_LABELS[appt.type] ?? TYPE_LABELS.otro;
                  const isSelected = selected?.appointmentId === appt.appointmentId;
                  return (
                    <tr
                      key={appt.appointmentId}
                      onClick={() => setSelected(isSelected ? null : appt)}
                      style={{
                        borderBottom: '1px solid #f3f4f6',
                        cursor: 'pointer',
                        background: isSelected ? '#eff6ff' : 'transparent',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => {
                        if (!isSelected)(e.currentTarget as HTMLElement).style.background = '#f9fafb';
                      }}
                      onMouseLeave={e => {
                        if (!isSelected)(e.currentTarget as HTMLElement).style.background = 'transparent';
                      }}
                    >
                      <td style={tdStyle}>
                        <span style={{ fontSize: 18 }}>{typeInfo.icon}</span>{' '}
                        <span style={{ fontSize: 13, color: '#374151' }}>{typeInfo.label}</span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>
                          {appt.customer.name ?? 'Sin nombre'}
                        </div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>
                          {appt.customer.phone}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 13 }}>{formatDateShort(appt.scheduledAt)}</span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>
                          {formatTime(appt.scheduledAt)}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <StatusBadge status={appt.status} />
                      </td>
                      <td style={tdStyle}>
                        <span style={{ color: '#6b7280', fontSize: 18 }}>›</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Panel de detalle */}
        {selected && (
          <div style={{
            width: 320, background: '#fff',
            border: '1px solid #e5e7eb', borderRadius: 12, padding: 20,
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 20 }}>
                  {TYPE_LABELS[selected.type]?.icon ?? '📌'}
                </div>
                <div style={{ fontWeight: 600, fontSize: 15, marginTop: 4 }}>
                  {TYPE_LABELS[selected.type]?.label ?? 'Agendamiento'}
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#6b7280' }}
              >
                ✕
              </button>
            </div>

            <StatusBadge status={selected.status} />

            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <DetailRow icon="📅" label="Fecha y hora" value={formatDate(selected.scheduledAt)} />
              <DetailRow icon="👤" label="Cliente" value={selected.customer.name ?? 'Sin nombre'} />
              <DetailRow icon="📱" label="Teléfono" value={selected.customer.phone} />
              {selected.customer.cedula && (
                <DetailRow icon="🪪" label="Cédula" value={selected.customer.cedula} />
              )}
              {selected.customer.city && (
                <DetailRow icon="🏙️" label="Ciudad" value={selected.customer.city} />
              )}
              {selected.description && (
                <DetailRow icon="📝" label="Descripción" value={selected.description} />
              )}
              {selected.address && (
                <DetailRow icon="📍" label="Dirección" value={selected.address} />
              )}
              {selected.notes && (
                <DetailRow icon="🗒️" label="Notas" value={selected.notes} />
              )}
              <DetailRow icon="🕐" label="Creado" value={formatDate(selected.createdAt)} />
            </div>

            {/* Acciones de estado */}
            <div style={{ marginTop: 20, borderTop: '1px solid #f3f4f6', paddingTop: 16 }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, fontWeight: 500 }}>
                CAMBIAR ESTADO
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {['pending', 'confirmed', 'completed', 'cancelled'].map(s => (
                  s !== selected.status && (
                    <button
                      key={s}
                      onClick={() => updateStatus(selected, s)}
                      disabled={updating}
                      style={{
                        ...btnStatusStyle,
                        background: STATUS_CONFIG[s]?.bg ?? '#f3f4f6',
                        color: STATUS_CONFIG[s]?.color ?? '#374151',
                        opacity: updating ? 0.6 : 1,
                      }}
                    >
                      {STATUS_CONFIG[s]?.label ?? s}
                    </button>
                  )
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-componente ───────────────────────────────────────────────────────────

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 14, color: '#111827', marginTop: 2 }}>{value}</div>
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const selectStyle: React.CSSProperties = {
  padding: '7px 12px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  fontSize: 14,
  color: '#374151',
  background: '#fff',
  cursor: 'pointer',
  outline: 'none',
};

const btnSecondaryStyle: React.CSSProperties = {
  padding: '7px 16px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  fontSize: 14,
  background: '#fff',
  color: '#374151',
  cursor: 'pointer',
  fontWeight: 500,
};

const btnStatusStyle: React.CSSProperties = {
  padding: '7px 12px',
  borderRadius: 8,
  border: 'none',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  textAlign: 'left',
};

const thStyle: React.CSSProperties = {
  padding: '10px 16px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  verticalAlign: 'middle',
};
