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
    card.innerHTML = '<div class="kpi-label">'+kpi.label+'</div><div class="kpi-value" style="'+(isNeg?'color:var(--red)':'')+'">'+fmtCurrency(val)+'</div>';
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
