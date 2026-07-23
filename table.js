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
        return '<td>'+(isPct ? v.toFixed(1)+'%' : fmtFull(v))+'</td>';
      })
    );
    tr.innerHTML = cells.join('');
    body.appendChild(tr);
  });
}
