let ihActiveRound = 'All';
let ihChartInstance = null;

function ihFmt(n) {
  if (n >= 10000000) return '₹'+(n/10000000).toFixed(2)+' Cr';
  if (n >= 100000)   return '₹'+(n/100000).toFixed(1)+'L';
  return '₹'+Math.round(n).toLocaleString('en-IN');
}

function initInvestorHistory() {
  const legend = document.getElementById('ihStackLegend');
  legend.innerHTML = '';
  IH_GROUPS.forEach(g => {
    const d = document.createElement('div'); d.className = 'ih-legend-item';
    d.innerHTML = '<span class="ih-legend-dot" style="background:'+g.color+'"></span>'+g.label;
    legend.appendChild(d);
  });

  const ctx = document.getElementById('ihStackChart');
  if (!ctx) return;
  if (ihChartInstance) { ihChartInstance.destroy(); ihChartInstance = null; }
  ihChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: IH_ROUND_LABELS,
      datasets: IH_GROUPS.map(g => ({ label:g.label, data:g.data, backgroundColor:g.color, borderRadius:2, borderSkipped:false }))
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:c=>c.raw>0?c.dataset.label+': ₹'+c.raw+' Cr':null, filter:i=>i.raw>0 } } },
      scales:{
        x:{ stacked:true, grid:{display:false}, ticks:{color:'#9AA4B2',font:{size:10},maxRotation:0} },
        y:{ stacked:true, grid:{color:'rgba(255,255,255,0.06)'}, ticks:{color:'#9AA4B2',callback:v=>'₹'+v+'Cr'} }
      }
    }
  });

  const pillGroup = document.getElementById('ihPillGroup');
  pillGroup.innerHTML = '';
  ['All','Pre-seed','Seed','Angel 1','Angel 2','Angel 3','Pre-A'].forEach(r => {
    const btn = document.createElement('button');
    btn.className = 'ih-pill'+(r==='All'?' active':'');
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
  const filtered = ihActiveRound==='All' ? IH_INVESTORS : IH_INVESTORS.filter(i => i.round===ihActiveRound);
  const totalAmt    = filtered.reduce((s,i) => s+i.amount, 0);
  const totalShares = filtered.reduce((s,i) => s+i.shares, 0);

  document.getElementById('ihDrillTotal').textContent  = ihFmt(totalAmt);
  document.getElementById('ihDrillShares').textContent = totalShares.toLocaleString('en-IN');
  document.getElementById('ihDrillCount').textContent  = filtered.length;

  const tbody = document.getElementById('ihDrillBody');
  tbody.innerHTML = '';
  filtered.forEach(inv => {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td>'+inv.name+'</td>'
      +'<td style="color:var(--text-secondary)">'+inv.group+'</td>'
      +'<td style="color:var(--text-secondary)">'+inv.round+'</td>'
      +'<td style="text-align:right;color:var(--text-secondary)">'+inv.year+'</td>'
      +'<td style="text-align:right">'+ihFmt(inv.amount)+'</td>'
      +'<td style="text-align:right">'+inv.shares.toLocaleString('en-IN')+'</td>'
      +'<td style="text-align:right">₹'+inv.pps.toLocaleString('en-IN')+'</td>';
    tbody.appendChild(tr);
  });

  const tr = document.createElement('tr');
  tr.className = 'group-total';
  tr.innerHTML = '<td>Total</td><td></td><td></td>'
    +'<td style="text-align:right"></td>'
    +'<td style="text-align:right">'+ihFmt(totalAmt)+'</td>'
    +'<td style="text-align:right">'+totalShares.toLocaleString('en-IN')+'</td>'
    +'<td style="text-align:right">—</td>';
  tbody.appendChild(tr);
}
