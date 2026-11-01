/* ============================================================
   ai.js — Health Summary (rule-based prototype)
   Attaches: App.generateAISummary(pid, force)
   Exposes globals: AI_METRICS, aiReadings, buildAISummary, renderAICard

   How it works: every record's `results` and `vitals` text is scanned
   with fixed patterns. For each measurement the newest dated value wins,
   whatever the record type. Values are compared with reference ranges
   commonly printed on lab reports. Nothing here is a diagnosis or advice.
   ============================================================ */

const AI_METRICS = [
  { key: 'hba1c', label: 'HbA1c', unit: '%', system: 'Metabolic', range: 'below 5.7%',
    re: /\bHbA1c\b\s*[:=]?\s*(\d{1,2}(?:\.\d+)?)\s*(%)?/i,
    state: v => v < 5.7 ? 'good' : v < 6.5 ? 'watch' : 'alert' },
  { key: 'fbs', label: 'Fasting glucose', unit: 'mg/dL', system: 'Metabolic', range: '70–99 mg/dL',
    re: /(?:\bFBS\b|fasting\s+blood\s+(?:sugar|glucose)|fasting\s+glucose)\s*[:=]?\s*(\d{2,3}(?:\.\d+)?)\s*(mg\s*\/\s*dL|mmol\s*\/\s*L)?/i,
    state: v => v < 70 ? 'watch' : v < 100 ? 'good' : v < 126 ? 'watch' : 'alert' },
  { key: 'ldl', label: 'LDL cholesterol', unit: 'mg/dL', system: 'Cardiovascular', range: 'below 100 mg/dL',
    re: /\bLDL\b(?:\s*cholesterol)?\s*[:=]?\s*(\d{2,3}(?:\.\d+)?)\s*(mg\s*\/\s*dL|mmol\s*\/\s*L)?/i,
    state: v => v < 100 ? 'good' : v < 160 ? 'watch' : 'alert' },
  { key: 'bp', label: 'Blood pressure', unit: 'mmHg', system: 'Cardiovascular', range: 'below 120/80 mmHg',
    re: /(?:\bBP\b|blood\s+pressure)\s*[:=]?\s*(\d{2,3})\s*\/\s*(\d{2,3})/i,
    state: v => { const [s, d] = String(v).split('/').map(Number); return s < 120 && d < 80 ? 'good' : s < 140 && d < 90 ? 'watch' : 'alert'; } },
  { key: 'creatinine', label: 'Creatinine', unit: 'mg/dL', system: 'Renal', range: '0.6–1.3 mg/dL',
    re: /\bCreatinine\b\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(mg\s*\/\s*dL|[µu]mol\s*\/\s*L)?/i,
    state: v => v >= 0.6 && v <= 1.3 ? 'good' : v >= 0.5 && v <= 1.5 ? 'watch' : 'alert' },
  { key: 'egfr', label: 'eGFR', unit: 'mL/min', system: 'Renal', range: '90 mL/min or above',
    re: /\beGFR\b\s*[:=]?\s*(\d{1,3}(?:\.\d+)?)\s*(mL\s*\/\s*min)?/i,
    state: v => v >= 90 ? 'good' : v >= 60 ? 'watch' : 'alert' }
];

const AI_STATE_TEXT = {
  good: 'within the common reference range',
  watch: 'slightly outside the common reference range',
  alert: 'outside the common reference range'
};

/* Every dated reading per measurement, oldest first. A value written with a
   different unit (e.g. creatinine in µmol/L) is skipped, not converted. */
function aiReadings(records) {
  const out = {};
  const norm = u => String(u || '').replace(/\s/g, '').toLowerCase();
  records.forEach(record => {
    const ex = record.extracted || {};
    const text = [ex.results, ex.vitals].filter(Boolean).join(' · ');
    if (!text || !record.date) return;
    AI_METRICS.forEach(def => {
      const m = text.match(def.re);
      if (!m) return;
      let value;
      if (def.key === 'bp') value = m[1] + '/' + m[2];
      else {
        if (m[2] && !norm(m[2]).startsWith(norm(def.unit))) return;
        value = parseFloat(m[1]);
        if (!Number.isFinite(value)) return;
      }
      const shown = def.key === 'bp' ? value : m[1];
      (out[def.key] = out[def.key] || []).push({ recordId: record.id, title: record.title, date: record.date, value, shown, label: def.label, unit: def.unit });
    });
  });
  Object.keys(out).forEach(k => out[k].sort((a, b) => new Date(a.date) - new Date(b.date)));
  return out;
}

function buildAISummary(pid) {
  const p = Store.patient(pid);
  if (!p) return null;
  const recs = Store.recordsFor(pid);
  const readings = aiReadings(recs);
  const yearAgo = new Date(); yearAgo.setFullYear(yearAgo.getFullYear() - 1);

  const metrics = [];
  AI_METRICS.forEach(def => {
    const hist = readings[def.key] || [];
    if (!hist.length) return;
    const latest = hist[hist.length - 1], prev = hist[hist.length - 2] || null;
    let trend = 'flat', trendLabel = prev ? '→ no change' : 'single reading';
    if (prev && def.key !== 'bp') {
      const diff = latest.value - prev.value;
      if (Math.abs(diff) >= 0.05) { trend = diff < 0 ? 'down' : 'up'; trendLabel = (diff < 0 ? '↓ ' : '↑ ') + +Math.abs(diff).toFixed(2); }
    } else if (prev && def.key === 'bp' && prev.value !== latest.value) {
      trendLabel = 'was ' + prev.shown;
    }
    const withUnit = r => r.shown + (def.unit === '%' ? '%' : ' ' + def.unit);
    metrics.push({
      key: def.key, label: def.label, unit: def.unit, system: def.system, range: def.range,
      value: withUnit(latest), previousText: prev ? withUnit(prev) : '',
      date: latest.date, recordId: latest.recordId, stale: new Date(latest.date) < yearAgo,
      previous: prev, trend, trendLabel, state: def.state(latest.value), history: hist
    });
  });

  const order = { none: 0, good: 1, watch: 2, alert: 3 };
  const worst = list => list.reduce((w, s) => order[s] > order[w] ? s : w, 'none');

  // Body systems show only what the records contain. A condition listed on the
  // profile with no tracked measurement is shown as "no data", not judged.
  const conditions = (p.conditions || []).filter(c => c && !/^none/i.test(c));
  const systems = ['Metabolic', 'Cardiovascular', 'Renal'].map(name => {
    const ms = metrics.filter(m => m.system === name);
    return ms.length
      ? { name, state: worst(ms.map(m => m.state)), note: ms.map(m => m.label + ' ' + m.value).join(' · ') }
      : { name, state: 'none', note: 'No values in records' };
  });
  [['Musculoskeletal', /osteo|arthritis|joint|knee/i], ['Respiratory', /asthma|copd|respiratory|bronch/i]].forEach(([name, re]) => {
    const listed = conditions.filter(c => re.test(c));
    if (listed.length) systems.push({ name, state: 'none', note: 'Listed on profile: ' + listed.join(', ') });
  });

  const overall = metrics.length ? worst(metrics.map(m => m.state)) : 'none';
  const overallText = {
    none: 'No measurements found in your records yet',
    good: 'Latest values are within common reference ranges',
    watch: 'Some values are slightly outside common reference ranges',
    alert: 'Some values are outside common reference ranges'
  }[overall];

  const important = metrics.map(m =>
    m.label + ' was ' + m.value + ' on ' + fmtDate(m.date) + ', ' + AI_STATE_TEXT[m.state] + ' (' + m.range + ').' +
    (m.previous ? ' Previous reading: ' + m.previousText + ' on ' + fmtDate(m.previous.date) + '.' : '') +
    (m.stale ? ' This reading is more than a year old.' : '')
  );
  if (!important.length) important.push('No lab results or vital signs were found in your records.');

  // Questions the patient could take to a visit — never instructions.
  const questions = [];
  metrics.filter(m => m.state !== 'good').slice(0, 3).forEach(m =>
    questions.push('What does my ' + m.label + ' of ' + m.value + ' mean for me, and what range should I aim for?'));
  const changed = metrics.find(m => m.previous && m.trend !== 'flat');
  if (changed) questions.push('How should I read the change in ' + changed.label + ' between ' + fmtDate(changed.previous.date) + ' and ' + fmtDate(changed.date) + '?');
  if (metrics.some(m => m.stale)) questions.push('Are any of my older tests due to be repeated?');
  const allergies = (p.allergies || []).filter(a => a && !/^none/i.test(a));
  if (allergies.length) questions.push('Is my allergy list (' + allergies.join(', ') + ') still complete and correct?');
  if (!questions.length) questions.push('Is there anything in my records you would like me to keep track of?');

  const sourceIds = new Set(metrics.flatMap(m => m.history.map(h => h.recordId)));
  return {
    overall, overallText, metrics, systems, important,
    recommendations: questions,
    basedOn: sourceIds.size + ' of ' + recs.length + ' record' + (recs.length === 1 ? '' : 's'),
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
        '<div class="ai-loading__sub">Reading lab results and vital signs</div>' +
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

  const stateLabel = { good: 'In range', watch: 'Slightly outside', alert: 'Outside range', none: 'No data' };
  const metricRows = s.metrics.map(m =>
    '<div class="ai-metric">' +
      '<span class="ai-metric__name">' + esc(m.label) + '<small>' + esc(fmtDate(m.date)) + ' · ' + esc(stateLabel[m.state]) + '</small></span>' +
      '<span class="ai-metric__val">' + esc(m.value) + '</span>' +
      // Trend chips stay neutral: a rise is not always bad, a fall not always good.
      '<span class="ai-metric__trend ai-trend--flat">' + esc(m.trendLabel) + '</span>' +
    '</div>'
  ).join('');

  const charts = s.metrics.filter(m => (m.history || []).length > 0).map(m => {
    const points = m.history.slice(-8), values = points.map(p => typeof p.value === 'number' ? p.value : Number(String(p.value).split('/')[0]));
    const min = Math.min(...values), max = Math.max(...values), spread = max - min || 1;
    const coords = values.map((v, i) => ({ x: 18 + (points.length === 1 ? 0 : i * 264 / (points.length - 1)), y: 66 - ((v - min) / spread) * 48 }));
    const polyline = coords.map(p => p.x + ',' + p.y).join(' ');
    const dots = coords.map((p, i) => '<circle cx="' + p.x + '" cy="' + p.y + '" r="4" fill="currentColor"><title>' + esc(points[i].date) + ': ' + esc(points[i].value) + '</title></circle>').join('');
    return '<div class="ai-chart"><div class="ai-chart__head"><strong>' + esc(m.label) + '</strong><span>' + esc(m.unit) + ' · ' + points.length + ' record' + (points.length === 1 ? '' : 's') + (m.key === 'bp' ? ' · systolic shown' : '') + '</span></div>' +
      '<svg class="ai-chart__plot" viewBox="0 0 300 82" role="img" aria-label="' + esc(m.label) + ' over time"><line x1="18" y1="66" x2="282" y2="66"/><polyline points="' + polyline + '"/>' + dots + '</svg>' +
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
    '<div class="ai-important__item">' + icon('activity', 15) + '<span>' + esc(x) + '</span></div>'
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
      '<span style="opacity:.65;font-weight:600">· values from ' + esc(s.basedOn) + '</span>' +
    '</div>' +
    '<div class="ai-body">' +
      (s.metrics.length
        ? '<div class="ai-section"><div class="ai-section-title">' + icon('activity', 12) + ' Latest values</div>' + metricRows + '</div>' + (charts ? '<div class="ai-section"><div class="ai-section-title">' + icon('timeline', 12) + ' Trends and source records</div>' + charts + '</div>' : '')
        : '') +
      '<div class="ai-section"><div class="ai-section-title">' + icon('heart', 12) + ' Body systems</div>' + sysRows + '</div>' +
      '<div class="ai-section"><div class="ai-section-title">' + icon('records', 12) + ' What your records show</div>' +
        '<div class="ai-important">' + importantRows + '</div></div>' +
      '<div class="ai-recs"><div class="ai-section-title" style="margin-bottom:6px">' + icon('sparkle', 12) + ' Questions you could ask at your next visit</div>' +
        '<ul>' + recRows + '</ul></div>' +
      '<p class="ai-disclaimer">' + icon('alert', 13) + '<span><strong>Rule-based prototype.</strong> This summary restates values found in your records and compares them with reference ranges commonly printed on lab reports. It is not a diagnosis or medical advice. Ranges and targets differ between people, so ask your doctor what your results mean for you.</span></p>' +
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
