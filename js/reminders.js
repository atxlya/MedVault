/* ============================================================
   reminders.js — patient-specific appointment, checkup and medicine alerts
   ============================================================ */

/* Device (system) notifications. They only fire while MedVault is open in a
   tab: there is no service worker or push server. When they are unsupported,
   blocked or turned off, reminders fall back to an in-app banner plus the
   bell menu. */
const DeviceNotify = {
  PREF_KEY: 'medvault.deviceNotifications.v1',
  supported() { return typeof window !== 'undefined' && 'Notification' in window && window.isSecureContext !== false; },
  permission() { return this.supported() ? Notification.permission : 'unsupported'; },
  wanted() { try { return localStorage.getItem(this.PREF_KEY) === 'on'; } catch (_) { return false; } },
  setWanted(on) { try { localStorage.setItem(this.PREF_KEY, on ? 'on' : 'off'); } catch (_) {} },
  active() { return this.permission() === 'granted' && this.wanted(); },
  /* 'on' | 'off' | 'default' | 'denied' | 'unsupported' */
  state() {
    const p = this.permission();
    if (p === 'granted') return this.wanted() ? 'on' : 'off';
    return p;
  },
  async enable() {
    if (!this.supported()) return 'unsupported';
    let p = Notification.permission;
    if (p === 'default') { try { p = await Notification.requestPermission(); } catch (_) { p = Notification.permission; } }
    if (p === 'granted') this.setWanted(true);
    return p;
  },
  /* Returns true only if the system notification was actually created. */
  show(title, body, tag) {
    if (!this.active()) return false;
    try { new Notification(title, { body, tag, renotify: false }); return true; }
    catch (_) { return false; } // e.g. Android Chrome requires a service worker
  }
};

const ReminderEngine = {
  timer: null,
  localDay(date) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  },
  latestVisit(pid) {
    return Store.recordsFor(pid).find(r => r.type === 'prescription' || r.type === 'consultation-note') || null;
  },
  daysSince(isoDate) {
    const start = new Date(isoDate + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.max(0, Math.floor((today - start) / 86400000));
  },
  evaluate(pid) {
    if (!pid || !Store.state) return false;
    let added = false;
    const now = new Date();
    const reminders = (Store.state.reminders || []).filter(r => r.patientId === pid && r.active !== false);
    const alertOnce = (key, title, body) => {
      if (Store.state.notifications.some(n => n.reminderKey === key)) return;
      notify(pid, title, body, 'reminder');
      Store.state.notifications[0].reminderKey = key;
      Store.save(); added = true;
      const shown = DeviceNotify.show(title, body, key);
      Store.state.notifications[0].delivery = shown ? 'device+in-app' : 'in-app';
      Store.save();
      if (!shown) Toast.info(title, body); // in-app fallback
    };

    reminders.forEach(r => {
      if (r.kind === 'appointment' && r.scheduledAt && new Date(r.scheduledAt) <= now) {
        alertOnce('appointment:' + r.id, 'Appointment reminder', r.label + ' · scheduled for ' + fmtDateTime(r.scheduledAt) + '.');
      }
      if (r.kind === 'medicine' && r.time && r.time <= now.toTimeString().slice(0, 5)) {
        alertOnce('medicine:' + r.id + ':' + this.localDay(now), 'Medicine reminder', 'It’s time for ' + r.label + '. Follow the schedule provided by your care team.');
      }
    });

    const p = Store.patient(pid);
    const last = this.latestVisit(pid);
    if (p && last) {
      const threshold = Number(p.reminderPreferences && p.reminderPreferences.checkupIntervalDays) || 180;
      const elapsed = this.daysSince(last.date);
      if (elapsed >= threshold) {
        alertOnce('checkup:' + last.id + ':' + threshold, 'Checkup reminder', 'It has been ' + elapsed + ' days since your last recorded visit. If you have a follow-up planned, consider booking it.');
      }
    }
    return added;
  },
  start() {
    if (this.timer) clearInterval(this.timer);
    const check = () => {
      const pid = App.activePatientId();
      if (this.evaluate(pid) && Session.data && (App.role() === 'patient' || App.role() === 'caregiver')) App.renderHeader();
    };
    check();
    this.timer = setInterval(check, 60000);
  }
};

Screens.patient.reminders = function () {
  const pid = App.activePatientId();
  const p = Store.patient(pid);
  if (!p) return '<div class="screen">' + emptyState('No patient selected', 'Choose a patient record to manage reminders.') + '</div>';
  ReminderEngine.evaluate(pid);
  const reminders = (Store.state.reminders || []).filter(r => r.patientId === pid && r.active !== false);
  const now = new Date();
  const visits = reminders.filter(r => r.kind === 'appointment').sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  const medicines = reminders.filter(r => r.kind === 'medicine').sort((a, b) => a.time.localeCompare(b.time));
  const meds = (p.medications || []).filter(m => m && !/^none$/i.test(m.trim()));
  const canManage = App.role() === 'patient';
  const lastVisit = ReminderEngine.latestVisit(pid);
  const elapsed = lastVisit ? ReminderEngine.daysSince(lastVisit.date) : null;
  const threshold = Number(p.reminderPreferences && p.reminderPreferences.checkupIntervalDays) || 180;
  const due = elapsed !== null && elapsed >= threshold;
  const fmtWhen = iso => new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return '<div class="screen reminders-screen">' +
    '<section class="reminders-hero"><div class="reminders-hero__icon">' + icon('bell', 21) + '</div><div><h1>Reminders</h1><p>Appointments, checkups and your chosen medicine schedule.</p></div></section>' +
    '<div class="section-title">Device notifications</div>' +
    notifyCardHTML() +
    '<div class="section-title">Checkup follow-up</div>' +
    '<section class="card reminder-checkup"><div class="card__body">' +
      (lastVisit ? '<div class="reminder-checkup__row"><div><div class="reminder-checkup__title">' + (due ? 'A gentle check-in' : 'Last recorded visit') + '</div><div class="small muted">' + esc(lastVisit.title) + ' · ' + esc(fmtDate(lastVisit.date)) + '</div></div><span class="badge ' + (due ? 'badge--amber' : 'badge--teal') + '">' + (due ? elapsed + ' days ago' : elapsed + ' days ago') + '</span></div>' +
        '<p class="small muted" style="margin-top:11px">' + (due ? 'It has been a while since this visit. If you have a follow-up planned, consider booking it.' : 'We’ll gently remind you when your selected interval has passed.') + '</p>' : '<p class="small muted">No recent visit is recorded yet. Add a checkup date when you have one in your records.</p>') +
      '<div class="field" style="margin:15px 0 0"><label for="checkup-interval">Remind me after</label><select id="checkup-interval" class="select"' + (canManage ? '' : ' disabled') + '>' +
        [[90,'3 months'],[180,'6 months'],[365,'12 months']].map(x => '<option value="' + x[0] + '"' + (threshold === x[0] ? ' selected' : '') + '>' + x[1] + '</option>').join('') +
      '</select><div class="hint">This is a personal reminder interval, not medical advice. Follow-up timing should come from your care team.</div></div>' +
    '</div></section>' +
    '<div class="section-title">Appointments</div>' +
    (canManage ? '<form class="card reminder-form" id="appointment-reminder-form"><div class="card__body">' +
      '<div class="field"><label for="appointment-title">Appointment or checkup</label><input id="appointment-title" class="input" maxlength="100" placeholder="e.g. Eye checkup" required /></div>' +
      '<div class="reminder-form__grid"><div class="field"><label for="appointment-date">Date</label><input id="appointment-date" class="input" type="date" min="' + todayISO() + '" required /></div><div class="field"><label for="appointment-time">Time</label><input id="appointment-time" class="input" type="time" required /></div></div>' +
      '<button class="btn btn--primary btn--block" type="submit">' + icon('plus', 17) + ' Add appointment reminder</button>' +
    '</div></form>' : '') +
    (visits.length ? '<div class="list reminder-list">' + visits.map(r => '<div class="list-item reminder-list__item"><span class="list-item__ico reminder-icon--visit">' + icon('timeline', 19) + '</span><div class="list-item__body"><div class="list-item__title">' + esc(r.label) + '</div><div class="list-item__sub">' + esc(fmtWhen(r.scheduledAt)) + '</div></div>' + (canManage ? '<button class="btn btn--ghost btn--icon btn--sm" type="button" data-remove-reminder="' + esc(r.id) + '" aria-label="Remove ' + esc(r.label) + '">' + icon('x', 17) + '</button>' : '') + '</div>').join('') + '</div>' : '<div class="reminder-empty">No appointment reminders yet.</div>') +
    '<div class="section-title">Medicine reminders</div>' +
    (meds.length && canManage ? '<form class="card reminder-form" id="medicine-reminder-form"><div class="card__body">' +
      '<div class="field"><label for="medicine-name">Medicine from your record</label><select id="medicine-name" class="select" required><option value="">Choose a medicine</option>' + meds.map(m => '<option value="' + esc(m) + '">' + esc(m) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="medicine-time">Reminder time</label><input id="medicine-time" class="input" type="time" required /></div>' +
      '<p class="hint" style="margin:-3px 0 14px">Set one reminder for each time you want to be reminded. MedVault won’t change the medicine or its prescribed schedule.</p>' +
      '<button class="btn btn--primary btn--block" type="submit">' + icon('plus', 17) + ' Add daily reminder</button>' +
    '</div></form>' : (!meds.length ? '<div class="alert alert--info">' + icon('records', 18) + '<div>No medicines are listed in this patient profile. Add or update medicines through the existing medical-record workflow first.</div></div>' : '')) +
    (medicines.length ? '<div class="list reminder-list">' + medicines.map(r => '<div class="list-item reminder-list__item"><span class="list-item__ico reminder-icon--medicine">' + icon('activity', 19) + '</span><div class="list-item__body"><div class="list-item__title">' + esc(r.label) + '</div><div class="list-item__sub">Every day · ' + esc(r.time) + '</div></div>' + (canManage ? '<button class="btn btn--ghost btn--icon btn--sm" type="button" data-remove-reminder="' + esc(r.id) + '" aria-label="Remove ' + esc(r.label) + ' reminder">' + icon('x', 17) + '</button>' : '') + '</div>').join('') + '</div>' : '') +
    '<p class="reminders-note">Reminders are checked once a minute while MedVault is open in a tab. They are not delivered when the app is closed. Follow-up timing and medicine schedules should come from your care team.</p>' +
  '</div>';
};

function notifyCardHTML() {
  const st = DeviceNotify.state();
  const text = {
    on: ['On', 'badge--teal', 'Reminders also appear as notifications on this device while MedVault is open.'],
    off: ['Off', 'badge--gray', 'Allowed by your browser but turned off here. Reminders show inside MedVault only.'],
    default: ['Off', 'badge--gray', 'Turn on to get reminders as device notifications while MedVault is open. Your browser will ask for permission.'],
    denied: ['Blocked', 'badge--amber', 'Notifications are blocked in your browser settings. Reminders still appear as a banner and in the bell menu inside MedVault.'],
    unsupported: ['Unavailable', 'badge--gray', 'This browser cannot show device notifications here. Reminders still appear as a banner and in the bell menu inside MedVault.']
  }[st];
  const actions = st === 'default' || st === 'off' ? '<button class="btn btn--primary btn--sm" type="button" data-notify="enable">' + icon('bell', 15) + ' Turn on</button>'
    : st === 'on' ? '<button class="btn btn--sm" type="button" data-notify="test">Send test</button><button class="btn btn--ghost btn--sm" type="button" data-notify="disable">Turn off</button>'
    : '';
  return '<section class="card notify-card" id="notify-card"><div class="card__body">' +
    '<div class="notify-card__row"><strong>Notifications on this device</strong><span class="badge ' + text[1] + '" id="notify-state">' + text[0] + '</span></div>' +
    '<p class="small muted" style="margin-top:8px">' + text[2] + '</p>' +
    (actions ? '<div class="notify-card__actions">' + actions + '</div>' : '') +
  '</div></section>';
}

function bindReminders(root) {
  const pid = App.activePatientId();
  const p = Store.patient(pid);
  $$('[data-notify]', root).forEach(b => b.addEventListener('click', async () => {
    const a = b.dataset.notify;
    if (a === 'enable') {
      const res = await DeviceNotify.enable();
      if (res === 'granted') Toast.success('Notifications on', 'Reminders will also appear as device notifications while MedVault is open.');
      else if (res === 'denied') Toast.warn('Notifications blocked', 'Reminders will appear inside MedVault instead.');
      else if (res === 'unsupported') Toast.warn('Not available', 'Reminders will appear inside MedVault instead.');
      else Toast.info('Not turned on', 'Reminders will appear inside MedVault.');
    }
    if (a === 'disable') { DeviceNotify.setWanted(false); Toast.info('Notifications off', 'Reminders will appear inside MedVault only.'); }
    if (a === 'test') {
      if (DeviceNotify.show('MedVault test', 'Device notifications are working.', 'medvault-test')) Toast.success('Test sent', 'Check your device notifications.');
      else Toast.warn('Could not show a device notification', 'Reminders will appear inside MedVault instead.');
    }
    App.renderBody();
  }));
  if (App.role() !== 'patient') return;
  const interval = $('#checkup-interval', root);
  if (interval) interval.addEventListener('change', () => {
    p.reminderPreferences = p.reminderPreferences || {};
    p.reminderPreferences.checkupIntervalDays = Number(interval.value);
    Store.save(); ReminderEngine.evaluate(pid); App.renderBody();
  });
  const appointmentForm = $('#appointment-reminder-form', root);
  if (appointmentForm) appointmentForm.addEventListener('submit', event => {
    event.preventDefault();
    const title = $('#appointment-title', root).value.trim();
    const date = $('#appointment-date', root).value;
    const time = $('#appointment-time', root).value;
    const at = new Date(date + 'T' + time);
    if (!title || !date || !time || Number.isNaN(at.getTime()) || at < new Date()) { Toast.error('Check the appointment', 'Choose a name and a future date and time.'); return; }
    Store.state.reminders.push({ id: uid('rem'), patientId: pid, kind: 'appointment', label: title, scheduledAt: at.toISOString(), active: true, createdAt: nowISO() });
    Store.save(); Toast.success('Reminder added', title + ' is on your reminders list.'); App.renderBody();
  });
  const medicineForm = $('#medicine-reminder-form', root);
  if (medicineForm) medicineForm.addEventListener('submit', event => {
    event.preventDefault();
    const label = $('#medicine-name', root).value;
    const time = $('#medicine-time', root).value;
    if (!label || !time || !(p.medications || []).includes(label)) { Toast.error('Choose a medicine and time', 'Select a medicine already listed in this patient profile.'); return; }
    Store.state.reminders.push({ id: uid('rem'), patientId: pid, kind: 'medicine', label, time, active: true, createdAt: nowISO() });
    Store.save(); Toast.success('Daily reminder added', 'You’ll see an alert at ' + time + '.'); App.renderBody();
  });
  $$('[data-remove-reminder]', root).forEach(button => button.addEventListener('click', () => {
    Store.state.reminders = Store.state.reminders.filter(r => r.id !== button.dataset.removeReminder || r.patientId !== pid);
    Store.save(); App.renderBody(); Toast.info('Reminder removed', 'The reminder has been removed.');
  }));
}

Screens.patient.bind.reminders = bindReminders;
Screens.caregiver.reminders = Screens.patient.reminders;
Screens.caregiver.bind.reminders = bindReminders;

