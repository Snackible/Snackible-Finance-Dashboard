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
