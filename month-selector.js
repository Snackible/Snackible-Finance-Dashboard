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

  function applyRange() {
    const fromIdx = RAW.months.indexOf(rangeFrom.value);
    const toIdx   = RAW.months.indexOf(rangeTo.value);
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
  rangeTo.onchange   = applyRange;

  document.getElementById('selectAllMonths').onclick = () => {
    checksWrap.querySelectorAll('input').forEach(i => { i.checked = true; i.closest('.month-chip').classList.add('checked'); });
    updateSelectedMonths();
  };
  document.getElementById('clearMonths').onclick = () => {
    checksWrap.querySelectorAll('input').forEach(i => { i.checked = false; i.closest('.month-chip').classList.remove('checked'); });
    updateSelectedMonths();
  };
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
