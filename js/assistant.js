/* ============================================================
   assistant.js — authorized, deterministic medical-record assistant
   No conversation persistence and no external AI/API calls.
   ============================================================ */

const ASSISTANT_SUGGESTIONS = [
  'What was my last BP?',
  'What is my latest recorded weight?',
  'What is my eye power?',
  'What medicines are listed in my profile?',
  'Summarize my latest report.'
];

function assistantAccess() {
  if (!Session.data || !Store.state) return { ok: false, reason: 'Sign in to use the assistant.' };
  const session = Session.data;
  if (session.breakGlass) {
    const event = Store.state.breakGlass.find(x => x.id === session.eventId && x.patientId === session.patientId);
    if (!event) return { ok: false, reason: 'This emergency session is no longer available.' };
    const patient = Store.patient(session.patientId);
    if (!patient) return { ok: false, reason: 'Patient context is unavailable.' };
    return { ok: true, patientId: patient.id, role: 'emergency', records: Store.recordsFor(patient.id).filter(r => EMERGENCY_SCOPE.includes(r.type)), profile: null };
  }

  const user = Store.user(session.userId);
  if (!user || !user.active || user.role !== session.role) return { ok: false, reason: 'Your session could not be verified. Please sign in again.' };
  const role = user.role;
  if (role === 'admin') return { ok: false, reason: 'The medical-record assistant is not available for administrator accounts.' };
  const patientId = App.activePatientId();
  if (!patientId) return { ok: false, reason: 'Select a patient record first.' };
  const patient = Store.patient(patientId);
  if (!patient) return { ok: false, reason: 'Patient context is unavailable.' };

  if (role === 'patient' && user.patientId !== patientId) return { ok: false, reason: 'You can only ask about your own records.' };
  if (role === 'caregiver' && !(user.patientIds || []).includes(patientId)) return { ok: false, reason: 'This patient is not linked to your caregiver account.' };
  if (role === 'provider') {
    const provider = user.providerId && Store.provider(user.providerId);
    const consent = provider && Store.state.consents.find(c => c.patientId === patientId && c.providerId === provider.id && c.status === 'active' && (!c.expiresAt || new Date(c.expiresAt).getTime() > Date.now()));
    if (!consent) return { ok: false, reason: 'No active consent is available for this patient.' };
    return { ok: true, patientId, role, patient, consent, records: Store.recordsFor(patientId).filter(r => consent.recordTypes.includes(r.type)), profile: null };
  }
  if (role !== 'patient' && role !== 'caregiver') return { ok: false, reason: 'This account cannot use the medical-record assistant.' };
  return { ok: true, patientId, role, patient, records: Store.recordsFor(patientId), profile: patient };
}

function assistantCanOpenRecord(record) {
  const access = assistantAccess();
  return !!(access.ok && record && record.patientId === access.patientId && access.records.some(r => r.id === record.id));
}

function assistantText(record) {
  const ex = record.extracted || {};
  return [record.title, record.summary, ex.diagnosis, ex.results, ex.vitals, ex.advice]
    .concat(Array.isArray(ex.medications) ? ex.medications : [])
    .concat(Object.keys(ex).filter(k => typeof ex[k] === 'string').map(k => ex[k]))
    .filter(Boolean).join(' · ');
}

function assistantDateSort(records) {
  return records.slice().sort((a, b) => {
    const ad = Date.parse(a.date || ''), bd = Date.parse(b.date || '');
    return (Number.isFinite(bd) ? bd : -Infinity) - (Number.isFinite(ad) ? ad : -Infinity);
  });
}

function assistantMetric(record, metric) {
  const ex = record.extracted || {};
  const chunks = [ex.vitals, ex.results, record.summary].filter(Boolean).join(' · ');
  const patterns = {
    bp: /(?:\bbp\b|blood pressure)\s*[:=]?\s*(\d{2,3})\s*\/\s*(\d{2,3})\s*(mm\s*hg)?/i,
    weight: /(?:weight|body\s*weight|\bwt\.?)(?:\s*[:=])?\s*(\d{2,3}(?:\.\d+)?)\s*(kg|kgs|kilograms?)\b/i,
    height: /(?:height)\s*[:=]?\s*(\d{2,3}(?:\.\d+)?)\s*(cm|m)\b/i,
    bmi: /\bBMI\s*[:=]?\s*(\d{1,2}(?:\.\d+)?)\b/i,
    heartRate: /(?:\bHR\b|heart\s*rate|pulse)\s*[:=]?\s*(\d{2,3})\s*(bpm|beats?\s*\/\s*min)?/i,
    oxygen: /(?:SpO\s?₂?|oxygen\s*saturation|O2\s?sat(?:uration)?)\s*[:=]?\s*(\d{2,3}(?:\.\d+)?)\s*%/i,
    temperature: /(?:temperature|temp\.?)(?:\s*[:=])?\s*(\d{2}(?:\.\d+)?)\s*(°\s?[CF]|[CF])\b/i
  };
  const match = chunks.match(patterns[metric]);
  if (!match) return null;
  let value;
  if (metric === 'bp') value = `${match[1]}/${match[2]} mmHg`;
  else if (metric === 'weight') value = `${match[1]} kg`;
  else if (metric === 'height') value = `${match[1]} ${match[2]}`;
  else if (metric === 'bmi') value = match[1];
  else if (metric === 'heartRate') value = `${match[1]} bpm`;
  else if (metric === 'oxygen') value = `${match[1]}%`;
  else value = `${match[1]} ${match[2]}`;
  return { value, record };
}

function assistantMetricMentioned(record, metric) {
  const text = assistantText(record);
  const labels = {
    bp: /\b(?:bp|blood pressure|systolic|diastolic)\b/i,
    weight: /\b(?:weight|body weight|wt)\b/i,
    height: /\bheight\b/i,
    bmi: /\bbmi\b/i,
    heartRate: /\b(?:hr|heart rate|pulse)\b/i,
    oxygen: /\b(?:spo\s?₂?|oxygen saturation|o2 sat)\b/i,
    temperature: /\b(?:temperature|temp)\b/i
  };
  return labels[metric].test(text);
}

const ASSISTANT_LABS = {
  hba1c: { label: 'HbA1c', regex: /\b(?:HbA1c|A1c|glycated\s*haemoglobin|glycated\s*hemoglobin)\b\s*(?:(?:improved|was|is|result(?:ed)?)\s*)?(?:to\s*)?[:=]?\s*(\d{1,2}(?:\.\d+)?)\s*%?/i, unit: '%' },
  fbs: { label: 'Fasting blood sugar', regex: /\b(?:FBS|fasting\s*(?:blood\s*)?sugar|fasting\s*glucose)\b\s*[:=]?\s*(\d{2,3}(?:\.\d+)?)\s*(mg\s*\/\s*dL)?/i, unit: 'mg/dL' },
  ldl: { label: 'LDL cholesterol', regex: /\bLDL(?:\s*cholesterol)?\b\s*[:=]?\s*(\d{2,3}(?:\.\d+)?)\s*(mg\s*\/\s*dL)?/i, unit: 'mg/dL' },
  creatinine: { label: 'Creatinine', regex: /\bcreatinine\b\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(mg\s*\/\s*dL)?/i, unit: 'mg/dL' },
  egfr: { label: 'eGFR', regex: /\beGFR\b\s*[:=]?\s*(\d{1,3}(?:\.\d+)?)\s*(mL\s*\/\s*min)?/i, unit: 'mL/min' }
};

function assistantLab(record, key) {
  const def = ASSISTANT_LABS[key];
  const text = assistantText(record);
  const m = text.match(def.regex);
  return m ? { value: `${m[1]} ${def.unit}`, record } : null;
}

function assistantIsEyeRecord(record) {
  const titleAndTags = `${record.title || ''} ${(record.tags || []).join(' ')}`;
  const summary = record.summary || '';
  return /eye|ophthalm|optometr|retina|spectacle|vision|ocular|fundoscopy/i.test(titleAndTags) ||
    /eye\s+(?:exam|examination|test|prescription|power|screening)|retinal\s+(?:exam|examination|screening\s+(?:performed|result|showed))/i.test(summary);
}

function assistantExtractEye(record) {
  if (!assistantIsEyeRecord(record)) return null;
  const ex = record.extracted || {};
  const structured = ex.eyePrescription || ex.eye || ex.eyes;
  if (structured && typeof structured === 'object' && !Array.isArray(structured)) {
    const rows = [];
    const sideAliases = [
      ['Right eye (OD)', ['right', 'rightEye', 'od', 'OD']],
      ['Left eye (OS)', ['left', 'leftEye', 'os', 'OS']]
    ];
    sideAliases.forEach(([label, aliases]) => {
      const key = aliases.find(k => structured[k] !== undefined);
      if (!key) return;
      const side = structured[key];
      if (side && typeof side === 'object') {
        const parts = Object.keys(side).map(k => `${k}: ${side[k]}`).filter(x => !/:\s*(?:undefined|null|)$/i.test(x));
        if (parts.length) rows.push(`${label}: ${parts.join(', ')}`);
      } else if (side !== null && side !== undefined && String(side).trim()) rows.push(`${label}: ${side}`);
    });
    if (rows.length) return { value: rows.join('\n'), record };
  }
  const candidates = [ex.eyePrescription, ex.prescription, ex.results, ex.vitals, record.summary].filter(x => typeof x === 'string').join(' · ');
  const rows = [];
  const sidePatterns = [
    ['Right eye (OD)', /(?:right\s*eye|\bOD\b)\s*[:\-]?\s*([^;\n·]+)/i],
    ['Left eye (OS)', /(?:left\s*eye|\bOS\b)\s*[:\-]?\s*([^;\n·]+)/i]
  ];
  sidePatterns.forEach(([label, regex]) => { const m = candidates.match(regex); if (m) rows.push(`${label}: ${m[1].trim()}`); });
  if (!rows.length && /\b(?:SPH|sphere)\b/i.test(candidates)) rows.push(candidates.match(/.{0,30}\b(?:SPH|sphere)\b.{0,100}/i)[0].trim());
  return rows.length ? { value: rows.join('\n'), record } : null;
}

function getPatientMedicalContext(patientId, question) {
  const access = assistantAccess();
  if (!access.ok || !patientId || access.patientId !== patientId) return { authorized: false, reason: access.reason || 'Patient access could not be verified.' };
  const records = assistantDateSort(access.records);
  const profileAllowed = !!access.profile && access.role !== 'emergency';
  const profile = profileAllowed ? access.profile : null;
  const normalized = String(question || '').trim().toLowerCase();
  let kind = 'unsupported', metric = null, lab = null;

  if (/\b(eye power|spectacle|glasses|eye exam(?:ination)?|eye test|prescription for (?:my )?eyes|left eye|right eye|\bod\b|\bos\b|visual acuity|ophthalm|optometr)\b/i.test(normalized)) kind = 'eye';
  else if (/\b(allerg(?:y|ies)|medical conditions?|diagnos(?:is|es)|conditions? (?:in|on) my profile)\b/i.test(normalized)) kind = 'profile';
  else if (/\b(medicines?|medications?|drugs?)\b/i.test(normalized)) kind = /\b(profile|listed|currently taking|taking now|active)\b/i.test(normalized) ? 'profile-meds' : 'medications';
  else if (/\b(hba1c|a1c|glycated haemoglobin|glycated hemoglobin)\b/i.test(normalized)) { kind = 'lab'; lab = 'hba1c'; }
  else if (/\b(fbs|fasting (?:blood )?sugar|fasting glucose)\b/i.test(normalized)) { kind = 'lab'; lab = 'fbs'; }
  else if (/\b(ldl|cholesterol)\b/i.test(normalized)) { kind = 'lab'; lab = 'ldl'; }
  else if (/\b(creatinine)\b/i.test(normalized)) { kind = 'lab'; lab = 'creatinine'; }
  else if (/\b(egfr|e\s*gfr)\b/i.test(normalized)) { kind = 'lab'; lab = 'egfr'; }
  else if (/\b(blood pressure|\bbp\b|systolic|diastolic)\b/i.test(normalized)) { kind = 'metric'; metric = 'bp'; }
  else if (/\b(weight|body weight|\bwt\b)\b/i.test(normalized)) { kind = 'metric'; metric = 'weight'; }
  else if (/\b(height)\b/i.test(normalized)) { kind = 'metric'; metric = 'height'; }
  else if (/\b(bmi)\b/i.test(normalized)) { kind = 'metric'; metric = 'bmi'; }
  else if (/\b(heart rate|pulse)\b/i.test(normalized)) { kind = 'metric'; metric = 'heartRate'; }
  else if (/\b(oxygen|oxygen saturation|spo2|spo₂)\b/i.test(normalized)) { kind = 'metric'; metric = 'oxygen'; }
  else if (/\b(temperature|fever)\b/i.test(normalized)) { kind = 'metric'; metric = 'temperature'; }
  else if (/\b(latest record|most recent medical record|latest prescription|which hospital|facility|uploaded my latest|last hospital visit|last appointment)\b/i.test(normalized)) kind = 'latest-record';
  else if (/\b(summar(?:y|ize|ise|izing|ising)|latest report|last report)\b/i.test(normalized)) kind = 'summary';
  else if (/\b(changed|compare|between my last two|history|previous|over time|last year|recent records)\b/i.test(normalized)) kind = 'history';

  let relevant = records;
  if (kind === 'lab') relevant = records.filter(r => assistantLab(r, lab) || new RegExp(ASSISTANT_LABS[lab].label === 'HbA1c' ? 'HbA1c|A1c' : ASSISTANT_LABS[lab].label, 'i').test(assistantText(r)));
  if (kind === 'eye') relevant = records.filter(r => assistantIsEyeRecord(r));
  if (kind === 'metric') relevant = records.filter(r => assistantMetric(r, metric) || assistantMetricMentioned(r, metric));
  if (kind === 'medications') relevant = records.filter(r => Array.isArray(r.extracted && r.extracted.medications) && r.extracted.medications.length);
  return { authorized: true, patientId, role: access.role, kind, metric, lab, records: relevant, allRecords: records, profile, profileAllowed };
}

function assistantAnswer(patientId, question) {
  const ctx = getPatientMedicalContext(patientId, question);
  if (!ctx.authorized) return { text: ctx.reason || 'I could not verify access to this patient record.', sources: [], denied: true };
  const q = question.toLowerCase();
  const sources = [];
  const addSource = r => { if (r && !sources.some(x => x.id === r.id)) sources.push(r); };
  const notFound = label => `I couldn't find ${label} in the records available to this session. You may need to add a relevant record to MedVault.`;

  if (ctx.kind === 'profile' || ctx.kind === 'profile-meds') {
    if (!ctx.profileAllowed) return { text: 'Profile information is outside the records available to this session. I can answer from accessible medical records.', sources };
    const p = ctx.profile;
    if (/allerg/i.test(q)) return { text: p.allergies && p.allergies.length && p.allergies[0] !== 'None known' ? `Allergies listed in your profile: ${p.allergies.join(', ')}.` : 'Your profile records no known allergies.', sources };
    if (/condition|diagnos/i.test(q)) return { text: p.conditions && p.conditions.length && p.conditions[0] !== 'None recorded' ? `Conditions listed in your profile: ${p.conditions.join(', ')}.` : 'No medical conditions are listed in your profile.', sources };
    const meds = p.medications || [];
    return { text: meds.length && meds[0] !== 'None' ? `Medicines listed in your profile (these are profile entries, not confirmation that they are current today):\n${meds.map(m => `• ${m}`).join('\n')}` : 'No medicines are listed in your profile.', sources };
  }
  if (ctx.kind === 'metric') {
    const matches = assistantDateSort(ctx.records).map(r => assistantMetric(r, ctx.metric)).filter(Boolean);
    if (!matches.length) {
      const unparsed = ctx.records.filter(r => assistantMetricMentioned(r, ctx.metric));
      if (unparsed.length) return { text: `I found record${unparsed.length === 1 ? '' : 's'} that mention ${ctx.metric === 'bp' ? 'blood pressure' : ctx.metric}, but couldn't reliably extract a valid value. Open the source record to review it.`, sources: unparsed };
      return { text: notFound(ctx.metric === 'eye' ? 'an eye prescription' : `a recorded ${ctx.metric === 'bp' ? 'blood pressure' : ctx.metric === 'weight' ? 'weight' : ctx.metric === 'oxygen' ? 'oxygen saturation' : ctx.metric}`), sources };
    }
    if (/\b(history|changed|change|trend|over time|last year)\b/i.test(q)) {
      let list = matches;
      if (/last year/i.test(q)) { const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - 1); list = list.filter(m => new Date(m.record.date) >= cutoff); }
      list.forEach(m => addSource(m.record));
      return { text: list.length ? list.map(m => `${m.value} — ${fmtDate(m.record.date)}${m.record.facilityName ? ` · ${m.record.facilityName}` : ''}`).join('\n') : notFound(`a ${ctx.metric} reading in the last year`), sources };
    }
    const specific = q.match(/\b(?:in|on)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(20\d{2})/i);
    let selected = matches;
    if (specific) selected = matches.filter(m => { const d = new Date(`${specific[1]} 1, ${specific[2]}`); const md = new Date(`${m.record.date}T00:00:00`); return md.getMonth() === d.getMonth() && md.getFullYear() === d.getFullYear(); });
    const previous = /\b(previous|second[- ]latest|before (?:that|the last)|prior)\b/i.test(q);
    if (specific && !selected.length) return { text: notFound(`${ctx.metric} in ${specific[1]} ${specific[2]}`), sources };
    const picked = previous ? selected[1] : selected[0];
    if (!picked) return { text: `I found only one matching reading, so there is no previous reading available. The latest recorded value is ${selected[0].value}, dated ${fmtDate(selected[0].record.date)}.`, sources: [selected[0].record] };
    addSource(picked.record);
    const label = ctx.metric === 'bp' ? 'blood pressure' : ctx.metric === 'weight' ? 'weight' : ctx.metric === 'heartRate' ? 'heart rate' : ctx.metric === 'oxygen' ? 'oxygen saturation' : ctx.metric;
    const prefix = previous ? 'Your previous recorded' : 'Your latest recorded';
    const details = [picked.record.facilityName ? `Facility: ${picked.record.facilityName}.` : '', picked.record.doctor ? `Doctor: ${picked.record.doctor}.` : ''].filter(Boolean);
    const extra = details.length ? `\n${details.join('\n')}` : '';
    const sameDate = !previous ? matches.filter(m => m.record.date === picked.record.date) : [];
    const conflicts = new Set(sameDate.map(m => m.value)).size > 1 ? sameDate : [];
    conflicts.forEach(m => addSource(m.record));
    const conflictNote = conflicts.length ? `\nI found different values recorded on this date: ${conflicts.map(m => `${m.value} (${m.record.facilityName || m.record.title})`).join('; ')}.` : '';
    return { text: `${prefix} ${label} is ${picked.value}, documented on ${fmtDate(picked.record.date)}.${extra}${conflictNote}\n${previous ? 'This is the selected previous reading, not a measurement today.' : 'This is the latest matching reading available in your records, not a measurement today.'}`, sources };
  }
  if (ctx.kind === 'lab') {
    const matches = assistantDateSort(ctx.records).map(r => assistantLab(r, ctx.lab)).filter(Boolean);
    if (!matches.length) {
      const unparsed = ctx.records.filter(r => new RegExp(ASSISTANT_LABS[ctx.lab].label === 'HbA1c' ? 'HbA1c|A1c' : ASSISTANT_LABS[ctx.lab].label, 'i').test(assistantText(r)));
      if (unparsed.length) return { text: `I found record${unparsed.length === 1 ? '' : 's'} that mention ${ASSISTANT_LABS[ctx.lab].label}, but couldn't reliably extract a valid result. Open the source record to review it.`, sources: unparsed };
      return { text: notFound(`a ${ASSISTANT_LABS[ctx.lab].label} result`), sources };
    }
    const previous = /\b(previous|older|prior|history|results)\b/i.test(q) && !/latest|last\b/i.test(q);
    const list = previous ? matches : matches.slice(0, 1);
    const sameDateConflicts = !previous ? matches.filter(m => m.record.date === list[0].record.date) : [];
    const conflicting = new Set(sameDateConflicts.map(m => m.value)).size > 1 ? sameDateConflicts : [];
    (conflicting.length ? conflicting : list).forEach(m => addSource(m.record));
    const conflictLine = conflicting.length ? `\nDifferent values were recorded on this date: ${conflicting.map(m => `${m.value}${m.record.facilityName ? ` at ${m.record.facilityName}` : ''}`).join('; ')}.` : '';
    return { text: list.map(m => `${previous ? 'Recorded result' : 'Latest recorded result'}: ${m.value} on ${fmtDate(m.record.date)}${m.record.facilityName ? ` at ${m.record.facilityName}` : ''}${m.record.doctor ? ` · ${m.record.doctor}` : ''}.`).join('\n') + conflictLine + (previous ? '' : '\nThis is a recorded result, not a new test.'), sources };
  }
  if (ctx.kind === 'eye') {
    if (!ctx.records.length) return { text: 'I couldn\'t find an eye-power or spectacle prescription in the records available to this session. You may need to add your latest eye examination or prescription.', sources };
    const asksExistence = /\b(any|do i have|eye examination records?)\b/i.test(q);
    const rows = ctx.records.map(r => {
      addSource(r);
      const extracted = assistantExtractEye(r);
      if (!extracted) return `${r.title} is an eye-related record dated ${fmtDate(r.date)}, but I couldn't reliably extract an eye prescription value from it.`;
      return `${extracted.value}\nRecorded ${fmtDate(r.date)}${r.facilityName ? ` · ${r.facilityName}` : ''}.`;
    });
    if (asksExistence) return { text: `I found ${ctx.records.length} eye-related record${ctx.records.length === 1 ? '' : 's'}:\n${ctx.records.map(r => `${r.title} — ${fmtDate(r.date)}`).join('\n')}`, sources: ctx.records };
    return { text: rows.join('\n\n'), sources };
  }
  if (ctx.kind === 'medications') {
    if (!ctx.records.length) return { text: notFound('medication details in an accessible prescription or record'), sources };
    const records = /previous|previously|history|prescribed before/i.test(q) ? ctx.records : ctx.records.slice(0, 1);
    const lines = records.map(r => {
      addSource(r);
      return `${r.extracted.medications.join('; ')}\nPrescribed in ${r.title} on ${fmtDate(r.date)}${r.doctor ? ` by ${r.doctor}` : ''}. This is a historical prescription and may not reflect your current treatment.`;
    });
    return { text: lines.join('\n\n'), sources };
  }
  if (ctx.kind === 'latest-record') {
    const found = /prescription/i.test(q) ? ctx.allRecords.find(r => r.type === 'prescription') : ctx.allRecords[0];
    if (!found) return { text: notFound('a medical record'), sources };
    addSource(found);
    return { text: `${found.title} is the most recent ${found.type === 'prescription' ? 'prescription' : 'medical record'} available, dated ${fmtDate(found.date)}.${found.facilityName ? `\nFacility: ${found.facilityName}.` : ''}${found.doctor ? `\nDoctor: ${found.doctor}.` : ''}`, sources };
  }
  if (ctx.kind === 'summary') {
    const found = ctx.allRecords[0];
    if (!found) return { text: notFound('a medical record to summarize'), sources };
    addSource(found);
    return { text: `${found.title} — ${fmtDate(found.date)}${found.facilityName ? ` · ${found.facilityName}` : ''}.\n${found.summary || 'No summary text is available.'}${found.extracted && found.extracted.results ? `\nResults: ${found.extracted.results}` : ''}${found.extracted && found.extracted.vitals ? `\nVitals: ${found.extracted.vitals}` : ''}`, sources };
  }
  if (ctx.kind === 'history') {
    let records = ctx.allRecords;
    if (/last year/i.test(q)) { const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - 1); records = records.filter(r => new Date(r.date) >= cutoff); }
    if (/blood pressure|\bbp\b/i.test(q)) {
      const matches = records.map(r => assistantMetric(r, 'bp')).filter(Boolean);
      if (!matches.length) return { text: notFound('blood pressure history'), sources };
      matches.forEach(m => addSource(m.record));
      return { text: matches.map(m => `${m.value} — ${fmtDate(m.record.date)}${m.record.facilityName ? ` · ${m.record.facilityName}` : ''}`).join('\n'), sources };
    }
    if (/changed between|last two checkups|between my last two/i.test(q)) {
      const checkups = records.filter(r => ['prescription', 'consultation-note'].includes(r.type) && ['bp', 'weight', 'bmi'].some(k => assistantMetric(r, k))).slice(0, 2);
      if (!checkups.length) return { text: notFound('checkup records to compare'), sources };
      checkups.forEach(addSource);
      const metrics = ['bp', 'weight', 'bmi', 'heartRate', 'oxygen'].map(key => {
        const values = checkups.map(r => assistantMetric(r, key));
        return values[0] && values[1] ? `${key === 'bp' ? 'Blood pressure' : key === 'heartRate' ? 'Heart rate' : key === 'oxygen' ? 'Oxygen saturation' : key.toUpperCase()}: ${values[1].value} (${fmtDate(checkups[1].date)}) → ${values[0].value} (${fmtDate(checkups[0].date)})` : null;
      }).filter(Boolean);
      return { text: `${checkups[1] ? `Comparing ${checkups[1].title} (${fmtDate(checkups[1].date)}) with ${checkups[0].title} (${fmtDate(checkups[0].date)}):` : `Latest checkup on ${fmtDate(checkups[0].date)}:`}\n${metrics.length ? metrics.join('\n') : 'No matching measurements were available in both records.'}`, sources };
    }
    const picked = records.slice(0, 5);
    if (!picked.length) return { text: notFound('medical records'), sources };
    picked.forEach(addSource);
    return { text: picked.map(r => `${r.title} — ${fmtDate(r.date)}${r.facilityName ? ` · ${r.facilityName}` : ''}\n${r.summary || 'No summary is available.'}`).join('\n\n'), sources };
  }
  if (/\b(missing|not in my records|not recorded)\b/i.test(q)) {
    const missing = [];
    if (!ctx.allRecords.some(r => assistantMetric(r, 'height'))) missing.push('height');
    if (!ctx.allRecords.some(r => assistantMetric(r, 'heartRate'))) missing.push('heart rate');
    if (!ctx.allRecords.some(r => assistantMetric(r, 'oxygen'))) missing.push('oxygen saturation');
    if (!ctx.allRecords.some(r => assistantExtractEye(r))) missing.push('eye prescription');
    Object.keys(ASSISTANT_LABS).forEach(k => { if (!ctx.allRecords.some(r => assistantLab(r, k))) missing.push(`${ASSISTANT_LABS[k].label} result`); });
    return { text: missing.length ? `I couldn't find these common details in the records available to this session: ${missing.join(', ')}. This only reflects the information currently on file.` : 'I found entries for the common measurements and lab fields I checked. This does not confirm that your medical record is complete.', sources };
  }
  return { text: 'I can answer questions about measurements, vital signs, lab results, prescriptions, allergies, conditions, and your available record history. Try asking about a specific value or record.', sources };
}

function assistantRenderMessage(message) {
  const content = esc(message.text).replace(/\n/g, '<br>');
  const sourceHtml = (message.sources || []).map(r => `<button type="button" class="assistant-source" data-assistant-source="${esc(r.id)}">${icon('records', 14)} ${esc(r.title)} · ${esc(fmtDate(r.date))}</button>`).join('');
  return `<div class="assistant-message assistant-message--${message.role === 'user' ? 'user' : 'assistant'}"><div class="assistant-bubble">${content}${sourceHtml ? `<div class="assistant-sources"><span>Sources</span>${sourceHtml}</div>` : ''}</div></div>`;
}

function assistantState() {
  const access = assistantAccess();
  if (!access.ok) return { access, state: null };
  const actorKey = `${App.currentUser() ? App.currentUser().id : 'emergency'}:${access.patientId}`;
  if (!App.assistantState || App.assistantState.actorKey !== actorKey) App.assistantState = { actorKey, patientId: access.patientId, messages: [], loading: false };
  return { access, state: App.assistantState };
}

Screens.patient.assistant = Screens.caregiver.assistant = Screens.provider.assistant = Screens.emergency.assistant = function () {
  const { access, state } = assistantState();
  if (!access.ok) return '<div class="screen">' + emptyState('Assistant unavailable', access.reason) + '</div>';
  const welcome = `<div class="assistant-message"><div class="assistant-bubble assistant-welcome">Hi! I'm your MedVault AI assistant.<br><br>Ask me about your medical records, prescriptions, test results, vital signs, or previous appointments.<br><br>I'll look through your available records and tell you what they show.<div class="assistant-note">Answers are based only on records available to this session.</div></div></div>`;
  const suggestions = !state.messages.length ? `<div class="assistant-suggestions">${ASSISTANT_SUGGESTIONS.map(s => `<button type="button" class="assistant-suggestion" data-assistant-suggestion="${esc(s)}">${esc(s)}</button>`).join('')}</div>` : '';
  const messages = state.messages.map(assistantRenderMessage).join('');
  return `<div class="screen assistant-screen"><div class="assistant-intro"><div class="assistant-avatar">${icon('sparkle', 18)}</div><div><strong>MedVault AI</strong><span>Answers from your medical records</span></div></div><div class="assistant-thread" id="assistant-thread" aria-live="polite">${welcome}${messages}${suggestions}${state.loading ? '<div class="assistant-message"><div class="assistant-bubble assistant-thinking"><span class="spinner"></span><span>Checking your available records…</span></div></div>' : ''}</div><form class="assistant-composer" id="assistant-form"><input id="assistant-input" class="input" maxlength="2000" autocomplete="off" aria-label="Ask about your medical records" placeholder="Ask about your medical records…" ${state.loading ? 'disabled' : ''}><button class="btn btn--primary" type="submit" aria-label="Send question" ${state.loading ? 'disabled' : ''}>${icon('send', 18)}</button></form></div>`;
};

function bindAssistant(root) {
  const { access, state } = assistantState();
  if (!access.ok || !state) return;
  if (!state.openLogged) { audit('ASSISTANT_OPENED', { patientId: access.patientId, detail: 'Medical-record assistant opened' }); state.openLogged = true; }
  const form = $('#assistant-form', root), input = $('#assistant-input', root);
  const scroll = () => { const thread = $('#assistant-thread', root); if (thread) thread.scrollTop = thread.scrollHeight; };
  const ask = async value => {
    const question = String(value || '').trim();
    if (state.loading) return;
    if (!question) { Toast.warn('Enter a question', 'Ask about a value or a medical record.'); return; }
    if (question.length > 500) { Toast.warn('Question is too long', 'Please keep questions under 500 characters.'); return; }
    state.messages.push({ role: 'user', text: question, sources: [] });
    state.loading = true;
    App.renderBody();
    scroll();
    try {
      await new Promise(resolve => setTimeout(resolve, 220));
      const latestAccess = assistantAccess();
      if (!latestAccess.ok || latestAccess.patientId !== state.patientId) throw new Error('access');
      const answer = assistantAnswer(state.patientId, question);
      if (answer.denied) throw new Error('access');
      state.messages.push({ role: 'assistant', text: answer.text, sources: answer.sources || [] });
      audit('ASSISTANT_RECORDS_RETRIEVED', { patientId: state.patientId, detail: 'Medical assistant retrieval completed' });
    } catch (e) {
      state.messages.push({ role: 'assistant', text: 'I couldn’t complete that lookup because access to the selected records could not be verified. Please return to the patient record and try again.', sources: [] });
      audit('ASSISTANT_REQUEST_FAILED', { patientId: state.patientId, detail: 'Medical assistant retrieval failed', severity: 'warning' });
    } finally {
      state.loading = false;
      if (App.subScreen === 'assistant' && assistantAccess().patientId === state.patientId) {
        App.renderBody();
        scroll();
      }
    }
  };
  if (form) form.addEventListener('submit', e => { e.preventDefault(); const q = input.value; input.value = ''; ask(q); });
  $$('[data-assistant-suggestion]', root).forEach(b => b.addEventListener('click', () => ask(b.dataset.assistantSuggestion)));
  $$('[data-assistant-source]', root).forEach(b => b.addEventListener('click', () => {
    const r = Store.state.records.find(x => x.id === b.dataset.assistantSource);
    if (!r || !assistantCanOpenRecord(r)) { Toast.error('Source unavailable', 'This record is no longer in your accessible record set.'); return; }
    audit('ASSISTANT_SOURCE_OPENED', { patientId: r.patientId, detail: 'Medical assistant source record opened' });
    openRecordView(r.id);
  }));
  scroll();
}

Screens.patient.bind.assistant = Screens.caregiver.bind.assistant = Screens.provider.bind.assistant = Screens.emergency.bind.assistant = bindAssistant;
