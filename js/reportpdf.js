/* ============================================
   REPORTPDF.JS — arma el PDF del reporte con jsPDF (A4, vertical).
   Los gráficos se dibujan con primitivas del PDF (vectoriales), sin
   canvas. Las fuentes estándar de jsPDF no tienen emojis ni símbolos
   como "−" o "▲", así que todo texto pasa por pdfText().
   ============================================ */

const PDF_COLORS = {
  brand: [18, 59, 51],
  brandSoft: [226, 236, 229],
  text: [20, 35, 31],
  muted: [95, 108, 102],
  line: [212, 221, 214],
  income: [20, 83, 45],
  expense: [180, 69, 31],
  warn: [194, 65, 12],
  track: [226, 232, 227],
};

const PDF_PAGE = { w: 210, h: 297, margin: 14, footer: 12 };

// Deja solo lo que la fuente del PDF puede dibujar.
function pdfText(value) {
  return String(value == null ? '' : value)
    .replace(/[−–—]/g, '-')
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}◆]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function pdfMoney(n) {
  const r = Math.round(n);
  return (r < 0 ? '-' : '') + '$ ' + Math.abs(r).toLocaleString('es-AR');
}

function pdfShort(n) {
  const v = Math.abs(n);
  if (v >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + 'M';
  if (v >= 1e3) return Math.round(n / 1e3) + 'k';
  return String(Math.round(n));
}

function pdfPct(n) {
  const r = Math.round(n);
  return `${r > 0 ? '+' : ''}${r} %`;
}

function pdfDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// Variación contra el período anterior ("+12 % vs mayo 2026"); null si no hay base.
function pdfDelta(cur, prev, label) {
  if (prev == null || prev <= 0) return '';
  return `${pdfPct(((cur - prev) / prev) * 100)} vs ${label}`;
}

function buildReportPdf(data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const M = PDF_PAGE.margin;
  const CW = PDF_PAGE.w - M * 2;
  const bottom = PDF_PAGE.h - PDF_PAGE.footer - 4;
  let y = M;

  const color = (c, kind) => (kind === 'fill' ? doc.setFillColor(...c) : kind === 'draw' ? doc.setDrawColor(...c) : doc.setTextColor(...c));
  const font = (size, weight) => { doc.setFont('helvetica', weight || 'normal'); doc.setFontSize(size); };
  const ensure = (h) => { if (y + h > bottom) { doc.addPage(); y = M; } };
  const fit = (str, maxW) => {
    let s = pdfText(str);
    if (doc.getTextWidth(s) <= maxW) return s;
    while (s.length > 1 && doc.getTextWidth(s + '...') > maxW) s = s.slice(0, -1);
    return s + '...';
  };

  /* ----- bloques ----- */

  function sectionTitle(title, sub) {
    ensure(sub ? 16 : 12);
    color(PDF_COLORS.brand, 'fill');
    doc.rect(M, y - 3.6, 1.4, 5.2, 'F');
    font(12, 'bold'); color(PDF_COLORS.text);
    doc.text(pdfText(title), M + 4, y + 0.6);
    y += 5;
    if (sub) {
      font(8.5); color(PDF_COLORS.muted);
      doc.text(pdfText(sub), M + 4, y + 0.6);
      y += 4.5;
    }
    y += 2;
  }

  function note(text) {
    font(9); color(PDF_COLORS.muted);
    doc.text(pdfText(text), M, y + 3);
    y += 8;
  }

  function kpiTiles(items) {
    const perRow = 4;
    const gap = 3;
    const tw = (CW - gap * (perRow - 1)) / perRow;
    const th = 22;
    items.forEach((it, i) => {
      if (i % perRow === 0 && i > 0) y += th + gap;
      const x = M + (i % perRow) * (tw + gap);
      color(PDF_COLORS.brandSoft, 'fill');
      doc.roundedRect(x, y, tw, th, 2.5, 2.5, 'F');
      font(7.5, 'bold'); color(PDF_COLORS.muted);
      doc.text(pdfText(it.label).toUpperCase(), x + 3, y + 5.2);
      font(it.value.length > 12 ? 10.5 : 12.5, 'bold'); color(it.color || PDF_COLORS.text);
      doc.text(fit(it.value, tw - 6), x + 3, y + 12.2);
      if (it.sub) {
        font(7); color(PDF_COLORS.muted);
        doc.text(fit(it.sub, tw - 6), x + 3, y + 17.6);
      }
    });
    y += th + 6;
  }

  // Columnas agrupadas: rows [{label, a, b?}]; series: [{name, color}]
  function columnChart(rows, series, opts = {}) {
    const h = opts.height || 52;
    ensure(h + 16);
    const left = M + 11;
    const w = CW - 11;
    const top = y + 3;
    const base = top + h;
    const max = Math.max(1, ...rows.map(r => Math.max(r.a || 0, r.b || 0)));

    font(7); color(PDF_COLORS.muted);
    color(PDF_COLORS.line, 'draw'); doc.setLineWidth(0.2);
    for (let i = 0; i <= 4; i++) {
      const gy = base - (h * i) / 4;
      doc.line(left, gy, left + w, gy);
      doc.text(pdfShort((max * i) / 4), left - 2, gy + 1, { align: 'right' });
    }

    const slot = w / rows.length;
    const nSeries = series.length;
    const barW = Math.min(slot * 0.8 / nSeries, 9);
    const groupW = barW * nSeries;
    const every = rows.length > 16 ? Math.ceil(rows.length / 12) : 1;
    rows.forEach((r, i) => {
      const gx = left + slot * i + (slot - groupW) / 2;
      [r.a, r.b].slice(0, nSeries).forEach((val, s) => {
        const bh = ((val || 0) / max) * h;
        if (bh > 0.15) {
          color(series[s].color, 'fill');
          doc.rect(gx + s * barW, base - bh, barW, bh, 'F');
        }
      });
      if (i % every === 0) {
        font(7); color(PDF_COLORS.muted);
        doc.text(pdfText(r.label), left + slot * i + slot / 2, base + 4, { align: 'center' });
      }
    });

    y = base + 8;
    if (series.length > 1 || opts.legend) {
      let lx = left;
      series.forEach(s => {
        color(s.color, 'fill'); doc.rect(lx, y - 2.4, 3, 3, 'F');
        font(8); color(PDF_COLORS.text);
        doc.text(pdfText(s.name), lx + 4.5, y + 0.2);
        lx += 6 + doc.getTextWidth(pdfText(s.name)) + 6;
      });
      y += 5;
    }
    y += 3;
  }

  // Barras horizontales: rows [{label, value, text, sub}]
  function barRows(rows, barColor, emptyText) {
    if (rows.length === 0) { note(emptyText); return; }
    const max = Math.max(1, ...rows.map(r => r.value));
    const labelW = 46;
    const valueW = 38;
    const trackW = CW - labelW - valueW - 4;
    rows.forEach(r => {
      ensure(9);
      font(9); color(PDF_COLORS.text);
      doc.text(fit(r.label, labelW - 2), M, y + 3);
      color(PDF_COLORS.track, 'fill');
      doc.roundedRect(M + labelW, y + 0.6, trackW, 3.4, 1.2, 1.2, 'F');
      color(r.color || barColor, 'fill');
      const bw = Math.max(1.2, (r.value / max) * trackW);
      doc.roundedRect(M + labelW, y + 0.6, bw, 3.4, 1.2, 1.2, 'F');
      font(9, 'bold'); color(PDF_COLORS.text);
      doc.text(pdfText(r.text), M + CW, y + 3, { align: 'right' });
      if (r.sub) {
        font(7); color(r.subColor || PDF_COLORS.muted);
        doc.text(pdfText(r.sub), M + CW, y + 6.4, { align: 'right' });
      }
      y += r.sub ? 9.2 : 7.8;
    });
    y += 3;
  }

  function table(columns, rows) {
    ensure(10);
    color(PDF_COLORS.brandSoft, 'fill');
    doc.rect(M, y, CW, 6.4, 'F');
    font(7.5, 'bold'); color(PDF_COLORS.muted);
    let x = M + 2;
    columns.forEach(c => {
      doc.text(pdfText(c.label).toUpperCase(), c.align === 'right' ? x + c.w - 4 : x, y + 4.4, { align: c.align === 'right' ? 'right' : 'left' });
      x += c.w;
    });
    y += 8.4;
    rows.forEach(r => {
      ensure(7);
      font(9); color(PDF_COLORS.text);
      let cx = M + 2;
      columns.forEach((c, i) => {
        const val = r[i];
        const colr = c.color ? c.color(r) : PDF_COLORS.text;
        color(colr);
        font(9, c.bold ? 'bold' : 'normal');
        if (c.align === 'right') doc.text(pdfText(val), cx + c.w - 4, y + 2.6, { align: 'right' });
        else doc.text(fit(val, c.w - 3), cx, y + 2.6);
        cx += c.w;
      });
      color(PDF_COLORS.line, 'draw'); doc.setLineWidth(0.15);
      doc.line(M, y + 4.4, M + CW, y + 4.4);
      y += 6.2;
    });
    y += 3;
  }

  /* ----- encabezado ----- */

  color(PDF_COLORS.brand, 'fill');
  doc.rect(0, 0, PDF_PAGE.w, 34, 'F');
  font(20, 'bold'); color([244, 247, 241]);
  doc.text('Libro de Caja', M, 16);
  font(11); color([211, 242, 106]);
  doc.text(pdfText(`Reporte: ${data.range.label}`), M, 24);
  font(8.5); color([200, 214, 207]);
  const periodLine = data.range.type === 'all'
    ? `Del ${pdfDate(data.range.startISO)} al ${pdfDate(data.range.endISO)}`
    : `Del ${pdfDate(data.range.startISO)} al ${pdfDate(data.range.endISO)}`;
  doc.text(pdfText(`${periodLine} · generado el ${pdfDate(todayISO())}`), M, 29.5);
  y = 44;

  /* ----- resumen ----- */

  const prevLabel = data.prev ? data.prev.label : '';
  sectionTitle('Resumen del período');
  kpiTiles([
    { label: 'Ingresos', value: pdfMoney(data.income), color: PDF_COLORS.income, sub: pdfDelta(data.income, data.prev && data.prev.income, prevLabel) },
    { label: 'Gastos', value: pdfMoney(data.expense), color: PDF_COLORS.expense, sub: pdfDelta(data.expense, data.prev && data.prev.expense, prevLabel) },
    { label: 'Saldo del período', value: pdfMoney(data.balance), color: data.balance < 0 ? PDF_COLORS.expense : PDF_COLORS.income, sub: data.adjNet ? `incluye ajustes ${pdfMoney(data.adjNet)}` : '' },
    { label: 'Tasa de ahorro', value: data.savingsRate == null ? '-' : `${Math.round(data.savingsRate)} %`, color: data.savingsRate != null && data.savingsRate < 0 ? PDF_COLORS.expense : PDF_COLORS.text, sub: data.savingsRate == null ? 'sin ingresos' : 'del ingreso' },
    { label: 'Promedio diario', value: pdfMoney(data.avgDaily), sub: `en ${data.days} ${data.days === 1 ? 'día' : 'días'}` },
    { label: 'Días con registro', value: `${data.loggedDays} / ${data.days}`, sub: `${Math.round((data.loggedDays / data.days) * 100)} % de los días` },
    { label: 'Movimientos', value: String(data.movements), sub: data.pendingCount ? `${data.pendingCount} pendientes aparte` : 'confirmados' },
    { label: 'Gastos hormiga', value: pdfMoney(data.ants.total), sub: `${data.ants.count} menores a ${pdfMoney(data.ants.threshold)}` },
  ]);

  /* ----- evolución ----- */

  if (data.seriesKind === 'day') {
    sectionTitle('Gasto día a día', 'Cuánto gastaste cada día del mes');
    columnChart(data.series.map(r => ({ label: r.label, a: r.expense })), [{ name: 'Gastos', color: PDF_COLORS.expense }]);
  } else {
    sectionTitle('Ingresos y gastos', data.seriesKind === 'year' ? 'Por año' : 'Mes a mes');
    columnChart(
      data.series.map(r => ({ label: r.label, a: r.income, b: r.expense })),
      [{ name: 'Ingresos', color: PDF_COLORS.income }, { name: 'Gastos', color: PDF_COLORS.expense }],
    );
  }

  /* ----- categorías ----- */

  sectionTitle('Gastos por categoría', 'Sin contar el ahorro en dólares');
  const topCats = data.categories.slice(0, 10);
  const rest = data.categories.slice(10);
  const catRows = topCats.map(c => ({
    label: c.name, value: c.amount, text: pdfMoney(c.amount),
    sub: `${Math.round(c.pct)} % · ${c.count} ${c.count === 1 ? 'mov.' : 'movs.'}`,
  }));
  if (rest.length) {
    const amount = rest.reduce((s, c) => s + c.amount, 0);
    catRows.push({ label: 'Otras', value: amount, text: pdfMoney(amount), sub: `${rest.length} categorías más` });
  }
  barRows(catRows, PDF_COLORS.brand, 'Sin gastos en este período.');

  if (data.incomeCategories.length) {
    sectionTitle('Ingresos por categoría');
    barRows(data.incomeCategories.slice(0, 6).map(c => ({
      label: c.name, value: c.amount, text: pdfMoney(c.amount), sub: `${Math.round(c.pct)} %`,
    })), PDF_COLORS.income, '');
  }

  /* ----- hábitos de gasto ----- */

  sectionTitle('Gasto por día de la semana', 'Qué días se te va más la plata');
  columnChart(data.weekdays.map(w => ({ label: w.label.slice(0, 3), a: w.amount })), [{ name: 'Gastos', color: PDF_COLORS.brand }], { height: 40 });

  if (data.topExpenses.length) {
    sectionTitle('Mayores gastos');
    table(
      [
        { label: 'Fecha', w: 26 },
        { label: 'Detalle', w: 76 },
        { label: 'Categoría', w: 50 },
        { label: 'Monto', w: CW - 152, align: 'right', bold: true, color: () => PDF_COLORS.expense },
      ],
      data.topExpenses.map(e => [pdfDate(e.date), e.title, e.category, pdfMoney(e.amount)]),
    );
  }

  /* ----- cuentas ----- */

  if (data.accounts.length) {
    sectionTitle('Cuentas', 'Movimiento del período y saldo a hoy');
    table(
      [
        { label: 'Cuenta', w: 56 },
        { label: 'Ingresos', w: 42, align: 'right', color: () => PDF_COLORS.income },
        { label: 'Gastos', w: 42, align: 'right', color: () => PDF_COLORS.expense },
        { label: 'Saldo actual', w: CW - 140, align: 'right', bold: true, color: r => (r.raw < 0 ? PDF_COLORS.expense : PDF_COLORS.text) },
      ],
      data.accounts.map(a => Object.assign([a.name, pdfMoney(a.income), pdfMoney(a.expense), pdfMoney(a.balanceNow)], { raw: a.balanceNow })),
    );
  }

  /* ----- presupuestos, etiquetas ----- */

  if (data.budgets.length) {
    sectionTitle('Presupuestos', 'Lo gastado contra el límite de cada categoría');
    barRows(data.budgets.map(b => {
      const pct = b.limit > 0 ? (b.spent / b.limit) * 100 : 0;
      return {
        label: b.name, value: Math.min(b.spent, b.limit) || 0.0001, text: `${pdfMoney(b.spent)} de ${pdfMoney(b.limit)}`,
        sub: `${Math.round(pct)} % usado${pct > 100 ? ' - superado' : ''}`,
        color: pct >= 90 ? PDF_COLORS.warn : PDF_COLORS.brand, subColor: pct >= 90 ? PDF_COLORS.warn : PDF_COLORS.muted,
      };
    }), PDF_COLORS.brand, '');
  }

  if (data.tags.length) {
    sectionTitle('Gastos por etiqueta');
    barRows(data.tags.map(t => ({
      label: t.name, value: t.amount, text: pdfMoney(t.amount), sub: `${t.count} ${t.count === 1 ? 'mov.' : 'movs.'}`,
    })), PDF_COLORS.brand, '');
  }

  /* ----- ahorro, metas, pendientes de cobro, hábito ----- */

  const hasSavings = data.usd.totalAccumulated > 0 || data.eur.totalAccumulated > 0 || data.saved.usd > 0 || data.goals.length > 0;
  if (hasSavings) {
    sectionTitle('Ahorro y metas');
    if (data.eur.totalAccumulated > 0) {
      font(9); color(PDF_COLORS.text);
      ensure(8);
      doc.text(pdfText(`Ahorro en euros: ${data.eur.depositCount} ${data.eur.depositCount === 1 ? 'depósito' : 'depósitos'} en el período por EUR ${data.eur.depositedInRange.toLocaleString('es-AR', { maximumFractionDigits: 2 })}. Acumulado total: EUR ${data.eur.totalAccumulated.toLocaleString('es-AR', { maximumFractionDigits: 2 })}.`), M, y + 2, { maxWidth: CW });
      y += 8;
    }
    if (data.usd.totalAccumulated > 0 || data.saved.usd > 0) {
      font(9); color(PDF_COLORS.text);
      const inRange = data.usd.depositCount
        ? `${data.usd.depositCount} ${data.usd.depositCount === 1 ? 'depósito' : 'depósitos'} en el período por USD ${data.usd.depositedInRange.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`
        : 'sin depósitos en el período';
      ensure(8);
      doc.text(pdfText(`Ahorro en dólares: ${inRange}. Acumulado total: USD ${data.usd.totalAccumulated.toLocaleString('es-AR', { maximumFractionDigits: 2 })}.`), M, y + 2, { maxWidth: CW });
      y += 8;
    }
    barRows(data.goals.map(g => {
      const pct = g.target > 0 ? Math.min(100, (g.current / g.target) * 100) : 0;
      const fmt = v => (g.currency === 'USD' || g.currency === 'EUR'
        ? `${g.currency} ${v.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`
        : pdfMoney(v));
      return { label: g.name, value: pct || 0.0001, text: `${Math.round(pct)} %`, sub: `${fmt(g.current)} de ${fmt(g.target)}` };
    }), PDF_COLORS.income, '');
  }

  if (data.shared.length) {
    sectionTitle('Gastos compartidos sin saldar', 'Lo que te deben a hoy');
    barRows(data.shared.map(s => ({ label: s.name, value: s.total, text: pdfMoney(s.total) })), PDF_COLORS.income, '');
  }

  sectionTitle('Constancia');
  font(9); color(PDF_COLORS.text);
  ensure(10);
  doc.text(pdfText(`Racha actual: ${data.streak.current} ${data.streak.current === 1 ? 'día' : 'días'} seguidos anotando · mejor racha: ${data.streak.best} ${data.streak.best === 1 ? 'día' : 'días'}.`), M, y + 2, { maxWidth: CW });
  y += 8;

  /* ----- pie de página en todas las hojas ----- */

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    color(PDF_COLORS.line, 'draw'); doc.setLineWidth(0.2);
    doc.line(M, PDF_PAGE.h - PDF_PAGE.footer, PDF_PAGE.w - M, PDF_PAGE.h - PDF_PAGE.footer);
    font(8); color(PDF_COLORS.muted);
    doc.text(pdfText(`Libro de Caja · ${data.range.label}`), M, PDF_PAGE.h - 7);
    doc.text(`Página ${p} de ${pages}`, PDF_PAGE.w - M, PDF_PAGE.h - 7, { align: 'right' });
  }

  return doc.output('blob');
}
