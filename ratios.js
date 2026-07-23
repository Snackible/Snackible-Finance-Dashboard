let ratioChartInstances = {};

function renderRatiosGrid() {
  const grid = document.getElementById('ratioGrid');
  const months = selectedMonths.length ? selectedMonths : RAW.months;
  const note = document.getElementById('ratioMonthNote');
  if (!months.length) note.textContent = 'No months selected.';
  else if (months.length === 1) note.textContent = 'Showing '+months[0]+'.';
  else note.textContent = 'Cumulative across '+months.length+' months: '+months[0]+' → '+months[months.length-1]+'.';

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
        return (num/denom)*100;
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
    if (ratioChartInstances[def.key]) ratioChartInstances[def.key].destroy();
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
