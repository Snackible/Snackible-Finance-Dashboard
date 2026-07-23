const YOY_MONTHS = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];

const YOY_DATA = {
  rev25:  [9.26,12.51,12.41,14.34,15.63,22.55,24.27,12.93,13.85,17.38,17.34,14.10],
  rev26:  [19.66,18.88,19.83,24.54,21.92,26.64,26.95,33.12,31.10,22.59,22.11,23.55],
  gm25:   [47.8,49.8,44.6,47.6,46.7,50.7,47.8,47.1,49.9,51.4,47.8,47.3],
  gm26:   [47.1,38.6,46.8,48.9,50.7,49.6,57.7,37.9,44.2,52.8,52.7,50.6],
  cm125:  [25.8,32.6,30.2,31.5,29.7,36.5,32.9,32.6,33.9,36.8,33.9,32.7],
  cm126:  [36.8,24.1,34.6,36.9,38.0,37.5,43.9,29.6,34.0,40.9,39.8,38.2],
  eb25:   [-18.1,-12.1,-14.9,-18.7,-21.4,23.5,4.0,-15.3,-15.4,0.5,-7.0,-19.1],
  eb26:   [-13.3,-50.5,-25.5,-4.5,-14.5,5.3,-1.3,-5.6,5.1,-9.0,-7.1,-15.0],
};

let yoyCharts = {};

function initYoY() {
  Object.values(yoyCharts).forEach(c => { try { c.destroy(); } catch(e){} });
  yoyCharts = {};

  const tick = '#9AA4B2';
  const gridC = 'rgba(255,255,255,0.06)';

  const revCtx = document.getElementById('yoyRevChart');
  if (revCtx) {
    yoyCharts.rev = new Chart(revCtx, {
      type: 'bar',
      data: { labels: YOY_MONTHS, datasets: [
        { label:'FY25', data:YOY_DATA.rev25, backgroundColor:'#66708580', borderRadius:3, maxBarThickness:14 },
        { label:'FY26', data:YOY_DATA.rev26, backgroundColor:'#3ABCA2',   borderRadius:3, maxBarThickness:14 }
      ]},
      options: { responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:c=>`${c.dataset.label}: ₹${c.raw.toFixed(2)}Cr` } } },
        scales:{ x:{ grid:{display:false}, ticks:{color:tick,font:{size:10}} }, y:{ grid:{color:gridC}, ticks:{color:tick,callback:v=>'₹'+v+'Cr'} } } }
    });
  }

  const mgCtx = document.getElementById('yoyMarginChart');
  if (mgCtx) {
    yoyCharts.margin = new Chart(mgCtx, {
      type: 'line',
      data: { labels: YOY_MONTHS, datasets: [
        { label:'FY26 GM%',  data:YOY_DATA.gm26,  borderColor:'#3ABCA2', borderWidth:2, pointRadius:3, pointBackgroundColor:'#3ABCA2', fill:false, tension:0.3 },
        { label:'FY25 GM%',  data:YOY_DATA.gm25,  borderColor:'#667085', borderDash:[5,4], borderWidth:2, pointRadius:2, pointBackgroundColor:'#667085', fill:false, tension:0.3 },
        { label:'FY26 CM1%', data:YOY_DATA.cm126, borderColor:'#FBAE25', borderWidth:2, pointRadius:3, pointBackgroundColor:'#FBAE25', fill:false, tension:0.3 },
      ]},
      options: { responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:c=>`${c.dataset.label}: ${c.raw.toFixed(1)}%` } } },
        scales:{ x:{ grid:{display:false}, ticks:{color:tick,font:{size:10}} }, y:{ grid:{color:gridC}, ticks:{color:tick,callback:v=>v+'%'}, min:20, max:65 } } }
    });
  }

  const ebOpts = (color) => ({
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:c=>`₹${c.raw.toFixed(1)}L` } } },
    scales:{
      x:{ grid:{display:false}, ticks:{color:tick,font:{size:10}} },
      y:{ grid:{color:gridC}, ticks:{color:tick,callback:v=>v+'L'}, min:-60, max:30 }
    }
  });

  const eb25Ctx = document.getElementById('yoyEb25Chart');
  if (eb25Ctx) {
    yoyCharts.eb25 = new Chart(eb25Ctx, {
      type:'line',
      data:{ labels:YOY_MONTHS, datasets:[{ label:'FY25', data:YOY_DATA.eb25,
        borderColor:'#667085', backgroundColor:'rgba(102,112,133,0.08)', fill:true, borderWidth:2, pointRadius:4,
        pointBackgroundColor:YOY_DATA.eb25.map(v=>v>=0?'#3ABCA2':'#E35C25'),
        pointBorderColor:'#111722', pointBorderWidth:2, tension:0.3 }]},
      options:ebOpts('#667085'), plugins:[zeroLine]
    });
  }

  const eb26Ctx = document.getElementById('yoyEb26Chart');
  if (eb26Ctx) {
    yoyCharts.eb26 = new Chart(eb26Ctx, {
      type:'line',
      data:{ labels:YOY_MONTHS, datasets:[{ label:'FY26', data:YOY_DATA.eb26,
        borderColor:'#3ABCA2', backgroundColor:'rgba(58,188,162,0.08)', fill:true, borderWidth:2, pointRadius:4,
        pointBackgroundColor:YOY_DATA.eb26.map(v=>v>=0?'#3ABCA2':'#E35C25'),
        pointBorderColor:'#111722', pointBorderWidth:2, tension:0.3 }]},
      options:ebOpts('#3ABCA2'), plugins:[zeroLine]
    });
  }

  const mixCtx = document.getElementById('yoyMixChart');
  if (mixCtx) {
    yoyCharts.mix = new Chart(mixCtx, {
      type:'bar',
      data:{ labels:['FY25','FY26'], datasets:[
        { label:'QCom',    data:[60.9,64.8], backgroundColor:'#3ABCA2', maxBarThickness:100 },
        { label:'B2B',     data:[21.4,17.4], backgroundColor:'#2a78d6', maxBarThickness:100 },
        { label:'Own site',data:[14.5,12.5], backgroundColor:'#FBAE25', maxBarThickness:100 },
        { label:'GT+MT',   data:[3.2,5.3],   backgroundColor:'#888780', maxBarThickness:100 },
      ]},
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:c=>`${c.dataset.label}: ${c.raw}%` } } },
        scales:{ x:{ stacked:true, grid:{display:false}, ticks:{color:tick,font:{size:13,weight:'500'}} }, y:{ stacked:true, grid:{color:gridC}, ticks:{color:tick,callback:v=>v+'%'}, max:100 } } }
    });
  }

  const costCtx = document.getElementById('yoyCostChart');
  if (costCtx) {
    yoyCharts.cost = new Chart(costCtx, {
      type:'bar', indexAxis:'y',
      data:{ labels:['COGS','Marketing','Indirect opex','Delivery','Labour','Commission'], datasets:[
        { label:'FY25', data:[52.4,33.1,11.9,11.2,3.6,0.3], backgroundColor:'#66708560', borderRadius:3, maxBarThickness:14 },
        { label:'FY26', data:[52.0,33.3,9.6,9.5,2.3,0.3],   backgroundColor:'#3ABCA2',   borderRadius:3, maxBarThickness:14 },
      ]},
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:c=>`${c.dataset.label}: ${c.raw}%` } } },
        scales:{ x:{ grid:{color:gridC}, ticks:{color:tick,callback:v=>v+'%'} }, y:{ grid:{display:false}, ticks:{color:tick,font:{size:11}} } } }
    });
  }

  const cm2Ctx = document.getElementById('yoyCm2Chart');
  if (cm2Ctx) {
    const cm2_25 = [-0.89,0.97,6.87,-0.42,0.09];
    const cm2_26 = [0.73,-1.08,16.38,0.13,0.43];
    yoyCharts.cm2 = new Chart(cm2Ctx, {
      type:'bar',
      data:{ labels:['Own site','QCom','B2B','Gen Trade','Mod Trade'], datasets:[
        { label:'FY25', data:cm2_25, backgroundColor:'#66708560', borderRadius:4, maxBarThickness:24 },
        { label:'FY26', data:cm2_26, backgroundColor:cm2_26.map(v=>v>=0?'#3ABCA2':'#E35C25'), borderRadius:4, maxBarThickness:24 },
      ]},
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:c=>`${c.dataset.label}: ₹${c.raw.toFixed(2)}Cr` } } },
        scales:{ x:{ grid:{display:false}, ticks:{color:tick,font:{size:11}} }, y:{ grid:{color:gridC}, ticks:{color:tick,callback:v=>'₹'+v+'Cr'} } } }
    });
  }
}
