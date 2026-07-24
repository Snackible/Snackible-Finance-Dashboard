/* ============================================================
   Snackible Finance Dashboard — app.js
   Data loads live from Google Sheets via Apps Script
   ============================================================ */

const MIS_API_URL = 'https://script.google.com/macros/s/AKfycbysu-p9q8isl7jszRgTrX7_DEbJskwO87nFhRugZLrGLBiJ_X7EaA9pTM49zpj9UwETOg/exec';

/* Populated on boot via fetchAllData() */
const ALL_FY_DATA = {};

/* ---- Boot: fetch all FY data before rendering ---- */
function fetchAllData() {
  showLoadingScreen();

  fetch(MIS_API_URL + '?fy=ALL')
    .then(res => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(data => {
      if (data.error) throw new Error(data.error);

      /* Populate ALL_FY_DATA */
      Object.keys(data).forEach(fy => {
        ALL_FY_DATA[fy] = data[fy];
      });

      hideLoadingScreen();
      initTabs();
      initFYSwitcher();
      loadFY('FY26');
      renderCapTable();
    })
    .catch(err => {
      showLoadError(err.toString());
    });
}

function showLoadingScreen() {
  document.getElementById('loadingScreen').style.display = 'flex';
}

function hideLoadingScreen() {
  document.getElementById('loadingScreen').style.display = 'none';
}

function showLoadError(msg) {
  document.getElementById('loadingScreen').innerHTML =
    '<div style="text-align:center;">'
    + '<div style="font-size:28px;margin-bottom:12px;">⚠️</div>'
    + '<div style="font-size:15px;font-weight:600;color:var(--text-primary);margin-bottom:8px;">Failed to load data</div>'
    + '<div style="color:var(--text-tertiary);font-size:12px;margin-bottom:20px;">' + msg + '</div>'
    + '<button onclick="fetchAllData()" style="background:var(--accent);color:#fff;border:none;padding:8px 20px;border-radius:8px;font-size:13px;cursor:pointer;font-family:inherit;">Retry</button>'
    + '</div>';
}

const CHANNELS = ['Snackible-Own website','Online Alternate Channels','B2B/Institutional sales channel','General Trade','Modern Trade'];

const GROUP_MARKERS = [
  { label: 'Total Revenue', metric: 'Revenue' },
  { label: 'Total cost of goods', metric: 'Cost of Goods Sold' },
  { label: 'Gross margin', metric: 'Gross Margin' },
  { label: 'Total Labour Expense', metric: 'Labour Charges' },
  { label: 'Total Delivery Expense', metric: 'Delivery Expense' },
  { label: 'Total CM1', metric: 'CM1' },
  { label: 'Total Marketing Expenses', metric: 'Marketing Expenses' },
  { label: 'Total CM2', metric: 'CM2' },
  { label: 'Total Indirect Expenses', metric: 'Other Indirect Expenses' }
];

const KPI_ROWS = [
  { key: 'Total Net Revenue', label: 'Net Revenue' },
  { key: 'Gross margin', label: 'Gross Margin' },
  { key: 'Total CM1', label: 'CM1' },
  { key: 'Total CM2', label: 'CM2' },
  { key: 'EBITDA', label: 'EBITDA' }
];

const RATIO_DEFINITIONS = [
  { key: 'cogs_pct', label: 'COGS % of Revenue', totalLabel: 'Total cost of goods', channelMetric: 'Cost of Goods Sold' },
  { key: 'gross_margin_pct', label: 'Gross Margin %', totalLabel: 'Gross margin', channelMetric: 'Gross Margin' },
  { key: 'labour_pct', label: 'Labour % of Revenue', totalLabel: 'Total Labour Expense', channelMetric: 'Labour Charges' },
  { key: 'delivery_pct', label: 'Delivery % of Revenue', totalLabel: 'Total Delivery Expense', channelMetric: 'Delivery Expense' },
  { key: 'cm1_pct', label: 'CM1 %', totalLabel: 'Total CM1', channelMetric: 'CM1' },
  { key: 'marketing_pct', label: 'Marketing % of Revenue', totalLabel: 'Total Marketing Expenses', channelMetric: 'Marketing Expenses' },
  { key: 'cm2_pct', label: 'CM2 %', totalLabel: 'Total CM2', channelMetric: 'CM2' },
  { key: 'opex_pct', label: 'Other Indirect Expenses % of Revenue', totalLabel: 'Total Indirect Expenses', channelMetric: null }
];

const MARKETING_CHANNEL_MAP = {
  'Snackible-Own website': ['Snackible-Online [Facebook]','Snackible-Online [Google]','Snackible-Online [Discounts]','Snackible-Online [Whatsapp]'],
  'Online Alternate Channels': ['Online Alternate Channels','Other Marketing Expenses'],
  'B2B/Institutional sales channel': ['B2B/Institutional Sales'],
  'General Trade': ['General Trade'],
  'Modern Trade': []
};

let RAW = null;
let CHANNEL_GROUPS = {};
let TOTALS_BY_LABEL = {};
let selectedMonths = [];
let currentFY = 'FY26';

/* ---- Formatters ---- */
function fmtCurrency(n) {
  if (n === null || n === undefined) return '—';
  const abs = Math.abs(n);
  let str;
  if (abs >= 10000000) str = (n/10000000).toFixed(2)+'Cr';
  else if (abs >= 100000) str = (n/100000).toFixed(2)+'L';
  else if (abs >= 1000) str = (n/1000).toFixed(1)+'K';
  else str = n.toFixed(0);
  return '₹'+str;
}
function fmtFull(n) {
  if (n === null || n === undefined) return '—';
  return '₹'+Math.round(n).toLocaleString('en-IN');
}
function fmtPct(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return n.toFixed(1)+'%';
}

/* ---- FY switcher ---- */
function initFYSwitcher() {
  document.querySelectorAll('.fy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const fy = btn.dataset.fy;
      document.querySelectorAll('.fy-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (fy === 'FY27') {
        loadFY27();
        return;
      }
      currentFY = fy;
      loadFY(fy);
    });
  });
}

function loadFY27() {
  /* Show loading state */
  document.getElementById('kpiGrid').innerHTML = '<div style="grid-column:1/-1;padding:40px;text-align:center;color:var(--text-tertiary);font-size:13px;">Loading FY27 data...</div>';
  document.getElementById('monthSelectorBar').style.display = '';
  document.querySelector('.main-tabs').style.display = '';

  /* Hide any old stub */
  const stub = document.getElementById('fy27Stub');
  if (stub) stub.style.display = 'none';

  fetch(MIS_API_URL + '?fy=FY27')
    .then(res => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(data => {
      if (data.error) throw new Error(data.error);
      if (!data.months || !data.rows) throw new Error('Invalid FY27 data shape');

      /* Inject into ALL_FY_DATA and load like any other FY */
      ALL_FY_DATA['FY27'] = data;
      currentFY = 'FY27';
      loadFY('FY27');
    })
    .catch(err => {
      document.getElementById('kpiGrid').innerHTML = '';
      showFY27Error(err.toString());
    });
}

function showFY27Error(msg) {
  document.getElementById('monthSelectorBar').style.display = 'none';
  document.querySelector('.main-tabs').style.display = 'none';
  document.querySelectorAll('.sub-panel, .main-panel').forEach(p => p.classList.remove('active'));
  let stub = document.getElementById('fy27Stub');
  if (!stub) {
    stub = document.createElement('div');
    stub.id = 'fy27Stub';
    stub.className = 'empty-state';
    stub.style.marginTop = '80px';
    document.querySelector('.main-panel.active') ? document.querySelector('.main-panel.active').appendChild(stub) : document.querySelector('.shell').appendChild(stub);
  }
  stub.innerHTML = '<div style="font-size:32px;margin-bottom:16px;">⚠️</div>'
    + '<div style="font-size:15px;font-weight:600;color:var(--text-primary);margin-bottom:8px;">Could not load FY27 data</div>'
    + '<div style="color:var(--text-tertiary);font-size:12px;margin-bottom:16px;">' + msg + '</div>'
    + '<button onclick="loadFY27()" style="background:var(--accent);color:#fff;border:none;padding:8px 20px;border-radius:8px;font-size:13px;cursor:pointer;font-family:inherit;">Retry</button>';
  stub.style.display = 'block';
  document.getElementById('latestMonthBadge').textContent = 'FY27';
}

function loadFY(fy) {
  // Hide FY27 stub, restore UI
  const stub = document.getElementById('fy27Stub');
  if (stub) stub.style.display = 'none';
  document.getElementById('monthSelectorBar').style.display = '';
  document.querySelector('.main-tabs').style.display = '';

  destroyAllCharts();
  Object.values(ratioChartInstances).forEach(c => { try { c.destroy(); } catch(e){} });
  ratioChartInstances = {};
  document.getElementById('ratioGrid').innerHTML = '';
  CHANNEL_GROUPS = {};
  TOTALS_BY_LABEL = {};

  RAW = ALL_FY_DATA[fy];
  selectedMonths = [...RAW.months];
  processGroups();
  buildMarketingChannelGroup();

  // FIX BUG 4: badge shows selected range, default = full FY
  updateBadge();
  render();
}

/* FIX BUG 4: badge reflects actual selection */
function updateBadge() {
  if (!selectedMonths.length) {
    document.getElementById('latestMonthBadge').textContent = 'No months';
    return;
  }
  if (selectedMonths.length === RAW.months.length) {
    document.getElementById('latestMonthBadge').textContent = 'All months';
  } else if (selectedMonths.length === 1) {
    document.getElementById('latestMonthBadge').textContent = selectedMonths[0];
  } else {
    document.getElementById('latestMonthBadge').textContent = selectedMonths[0]+' → '+selectedMonths[selectedMonths.length-1];
  }
}

function destroyAllCharts() {
  if (compareChartInstance) { compareChartInstance.destroy(); compareChartInstance = null; }
  if (compareChartMinorInstance) { compareChartMinorInstance.destroy(); compareChartMinorInstance = null; }
  if (trendChartInstance) { trendChartInstance.destroy(); trendChartInstance = null; }
  if (cumChartInstance) { cumChartInstance.destroy(); cumChartInstance = null; }
  if (cumChartMinorInstance) { cumChartMinorInstance.destroy(); cumChartMinorInstance = null; }
}

function processGroups() {
  CHANNEL_GROUPS = {};
  TOTALS_BY_LABEL = {};
  let buffer = [];
  RAW.rows.forEach(row => {
    const marker = GROUP_MARKERS.find(m => m.label === row.label);
    if (marker) {
      const dedupMap = new Map();
      buffer.filter(r => CHANNELS.includes(r.label)).forEach(r => dedupMap.set(r.label, r));
      CHANNEL_GROUPS[marker.metric] = CHANNELS.map(c => dedupMap.get(c)).filter(Boolean);
      buffer = [];
    } else {
      buffer.push(row);
    }
    // FIX: only store in TOTALS_BY_LABEL if label is unique (totals/subtotals), not channel rows
    // Channel rows appear multiple times (once per section) - only store the FIRST occurrence
    // for channel labels, but always overwrite for total labels (they are unique)
    if (!TOTALS_BY_LABEL[row.label] || !CHANNELS.includes(row.label)) {
      TOTALS_BY_LABEL[row.label] = row;
    }
  });
}

function buildMarketingChannelGroup() {
  const rows = CHANNELS.map(channel => {
    const sourceLabels = MARKETING_CHANNEL_MAP[channel];
    const values = {};
    RAW.months.forEach(month => {
      if (!sourceLabels || sourceLabels.length === 0) { values[month] = null; return; }
      let sum = null;
      sourceLabels.forEach(lbl => {
        // Find marketing rows specifically (after Total CM1 section)
        const mktRows = RAW.rows.filter(r => r.label === lbl);
        // Use the last occurrence (marketing section rows come after CM1)
        const r = mktRows[mktRows.length - 1];
        if (r && r.values[month] !== null && r.values[month] !== undefined) {
          sum = (sum || 0) + r.values[month];
        }
      });
      values[month] = sum;
    });
    return { label: channel, section: 'Marketing Expenses', values };
  });
  CHANNEL_GROUPS['Marketing Expenses'] = rows;
}

/* ---- FIX BUG 3: derive last/prev from selectedMonths ---- */
function lastSelectedMonth() {
  return selectedMonths.length ? selectedMonths[selectedMonths.length - 1] : RAW.months[RAW.months.length - 1];
}
function prevSelectedMonth() {
  return selectedMonths.length > 1 ? selectedMonths[selectedMonths.length - 2] : (RAW.months.length > 1 ? RAW.months[RAW.months.length - 2] : null);
}

/* ---- KPIs ---- */
function renderKPIs() {
  const grid = document.getElementById('kpiGrid');
  grid.innerHTML = '';
  const months = selectedMonths.length ? selectedMonths : RAW.months;
  // FIX BUG 3: use last/prev of selectedMonths not hardcoded latest
  const lm = lastSelectedMonth();
  const pm = prevSelectedMonth();
  KPI_ROWS.forEach(kpi => {
    const row = TOTALS_BY_LABEL[kpi.key];
    const val = row ? sumAcrossMonths(row, months) : null;
    let deltaHtml = '';
    if (row && pm && lm && pm !== lm) {
      const lmVal = row.values[lm];
      const pmVal = row.values[pm];
      if (lmVal !== null && lmVal !== undefined && pmVal !== null && pmVal !== undefined && pmVal !== 0) {
        const pct = ((lmVal - pmVal) / Math.abs(pmVal)) * 100;
        const up = pct >= 0;
        deltaHtml = '<span class="kpi-delta '+( up?'up':'down')+'">'+( up?'↑':'↓')+' '+Math.abs(pct).toFixed(1)+'%</span><span class="kpi-context">MoM, '+pm+' → '+lm+'</span>';
      }
    }
    const card = document.createElement('div');
    card.className = 'kpi-card';
    const isNeg = val !== null && val < 0;
    card.innerHTML = '<div class="kpi-label">'+kpi.label+'</div><div class="kpi-value" style="'+( isNeg?'color:var(--red)':'')+'">'+fmtCurrency(val)+'</div><div>'+deltaHtml+'</div>';
    grid.appendChild(card);
  });
}

function sumAcrossMonths(row, months) {
  let sum = 0, hasValue = false;
  months.forEach(m => {
    const v = row.values[m];
    if (v !== null && v !== undefined) { sum += v; hasValue = true; }
  });
  return hasValue ? sum : null;
}

/* ---- Chart helpers ---- */
const dataLabelPlugin = {
  id: 'dataLabelPlugin',
  afterDatasetsDraw(chart, args, opts) {
    // Disabled on this chart instance
    if (opts === false) return;
    const { ctx } = chart;
    chart.data.datasets.forEach((dataset) => {
      const meta = chart.getDatasetMeta(chart.data.datasets.indexOf(dataset));
      meta.data.forEach((bar, index) => {
        const value = dataset.data[index];
        if (value === null || value === undefined) return;
        // Skip label if bar is too small to display text cleanly (< 24px height)
        const barHeight = Math.abs(bar.base - bar.y);
        if (barHeight < 24) return;
        const label = opts.formatter ? opts.formatter(value) : value;
        ctx.save();
        ctx.fillStyle = '#F2F4F7';
        ctx.font = '600 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        const yPos = value >= 0 ? bar.y - 8 : bar.y + 16;
        ctx.fillText(label, bar.x, yPos);
        ctx.restore();
      });
    });
  }
};
Chart.register(dataLabelPlugin);

function barOptions(tooltipFmt, axisFmt) {
  axisFmt = axisFmt || tooltipFmt;
  return {
    responsive: true, maintainAspectRatio: false,
    layout: { padding: { top: 20 } },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (c) => tooltipFmt(c.raw) } },
      dataLabelPlugin: { formatter: tooltipFmt }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#9AA4B2', font: { size: 11 } } },
      y: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#9AA4B2', callback: (v) => axisFmt(v) } }
    }
  };
}

/* ---- Channel Comparison ---- */
let compareChartInstance = null;
let compareChartMinorInstance = null;

function renderCompareControls() {
  const metricSel = document.getElementById('compareMetric');
  metricSel.innerHTML = '';
  Object.keys(CHANNEL_GROUPS).forEach(metric => {
    if (!CHANNEL_GROUPS[metric] || !CHANNEL_GROUPS[metric].length) return;
    metricSel.appendChild(new Option(metric, metric));
  });
  metricSel.onchange = renderCompareChart;
}

function renderCompareChart() {
  const metric = document.getElementById('compareMetric').value;
  const months = selectedMonths.length ? selectedMonths : RAW.months;
  const rows = CHANNEL_GROUPS[metric] || [];
  const labels = rows.map(r => r.label.replace('Snackible-','').replace(' sales channel','').replace(' Channels',''));
  const data = rows.map(r => sumAcrossMonths(r, months));
  const ctx = document.getElementById('compareChart');
  if (compareChartInstance) compareChartInstance.destroy();
  compareChartInstance = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor: data.map(v => (v !== null && v < 0) ? '#E35C25' : '#3ABCA2'), borderRadius: 6, maxBarThickness: 56 }] },
    options: barOptions(fmtFull, fmtCurrency)
  });
  document.getElementById('compareChartMinorWrap').style.display = 'none';
}

/* ---- Trend ---- */
let trendChartInstance = null;

function renderTrendControls() {
  const sel = document.getElementById('trendMetric');
  sel.innerHTML = '';
  const seen = new Set();
  RAW.rows.forEach(r => {
    const marker = GROUP_MARKERS.find(m => m.label === r.label);
    const isKpi = KPI_ROWS.find(k => k.key === r.label);
    if ((marker || isKpi) && !seen.has(r.label)) {
      seen.add(r.label);
      const opt = new Option(marker ? marker.metric : isKpi.label, r.label);
      sel.appendChild(opt);
    }
  });
  sel.onchange = renderTrendChart;
}

/* FIX BUG 4 (trend): ensure canvas is ready before drawing */
function renderTrendChart() {
  const label = document.getElementById('trendMetric').value;
  if (!label) return;
  const row = TOTALS_BY_LABEL[label];
  if (!row) return;
  const months = selectedMonths.length ? selectedMonths : RAW.months;
  const data = months.map(m => row.values[m] ?? null);
  const ctx = document.getElementById('trendChart');
  if (!ctx) return;
  if (trendChartInstance) { trendChartInstance.destroy(); trendChartInstance = null; }
  trendChartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels: months, datasets: [{ data, borderColor: '#3ABCA2', backgroundColor: 'rgba(58,188,162,0.14)', fill: true, tension: 0.3, pointRadius: 4, pointBackgroundColor: '#3ABCA2', borderWidth: 2 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      layout: { padding: { top: 20 } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => fmtFull(c.raw) } }, dataLabelPlugin: { formatter: fmtCurrency } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#9AA4B2' } },
        y: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#9AA4B2', callback: (v) => fmtCurrency(v) } }
      }
    }
  });
}

/* ---- Ratios ---- */
let ratioChartInstances = {};

function renderRatiosGrid() {
  const grid = document.getElementById('ratioGrid');
  const months = selectedMonths.length ? selectedMonths : RAW.months;
  const monthNote = document.getElementById('ratioMonthNote');
  if (!months.length) {
    monthNote.textContent = 'No months selected.';
  } else if (months.length === 1) {
    monthNote.textContent = 'Showing '+months[0]+'.';
  } else {
    monthNote.textContent = 'Cumulative across '+months.length+' months: '+months[0]+' → '+months[months.length-1]+'.';
  }

  if (grid.children.length === 0) {
    RATIO_DEFINITIONS.forEach(def => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = '<div class="card-header"><div class="card-title">'+def.label+'</div></div><div class="chart-wrap" style="height:220px;"><canvas id="ratioChart_'+def.key+'"></canvas></div>';
      grid.appendChild(card);
    });
  }

  RATIO_DEFINITIONS.forEach(def => {
    const denomRows = CHANNEL_GROUPS['Revenue'] || [];
    let labels, data;
    if (def.channelMetric && CHANNEL_GROUPS[def.channelMetric] && CHANNEL_GROUPS[def.channelMetric].length) {
      const numRows = CHANNEL_GROUPS[def.channelMetric];
      labels = numRows.map(r => r.label.replace('Snackible-','').replace(' sales channel','').replace(' Channels',''));
      data = numRows.map(r => {
        const denomRow = denomRows.find(d => d.label === r.label);
        const num = sumAcrossMonths(r, months);
        const denom = denomRow ? sumAcrossMonths(denomRow, months) : null;
        if (num === null || denom === null || denom === 0) return null;
        return (num / denom) * 100;
      });
    } else {
      const numRow = TOTALS_BY_LABEL[def.totalLabel];
      const denomRow = TOTALS_BY_LABEL['Total Revenue'];
      const num = numRow ? sumAcrossMonths(numRow, months) : null;
      const denom = denomRow ? sumAcrossMonths(denomRow, months) : null;
      labels = ['Overall'];
      data = [(num === null || denom === null || denom === 0) ? null : (num/denom)*100];
    }
    const ctx = document.getElementById('ratioChart_'+def.key);
    if (!ctx) return;
    if (ratioChartInstances[def.key]) { ratioChartInstances[def.key].destroy(); }
    ratioChartInstances[def.key] = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ data, backgroundColor: data.map(v => (v !== null && v < 0) ? '#E35C25' : '#FBAE25'), borderRadius: 6, maxBarThickness: 48 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        layout: { padding: { top: 20 } },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => fmtPct(c.raw) } }, dataLabelPlugin: { formatter: fmtPct } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#9AA4B2', font: { size: 10 } } },
          y: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#9AA4B2', font: { size: 10 }, callback: (v) => v+'%' } }
        }
      }
    });
  });
}

/* ---- Cumulative ---- */
let cumChartInstance = null;
let cumChartMinorInstance = null;

function renderCumulativeControls() {
  const sel = document.getElementById('cumMetric');
  sel.innerHTML = '';
  Object.keys(CHANNEL_GROUPS).forEach(metric => {
    if (!CHANNEL_GROUPS[metric] || !CHANNEL_GROUPS[metric].length) return;
    sel.appendChild(new Option(metric, metric));
  });
  sel.onchange = renderCumulative;
}

function getDisplayRows() {
  const channelSet = new Set(CHANNELS);
  const result = [];
  let buffer = [];
  const flush = (endRow) => {
    const lastIdx = {};
    buffer.forEach((r, i) => { if (channelSet.has(r.label)) lastIdx[r.label] = i; });
    buffer.forEach((r, i) => {
      if (channelSet.has(r.label) && lastIdx[r.label] !== i) return;
      result.push(r);
    });
    if (endRow) result.push(endRow);
    buffer = [];
  };
  RAW.rows.forEach(row => {
    const marker = GROUP_MARKERS.find(m => m.label === row.label);
    if (marker) { flush(row); } else { buffer.push(row); }
  });
  flush(null);
  return result;
}

function renderCumulative() {
  const months = selectedMonths.length ? selectedMonths : RAW.months;
  const grid = document.getElementById('cumKpiGrid');
  grid.innerHTML = '';
  KPI_ROWS.forEach(kpi => {
    const row = TOTALS_BY_LABEL[kpi.key];
    const val = row ? sumAcrossMonths(row, months) : null;
    const card = document.createElement('div');
    card.className = 'kpi-card';
    const isNeg = val !== null && val < 0;
    card.innerHTML = '<div class="kpi-label">'+kpi.label+'</div><div class="kpi-value" style="'+( isNeg?'color:var(--red)':'')+'">'+fmtCurrency(val)+'</div>';
    grid.appendChild(card);
  });

  const metric = document.getElementById('cumMetric').value;
  const rows = CHANNEL_GROUPS[metric] || [];
  const labels = rows.map(r => r.label.replace('Snackible-','').replace(' sales channel','').replace(' Channels',''));
  const data = rows.map(r => sumAcrossMonths(r, months));
  const ctx = document.getElementById('cumChart');
  if (!ctx) return;
  if (cumChartInstance) cumChartInstance.destroy();
  cumChartInstance = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor: data.map(v => (v !== null && v < 0) ? '#E35C25' : '#3ABCA2'), borderRadius: 6, maxBarThickness: 56 }] },
    options: barOptions(fmtFull, fmtCurrency)
  });
  document.getElementById('cumChartMinorWrap').style.display = 'none';

  document.getElementById('cumTableHead').innerHTML = '<th>Line Item</th><th>Cumulative ('+months.length+' mo)</th>';
  const body = document.getElementById('cumTableBody');
  body.innerHTML = '';
  getDisplayRows().forEach(row => {
    const isPct = row.label.trim().startsWith('%');
    const isTotal = row.label.toLowerCase().includes('total') || ['Gross margin','EBITDA'].includes(row.label);
    const val = sumAcrossMonths(row, months);
    const tr = document.createElement('tr');
    if (isTotal) tr.className = 'group-total';
    let display = '—';
    if (val !== null) display = isPct ? fmtPct(val/months.length) : fmtFull(val);
    tr.innerHTML = '<td>'+row.label+'</td><td>'+display+'</td>';
    body.appendChild(tr);
  });
}

/* ---- Full Table ---- */
function renderTable() {
  document.getElementById('tableHead').innerHTML = '<th>Line Item</th>'+RAW.months.map(m => '<th>'+m+'</th>').join('');
  const body = document.getElementById('tableBody');
  body.innerHTML = '';
  getDisplayRows().forEach(row => {
    const isTotal = row.label.toLowerCase().includes('total') || ['Gross margin','EBITDA'].includes(row.label);
    const isPct = row.label.trim().startsWith('%');
    const tr = document.createElement('tr');
    if (isTotal) tr.className = 'group-total';
    const cells = ['<td>'+row.label+'</td>'].concat(
      RAW.months.map(m => {
        const v = row.values[m];
        if (v === null || v === undefined) return '<td>—</td>';
        return '<td>'+( isPct ? v.toFixed(1)+'%' : fmtFull(v))+'</td>';
      })
    );
    tr.innerHTML = cells.join('');
    body.appendChild(tr);
  });
}

/* ---- Month selector ---- */
function renderMonthSelector() {
  const rangeFrom = document.getElementById('rangeFrom');
  const rangeTo = document.getElementById('rangeTo');
  rangeFrom.innerHTML = ''; rangeTo.innerHTML = '';
  RAW.months.forEach(m => {
    rangeFrom.appendChild(new Option(m,m));
    rangeTo.appendChild(new Option(m,m));
  });
  rangeFrom.value = RAW.months[0];
  rangeTo.value = RAW.months[RAW.months.length-1];

  const checksWrap = document.getElementById('monthChecks');
  checksWrap.innerHTML = '';
  RAW.months.forEach(m => {
    const chip = document.createElement('label');
    chip.className = 'month-chip checked';
    chip.innerHTML = '<input type="checkbox" checked value="'+m+'"> '+m;
    chip.querySelector('input').addEventListener('change', e => {
      chip.classList.toggle('checked', e.target.checked);
      updateSelectedMonths();
    });
    checksWrap.appendChild(chip);
  });

  document.getElementById('selectAllMonths').onclick = () => {
    checksWrap.querySelectorAll('input').forEach(i => { i.checked = true; i.closest('.month-chip').classList.add('checked'); });
    updateSelectedMonths();
  };
  document.getElementById('clearMonths').onclick = () => {
    checksWrap.querySelectorAll('input').forEach(i => { i.checked = false; i.closest('.month-chip').classList.remove('checked'); });
    updateSelectedMonths();
  };
  function applyRange() {
    const fromIdx = RAW.months.indexOf(rangeFrom.value);
    const toIdx = RAW.months.indexOf(rangeTo.value);
    const lo = Math.min(fromIdx,toIdx), hi = Math.max(fromIdx,toIdx);
    checksWrap.querySelectorAll('input').forEach((i,idx) => {
      const checked = idx >= lo && idx <= hi;
      i.checked = checked;
      i.closest('.month-chip').classList.toggle('checked', checked);
    });
    updateSelectedMonths();
  }
  document.getElementById('applyRange').onclick = applyRange;
  rangeFrom.onchange = applyRange;
  rangeTo.onchange = applyRange;
}

function updateSelectedMonths() {
  const checked = Array.from(document.querySelectorAll('#monthChecks input:checked')).map(i => i.value);
  selectedMonths = RAW.months.filter(m => checked.includes(m));
  updateBadge();
  renderKPIs();
  renderCompareChart();
  renderTrendChart();
  renderRatiosGrid();
  renderCumulative();
}

/* ---- Tabs ---- */
function initTabs() {
  /* ---- Main tabs ---- */
  document.querySelectorAll('.main-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const main = btn.dataset.main;
      document.querySelectorAll('.main-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.main-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.getElementById('main-'+main);
      if (panel) panel.classList.add('active');
      if (main === 'investor') {
        const firstSub = document.querySelector('[data-main="investor"].sub-tab');
        if (firstSub) firstSub.click();
        document.getElementById('monthSelectorBar').style.display = 'none';
      } else {
        document.getElementById('monthSelectorBar').style.display = '';
      }
    });
  });

  /* ---- MIS sub-tabs ---- */
  document.querySelectorAll('.sub-tab[data-main="mis"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const sub = btn.dataset.sub;
      document.querySelectorAll('.sub-tab[data-main="mis"]').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('#main-mis .sub-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.getElementById('sub-'+sub);
      if (panel) panel.classList.add('active');
      if (sub === 'trend') setTimeout(renderTrendChart, 10);
      if (sub === 'yoy')   setTimeout(initYoY, 10);
      if (sub === 'estva') setTimeout(initEstVsAct, 10);
      const hideSubs = ['estva'];
      document.getElementById('monthSelectorBar').style.display = hideSubs.includes(sub) ? 'none' : '';
    });
  });

  /* ---- Investor sub-tabs ---- */
  document.querySelectorAll('.sub-tab[data-main="investor"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const sub = btn.dataset.sub;
      document.querySelectorAll('.sub-tab[data-main="investor"]').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('#main-investor .sub-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.getElementById('sub-'+sub);
      if (panel) panel.classList.add('active');
      if (sub === 'captable')        setTimeout(renderCapTable, 10);
      if (sub === 'investorhistory') setTimeout(initInvestorHistory, 10);
    });
  });
}

function render() {
  renderKPIs();
  renderMonthSelector();
  renderCompareControls();
  renderCompareChart();
  renderTrendControls();
  renderRatiosGrid();
  renderCumulativeControls();
  renderCumulative();
  renderTable();
  // FIX BUG 4 (trend): defer trend render so canvas is in DOM
  setTimeout(renderTrendChart, 50);
}

/* ---- Cap Table ---- */
const CAP_TABLE_DATA = [
  { name: 'Promoters',               ord: 13441, classA: 0,    ccps: 0,    ccd: 0   },
  { name: 'ESOP',                    ord: 1403,  classA: 0,    ccps: 0,    ccd: 0   },
  { name: 'Other Early Investors',   ord: 6274,  classA: 262,  ccps: 392,  ccd: 0   },
  { name: 'MA Group',                ord: 93,    classA: 1811, ccps: 1246, ccd: 0   },
  { name: '1Crowd Fund',             ord: 0,     classA: 1998, ccps: 307,  ccd: 0   },
  { name: '1Crowd Angels',           ord: 0,     classA: 2204, ccps: 1190, ccd: 0   },
  { name: 'Zeva CCD',                ord: 0,     classA: 0,    ccps: 0,    ccd: 666 },
  { name: 'OIP Group',               ord: 0,     classA: 974,  ccps: 0,    ccd: 0   },
  { name: 'Jito Group',              ord: 0,     classA: 540,  ccps: 6,    ccd: 0   },
  { name: 'Desai Brothers Ltd',      ord: 0,     classA: 1356, ccps: 447,  ccd: 0   },
  { name: 'Other Investors Group I', ord: 0,     classA: 1215, ccps: 154,  ccd: 0   },
  { name: 'Other Investors Group II',ord: 11,    classA: 2161, ccps: 6139, ccd: 0   },
  { name: 'Deepak Agarwal (Bikaji)', ord: 0,     classA: 0,    ccps: 4261, ccd: 0   },
  { name: 'Prajwal',                 ord: 0,     classA: 0,    ccps: 2630, ccd: 0   },
  { name: 'ABC Investor',            ord: 0,     classA: 0,    ccps: 0,    ccd: 0,  isNew: true },
];

let abcCCPS = 0;

function renderCapTable() {
  const grandTotal = CAP_TABLE_DATA.reduce((s, sh) => {
    return s + (sh.ord||0) + (sh.classA||0) + (sh.isNew ? abcCCPS : sh.ccps) + (sh.ccd||0);
  }, 0);

  const tbody = document.getElementById('capTableBody');
  tbody.innerHTML = '';

  CAP_TABLE_DATA.forEach(sh => {
    const ccps = sh.isNew ? abcCCPS : sh.ccps;
    const tot = (sh.ord||0) + (sh.classA||0) + ccps + (sh.ccd||0);
    const pct = grandTotal > 0 ? (tot / grandTotal) * 100 : 0;
    const barWidth = Math.min(Math.round(pct * 2.4), 80);
    const hl = sh.isNew ? 'background:var(--accent-soft);' : '';
    const nameCol = sh.isNew ? 'color:var(--accent);font-weight:600;' : '';

    const ccpsCell = sh.isNew
      ? '<div style="display:flex;align-items:center;justify-content:flex-end;"><input id="abcCcpsInput" type="number" min="0" step="1" value="'+abcCCPS+'" style="width:76px;padding:4px 8px;font-size:13px;text-align:right;border-radius:var(--radius-sm);border:1px solid var(--accent);background:var(--accent-soft);color:var(--accent);font-family:inherit;"></div>'
      : (sh.ccps > 0 ? sh.ccps.toLocaleString() : '—');

    const barHtml = tot > 0
      ? '<div style="display:flex;align-items:center;gap:8px;"><div style="height:4px;border-radius:2px;background:var(--accent);width:'+barWidth+'px;transition:width 150ms ease;flex-shrink:0;"></div><span style="min-width:44px;">'+pct.toFixed(2)+'%</span></div>'
      : '<span style="color:var(--text-tertiary);">—</span>';

    const td = (content, extra) => '<td style="padding:9px 12px;border-bottom:1px solid rgba(255,255,255,0.04);'+( hl)+(extra||'')+'">' + content + '</td>';

    const tr = document.createElement('tr');
    tr.innerHTML = td(sh.name, 'text-align:left;'+nameCol)
      + td(sh.ord > 0 ? sh.ord.toLocaleString() : '—', 'text-align:right;color:var(--text-secondary);')
      + td(sh.classA > 0 ? sh.classA.toLocaleString() : '—', 'text-align:right;color:var(--text-secondary);')
      + td(ccpsCell, 'text-align:right;color:var(--text-secondary);')
      + td(sh.ccd > 0 ? sh.ccd.toLocaleString() : '—', 'text-align:right;color:var(--text-secondary);')
      + td(tot > 0 ? tot.toLocaleString() : '—', 'text-align:right;color:var(--text-secondary);')
      + td(barHtml, 'text-align:left;');
    tbody.appendChild(tr);
  });

  const totalCCPS = CAP_TABLE_DATA.reduce((s,sh) => s+(sh.isNew ? abcCCPS : sh.ccps),0);
  const totalOrd  = CAP_TABLE_DATA.reduce((s,sh) => s+(sh.ord||0),0);
  const totalClaA = CAP_TABLE_DATA.reduce((s,sh) => s+(sh.classA||0),0);
  const totalCCD  = CAP_TABLE_DATA.reduce((s,sh) => s+(sh.ccd||0),0);
  const totalRow = document.createElement('tr');
  totalRow.className = 'group-total';
  totalRow.innerHTML = '<td style="padding:9px 12px;text-align:left;">Total</td>'
    + '<td style="padding:9px 12px;text-align:right;">'+totalOrd.toLocaleString()+'</td>'
    + '<td style="padding:9px 12px;text-align:right;">'+totalClaA.toLocaleString()+'</td>'
    + '<td style="padding:9px 12px;text-align:right;">'+totalCCPS.toLocaleString()+'</td>'
    + '<td style="padding:9px 12px;text-align:right;">'+totalCCD.toLocaleString()+'</td>'
    + '<td style="padding:9px 12px;text-align:right;">'+grandTotal.toLocaleString()+'</td>'
    + '<td style="padding:9px 12px;text-align:left;"><span style="min-width:44px;display:inline-block;">100.00%</span></td>';
  tbody.appendChild(totalRow);

  const input = document.getElementById('abcCcpsInput');
  if (input) {
    input.addEventListener('input', e => {
      abcCCPS = parseInt(e.target.value) || 0;
      const pos = e.target.selectionStart;
      renderCapTable();
      const ni = document.getElementById('abcCcpsInput');
      if (ni) { ni.focus(); try { ni.setSelectionRange(pos, pos); } catch(err){} }
    });
  }
}

/* Boot */
fetchAllData();


/* ---- Investor History ---- */
const IH_GROUPS = [
  { label: 'Nibhrant Shah & Family', color: '#3ABCA2', data: [0.4, 0.2, 0, 0, 0, 0, 0] },
  { label: 'Other angels',           color: '#5DCAA5', data: [0, 0.85, 1.59, 2.87, 2.65, 2.76, 2.0] },
  { label: '1Crowd Fund & Angels',   color: '#2a78d6', data: [0, 0, 0, 2.73, 1.66, 2.02, 0] },
  { label: 'Mumbai Angels (MAVM)',   color: '#85B7EB', data: [0, 0, 0, 1.46, 0.19, 1.02, 0] },
  { label: 'Desai Brothers',         color: '#FBAE25', data: [0, 0, 0, 0, 1.5, 0, 0] },
  { label: 'Bikaji FO',              color: '#E35C25', data: [0, 0, 0, 0, 0, 4.0, 2.5] },
  { label: 'Existing investors',     color: '#9FE1CB', data: [0, 0, 0, 0, 0, 0, 2.4] },
];
const IH_ROUND_LABELS = ['Pre-seed\n2015','Seed\n2016','Angel 1\n2017','Angel 2\n2018','Angel 3\n2020','Pre-A\n2022','Pre-A\n2023'];

const IH_INVESTORS = [
  { name: 'Nibhrant Shah & Family',  group: 'Early investors',      round: 'Pre-seed', date: 'Mar 2015',    amount: 4000000,  shares: 3125, pps: 1280 },
  { name: 'Nibhrant Shah & Family',  group: 'Early investors',      round: 'Seed',     date: 'Oct 2016',    amount: 2000000,  shares: 146,  pps: 13699 },
  { name: 'Anandbir Singh',          group: 'Early investors',      round: 'Seed',     date: 'Oct 2016',    amount: 316625,   shares: 149,  pps: 2124 },
  { name: 'Dhimaan Shah',            group: 'Early investors',      round: 'Seed',     date: 'Oct 2016',    amount: 295932,   shares: 39,   pps: 7588 },
  { name: 'Darshan Shah',            group: 'Early investors',      round: 'Seed',     date: 'Oct 2016',    amount: 1487248,  shares: 196,  pps: 7588 },
  { name: 'Other early angels',      group: 'Early investors',      round: 'Angel 1',  date: 'Mar 2017',    amount: 15900000, shares: 1109, pps: 14337 },
  { name: '1Crowd Fund',             group: '1Crowd Fund & Angels', round: 'Angel 2',  date: '08 Aug 2018', amount: 12996162, shares: 1266, pps: 10266 },
  { name: '1Crowd Angels',           group: '1Crowd Fund & Angels', round: 'Angel 2',  date: '21 Sep 2018', amount: 14316234, shares: 1046, pps: 13686 },
  { name: 'Akshay Chudasama (MAVM)', group: 'MAVM Angels',          round: 'Angel 2',  date: '11 Jul 2018', amount: 9225786,  shares: 899,  pps: 10262 },
  { name: 'Other MAVM angels',       group: 'MAVM Angels',          round: 'Angel 2',  date: '07 Oct 2018', amount: 5474214,  shares: 561,  pps: 9758  },
  { name: 'Other angels',            group: 'Other angels',         round: 'Angel 2',  date: '07 Oct 2018', amount: 28700000, shares: 2184, pps: 13141 },
  { name: '1Crowd Fund',             group: '1Crowd Fund & Angels', round: 'Angel 3',  date: '09 Dec 2020', amount: 8096652,  shares: 732,  pps: 11060 },
  { name: '1Crowd Angels',           group: '1Crowd Fund & Angels', round: 'Angel 3',  date: '09 Dec 2020', amount: 8603219,  shares: 634,  pps: 13570 },
  { name: 'Desai Brothers Limited',  group: 'Desai Brothers',       round: 'Angel 3',  date: '29 May 2021', amount: 14998716, shares: 1356, pps: 11062 },
  { name: 'JITO Group',              group: 'MAVM Angels',          round: 'Angel 3',  date: '28 Jan 2021', amount: 6070590,  shares: 546,  pps: 11118 },
  { name: 'Other angels',            group: 'Other angels',         round: 'Angel 3',  date: '07 Sep 2020', amount: 26500000, shares: 2400, pps: 11042 },
  { name: 'Deepak Agarwal (Bikaji)', group: 'Bikaji FO',            round: 'Pre-A',    date: '24 Mar 2023', amount: 39987675, shares: 2457, pps: 16275 },
  { name: '1Crowd Fund & Angels',    group: '1Crowd Fund & Angels', round: 'Pre-A',    date: '16 Dec 2021', amount: 20200000, shares: 1242, pps: 16264 },
  { name: 'MAVM Angels',             group: 'MAVM Angels',          round: 'Pre-A',    date: '13 Apr 2022', amount: 10200000, shares: 627,  pps: 16267 },
  { name: 'OIP Group',               group: 'Other angels',         round: 'Pre-A',    date: '05 May 2019', amount: 9996162,  shares: 974,  pps: 10263 },
  { name: 'Other angels',            group: 'Other angels',         round: 'Pre-A',    date: '04 Nov 2022', amount: 17600000, shares: 1082, pps: 16267 },
  { name: 'Deepak Agarwal (Bikaji)', group: 'Bikaji FO',            round: 'Pre-A',    date: '11 Jul 2023', amount: 24998400, shares: 1536, pps: 16275 },
  { name: 'Existing investors',      group: 'Existing investors',   round: 'Pre-A',    date: '22 Jun 2023', amount: 24000000, shares: 1476, pps: 16260 },
  { name: 'New investors (FY23)',    group: 'Other angels',         round: 'Pre-A',    date: '11 Jul 2023', amount: 20000000, shares: 1229, pps: 16274 },
];
let ihActiveRound = 'All';
let ihChartInstance = null;

function ihFmt(n) {
  if (n >= 10000000) return '₹' + (n/10000000).toFixed(2) + ' Cr';
  if (n >= 100000)   return '₹' + (n/100000).toFixed(1) + 'L';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

function initInvestorHistory() {
  const legend = document.getElementById('ihStackLegend');
  legend.innerHTML = '';
  IH_GROUPS.forEach(g => {
    const d = document.createElement('div'); d.className = 'ih-legend-item';
    d.innerHTML = '<span class="ih-legend-dot" style="background:' + g.color + '"></span>' + g.label;
    legend.appendChild(d);
  });

  const ctx = document.getElementById('ihStackChart');
  if (!ctx) return;
  if (ihChartInstance) { ihChartInstance.destroy(); ihChartInstance = null; }
  ihChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: IH_ROUND_LABELS,
      datasets: IH_GROUPS.map(g => ({
        label: g.label, data: g.data, backgroundColor: g.color, borderRadius: 2, borderSkipped: false
      }))
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => c.raw > 0 ? c.dataset.label + ': ₹' + c.raw + ' Cr' : null, filter: i => i.raw > 0 } },
        dataLabelPlugin: false
      },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { color: '#9AA4B2', font: { size: 10 }, maxRotation: 0 } },
        y: { stacked: true, grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#9AA4B2', callback: v => '₹' + v + 'Cr' } }
      }
    }
  });

  const pillGroup = document.getElementById('ihPillGroup');
  pillGroup.innerHTML = '';
  ['All','Pre-seed','Seed','Angel 1','Angel 2','Angel 3','Pre-A'].forEach(r => {
    const btn = document.createElement('button');
    btn.className = 'ih-pill' + (r === 'All' ? ' active' : '');
    btn.textContent = r;
    btn.onclick = () => {
      ihActiveRound = r;
      document.querySelectorAll('.ih-pill').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      renderIHDrill();
    };
    pillGroup.appendChild(btn);
  });

  renderIHDrill();
}

function renderIHDrill() {
  const filtered = ihActiveRound === 'All' ? IH_INVESTORS : IH_INVESTORS.filter(i => i.round === ihActiveRound);
  const totalAmt = filtered.reduce((s, i) => s + i.amount, 0);
  const totalShares = filtered.reduce((s, i) => s + i.shares, 0);

  document.getElementById('ihDrillTotal').textContent = ihFmt(totalAmt);
  document.getElementById('ihDrillShares').textContent = totalShares.toLocaleString('en-IN');
  document.getElementById('ihDrillCount').textContent = filtered.length;

  const tbody = document.getElementById('ihDrillBody');
  tbody.innerHTML = '';
  filtered.forEach(inv => {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td>' + inv.name + '</td>'
      + '<td style="color:var(--text-secondary)">' + inv.group + '</td>'
      + '<td style="color:var(--text-secondary)">' + inv.round + '</td>'
      + '<td style="text-align:right;color:var(--text-secondary)">' + inv.year + '</td>'
      + '<td style="text-align:right">' + ihFmt(inv.amount) + '</td>'
      + '<td style="text-align:right">' + inv.shares.toLocaleString('en-IN') + '</td>'
      + '<td style="text-align:right">₹' + inv.pps.toLocaleString('en-IN') + '</td>';
    tbody.appendChild(tr);
  });

  const tr = document.createElement('tr');
  tr.className = 'group-total';
  tr.innerHTML = '<td>Total</td><td></td><td></td>'
    + '<td style="text-align:right"></td>'
    + '<td style="text-align:right">' + ihFmt(totalAmt) + '</td>'
    + '<td style="text-align:right">' + totalShares.toLocaleString('en-IN') + '</td>'
    + '<td style="text-align:right">—</td>';
  tbody.appendChild(tr);
}



/* ---- YoY Comparison ---- */
const YOY_MONTHS = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];

const YOY_DATA = {
  rev25:  [9.26,12.51,12.41,14.34,15.63,22.55,24.27,12.93,13.85,17.38,17.34,14.10],
  rev26:  [19.66,18.88,19.83,24.54,21.92,26.64,26.95,33.12,31.10,22.59,22.11,23.55],
  gm25:   [47.8,49.8,44.6,47.6,46.7,50.7,47.8,47.1,49.9,51.4,47.8,47.3],
  gm26:   [47.1,38.6,46.8,48.9,50.7,49.6,57.7,37.9,44.2,52.8,52.7,50.6],
  cm125:  [25.8,32.6,30.2,31.5,29.7,36.5,32.9,32.6,33.9,36.8,33.9,32.7],
  cm126:  [36.8,24.1,34.6,36.9,38.0,37.5,43.9,29.6,34.0,40.9,39.8,38.2],
  eb25:   [-18.1,-12.1,-14.9,-18.7,-21.4,23.5,4.0,-15.3,-15.4,0.5,-7.0,-19.1],
  eb26:   [-13.3,-50.5,-25.5,-4.5,-14.5,5.3,-1.3,-5.6,5.1,-9.0,-7.1,-15.0],
};

let yoyCharts = {};

function initYoY() {
  Object.values(yoyCharts).forEach(c => { try { c.destroy(); } catch(e){} });
  yoyCharts = {};

  const tick = '#9AA4B2';
  const grid = 'rgba(255,255,255,0.06)';

  /* Revenue grouped bar — FY25, FY26, FY27 Q1 */
  const n = null;
  const rev27 = [22.58,27.97,30.01,n,n,n,n,n,n,n,n,n];
  const revCtx = document.getElementById('yoyRevChart');
  if (revCtx) {
    yoyCharts.rev = new Chart(revCtx, {
      type: 'bar',
      data: { labels: YOY_MONTHS, datasets: [
        { label:'FY25', data:YOY_DATA.rev25, backgroundColor:'#66708555', borderRadius:3, maxBarThickness:13 },
        { label:'FY26', data:YOY_DATA.rev26, backgroundColor:'#3ABCA2',   borderRadius:3, maxBarThickness:13 },
        { label:'FY27', data:rev27,           backgroundColor:'#2a78d6',   borderRadius:3, maxBarThickness:13 },
      ]},
      options: { responsive:true, maintainAspectRatio:false,
        layout:{ padding:{ top:4 } },
        plugins:{ legend:{display:false}, dataLabelPlugin:false,
          tooltip:{ callbacks:{ label:c => c.raw !== null ? `${c.dataset.label}: ₹${c.raw.toFixed(2)}Cr` : null, filter: i => i.raw !== null } }
        },
        scales:{
          x:{ grid:{display:false}, ticks:{color:tick,font:{size:10}} },
          y:{ grid:{color:grid}, ticks:{color:tick,callback:v=>'₹'+v+'Cr'}, beginAtZero:true }
        }
      }
    });
  }

  /* Margin lines — FY25, FY26, FY27 Q1 */
  const gm27   = [50.5,50.2,50.3,n,n,n,n,n,n,n,n,n];
  const cm1_27 = [39.8,38.8,38.9,n,n,n,n,n,n,n,n,n];
  const mgCtx = document.getElementById('yoyMarginChart');
  if (mgCtx) {
    yoyCharts.margin = new Chart(mgCtx, {
      type: 'line',
      data: { labels: YOY_MONTHS, datasets: [
        { label:'FY26 GM%',  data:YOY_DATA.gm26,  borderColor:'#3ABCA2', borderWidth:2, pointRadius:3, pointBackgroundColor:'#3ABCA2', fill:false, tension:0.3 },
        { label:'FY26 CM1%', data:YOY_DATA.cm126, borderColor:'#3ABCA2', borderDash:[5,4], borderWidth:2, pointRadius:2, pointBackgroundColor:'#3ABCA2', fill:false, tension:0.3 },
        { label:'FY25 GM%',  data:YOY_DATA.gm25,  borderColor:'#667085', borderWidth:2, pointRadius:3, pointBackgroundColor:'#667085', fill:false, tension:0.3 },
        { label:'FY25 CM1%', data:YOY_DATA.cm125, borderColor:'#667085', borderDash:[5,4], borderWidth:2, pointRadius:2, pointBackgroundColor:'#667085', fill:false, tension:0.3 },
        { label:'FY27 GM%',  data:gm27,   borderColor:'#2a78d6', borderWidth:2, pointRadius:4, pointBackgroundColor:'#2a78d6', fill:false, tension:0.3, spanGaps:false },
        { label:'FY27 CM1%', data:cm1_27, borderColor:'#2a78d6', borderDash:[5,4], borderWidth:2, pointRadius:3, pointBackgroundColor:'#2a78d6', fill:false, tension:0.3, spanGaps:false },
      ]},
      options: { responsive:true, maintainAspectRatio:false,
        layout:{ padding:{ left:8, top:8, right:8 } },
        plugins:{ legend:{display:false}, dataLabelPlugin:false,
          tooltip:{ callbacks:{ label:c => c.raw !== null ? `${c.dataset.label}: ${c.raw.toFixed(1)}%` : null, filter: i => i.raw !== null } }
        },
        scales:{
          x:{ grid:{display:false}, ticks:{color:tick,font:{size:10}} },
          y:{ grid:{color:grid}, ticks:{color:tick,callback:v=>v+'%'}, min:20, max:65 }
        }
      }
    });
  }
  /* EBITDA Option A — two separate line charts, same scale */
  const ebMin = -60, ebMax = 30;
  const ebLineOpts = (color) => ({
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:c=>`₹${c.raw.toFixed(1)}L` } } },
    scales:{
      x:{ grid:{display:false}, ticks:{color:tick,font:{size:10}} },
      y:{ grid:{color:grid}, ticks:{color:tick,callback:v=>v+'L'}, min:ebMin, max:ebMax,
        afterDataLimits(scale) { scale.min = ebMin; scale.max = ebMax; } }
    }
  });

  /* Zero baseline plugin for EBITDA charts */
  const zeroLine = {
    id:'zeroLine',
    afterDraw(chart) {
      const { ctx, chartArea:{ left, right }, scales:{ y } } = chart;
      const y0 = y.getPixelForValue(0);
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4,3]);
      ctx.beginPath(); ctx.moveTo(left, y0); ctx.lineTo(right, y0); ctx.stroke();
      ctx.restore();
    }
  };

  const eb25Ctx = document.getElementById('yoyEb25Chart');
  if (eb25Ctx) {
    yoyCharts.eb25 = new Chart(eb25Ctx, {
      type: 'line',
      data: { labels: YOY_MONTHS, datasets:[{
        label:'FY25', data:YOY_DATA.eb25,
        borderColor:'#667085', backgroundColor:'rgba(102,112,133,0.08)',
        fill:true, borderWidth:2, pointRadius:4,
        pointBackgroundColor: YOY_DATA.eb25.map(v => v >= 0 ? '#3ABCA2' : '#E35C25'),
        pointBorderColor:'#111722', pointBorderWidth:2, tension:0.3
      }]},
      options: ebLineOpts('#667085'),
      plugins:[zeroLine]
    });
  }

  const eb26Ctx = document.getElementById('yoyEb26Chart');
  if (eb26Ctx) {
    yoyCharts.eb26 = new Chart(eb26Ctx, {
      type: 'line',
      data: { labels: YOY_MONTHS, datasets:[{
        label:'FY26', data:YOY_DATA.eb26,
        borderColor:'#3ABCA2', backgroundColor:'rgba(58,188,162,0.08)',
        fill:true, borderWidth:2, pointRadius:4,
        pointBackgroundColor: YOY_DATA.eb26.map(v => v >= 0 ? '#3ABCA2' : '#E35C25'),
        pointBorderColor:'#111722', pointBorderWidth:2, tension:0.3
      }]},
      options: ebLineOpts('#3ABCA2'),
      plugins:[zeroLine]
    });
  }
  /* Channel mix stacked 100% */
  const mixCtx = document.getElementById('yoyMixChart');
  if (mixCtx) {
    yoyCharts.mix = new Chart(mixCtx, {
      type: 'bar',
      data: {
        labels: ['FY25','FY26'],
        datasets: [
          { label:'QCom',     data:[60.9,64.8], backgroundColor:'#3ABCA2', maxBarThickness:100 },
          { label:'B2B',      data:[21.4,17.4], backgroundColor:'#2a78d6', maxBarThickness:100 },
          { label:'Own site', data:[14.5,12.5], backgroundColor:'#FBAE25', maxBarThickness:100 },
          { label:'GT+MT',    data:[3.2,5.3],   backgroundColor:'#888780', maxBarThickness:100 },
        ]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:c=>`${c.dataset.label}: ${c.raw}%` } } },
        scales:{
          x:{ stacked:true, grid:{display:false}, ticks:{color:tick,font:{size:13,weight:'500'}} },
          y:{ stacked:true, grid:{color:grid}, ticks:{color:tick,callback:v=>v+'%'}, max:100 }
        }
      }
    });
  }

  /* Cost structure horizontal grouped */
  const costCtx = document.getElementById('yoyCostChart');
  if (costCtx) {
    yoyCharts.cost = new Chart(costCtx, {
      type: 'bar',
      indexAxis: 'y',
      data: {
        labels: ['COGS','Marketing','Indirect opex','Delivery','Labour','Commission'],
        datasets: [
          { label:'FY25', data:[52.4,33.1,11.9,11.2,3.6,0.3], backgroundColor:'#66708560', borderRadius:3, maxBarThickness:14 },
          { label:'FY26', data:[52.0,33.3,9.6,9.5,2.3,0.3],   backgroundColor:'#3ABCA2',   borderRadius:3, maxBarThickness:14 },
        ]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:c=>`${c.dataset.label}: ${c.raw}%` } } },
        scales:{
          x:{ grid:{color:grid}, ticks:{color:tick,callback:v=>v+'%'} },
          y:{ grid:{display:false}, ticks:{color:tick,font:{size:11}} }
        }
      }
    });
  }

  /* CM2 by channel grouped */
  const cm2Ctx = document.getElementById('yoyCm2Chart');
  if (cm2Ctx) {
    const cm2_25 = [-0.89, 0.97, 6.87, -0.42, 0.09];
    const cm2_26 = [0.73, -1.08, 16.38, 0.13, 0.43];
    yoyCharts.cm2 = new Chart(cm2Ctx, {
      type: 'bar',
      data: {
        labels: ['Own site','QCom','B2B','Gen Trade','Mod Trade'],
        datasets: [
          { label:'FY25', data:cm2_25, backgroundColor:'#66708560', borderRadius:4, maxBarThickness:24 },
          { label:'FY26', data:cm2_26, backgroundColor:cm2_26.map(v=>v>=0?'#3ABCA2':'#E35C25'), borderRadius:4, maxBarThickness:24 },
        ]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:c=>`${c.dataset.label}: ₹${c.raw.toFixed(2)}Cr` } } },
        scales:{
          x:{ grid:{display:false}, ticks:{color:tick,font:{size:11}} },
          y:{ grid:{color:grid}, ticks:{color:tick,callback:v=>'₹'+v+'Cr'} }
        }
      }
    });
  }
}
