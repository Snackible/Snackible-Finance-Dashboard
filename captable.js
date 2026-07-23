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
    const pct = grandTotal > 0 ? (tot/grandTotal)*100 : 0;
    const barWidth = Math.min(Math.round(pct*2.4), 80);
    const hl = sh.isNew ? 'background:var(--accent-soft);' : '';
    const nameCol = sh.isNew ? 'color:var(--accent);font-weight:600;' : '';

    const ccpsCell = sh.isNew
      ? '<div style="display:flex;align-items:center;justify-content:flex-end;"><input id="abcCcpsInput" type="number" min="0" step="1" value="'+abcCCPS+'" style="width:76px;padding:4px 8px;font-size:13px;text-align:right;border-radius:var(--radius-sm);border:1px solid var(--accent);background:var(--accent-soft);color:var(--accent);font-family:inherit;"></div>'
      : (sh.ccps > 0 ? sh.ccps.toLocaleString() : '—');

    const barHtml = tot > 0
      ? '<div style="display:flex;align-items:center;gap:8px;"><div style="height:4px;border-radius:2px;background:var(--accent);width:'+barWidth+'px;transition:width 150ms ease;flex-shrink:0;"></div><span style="min-width:44px;">'+pct.toFixed(2)+'%</span></div>'
      : '<span style="color:var(--text-tertiary);">—</span>';

    const td = (content, extra) => '<td style="padding:9px 12px;border-bottom:1px solid rgba(255,255,255,0.04);'+hl+(extra||'')+'">' + content + '</td>';
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
      if (ni) { ni.focus(); try { ni.setSelectionRange(pos,pos); } catch(err){} }
    });
  }
}
