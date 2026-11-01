/* ============================================================
   ocr.js — browser-side OCR (Tesseract.js) + shared review form
   Attaches: OCR.process, OCR.recognize, OCR.parseText, OCR.loadEngine
   Exposes globals: OCRReview

   Images are read in the browser with Tesseract.js, loaded from a CDN the
   first time a real image is uploaded. The built-in sample documents keep
   using the simulated results in ui.js and are labelled as samples.
   Every result goes to an editable review form before anything is saved.
   ============================================================ */

OCR.ENGINE = {
  src: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js',
  integrity: 'sha384-GJqSu7vueQ9qN0E9yLPb3Wtpd7OrgK8KmYzC8T1IysG1bcvxvIO4qtYR/D3A991F',
  timeoutMs: 45000
};
OCR.IMAGE_RE = /^image\/(png|jpe?g|webp|bmp|gif)$/i;

OCR.loadEngine = function () {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (this._loading) return this._loading;
  this._loading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = this.ENGINE.src;
    s.integrity = this.ENGINE.integrity;
    s.crossOrigin = 'anonymous';
    const timer = setTimeout(() => reject(new Error('The OCR engine took too long to load.')), this.ENGINE.timeoutMs);
    s.onload = () => { clearTimeout(timer); window.Tesseract ? resolve(window.Tesseract) : reject(new Error('The OCR engine did not start.')); };
    s.onerror = () => { clearTimeout(timer); reject(new Error('The OCR engine could not be downloaded. Check your internet connection.')); };
    document.head.appendChild(s);
  }).catch(err => { this._loading = null; throw err; });
  return this._loading;
};

function ocrEmptyResult(file, reason, message) {
  return {
    ok: false, source: 'ocr', reason, message,
    file, fileName: file.name, size: file.size, type: 'prescription', raw: '', confidence: null,
    sample: { label: file.name.replace(/\.[^.]+$/, '') || 'Uploaded document' },
    extracted: { facility: '', doctor: '', date: '', diagnosis: '', medications: [], results: '', vitals: '', advice: '' }
  };
}

/* Read one image file. Always resolves; failures come back with ok:false and
   a message, so the review form can still be filled in by hand. */
OCR.recognize = async function (file, onProgress) {
  onProgress = onProgress || function () {};
  if (!OCR.IMAGE_RE.test(file.type || '')) {
    return ocrEmptyResult(file, 'unsupported', 'OCR reads JPG, PNG or WebP images. This file can still be saved — fill in the fields yourself from the document.');
  }
  let worker = null;
  try {
    onProgress(5, 'Loading OCR engine…');
    const T = await OCR.loadEngine();
    onProgress(15, 'Preparing language data…');
    worker = await T.createWorker('eng', 1, {
      logger: m => {
        if (m.status === 'recognizing text') onProgress(30 + Math.round((m.progress || 0) * 65), 'Reading text…');
        else if (/load|initializ/i.test(m.status || '')) onProgress(15 + Math.round((m.progress || 0) * 14), 'Preparing language data…');
      }
    });
    const { data } = await worker.recognize(file);
    onProgress(98, 'Structuring fields…');
    const raw = String(data.text || '').trim();
    if (raw.replace(/\W/g, '').length < 4) {
      return Object.assign(ocrEmptyResult(file, 'empty', 'No readable text was found. Try a sharper, well-lit photo, or fill in the fields yourself.'), { raw, confidence: Math.round(data.confidence || 0) });
    }
    const parsed = OCR.parseText(raw);
    onProgress(100, 'Done');
    return {
      ok: true, source: 'ocr', file, fileName: file.name, size: file.size,
      type: parsed.type, raw, confidence: Math.round(data.confidence || 0),
      sample: { label: parsed.label }, extracted: parsed.extracted
    };
  } catch (err) {
    return ocrEmptyResult(file, 'failed', (err && err.message ? err.message : 'OCR failed.') + ' You can still fill in the fields yourself.');
  } finally {
    if (worker) { try { await worker.terminate(); } catch (_) {} }
  }
};

/* source: { file } for a real upload, or { sample: index } for a demo sample. */
OCR.process = function (source, onProgress) {
  if (source && source.file) return OCR.recognize(source.file, onProgress);
  const s = OCR.samples[(source && source.sample) || 0];
  return OCR.simulate(s.fileName, s.size, onProgress).then(res => Object.assign(res, { ok: true, source: 'sample', file: null, confidence: null }));
};

/* Pull structured fields out of OCR text with fixed patterns. Anything not
   recognised is left blank for the user to fill in. */
OCR.parseText = function (text) {
  const lines = text.split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const flat = lines.join('\n');
  const titleCase = s => s === s.toUpperCase() ? s.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase()) : s;
  const after = re => { const m = flat.match(re); return m ? m[1].trim().replace(/[.;,]+$/, '') : ''; };

  const facilityLine = lines.find(l => /hospital|clinic|path\s?labs?|laborator|diagnostic|medical cent|health ?care|nursing home|centre|center/i.test(l) && !/^dr\.?\s/i.test(l)) || '';
  const doctorM = flat.match(/\bDr\.? +([A-Z][A-Za-z.]+(?: +[A-Za-z][A-Za-z.]+){0,3})/);

  const months = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  const iso = (y, m, d) => {
    const dt = new Date(Date.UTC(+y, +m - 1, +d));
    return dt.getUTCFullYear() === +y && dt.getUTCMonth() === +m - 1 && dt.getUTCDate() === +d ? dt.toISOString().slice(0, 10) : '';
  };
  let date = '', m;
  if ((m = flat.match(/\b(\d{1,2})[-\/. ]([A-Za-z]{3})[a-z]*[-\/., ]+(\d{4})\b/)) && months[m[2].toLowerCase()]) date = iso(m[3], months[m[2].toLowerCase()], m[1]);
  if (!date && (m = flat.match(/\b(\d{4})-(\d{2})-(\d{2})\b/))) date = iso(m[1], m[2], m[3]);
  if (!date && (m = flat.match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})\b/))) date = iso(m[3], m[2], m[1]); // Indian dd/mm/yyyy

  const medPrefix = /^(?:\d+\s*[.)]\s*)?(?:tab|tablet|cap|capsule|syp|syrup|inj|injection|oint|ointment|drops?|inhaler)\b\.?\s*(.+)$/i;
  let medications = lines.map(l => { const mm = l.match(medPrefix); return mm ? mm[1] : null; }).filter(Boolean);
  if (!medications.length) {
    medications = lines.filter(l => /\b\d+(?:\.\d+)?\s?(?:mg|mcg|ml|iu|g)\b/i.test(l) && !/hba1c|ldl|hdl|creatinine|egfr|glucose|fbs|urea|mg\s*\/\s*dl/i.test(l))
      .map(l => l.replace(/^\d+\s*[.)]\s*/, ''));
  }
  medications = medications.map(x => x.replace(/\s+-\s+/g, ' — ').trim()).filter(x => x.length > 2);

  const results = AI_METRICS.filter(d => d.key !== 'bp').map(d => {
    const mm = flat.match(d.re);
    if (!mm) return null;
    const label = { hba1c: 'HbA1c', fbs: 'FBS', ldl: 'LDL', creatinine: 'Creatinine', egfr: 'eGFR' }[d.key];
    return label + ' ' + mm[1] + (d.unit === '%' ? '%' : ' ' + (mm[2] ? mm[2].replace(/\s/g, '') : d.unit));
  }).filter(Boolean).join(' · ');

  const vitals = [];
  if ((m = flat.match(/(?:\bBP\b|blood\s+pressure)\s*[:=]?\s*(\d{2,3})\s*\/\s*(\d{2,3})/i))) vitals.push('BP ' + m[1] + '/' + m[2] + ' mmHg');
  if ((m = flat.match(/(?:weight|\bwt\b)\.?\s*[:=]?\s*(\d{2,3}(?:\.\d+)?)\s*kg/i))) vitals.push('Weight ' + m[1] + ' kg');
  if ((m = flat.match(/(?:\bHR\b|heart\s*rate|pulse)\s*[:=]?\s*(\d{2,3})/i))) vitals.push('HR ' + m[1] + ' bpm');
  if ((m = flat.match(/SpO\s*[2₂]?\s*[:=]?\s*(\d{2,3})\s*%/i))) vitals.push('SpO₂ ' + m[1] + '%');

  let type = 'consultation-note';
  if (/discharge/i.test(flat)) type = 'discharge-summary';
  else if (/vaccin|immunis|immuniz/i.test(flat)) type = 'vaccination';
  else if (results && !medications.length) type = 'lab-report';
  else if (medications.length || /\bRx\b|prescription/i.test(flat)) type = 'prescription';
  else if (results || /\breport\b|specimen|collected/i.test(flat)) type = 'lab-report';

  const facility = titleCase(facilityLine);
  return {
    type,
    label: (RECORD_TYPES[type] || { label: 'Document' }).label + (facility ? ' — ' + facility.split(',')[0] : ' — scanned document'),
    extracted: {
      facility, doctor: doctorM ? 'Dr. ' + doctorM[1].replace(/[.,]+$/, '') : '', date,
      diagnosis: after(/^(?:dx|diagnosis|final\s+dx|provisional\s+dx|impression)\s*[:\-.]\s*(.+)$/im),
      medications, results, vitals: vitals.join(' · '),
      advice: after(/^(?:advice|adv|plan|instructions?|follow[- ]?up)\s*[:\-.]\s*(.+)$/im)
    }
  };
};

/* ---------- Shared editable review form (patient + provider uploads) ---------- */
const OCRReview = {
  notice(res) {
    if (res.source === 'sample') {
      return '<div class="alert alert--info" style="margin-bottom:14px">' + icon('records', 18) + '<div><strong>Sample document.</strong> These fields come from a built-in demo sample, not from reading a file.</div></div>';
    }
    if (!res.ok) {
      return '<div class="alert alert--warn" style="margin-bottom:14px">' + icon('alert', 18) + '<div><strong>Text could not be read automatically.</strong> ' + esc(res.message || '') + '</div></div>';
    }
    const low = res.confidence !== null && res.confidence < 60;
    return '<div class="alert ' + (low ? 'alert--warn' : 'alert--success') + '" style="margin-bottom:14px">' + icon(low ? 'alert' : 'check', 18) +
      '<div><strong>Text read from your image' + (res.confidence !== null ? ' (OCR confidence ' + res.confidence + '%)' : '') + '.</strong> ' +
      (low ? 'Confidence is low — check every field carefully. ' : '') +
      'OCR makes mistakes, especially with handwriting. Compare each field with the original before saving.</div></div>';
  },

  fields(prefix, res, opts) {
    opts = opts || {};
    const ex = res.extracted || {};
    const id = k => prefix + '-' + k;
    const preview = res.file && OCR.IMAGE_RE.test(res.file.type || '')
      ? '<img class="ocr-preview" id="' + id('preview') + '" alt="Uploaded document" />' : '';
    const raw = res.raw
      ? '<details class="ocr-raw"><summary>Recognised text</summary><pre>' + esc(res.raw) + '</pre></details>' : '';
    return this.notice(res) + preview + raw +
      (opts.noTitle ? '' : '<div class="field"><label for="' + id('title') + '">Record title</label><input class="input" id="' + id('title') + '" value="' + esc(opts.title || (res.sample && res.sample.label) || '') + '" /></div>') +
      '<div class="field"><label for="' + id('type') + '">Type</label><select class="select" id="' + id('type') + '">' +
        Object.keys(RECORD_TYPES).map(t => '<option value="' + t + '"' + (res.type === t ? ' selected' : '') + '>' + esc(RECORD_TYPES[t].label) + '</option>').join('') +
      '</select></div>' +
      '<div class="field"><label for="' + id('date') + '">Date</label><input class="input" type="date" id="' + id('date') + '" value="' + esc(ex.date || '') + '" />' + (ex.date ? '' : '<div class="hint">No date was found — enter the date on the document.</div>') + '</div>' +
      '<div class="field"><label for="' + id('facility') + '">Facility</label><input class="input" id="' + id('facility') + '" value="' + esc(ex.facility || opts.facility || '') + '" /></div>' +
      '<div class="field"><label for="' + id('doctor') + '">Clinician</label><input class="input" id="' + id('doctor') + '" value="' + esc(ex.doctor || opts.doctor || '') + '" /></div>' +
      '<div class="field"><label for="' + id('diagnosis') + '">Diagnosis</label><input class="input" id="' + id('diagnosis') + '" value="' + esc(ex.diagnosis || '') + '" /></div>' +
      '<div class="field"><label for="' + id('meds') + '">Medications (one per line)</label><textarea class="textarea" id="' + id('meds') + '">' + esc((ex.medications || []).join('\n')) + '</textarea></div>' +
      '<div class="field"><label for="' + id('results') + '">Lab results</label><input class="input" id="' + id('results') + '" value="' + esc(ex.results || '') + '" placeholder="e.g. HbA1c 6.8% · LDL 94 mg/dL" /></div>' +
      '<div class="field"><label for="' + id('vitals') + '">Vital signs</label><input class="input" id="' + id('vitals') + '" value="' + esc(ex.vitals || '') + '" placeholder="e.g. BP 120/80 mmHg · Weight 70 kg" /></div>' +
      '<div class="field"><label for="' + id('advice') + '">Advice</label><textarea class="textarea" id="' + id('advice') + '">' + esc(ex.advice || '') + '</textarea></div>' +
      '<label class="check" id="' + id('ok-wrap') + '" style="margin-bottom:14px"><input type="checkbox" id="' + id('ok') + '" />' +
        '<span>I have checked these details against the original document<small>Required before saving.</small></span></label>';
  },

  /* Shows the image preview and keeps the save button disabled until the
     review box is ticked. */
  bind(prefix, root, saveBtn, res) {
    const ok = $('#' + prefix + '-ok', root), wrap = $('#' + prefix + '-ok-wrap', root);
    const sync = () => { if (saveBtn) saveBtn.disabled = !ok.checked; if (wrap) wrap.classList.toggle('is-on', ok.checked); };
    if (ok) { ok.addEventListener('change', sync); sync(); }
    const img = $('#' + prefix + '-preview', root);
    if (img && res && res.file) {
      const url = URL.createObjectURL(res.file);
      img.src = url;
      img.addEventListener('load', () => setTimeout(() => URL.revokeObjectURL(url), 1000), { once: true });
    }
  },

  read(prefix, root) {
    const v = k => { const el = $('#' + prefix + '-' + k, root); return el ? el.value.trim() : ''; };
    return {
      title: v('title'), type: v('type'), date: v('date'), facility: v('facility'), doctor: v('doctor'),
      diagnosis: v('diagnosis'), medications: v('meds').split('\n').map(s => s.trim()).filter(Boolean),
      results: v('results'), vitals: v('vitals'), advice: v('advice')
    };
  }
};
