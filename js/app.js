/* ============================================================
   app.js — App controller, role/tab registry, shared helpers
   ============================================================ */

const TABS = {
  patient: [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'timeline', label: 'Timeline', icon: 'timeline' },
    { id: 'records', label: 'Records', icon: 'records' },
    { id: 'share', label: 'Share', icon: 'shield' },
    { id: 'profile', label: 'Profile', icon: 'user' }
  ],
  caregiver: [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'patients', label: 'Patients', icon: 'users' },
    { id: 'timeline', label: 'Timeline', icon: 'timeline' },
    { id: 'share', label: 'Share', icon: 'shield' },
    { id: 'profile', label: 'Profile', icon: 'user' }
  ],
  provider: [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'lookup', label: 'Lookup', icon: 'search' },
    { id: 'assisted', label: 'Link', icon: 'link', cta: true },
    { id: 'patients', label: 'Patients', icon: 'users' },
    { id: 'profile', label: 'Profile', icon: 'user' }
  ],
  admin: [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'users', label: 'Users', icon: 'users' },
    { id: 'breakglass', label: 'Alerts', icon: 'alert' },
    { id: 'audit', label: 'Audit', icon: 'scroll' },
    { id: 'profile', label: 'Profile', icon: 'user' }
  ],
  emergency: [
    { id: 'emergency', label: 'Emergency', icon: 'alert' },
    { id: 'timeline', label: 'Timeline', icon: 'timeline' },
    { id: 'profile', label: 'Session', icon: 'user' }
  ]
};

/* Screen registry. Individual files populate Screens.auth / .patient / etc. */
const Screens = { auth: {}, patient: {}, caregiver: {}, provider: {}, admin: {}, emergency: {} };

const App = {
  tab: 'home',
  subScreen: null,
  actingPatientId: null,
  wizard: null,
  aiSummary: null,
  filters: {},
  stack: [],

  actor() {
    if (!Session.data) return { name: 'Guest', role: 'guest' };
    if (Session.data.breakGlass) return { name: Session.data.responderName, role: 'emergency' };
    const u = Store.user(Session.data.userId);
    return u ? { name: u.name, role: u.role } : { name: 'Unknown', role: 'guest' };
  },
  currentUser() { return Session.data ? Store.user(Session.data.userId) : null; },
  role() { return Session.data ? Session.data.role : null; },
  activePatientId() {
    if (Session.data && Session.data.breakGlass) return Session.data.patientId;
    const u = this.currentUser();
    if (!u) return null;
    if (u.role === 'patient') return u.patientId;
    if (u.role === 'caregiver') return this.actingPatientId || (u.patientIds || [])[0] || null;
    if (u.role === 'provider') return this.actingPatientId || null;
    return this.actingPatientId || null;
  },
  currentProvider() {
    const u = this.currentUser();
    return u && u.providerId ? Store.provider(u.providerId) : null;
  },

  render() {
    if (this.expireEmergencySession()) return;
    if (!Session.data) { this.renderAuth(); return; }
    this.renderShell();
  },

  renderAuth() {
    const root = $('#root');
    root.innerHTML = Screens.auth.login();
    bindAuth(root);
  },

  renderShell() {
    const role = this.role();
    const tabs = TABS[role] || TABS.patient;
    if (!tabs.find(t => t.id === this.tab)) { this.tab = tabs[0].id; this.subScreen = null; }

    const root = $('#root');
    root.innerHTML = '<div class="app">' +
      '<div class="status-bar"></div>' +
      '<div class="app-header" id="app-header"></div>' +
      '<div class="app-body" id="app-body"></div>' +
      '<nav class="tabbar" id="tabbar">' + this.renderTabs(tabs) + '</nav>' +
    '</div>';

    this.renderHeader();
    this.renderBody();
    this.bindTabs();
  },

  renderTabs(tabs) {
    return tabs.map(t => {
      let badge = '';
      if (t.id === 'breakglass') {
        const n = Store.state.breakGlass.filter(b => b.status === 'pending').length;
        if (n) badge = '<span class="badge">' + n + '</span>';
      }
      if (t.cta) {
        return '<button class="tabbar__item tabbar__item--cta' + (this.tab === t.id ? ' is-active' : '') + '" data-tab="' + t.id + '">' +
          '<span class="tabbar__icon-wrap">' + icon(t.icon, 22) + '</span><span>' + esc(t.label) + '</span></button>';
      }
      return '<button class="tabbar__item' + (this.tab === t.id ? ' is-active' : '') + '" data-tab="' + t.id + '">' +
        icon(t.icon, 22) + '<span>' + esc(t.label) + '</span>' + badge + '</button>';
    }).join('');
  },

  bindTabs() {
    $$('[data-tab]').forEach(b => b.addEventListener('click', () => this.go(b.dataset.tab)));
  },

  go(tab) {
    const role = this.role();
    const tabs = TABS[role] || TABS.patient;
    if (tab !== 'assistant' && this.subScreen === 'assistant' && this.assistantState) this.assistantState.openLogged = false;
    if (tabs.find(t => t.id === tab)) {
      this.tab = tab;
      this.subScreen = null;
    } else {
      this.subScreen = tab;
    }
    if (tab !== 'home') this.aiSummary = null;
    if (tab !== 'medical-id') this.medicalIdExpired = null;
    this.filters = {};
    this.render();
  },

  renderHeader() {
    const h = $('#app-header');
    const role = this.role();
    const view = this.currentView();
    const title = view.title || '';
    const unread = (role === 'patient' || role === 'caregiver')
      ? Store.notificationsFor(this.activePatientId()).filter(n => !n.read).length
      : 0;
    const right = [];

    if (view.back) {
      h.innerHTML = '<button class="app-header__back" data-nav-back>' + icon('chevronLeft', 22) + '</button>' +
        '<div class="app-header__title">' + esc(title) + '</div>' +
        '<div class="app-header__actions" id="header-actions"></div>';
      $('[data-nav-back]').addEventListener('click', () => this.goBack());
    } else {
      let subtitle = '';
      if (role === 'caregiver') {
        const p = Store.patient(this.activePatientId());
        if (p) subtitle = p.name;
      }
      h.innerHTML = '<div class="app-header__title">' + esc(title) +
        (subtitle ? '<div style="font-size:11.5px;color:var(--muted);font-weight:500;letter-spacing:0;margin-top:1px">' + esc(subtitle) + '</div>' : '') +
        '</div>' +
        '<div class="app-header__actions" id="header-actions"></div>';

      if (role === 'caregiver') {
        right.push('<button class="app-header__btn" data-header="switch" aria-label="Switch patient">' + icon('users', 20) + '</button>');
      }
      if (role === 'patient' || role === 'caregiver') {
        right.push('<button class="app-header__btn" data-header="notifications" aria-label="Notifications">' + icon('bell', 20) + (unread ? '<span class="dot"></span>' : '') + '</button>');
      }
      right.push('<button class="app-header__avatar" data-header="menu" aria-label="Account">' + esc(initials(this.actor().name)) + '</button>');
      $('#header-actions').innerHTML = right.join('');

      $$('[data-header]').forEach(b => b.addEventListener('click', e => {
        e.stopPropagation();
        const a = b.dataset.header;
        if (a === 'notifications') this.openNotifications();
        if (a === 'menu') this.openAccountMenu();
        if (a === 'switch') this.openPatientSwitcher();
      }));
    }
  },

  currentView() {
    const role = this.role();
    const tab = this.subScreen || this.tab;
    const map = {
      patient: {
        home: { title: 'Home' },
        timeline: { title: 'Timeline' },
        records: { title: 'Records' },
        share: { title: 'Share' },
        profile: { title: 'Profile' },
        consents: { title: 'Consents', back: true },
        caregivers: { title: 'Caregivers', back: true },
        emergency: { title: 'Emergency Profile', back: true },
        audit: { title: 'Access Log', back: true },
        'medical-id': { title: 'Medical ID', back: true },
        reminders: { title: 'Reminders', back: true },
        patients: { title: 'My Patients' },
        assistant: { title: 'AI Assistant', back: true }
      },
      provider: {
        home: { title: 'MedVault' },
        lookup: { title: 'Patient Lookup' },
        assisted: { title: 'Assisted Linking', back: true },
        patients: { title: 'My Patients' },
        profile: { title: 'Profile' },
        consent: { title: 'Consent Requests', back: true },
        record: { title: 'Patient Record', back: true },
        audit: { title: 'Activity Log', back: true },
        assistant: { title: 'AI Assistant', back: true }
      },
      admin: {
        home: { title: 'MedVault Admin' },
        users: { title: 'Users' },
        breakglass: { title: 'Break-Glass Review' },
        audit: { title: 'Audit Trail' },
        profile: { title: 'Profile' },
        facilities: { title: 'Facilities', back: true }
      },
      emergency: {
        emergency: { title: 'Emergency Record' },
        timeline: { title: 'Recent Records', back: true },
        profile: { title: 'Session' },
        assistant: { title: 'AI Assistant', back: true }
      }
    };
    const roleMap = map[role] || map.patient;
    return roleMap[tab] || { title: 'MedVault' };
  },

  renderBody() {
    const body = $('#app-body');
    const role = this.role();
    const screenId = this.subScreen || this.tab;
    const screen = Screens[role] && Screens[role][screenId];
    if (screen) {
      body.innerHTML = screen();
      const binder = Screens[role].bind && Screens[role].bind[screenId];
      if (binder) binder(body);
    } else {
      body.innerHTML = '<div class="screen">' + emptyState('Coming soon', 'This screen is not available.') + '</div>';
    }
  },

  goBack() {
    const role = this.role();
    const backMap = {
      patient: { consents: 'share', caregivers: 'share', emergency: 'profile', audit: 'profile', 'medical-id': 'home', reminders: 'profile', patients: 'home', assistant: 'home' },
      caregiver: { consents: 'share', caregivers: 'share', emergency: 'profile', audit: 'profile', 'medical-id': 'home', reminders: 'profile', patients: 'home', assistant: 'home' },
      provider: { assisted: 'home', consent: 'patients', record: 'patients', audit: 'profile', assistant: 'record' },
      admin: { facilities: 'home' },
      emergency: { assistant: 'emergency' }
    };
    const key = this.subScreen || this.tab;
    const target = (backMap[role] || {})[key] || 'home';
    if (key === 'assistant' && this.assistantState) this.assistantState.openLogged = false;
    this.subScreen = null;
    this.go(target);
  },

  openNotifications() {
    const pid = this.activePatientId();
    const list = Store.notificationsFor(pid);
    const body = list.length ? list.map(n => {
      const ic = n.type === 'emergency' ? 'alert' : n.type === 'consent' ? 'shield' : n.type === 'access' ? 'eye' : n.type === 'reminder' ? 'bell' : 'records';
      const col = n.type === 'emergency' ? 'background:var(--red-50);color:#b91c1c' : n.type === 'consent' || n.type === 'reminder' ? 'background:var(--amber-50);color:var(--amber)' : '';
      return '<div class="list-item" data-notif="' + esc(n.id) + '" style="' + (n.read ? '' : 'background:#f7f8ff') + '">' +
        '<span class="list-item__ico" style="' + col + '">' + icon(ic, 18) + '</span>' +
        '<div class="list-item__body"><div class="list-item__title">' + esc(n.title) + '</div>' +
        '<div class="list-item__sub" style="white-space:normal">' + esc(n.body) + '</div>' +
        '<div class="list-item__meta">' + esc(timeAgo(n.ts)) + '</div></div></div>';
    }).join('') : emptyState('No notifications', 'Updates about new records and access will appear here.');

    Sheet.open({
      title: 'Notifications',
      body: '<div style="margin:-4px -4px 0">' + body + '</div>',
      footer: list.some(n => !n.read) ? '<button class="btn" data-mark-all>Mark all read</button>' : ''
    });

    $$('[data-notif]').forEach(el => el.addEventListener('click', () => {
      const n = Store.state.notifications.find(x => x.id === el.dataset.notif);
      if (n) { n.read = true; Store.save(); }
      Sheet.close();
      if (n && n.type === 'record') this.go('timeline');
      else if (n && n.type === 'consent') this.go('share');
      else if (n && n.type === 'emergency') this.go('profile');
      else if (n && n.type === 'reminder') this.go('reminders');
      this.renderHeader();
    }));
    const ma = $('[data-mark-all]');
    if (ma) ma.addEventListener('click', () => {
      Store.state.notifications.forEach(n => { if (n.patientId === pid) n.read = true; });
      Store.save(); Sheet.close(); this.renderHeader();
      Toast.info('Marked as read', 'All notifications marked as read.');
    });
  },

  openAccountMenu() {
    const a = this.actor();
    const role = this.role();
    const dark = document.documentElement.dataset.theme === 'dark';
    const body = '<div style="padding:6px 0 16px;display:flex;gap:13px;align-items:center">' +
      '<div class="avatar avatar--lg">' + esc(initials(a.name)) + '</div>' +
      '<div style="flex:1;min-width:0"><div style="font-weight:700;font-size:15px">' + esc(a.name) + '</div>' +
      '<div class="small muted">' + esc(roleLabel(role)) + (Session.data.breakGlass ? '' : ' · ' + esc((this.currentUser() || {}).email || '')) + '</div></div>' +
    '</div>' +
    '<button type="button" class="theme-choice" data-theme-toggle aria-pressed="' + dark + '">' +
      '<span class="theme-choice__icon" aria-hidden="true">' + (dark ? '☾' : '☼') + '</span>' +
      '<span class="theme-choice__copy"><strong>Appearance</strong><small>' + (dark ? 'Midnight Glass' : 'Light Mode') + '</small></span>' +
      '<span class="theme-switch' + (dark ? ' is-on' : '') + '" aria-hidden="true"><i></i></span>' +
    '</button>' +
    '<div style="height:14px"></div>' +
    '<div class="list" style="margin-bottom:14px">' +
      '<div class="list-item" data-menu="reset"><span class="list-item__ico" style="background:#f1f3f8;color:var(--muted)">' + icon('refresh', 18) + '</span>' +
      '<div class="list-item__body"><div class="list-item__title">Reset demo data</div><div class="list-item__sub">Restore the seeded prototype state</div></div></div>' +
    '</div>' +
    '<button class="btn btn--danger btn--block" data-menu="logout">' + icon('logout', 18) + ' Sign out</button>';

    Sheet.open({ title: 'Account', body: body, footer: '' });

    const themeToggle = $('[data-theme-toggle]');
    if (themeToggle) themeToggle.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      const themeColor = $('meta[name="theme-color"]');
      if (themeColor) themeColor.content = next === 'dark' ? '#080c17' : '#f3f6fb';
      try { localStorage.setItem('medvault-theme', next); } catch (_) {}
      Sheet.close();
      this.openAccountMenu();
    });

    $$('[data-menu="logout"]').forEach(b => b.addEventListener('click', () => { Sheet.close(); this.logout(); }));
    $$('[data-menu="reset"]').forEach(b => b.addEventListener('click', async () => {
      Sheet.close();
      const ok = await Sheet.confirm({ title: 'Reset demo data?', message: 'This restores the original sample patients, records, consents and audit events.', okLabel: 'Reset', danger: true });
      if (ok) { Store.reset(); FileStore.clear(); Session.clear(); Toast.success('Demo reset', 'Restored to the seeded state.'); this.render(); }
    }));
  },

  openPatientSwitcher() {
    const u = this.currentUser();
    const pts = (u.patientIds || []).map(id => Store.patient(id)).filter(Boolean);
    const body = pts.map(p => {
      const active = this.activePatientId() === p.id;
      return '<div class="list-item" data-sw="' + esc(p.id) + '" style="' + (active ? 'background:var(--indigo-50)' : '') + '">' +
        '<span class="avatar">' + esc(initials(p.name)) + '</span>' +
        '<div class="list-item__body"><div class="list-item__title">' + esc(p.name) + '</div>' +
        '<div class="list-item__sub mono">' + esc(p.medvaultId) + '</div></div>' +
        (active ? '<span style="color:var(--indigo);align-self:center">' + icon('check', 20) + '</span>' : '') + '</div>';
    }).join('');
    Sheet.open({ title: 'Switch patient', body: body });
    $$('[data-sw]').forEach(b => b.addEventListener('click', () => {
      this.actingPatientId = b.dataset.sw;
      Sheet.close();
      Toast.info('Switched patient', 'Now viewing ' + Store.patient(this.actingPatientId).name + "'s record.");
      this.render();
    }));
  },

  /* Break-glass sessions end automatically after 30 minutes. */
  expireEmergencySession() {
    if (!EmergencyAccess.sessionExpired(Session.data)) return false;
    audit('BREAK_GLASS_SESSION_EXPIRED', { patientId: Session.data.patientId, detail: 'Emergency session ended after 30 minutes', severity: 'warning' });
    Session.clear();
    this.tab = 'home'; this.subScreen = null; this.assistantState = null;
    Sheet.close(); Fullscreen.close();
    this.renderAuth();
    Toast.warn('Emergency session ended', 'Break-glass sessions last 30 minutes. A new code is needed to continue.');
    return true;
  },

  logout() {
    audit('USER_LOGOUT', { detail: 'Session ended' });
    Session.clear();
    this.tab = 'home';
    this.subScreen = null;
    this.actingPatientId = null;
    this.wizard = null;
    this.aiSummary = null;
    this.render();
    Toast.info('Signed out', 'You have been securely signed out.');
  },

  start() {
    Store.load();
    if (Session.restore()) this.render();
    else this.renderAuth();
    if (typeof ReminderEngine !== 'undefined') ReminderEngine.start();
    setInterval(() => this.expireEmergencySession(), 15000);
    // A scanned emergency QR opens the app at #emergency=CODE.
    const handleLink = () => {
      const code = /(?:^|[#&])emergency=([A-Za-z0-9-]+)/.exec(location.hash);
      if (!code) return;
      history.replaceState(null, '', location.pathname + location.search);
      if (!Session.data) openBreakGlass(code[1]);
      else Toast.info('Emergency code ignored', 'Sign out first to use an emergency code on this device.');
    };
    handleLink();
    window.addEventListener('hashchange', handleLink);
  }
};

/* ---------- shared helpers used by screens ---------- */

function roleLabel(role) {
  return ({
    patient: 'Patient',
    caregiver: 'Caregiver',
    provider: 'Healthcare Provider',
    admin: 'Administrator',
    emergency: 'Emergency Responder'
  })[role] || role;
}

function emptyState(title, msg, action) {
  return '<div class="empty"><div class="empty__ico">' + icon('search', 26) + '</div><h4>' + esc(title) + '</h4><p>' + esc(msg || '') + '</p>' + (action || '') + '</div>';
}

function badgeFor(status) {
  const map = {
    active: ['badge--teal', 'Active'], revoked: ['badge--red', 'Revoked'],
    pending: ['badge--amber', 'Pending'], expired: ['badge--gray', 'Expired'],
    reviewed: ['badge--teal', 'Reviewed'], flagged: ['badge--red', 'Flagged'],
    info: ['badge--gray', 'Info'], warning: ['badge--amber', 'Warning'], critical: ['badge--red', 'Critical']
  };
  const m = map[status] || ['badge--gray', status];
  return '<span class="badge ' + m[0] + '">' + esc(m[1]) + '</span>';
}
