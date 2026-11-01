/* ============================================================
   store.js — persistence, session, audit + notify helpers
   ============================================================ */

const LS_KEY = 'medvault.mobile.db.v1';
const SS_KEY = 'medvault.mobile.session.v1';
const DEMO_RX_MIGRATION = 'demo-prescription-timeline-2026-10';
const DEMO_RX_TIMELINE_V2 = 'demo-prescription-timeline-expanded-2026-10';

const Store = {
  state: null,
  load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p && p.version === 1) {
          // Add the expanded demo timeline once, while preserving uploaded records,
          // local edits, notifications, and all other existing store data.
          p.records = Array.isArray(p.records) ? p.records : [];
          p.migrations = Array.isArray(p.migrations) ? p.migrations : [];
          const hadReminders = Array.isArray(p.reminders);
          p.reminders = hadReminders ? p.reminders : [];
          const demoRecords = seedDatabase().records;
          const migrations = [
            { id: DEMO_RX_MIGRATION, recordIds: ['r11', 'r12', 'r13'] },
            { id: DEMO_RX_TIMELINE_V2, recordIds: Array.from({ length: 20 }, (_, i) => `r${i + 14}`) }
          ];
          let changed = false;
          migrations.forEach(migration => {
            if (p.migrations.includes(migration.id)) return;
            const existingIds = new Set(p.records.map(record => record.id));
            p.records.push(...demoRecords.filter(record =>
              migration.recordIds.includes(record.id) && !existingIds.has(record.id)
            ));
            p.migrations.push(migration.id);
            changed = true;
          });
          this.state = p;
          if (changed || !hadReminders) this.save();
          return;
        }
      }
    } catch (e) {}
    this.state = seedDatabase();
    this.save();
  },
  save() { try { localStorage.setItem(LS_KEY, JSON.stringify(this.state)); } catch (e) {} },
  reset() {
    localStorage.removeItem(LS_KEY);
    sessionStorage.removeItem(SS_KEY);
    this.state = seedDatabase();
    this.save();
  },
  patient(id) { return this.state.patients.find(p => p.id === id) || null; },
  user(id) { return this.state.users.find(u => u.id === id) || null; },
  userByEmail(e) { return this.state.users.find(u => u.email.toLowerCase() === String(e).toLowerCase()) || null; },
  provider(id) { return this.state.providers.find(p => p.id === id) || null; },
  facility(id) { return this.state.facilities.find(f => f.id === id) || null; },
  recordsFor(pid) { return this.state.records.filter(r => r.patientId === pid).sort(byDateDesc); },
  consentsFor(pid) { return this.state.consents.filter(c => c.patientId === pid); },
  auditFor(pid) { return this.state.audit.filter(a => a.patientId === pid); },
  notificationsFor(pid) { return this.state.notifications.filter(n => n.patientId === pid).sort((a, b) => new Date(b.ts) - new Date(a.ts)); },
  caregiversFor(pid) { return this.state.caregiverLinks.filter(c => c.patientId === pid); }
};

function audit(action, opts) {
  opts = opts || {};
  const actor = opts.actor || App.actor();
  Store.state.audit.unshift({
    id: uid('a'),
    ts: nowISO(),
    actor: actor.name,
    actorRole: actor.role,
    action: action,
    patientId: opts.patientId || null,
    detail: opts.detail || '',
    severity: opts.severity || 'info'
  });
  Store.save();
}

function notify(pid, title, body, type) {
  Store.state.notifications.unshift({
    id: uid('n'), ts: nowISO(), patientId: pid,
    title, body, read: false, type: type || 'record'
  });
  Store.save();
}

const Session = {
  data: null,
  start(user, extra) {
    this.data = Object.assign({ userId: user.id, role: user.role, loginAt: nowISO() }, extra || {});
    try { sessionStorage.setItem(SS_KEY, JSON.stringify(this.data)); } catch (e) {}
  },
  restore() {
    try {
      const r = sessionStorage.getItem(SS_KEY);
      if (r) { this.data = JSON.parse(r); return true; }
    } catch (e) {}
    return false;
  },
  clear() {
    this.data = null;
    try { sessionStorage.removeItem(SS_KEY); } catch (e) {}
  }
};
