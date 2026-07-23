/* ---- Global state ---- */
const ALL_FY_DATA = { FY25: FY25_DATA, FY26: FY26_DATA };

const CHANNELS = ['Snackible-Own website','Online Alternate Channels','B2B/Institutional sales channel','General Trade','Modern Trade'];

const GROUP_MARKERS = [
  { label: 'Total Revenue',          metric: 'Revenue' },
  { label: 'Total cost of goods',    metric: 'Cost of Goods Sold' },
  { label: 'Gross margin',           metric: 'Gross Margin' },
  { label: 'Total Labour Expense',   metric: 'Labour Charges' },
  { label: 'Total Delivery Expense', metric: 'Delivery Expense' },
  { label: 'Total CM1',              metric: 'CM1' },
  { label: 'Total Marketing Expenses', metric: 'Marketing Expenses' },
  { label: 'Total CM2',              metric: 'CM2' },
  { label: 'Total Indirect Expenses', metric: 'Other Indirect Expenses' }
];

const KPI_ROWS = [
  { key: 'Total Net Revenue',  label: 'Net Revenue' },
  { key: 'Gross margin',       label: 'Gross Margin' },
  { key: 'Total CM1',          label: 'CM1' },
  { key: 'Total CM2',          label: 'CM2' },
  { key: 'EBITDA',             label: 'EBITDA' }
];

const RATIO_DEFINITIONS = [
  { key: 'cogs_pct',         label: 'COGS % of Revenue',              totalLabel: 'Total cost of goods',     channelMetric: 'Cost of Goods Sold' },
  { key: 'gross_margin_pct', label: 'Gross Margin %',                  totalLabel: 'Gross margin',             channelMetric: 'Gross Margin' },
  { key: 'labour_pct',       label: 'Labour % of Revenue',             totalLabel: 'Total Labour Expense',    channelMetric: 'Labour Charges' },
  { key: 'delivery_pct',     label: 'Delivery % of Revenue',           totalLabel: 'Total Delivery Expense',  channelMetric: 'Delivery Expense' },
  { key: 'cm1_pct',          label: 'CM1 %',                           totalLabel: 'Total CM1',               channelMetric: 'CM1' },
  { key: 'marketing_pct',    label: 'Marketing % of Revenue',          totalLabel: 'Total Marketing Expenses',channelMetric: 'Marketing Expenses' },
  { key: 'cm2_pct',          label: 'CM2 %',                           totalLabel: 'Total CM2',               channelMetric: 'CM2' },
  { key: 'opex_pct',         label: 'Other Indirect Expenses % of Revenue', totalLabel: 'Total Indirect Expenses', channelMetric: null }
];

const MARKETING_CHANNEL_MAP = {
  'Snackible-Own website':          ['Snackible-Online [Facebook]','Snackible-Online [Google]','Snackible-Online [Discounts]','Snackible-Online [Whatsapp]'],
  'Online Alternate Channels':      ['Online Alternate Channels','Other Marketing Expenses'],
  'B2B/Institutional sales channel':['B2B/Institutional Sales'],
  'General Trade':                  ['General Trade'],
  'Modern Trade':                   []
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

/* ---- Data processing ---- */
function sumAcrossMonths(row, months) {
  let sum = 0, hasValue = false;
  months.forEach(m => {
    const v = row.values[m];
    if (v !== null && v !== undefined) { sum += v; hasValue = true; }
  });
  return hasValue ? sum : null;
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
        const mktRows = RAW.rows.filter(r => r.label === lbl);
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

function lastSelectedMonth() {
  return selectedMonths.length ? selectedMonths[selectedMonths.length-1] : RAW.months[RAW.months.length-1];
}
function prevSelectedMonth() {
  return selectedMonths.length > 1 ? selectedMonths[selectedMonths.length-2] : (RAW.months.length > 1 ? RAW.months[RAW.months.length-2] : null);
}

function getDisplayRows() {
  const channelSet = new Set(CHANNELS);
  const result = [];
  let buffer = [];
  const flush = (endRow) => {
    const lastIdx = {};
    buffer.forEach((r,i) => { if (channelSet.has(r.label)) lastIdx[r.label] = i; });
    buffer.forEach((r,i) => { if (channelSet.has(r.label) && lastIdx[r.label] !== i) return; result.push(r); });
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

/* ---- Badge ---- */
function updateBadge() {
  if (!selectedMonths.length) { document.getElementById('latestMonthBadge').textContent = 'No months'; return; }
  if (selectedMonths.length === RAW.months.length) document.getElementById('latestMonthBadge').textContent = 'All months';
  else if (selectedMonths.length === 1) document.getElementById('latestMonthBadge').textContent = selectedMonths[0];
  else document.getElementById('latestMonthBadge').textContent = selectedMonths[0]+' → '+selectedMonths[selectedMonths.length-1];
}

/* ---- FY Switcher ---- */
function destroyAllCharts() {
  if (typeof compareChartInstance !== 'undefined' && compareChartInstance) { compareChartInstance.destroy(); compareChartInstance = null; }
  if (typeof compareChartMinorInstance !== 'undefined' && compareChartMinorInstance) { compareChartMinorInstance.destroy(); compareChartMinorInstance = null; }
  if (typeof trendChartInstance !== 'undefined' && trendChartInstance) { trendChartInstance.destroy(); trendChartInstance = null; }
  if (typeof cumChartInstance !== 'undefined' && cumChartInstance) { cumChartInstance.destroy(); cumChartInstance = null; }
  if (typeof cumChartMinorInstance !== 'undefined' && cumChartMinorInstance) { cumChartMinorInstance.destroy(); cumChartMinorInstance = null; }
}

function showFY27Stub() {
  document.getElementById('kpiGrid').innerHTML = '';
  document.getElementById('monthSelectorBar').style.display = 'none';
  document.querySelector('.tabs').style.display = 'none';
  ['compare','trend','ratios','cumulative','table','captable','investorhistory','yoy'].forEach(t => {
    const p = document.getElementById('panel-'+t);
    if (p) p.classList.remove('active');
  });
  let stub = document.getElementById('fy27Stub');
  if (!stub) {
    stub = document.createElement('div');
    stub.id = 'fy27Stub';
    stub.className = 'empty-state';
    stub.style.marginTop = '80px';
    stub.innerHTML = '<div style="font-size:32px;margin-bottom:16px;">📊</div><div style="font-size:16px;font-weight:600;color:var(--text-primary);margin-bottom:8px;">FY27 data coming soon</div><div style="color:var(--text-tertiary);font-size:13px;">Once the MIS is confirmed in Google Sheets, this will pull live.</div>';
    document.querySelector('.shell').appendChild(stub);
  }
  stub.style.display = 'block';
  document.getElementById('latestMonthBadge').textContent = 'FY27';
}

function loadFY(fy) {
  const stub = document.getElementById('fy27Stub');
  if (stub) stub.style.display = 'none';
  document.getElementById('monthSelectorBar').style.display = '';
  document.querySelector('.tabs').style.display = '';
  destroyAllCharts();
  if (typeof ratioChartInstances !== 'undefined') {
    Object.values(ratioChartInstances).forEach(c => { try { c.destroy(); } catch(e){} });
    ratioChartInstances = {};
  }
  document.getElementById('ratioGrid').innerHTML = '';
  CHANNEL_GROUPS = {};
  TOTALS_BY_LABEL = {};
  RAW = ALL_FY_DATA[fy];
  selectedMonths = [...RAW.months];
  processGroups();
  buildMarketingChannelGroup();
  updateBadge();
  render();
}

function initFYSwitcher() {
  document.querySelectorAll('.fy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const fy = btn.dataset.fy;
      document.querySelectorAll('.fy-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (fy === 'FY27') { showFY27Stub(); return; }
      currentFY = fy;
      loadFY(fy);
    });
  });
}

/* ---- KPI cards ---- */
function renderKPIs() {
  const grid = document.getElementById('kpiGrid');
  grid.innerHTML = '';
  const months = selectedMonths.length ? selectedMonths : RAW.months;
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
        deltaHtml = '<span class="kpi-delta '+(up?'up':'down')+'">'+(up?'↑':'↓')+' '+Math.abs(pct).toFixed(1)+'%</span><span class="kpi-context">MoM, '+pm+' → '+lm+'</span>';
      }
    }
    const card = document.createElement('div');
    card.className = 'kpi-card';
    const isNeg = val !== null && val < 0;
    card.innerHTML = '<div class="kpi-label">'+kpi.label+'</div><div class="kpi-value" style="'+(isNeg?'color:var(--red)':'')+'">'+fmtCurrency(val)+'</div><div>'+deltaHtml+'</div>';
    grid.appendChild(card);
  });
}

/* ---- Tab router ---- */
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.getElementById('panel-'+btn.dataset.tab);
      if (panel) panel.classList.add('active');
      if (btn.dataset.tab === 'trend') setTimeout(renderTrendChart, 10);
      if (btn.dataset.tab === 'captable') setTimeout(renderCapTable, 10);
      if (btn.dataset.tab === 'investorhistory') setTimeout(initInvestorHistory, 10);
      if (btn.dataset.tab === 'yoy') setTimeout(initYoY, 10);
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
  setTimeout(renderTrendChart, 50);
}

/* ---- Boot ---- */
initTabs();
initFYSwitcher();
loadFY('FY26');
renderCapTable();
