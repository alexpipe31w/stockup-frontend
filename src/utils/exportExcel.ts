import * as XLSX from 'xlsx';

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const fmtDate = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
};


const STATUS_ORDER: Record<string, string> = {
  pending: 'Pendiente', confirmed: 'Confirmado', preparing: 'Preparando',
  ready: 'Listo', delivered: 'Entregado', cancelled: 'Cancelado',
};

const STATUS_APPT: Record<string, string> = {
  PENDING: 'Pendiente', CONFIRMED: 'Confirmada', IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completada', CANCELLED: 'Cancelada', NO_SHOW: 'No asistió', RESCHEDULED: 'Reagendada',
};

function autoWidth(ws: XLSX.WorkSheet) {
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
  const colWidths: number[] = [];
  for (let C = range.s.c; C <= range.e.c; C++) {
    let max = 10;
    for (let R = range.s.r; R <= range.e.r; R++) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      if (cell && cell.v) {
        const len = String(cell.v).length;
        if (len > max) max = len;
      }
    }
    colWidths.push(Math.min(max + 2, 50));
  }
  ws['!cols'] = colWidths.map(w => ({ wch: w }));
}

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
    : 'Todo el historial';

  // ─── Filtrar por rango de fechas si se pasa ────────────────────────────────
  const filterByDate = (items: any[], dateField: string) => {
    if (!dateRange?.from && !dateRange?.to) return items;
    return items.filter(item => {
      const d = new Date(item[dateField]);
      if (dateRange.from && d < new Date(dateRange.from)) return false;
      if (dateRange.to   && d > new Date(dateRange.to + 'T23:59:59')) return false;
      return true;
    });
  };

  const filteredOrders = filterByDate(orders, 'createdAt');
  const filteredAppts  = filterByDate(appointments, 'scheduledAt');

  // ─── Hoja 1: RESUMEN ──────────────────────────────────────────────────────
  const deliveredOrders = filteredOrders.filter(o => o.status === 'delivered');
  const cancelledOrders = filteredOrders.filter(o => o.status === 'cancelled');

  const revenueProductos = deliveredOrders
    .filter(o => !o.type || o.type === 'product')
    .reduce((s, o) => s + Number(o.total ?? 0), 0);

  const revenueServicios = deliveredOrders
    .filter(o => o.type === 'service')
    .reduce((s, o) => s + Number(o.total ?? 0), 0);

  const costoTotal = deliveredOrders.reduce((s, o) =>
    s + (o.orderItems ?? []).reduce((ss: number, it: any) =>
      ss + Number(it.product?.costPrice ?? 0) * (it.quantity ?? 1), 0), 0);

  const revenueTotal = revenueProductos + revenueServicios;
  const ganancia = revenueTotal - costoTotal;

  const completedAppts = filteredAppts.filter(a => a.status === 'COMPLETED');
  const cancelledAppts = filteredAppts.filter(a => a.status === 'CANCELLED');
  const noShowAppts    = filteredAppts.filter(a => a.status === 'NO_SHOW');

  const revenueCitas = completedAppts.reduce((s, a) => s + Number(a.price ?? 0), 0);

  const summaryRows = [
    ['REPORTE DE CAJA — ' + storeName.toUpperCase()],
    ['Generado:', now],
    ['Período:', rangeLabel],
    [],
    ['── VENTAS DE PRODUCTOS ───────────────────────────────'],
    ['Total de órdenes',          filteredOrders.filter(o => !o.type || o.type === 'product').length],
    ['Órdenes entregadas',        deliveredOrders.filter(o => !o.type || o.type === 'product').length],
    ['Órdenes canceladas',        cancelledOrders.filter(o => !o.type || o.type === 'product').length],
    ['Ingresos (entregadas)',      fmtCOP(revenueProductos)],
    ['Costo de productos',        fmtCOP(costoTotal)],
    ['Ganancia estimada',         fmtCOP(ganancia)],
    ['Margen (%)',                revenueTotal > 0 ? `${Math.round((ganancia / revenueTotal) * 100)}%` : '0%'],
    [],
    ['── CITAS / SERVICIOS ────────────────────────────────'],
    ['Total de citas',            filteredAppts.length],
    ['Completadas',               completedAppts.length],
    ['Canceladas',                cancelledAppts.length],
    ['No asistió',                noShowAppts.length],
    ['Ingresos por citas',        fmtCOP(revenueCitas)],
    [],
    ['── TOTALES ──────────────────────────────────────────'],
    ['INGRESOS TOTALES',          fmtCOP(revenueTotal + revenueCitas)],
    ['GANANCIA TOTAL ESTIMADA',   fmtCOP(ganancia)],
  ];

  const wsResumen = XLSX.utils.aoa_to_sheet(summaryRows);
  wsResumen['!cols'] = [{ wch: 32 }, { wch: 22 }];
  wsResumen['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

  // ─── Hoja 2: VENTAS DE PRODUCTOS (ÓRDENES) ────────────────────────────────
  const ordersHeader = [
    'Fecha', 'Hora', 'N° Orden', 'Cliente', 'Teléfono',
    'Estado', 'Productos', 'Subtotal', 'Descuento %', 'Total', 'Costo', 'Ganancia', 'Notas',
  ];

  const ordersRows = filteredOrders
    .filter(o => !o.type || o.type === 'product')
    .map(o => {
      const createdAt = new Date(o.createdAt);
      const items = (o.orderItems ?? [])
        .map((it: any) => `${it.product?.name ?? it.description ?? 'Item'} x${it.quantity}`)
        .join(' | ');
      const costo = (o.orderItems ?? []).reduce((s: number, it: any) =>
        s + Number(it.product?.costPrice ?? 0) * (it.quantity ?? 1), 0);
      const total = Number(o.total ?? 0);

      return [
        fmtDate(o.createdAt),
        createdAt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
        o.orderId?.slice(-8)?.toUpperCase() ?? '',
        o.customer?.name ?? o.customer?.phone ?? 'Sin cliente',
        o.customer?.phone ?? '',
        STATUS_ORDER[o.status] ?? o.status,
        items,
        Number(o.subtotal ?? total),
        o.discountPercent ?? 0,
        total,
        costo,
        total - costo,
        o.notes ?? '',
      ];
    });

  const wsOrders = XLSX.utils.aoa_to_sheet([ordersHeader, ...ordersRows]);
  autoWidth(wsOrders);
  XLSX.utils.book_append_sheet(wb, wsOrders, 'Ventas Productos');

  // ─── Hoja 3: DETALLE ITEMS DE ÓRDENES ─────────────────────────────────────
  const itemsHeader = [
    'Fecha', 'N° Orden', 'Cliente', 'Producto / Servicio', 'Variante',
    'Cantidad', 'Precio Unitario', 'Subtotal Item', 'Costo Unit.', 'Ganancia Item',
  ];

  const itemsRows: any[] = [];
  filteredOrders
    .filter(o => !o.type || o.type === 'product')
    .forEach(o => {
      (o.orderItems ?? []).forEach((it: any) => {
        const nombre   = it.product?.name ?? it.service?.name ?? it.description ?? 'Item';
        const variante = it.variant?.name ?? '';
        const qty      = it.quantity ?? 1;
        const unitP    = Number(it.unitPrice ?? 0);
        const costo    = Number(it.product?.costPrice ?? 0);
        itemsRows.push([
          fmtDate(o.createdAt),
          o.orderId?.slice(-8)?.toUpperCase() ?? '',
          o.customer?.name ?? o.customer?.phone ?? '',
          nombre,
          variante,
          qty,
          unitP,
          unitP * qty,
          costo,
          (unitP - costo) * qty,
        ]);
      });
    });

  const wsItems = XLSX.utils.aoa_to_sheet([itemsHeader, ...itemsRows]);
  autoWidth(wsItems);
  XLSX.utils.book_append_sheet(wb, wsItems, 'Detalle Items');

  // ─── Hoja 4: CITAS / SERVICIOS ────────────────────────────────────────────
  const apptsHeader = [
    'Fecha Cita', 'Hora', 'Cliente', 'Teléfono', 'Servicio', 'Variante',
    'Estado', 'Precio', 'Fuente', 'Prioridad', 'Notas',
  ];

  const apptsRows = filteredAppts.map(a => {
    const scheduled = a.scheduledAt ? new Date(a.scheduledAt) : null;
    return [
      scheduled ? fmtDate(a.scheduledAt) : '',
      scheduled
        ? scheduled.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
        : '',
      a.customer?.name ?? a.customer?.phone ?? 'Sin cliente',
      a.customer?.phone ?? '',
      a.service?.name ?? '',
      a.serviceVariant?.name ?? '',
      STATUS_APPT[a.status] ?? a.status,
      Number(a.price ?? 0),
      a.source ?? '',
      a.priority ?? '',
      a.notes ?? '',
    ];
  });

  const wsAppts = XLSX.utils.aoa_to_sheet([apptsHeader, ...apptsRows]);
  autoWidth(wsAppts);
  XLSX.utils.book_append_sheet(wb, wsAppts, 'Citas y Servicios');

  // ─── Descargar ─────────────────────────────────────────────────────────────
  const dateSlug = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `reporte-caja-${storeName.toLowerCase().replace(/\s+/g, '-')}-${dateSlug}.xlsx`);
}
