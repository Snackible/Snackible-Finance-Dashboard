/* ---- Shared Chart.js helpers ---- */
const dataLabelPlugin = {
  id: 'dataLabelPlugin',
  afterDatasetsDraw(chart, args, opts) {
    const { ctx } = chart;
    chart.data.datasets.forEach((dataset) => {
      const meta = chart.getDatasetMeta(chart.data.datasets.indexOf(dataset));
      meta.data.forEach((bar, index) => {
        const value = dataset.data[index];
        if (value === null || value === undefined) return;
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

const zeroLine = {
  id: 'zeroLine',
  afterDraw(chart) {
    const { ctx, chartArea: { left, right }, scales: { y } } = chart;
    const y0 = y.getPixelForValue(0);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4,3]);
    ctx.beginPath(); ctx.moveTo(left, y0); ctx.lineTo(right, y0); ctx.stroke();
    ctx.restore();
  }
};

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
