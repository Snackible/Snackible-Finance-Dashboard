let trendChartInstance = null;

function renderTrendControls() {
  const sel = document.getElementById('trendMetric');
  sel.innerHTML = '';
  const seen = new Set();
  RAW.rows.forEach(r => {
    const marker = GROUP_MARKERS.find(m => m.label === r.label);
    const isKpi  = KPI_ROWS.find(k => k.key === r.label);
    if ((marker || isKpi) && !seen.has(r.label)) {
      seen.add(r.label);
      sel.appendChild(new Option(marker ? marker.metric : isKpi.label, r.label));
    }
  });
  sel.onchange = renderTrendChart;
}

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
