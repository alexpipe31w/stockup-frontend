import * as XLSX from 'xlsx';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (iso: string) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
};

const fmtTime = (iso: string) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
};

const PAY_LABELS: Record<string, string> = {
  CASH: 'Efectivo', efectivo: 'Efectivo',
  TRANSFER: 'Transferencia', transferencia: 'Transferencia',
  CARD: 'Tarjeta', card: 'Tarjeta',
  OTHER: 'Otro', otro: 'Otro',
  nequi: 'Nequi', daviplata: 'Daviplata',
};

const TYPE_LABELS: Record<string, string> = {
  product: 'Producto', food: 'Alimento', service: 'Servicio',
};

function setColWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws['!cols'] = widths.map(w => ({ wch: w }));
}

// Make a numeric cell so Excel treats it as a number (for sums, charts, etc.)
function numCell(n: number): XLSX.CellObject {
  return { t: 'n', v: n, z: '#,##0' };
}

function headerRow(cols: string[]): XLSX.CellObject[] {
  return cols.map(c => ({ t: 's', v: c }));
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * orders      – product and/or service orders (type field distinguishes them)
 * appointments – appointment records (optional, separate sheet)
 * storeName   – label for filename
 */
export function exportCashReport(
  orders: any[],
  appointments: any[],
  storeName = 'Tienda',
  dateRange?: { from?: string; to?: string },
) {
  const wb = XLSX.utils.book_new();
  const now = new Date().toLocaleString('es-CO');
  const rangeLabel = dateRange?.from && dateRange?.to
    ? `${fmtDate(dateRange.from)} — ${fmtDate(dateRange.to)}`
    : fmtDate(new Date().toISOString().slice(0, 10));

  // ── Normalise: include ALL orders (manual + service + product, any status)
  const allOrders = (orders ?? []).filter(o => Number(o.total ?? 0) > 0);

  const productOrders = allOrders.filter(o => (o.type ?? 'product') !== 'service');
  const serviceOrders = allOrders.filter(o => (o.type ?? 'product') === 'service');

  const totalProductos = productOrders.reduce((s, o) => s + Number(o.total ?? 0), 0);
  const totalServicios = serviceOrders.reduce((s, o) => s + Number(o.total ?? 0), 0);
  const totalGeneral   = totalProductos + totalServicios;

  // ── Método de pago breakdown ──────────────────────────────────────────────
  const byMethod = allOrders.reduce<Record<string, number>>((acc, o) => {
    const m = (o.manualPaymentMethod ?? 'otro').toUpperCase();
    acc[m] = (acc[m] ?? 0) + Number(o.total ?? 0);
    return acc;
  }, {});

  // ─────────────────────────────────────────────────────────────────────────
  // HOJA 1 — RESUMEN
  // ─────────────────────────────────────────────────────────────────────────
  const fmt = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

  const summaryData: any[][] = [
    ['REPORTE DE CAJA — ' + storeName.toUpperCase(), ''],
    ['Generado el', now],
    ['Período', rangeLabel],
    ['', ''],

    ['RESUMEN GENERAL', ''],
    ['Total de ventas (registros)',  allOrders.length],
    ['', ''],

    ['VENTAS DE PRODUCTOS', ''],
    ['Cantidad de ventas',           productOrders.length],
    ['Total ingresos',               fmt(totalProductos)],
    ['', ''],

    ['VENTAS DE SERVICIOS', ''],
    ['Cantidad de servicios',        serviceOrders.length],
    ['Total ingresos',               fmt(totalServicios)],
    ['', ''],

    ['MÉTODOS DE PAGO', ''],
    ...Object.entries(byMethod).map(([m, v]) => [PAY_LABELS[m] ?? m, fmt(v)]),
    ['', ''],

    ['TOTAL GENERAL', fmt(totalGeneral)],
  ];

  const wsResumen = XLSX.utils.aoa_to_sheet(summaryData);
  wsResumen['!cols'] = [{ wch: 30 }, { wch: 24 }];
  wsResumen['!merges'] = [
    { s: { r: 0,  c: 0 }, e: { r: 0,  c: 1 } },
    { s: { r: 4,  c: 0 }, e: { r: 4,  c: 1 } },
    { s: { r: 7,  c: 0 }, e: { r: 7,  c: 1 } },
    { s: { r: 11, c: 0 }, e: { r: 11, c: 1 } },
    { s: { r: 15, c: 0 }, e: { r: 15, c: 1 } },
  ];
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

  // ─────────────────────────────────────────────────────────────────────────
  // HOJA 2 — VENTAS PRODUCTOS
  // ─────────────────────────────────────────────────────────────────────────
  if (productOrders.length > 0) {
    const cols = ['Fecha', 'Hora', 'N° Orden', 'Cliente', 'Teléfono', 'Estado', 'Productos', 'Método de Pago', 'Subtotal', 'Descuento %', 'Total'];
    const rows: any[][] = productOrders.map(o => {
      const items = (o.orderItems ?? [])
        .map((it: any) => `${it.product?.name ?? it.description ?? 'Item'} x${it.quantity ?? 1}`)
        .join(' | ');
      const method = (o.manualPaymentMethod ?? '').toUpperCase();
      return [
        fmtDate(o.createdAt),
        fmtTime(o.createdAt),
        (o.orderId ?? '').slice(-8).toUpperCase(),
        o.customer?.name ?? 'Sin nombre',
        o.customer?.phone ?? '',
        o.status ?? 'manual',
        items,
        (PAY_LABELS[method] ?? method) || '—',
        numCell(Number(o.subtotal ?? o.total ?? 0)),
        Number(o.discountPercent ?? 0),
        numCell(Number(o.total ?? 0)),
      ];
    });

    // Total row
    const totalCol = cols.indexOf('Total');
    const subtotalCol = cols.indexOf('Subtotal');
    const totalsRow: any[] = cols.map((_, i) => {
      if (i === 0) return 'TOTAL';
      if (i === totalCol)    return numCell(totalProductos);
      if (i === subtotalCol) return numCell(productOrders.reduce((s, o) => s + Number(o.subtotal ?? o.total ?? 0), 0));
      return '';
    });

    const wsP = XLSX.utils.aoa_to_sheet([cols, ...rows, [], totalsRow]);
    setColWidths(wsP, [12, 8, 10, 22, 16, 12, 40, 16, 14, 12, 14]);
    XLSX.utils.book_append_sheet(wb, wsP, 'Ventas Productos');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HOJA 3 — VENTAS SERVICIOS
  // ─────────────────────────────────────────────────────────────────────────
  if (serviceOrders.length > 0) {
    const cols = ['Fecha', 'Hora', 'N° Orden / Ref', 'Cliente', 'Teléfono', 'Servicio', 'Método de Pago', 'Total', 'Ref. Cita', 'Notas'];
    const rows: any[][] = serviceOrders.map(o => {
      const serviceName = (o.orderItems ?? [])[0]?.service?.name
        ?? (o.orderItems ?? [])[0]?.description
        ?? o.description
        ?? 'Servicio';
      const method = (o.manualPaymentMethod ?? '').toUpperCase();
      const ref = o.appointmentId ?? o.orderId ?? '';
      return [
        fmtDate(o.createdAt),
        fmtTime(o.createdAt),
        (o.orderId ?? '').slice(-8).toUpperCase(),
        o.customer?.name ?? 'Sin nombre',
        o.customer?.phone ?? '',
        serviceName,
        (PAY_LABELS[method] ?? method) || '—',
        numCell(Number(o.total ?? o.amount ?? 0)),
        ref ? '#' + ref.slice(-6).toUpperCase() : '—',
        o.notes ?? '',
      ];
    });

    const totalRow: any[] = ['TOTAL', '', '', '', '', '', '', numCell(totalServicios), '', ''];

    const wsS = XLSX.utils.aoa_to_sheet([cols, ...rows, [], totalRow]);
    setColWidths(wsS, [12, 8, 14, 22, 16, 28, 16, 14, 12, 30]);
    XLSX.utils.book_append_sheet(wb, wsS, 'Ventas Servicios');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HOJA 4 — TODAS LAS VENTAS (combinado)
  // ─────────────────────────────────────────────────────────────────────────
  if (allOrders.length > 0) {
    const cols = ['Fecha', 'Hora', 'N° Orden', 'Cliente', 'Teléfono', 'Tipo', 'Descripción', 'Método de Pago', 'Total'];
    const rows: any[][] = [...allOrders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(o => {
        const description = (o.orderItems ?? [])
          .map((it: any) => it.product?.name ?? it.service?.name ?? it.description ?? 'Item')
          .join(', ') || o.description || '—';
        const method = (o.manualPaymentMethod ?? '').toUpperCase();
        return [
          fmtDate(o.createdAt),
          fmtTime(o.createdAt),
          (o.orderId ?? '').slice(-8).toUpperCase(),
          o.customer?.name ?? 'Sin nombre',
          o.customer?.phone ?? '',
          TYPE_LABELS[o.type ?? 'product'] ?? o.type ?? 'Producto',
          description,
          (PAY_LABELS[method] ?? method) || '—',
          numCell(Number(o.total ?? o.amount ?? 0)),
        ];
      });

    const totalRow: any[] = ['TOTAL', '', '', '', '', '', '', '', numCell(totalGeneral)];

    const wsAll = XLSX.utils.aoa_to_sheet([cols, ...rows, [], totalRow]);
    setColWidths(wsAll, [12, 8, 12, 22, 16, 12, 40, 16, 14]);
    XLSX.utils.book_append_sheet(wb, wsAll, 'Todas las ventas');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HOJA 5 — CITAS (solo si se pasan)
  // ─────────────────────────────────────────────────────────────────────────
  const validAppts = (appointments ?? []).filter(a => a.scheduledAt);
  if (validAppts.length > 0) {
    const STATUS_APPT: Record<string, string> = {
      PENDING: 'Pendiente', CONFIRMED: 'Confirmada', IN_PROGRESS: 'En progreso',
      COMPLETED: 'Completada', CANCELLED: 'Cancelada', NO_SHOW: 'No asistió',
    };
    const cols = ['Fecha Cita', 'Hora', 'Cliente', 'Teléfono', 'Servicio', 'Estado', 'Profesional', 'Precio', 'Notas'];
    const rows: any[][] = validAppts.map((a: any) => [
      fmtDate(a.scheduledAt),
      fmtTime(a.scheduledAt),
      a.customer?.name ?? 'Sin cliente',
      a.customer?.phone ?? '',
      a.service?.name ?? '',
      STATUS_APPT[a.status] ?? a.status ?? '',
      a.staff?.name ?? '—',
      numCell(Number(a.agreedPrice ?? a.price ?? 0)),
      a.notes ?? '',
    ]);

    const wsA = XLSX.utils.aoa_to_sheet([cols, ...rows]);
    setColWidths(wsA, [12, 8, 22, 16, 24, 14, 16, 12, 30]);
    XLSX.utils.book_append_sheet(wb, wsA, 'Citas');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Descargar
  // ─────────────────────────────────────────────────────────────────────────
  const dateSlug = new Date().toISOString().slice(0, 10);
  const slug = storeName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  XLSX.writeFile(wb, `reporte-${slug}-${dateSlug}.xlsx`);
}
