/* ============================================================
   screens-provider.js — provider screens, bindings, modals
   ============================================================ */

Screens.provider.home = function () {
  const pv = App.currentProvider();
  if (!pv) return '<div class="screen">' + emptyState('No provider profile', '') + '</div>';
  const fac = Store.facility(pv.facilityId);
  const myConsents = Store.state.consents.filter(c => c.providerId === pv.id);
  const active = myConsents.filter(c => c.status === 'active');
  const pending = myConsents.filter(c => c.status === 'pending');
  const myPatients = active.map(c => Store.patient(c.patientId)).filter(Boolean);
  const myUploads = Store.state.records.filter(r => r.doctor === pv.name);

  return '<div class="screen">' +
    '<div class="greeting"><h1>' + esc(pv.name) + '</h1>' +
      '<p>' + esc(pv.specialty) + ' · ' + esc(fac ? fac.name + ', ' + fac.city : '') + '</p></div>' +

    '<div class="stats" style="margin-bottom:18px">' +
      '<div class="stat"><div class="stat__top"><span class="stat__label">Patients</span><span class="stat__ico teal">' + icon('users', 16) + '</span></div>' +
        '<div class="stat__val">' + myPatients.length + '</div><div class="stat__sub">under active consent</div></div>' +
      '<div class="stat"><div class="stat__top"><span class="stat__label">Pending</span><span class="stat__ico amber">' + icon('shield', 16) + '</span></div>' +
        '<div class="stat__val">' + pending.length + '</div><div class="stat__sub">awaiting patient</div></div>' +
      '<div class="stat"><div class="stat__top"><span class="stat__label">Records linked</span><span class="stat__ico">' + icon('upload', 16) + '</span></div>' +
        '<div class="stat__val">' + myUploads.length + '</div><div class="stat__sub">by you</div></div>' +
      '<div class="stat"><div class="stat__top"><span class="stat__label">Facility</span><span class="stat__ico">' + icon('building', 16) + '</span></div>' +
        '<div class="stat__val" style="font-size:16px;line-height:1.25">' + esc(fac ? fac.name : '—') + '</div><div class="stat__sub">' + esc(fac ? fac.city : '') + '</div></div>' +
    '</div>' +

    '<div class="section-title">Primary actions</div>' +
    '<div class="list" style="margin-bottom:0">' +
      '<div class="list-item" data-act="go-assisted"><span class="list-item__ico" style="background:var(--indigo-50);color:var(--indigo)">' + icon('link', 20) + '</span>' +
        '<div class="list-item__body"><div class="list-item__title">Assisted record linking</div><div class="list-item__sub">Verify patient and link records</div></div>' +
        '<span class="list-item__chev">' + icon('chevron', 18) + '</span></div>' +
      '<div class="list-item" data-act="go-lookup"><span class="list-item__ico" style="background:var(--teal-50);color:var(--teal)">' + icon('search', 20) + '</span>' +
        '<div class="list-item__body"><div class="list-item__title">Look up a patient</div><div class="list-item__sub">By MedVault ID, ABHA or name</div></div>' +
        '<span class="list-item__chev">' + icon('chevron', 18) + '</span></div>' +
      '<div class="list-item" data-act="go-consent"><span class="list-item__ico" style="background:var(--amber-50);color:var(--amber)">' + icon('shield', 20) + '</span>' +
        '<div class="list-item__body"><div class="list-item__title">Consent requests</div><div class="list-item__sub">' + (pending.length || 0) + ' pending · ' + (active.length || 0) + ' active</div></div>' +
        '<span class="list-item__chev">' + icon('chevron', 18) + '</span></div>' +
    '</div>' +

    (myPatients.length ? '<div class="section-title" style="display:flex;justify-content:space-between;align-items:center">Your patients' +
      '<button class="btn btn--ghost btn--sm" data-act="go-patients" style="min-height:32px;padding:4px 10px">See all</button></div>' +
      '<div class="list">' + myPatients.slice(0, 4).map(p => {
        const recs = Views_providerVisibleRecords(p.id);
        return '<div class="list-item" data-open-patient="' + esc(p.id) + '">' +
          '<span class="avatar">' + esc(initials(p.name)) + '</span>' +
          '<div class="list-item__body"><div class="list-item__title">' + esc(p.name) + '</div>' +
          '<div class="list-item__sub">' + age(p.dob) + ' yrs · ' + esc(p.gender) + ' · ' + esc(p.bloodGroup) + '</div>' +
          '<div class="list-item__meta">' + recs.length + ' accessible record(s)</div></div>' +
          '<span class="list-item__chev">' + icon('chevron', 18) + '</span></div>';
      }).join('') + '</div>' : '') +
  '</div>';
};

function Views_providerVisibleRecords(pid) {
  const pv = App.currentProvider();
  if (!pv) return [];
  const c = Store.state.consents.find(x => x.patientId === pid && x.providerId === pv.id && x.status === 'active' && (!x.expiresAt || new Date(x.expiresAt) > new Date()));
  if (!c) return [];
  return Store.recordsFor(pid).filter(r => c.recordTypes.includes(r.type));
}

function Views_providerActiveConsent(pid) {
  const pv = App.currentProvider();
  if (!pv) return null;
  return Store.state.consents.find(x => x.patientId === pid && x.providerId === pv.id && x.status === 'active' && (!x.expiresAt || new Date(x.expiresAt) > new Date())) || null;
}

Screens.provider.lookup = function () {
  const f = App.filters.lookup || { q: '', results: null, searched: false };
  return '<div class="screen">' +
    '<div class="search-wrap" style="margin-bottom:10px">' + icon('search', 18) +
      '<input class="input" id="lk-input" placeholder="MedVault ID, ABHA, name or phone" value="' + esc(f.q) + '" /></div>' +
    '<div style="display:flex;gap:8px;margin-bottom:16px">' +
      '<button class="btn btn--primary" id="lk-btn" style="flex:1">' + icon('search', 16) + ' Search</button>' +
    '</div>' +
    '<div class="row" style="gap:6px;margin-bottom:16px">' +
      '<button class="chip" data-try="MV-1001">MV-1001</button>' +
      '<button class="chip" data-try="Priya">Priya</button>' +
      '<button class="chip" data-try="MV-1003">MV-1003</button>' +
    '</div>' +

    (!f.searched ? emptyState('Search a patient', 'Enter a MedVault ID, ABHA number, name or phone number.')
      : f.results && f.results.length ? '<div class="list">' + f.results.map(p => {
        const c = Views_providerActiveConsent(p.id);
        return '<div class="list-item" data-lookup-patient="' + esc(p.id) + '">' +
          '<span class="avatar">' + esc(initials(p.name)) + '</span>' +
          '<div class="list-item__body"><div class="list-item__title">' + esc(p.name) + '</div>' +
          '<div class="list-item__sub">' + age(p.dob) + ' yrs · ' + esc(p.gender) + ' · <span style="color:var(--red);font-weight:600">' + esc(p.bloodGroup) + '</span></div>' +
          '<div class="list-item__meta mono">' + esc(p.medvaultId) + '</div></div>' +
          (c ? '<span class="badge badge--teal" style="align-self:center">' + icon('check', 11) + ' Access</span>' : '<span class="badge badge--amber" style="align-self:center">No consent</span>') +
        '</div>';
      }).join('') + '</div>'
      : emptyState('No matching patient', 'No record matches "' + esc(f.q) + '".')) +
  '</div>';
};

Screens.provider.assisted = function () {
  const w = App.wizard;
  const pv = App.currentProvider();
  const fac = pv ? Store.facility(pv.facilityId) : null;

  const stepsBar = (active) => ['Verify', 'Resolve', 'Upload', 'Organize', 'Notify', 'Done'].map((s, i) => {
    const n = i + 1;
    const cls = n === active ? 'is-active' : n < active ? 'is-done' : '';
    return '<div class="step ' + cls + '">' + n + ' ' + esc(s) + '</div>';
  }).join('');

  if (!w) {
    return '<div class="screen">' +
      '<div class="alert alert--info" style="margin-bottom:16px">' + icon('users', 19) +
        '<div><strong>Why it matters.</strong> An elderly patient does not need to open the app, photograph every document, remember a password or understand how to upload a PDF. The facility generates the record once and securely associates it with the right patient.</div></div>' +
      '<div style="display:flex;flex-direction:column;gap:11px;margin-bottom:20px">' +
        [
          ['1', 'Verify', 'An authorised facility verifies the patient\'s identity.'],
          ['2', 'Resolve ID', 'Verified identity is associated with the MedVault / ABHA-linked record.'],
          ['3', 'Upload', 'The hospital sends notes, prescriptions, reports or summaries.'],
          ['4', 'Organize', 'MedVault classifies the records into the timeline.'],
          ['5', 'Notify', 'The patient or caregiver is informed.'],
          ['6', 'Audit', 'Access and updates are logged for accountability.']
        ].map(s => '<div style="padding:14px;border:1px solid var(--border);border-radius:12px;background:var(--surface)">' +
          '<div style="display:flex;gap:11px;align-items:flex-start">' +
            '<div style="width:28px;height:28px;border-radius:9px;background:var(--indigo);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;flex:0 0 auto">' + s[0] + '</div>' +
            '<div><div style="font-weight:700;font-size:14px;margin-bottom:3px">' + esc(s[1]) + '</div>' +
            '<div class="small muted" style="line-height:1.5">' + esc(s[2]) + '</div></div></div></div>').join('') +
      '</div>' +
      '<button class="btn btn--primary btn--lg btn--block" data-act="start-wizard">' + icon('link', 18) + ' Start assisted linking</button>' +
      '<div class="section-title">Identity, Aadhaar & ABHA</div>' +
      '<div class="alert alert--warn">' + icon('alert', 19) +
        '<div><strong>Important privacy boundary.</strong> Aadhaar is never a source from which MedVault retrieves biometric data or medical history. Where legally permitted, an approved Aadhaar authentication workflow may be used to <em>establish identity</em> — which is then used to locate the MedVault / ABHA-linked health profile.</div></div>' +
    '</div>';
  }

  if (w.step === 1) {
    return '<div class="screen">' +
      '<div class="steps">' + stepsBar(1) + '</div>' +
      '<div class="alert alert--info" style="margin-bottom:16px">' + icon('lock', 18) +
        '<div>Identity verification answers <strong>who the patient is</strong>. It does not retrieve medical history.</div></div>' +
      '<form id="w1" novalidate>' +
        '<div class="field"><label for="w1-name">Patient name (as on ID) <span class="req">*</span></label><input class="input" id="w1-name" placeholder="e.g. Atulya Verma" /><div class="err hidden" id="e-w1-name"></div></div>' +
        '<div class="field"><label for="w1-type">Identity document <span class="req">*</span></label><select class="select" id="w1-type">' +
          '<option value="">Select…</option><option>Aadhaar (approved authentication)</option><option>ABHA number</option><option>MedVault Medical ID</option><option>Passport</option><option>Voter ID</option>' +
        '</select><div class="err hidden" id="e-w1-type"></div></div>' +
        '<div class="field"><label for="w1-idnum">Identifier value <span class="req">*</span></label><input class="input mono" id="w1-idnum" placeholder="e.g. MV-1001" /><div class="err hidden" id="e-w1-idnum"></div></div>' +
        '<div class="field"><label for="w1-method">Verification method <span class="req">*</span></label><select class="select" id="w1-method">' +
          '<option value="">Select…</option><option>Biometric authentication at facility</option><option>OTP to registered mobile</option><option>Photo ID verification by authorised staff</option><option>Existing MedVault ID card presented</option>' +
        '</select><div class="err hidden" id="e-w1-method"></div></div>' +
        '<label class="check is-on" style="margin-bottom:16px"><input type="checkbox" id="w1-attest" checked />' +
          '<span>I confirm this verification was performed in person using an approved mechanism.<small>Recorded in the audit trail.</small></span></label>' +
      '</form>' +
      '<div style="display:flex;gap:10px">' +
        '<button class="btn" data-act="cancel-wizard" style="flex:1">Cancel</button>' +
        '<button class="btn btn--primary" id="w1-next" style="flex:2">Verify identity</button>' +
      '</div>' +
    '</div>';
  }

  if (w.step === 2) {
    const p = w.patient;
    return '<div class="screen">' +
      '<div class="steps">' + stepsBar(2) + '</div>' +
      '<div class="alert alert--success" style="margin-bottom:16px">' + icon('check', 18) +
        '<div><strong>Identity verified.</strong> ' + esc(w.verify.name) + ' verified via ' + esc(w.verify.method) + '.</div></div>' +
      '<div class="card" style="margin-bottom:16px"><div class="card__body">' +
        '<div style="display:flex;gap:13px;align-items:center">' +
          '<div class="avatar avatar--lg">' + esc(initials(p.name)) + '</div>' +
          '<div style="flex:1;min-width:0"><div style="font-weight:800;font-size:17px;letter-spacing:-.02em">' + esc(p.name) + '</div>' +
            '<div class="small muted">' + esc(p.gender) + ' · ' + age(p.dob) + ' yrs · ' + esc(p.bloodGroup) + '</div>' +
            '<div class="row" style="gap:6px;margin-top:7px"><span class="badge badge--indigo mono">' + esc(p.medvaultId) + '</span></div></div>' +
          '<div style="text-align:right"><div class="tiny muted">Existing</div><div style="font-weight:800;font-size:20px">' + Store.recordsFor(p.id).length + '</div></div>' +
        '</div>' +
        '<div class="divider"></div>' +
        '<div style="font-size:13.5px;line-height:1.7">' +
          '<div><span class="muted">Allergies:</span> ' + (p.allergies.map(esc).join(', ') || '—') + '</div>' +
          '<div><span class="muted">Conditions:</span> ' + (p.conditions.map(esc).join(', ') || '—') + '</div>' +
          '<div><span class="muted">Emergency:</span> ' + esc(p.emergencyContact.name) + ' · ' + esc(p.emergencyContact.phone) + '</div>' +
        '</div>' +
      '</div></div>' +
      '<div class="alert alert--warn" style="margin-bottom:16px">' + icon('alert', 18) +
        '<div>Confirm this is the correct patient. Linking records to the wrong person is a serious safety event and is fully logged.</div></div>' +
      '<div style="display:flex;gap:10px">' +
        '<button class="btn" data-act="wizard-back" style="flex:1">Back</button>' +
        '<button class="btn btn--primary" id="w2-confirm" style="flex:2">Yes, this is the patient</button>' +
      '</div>' +
    '</div>';
  }

  if (w.step === 3) {
    return '<div class="screen">' +
      '<div class="steps">' + stepsBar(3) + '</div>' +
      '<div class="alert alert--info" style="margin-bottom:16px">' + icon('building', 18) +
        '<div>Linking to <strong>' + esc(w.patient.name) + '</strong> · ' + esc(fac ? fac.name : '') + '</div></div>' +
      '<div class="dropzone" id="wz-dz" style="margin-bottom:16px">' + icon('upload', 28) +
        '<div style="font-weight:600;margin-top:11px;font-size:14.5px">Choose a file</div>' +
        '<div class="small muted" style="margin-top:4px">Photos are read with OCR · PDFs are saved without OCR · 10 MB max</div>' +
        '<input type="file" id="wz-file" style="display:none" accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,image/*" /></div>' +
      '<div class="section-title">Or use a sample <span class="muted" style="font-weight:500;text-transform:none;letter-spacing:0">(simulated extraction)</span></div>' +
      '<div style="display:flex;flex-direction:column;gap:9px">' +
        OCR.samples.map((s, i) => '<button class="btn" data-wsample="' + i + '" style="justify-content:flex-start;text-align:left;padding:12px 14px">' +
          '<span class="record-ico record-ico--' + ((RECORD_TYPES[s.type] || {}).cls || 'prescription') + '" style="width:34px;height:34px">' + icon('file', 17) + '</span>' +
          '<span style="flex:1"><span style="display:block;font-weight:600;font-size:13.5px">' + esc(s.label) + '</span></span>' + icon('chevron', 16) + '</button>').join('') +
      '</div>' +
      '<button class="btn btn--block" data-act="wizard-back" style="margin-top:20px">Back</button>' +
    '</div>';
  }

  if (w.step === 4) {
    return '<div class="screen">' +
      '<div class="steps">' + stepsBar(4) + '</div>' +
      '<div style="text-align:center;padding:40px 0">' +
      '<div class="spinner spinner--lg" style="margin:0 auto 20px"></div>' +
      '<div style="font-weight:600;font-size:15px" id="wz-stage">' + esc(w.stageText || 'Processing…') + '</div>' +
      '<div class="small muted" style="margin-top:5px">' + esc(w.fileName || '') + '</div>' +
      '<div class="progress" style="margin-top:22px;max-width:280px;margin-left:auto;margin-right:auto"><div class="progress__bar" id="wz-bar" style="width:' + (w.progress || 0) + '%"></div></div></div>' +
    '</div>';
  }

  if (w.step === 5) {
    return '<div class="screen">' +
      '<div class="steps">' + stepsBar(5) + '</div>' +
      OCRReview.fields('w5r', w.ocr, { noTitle: true, facility: fac ? fac.name + ', ' + fac.city : '', doctor: (App.currentProvider() || {}).name || '' }) +
      '<div class="section-title">Notify</div>' +
      '<div style="display:flex;flex-direction:column;gap:9px;margin-bottom:16px">' +
        '<label class="check is-on"><input type="checkbox" id="w5-patient" checked />' +
          '<span>Notify patient<small>' + esc(w.patient.name) + '</small></span></label>' +
        Store.caregiversFor(w.patient.id).map(cg => '<label class="check is-on"><input type="checkbox" id="w5-cg-' + esc(cg.id) + '" checked />' +
          '<span>Notify caregiver — ' + esc(cg.name) + '<small>' + esc(cg.relation) + '</small></span></label>').join('') +
      '</div>' +
      '<div style="display:flex;gap:10px">' +
        '<button class="btn" data-act="wizard-back" style="flex:1">Back</button>' +
        '<button class="btn btn--primary" id="w5-confirm" style="flex:2" disabled>Save & notify</button>' +
      '</div>' +
    '</div>';
  }

  if (w.step === 6) {
    return '<div class="screen">' +
      '<div class="steps">' + stepsBar(6) + '</div>' +
      '<div style="text-align:center;padding:30px 0">' +
        '<div style="width:68px;height:68px;border-radius:50%;background:var(--teal-50);color:var(--teal);display:flex;align-items:center;justify-content:center;margin:0 auto 18px">' + icon('check', 32) + '</div>' +
        '<h2 style="font-size:20px">Record linked</h2>' +
        '<p class="muted small" style="margin-top:6px">The document is on the timeline and the patient has been notified.</p>' +
      '</div>' +
      '<div class="card" style="margin-bottom:16px"><div class="card__body">' +
        '<dl class="kv">' +
          '<div><dt>Patient</dt><dd>' + esc(w.patient.name) + ' · <span class="mono">' + esc(w.patient.medvaultId) + '</span></dd></div>' +
          '<div><dt>Document</dt><dd>' + esc(w.fileName) + '</dd></div>' +
          '<div><dt>Classification</dt><dd>' + esc((RECORD_TYPES[w.type] || {}).label || w.type) + '</dd></div>' +
          '<div><dt>Verified by</dt><dd>' + esc(w.verify.name) + ' · ' + esc(w.verify.method) + '</dd></div>' +
          '<div><dt>Record ID</dt><dd class="mono">' + esc(w.recordId) + '</dd></div>' +
          '<div><dt>Linked at</dt><dd>' + esc(fmtDateTime(w.completedAt)) + '</dd></div>' +
        '</dl>' +
      '</div></div>' +
      '<div class="alert alert--success" style="margin-bottom:16px">' + icon('check', 18) +
        '<div><strong>Audit entry created.</strong> This access and record update is recorded.</div></div>' +
      '<div style="display:flex;gap:10px">' +
        '<button class="btn" data-act="wizard-done" style="flex:1">Done</button>' +
        '<button class="btn btn--primary" data-act="wizard-new" style="flex:1">Link another</button>' +
      '</div>' +
    '</div>';
  }
  return '<div class="screen">' + emptyState('Unexpected state', '') + '</div>';
};

function rowKV(k, v) {
  return '<tr><td style="padding:11px 15px;border-bottom:1px solid var(--border);color:var(--muted);font-weight:500;width:100px;font-size:12px;text-transform:uppercase;letter-spacing:.04em">' + esc(k) + '</td>' +
    '<td style="padding:11px 15px;border-bottom:1px solid var(--border);font-weight:600">' + esc(v) + '</td></tr>';
}

Screens.provider.patients = function () {
  const pv = App.currentProvider();
  const active = Store.state.consents.filter(c => c.providerId === pv.id && c.status === 'active');
  const pts = active.map(c => ({ c, p: Store.patient(c.patientId) })).filter(x => x.p);
  return '<div class="screen">' +
    (pts.length ? pts.map(x => {
      const recs = Views_providerVisibleRecords(x.p.id);
      const total = Store.recordsFor(x.p.id).length;
      const hidden = total - recs.length;
      return '<div class="card" style="margin-bottom:12px"><div class="card__body">' +
        '<div style="display:flex;gap:13px;align-items:center;margin-bottom:12px">' +
          '<div class="avatar avatar--lg">' + esc(initials(x.p.name)) + '</div>' +
          '<div style="flex:1;min-width:0"><div style="font-weight:700;font-size:16px">' + esc(x.p.name) + '</div>' +
            '<div class="small muted">' + age(x.p.dob) + ' yrs · ' + esc(x.p.gender) + ' · <span style="color:var(--red);font-weight:600">' + esc(x.p.bloodGroup) + '</span></div>' +
            '<div class="tiny muted mono" style="margin-top:3px">' + esc(x.p.medvaultId) + '</div></div>' +
        '</div>' +
        '<div style="display:flex;gap:18px;font-size:13px;margin-bottom:12px">' +
          '<div><div class="tiny muted">Accessible</div><div style="font-weight:700;font-size:17px">' + recs.length + '<span class="tiny muted" style="font-weight:500"> / ' + total + '</span></div></div>' +
          '<div><div class="tiny muted">Expires</div><div style="font-weight:600;font-size:13px;margin-top:3px">' + esc(fmtDate(x.c.expiresAt)) + '</div></div>' +
        '</div>' +
        (hidden > 0 ? '<div class="alert alert--warn" style="padding:9px 12px;font-size:12px;margin-bottom:12px">' + icon('lock', 15) + '<div>' + hidden + ' record(s) outside your consent scope are hidden.</div></div>' : '') +
        '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:14px">' +
          x.c.recordTypes.slice(0, 4).map(t => '<span class="tag">' + esc((RECORD_TYPES[t] || { label: t }).label) + '</span>').join('') +
          (x.c.recordTypes.length > 4 ? '<span class="tag">+' + (x.c.recordTypes.length - 4) + '</span>' : '') +
        '</div>' +
        '<button class="btn btn--primary btn--block" data-open-patient="' + esc(x.p.id) + '">' + icon('records', 16) + ' Open record</button>' +
      '</div></div>';
    }).join('')
      : emptyState('No patients yet', 'Request consent or use assisted record linking to connect a patient record.')) +
  '</div>';
};

Screens.provider.consent = function () {
  const pv = App.currentProvider();
  const mine = Store.state.consents.filter(c => c.providerId === pv.id);
  const pending = mine.filter(c => c.status === 'pending');
  const active = mine.filter(c => c.status === 'active');

  const row = c => {
    const p = Store.patient(c.patientId);
    return '<div class="card" style="margin-bottom:11px"><div class="card__body">' +
      '<div style="display:flex;gap:12px;align-items:flex-start">' +
        '<div class="avatar">' + esc(initials(p ? p.name : '?')) + '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-weight:700;font-size:14.5px">' + esc(p ? p.name : 'Unknown') + '</div>' +
          '<div class="small muted mono" style="margin-top:2px">' + esc(p ? p.medvaultId : '') + '</div>' +
          '<div class="small" style="margin-top:8px"><strong>Purpose:</strong> ' + esc(c.purpose) + '</div>' +
          '<div style="margin-top:9px;display:flex;gap:5px;flex-wrap:wrap">' +
            c.recordTypes.map(t => '<span class="tag">' + esc((RECORD_TYPES[t] || { label: t }).label) + '</span>').join('') +
          '</div>' +
          '<div class="tiny muted" style="margin-top:9px">' +
            (c.status === 'pending' ? 'Requested ' + esc(timeAgo(c.grantedAt)) : 'Granted ' + esc(fmtDate(c.grantedAt))) +
          '</div>' +
        '</div>' +
        '<div>' + badgeFor(c.status) + '</div>' +
      '</div>' +
      (c.status === 'active' ? '<button class="btn btn--primary btn--sm btn--block" data-open-patient="' + esc(c.patientId) + '" style="margin-top:12px">Open record</button>' : '') +
    '</div></div>';
  };

  return '<div class="screen">' +
    '<button class="btn btn--primary btn--block" data-act="new-request" style="margin-bottom:18px">' + icon('plus', 17) + ' New consent request</button>' +
    (pending.length ? '<div class="section-title" style="margin-top:0">Pending</div>' + pending.map(row).join('') : '') +
    '<div class="section-title">Active</div>' +
    (active.length ? active.map(row).join('') : '<div class="card"><div class="card__body"><p class="small muted">No active consents.</p></div></div>') +
  '</div>';
};

Screens.provider.record = function () {
  const pid = App.activePatientId();
  const p = Store.patient(pid);
  if (!p) return '<div class="screen">' + emptyState('No patient selected', '') + '</div>';
  const c = Views_providerActiveConsent(pid);
  const visible = Views_providerVisibleRecords(pid);
  const total = Store.recordsFor(pid).length;
  const hidden = total - visible.length;

  if (!c) {
    return '<div class="screen">' +
      '<div class="card" style="margin-bottom:16px"><div class="card__body" style="text-align:center;padding:30px 16px">' +
        '<div class="empty__ico" style="margin:0 auto 16px">' + icon('lock', 26) + '</div>' +
        '<div style="font-weight:700;font-size:16px;margin-bottom:6px">No active consent</div>' +
        '<p class="small muted" style="margin-bottom:18px">You do not currently have consent to view ' + esc(p.name) + "'s records.</p>" +
        '<button class="btn btn--primary btn--block" data-act="request-consent">' + icon('shield', 16) + ' Request access</button>' +
      '</div></div>' +
    '</div>';
  }

  return '<div class="screen">' +
    '<div class="card" style="margin-bottom:14px"><div class="card__body">' +
      '<div style="display:flex;gap:13px;align-items:center;margin-bottom:12px">' +
        '<div class="avatar avatar--lg">' + esc(initials(p.name)) + '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-weight:700;font-size:17px">' + esc(p.name) + '</div>' +
          '<div class="small muted">' + age(p.dob) + ' yrs · ' + esc(p.gender) + ' · ' + esc(p.bloodGroup) + '</div>' +
          '<div class="tiny muted mono" style="margin-top:3px">' + esc(p.medvaultId) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="alert alert--success" style="padding:10px 13px;font-size:12.5px">' + icon('shield', 16) +
        '<div>Scoped access · expires ' + esc(fmtDate(c.expiresAt)) + (hidden > 0 ? ' · <strong>' + hidden + ' record(s) hidden</strong>' : '') + '</div></div>' +
    '</div></div>' +

    '<button class="btn btn--primary btn--block" data-act="provider-assistant" style="margin-bottom:16px">' + icon('sparkle', 17) + ' Ask about accessible records</button>' +

    '<div class="section-title" style="margin-top:0">Critical information</div>' +
    '<div class="card" style="margin-bottom:16px"><div class="card__body">' +
      '<dl class="kv">' +
        '<div><dt>Allergies</dt><dd>' + (p.allergies.length ? p.allergies.map(x => '<span class="tag" style="background:var(--red-50);color:#b91c1c;margin-right:4px">' + esc(x) + '</span>').join('') : '<span class="muted">None recorded</span>') + '</dd></div>' +
        '<div><dt>Conditions</dt><dd>' + (p.conditions.map(esc).join(', ') || '—') + '</dd></div>' +
        '<div><dt>Medications</dt><dd>' + (p.medications.map(esc).join('<br>') || '—') + '</dd></div>' +
      '</dl>' +
    '</div></div>' +

    '<div class="section-title">Accessible records (' + visible.length + ')</div>' +
    (visible.length ? '<div class="list">' + visible.map(r => recordRowHTML(r)).join('') + '</div>'
      : emptyState('No accessible records', 'No records of the consented types exist yet.')) +

    '<button class="btn btn--primary btn--block" data-act="provider-upload" style="margin-top:18px">' + icon('upload', 17) + ' Add record to this patient</button>' +
  '</div>';
};

Screens.provider.profile = function () {
  const pv = App.currentProvider();
  const u = App.currentUser();
  const fac = pv ? Store.facility(pv.facilityId) : null;
  return '<div class="screen">' +
    '<div style="text-align:center;padding:8px 0 22px">' +
      '<div class="avatar avatar--lg" style="margin:0 auto 14px">' + esc(initials(u.name)) + '</div>' +
      '<div style="font-weight:800;font-size:20px;letter-spacing:-.02em">' + esc(pv ? pv.name : u.name) + '</div>' +
      '<div class="small muted" style="margin-top:4px">' + esc(pv ? pv.specialty : '') + '</div>' +
    '</div>' +
    '<div class="card"><div class="card__body">' +
      '<dl class="kv">' +
        '<div><dt>Facility</dt><dd>' + esc(fac ? fac.name + ', ' + fac.city : '—') + '</dd></div>' +
        '<div><dt>Registration no.</dt><dd class="mono">' + esc(pv ? pv.regNo : '—') + '</dd></div>' +
        '<div><dt>Email</dt><dd>' + esc(u.email) + '</dd></div>' +
      '</dl>' +
    '</div></div>' +
    '<div class="section-title">Activity</div>' +
    '<div class="list">' +
      '<div class="list-item" data-act="go-audit"><span class="list-item__ico" style="background:var(--amber-50);color:var(--amber)">' + icon('scroll', 20) + '</span>' +
        '<div class="list-item__body"><div class="list-item__title">Your activity log</div><div class="list-item__sub">Every record you viewed or uploaded</div></div>' +
        '<span class="list-item__chev">' + icon('chevron', 18) + '</span></div>' +
    '</div>' +
  '</div>';
};

Screens.provider.audit = function () {
  const pv = App.currentProvider();
  const all = Store.state.audit.filter(a => a.actor === pv.name).sort((a, b) => new Date(b.ts) - new Date(a.ts));
  return '<div class="screen">' +
    (all.length ? '<div class="list">' + all.map(a => {
      const p = a.patientId ? Store.patient(a.patientId) : null;
      return '<div class="list-item" style="cursor:default">' +
        '<span class="list-item__ico" style="background:var(--indigo-50);color:var(--indigo)">' + icon('activity', 18) + '</span>' +
        '<div class="list-item__body"><div class="list-item__title" style="font-size:13.5px">' + esc(a.action) + '</div>' +
        '<div class="list-item__sub" style="white-space:normal">' + esc(a.detail) + '</div>' +
        '<div class="list-item__meta">' + (p ? esc(p.name) + ' · ' : '') + esc(timeAgo(a.ts)) + '</div></div></div>';
    }).join('') + '</div>'
      : emptyState('No activity', 'Your record views and uploads will appear here.')) +
  '</div>';
};

Screens.provider.bind = {
  home: bindProviderHome,
  lookup: bindProviderLookup,
  assisted: bindProviderAssisted,
  patients: bindProviderPatients,
  profile: bindProviderProfile,
  consent: bindProviderConsent,
  record: bindProviderRecord,
  audit: function () {}
};

function bindProviderHome(root) {
  $$('[data-act]', root).forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.act;
    if (a === 'go-assisted') App.go('assisted');
    if (a === 'go-lookup') App.go('lookup');
    if (a === 'go-consent') App.go('consent');
    if (a === 'go-patients') App.go('patients');
  }));
  $$('[data-open-patient]', root).forEach(b => b.addEventListener('click', () => openProviderPatient(b.dataset.openPatient)));
}

function bindProviderLookup(root) {
  const doSearch = () => {
    const q = ($('#lk-input', root).value || '').trim();
    if (!q) { Toast.warn('Enter a search term', ''); return; }
    const ql = q.toLowerCase();
    const found = Store.state.patients.filter(p =>
      p.medvaultId.toLowerCase().includes(ql) ||
      p.abhaId.toLowerCase().includes(ql) ||
      p.name.toLowerCase().includes(ql) ||
      (p.phone || '').toLowerCase().includes(ql)
    );
    App.filters.lookup = { q, results: found, searched: true };
    audit('PATIENT_SEARCH', { detail: 'Searched "' + q + '" — ' + found.length + ' result(s)' });
    App.renderBody();
  };
  $('#lk-btn', root).addEventListener('click', doSearch);
  const inp = $('#lk-input', root);
  if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } });
  $$('[data-try]', root).forEach(b => b.addEventListener('click', () => { $('#lk-input', root).value = b.dataset.try; doSearch(); }));
  $$('[data-lookup-patient]', root).forEach(b => b.addEventListener('click', () => openProviderPatient(b.dataset.lookupPatient)));
}

function openProviderPatient(pid) {
  App.actingPatientId = pid;
  audit('RECORD_VIEWED', { patientId: pid, detail: 'Opened patient record (scoped by active consent)' });
  App.go('record');
}

function bindProviderPatients(root) {
  $$('[data-open-patient]', root).forEach(b => b.addEventListener('click', () => openProviderPatient(b.dataset.openPatient)));
}

function bindProviderProfile(root) {
  $$('[data-act]', root).forEach(b => b.addEventListener('click', () => {
    if (b.dataset.act === 'go-audit') App.go('audit');
  }));
}

function bindProviderConsent(root) {
  $$('[data-act]', root).forEach(b => b.addEventListener('click', () => {
    if (b.dataset.act === 'new-request') openConsentRequest();
  }));
  $$('[data-open-patient]', root).forEach(b => b.addEventListener('click', () => openProviderPatient(b.dataset.openPatient)));
}

function bindProviderRecord(root) {
  $$('[data-act]', root).forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.act;
    if (a === 'request-consent') openConsentRequest(App.activePatientId());
    if (a === 'provider-upload') openProviderUpload();
    if (a === 'provider-assistant') App.go('assistant');
  }));
  $$('[data-record]', root).forEach(el => el.addEventListener('click', () => openRecordView(el.dataset.record)));
}

function bindProviderAssisted(root) {
  $$('[data-act]', root).forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.act;
    if (a === 'start-wizard') { App.wizard = { step: 1 }; App.renderBody(); }
    if (a === 'cancel-wizard') { App.wizard = null; App.render(); Toast.info('Cancelled', 'No records were linked.'); }
    if (a === 'wizard-back') { App.wizard.step = Math.max(1, App.wizard.step - 1); App.renderBody(); }
    if (a === 'wizard-done') { App.wizard = null; App.go('home'); }
    if (a === 'wizard-new') { App.wizard = { step: 1 }; App.renderBody(); }
  }));

  const w1 = $('#w1-next', root);
  if (w1) w1.addEventListener('click', () => {
    const showErr = (id, m) => { const el = $(id, root); if (m) { el.innerHTML = icon('alert', 13) + '<span>' + esc(m) + '</span>'; el.classList.remove('hidden'); } else el.classList.add('hidden'); };
    ['#e-w1-name', '#e-w1-type', '#e-w1-idnum', '#e-w1-method'].forEach(i => showErr(i, ''));
    const name = $('#w1-name', root).value.trim();
    const type = $('#w1-type', root).value;
    const idnum = $('#w1-idnum', root).value.trim();
    const method = $('#w1-method', root).value;
    const attest = $('#w1-attest', root).checked;
    let bad = false;
    if (!name) { showErr('#e-w1-name', 'Name required.'); bad = true; }
    if (!type) { showErr('#e-w1-type', 'Select document.'); bad = true; }
    if (!idnum) { showErr('#e-w1-idnum', 'Identifier required.'); bad = true; }
    if (!method) { showErr('#e-w1-method', 'Method required.'); bad = true; }
    if (!attest) { Toast.warn('Attestation required', ''); bad = true; }
    if (bad) return;

    w1.disabled = true; w1.innerHTML = '<span class="spinner spinner--white"></span> Verifying…';
    setTimeout(() => {
      const q = idnum.toLowerCase();
      let p = Store.state.patients.find(x => x.medvaultId.toLowerCase() === q || x.abhaId.toLowerCase() === q);
      if (!p) p = Store.state.patients.find(x => x.name.toLowerCase() === name.toLowerCase());
      if (!p) {
        w1.disabled = false; w1.textContent = 'Verify identity';
        showErr('#e-w1-idnum', 'No record found. Try MV-1001.');
        Toast.error('Not found', '');
        return;
      }
      App.wizard = { step: 2, verify: { name, type, idnum, method }, patient: p };
      App.renderBody();
    }, 650);
  });

  const w2 = $('#w2-confirm', root);
  if (w2) w2.addEventListener('click', () => { App.wizard.step = 3; App.renderBody(); });

  const dz = $('#wz-dz', root);
  if (dz) {
    const fi = $('#wz-file', root);
    dz.addEventListener('click', () => fi.click());
    fi.addEventListener('change', () => {
      const f = fi.files[0];
      if (!f) return;
      if (f.size > FileStore.MAX_BYTES) { Toast.error('File too large', 'Choose a file of 10 MB or less.'); fi.value = ''; return; }
      startWizardOcr({ file: f }, f.name);
    });
  }
  $$('[data-wsample]', root).forEach(b => b.addEventListener('click', () => {
    startWizardOcr({ sample: +b.dataset.wsample }, OCR.samples[+b.dataset.wsample].fileName);
  }));
  if (App.wizard && App.wizard.step === 5 && App.wizard.ocr) OCRReview.bind('w5r', root, $('#w5-confirm', root), App.wizard.ocr);

  function startWizardOcr(source, fileName) {
    const w = App.wizard;
    w.step = 4; w.fileName = fileName; w.progress = 0; w.stageText = 'Starting…';
    App.renderBody();
    OCR.process(source, (p, s) => {
      if (!App.wizard) return;
      App.wizard.progress = p; App.wizard.stageText = s;
      const bar = $('#wz-bar'), st = $('#wz-stage');
      if (bar) bar.style.width = p + '%';
      if (st) st.textContent = s;
    }).then(res => {
      if (!App.wizard) return;
      App.wizard.step = 5;
      App.wizard.ocr = res;
      App.wizard.extracted = res.extracted;
      App.wizard.raw = res.raw;
      App.wizard.type = res.type;
      App.wizard.size = res.size;
      App.renderBody();
    });
  }

  const w5 = $('#w5-confirm', root);
  if (w5) w5.addEventListener('click', () => {
    const w = App.wizard;
    const ex = OCRReview.read('w5r', root);
    w.type = ex.type || w.type;
    const pv = App.currentProvider();
    const fac = pv ? Store.facility(pv.facilityId) : null;
    const notifyPatient = $('#w5-patient', root).checked;
    const cgChecks = $$('[id^="w5-cg-"]', root).filter(c => c.checked);

    const rec = {
      id: uid('r'), patientId: w.patient.id, type: w.type,
      title: (RECORD_TYPES[w.type] || { label: 'Document' }).label + ' — ' + (ex.facility || (fac ? fac.name : 'Facility')),
      date: ex.date || todayISO(),
      facilityId: pv ? pv.facilityId : null,
      facilityName: ex.facility || (fac ? fac.name + ', ' + fac.city : 'Unknown facility'),
      extraction: { method: w.ocr && w.ocr.source === 'sample' ? 'sample' : w.ocr && w.ocr.ok ? 'ocr' : 'manual', confidence: w.ocr ? w.ocr.confidence : null, reviewedAt: nowISO() },
      doctor: ex.doctor || (pv ? pv.name : ''),
      source: 'provider-upload', fileName: w.fileName, size: w.size,
      summary: ex.diagnosis || 'Record linked via assisted workflow.',
      extracted: { diagnosis: ex.diagnosis || '', medications: ex.medications || [], results: ex.results || '', vitals: ex.vitals || '', advice: ex.advice || '' },
      tags: ['assisted-linking'], createdAt: nowISO()
    };
    Store.state.records.unshift(rec);
    if (w.ocr && w.ocr.file) attachOriginalFile(rec, w.ocr.file);
    if (notifyPatient) notify(w.patient.id, 'New record added', rec.title + ' was uploaded by ' + (fac ? fac.name : 'a facility') + '.', 'record');
    Store.save();
    audit('RECORD_UPLOADED', { patientId: w.patient.id, detail: 'Assisted linking · ' + rec.title });
    audit('PATIENT_NOTIFIED', { patientId: w.patient.id, detail: 'Notified patient and ' + cgChecks.length + ' caregiver(s)' });
    w.step = 6; w.recordId = rec.id; w.completedAt = nowISO();
    App.renderBody();
    Toast.success('Record linked', 'The patient has been notified.');
  });
}

function openConsentRequest(prePid) {
  const pid = prePid || App.activePatientId();
  const body = '<div class="alert alert--info" style="margin-bottom:16px">' + icon('shield', 18) +
    '<div>The patient or caregiver must approve this request before you can view records.</div></div>' +
    '<form id="rq" novalidate>' +
      '<div class="field"><label for="rq-patient">Patient <span class="req">*</span></label><select class="select" id="rq-patient">' +
        '<option value="">Select…</option>' +
        Store.state.patients.map(p => '<option value="' + p.id + '"' + (pid === p.id ? ' selected' : '') + '>' + esc(p.name + ' — ' + p.medvaultId) + '</option>').join('') +
      '</select><div class="err hidden" id="e-rq-patient"></div></div>' +
      '<div class="field"><label>Record types <span class="req">*</span></label>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px" id="rq-types">' +
          Object.keys(RECORD_TYPES).map(t => '<label class="check is-on"><input type="checkbox" value="' + t + '" checked /><span>' + esc(RECORD_TYPES[t].label) + '</span></label>').join('') +
        '</div><div class="err hidden" id="e-rq-types"></div></div>' +
      '<div class="field"><label for="rq-purpose">Clinical purpose <span class="req">*</span></label><input class="input" id="rq-purpose" placeholder="e.g. Cardiology opinion" /><div class="err hidden" id="e-rq-purpose"></div></div>' +
      '<div class="field"><label for="rq-duration">Duration</label><select class="select" id="rq-duration"><option value="30">30 days</option><option value="90" selected>90 days</option><option value="180">180 days</option></select></div>' +
    '</form>';

  const root = Sheet.open({
    title: 'Request access',
    body: body,
    footer: '<button class="btn" data-sheet-close>Cancel</button><button class="btn btn--primary" id="rq-submit">Send</button>'
  });

  $$('#rq-types .check input', root).forEach(i => i.addEventListener('change', () => i.closest('.check').classList.toggle('is-on', i.checked)));

  $('#rq-submit', root).addEventListener('click', () => {
    const showErr = (id, m) => { const el = $(id, root); if (m) { el.innerHTML = icon('alert', 13) + '<span>' + esc(m) + '</span>'; el.classList.remove('hidden'); } else el.classList.add('hidden'); };
    ['#e-rq-patient', '#e-rq-types', '#e-rq-purpose'].forEach(i => showErr(i, ''));
    const p = $('#rq-patient', root).value;
    const types = $$('#rq-types input:checked', root).map(i => i.value);
    const purpose = $('#rq-purpose', root).value.trim();
    let bad = false;
    if (!p) { showErr('#e-rq-patient', 'Select patient.'); bad = true; }
    if (!types.length) { showErr('#e-rq-types', 'Select at least one type.'); bad = true; }
    if (!purpose) { showErr('#e-rq-purpose', 'Purpose required.'); bad = true; }
    if (bad) return;

    const pv = App.currentProvider();
    const fac = pv ? Store.facility(pv.facilityId) : null;
    const days = parseInt($('#rq-duration', root).value, 10);
    const pt = Store.patient(p);
    Store.state.consents.unshift({
      id: uid('c'), patientId: p, providerId: pv.id, providerName: pv.name,
      facilityId: pv.facilityId, facilityName: fac ? fac.name + ', ' + fac.city : '',
      recordTypes: types, purpose, status: 'pending', grantedAt: nowISO(), expiresAt: daysFromNow(days), requestedBy: 'provider'
    });
    Store.save();
    notify(p, 'Record access request', pv.name + ' at ' + (fac ? fac.name : 'a facility') + ' requested access for: ' + purpose + '.', 'consent');
    audit('CONSENT_REQUESTED', { patientId: p, detail: pv.name + ' requested ' + types.length + ' type(s)' });
    Sheet.close();
    Toast.success('Request sent', pt.name + ' will be asked to approve.');
    App.renderBody();
  });
}

function openProviderUpload() {
  const pid = App.activePatientId();
  const p = Store.patient(pid);
  const c = Views_providerActiveConsent(pid);
  if (!c) { Toast.error('No consent', 'You cannot upload without an active consent.'); return; }

  let ocr = null, step = 1;

  const renderBody = () => {
    const b = $('#pv-body');
    if (!b) return;
    if (step === 1) {
      b.innerHTML = '<div class="steps"><div class="step is-active">1 Select</div><div class="step">2 Extract</div><div class="step">3 Review</div></div>' +
        '<div class="dropzone" id="pv-dz" style="margin-bottom:14px">' + icon('upload', 26) +
          '<div style="font-weight:600;margin-top:10px">Choose a file</div><div class="small muted" style="margin-top:4px">Photos are read with OCR · PDFs are saved without OCR · 10 MB max</div><input type="file" id="pv-fi" style="display:none" accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,image/*" /></div>' +
        '<div class="section-title">Or use a sample <span class="muted" style="font-weight:500;text-transform:none;letter-spacing:0">(simulated extraction)</span></div>' +
        '<div style="display:flex;flex-direction:column;gap:9px">' +
          OCR.samples.map((s, i) => '<button class="btn" data-ps="' + i + '" style="justify-content:flex-start;text-align:left;padding:12px 14px">' +
            '<span class="record-ico record-ico--' + ((RECORD_TYPES[s.type] || {}).cls || 'prescription') + '" style="width:32px;height:32px">' + icon('file', 16) + '</span>' +
            '<span style="flex:1"><span style="display:block;font-weight:600;font-size:13px">' + esc(s.label) + '</span></span>' + icon('chevron', 15) + '</button>').join('') +
        '</div>';
      const dz = $('#pv-dz', b), fi = $('#pv-fi', b);
      dz.addEventListener('click', () => fi.click());
      fi.addEventListener('change', () => {
        const f = fi.files[0];
        if (!f) return;
        if (f.size > FileStore.MAX_BYTES) { Toast.error('File too large', 'Choose a file of 10 MB or less.'); fi.value = ''; return; }
        run({ file: f });
      });
      $$('[data-ps]', b).forEach(btn => btn.addEventListener('click', () => run({ sample: +btn.dataset.ps })));
    } else if (step === 2) {
      b.innerHTML = '<div class="steps"><div class="step is-done">1 Select</div><div class="step is-active">2 Extract</div><div class="step">3 Review</div></div>' +
        '<div style="text-align:center;padding:26px 0"><div class="spinner spinner--lg" style="margin:0 auto 18px"></div>' +
        '<div style="font-weight:600" id="pv-stage">Processing…</div>' +
        '<div class="progress" style="margin-top:20px;max-width:280px;margin-left:auto;margin-right:auto"><div class="progress__bar" id="pv-bar" style="width:0%"></div></div></div>';
    } else {
      b.innerHTML = '<div class="steps"><div class="step is-done">1 Select</div><div class="step is-done">2 Extract</div><div class="step is-active">3 Review</div></div>' +
        OCRReview.fields('pv', ocr) +
        '<button class="btn btn--primary btn--block" id="pv-save">' + icon('check', 17) + ' Save record</button>';
      OCRReview.bind('pv', b, $('#pv-save', b), ocr);
      $('#pv-save').addEventListener('click', () => {
        const v = OCRReview.read('pv', b);
        const pv = App.currentProvider();
        const fac = pv ? Store.facility(pv.facilityId) : null;
        const rec = {
          id: uid('r'), patientId: pid, type: v.type || 'consultation-note',
          title: v.title || 'Untitled',
          date: v.date || todayISO(),
          facilityId: pv ? pv.facilityId : null,
          facilityName: v.facility || (fac ? fac.name + ', ' + fac.city : ''),
          doctor: v.doctor || (pv ? pv.name : ''),
          source: 'provider-upload', fileName: ocr.fileName, size: ocr.size,
          summary: v.diagnosis || 'Uploaded by provider.',
          extracted: { diagnosis: v.diagnosis, medications: v.medications, results: v.results, vitals: v.vitals, advice: v.advice },
          extraction: { method: ocr.source === 'sample' ? 'sample' : ocr.ok ? 'ocr' : 'manual', confidence: ocr.confidence, reviewedAt: nowISO() },
          tags: ['provider-upload'], createdAt: nowISO()
        };
        Store.state.records.unshift(rec);
        Store.save();
        if (ocr.file) attachOriginalFile(rec, ocr.file);
        notify(pid, 'New record added', rec.title + ' was uploaded by ' + (fac ? fac.name : 'your provider') + '.', 'record');
        audit('RECORD_UPLOADED', { patientId: pid, detail: 'Uploaded ' + rec.title });
        Sheet.close();
        Toast.success('Record saved', 'The patient has been notified.');
        App.renderBody();
      });
    }
  };

  function run(source) {
    step = 2; renderBody();
    OCR.process(source, (p, s) => {
      const bar = $('#pv-bar'), st = $('#pv-stage');
      if (bar) bar.style.width = p + '%';
      if (st) st.textContent = s;
    }).then(res => { ocr = res; step = 3; renderBody(); });
  }

  Sheet.open({ title: 'Add record to ' + p.name, body: '<div id="pv-body"></div>' });
  renderBody();
}
