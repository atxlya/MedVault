/* ============================================================
   screens-emergency.js — break-glass responder session screens
   ============================================================ */

Screens.emergency.emergency = function () {
  const pid = Session.data.patientId;
  const p = Store.patient(pid);
  if (!p) return '<div class="screen">' + emptyState('Record unavailable', '') + '</div>';
  const ev = Store.state.breakGlass.find(b => b.id === Session.data.eventId);
  const recent = Store.recordsFor(pid).filter(r => EMERGENCY_SCOPE.includes(r.type)).slice(0, 4);

  return '<div class="screen">' +
    '<div class="alert alert--danger" style="margin-bottom:16px">' + icon('alert', 20) +
      '<div><strong>Break-glass session.</strong> This access is scoped, ends at ' + esc(new Date(EmergencyAccess.sessionEndsAt(Session.data)).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })) + ' (30 minutes) and is recorded for review.</div></div>' +

    '<div class="card" style="border-color:#fecaca;border-width:2px;margin-bottom:14px"><div class="card__body">' +
      '<div style="display:flex;gap:14px;align-items:center;margin-bottom:14px">' +
        '<div style="width:64px;height:64px;border-radius:20px;background:linear-gradient(135deg,var(--red),#b91c1c);color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;flex:0 0 auto">' + esc(initials(p.name)) + '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:20px;font-weight:800;letter-spacing:-.025em">' + esc(p.name) + '</div>' +
          '<div class="small muted" style="margin-top:3px">' + esc(p.gender) + ' · ' + age(p.dob) + ' years · DOB ' + esc(fmtDate(p.dob)) + '</div>' +
          '<div class="mono tiny muted" style="margin-top:5px">' + esc(p.medvaultId) + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="text-align:center;padding:14px;background:var(--red-50);border:2px solid #fecaca;border-radius:14px">' +
        '<div class="tiny" style="font-weight:800;color:#991b1b;letter-spacing:.1em;text-transform:uppercase">Blood group</div>' +
        '<div style="font-size:34px;font-weight:900;color:var(--red);line-height:1.1;margin-top:4px">' + esc(p.bloodGroup) + '</div>' +
      '</div>' +
    '</div></div>' +

    '<div class="card" style="border-color:#fecaca;margin-bottom:12px"><div class="card__head" style="background:var(--red-50)"><h3 style="color:#991b1b">' + icon('alert', 17) + ' Allergies</h3></div>' +
      '<div class="card__body">' +
        (p.allergies.length && p.allergies[0] !== 'None known' ?
          '<div style="display:flex;flex-direction:column;gap:8px">' + p.allergies.map(a =>
            '<div style="padding:11px 14px;background:var(--red-50);border:1px solid #fecaca;border-radius:9px;font-weight:700;font-size:14.5px;color:#991b1b">' + esc(a) + '</div>').join('') + '</div>'
          : '<p class="muted small">No known drug allergies recorded.</p>') +
      '</div></div>' +

    '<div class="card" style="margin-bottom:12px"><div class="card__head"><h3>' + icon('activity', 17) + ' Chronic conditions</h3></div>' +
      '<div class="card__body">' +
        (p.conditions.length && p.conditions[0] !== 'None recorded' ?
          '<ul style="margin:0;padding-left:19px;font-size:14px;line-height:2">' + p.conditions.map(c => '<li>' + esc(c) + '</li>').join('') + '</ul>'
          : '<p class="muted small">None recorded.</p>') +
      '</div></div>' +

    '<div class="card" style="margin-bottom:12px"><div class="card__head"><h3>' + icon('records', 17) + ' Current medications</h3></div>' +
      '<div class="card__body">' +
        (p.medications.length && p.medications[0] !== 'None' ?
          '<ul style="margin:0;padding-left:19px;font-size:14px;line-height:2">' + p.medications.map(m => '<li>' + esc(m) + '</li>').join('') + '</ul>'
          : '<p class="muted small">None recorded.</p>') +
      '</div></div>' +

    '<div class="card" style="margin-bottom:12px"><div class="card__head"><h3>' + icon('phone', 17) + ' Emergency contact</h3></div>' +
      '<div class="card__body">' +
        '<div style="font-size:16px;font-weight:700">' + esc(p.emergencyContact.name) + '</div>' +
        '<div class="muted small" style="margin-top:3px">' + esc(p.emergencyContact.relation) + '</div>' +
        '<a href="tel:' + esc(p.emergencyContact.phone.replace(/\s/g, '')) + '" class="btn btn--primary btn--block" style="margin-top:12px">' + icon('phone', 16) + ' ' + esc(p.emergencyContact.phone) + '</a>' +
        '<div class="tiny muted" style="margin-top:12px">Organ donor: <strong>' + (p.organDonor ? 'Yes' : 'No') + '</strong></div>' +
      '</div></div>' +

    (recent.length ? '<div class="section-title">Recent clinically relevant records</div>' +
      '<div class="list">' + recent.map(r => {
        const t = RECORD_TYPES[r.type] || { label: r.type, cls: 'prescription', icon: 'file' };
        return '<div class="list-item" data-record="' + esc(r.id) + '">' +
          '<span class="record-ico record-ico--' + t.cls + '">' + icon(t.icon, 18) + '</span>' +
          '<div class="list-item__body"><div class="list-item__title">' + esc(r.title) + '</div>' +
          '<div class="list-item__sub">' + esc(r.facilityName) + ' · ' + esc(fmtDate(r.date)) + '</div>' +
          (r.extracted && r.extracted.diagnosis ? '<div class="list-item__meta" style="white-space:normal">Dx: ' + esc(r.extracted.diagnosis) + '</div>' : '') +
          '</div></div>';
      }).join('') + '</div>' : '') +

    '<button class="btn btn--primary btn--block" data-act="emergency-assistant" style="margin:16px 0">' + icon('sparkle', 17) + ' Ask about in-scope records</button>' +

    (ev ? '<div class="section-title">This access</div>' +
      '<div class="card"><div class="card__body">' +
        '<dl class="kv">' +
          '<div><dt>Responder</dt><dd>' + esc(ev.responderName) + '</dd></div>' +
          '<div><dt>Facility</dt><dd>' + esc(ev.facilityName) + '</dd></div>' +
          '<div><dt>Reason</dt><dd style="font-weight:500">' + esc(ev.reason) + '</dd></div>' +
          '<div><dt>Status</dt><dd>' + badgeFor(ev.status) + '</dd></div>' +
        '</dl>' +
        '<div class="alert alert--warn" style="margin-top:14px">' + icon('alert', 17) +
          '<div>This access will be reviewed by an administrator. The patient and their caregiver have been notified.</div></div>' +
      '</div></div>' : '') +
  '</div>';
};

Screens.emergency.profile = function () {
  const u = App.actor();
  return '<div class="screen">' +
    '<div class="card" style="border-color:#fecaca;margin-bottom:16px"><div class="card__body">' +
      '<div style="display:flex;gap:13px;align-items:center">' +
        '<span style="width:44px;height:44px;border-radius:13px;background:var(--red-50);color:var(--red);display:flex;align-items:center;justify-content:center;flex:0 0 auto">' + icon('alert', 22) + '</span>' +
        '<div style="flex:1;min-width:0"><div style="font-weight:700;font-size:15px">Break-glass session</div>' +
          '<div class="small muted">' + esc(u.name) + '</div></div>' +
      '</div>' +
      '<div class="divider"></div>' +
      '<dl class="kv">' +
        '<div><dt>Facility</dt><dd>' + esc(Session.data.facilityName || '—') + '</dd></div>' +
        '<div><dt>Session started</dt><dd>' + esc(fmtDateTime(Session.data.loginAt)) + '</dd></div>' +
        '<div><dt>Session ends</dt><dd>' + esc(fmtDateTime(new Date(EmergencyAccess.sessionEndsAt(Session.data)).toISOString())) + '</dd></div>' +
        '<div><dt>Patient ID</dt><dd class="mono">' + esc((Store.patient(Session.data.patientId) || {}).medvaultId || '—') + '</dd></div>' +
      '</dl>' +
    '</div></div>' +
    '<div class="alert alert--warn">' + icon('alert', 18) +
      '<div>This session ends automatically after 30 minutes and is scoped to clinically relevant information only. Full history is not exposed. Do not share this information outside the patient\'s care.</div></div>' +
    '<button class="btn btn--danger btn--block" data-act="logout" style="margin-top:16px">' + icon('logout', 16) + ' End session</button>' +
  '</div>';
};

Screens.emergency.timeline = function () {
  const pid = Session.data.patientId;
  const recs = Store.recordsFor(pid).filter(r => EMERGENCY_SCOPE.includes(r.type));
  return '<div class="screen">' +
    '<div class="alert alert--info" style="margin-bottom:16px">' + icon('lock', 17) +
      '<div>Only records clinically relevant to the emergency are shown. Full history is not exposed.</div></div>' +
    (recs.length ? '<div class="list">' + recs.map(r => recordRowHTML(r)).join('') + '</div>'
      : emptyState('No relevant records', '')) +
  '</div>';
};

Screens.emergency.bind = {
  emergency: function (root) {
    $$('[data-record]', root).forEach(el => el.addEventListener('click', () => openRecordView(el.dataset.record)));
    $$('[data-act="emergency-assistant"]', root).forEach(b => b.addEventListener('click', () => App.go('assistant')));
  },
  profile: function (root) {
    $$('[data-act="logout"]', root).forEach(b => b.addEventListener('click', async () => {
      const ok = await Sheet.confirm({ title: 'End session?', message: 'The emergency session will end and the audit record will be finalised.', okLabel: 'End session', danger: true });
      if (ok) App.logout();
    }));
  },
  timeline: function (root) {
    $$('[data-record]', root).forEach(el => el.addEventListener('click', () => openRecordView(el.dataset.record)));
  }
};
