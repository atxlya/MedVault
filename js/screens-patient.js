/* ============================================================
   screens-patient.js — patient + caregiver screens and modals
   ============================================================ */

Screens.patient.home = function () {
  const pid = App.activePatientId();
  const p = Store.patient(pid);
  if (!p) return '<div class="screen">' + emptyState('No patient', 'Select a patient to view their record.') + '</div>';
  const recs = Store.recordsFor(pid);
  const consents = Store.consentsFor(pid).filter(c => c.status === 'active');
  const notifs = Store.notificationsFor(pid);
  const unread = notifs.filter(n => !n.read).length;
  const recent = recs.slice(0, 4);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const a = App.actor();

  return '<div class="screen">' +
    '<div class="greeting"><h1>' + esc(greet) + ', ' + esc(a.name.split(' ')[0]) + '</h1>' +
      '<p>' + esc(p.name) + ' · <span class="mono">' + esc(p.medvaultId) + '</span></p></div>' +

    '<div class="mid" style="margin-bottom:16px">' +
      '<div class="mid__head"><div class="mid__brand">' + icon('shield', 18) + ' MedVault</div><span class="mid__tag">Medical ID</span></div>' +
      '<div class="mid__body">' +
        '<div class="mid__av">' + esc(initials(p.name)) + '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div class="mid__name">' + esc(p.name) + '</div>' +
          '<div class="mid__sub">' + esc(p.gender) + ' · ' + age(p.dob) + ' yrs · Blood group <strong>' + esc(p.bloodGroup) + '</strong></div>' +
        '</div>' +
      '</div>' +
      '<div class="mid__rows">' +
        '<div><div class="mid__k">MedVault ID</div><div class="mid__v mono">' + esc(p.medvaultId) + '</div></div>' +
        '<div><div class="mid__k">ABHA</div><div class="mid__v mono">' + esc(p.abhaId) + '</div></div>' +
      '</div>' +
      '<button class="btn btn--block" data-act="show-qr" style="margin-top:16px;background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.28);color:#fff;position:relative;z-index:1">' +
        icon('id', 16) + ' View full Medical ID</button>' +
    '</div>' +

    (function () {
      if (!App.aiSummary || App.aiSummary.pid !== pid) {
        App.generateAISummary(pid);
      }
      return '<div class="ai-card" style="margin-bottom:16px">' + renderAICard(pid) + '</div>';
    })() +

    '<div class="stats" style="margin-bottom:8px">' +
      '<div class="stat"><div class="stat__top"><span class="stat__label">Records</span><span class="stat__ico">' + icon('records', 16) + '</span></div>' +
        '<div class="stat__val">' + recs.length + '</div><div class="stat__sub">' + new Set(recs.map(r => r.facilityId)).size + ' facilities</div></div>' +
      '<div class="stat"><div class="stat__top"><span class="stat__label">Sharing</span><span class="stat__ico teal">' + icon('shield', 16) + '</span></div>' +
        '<div class="stat__val">' + consents.length + '</div><div class="stat__sub">active consents</div></div>' +
      '<div class="stat"><div class="stat__top"><span class="stat__label">New this month</span><span class="stat__ico amber">' + icon('plus', 16) + '</span></div>' +
        '<div class="stat__val">' + recs.filter(r => { const d = new Date(r.date), n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); }).length + '</div><div class="stat__sub">linked automatically</div></div>' +
      '<div class="stat"><div class="stat__top"><span class="stat__label">Alerts</span><span class="stat__ico red">' + icon('bell', 16) + '</span></div>' +
        '<div class="stat__val">' + unread + '</div><div class="stat__sub">unread</div></div>' +
    '</div>' +

    '<div class="section-title">Quick actions</div>' +
    '<div class="list" style="margin-bottom:0">' +
      '<div class="list-item" data-act="go-assistant"><span class="list-item__ico" style="background:var(--indigo-50);color:var(--indigo)">' + icon('sparkle', 20) + '</span>' +
        '<div class="list-item__body"><div class="list-item__title">Ask your medical records</div><div class="list-item__sub">Get answers from your available records</div></div>' +
        '<span class="list-item__chev">' + icon('chevron', 18) + '</span></div>' +
      '<div class="list-item" data-act="go-reminders"><span class="list-item__ico" style="background:var(--amber-50);color:var(--amber)">' + icon('bell', 20) + '</span>' +
        '<div class="list-item__body"><div class="list-item__title">Health reminders</div><div class="list-item__sub">Appointments, checkups and medicines</div></div>' +
        '<span class="list-item__chev">' + icon('chevron', 18) + '</span></div>' +
      '<div class="list-item" data-act="upload"><span class="list-item__ico" style="background:var(--indigo-50);color:var(--indigo)">' + icon('upload', 20) + '</span>' +
        '<div class="list-item__body"><div class="list-item__title">Upload a record</div><div class="list-item__sub">Add a document with OCR extraction</div></div>' +
        '<span class="list-item__chev">' + icon('chevron', 18) + '</span></div>' +
      '<div class="list-item" data-act="go-consents"><span class="list-item__ico" style="background:var(--teal-50);color:var(--teal)">' + icon('shield', 20) + '</span>' +
        '<div class="list-item__body"><div class="list-item__title">Manage sharing</div><div class="list-item__sub">' + consents.length + ' provider(s) with access</div></div>' +
        '<span class="list-item__chev">' + icon('chevron', 18) + '</span></div>' +
      '<div class="list-item" data-act="go-emergency"><span class="list-item__ico" style="background:var(--red-50);color:var(--red)">' + icon('alert', 20) + '</span>' +
        '<div class="list-item__body"><div class="list-item__title">Emergency profile</div><div class="list-item__sub">' + (p.allergies.length || 0) + ' allergies · ' + esc(p.bloodGroup) + '</div></div>' +
        '<span class="list-item__chev">' + icon('chevron', 18) + '</span></div>' +
    '</div>' +

    '<div class="section-title" style="display:flex;justify-content:space-between;align-items:center">Recent records' +
      '<button class="btn btn--ghost btn--sm" data-act="go-timeline" style="min-height:32px;padding:4px 10px">See all</button></div>' +
    (recent.length ? '<div class="list">' + recent.map(r => recordRowHTML(r, true)).join('') + '</div>'
      : emptyState('No records yet', 'Records uploaded by your hospital will appear here.')) +
  '</div>';
};

function recordRowHTML(r) {
  const t = RECORD_TYPES[r.type] || { label: r.type, cls: 'prescription', icon: 'file' };
  return '<div class="list-item" data-record="' + esc(r.id) + '">' +
    '<span class="record-ico record-ico--' + t.cls + '">' + icon(t.icon, 20) + '</span>' +
    '<div class="list-item__body">' +
      '<div class="list-item__title">' + esc(r.title) + '</div>' +
      '<div class="list-item__sub">' + esc(r.facilityName) + (r.doctor ? ' · ' + esc(r.doctor) : '') + '</div>' +
      '<div class="list-item__meta"><span class="badge badge--gray">' + esc(t.label) + '</span> ' + esc(fmtDate(r.date)) + '</div>' +
    '</div>' +
    '<span class="list-item__chev">' + icon('chevron', 18) + '</span>' +
  '</div>';
}

Screens.patient.timeline = function () {
  const pid = App.activePatientId();
  const all = Store.recordsFor(pid);
  const f = App.filters.timeline || { q: '', type: 'all' };
  let list = all;
  if (f.type !== 'all') list = list.filter(r => r.type === f.type);
  if (f.q) { const q = f.q.toLowerCase(); list = list.filter(r => (r.title + ' ' + r.facilityName + ' ' + r.summary).toLowerCase().includes(q)); }

  const groups = {};
  list.forEach(r => {
    const y = new Date(r.date).getFullYear();
    const m = new Date(r.date).toLocaleString('en-IN', { month: 'long' });
    const k = m + ' ' + y;
    (groups[k] = groups[k] || []).push(r);
  });

  return '<div class="screen">' +
    '<div class="search-wrap" style="margin-bottom:14px">' + icon('search', 18) +
      '<input class="input" id="tl-search" placeholder="Search records…" value="' + esc(f.q) + '" /></div>' +
    '<div class="chips" style="margin-bottom:18px">' +
      '<button class="chip' + (f.type === 'all' ? ' is-on' : '') + '" data-tl-type="all">All</button>' +
      Object.keys(RECORD_TYPES).map(t => '<button class="chip' + (f.type === t ? ' is-on' : '') + '" data-tl-type="' + t + '">' + esc(RECORD_TYPES[t].label) + '</button>').join('') +
    '</div>' +

    (list.length ? Object.keys(groups).map(g => '<div style="margin-bottom:22px">' +
      '<div class="section-title" style="margin-top:0">' + esc(g) + '</div>' +
      '<div class="tl">' + groups[g].map(r => {
        const t = RECORD_TYPES[r.type] || { label: r.type, icon: 'file', cls: 'prescription' };
        const dotCls = r.type === 'discharge-summary' ? 'tl-dot--amber' : r.type === 'lab-report' ? 'tl-dot--teal' : r.type === 'scan' ? '' : 'tl-dot--teal';
        return '<div class="tl-item">' +
          '<span class="tl-dot ' + dotCls + '">' + icon(t.icon, 10) + '</span>' +
          '<div class="tl-date">' + esc(fmtDate(r.date)) + '</div>' +
          '<div class="tl-card" data-record="' + esc(r.id) + '">' +
            '<div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;margin-bottom:5px">' +
              '<span style="font-weight:600;font-size:14px">' + esc(r.title) + '</span></div>' +
            '<div class="small muted">' + esc(r.facilityName) + (r.doctor ? ' · ' + esc(r.doctor) : '') + '</div>' +
            '<p class="small" style="margin-top:7px;color:#475569;line-height:1.5">' + esc(r.summary) + '</p>' +
          '</div></div>';
      }).join('') + '</div></div>').join('')
      : emptyState('No records found', f.q || f.type !== 'all' ? 'Try a different search or filter.' : 'Records will appear here.')) +
  '</div>';
};

Screens.patient.records = function () {
  const pid = App.activePatientId();
  const all = Store.recordsFor(pid);
  const f = App.filters.records || { q: '', type: 'all', sort: 'date-desc' };
  let list = all.slice();
  if (f.type !== 'all') list = list.filter(r => r.type === f.type);
  if (f.q) { const q = f.q.toLowerCase(); list = list.filter(r => (r.title + ' ' + r.facilityName + ' ' + r.summary + ' ' + (r.tags || []).join(' ')).toLowerCase().includes(q)); }
  if (f.sort === 'date-asc') list.sort((a, b) => new Date(a.date) - new Date(b.date));
  else list.sort((a, b) => new Date(b.date) - new Date(a.date));

  return '<div class="screen">' +
    '<div class="search-wrap" style="margin-bottom:12px">' + icon('search', 18) +
      '<input class="input" id="rec-search" placeholder="Search by title, facility or keyword…" value="' + esc(f.q) + '" /></div>' +
    '<div style="display:flex;gap:8px;margin-bottom:14px">' +
      '<select class="select" id="rec-type" style="flex:1"><option value="all">All types</option>' +
        Object.keys(RECORD_TYPES).map(t => '<option value="' + t + '"' + (f.type === t ? ' selected' : '') + '>' + esc(RECORD_TYPES[t].label) + '</option>').join('') +
      '</select>' +
      '<select class="select" id="rec-sort" style="flex:1"><option value="date-desc"' + (f.sort === 'date-desc' ? ' selected' : '') + '>Newest</option>' +
        '<option value="date-asc"' + (f.sort === 'date-asc' ? ' selected' : '') + '>Oldest</option></select>' +
    '</div>' +
    '<div class="small muted" style="margin-bottom:12px">' + list.length + ' record(s)</div>' +
    (list.length ? '<div class="list">' + list.map(r => recordRowHTML(r)).join('') + '</div>'
      : emptyState('No records match', 'Try clearing your filters.')) +
  '</div>';
};

Screens.patient.share = function () {
  const pid = App.activePatientId();
  const consents = Store.consentsFor(pid).slice().sort((a, b) => new Date(b.grantedAt) - new Date(a.grantedAt));
  const active = consents.filter(c => c.status === 'active');
  const pending = consents.filter(c => c.status === 'pending');

  const consentCard = c => {
    const days = c.expiresAt ? Math.ceil((new Date(c.expiresAt) - new Date()) / 86400000) : null;
    return '<div class="card" style="margin-bottom:11px"><div class="card__body">' +
      '<div style="display:flex;gap:12px;align-items:flex-start">' +
        '<span class="list-item__ico" style="background:var(--indigo-50);color:var(--indigo)">' + icon('user', 20) + '</span>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
            '<span style="font-weight:700;font-size:14.5px">' + esc(c.providerName) + '</span>' + badgeFor(c.status) +
            (c.requestedBy === 'provider' && c.status === 'pending' ? '<span class="badge badge--amber">Request</span>' : '') +
          '</div>' +
          '<div class="small muted" style="margin-top:3px">' + esc(c.facilityName) + '</div>' +
          '<div class="small" style="margin-top:8px"><strong>Purpose:</strong> ' + esc(c.purpose) + '</div>' +
          '<div style="margin-top:9px;display:flex;gap:5px;flex-wrap:wrap">' +
            c.recordTypes.map(t => '<span class="tag">' + esc((RECORD_TYPES[t] || { label: t }).label) + '</span>').join('') +
          '</div>' +
          '<div class="tiny muted" style="margin-top:9px">' +
            (c.status === 'active' && days !== null ? 'Expires in ' + days + ' days · ' : '') +
            (c.status === 'revoked' ? 'Revoked ' + esc(fmtDate(c.revokedAt)) : 'Granted ' + esc(fmtDate(c.grantedAt))) +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="row" style="gap:8px;margin-top:12px">' +
        (c.status === 'pending' ? '<button class="btn btn--primary btn--sm" data-consent-accept="' + esc(c.id) + '" style="flex:1">Approve</button>' +
          '<button class="btn btn--sm" data-consent-decline="' + esc(c.id) + '" style="flex:1">Decline</button>' : '') +
        (c.status === 'active' ? '<button class="btn btn--danger btn--sm" data-consent-revoke="' + esc(c.id) + '" style="flex:1">Revoke access</button>' : '') +
      '</div>' +
    '</div></div>';
  };

  return '<div class="screen">' +
    '<div class="stats" style="margin-bottom:6px">' +
      '<div class="stat"><div class="stat__top"><span class="stat__label">Active</span><span class="stat__ico teal">' + icon('shield', 16) + '</span></div><div class="stat__val">' + active.length + '</div><div class="stat__sub">providers with access</div></div>' +
      '<div class="stat"><div class="stat__top"><span class="stat__label">Pending</span><span class="stat__ico amber">' + icon('alert', 16) + '</span></div><div class="stat__val">' + pending.length + '</div><div class="stat__sub">your decision</div></div>' +
    '</div>' +

    '<div class="section-title">Quick links</div>' +
    '<div class="list" style="margin-bottom:0">' +
      '<div class="list-item" data-act="go-consents"><span class="list-item__ico" style="background:var(--indigo-50);color:var(--indigo)">' + icon('shield', 20) + '</span>' +
        '<div class="list-item__body"><div class="list-item__title">All consents</div><div class="list-item__sub">Manage sharing with every provider</div></div>' +
        '<span class="list-item__chev">' + icon('chevron', 18) + '</span></div>' +
      '<div class="list-item" data-act="go-caregivers"><span class="list-item__ico" style="background:var(--teal-50);color:var(--teal)">' + icon('users', 20) + '</span>' +
        '<div class="list-item__body"><div class="list-item__title">Caregivers</div><div class="list-item__sub">Family members who can help</div></div>' +
        '<span class="list-item__chev">' + icon('chevron', 18) + '</span></div>' +
      '<div class="list-item" data-act="go-audit"><span class="list-item__ico" style="background:var(--amber-50);color:var(--amber)">' + icon('scroll', 20) + '</span>' +
        '<div class="list-item__body"><div class="list-item__title">Access log</div><div class="list-item__sub">Every view and change</div></div>' +
        '<span class="list-item__chev">' + icon('chevron', 18) + '</span></div>' +
    '</div>' +

    (pending.length ? '<div class="section-title">Awaiting your decision</div>' + pending.map(consentCard).join('') : '') +
    '<div class="section-title">Active consents</div>' +
    (active.length ? active.map(consentCard).join('') : '<div class="card"><div class="card__body"><p class="small muted">No active consents. No provider can access your records except via audited emergency access.</p></div></div>') +
    '<button class="btn btn--primary btn--block" data-act="grant-consent" style="margin-top:18px">' + icon('plus', 17) + ' Grant new consent</button>' +
  '</div>';
};

Screens.patient.profile = function () {
  const pid = App.activePatientId();
  const p = Store.patient(pid);
  const u = App.currentUser();
  if (!p) return '<div class="screen">' + emptyState('No patient', '') + '</div>';
  return '<div class="screen">' +
    '<div style="text-align:center;padding:8px 0 22px">' +
      '<div class="avatar avatar--lg" style="margin:0 auto 14px">' + esc(initials(p.name)) + '</div>' +
      '<div style="font-weight:800;font-size:20px;letter-spacing:-.02em">' + esc(p.name) + '</div>' +
      '<div class="small muted mono" style="margin-top:4px">' + esc(p.medvaultId) + '</div>' +
    '</div>' +

    '<div class="section-title">Personal details</div>' +
    '<div class="card"><div class="card__body">' +
      '<dl class="kv">' +
        '<div><dt>Date of birth</dt><dd>' + esc(fmtDate(p.dob)) + ' · ' + age(p.dob) + ' years</dd></div>' +
        '<div><dt>Gender</dt><dd>' + esc(p.gender) + '</dd></div>' +
        '<div><dt>Blood group</dt><dd>' + esc(p.bloodGroup) + '</dd></div>' +
        '<div><dt>Phone</dt><dd>' + esc(p.phone) + '</dd></div>' +
        '<div><dt>Address</dt><dd>' + esc(p.address) + '</dd></div>' +
        '<div><dt>ABHA number</dt><dd class="mono">' + esc(p.abhaId) + '</dd></div>' +
      '</dl>' +
    '</div></div>' +

    '<div class="section-title">Account</div>' +
    '<div class="list">' +
      '<div class="list-item" data-act="go-mid"><span class="list-item__ico" style="background:var(--indigo-50);color:var(--indigo)">' + icon('id', 20) + '</span>' +
        '<div class="list-item__body"><div class="list-item__title">Medical ID card</div><div class="list-item__sub">Show or share the QR code</div></div>' +
        '<span class="list-item__chev">' + icon('chevron', 18) + '</span></div>' +
      '<div class="list-item" data-act="go-reminders"><span class="list-item__ico" style="background:var(--amber-50);color:var(--amber)">' + icon('bell', 20) + '</span>' +
        '<div class="list-item__body"><div class="list-item__title">Health reminders</div><div class="list-item__sub">Manage checkups, appointments and medicines</div></div>' +
        '<span class="list-item__chev">' + icon('chevron', 18) + '</span></div>' +
      '<div class="list-item" data-act="go-emergency"><span class="list-item__ico" style="background:var(--red-50);color:var(--red)">' + icon('alert', 20) + '</span>' +
        '<div class="list-item__body"><div class="list-item__title">Emergency profile</div><div class="list-item__sub">Allergies, conditions, contacts</div></div>' +
        '<span class="list-item__chev">' + icon('chevron', 18) + '</span></div>' +
      '<div class="list-item" data-act="go-audit"><span class="list-item__ico" style="background:var(--amber-50);color:var(--amber)">' + icon('scroll', 20) + '</span>' +
        '<div class="list-item__body"><div class="list-item__title">Access log</div><div class="list-item__sub">Who viewed or changed this record</div></div>' +
        '<span class="list-item__chev">' + icon('chevron', 18) + '</span></div>' +
    '</div>' +

    '<div class="section-title">Signed in as</div>' +
    '<div class="card"><div class="card__body">' +
      '<div style="font-weight:600">' + esc(u.name) + '</div>' +
      '<div class="small muted">' + esc(u.email) + ' · ' + esc(roleLabel(u.role)) + '</div>' +
    '</div></div>' +

    '<div class="section-title">Security</div>' +
    '<div class="alert alert--info">' + icon('lock', 18) +
      '<div><strong>Prototype note.</strong> Passwords are stored in plain text in browser storage for demonstration only. Production must use a real identity provider with MFA.</div></div>' +
  '</div>';
};

Screens.patient.consents = function () {
  const pid = App.activePatientId();
  const consents = Store.consentsFor(pid).slice().sort((a, b) => new Date(b.grantedAt) - new Date(a.grantedAt));
  const active = consents.filter(c => c.status === 'active');
  const pending = consents.filter(c => c.status === 'pending');
  const past = consents.filter(c => c.status === 'revoked' || c.status === 'expired');

  const card = c => {
    const days = c.expiresAt ? Math.ceil((new Date(c.expiresAt) - new Date()) / 86400000) : null;
    return '<div class="card" style="margin-bottom:11px"><div class="card__body">' +
      '<div style="display:flex;gap:12px;align-items:flex-start">' +
        '<span class="list-item__ico" style="background:var(--indigo-50);color:var(--indigo)">' + icon('user', 20) + '</span>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
            '<span style="font-weight:700;font-size:14.5px">' + esc(c.providerName) + '</span>' + badgeFor(c.status) +
          '</div>' +
          '<div class="small muted" style="margin-top:3px">' + esc(c.facilityName) + '</div>' +
          '<div class="small" style="margin-top:8px"><strong>Purpose:</strong> ' + esc(c.purpose) + '</div>' +
          '<div style="margin-top:9px;display:flex;gap:5px;flex-wrap:wrap">' +
            c.recordTypes.map(t => '<span class="tag">' + esc((RECORD_TYPES[t] || { label: t }).label) + '</span>').join('') +
          '</div>' +
          '<div class="tiny muted" style="margin-top:9px">' +
            (c.status === 'active' && days !== null ? 'Expires in ' + days + ' days' : c.status === 'revoked' ? 'Revoked ' + esc(fmtDate(c.revokedAt)) : 'Granted ' + esc(fmtDate(c.grantedAt))) +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="row" style="gap:8px;margin-top:12px">' +
        (c.status === 'pending' ? '<button class="btn btn--primary btn--sm" data-consent-accept="' + esc(c.id) + '" style="flex:1">Approve</button>' +
          '<button class="btn btn--sm" data-consent-decline="' + esc(c.id) + '" style="flex:1">Decline</button>' : '') +
        (c.status === 'active' ? '<button class="btn btn--danger btn--sm" data-consent-revoke="' + esc(c.id) + '" style="flex:1">Revoke</button>' : '') +
      '</div>' +
    '</div></div>';
  };

  return '<div class="screen">' +
    (pending.length ? '<div class="section-title" style="margin-top:0">Awaiting your decision</div>' + pending.map(card).join('') : '') +
    '<div class="section-title">Active</div>' +
    (active.length ? active.map(card).join('') : '<div class="card"><div class="card__body"><p class="small muted">No active consents.</p></div></div>') +
    (past.length ? '<div class="section-title">History</div>' + past.map(card).join('') : '') +
    '<button class="btn btn--primary btn--block" data-act="grant-consent" style="margin-top:16px">' + icon('plus', 17) + ' Grant consent</button>' +
  '</div>';
};

Screens.patient.caregivers = function () {
  const pid = App.activePatientId();
  const links = Store.caregiversFor(pid);
  return '<div class="screen">' +
    (links.length ? '<div class="list">' + links.map(l => '<div class="list-item">' +
      '<span class="avatar">' + esc(initials(l.name)) + '</span>' +
      '<div class="list-item__body"><div class="list-item__title">' + esc(l.name) + '</div>' +
      '<div class="list-item__sub">' + esc(l.relation) + '</div>' +
      '<div class="list-item__meta">' + l.permissions.map(p => '<span class="tag">' + esc(caregiverPermLabel(p)) + '</span>').join(' ') + '</div></div>' +
      '<button class="btn btn--sm btn--danger" data-caregiver-remove="' + esc(l.id) + '">Revoke</button>' +
    '</div>').join('') + '</div>'
      : emptyState('No caregivers linked', 'A caregiver can upload documents and keep the emergency profile current on behalf of someone who cannot manage the app.')) +
    '<button class="btn btn--primary btn--block" data-act="add-caregiver" style="margin-top:16px">' + icon('plus', 17) + ' Invite caregiver</button>' +
    '<div class="alert alert--info" style="margin-top:18px">' + icon('users', 18) +
      '<div>Caregivers act <strong>on behalf of</strong> the patient. Every action they take is recorded in the access log with their name — never anonymised.</div></div>' +
  '</div>';
};

function caregiverPermLabel(p) {
  return ({ view: 'View', upload: 'Upload', 'manage-emergency': 'Emergency', 'manage-consents': 'Consents' })[p] || p;
}

Screens.patient.emergency = function () {
  const p = Store.patient(App.activePatientId());
  if (!p) return '<div class="screen">' + emptyState('No patient', '') + '</div>';
  return '<div class="screen">' +
    '<div class="alert alert--warn" style="margin-bottom:18px">' + icon('alert', 19) +
      '<div><strong>Break-glass rule.</strong> Emergency access is limited to clinically relevant information, used only under defined conditions, and automatically recorded for later review.</div></div>' +
    '<form id="emergency-form">' +
      '<div class="field"><label for="em-blood">Blood group</label>' +
        '<select class="select" id="em-blood">' +
          ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'].map(b => '<option' + (p.bloodGroup === b ? ' selected' : '') + '>' + b + '</option>').join('') +
        '</select></div>' +
      '<div class="field"><label for="em-allergies">Allergies <span class="muted" style="font-weight:400">(one per line)</span></label>' +
        '<textarea class="textarea" id="em-allergies">' + esc(p.allergies.join('\n')) + '</textarea></div>' +
      '<div class="field"><label for="em-conditions">Chronic conditions</label>' +
        '<textarea class="textarea" id="em-conditions">' + esc(p.conditions.join('\n')) + '</textarea></div>' +
      '<div class="field"><label for="em-meds">Current medications</label>' +
        '<textarea class="textarea" id="em-meds">' + esc(p.medications.join('\n')) + '</textarea></div>' +
      '<div class="field"><label for="em-cname">Emergency contact name</label>' +
        '<input class="input" id="em-cname" value="' + esc(p.emergencyContact.name) + '" /></div>' +
      '<div class="field"><label for="em-crel">Relationship</label>' +
        '<input class="input" id="em-crel" value="' + esc(p.emergencyContact.relation) + '" /></div>' +
      '<div class="field"><label for="em-cphone">Phone</label>' +
        '<input class="input" id="em-cphone" value="' + esc(p.emergencyContact.phone) + '" /></div>' +
      '<label class="check' + (p.organDonor ? ' is-on' : '') + '" id="em-donor-wrap" style="margin-bottom:14px">' +
        '<input type="checkbox" id="em-donor" ' + (p.organDonor ? 'checked' : '') + ' /><span>Registered organ donor<small>Displayed to emergency responders where legally permitted.</small></span></label>' +
    '</form>' +
    '<div class="section-title">Preview — what a responder sees</div>' +
    '<div class="card" style="border-color:#fecaca"><div class="card__body">' +
      '<div style="font-weight:700;font-size:15px">' + esc(p.name) + '</div>' +
      '<div class="small muted">' + esc(p.gender) + ' · ' + age(p.dob) + ' yrs · <strong style="color:var(--red)">' + esc(p.bloodGroup) + '</strong></div>' +
      '<div style="margin-top:12px"><div class="tiny" style="font-weight:700;color:var(--muted-2);letter-spacing:.08em;text-transform:uppercase">Allergies</div>' +
        '<div style="margin-top:5px">' + (p.allergies.length ? p.allergies.map(x => '<span class="tag" style="background:var(--red-50);color:#b91c1c;margin-right:5px">' + esc(x) + '</span>').join('') : '<span class="small muted">None recorded</span>') + '</div></div>' +
      '<div style="margin-top:12px"><div class="tiny" style="font-weight:700;color:var(--muted-2);letter-spacing:.08em;text-transform:uppercase">Conditions</div>' +
        '<div class="small" style="margin-top:4px">' + (p.conditions.map(esc).join(', ') || '—') + '</div></div>' +
      '<div style="margin-top:12px"><div class="tiny" style="font-weight:700;color:var(--muted-2);letter-spacing:.08em;text-transform:uppercase">Emergency contact</div>' +
        '<div class="small" style="margin-top:4px">' + esc(p.emergencyContact.name) + ' · ' + esc(p.emergencyContact.phone) + '</div></div>' +
    '</div></div>' +
    '<button class="btn btn--primary btn--block" data-act="save-emergency" style="margin-top:18px">' + icon('check', 17) + ' Save changes</button>' +
  '</div>';
};

Screens.patient.audit = function () {
  const pid = App.activePatientId();
  const all = Store.auditFor(pid).slice().sort((a, b) => new Date(b.ts) - new Date(a.ts));
  const f = App.filters.audit || { sev: 'all' };
  const list = f.sev === 'all' ? all : all.filter(a => a.severity === f.sev);
  return '<div class="screen">' +
    '<div class="chips" style="margin-bottom:16px">' +
      '<button class="chip' + (f.sev === 'all' ? ' is-on' : '') + '" data-audit-sev="all">All</button>' +
      '<button class="chip' + (f.sev === 'info' ? ' is-on' : '') + '" data-audit-sev="info">Info</button>' +
      '<button class="chip' + (f.sev === 'warning' ? ' is-on' : '') + '" data-audit-sev="warning">Warning</button>' +
      '<button class="chip' + (f.sev === 'critical' ? ' is-on' : '') + '" data-audit-sev="critical">Critical</button>' +
    '</div>' +
    (list.length ? '<div class="list">' + list.map(a => {
      const col = a.severity === 'critical' ? 'background:var(--red-50);color:#b91c1c' : a.severity === 'warning' ? 'background:var(--amber-50);color:#b45309' : 'background:var(--indigo-50);color:var(--indigo)';
      return '<div class="list-item" style="cursor:default">' +
        '<span class="list-item__ico" style="' + col + '">' + icon('activity', 18) + '</span>' +
        '<div class="list-item__body"><div class="list-item__title" style="font-size:13.5px">' + esc(a.action) + '</div>' +
        '<div class="list-item__sub" style="white-space:normal">' + esc(a.detail) + '</div>' +
        '<div class="list-item__meta">' + esc(a.actor) + ' · ' + esc(timeAgo(a.ts)) + '</div></div></div>';
    }).join('') + '</div>'
      : emptyState('No events', 'Access events will appear here.')) +
  '</div>';
};

Screens.patient['medical-id'] = function () {
  const p = Store.patient(App.activePatientId());
  if (!p) return '<div class="screen">' + emptyState('No patient', '') + '</div>';
  const qrData = 'MEDVAULT:' + p.medvaultId + '|ABHA:' + p.abhaId + '|NAME:' + p.name;
  return '<div class="screen">' +
    '<div class="mid" style="margin-bottom:16px">' +
      '<div class="mid__head"><div class="mid__brand">' + icon('shield', 18) + ' MedVault</div><span class="mid__tag">Medical ID</span></div>' +
      '<div class="mid__body">' +
        '<div class="mid__av">' + esc(initials(p.name)) + '</div>' +
        '<div style="flex:1;min-width:0"><div class="mid__name">' + esc(p.name) + '</div>' +
          '<div class="mid__sub">' + esc(p.gender) + ' · ' + age(p.dob) + ' yrs · ' + esc(p.bloodGroup) + '</div></div>' +
      '</div>' +
      '<div class="mid__rows">' +
        '<div><div class="mid__k">MedVault ID</div><div class="mid__v mono">' + esc(p.medvaultId) + '</div></div>' +
        '<div><div class="mid__k">ABHA</div><div class="mid__v mono">' + esc(p.abhaId) + '</div></div>' +
        '<div><div class="mid__k">Date of birth</div><div class="mid__v">' + esc(fmtDate(p.dob)) + '</div></div>' +
        '<div><div class="mid__k">Facilities</div><div class="mid__v">' + p.linkedFacilities.length + ' linked</div></div>' +
      '</div>' +
      '<div style="text-align:center"><div class="mid__qr">' + qrSVG(qrData, 168) + '</div></div>' +
    '</div>' +

    '<div class="row" style="gap:10px;margin-bottom:16px">' +
      '<button class="btn" data-act="copy-id" style="flex:1">' + icon('copy', 16) + ' Copy ID</button>' +
      '<button class="btn" data-act="print-card" style="flex:1">' + icon('download', 16) + ' Save</button>' +
    '</div>' +

    '<div class="section-title">Privacy boundary</div>' +
    '<div class="alert alert--info">' + icon('shield', 18) +
      '<div>Identity verification answers <strong>who the patient is</strong>. The MedVault / ABHA-linked record determines <strong>what health information exists</strong>. Consent determines <strong>who can access it and why</strong>.</div></div>' +
    '<ul style="margin:16px 0 0;padding-left:20px;font-size:13.5px;line-height:1.9;color:var(--muted)">' +
      '<li>No Aadhaar core biometric data stored or retrieved.</li>' +
      '<li>Identity verification used only for an authorised purpose.</li>' +
      '<li>Medical records stay separate from identity credentials.</li>' +
      '<li>Least-privilege access with explicit consent.</li>' +
      '<li>All sensitive access logged.</li>' +
    '</ul>' +

    '<div class="section-title">Linked facilities</div>' +
    '<div class="list">' + p.linkedFacilities.map(fid => {
      const f = Store.facility(fid); if (!f) return '';
      return '<div class="list-item" style="cursor:default">' +
        '<span class="list-item__ico" style="background:var(--indigo-50);color:var(--indigo)">' + icon('building', 18) + '</span>' +
        '<div class="list-item__body"><div class="list-item__title">' + esc(f.name) + '</div>' +
        '<div class="list-item__sub">' + esc(f.type) + ' · ' + esc(f.city) + '</div></div>' +
        (f.verified ? '<span class="badge badge--teal" style="align-self:center">Verified</span>' : '') +
      '</div>';
    }).join('') + '</div>' +
  '</div>';
};

Screens.patient.patients = function () {
  const u = App.currentUser();
  const pts = (u.patientIds || []).map(id => Store.patient(id)).filter(Boolean);
  return '<div class="screen">' +
    pts.map(p => {
      const recs = Store.recordsFor(p.id);
      const active = App.activePatientId() === p.id;
      return '<div class="card" style="margin-bottom:12px;' + (active ? 'border-color:var(--indigo);box-shadow:0 0 0 3px rgba(79,70,229,.1)' : '') + '"><div class="card__body">' +
        '<div style="display:flex;gap:13px;align-items:center">' +
          '<div class="avatar avatar--lg">' + esc(initials(p.name)) + '</div>' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-weight:700;font-size:16px">' + esc(p.name) + '</div>' +
            '<div class="small muted">' + esc(p.gender) + ' · ' + age(p.dob) + ' yrs · ' + esc(p.bloodGroup) + '</div>' +
            '<div class="tiny muted mono" style="margin-top:3px">' + esc(p.medvaultId) + '</div>' +
          '</div>' +
          (active ? '<span class="badge badge--indigo">Viewing</span>' : '') +
        '</div>' +
        '<div class="divider"></div>' +
        '<div style="display:flex;gap:22px;font-size:13px">' +
          '<div><div class="tiny muted">Records</div><div style="font-weight:700;font-size:17px">' + recs.length + '</div></div>' +
          '<div><div class="tiny muted">Last</div><div style="font-weight:600;font-size:13px;margin-top:3px">' + (recs[0] ? esc(fmtDate(recs[0].date)) : '—') + '</div></div>' +
        '</div>' +
        '<button class="btn ' + (active ? '' : 'btn--primary') + ' btn--block" data-switch-patient="' + esc(p.id) + '" style="margin-top:14px" ' + (active ? 'disabled' : '') + '>' +
          (active ? 'Currently viewing' : 'Open record') + '</button>' +
      '</div></div>';
    }).join('') +
  '</div>';
};

/* ---- Bindings ---- */
Screens.patient.bind = {
  home: bindPatientHome,
  timeline: bindTimeline,
  records: bindRecords,
  share: bindShare,
  profile: bindPatientProfile,
  consents: bindConsents,
  caregivers: bindCaregivers,
  emergency: bindEmergency,
  audit: bindAudit,
  'medical-id': bindMedicalId,
  patients: bindPatientList
};

function bindPatientHome(root) {
  $$('[data-act]', root).forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.act;
    if (a === 'upload') openPatientUpload();
    if (a === 'go-assistant') App.go('assistant');
    if (a === 'go-consents') App.go('consents');
    if (a === 'go-caregivers') App.go('caregivers');
    if (a === 'go-audit') App.go('audit');
    if (a === 'go-emergency') App.go('emergency');
    if (a === 'go-reminders') App.go('reminders');
    if (a === 'go-mid') App.go('medical-id');
    if (a === 'go-timeline') App.go('timeline');
    if (a === 'show-qr') App.go('medical-id');
    if (a === 'refresh-ai') {
      const pid = App.activePatientId();
      App.aiSummary = { pid: pid, loading: true, data: null };
      App.renderBody();
      App.generateAISummary(pid, true);
      Toast.info('Regenerating summary', 'Re-analysing the latest records.');
    }
  }));
  $$('[data-record]', root).forEach(el => el.addEventListener('click', () => openRecordView(el.dataset.record)));
  $$('[data-ai-source]', root).forEach(el => el.addEventListener('click', () => openRecordView(el.dataset.aiSource)));
  bindConsentActions(root);
}

function bindTimeline(root) {
  const s = $('#tl-search', root);
  if (s) s.addEventListener('input', debounce(() => {
    App.filters.timeline = Object.assign({ q: '', type: 'all' }, App.filters.timeline, { q: s.value });
    App.renderBody();
    const el = $('#tl-search'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
  }, 300));
  $$('[data-tl-type]', root).forEach(b => b.addEventListener('click', () => {
    App.filters.timeline = Object.assign({ q: '', type: 'all' }, App.filters.timeline, { type: b.dataset.tlType });
    App.renderBody();
  }));
  $$('[data-record]', root).forEach(el => el.addEventListener('click', () => openRecordView(el.dataset.record)));
}

function bindRecords(root) {
  const s = $('#rec-search', root);
  if (s) s.addEventListener('input', debounce(() => {
    App.filters.records = Object.assign({ q: '', type: 'all', sort: 'date-desc' }, App.filters.records, { q: s.value });
    App.renderBody();
    const el = $('#rec-search'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
  }, 300));
  const t = $('#rec-type', root);
  if (t) t.addEventListener('change', () => {
    App.filters.records = Object.assign({ q: '', type: 'all', sort: 'date-desc' }, App.filters.records, { type: t.value });
    App.renderBody();
  });
  const so = $('#rec-sort', root);
  if (so) so.addEventListener('change', () => {
    App.filters.records = Object.assign({ q: '', type: 'all', sort: 'date-desc' }, App.filters.records, { sort: so.value });
    App.renderBody();
  });
  $$('[data-record]', root).forEach(el => el.addEventListener('click', () => openRecordView(el.dataset.record)));
}

function bindShare(root) {
  $$('[data-act]', root).forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.act;
    if (a === 'go-consents') App.go('consents');
    if (a === 'go-caregivers') App.go('caregivers');
    if (a === 'go-audit') App.go('audit');
    if (a === 'go-reminders') App.go('reminders');
    if (a === 'grant-consent') openGrantConsent();
  }));
  bindConsentActions(root);
}

function bindConsentActions(root) {
  $$('[data-consent-revoke]', root).forEach(b => b.addEventListener('click', async () => {
    const c = Store.state.consents.find(x => x.id === b.dataset.consentRevoke);
    if (!c) return;
    const ok = await Sheet.confirm({ title: 'Revoke consent?', message: c.providerName + ' will immediately lose access.', warning: 'This action is recorded in the access log.', okLabel: 'Revoke', danger: true });
    if (!ok) return;
    c.status = 'revoked'; c.revokedAt = nowISO(); Store.save();
    audit('CONSENT_REVOKED', { patientId: c.patientId, detail: 'Revoked consent for ' + c.providerName, severity: 'warning' });
    Toast.success('Consent revoked', c.providerName + ' no longer has access.');
    App.renderBody();
  }));
  $$('[data-consent-accept]', root).forEach(b => b.addEventListener('click', () => {
    const c = Store.state.consents.find(x => x.id === b.dataset.consentAccept);
    if (!c) return;
    c.status = 'active'; c.grantedAt = nowISO(); Store.save();
    audit('CONSENT_GRANTED', { patientId: c.patientId, detail: 'Approved request from ' + c.providerName });
    Toast.success('Consent approved', c.providerName + ' now has access.');
    App.renderBody();
  }));
  $$('[data-consent-decline]', root).forEach(b => b.addEventListener('click', async () => {
    const c = Store.state.consents.find(x => x.id === b.dataset.consentDecline);
    if (!c) return;
    const ok = await Sheet.confirm({ title: 'Decline?', message: 'Decline access request from ' + c.providerName + '?', okLabel: 'Decline', danger: true });
    if (!ok) return;
    Store.state.consents = Store.state.consents.filter(x => x.id !== c.id); Store.save();
    audit('CONSENT_DECLINED', { patientId: c.patientId, detail: 'Declined request from ' + c.providerName, severity: 'warning' });
    Toast.info('Declined', c.providerName + ' has been notified.');
    App.renderBody();
  }));
}

function bindPatientProfile(root) {
  $$('[data-act]', root).forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.act;
    if (a === 'go-mid') App.go('medical-id');
    if (a === 'go-emergency') App.go('emergency');
    if (a === 'go-audit') App.go('audit');
    if (a === 'go-reminders') App.go('reminders');
  }));
}

function bindConsents(root) {
  $$('[data-act]', root).forEach(b => b.addEventListener('click', () => {
    if (b.dataset.act === 'grant-consent') openGrantConsent();
  }));
  bindConsentActions(root);
}

function bindCaregivers(root) {
  $$('[data-act]', root).forEach(b => b.addEventListener('click', () => {
    if (b.dataset.act === 'add-caregiver') openAddCaregiver();
  }));
  $$('[data-caregiver-remove]', root).forEach(b => b.addEventListener('click', async () => {
    const l = Store.state.caregiverLinks.find(x => x.id === b.dataset.caregiverRemove);
    if (!l) return;
    const ok = await Sheet.confirm({ title: 'Revoke caregiver?', message: l.name + ' will no longer be able to view or manage this record.', okLabel: 'Revoke', danger: true });
    if (!ok) return;
    Store.state.caregiverLinks = Store.state.caregiverLinks.filter(x => x.id !== l.id);
    const u = Store.user(l.userId);
    if (u && u.patientIds) u.patientIds = u.patientIds.filter(p => p !== l.patientId);
    Store.save();
    audit('CAREGIVER_REVOKED', { patientId: l.patientId, detail: 'Caregiver access revoked for ' + l.name, severity: 'warning' });
    Toast.success('Caregiver revoked', l.name + ' no longer has access.');
    App.renderBody();
  }));
}

function bindEmergency(root) {
  const donor = $('#em-donor', root);
  if (donor) donor.addEventListener('change', () => $('#em-donor-wrap').classList.toggle('is-on', donor.checked));
  $$('[data-act="save-emergency"]', root).forEach(b => b.addEventListener('click', () => {
    const p = Store.patient(App.activePatientId());
    const lines = id => $(id, root).value.split('\n').map(s => s.trim()).filter(Boolean);
    p.bloodGroup = $('#em-blood', root).value;
    p.allergies = lines('#em-allergies');
    p.conditions = lines('#em-conditions');
    p.medications = lines('#em-meds');
    p.emergencyContact = { name: $('#em-cname', root).value.trim(), relation: $('#em-crel', root).value.trim(), phone: $('#em-cphone', root).value.trim() };
    p.organDonor = $('#em-donor', root).checked;
    Store.save();
    audit('EMERGENCY_PROFILE_UPDATED', { patientId: p.id, detail: 'Emergency profile updated' });
    Toast.success('Saved', 'Responders will see the updated information.');
    App.renderBody();
  }));
}

function bindAudit(root) {
  $$('[data-audit-sev]', root).forEach(b => b.addEventListener('click', () => {
    App.filters.audit = { sev: b.dataset.auditSev };
    App.renderBody();
  }));
}

function bindMedicalId(root) {
  $$('[data-act]', root).forEach(b => b.addEventListener('click', () => {
    const p = Store.patient(App.activePatientId());
    const a = b.dataset.act;
    if (a === 'copy-id') {
      if (navigator.clipboard) navigator.clipboard.writeText(p.medvaultId);
      Toast.success('Copied', 'MedVault ID ' + p.medvaultId + ' copied.');
    }
    if (a === 'print-card') { Toast.info('Save card', 'Use your browser print dialog to save as PDF.'); window.print(); }
  }));
}

function bindPatientList(root) {
  $$('[data-switch-patient]', root).forEach(b => b.addEventListener('click', () => {
    App.actingPatientId = b.dataset.switchPatient;
    Toast.info('Switched patient', 'Now viewing ' + Store.patient(App.actingPatientId).name + "'s record.");
    App.go('home');
  }));
}

/* ---- Patient modals ---- */
function openRecordView(recordId) {
  const r = Store.state.records.find(x => x.id === recordId);
  if (!r) return;
  if (typeof assistantCanOpenRecord === 'function' && !assistantCanOpenRecord(r)) {
    Toast.error('Record unavailable', 'This record is outside your current access permissions.');
    return;
  }
  const t = RECORD_TYPES[r.type] || { label: r.type, icon: 'file', cls: 'prescription' };
  audit('RECORD_VIEWED', { patientId: r.patientId, detail: 'Viewed ' + r.title });
  const ex = r.extracted || {};
  const field = (k, v) => v ? '<div style="margin-bottom:14px"><div class="section-title" style="margin:0 0 6px">' + esc(k) + '</div><div style="font-size:14px;line-height:1.55">' + v + '</div></div>' : '';

  Fullscreen.open({
    title: r.title,
    actions: '<button class="app-header__btn" data-dl aria-label="Download">' + icon('download', 19) + '</button>',
    body: '<div class="row" style="gap:8px;margin-bottom:16px;flex-wrap:wrap">' +
        '<span class="badge badge--indigo">' + esc(t.label) + '</span>' +
        (r.source === 'provider-upload' ? '<span class="badge badge--teal">Provider-linked</span>' : '<span class="badge badge--gray">Patient upload</span>') +
        '<span class="badge badge--gray">' + esc(fmtDate(r.date)) + '</span>' +
      '</div>' +
      '<dl class="kv" style="margin-bottom:20px">' +
        '<div><dt>Facility</dt><dd>' + esc(r.facilityName) + '</dd></div>' +
        '<div><dt>Clinician</dt><dd>' + esc(r.doctor || '—') + '</dd></div>' +
        '<div><dt>Document</dt><dd class="mono" style="font-size:12.5px">' + esc(r.fileName) + '</dd></div>' +
        '<div><dt>Added</dt><dd>' + esc(fmtDateTime(r.createdAt)) + '</dd></div>' +
      '</dl>' +
      '<div class="divider"></div>' +
      field('Summary', esc(r.summary)) +
      field('Diagnosis', esc(ex.diagnosis)) +
      field('Medications', (ex.medications || []).length ? '<ul style="margin:0;padding-left:19px">' + ex.medications.map(m => '<li>' + esc(m) + '</li>').join('') + '</ul>' : '') +
      field('Results / Vitals', esc(ex.results || ex.vitals)) +
      field('Advice', esc(ex.advice)) +
      ((r.tags || []).length ? '<div>' + r.tags.map(x => '<span class="tag" style="margin-right:5px">#' + esc(x) + '</span>').join('') + '</div>' : '') +
      '<div style="display:flex;gap:10px;margin-top:22px">' +
        ((App.role() === 'patient' || App.role() === 'caregiver') ? '<button class="btn" data-fs-delete style="flex:1;color:var(--red);border-color:#fecaca">' + icon('trash', 16) + ' Delete</button>' : '') +
        '<button class="btn btn--primary" data-fs-close style="flex:1">Close</button>' +
      '</div>'
  });

  $('[data-dl]').addEventListener('click', () => Toast.info('Download started', r.fileName + ' — simulated.'));
  $$('[data-fs-delete]').forEach(b => b.addEventListener('click', async () => {
    const ok = await Sheet.confirm({ title: 'Delete record?', message: '"' + r.title + '" will be permanently removed.', warning: 'Deletion is logged and cannot be undone.', okLabel: 'Delete', danger: true });
    if (!ok) return;
    Store.state.records = Store.state.records.filter(x => x.id !== r.id);
    Store.save();
    audit('RECORD_DELETED', { patientId: r.patientId, detail: 'Deleted ' + r.title, severity: 'warning' });
    Fullscreen.close();
    Toast.success('Deleted', 'Record removed from timeline.');
    App.renderBody();
  }));
}

function openPatientUpload() {
  const pid = App.activePatientId();
  let step = 1, ocr = null;

  const renderBody = () => {
    const b = $('#up-body');
    if (!b) return;
    if (step === 1) {
      b.innerHTML = '<div class="steps"><div class="step is-active">1 · Select</div><div class="step">2 · Extract</div><div class="step">3 · Review</div></div>' +
        '<div class="dropzone" id="up-dz">' + icon('upload', 28) +
          '<div style="font-weight:600;margin-top:11px;font-size:14.5px">Choose a file</div>' +
          '<div class="small muted" style="margin-top:4px">PDF, JPG, PNG · 25 MB max</div>' +
          '<input type="file" id="up-fi" style="display:none" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" /></div>' +
        '<div class="section-title">Or try a sample</div>' +
        '<div style="display:flex;flex-direction:column;gap:9px">' +
          OCR.samples.map((s, i) => '<button class="btn" data-sample="' + i + '" style="justify-content:flex-start;text-align:left;padding:12px 14px">' +
            '<span class="record-ico record-ico--' + ((RECORD_TYPES[s.type] || {}).cls || 'prescription') + '" style="width:34px;height:34px">' + icon('file', 17) + '</span>' +
            '<span style="flex:1"><span style="display:block;font-weight:600;font-size:13.5px">' + esc(s.label) + '</span></span>' + icon('chevron', 16) + '</button>').join('') +
        '</div>';
      const dz = $('#up-dz', b), fi = $('#up-fi', b);
      dz.addEventListener('click', () => fi.click());
      fi.addEventListener('change', () => { if (fi.files[0]) run(fi.files[0].name, fi.files[0].size); });
      $$('[data-sample]', b).forEach(btn => btn.addEventListener('click', () => {
        const s = OCR.samples[+btn.dataset.sample]; run(s.fileName, s.size);
      }));
    } else if (step === 2) {
      b.innerHTML = '<div class="steps"><div class="step is-done">1 · Select</div><div class="step is-active">2 · Extract</div><div class="step">3 · Review</div></div>' +
        '<div style="text-align:center;padding:26px 0">' +
        '<div class="spinner spinner--lg" style="margin:0 auto 18px"></div>' +
        '<div style="font-weight:600" id="up-stage">Processing…</div>' +
        '<div class="progress" style="margin-top:20px;max-width:300px;margin-left:auto;margin-right:auto"><div class="progress__bar" id="up-bar" style="width:0%"></div></div></div>';
    } else {
      const ex = ocr.extracted;
      b.innerHTML = '<div class="steps"><div class="step is-done">1 · Select</div><div class="step is-done">2 · Extract</div><div class="step is-active">3 · Review</div></div>' +
        '<div class="alert alert--success" style="margin-bottom:14px">' + icon('check', 18) + '<div><strong>Extraction complete.</strong> Review the fields below.</div></div>' +
        '<div class="field"><label for="up-title">Record title</label><input class="input" id="up-title" value="' + esc(ocr.sample.label) + '" /></div>' +
        '<div class="field"><label for="up-type">Type</label><select class="select" id="up-type">' +
          Object.keys(RECORD_TYPES).map(t => '<option value="' + t + '"' + (ocr.type === t ? ' selected' : '') + '>' + esc(RECORD_TYPES[t].label) + '</option>').join('') +
        '</select></div>' +
        '<div class="field"><label for="up-date">Date</label><input class="input" type="date" id="up-date" value="' + esc(ex.date || todayISO()) + '" /></div>' +
        '<div class="field"><label for="up-facility">Facility</label><input class="input" id="up-facility" value="' + esc(ex.facility || '') + '" /></div>' +
        '<div class="field"><label for="up-doctor">Clinician</label><input class="input" id="up-doctor" value="' + esc(ex.doctor || '') + '" /></div>' +
        '<div class="field"><label for="up-diagnosis">Diagnosis</label><input class="input" id="up-diagnosis" value="' + esc(ex.diagnosis || '') + '" /></div>' +
        '<div class="field"><label for="up-meds">Medications (one per line)</label><textarea class="textarea" id="up-meds">' + esc((ex.medications || []).join('\n')) + '</textarea></div>' +
        '<div class="field"><label for="up-results">Results</label><input class="input" id="up-results" value="' + esc(ex.results || ex.vitals || '') + '" /></div>' +
        '<div class="field"><label for="up-advice">Advice</label><textarea class="textarea" id="up-advice">' + esc(ex.advice || '') + '</textarea></div>' +
        '<button class="btn btn--primary btn--block" id="up-save">' + icon('check', 17) + ' Save to record</button>';
      $('#up-save').addEventListener('click', () => {
        const meds = $('#up-meds').value.split('\n').map(s => s.trim()).filter(Boolean);
        const rec = {
          id: uid('r'), patientId: pid, type: $('#up-type').value,
          title: $('#up-title').value.trim() || 'Untitled',
          date: $('#up-date').value || todayISO(),
          facilityId: null,
          facilityName: $('#up-facility').value.trim() || 'Self-uploaded document',
          doctor: $('#up-doctor').value.trim(), source: 'patient-upload',
          fileName: ocr.fileName, size: ocr.size,
          summary: $('#up-diagnosis').value.trim() || 'Uploaded by patient.',
          extracted: { diagnosis: $('#up-diagnosis').value.trim(), medications: meds, results: $('#up-results').value.trim(), advice: $('#up-advice').value.trim() },
          tags: ['patient-upload'], createdAt: nowISO()
        };
        Store.state.records.unshift(rec); Store.save();
        audit('RECORD_UPLOADED', { patientId: pid, detail: 'Patient uploaded "' + rec.title + '"' });
        Sheet.close();
        Toast.success('Saved', 'Record added to your timeline.');
        App.renderBody();
      });
    }
  };

  function run(fileName, size) {
    step = 2; renderBody();
    OCR.simulate(fileName, size, (p, s) => {
      const bar = $('#up-bar'), st = $('#up-stage');
      if (bar) bar.style.width = p + '%';
      if (st) st.textContent = s;
    }).then(res => { ocr = res; step = 3; renderBody(); });
  }

  Sheet.open({ title: 'Upload a record', body: '<div id="up-body"></div>' });
  renderBody();
}

function openGrantConsent(editId) {
  const pid = App.activePatientId();
  const existing = editId ? Store.state.consents.find(c => c.id === editId) : null;
  const providers = Store.state.providers;

  const body = '<form id="cn-form" novalidate>' +
    '<div class="field"><label for="cn-provider">Provider <span class="req">*</span></label>' +
      '<select class="select" id="cn-provider"' + (existing ? ' disabled' : '') + '><option value="">Select…</option>' +
      providers.map(p => {
        const f = Store.facility(p.facilityId);
        return '<option value="' + p.id + '"' + (existing && existing.providerId === p.id ? ' selected' : '') + '>' + esc(p.name + ' — ' + p.specialty + (f ? ' · ' + f.name : '')) + '</option>';
      }).join('') + '</select><div class="err hidden" id="e-cn-provider"></div></div>' +
    '<div class="field"><label>Record types <span class="req">*</span></label>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px" id="cn-types">' +
        Object.keys(RECORD_TYPES).map(t => {
          const on = existing ? existing.recordTypes.includes(t) : true;
          return '<label class="check' + (on ? ' is-on' : '') + '"><input type="checkbox" value="' + t + '"' + (on ? ' checked' : '') + ' /><span>' + esc(RECORD_TYPES[t].label) + '</span></label>';
        }).join('') + '</div><div class="err hidden" id="e-cn-types"></div>' +
      '<div class="hint">Grant the minimum necessary.</div></div>' +
    '<div class="field"><label for="cn-purpose">Purpose <span class="req">*</span></label>' +
      '<input class="input" id="cn-purpose" value="' + esc(existing ? existing.purpose : '') + '" placeholder="e.g. Ongoing treatment" /><div class="err hidden" id="e-cn-purpose"></div></div>' +
    '<div class="field"><label for="cn-duration">Duration</label><select class="select" id="cn-duration">' +
      '<option value="30">30 days</option><option value="90" selected>90 days</option><option value="180">180 days</option><option value="365">1 year</option></select></div>' +
  '</form>';

  const root = Sheet.open({
    title: existing ? 'Edit consent' : 'Grant consent',
    body: body,
    footer: '<button class="btn" data-sheet-close>Cancel</button><button class="btn btn--primary" id="cn-submit">' + (existing ? 'Save' : 'Grant') + '</button>'
  });

  $$('#cn-types .check input', root).forEach(i => i.addEventListener('change', () => i.closest('.check').classList.toggle('is-on', i.checked)));

  $('#cn-submit', root).addEventListener('click', () => {
    const showErr = (id, m) => { const el = $(id, root); if (m) { el.innerHTML = icon('alert', 13) + '<span>' + esc(m) + '</span>'; el.classList.remove('hidden'); } else el.classList.add('hidden'); };
    ['#e-cn-provider', '#e-cn-types', '#e-cn-purpose'].forEach(i => showErr(i, ''));
    const pvId = $('#cn-provider', root).value;
    const types = $$('#cn-types input:checked', root).map(i => i.value);
    const purpose = $('#cn-purpose', root).value.trim();
    let bad = false;
    if (!pvId) { showErr('#e-cn-provider', 'Select a provider.'); bad = true; }
    if (!types.length) { showErr('#e-cn-types', 'Select at least one type.'); bad = true; }
    if (!purpose) { showErr('#e-cn-purpose', 'Purpose required.'); bad = true; }
    if (bad) return;

    const pv = Store.provider(pvId);
    const fac = Store.facility(pv.facilityId);
    const days = parseInt($('#cn-duration', root).value, 10);

    if (existing) {
      existing.recordTypes = types; existing.purpose = purpose; existing.expiresAt = daysFromNow(days); existing.status = 'active';
      Store.save();
      audit('CONSENT_UPDATED', { patientId: pid, detail: 'Consent updated for ' + pv.name });
      Toast.success('Updated', 'Changes take effect immediately.');
    } else {
      Store.state.consents.unshift({
        id: uid('c'), patientId: pid, providerId: pv.id, providerName: pv.name,
        facilityId: pv.facilityId, facilityName: fac ? fac.name + ', ' + fac.city : '',
        recordTypes: types, purpose, status: 'active', grantedAt: nowISO(), expiresAt: daysFromNow(days), requestedBy: 'patient'
      });
      Store.save();
      audit('CONSENT_GRANTED', { patientId: pid, detail: 'Consent granted to ' + pv.name });
      Toast.success('Consent granted', pv.name + ' now has access.');
    }
    Sheet.close();
    App.renderBody();
  });
}

function openAddCaregiver() {
  const pid = App.activePatientId();
  const body = '<div class="alert alert--info" style="margin-bottom:16px">' + icon('users', 18) +
    '<div>A caregiver can view records, upload documents and keep the emergency profile current. All actions are logged.</div></div>' +
    '<form id="cg-form" novalidate>' +
      '<div class="field"><label for="cg-name">Full name <span class="req">*</span></label><input class="input" id="cg-name" /><div class="err hidden" id="e-cg-name"></div></div>' +
      '<div class="field"><label for="cg-email">Email <span class="req">*</span></label><input class="input" type="email" id="cg-email" /><div class="err hidden" id="e-cg-email"></div></div>' +
      '<div class="field"><label for="cg-rel">Relationship <span class="req">*</span></label><input class="input" id="cg-rel" placeholder="e.g. Spouse, Daughter" /><div class="err hidden" id="e-cg-rel"></div></div>' +
      '<div class="field"><label>Permissions</label>' +
        '<div style="display:flex;flex-direction:column;gap:8px">' +
          [['view', 'View records'], ['upload', 'Upload documents'], ['manage-emergency', 'Manage emergency profile']]
            .map(p => '<label class="check is-on"><input type="checkbox" value="' + p[0] + '" checked /><span>' + esc(p[1]) + '</span></label>').join('') +
        '</div></div>' +
    '</form>';

  const root = Sheet.open({
    title: 'Invite caregiver',
    body: body,
    footer: '<button class="btn" data-sheet-close>Cancel</button><button class="btn btn--primary" id="cg-submit">Send invite</button>'
  });

  $$('.check input', root).forEach(i => i.addEventListener('change', () => i.closest('.check').classList.toggle('is-on', i.checked)));

  $('#cg-submit', root).addEventListener('click', () => {
    const showErr = (id, m) => { const el = $(id, root); if (m) { el.innerHTML = icon('alert', 13) + '<span>' + esc(m) + '</span>'; el.classList.remove('hidden'); } else el.classList.add('hidden'); };
    ['#e-cg-name', '#e-cg-email', '#e-cg-rel'].forEach(i => showErr(i, ''));
    const name = $('#cg-name', root).value.trim();
    const email = $('#cg-email', root).value.trim();
    const rel = $('#cg-rel', root).value.trim();
    const perms = $$('.check input:checked', root).map(i => i.value);
    let bad = false;
    if (!name) { showErr('#e-cg-name', 'Name required.'); bad = true; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showErr('#e-cg-email', 'Valid email required.'); bad = true; }
    if (!rel) { showErr('#e-cg-rel', 'Relationship required.'); bad = true; }
    if (bad) return;

    let u = Store.userByEmail(email);
    if (!u) {
      u = { id: uid('u'), email, password: 'demo123', name, role: 'caregiver', patientIds: [], active: true, createdAt: nowISO() };
      Store.state.users.push(u);
    }
    if (!u.patientIds) u.patientIds = [];
    if (!u.patientIds.includes(pid)) u.patientIds.push(pid);
    Store.state.caregiverLinks.push({ id: uid('cg'), patientId: pid, userId: u.id, name, relation: rel, permissions: perms.length ? perms : ['view'], status: 'active', linkedAt: nowISO() });
    Store.save();
    audit('CAREGIVER_LINKED', { patientId: pid, detail: 'Caregiver ' + name + ' linked' });
    Sheet.close();
    Toast.success('Caregiver invited', name + ' can now help manage this record.');
    App.renderBody();
  });
}

/* ---- Caregiver: mirrors patient with a Patients tab ---- */
Screens.caregiver = Object.assign({}, Screens.patient);
Screens.caregiver.bind = Object.assign({}, Screens.patient.bind, {
  patients: function (root) {
    $$('[data-switch-patient]', root).forEach(b => b.addEventListener('click', () => {
      App.actingPatientId = b.dataset.switchPatient;
      Toast.info('Switched patient', 'Now viewing ' + Store.patient(App.actingPatientId).name + "'s record.");
      App.go('home');
    }));
  }
});
Screens.caregiver.patients = Screens.patient.patients;
Screens.caregiver.share = Screens.patient.share;
Screens.caregiver.profile = Screens.patient.profile;
Screens.caregiver.timeline = Screens.patient.timeline;
