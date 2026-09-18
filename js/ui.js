/* ============================================================
   ui.js — Toast, Sheet, Fullscreen, simulated OCR pipeline
   ============================================================ */

const Toast = {
  show(title, body, kind) {
    kind = kind || 'success';
    const root = $('#toast-root');
    const ico = kind === 'success' ? 'check' : kind === 'error' ? 'x' : kind === 'warn' ? 'alert' : 'bell';
    const el = document.createElement('div');
    el.className = 'toast toast--' + kind;
    el.innerHTML = '<span class="toast__ico">' + icon(ico, 20) + '</span><div style="flex:1;min-width:0"><strong>' + esc(title) + '</strong>' + (body ? '<p>' + esc(body) + '</p>' : '') + '</div>';
    root.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 220); }, 3800);
  },
  success(t, b) { this.show(t, b, 'success'); },
  error(t, b) { this.show(t, b, 'error'); },
  warn(t, b) { this.show(t, b, 'warn'); },
  info(t, b) { this.show(t, b, 'info'); }
};

const Sheet = {
  open(opts) {
    const root = $('#sheet-root');
    root.innerHTML = '<div class="sheet-backdrop"><div class="sheet" role="dialog" aria-modal="true">' +
      '<div class="sheet__handle"></div>' +
      '<div class="sheet__head"><h3>' + esc(opts.title) + '</h3>' +
        '<button class="app-header__btn" data-sheet-close aria-label="Close">' + icon('x', 18) + '</button></div>' +
      '<div class="sheet__body">' + opts.body + '</div>' +
      (opts.footer ? '<div class="sheet__foot">' + opts.footer + '</div>' : '') +
    '</div></div>';
    const bd = $('.sheet-backdrop', root);
    bd.addEventListener('mousedown', e => { if (e.target === bd) Sheet.close(); });
    $$('[data-sheet-close]', root).forEach(b => b.addEventListener('click', () => Sheet.close()));
    return root;
  },
  close() { $('#sheet-root').innerHTML = ''; },
  confirm(opts) {
    return new Promise(resolve => {
      const root = Sheet.open({
        title: opts.title || 'Confirm',
        body: '<p style="font-size:14.5px;line-height:1.6;margin-bottom:14px">' + esc(opts.message) + '</p>' +
          (opts.warning ? '<div class="alert alert--warn">' + icon('alert', 18) + '<div>' + esc(opts.warning) + '</div></div>' : ''),
        footer: '<button class="btn" data-sheet-close>Cancel</button>' +
          '<button class="btn ' + (opts.danger ? 'btn--danger' : 'btn--primary') + '" data-ok>' + esc(opts.okLabel || 'Confirm') + '</button>'
      });
      $$('[data-ok]', root).forEach(b => b.addEventListener('click', () => { Sheet.close(); resolve(true); }));
    });
  }
};

const Fullscreen = {
  open(opts) {
    const root = $('#fullscreen-root');
    root.innerHTML = '<div class="fullscreen">' +
      '<div class="fullscreen__header">' +
        '<button data-fs-close aria-label="Back">' + icon('chevronLeft', 22) + '</button>' +
        '<div class="app-header__title" style="flex:1">' + esc(opts.title) + '</div>' +
        '<div class="app-header__actions">' + (opts.actions || '') + '</div>' +
      '</div>' +
      '<div class="fullscreen__body">' + opts.body + '</div>' +
    '</div>';
    $$('[data-fs-close]', root).forEach(b => b.addEventListener('click', () => Fullscreen.close()));
    return root;
  },
  close() { $('#fullscreen-root').innerHTML = ''; }
};

const OCR = {
  samples: [
    { key: 'prescription', label: 'Prescription — Apollo Hospitals', type: 'prescription', fileName: 'apollo_prescription_review.pdf', size: 118000,
      raw: 'APOLLO HOSPITALS, CHENNAI\nPatient: ATULYA VERMA   Age/Sex: 19/M\nDate: 18-Jun-2025\nDx: T2DM, HTN — improved control\nRx:\n1. Tab Metformin 500 mg — 1-0-1\n2. Tab Amlodipine 5 mg — 1-0-0\n3. Tab Atorvastatin 10 mg — 0-0-1\nVitals: BP 124/80 mmHg, Wt 72 kg\nDr. Ananya Rao, MD',
      extracted: { facility: 'Apollo Hospitals, Chennai', doctor: 'Dr. Ananya Rao', date: '2025-06-18', diagnosis: 'Type 2 Diabetes Mellitus, Hypertension — improved control', medications: ['Metformin 500 mg — 1-0-1 after meals', 'Amlodipine 5 mg — 1-0-0 morning', 'Atorvastatin 10 mg — 0-0-1 at night'], vitals: 'BP 124/80 mmHg · Weight 72 kg · BMI 25.1', advice: 'Continue diet and exercise. Retinal screening due. Review in 3 months.' } },
    { key: 'lab', label: 'Lab Report — Dr Lal PathLabs', type: 'lab-report', fileName: 'lalpath_blood_panel.pdf', size: 204000,
      raw: 'DR LAL PATHLABS\nPatient: ATULYA VERMA\nCollected: 14-Feb-2025\nHbA1c 7.8%\nFBS 146 mg/dL\nLDL 118 mg/dL\nCreatinine 0.9 mg/dL',
      extracted: { facility: 'Dr Lal PathLabs, Pune', doctor: 'Dr. S. Bhattacharya', date: '2025-02-14', diagnosis: 'Sub-optimal glycaemic control', medications: ['Continue Metformin 500 mg BD'], results: 'HbA1c 7.8% · FBS 146 mg/dL · LDL 118 mg/dL · Creatinine 0.9 mg/dL', advice: 'Intensify diet control. Consider dose escalation.' } },
    { key: 'discharge', label: 'Discharge Summary — Fortis Clinic', type: 'discharge-summary', fileName: 'fortis_discharge_summary.pdf', size: 386000,
      raw: 'FORTIS CLINIC, BENGALURU\nPatient: ATULYA VERMA\nAdm: 05-Nov-2023   Dis: 08-Nov-2023\nFinal Dx: Diabetic Ketoacidosis (E11.10)\nManaged with IV fluids and insulin sliding scale.',
      extracted: { facility: 'Fortis Clinic, Bengaluru', doctor: 'Dr. Ananya Rao', date: '2023-11-08', diagnosis: 'Diabetic Ketoacidosis (E11.10) with Hypertension', medications: ['Metformin 500 mg — BD', 'Amlodipine 5 mg — OD', 'Vitamin D 60K — weekly x 8 weeks'], vitals: 'Stable on discharge', advice: 'Strict glycaemic control. Review in 4 weeks.' } }
  ],
  simulate(fileName, size, onProgress) {
    return new Promise(resolve => {
      const name = (fileName || '').toLowerCase();
      let sample = this.samples[0];
      if (/lab|path|blood|test/.test(name)) sample = this.samples[1];
      else if (/discharge|summary/.test(name)) sample = this.samples[2];
      const stages = ['Uploading…', 'OCR extraction…', 'Classifying document…', 'Extracting entities…', 'Structuring fields…'];
      let i = 0;
      const tick = () => {
        if (i < stages.length) {
          onProgress(Math.round(((i + 1) / stages.length) * 100), stages[i]);
          i++;
          setTimeout(tick, 400);
        } else {
          resolve({
            sample: sample,
            fileName: fileName || sample.fileName,
            size: size || sample.size,
            type: sample.type,
            raw: sample.raw,
            extracted: JSON.parse(JSON.stringify(sample.extracted))
          });
        }
      };
      tick();
    });
  }
};