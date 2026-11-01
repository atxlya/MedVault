/* ============================================================
   reminders.js — patient-specific appointment, checkup and medicine alerts
   ============================================================ */

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
    '<p class="reminders-note">Alerts are added to your MedVault notifications while the app is open. Follow-up timing and medicine schedules should come from your care team.</p>' +
  '</div>';
};

function bindReminders(root) {
  const pid = App.activePatientId();
  const p = Store.patient(pid);
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

