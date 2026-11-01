/* ============================================================
   ai.js — AI Health Summary engine
   Attaches: App.generateAISummary(pid, force)
   Exposes globals: aiExtract, buildAISummary, renderAICard
   ============================================================ */

function aiExtract(str) {
  const out = {};
  if (!str) return out;
  const patterns = {
    hba1c:      /HbA1c\s*([\d.]+)/i,
    fbs:        /(?:FBS|fasting\s+blood\s+(?:sugar|glucose))\s*[:=]?\s*([\d.]+)/i,
    ldl:        /LDL\s*([\d.]+)/i,
    creatinine: /Creatinine\s*([\d.]+)/i,
    egfr:       /eGFR\s*([\d.]+)/i,
    urea:       /Urea\s*([\d.]+)/i
  };
  Object.keys(patterns).forEach(k => {
    const m = str.match(patterns[k]);
    if (m) out[k] = parseFloat(m[1]);
  });
  const bpM = str.match(/BP\s*(\d{2,3})\s*\/\s*(\d{2,3})/i);
  if (bpM) out.bp = bpM[1] + '/' + bpM[2];
  return out;
}

function buildAISummary(pid) {
  const p = Store.patient(pid);
  if (!p) return null;
  const recs = Store.recordsFor(pid);

  const labs = recs.filter(r => r.type === 'lab-report').sort(byDateDesc);
  const latest = labs[0] ? aiExtract(labs[0].extracted && labs[0].extracted.results) : {};
  const prev   = labs[1] ? aiExtract(labs[1].extracted && labs[1].extracted.results) : {};

  const rxs = recs.filter(r => r.type === 'prescription').sort(byDateDesc);
  if (rxs[0] && rxs[0].extracted && rxs[0].extracted.vitals) {
    const m = rxs[0].extracted.vitals.match(/BP\s*(\d{2,3}\s*\/\s*\d{2,3})/i);
    if (m) latest.bp = m[1].replace(/\s/g, '');
  }

  const metrics = [];
  const metricHistory = (key, label, unit) => recs.map(record => {
    const text = [record.extracted && record.extracted.results, record.extracted && record.extracted.vitals].filter(Boolean).join(' · ');
    const values = aiExtract(text || '');
    const value = values[key];
    if (value === undefined) return null;
    return { recordId: record.id, title: record.title, date: record.date, value, label, unit };
  }).filter(Boolean).sort((a, b) => new Date(a.date) - new Date(b.date));
  const pushMetric = (label, cur, previous, unit, evaluate) => {
    if (cur === undefined || cur === null) return;
    let trend = 'flat', trendLabel = '→ stable';
    if (typeof cur === 'number' && typeof previous === 'number' && Math.abs(cur - previous) >= 0.15) {
      const diff = cur - previous;
      if (diff < 0) { trend = 'down'; trendLabel = '↓ ' + Math.abs(diff).toFixed(1); }
      else          { trend = 'up';   trendLabel = '↑ ' + diff.toFixed(1); }
    }
    metrics.push({
      label: label,
      value: (typeof cur === 'number' ? cur : cur) + (unit ? ' ' + unit : ''),
      trend: trend, trendLabel: trendLabel,
      state: evaluate ? evaluate(cur) : 'good',
      history: metricHistory(({ 'HbA1c': 'hba1c', 'Fasting glucose': 'fbs', 'LDL cholesterol': 'ldl', 'Creatinine': 'creatinine', 'eGFR': 'egfr' })[label], label, unit)
    });
  };

  pushMetric('HbA1c',            latest.hba1c,      prev.hba1c,      '%',      v => v < 6.5 ? 'good' : v < 7.5 ? 'watch' : 'alert');
  pushMetric('Fasting glucose',  latest.fbs,        prev.fbs,        'mg/dL',  v => v < 100 ? 'good' : v < 126 ? 'watch' : 'alert');
  pushMetric('LDL cholesterol',  latest.ldl,        prev.ldl,        'mg/dL',  v => v < 100 ? 'good' : v < 130 ? 'watch' : 'alert');
  pushMetric('Creatinine',       latest.creatinine, prev.creatinine, 'mg/dL',  v => v <= 1.3 ? 'good' : v <= 1.5 ? 'watch' : 'alert');
  pushMetric('eGFR',             latest.egfr,       prev.egfr,       'mL/min', v => v >= 90 ? 'good' : v >= 60 ? 'watch' : 'alert');
  if (latest.bp) {
    const [sys, dia] = latest.bp.split('/').map(Number);
    metrics.push({
      label: 'Blood pressure', value: latest.bp + ' mmHg',
      trend: 'flat', trendLabel: '→ current',
      state: sys < 130 && dia < 85 ? 'good' : sys < 140 && dia < 90 ? 'watch' : 'alert',
      history: recs.map(record => {
        const text = record.extracted && record.extracted.vitals;
        const bp = text && text.match(/BP\s*(\d{2,3})\s*\/\s*(\d{2,3})/i);
        return bp ? { recordId: record.id, title: record.title, date: record.date, value: bp[1] + '/' + bp[2], label: 'Blood pressure', unit: 'mmHg' } : null;
      }).filter(Boolean).sort((a, b) => new Date(a.date) - new Date(b.date))
    });
  }

  const conditions = (p.conditions || []).join(' ').toLowerCase();
  const meds       = (p.medications || []).join(' ').toLowerCase();
  const corpus     = conditions + ' ' + meds;

  const systems = [];

  const hasCV = /hypertension|cardio|heart|cholesterol|statin|amlodipine|atorvastatin/.test(corpus);
  systems.push({
    name: 'Cardiovascular',
    state: hasCV ? ((latest.bp && Number(latest.bp.split('/')[0]) >= 140) ? 'watch' : 'good') : 'good',
    note: hasCV ? (latest.bp ? 'BP ' + latest.bp : 'Under treatment') : 'No active issues'
  });

  const hasMet = /diabet|metformin|insulin|hba1c|glycaem/.test(corpus);
  systems.push({
    name: 'Metabolic',
    state: hasMet ? (latest.hba1c !== undefined && latest.hba1c < 7 ? 'good' : 'watch') : 'good',
    note: hasMet ? (latest.hba1c !== undefined ? 'HbA1c ' + latest.hba1c + '%' : 'Under treatment') : 'Within range'
  });

  const hasRenal = /renal|kidney|egfr|creatinine|nsaid/.test(corpus) || latest.creatinine !== undefined;
  systems.push({
    name: 'Renal',
    state: hasRenal ? (latest.egfr !== undefined && latest.egfr < 60 ? 'watch' : 'good') : 'good',
    note: hasRenal ? (latest.egfr !== undefined ? 'eGFR ' + latest.egfr : 'Monitor') : 'Normal'
  });

  const hasMSK = /osteo|arthritis|joint|ortho|knee/.test(corpus);
  systems.push({
    name: 'Musculoskeletal',
    state: hasMSK ? 'watch' : 'good',
    note: hasMSK ? 'Ongoing management' : 'No active issues'
  });

  const hasResp = /asthma|respiratory|copd|inhaler|salbutamol/.test(corpus);
  systems.push({
    name: 'Respiratory',
    state: 'good',
    note: hasResp ? 'Well controlled' : 'Clear'
  });

  const allStates = systems.map(s => s.state).concat(metrics.map(m => m.state));
  const overall = allStates.includes('alert')
    ? 'alert'
    : allStates.filter(s => s === 'watch').length >= 2 ? 'watch' : 'good';
  const overallText = overall === 'good' ? 'Overall stable'
    : overall === 'watch' ? 'Needs attention'
    : 'Action advised';

  const important = [];
  if (latest.hba1c !== undefined) {
    important.push('HbA1c is ' + latest.hba1c + '% — ' +
      (latest.hba1c < 6.5 ? 'well within target.'
       : latest.hba1c < 7.5 ? 'close to target; continue the current regimen.'
       : 'above target; discuss intensification with your physician.'));
  }
  if (latest.ldl !== undefined) {
    important.push('LDL cholesterol is ' + latest.ldl + ' mg/dL — ' +
      (latest.ldl < 100 ? 'at target.'
       : 'elevated; diet and statin adherence matter.'));
  }
  if (latest.egfr !== undefined) {
    important.push('Kidney function (eGFR) is ' + latest.egfr + ' mL/min — ' +
      (latest.egfr >= 90 ? 'normal.'
       : latest.egfr >= 60 ? 'mild reduction typical for age; stay hydrated and avoid NSAIDs.'
       : 'reduced; a nephrology review is advised.'));
  }
  if (latest.bp) {
    const [sys, dia] = latest.bp.split('/').map(Number);
    important.push('Blood pressure is ' + latest.bp + ' mmHg — ' +
      (sys < 130 && dia < 85 ? 'within target.'
       : sys < 140 && dia < 90 ? 'borderline; continue monitoring.'
       : 'above target; review antihypertensives.'));
  }
  if (!important.length) important.push('No recent lab results on file to highlight.');

  const recsOut = [];
  if (latest.hba1c !== undefined && latest.hba1c >= 7)
    recsOut.push('Continue diabetes medications and reduce refined-sugar intake.');
  else if (latest.hba1c !== undefined)
    recsOut.push('Maintain current diet and exercise — glycaemic control is on target.');
  if (latest.ldl !== undefined && latest.ldl >= 100)
    recsOut.push('Emphasise a low-saturated-fat diet and ensure statin adherence.');
  if (latest.egfr !== undefined && latest.egfr < 90)
    recsOut.push('Stay well hydrated and avoid NSAIDs such as ibuprofen.');
  if (p.allergies && p.allergies.length)
    recsOut.push('Keep allergy information current — ' + p.allergies.join(', ') + '.');
  recsOut.push('Schedule your next review as advised by your physician.');

  return {
    overall: overall,
    overallText: overallText,
    metrics: metrics,
    systems: systems,
    important: important,
    recommendations: recsOut,
    basedOn: recs.length + ' record' + (recs.length === 1 ? '' : 's'),
    generatedAt: nowISO()
  };
}

function renderAICard(pid) {
  const state = App.aiSummary && App.aiSummary.pid === pid ? App.aiSummary : null;

  if (!state || state.loading) {
    return '<div class="ai-head">' +
        '<div class="ai-badge"><span class="spark">' + icon('sparkle', 16) + '</span> AI Health Summary</div>' +
        '<span class="ai-gen">Analysing…</span>' +
      '</div>' +
      '<div class="ai-loading">' +
        '<div class="ai-spinner"></div>' +
        '<div class="ai-loading__title">Reviewing your records…</div>' +
        '<div class="ai-loading__sub">Scanning labs, medications and vitals</div>' +
        '<div class="ai-loading__bars">' +
          '<div class="ai-shimmer"></div>' +
          '<div class="ai-shimmer" style="width:82%;margin-left:auto;margin-right:auto"></div>' +
          '<div class="ai-shimmer" style="width:60%;margin-left:auto;margin-right:auto"></div>' +
        '</div>' +
      '</div>';
  }

  const s = state.data;
  if (!s) {
    return '<div class="ai-head">' +
        '<div class="ai-badge"><span class="spark">' + icon('sparkle', 16) + '</span> AI Health Summary</div>' +
      '</div>' +
      '<div class="ai-loading"><div class="ai-loading__title">Unable to summarise</div>' +
      '<div class="ai-loading__sub">Add a few records and try again.</div></div>';
  }

  const stateLabel = { good: 'Good', watch: 'Monitor', alert: 'Attention' };
  const metricRows = s.metrics.map(m =>
    '<div class="ai-metric">' +
      '<span class="ai-metric__name">' + esc(m.label) + '</span>' +
      '<span class="ai-metric__val">' + esc(m.value) + '</span>' +
      '<span class="ai-metric__trend ai-trend--' + m.trend + '">' + esc(m.trendLabel) + '</span>' +
    '</div>'
  ).join('');

  const charts = s.metrics.filter(m => (m.history || []).length > 0).map(m => {
    const points = m.history.slice(-8), values = points.map(p => typeof p.value === 'number' ? p.value : Number(p.value.split('/')[0]));
    const min = Math.min(...values), max = Math.max(...values), spread = max - min || 1;
    const coords = values.map((v, i) => ({ x: 18 + (points.length === 1 ? 0 : i * 264 / (points.length - 1)), y: 66 - ((v - min) / spread) * 48 }));
    const polyline = coords.map(p => p.x + ',' + p.y).join(' ');
    const dots = coords.map((p, i) => '<circle cx="' + p.x + '" cy="' + p.y + '" r="4" fill="currentColor"><title>' + esc(points[i].date) + ': ' + esc(points[i].value) + '</title></circle>').join('');
    return '<div class="ai-chart"><div class="ai-chart__head"><strong>' + esc(m.label) + '</strong><span>' + esc(m.unit) + ' · ' + points.length + ' record' + (points.length === 1 ? '' : 's') + '</span></div>' +
      '<svg class="ai-chart__plot" viewBox="0 0 300 82" role="img" aria-label="' + esc(m.label) + ' trend over time"><line x1="18" y1="66" x2="282" y2="66"/><polyline points="' + polyline + '"/>' + dots + '</svg>' +
      '<div class="ai-chart__dates"><span>' + esc(fmtDate(points[0].date)) + '</span><span>' + esc(fmtDate(points[points.length - 1].date)) + '</span></div>' +
      '<div class="ai-chart__sources">' + points.map(p => '<button type="button" class="ai-chart__source" data-ai-source="' + esc(p.recordId) + '">' + icon('records', 13) + '<span>' + esc(fmtDate(p.date)) + ' · ' + esc(p.title) + '</span><b>' + esc(p.value) + '</b></button>').join('') + '</div></div>';
  }).join('');

  const sysRows = s.systems.map(sys =>
    '<div class="ai-sys">' +
      '<span class="ai-sys__dot ai-sys__dot--' + sys.state + '"></span>' +
      '<span class="ai-sys__name">' + esc(sys.name) + '</span>' +
      '<span class="ai-sys__note">' + esc(sys.note) + '</span>' +
      '<span class="ai-sys__state ai-sys__state--' + sys.state + '">' + esc(stateLabel[sys.state]) + '</span>' +
    '</div>'
  ).join('');

  const importantRows = s.important.map(x =>
    '<div class="ai-important__item">' + icon('alert', 15) + '<span>' + esc(x) + '</span></div>'
  ).join('');

  const recRows = s.recommendations.map(x => '<li>' + esc(x) + '</li>').join('');

  return '<div class="ai-head">' +
      '<div class="ai-badge"><span class="spark">' + icon('sparkle', 16) + '</span> AI Health Summary</div>' +
      '<div class="row" style="gap:6px">' +
        '<span class="ai-gen">' + esc(timeAgo(s.generatedAt)) + '</span>' +
        '<button class="ai-refresh" data-act="refresh-ai" aria-label="Regenerate summary">' + icon('refresh', 15) + '</button>' +
      '</div>' +
    '</div>' +
    '<div class="ai-status ai-status--' + s.overall + '">' +
      '<span class="ai-status__dot"></span>' + esc(s.overallText) +
      '<span style="opacity:.65;font-weight:600">· based on ' + esc(s.basedOn) + '</span>' +
    '</div>' +
    '<div class="ai-body">' +
      (s.metrics.length
        ? '<div class="ai-section"><div class="ai-section-title">' + icon('activity', 12) + ' Key metrics</div>' + metricRows + '</div>' + (charts ? '<div class="ai-section"><div class="ai-section-title">' + icon('timeline', 12) + ' Trends and source records</div>' + charts + '</div>' : '')
        : '') +
      '<div class="ai-section"><div class="ai-section-title">' + icon('heart', 12) + ' Body systems</div>' + sysRows + '</div>' +
      '<div class="ai-section"><div class="ai-section-title">' + icon('alert', 12) + ' What matters</div>' +
        '<div class="ai-important">' + importantRows + '</div></div>' +
      '<div class="ai-recs"><div class="ai-section-title" style="margin-bottom:6px">' + icon('sparkle', 12) + ' Suggested next steps</div>' +
        '<ul>' + recRows + '</ul></div>' +
    '</div>';
}

App.generateAISummary = function (pid, force) {
  if (!force && this.aiSummary && this.aiSummary.pid === pid &&
      (this.aiSummary.loading || this.aiSummary.data)) {
    return;
  }
  this.aiSummary = { pid: pid, loading: true, data: null };
  setTimeout(() => {
    if (!this.aiSummary || this.aiSummary.pid !== pid) return;
    const data = buildAISummary(pid);
    this.aiSummary = { pid: pid, loading: false, data: data };
    if (this.tab === 'home' && !this.subScreen && this.activePatientId() === pid) {
      this.renderBody();
    }
  }, 1500);
};
