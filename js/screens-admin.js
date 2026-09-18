/* ============================================================
   screens-admin.js — admin screens, bindings, review modal
   ============================================================ */

Screens.admin.home = function () {
  const db = Store.state;
  const roleCounts = db.users.reduce((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {});
  const pendingBG = db.breakGlass.filter(b => b.status === 'pending');
  const flaggedBG = db.breakGlass.filter(b => b.status === 'flagged');
  const activeConsents = db.consents.filter(c => c.status === 'active');
  const criticalEvents = db.audit.filter(a => a.severity === 'critical');

  const typeCounts = Object.keys(RECORD_TYPES).map(t => ({ label: RECORD_TYPES[t].label, n: db.records.filter(r => r.type === t).length })).sort((a, b) => b.n - a.n);
  const maxType = Math.max(1, ...typeCounts.map(t => t.n));

  return '<div class="screen">' +
    '<div class="greeting"><h1>Platform Overview</h1><p>Operational view across patients, providers and audit events.</p></div>' +

    (pendingBG.length || flaggedBG.length ? '<div class="alert alert--warn" style="margin-bottom:16px">' + icon('alert', 19) +
      '<div><strong>Action required.</strong> ' + pendingBG.length + ' break-glass event(s) pending' + (flaggedBG.length ? ' · ' + flaggedBG.length + ' flagged' : '') + '.</div></div>' : '') +

    '<div class="stats" style="margin-bottom:8px">' +
      '<div class="stat"><div class="stat__top"><span class="stat__label">Patients</span><span class="stat__ico">' + icon('users', 16) + '</span></div>' +
        '<div class="stat__val">' + db.patients.length + '</div><div class="stat__sub">' + db.records.length + ' records</div></div>' +
      '<div class="stat"><div class="stat__top"><span class="stat__label">Providers</span><span class="stat__ico teal">' + icon('shield', 16) + '</span></div>' +
        '<div class="stat__val">' + db.providers.length + '</div><div class="stat__sub">' + db.facilities.length + ' facilities</div></div>' +
      '<div class="stat"><div class="stat__top"><span class="stat__label">Consents</span><span class="stat__ico teal">' + icon('check', 16) + '</span></div>' +
        '<div class="stat__val">' + activeConsents.length + '</div><div class="stat__sub">active</div></div>' +
      '<div class="stat"><div class="stat__top"><span class="stat__label">Alerts</span><span class="stat__ico red">' + icon('alert', 16) + '</span></div>' +
        '<div class="stat__val">' + pendingBG.length + '</div><div class="stat__sub">' + criticalEvents.length + ' critical</div></div>' +
    '</div>' +

    '<div class="section-title">Records by type</div>' +
    '<div class="card"><div class="card__body">' +
      typeCounts.map(t => '<div class="bar-row">' +
        '<span class="nm">' + esc(t.label) + '</span>' +
        '<span class="bar-track"><span class="bar-fill" style="width:' + ((t.n / maxType) * 100) + '%"></span></span>' +
        '<span class="bar-val">' + t.n + '</span></div>').join('') +
    '</div></div>' +

    '<div class="section-title">Users by role</div>' +
    '<div class="card"><div class="card__body">' +
      ['patient', 'caregiver', 'provider', 'admin'].map(r => '<div class="bar-row">' +
        '<span class="nm">' + esc(roleLabel(r)) + '</span>' +
        '<span class="bar-track"><span class="bar-fill" style="width:' + (((roleCounts[r] || 0) / Math.max(1, db.users.length)) * 100) + '%"></span></span>' +
        '<span class="bar-val">' + (roleCounts[r] || 0) + '</span></div>').join('') +
    '</div></div>' +
  '</div>';
};

Screens.admin.users = function () {
  const f = App.filters.users || { role: 'all', q: '' };
  let users = Store.state.users.slice();
  if (f.role !== 'all') users = users.filter(u => u.role === f.role);
  if (f.q) { const q = f.q.toLowerCase(); users = users.filter(u => (u.name + ' ' + u.email).toLowerCase().includes(q)); }

  return '<div class="screen">' +
    '<div class="search-wrap" style="margin-bottom:12px">' + icon('search', 18) +
      '<input class="input" id="us-search" placeholder="Search by name or email…" value="' + esc(f.q) + '" /></div>' +
    '<div class="chips" style="margin-bottom:16px">' +
      '<button class="chip' + (f.role === 'all' ? ' is-on' : '') + '" data-us-role="all">All</button>' +
      ['patient', 'caregiver', 'provider', 'admin'].map(r => '<button class="chip' + (f.role === r ? ' is-on' : '') + '" data-us-role="' + r + '">' + esc(roleLabel(r)) + '</button>').join('') +
    '</div>' +
    (users.length ? '<div class="list">' + users.map(u => {
      let linked = '';
      if (u.role === 'patient' && u.patientId) { const p = Store.patient(u.patientId); linked = p ? p.name : ''; }
      if (u.role === 'caregiver') linked = (u.patientIds || []).map(id => (Store.patient(id) || {}).name).filter(Boolean).join(', ');
      if (u.role === 'provider' && u.providerId) { const pv = Store.provider(u.providerId); linked = pv ? pv.specialty : ''; }
      return '<div class="list-item" style="cursor:default">' +
        '<span class="avatar">' + esc(initials(u.name)) + '</span>' +
        '<div class="list-item__body"><div class="list-item__title">' + esc(u.name) + '</div>' +
        '<div class="list-item__sub">' + esc(u.email) + '</div>' +
        '<div class="list-item__meta">' + esc(roleLabel(u.role)) + (linked ? ' · ' + esc(linked) : '') + '</div></div>' +
        (u.role === 'admin' ? '' : '<button class="btn btn--sm ' + (u.active ? '' : 'btn--primary') + '" data-toggle-user="' + esc(u.id) + '">' + (u.active ? 'Deactivate' : 'Activate') + '</button>') +
      '</div>';
    }).join('') + '</div>'
      : emptyState('No users match', 'Try a different filter.')) +
  '</div>';
};

Screens.admin.breakglass = function () {
  const f = App.filters.bg || { status: 'all' };
  let events = Store.state.breakGlass.slice().sort((a, b) => new Date(b.ts) - new Date(a.ts));
  if (f.status !== 'all') events = events.filter(e => e.status === f.status);

  return '<div class="screen">' +
    '<div class="chips" style="margin-bottom:16px">' +
      ['all', 'pending', 'reviewed', 'flagged'].map(s => {
        const n = s === 'all' ? Store.state.breakGlass.length : Store.state.breakGlass.filter(e => e.status === s).length;
        return '<button class="chip' + (f.status === s ? ' is-on' : '') + '" data-bg-status="' + s + '">' + esc(s.charAt(0).toUpperCase() + s.slice(1)) + ' (' + n + ')</button>';
      }).join('') +
    '</div>' +

    (events.length ? events.map(e => {
      const p = Store.patient(e.patientId);
      const isPending = e.status === 'pending';
      return '<div class="card" style="margin-bottom:11px;' + (e.status === 'flagged' ? 'border-color:#fecaca;' : isPending ? 'border-color:#fde68a;' : '') + '"><div class="card__body">' +
        '<div class="row" style="gap:8px;margin-bottom:10px;flex-wrap:wrap">' +
          badgeFor(e.status) + '<span class="badge badge--red">' + icon('alert', 11) + ' Break-glass</span>' +
          '<span class="tiny muted" style="margin-left:auto">' + esc(timeAgo(e.ts)) + '</span>' +
        '</div>' +
        '<div style="font-weight:700;font-size:14.5px">' + esc(p ? p.name : 'Unknown') + ' <span class="mono tiny muted">' + esc(p ? p.medvaultId : '') + '</span></div>' +
        '<div class="small muted" style="margin-top:3px">' + esc(e.responderName) + ' · ' + esc(e.facilityName) + '</div>' +
        '<div style="margin-top:11px;padding:10px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:9px">' +
          '<div class="tiny" style="font-weight:700;color:var(--muted-2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px">Reason</div>' +
          '<div class="small">' + esc(e.reason) + '</div>' +
        '</div>' +
        '<div style="margin-top:10px">' +
          '<div class="tiny" style="font-weight:700;color:var(--muted-2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px">Scopes</div>' +
          '<div style="display:flex;gap:5px;flex-wrap:wrap">' + e.scopesAccessed.map(s => '<span class="tag">' + esc(scopeLabel(s)) + '</span>').join('') + '</div>' +
        '</div>' +
        (e.reviewedBy ? '<div class="alert alert--' + (e.status === 'flagged' ? 'danger' : 'success') + '" style="margin-top:11px;padding:9px 12px;font-size:12px">' + icon(e.status === 'flagged' ? 'alert' : 'check', 15) +
          '<div><strong>' + esc(e.reviewedBy) + '</strong> · ' + esc(e.reviewNote) + '</div></div>' : '') +
        (isPending ? '<div class="row" style="gap:8px;margin-top:12px">' +
          '<button class="btn btn--primary btn--sm" data-bg-review="' + esc(e.id) + '" style="flex:1">Review</button>' +
          '<button class="btn btn--danger btn--sm" data-bg-flag="' + esc(e.id) + '" style="flex:1">Flag</button>' +
        '</div>' : '') +
      '</div></div>';
    }).join('')
      : emptyState('No events', 'Break-glass events will appear here for review.')) +
  '</div>';
};

function scopeLabel(s) {
  return ({ bloodGroup: 'Blood group', allergies: 'Allergies', conditions: 'Conditions', medications: 'Medications', emergencyContact: 'Contact' })[s] || s;
}

Screens.admin.audit = function () {
  const f = App.filters.adminAudit || { q: '', sev: 'all' };
  let list = Store.state.audit.slice().sort((a, b) => new Date(b.ts) - new Date(a.ts));
  if (f.sev !== 'all') list = list.filter(a => a.severity === f.sev);
  if (f.q) { const q = f.q.toLowerCase(); list = list.filter(a => (a.actor + ' ' + a.action + ' ' + a.detail).toLowerCase().includes(q)); }

  return '<div class="screen">' +
    '<div class="search-wrap" style="margin-bottom:12px">' + icon('search', 18) +
      '<input class="input" id="ad-search" placeholder="Search events…" value="' + esc(f.q) + '" /></div>' +
    '<div class="chips" style="margin-bottom:16px">' +
      ['all', 'info', 'warning', 'critical'].map(s => '<button class="chip' + (f.sev === s ? ' is-on' : '') + '" data-ad-sev="' + s + '">' + esc(s.charAt(0).toUpperCase() + s.slice(1)) + '</button>').join('') +
    '</div>' +
    (list.length ? '<div class="list">' + list.slice(0, 80).map(a => {
      const p = a.patientId ? Store.patient(a.patientId) : null;
      const col = a.severity === 'critical' ? 'background:var(--red-50);color:#b91c1c' : a.severity === 'warning' ? 'background:var(--amber-50);color:#b45309' : 'background:var(--indigo-50);color:var(--indigo)';
      return '<div class="list-item" style="cursor:default">' +
        '<span class="list-item__ico" style="' + col + '">' + icon('activity', 18) + '</span>' +
        '<div class="list-item__body"><div class="list-item__title" style="font-size:13.5px">' + esc(a.action) + '</div>' +
        '<div class="list-item__sub" style="white-space:normal">' + esc(a.detail) + '</div>' +
        '<div class="list-item__meta">' + esc(a.actor) + ' · ' + esc(roleLabel(a.actorRole)) + (p ? ' · ' + esc(p.name) : '') + ' · ' + esc(timeAgo(a.ts)) + '</div></div></div>';
    }).join('') + '</div>'
      : emptyState('No events', 'Adjust filters to see more.')) +
  '</div>';
};

Screens.admin.profile = function () {
  const u = App.currentUser();
  return '<div class="screen">' +
    '<div style="text-align:center;padding:8px 0 22px">' +
      '<div class="avatar avatar--lg" style="margin:0 auto 14px">' + esc(initials(u.name)) + '</div>' +
      '<div style="font-weight:800;font-size:20px">' + esc(u.name) + '</div>' +
      '<div class="small muted" style="margin-top:4px">Platform Administrator</div>' +
    '</div>' +
    '<div class="card"><div class="card__body">' +
      '<dl class="kv">' +
        '<div><dt>Email</dt><dd>' + esc(u.email) + '</dd></div>' +
        '<div><dt>Account created</dt><dd>' + esc(fmtDate(u.createdAt)) + '</dd></div>' +
        '<div><dt>Role</dt><dd>Administrator</dd></div>' +
      '</dl>' +
    '</div></div>' +
  '</div>';
};

Screens.admin.facilities = function () {
  return '<div class="screen">' +
    '<div class="list">' + Store.state.facilities.map(f => {
      const n = Store.state.records.filter(r => r.facilityId === f.id || r.facilityName.includes(f.name)).length;
      return '<div class="list-item" style="cursor:default">' +
        '<span class="list-item__ico" style="background:var(--indigo-50);color:var(--indigo)">' + icon('building', 18) + '</span>' +
        '<div class="list-item__body"><div class="list-item__title">' + esc(f.name) + '</div>' +
        '<div class="list-item__sub">' + esc(f.type) + ' · ' + esc(f.city) + '</div>' +
        '<div class="list-item__meta">' + n + ' records' + (f.verified ? ' · <span style="color:var(--teal);font-weight:600">Verified</span>' : '') + '</div></div></div>';
    }).join('') + '</div>' +
  '</div>';
};

Screens.admin.bind = {
  home: function (root) {
    $$('[data-act]', root).forEach(b => b.addEventListener('click', () => {
      const a = b.dataset.act;
      if (a === 'go-breakglass') App.go('breakglass');
      if (a === 'go-audit') App.go('audit');
    }));
  },
  users: function (root) {
    const s = $('#us-search', root);
    if (s) s.addEventListener('input', debounce(() => {
      App.filters.users = Object.assign({ role: 'all', q: '' }, App.filters.users, { q: s.value });
      App.renderBody();
      const el = $('#us-search'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }, 300));
    $$('[data-us-role]', root).forEach(b => b.addEventListener('click', () => {
      App.filters.users = Object.assign({ role: 'all', q: '' }, App.filters.users, { role: b.dataset.usRole });
      App.renderBody();
    }));
    $$('[data-toggle-user]', root).forEach(b => b.addEventListener('click', () => {
      const u = Store.user(b.dataset.toggleUser);
      if (!u) return;
      u.active = !u.active;
      Store.save();
      audit(u.active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', { detail: u.name + ' ' + (u.active ? 'activated' : 'deactivated'), severity: 'warning' });
      Toast.success(u.active ? 'User activated' : 'Deactivated', u.name);
      App.renderBody();
    }));
  },
  breakglass: function (root) {
    $$('[data-bg-status]', root).forEach(b => b.addEventListener('click', () => {
      App.filters.bg = { status: b.dataset.bgStatus };
      App.renderBody();
    }));
    $$('[data-bg-review]', root).forEach(b => b.addEventListener('click', () => reviewBG(b.dataset.bgReview, 'reviewed')));
    $$('[data-bg-flag]', root).forEach(b => b.addEventListener('click', () => reviewBG(b.dataset.bgFlag, 'flagged')));
  },
  audit: function (root) {
    const s = $('#ad-search', root);
    if (s) s.addEventListener('input', debounce(() => {
      App.filters.adminAudit = Object.assign({ q: '', sev: 'all' }, App.filters.adminAudit, { q: s.value });
      App.renderBody();
      const el = $('#ad-search'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }, 300));
    $$('[data-ad-sev]', root).forEach(b => b.addEventListener('click', () => {
      App.filters.adminAudit = Object.assign({ q: '', sev: 'all' }, App.filters.adminAudit, { sev: b.dataset.adSev });
      App.renderBody();
    }));
  },
  profile: function () {},
  facilities: function () {}
};

function reviewBG(id, outcome) {
  const e = Store.state.breakGlass.find(x => x.id === id);
  if (!e) return;
  const p = Store.patient(e.patientId);
  const body = '<dl class="kv" style="margin-bottom:16px">' +
      '<div><dt>Patient</dt><dd>' + esc(p ? p.name : '—') + '</dd></div>' +
      '<div><dt>Responder</dt><dd>' + esc(e.responderName) + '</dd></div>' +
      '<div><dt>Facility</dt><dd>' + esc(e.facilityName) + '</dd></div>' +
      '<div><dt>Reason</dt><dd style="font-weight:500">' + esc(e.reason) + '</dd></div>' +
    '</dl>' +
    '<div class="field"><label for="bg-note">Review note <span class="req">*</span></label>' +
      '<textarea class="textarea" id="bg-note" placeholder="' + (outcome === 'reviewed' ? 'e.g. Access clinically justified.' : 'e.g. Scope exceeded.') + '"></textarea>' +
      '<div class="err hidden" id="e-bg-note"></div></div>';

  const root = Sheet.open({
    title: outcome === 'reviewed' ? 'Review event' : 'Flag event',
    body: body,
    footer: '<button class="btn" data-sheet-close>Cancel</button>' +
      '<button class="btn ' + (outcome === 'reviewed' ? 'btn--primary' : 'btn--danger') + '" id="bg-confirm">' +
      (outcome === 'reviewed' ? 'Confirm review' : 'Flag') + '</button>'
  });

  $('#bg-confirm', root).addEventListener('click', () => {
    const note = $('#bg-note', root).value.trim();
    if (!note) {
      const el = $('#e-bg-note', root);
      el.innerHTML = icon('alert', 13) + '<span>Note required.</span>'; el.classList.remove('hidden');
      return;
    }
    e.status = outcome;
    e.reviewedBy = App.actor().name;
    e.reviewedAt = nowISO();
    e.reviewNote = note;
    Store.save();
    audit(outcome === 'reviewed' ? 'BREAK_GLASS_REVIEWED' : 'BREAK_GLASS_FLAGGED', { patientId: e.patientId, detail: (outcome === 'reviewed' ? 'Reviewed' : 'Flagged') + ' — ' + note, severity: 'warning' });
    notify(e.patientId, outcome === 'reviewed' ? 'Emergency access reviewed' : 'Emergency access flagged', 'The break-glass access on ' + fmtDate(e.ts) + ' was ' + (outcome === 'reviewed' ? 'reviewed.' : 'flagged for follow-up.'), 'emergency');
    Sheet.close();
    Toast.success(outcome === 'reviewed' ? 'Reviewed' : 'Flagged', 'The patient has been notified.');
    App.renderBody();
  });
}