/* ============================================================
   screens-auth.js — login screen + auth bindings + break-glass
   ============================================================ */

Screens.auth.login = function () {
  const demo = [
    { role: 'Patient', email: 'patient@medvault.demo', desc: 'Atulya Verma · MV-1001', icon: 'user' },
    { role: 'Caregiver', email: 'caregiver@medvault.demo', desc: 'Sunita Verma · 2 patients', icon: 'users' },
    { role: 'Provider', email: 'doctor@medvault.demo', desc: 'Dr. Ananya Rao · Apollo', icon: 'shield' },
    { role: 'Admin', email: 'admin@medvault.demo', desc: 'Kavita Menon · Platform admin', icon: 'building' }
  ];
  return '<div class="auth">' +
    '<div class="auth__hero">' +
      '<div class="auth__brand"><span class="mark">' + icon('shield', 22) + '</span> MedVault</div>' +
      '<div class="auth__title">One patient.<br/>One secure medical ID.</div>' +
      '<div class="auth__sub">Prescriptions, scans and discharge summaries — unified into one portable medical identity.</div>' +
    '</div>' +
    '<div class="auth__body">' +
      '<h2 style="font-size:20px;margin-bottom:6px">Sign in</h2>' +
      '<p class="muted small" style="margin-bottom:20px">Access your unified medical record.</p>' +
      '<form id="login-form" novalidate>' +
        '<div class="field"><label for="email">Email address</label>' +
          '<input class="input" type="email" id="email" autocomplete="username" placeholder="you@example.com" />' +
          '<div class="err hidden" id="email-err"></div></div>' +
        '<div class="field"><label for="password">Password</label>' +
          '<input class="input" type="password" id="password" autocomplete="current-password" placeholder="••••••••" />' +
          '<div class="err hidden" id="password-err"></div></div>' +
        '<div class="err hidden" id="login-err" style="margin-bottom:14px"></div>' +
        '<button class="btn btn--primary btn--lg btn--block" type="submit" id="login-btn">Sign in</button>' +
      '</form>' +
      '<div class="section-title" style="margin-top:26px">Demo accounts</div>' +
      '<div class="demo-grid">' +
        demo.map(d => '<button class="demo-btn" data-demo="' + esc(d.email) + '">' +
          '<span class="demo-btn__ico">' + icon(d.icon, 18) + '</span>' +
          '<span class="demo-btn__body"><span class="demo-btn__role">' + esc(d.role) + '</span>' +
          '<span class="demo-btn__desc">' + esc(d.desc) + '</span></span>' + icon('chevron', 16) + '</button>').join('') +
      '</div>' +
      '<div class="alert alert--warn" style="margin-top:18px">' + icon('alert', 17) +
        '<div><strong>Demo credentials.</strong> All accounts use password <span class="mono">demo123</span>. Prototype only.</div></div>' +
      '<div class="section-title" style="margin-top:26px">Emergency</div>' +
      '<p class="small muted" style="margin-bottom:12px">For a patient who cannot provide history. Needs the one-time code from the patient’s Medical ID QR. Scoped to clinically relevant information, limited to 30 minutes and always logged.</p>' +
      '<button class="btn btn--danger btn--block" id="breakglass-btn">' + icon('alert', 17) + ' Break-glass access</button>' +
      '<p class="tiny muted" style="margin-top:10px">Demo: sign in as the patient, open <strong>Medical ID</strong>, note the emergency code, then sign out and use it here.</p>' +
    '</div>' +
  '</div>';
};

function bindAuth(root) {
  const form = $('#login-form', root);
  if (!form) return;
  const emailEl = $('#email', root), passEl = $('#password', root);
  const showErr = (id, msg) => {
    const el = $(id, root);
    if (msg) { el.innerHTML = icon('alert', 13) + '<span>' + esc(msg) + '</span>'; el.classList.remove('hidden'); }
    else { el.classList.add('hidden'); el.innerHTML = ''; }
  };

  form.addEventListener('submit', e => {
    e.preventDefault();
    showErr('#email-err', ''); showErr('#password-err', ''); showErr('#login-err', '');
    emailEl.classList.remove('input--error'); passEl.classList.remove('input--error');
    const email = emailEl.value.trim();
    const pass = passEl.value;
    let bad = false;
    if (!email) { showErr('#email-err', 'Email is required.'); emailEl.classList.add('input--error'); bad = true; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showErr('#email-err', 'Enter a valid email.'); emailEl.classList.add('input--error'); bad = true; }
    if (!pass) { showErr('#password-err', 'Password is required.'); passEl.classList.add('input--error'); bad = true; }
    if (bad) return;

    const btn = $('#login-btn', root);
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner spinner--white"></span> Signing in…';

    setTimeout(() => {
      const user = Store.userByEmail(email);
      if (!user || user.password !== pass) {
        btn.disabled = false; btn.textContent = 'Sign in';
        showErr('#login-err', 'Invalid email or password.');
        emailEl.classList.add('input--error'); passEl.classList.add('input--error');
        Toast.error('Sign-in failed', 'Check your email and password.');
        return;
      }
      Session.start(user);
      App.tab = 'home';
      if (user.role === 'caregiver') App.actingPatientId = (user.patientIds || [])[0] || null;
      audit('USER_LOGIN', { detail: roleLabel(user.role) + ' signed in', actor: { name: user.name, role: user.role } });
      Toast.success('Welcome, ' + user.name.split(' ')[0], 'Signed in as ' + roleLabel(user.role) + '.');
      App.render();
    }, 460);
  });

  $$('[data-demo]', root).forEach(b => b.addEventListener('click', () => {
    emailEl.value = b.dataset.demo;
    passEl.value = 'demo123';
    form.dispatchEvent(new Event('submit'));
  }));

  const bg = $('#breakglass-btn', root);
  if (bg) bg.addEventListener('click', () => openBreakGlass());
}

function openBreakGlass(prefillCode) {
  const body = '<div class="alert alert--danger" style="margin-bottom:16px">' + icon('alert', 18) +
    '<div><strong>Exceptional access.</strong> Break-glass is only for when a patient cannot provide consent and delay would risk harm. Every use is recorded, scoped and reviewed.</div></div>' +
    '<form id="bg-form" novalidate>' +
      '<div class="field"><label for="bg-name">Responder name <span class="req">*</span></label><input class="input" id="bg-name" placeholder="e.g. Dr. Suresh Kumar" /><div class="err hidden" id="e-bg-name"></div></div>' +
      '<div class="field"><label for="bg-role">Role <span class="req">*</span></label><select class="select" id="bg-role"><option value="">Select…</option><option>Emergency Physician</option><option>Paramedic</option><option>Emergency Nurse</option><option>Duty Medical Officer</option></select><div class="err hidden" id="e-bg-role"></div></div>' +
      '<div class="field"><label for="bg-facility">Facility <span class="req">*</span></label><select class="select" id="bg-facility"><option value="">Select…</option>' +
        Store.state.facilities.map(f => '<option value="' + f.id + '">' + esc(f.name + ' — ' + f.city) + '</option>').join('') +
      '</select><div class="err hidden" id="e-bg-facility"></div></div>' +
      '<div class="field"><label for="bg-patient">Emergency access code <span class="req">*</span></label><input class="input mono" id="bg-patient" placeholder="ABCDE-FGHJK" autocomplete="off" autocapitalize="characters" maxlength="80" value="' + esc(prefillCode ? EmergencyAccess.format(EmergencyAccess.normalize(prefillCode)) : '') + '" /><div class="hint">Scan the QR on the patient’s MedVault Medical ID, or type the code shown under it. Codes work once and expire after 10 minutes. A MedVault ID alone is not accepted.</div><div class="err hidden" id="e-bg-patient"></div></div>' +
      '<div class="field"><label for="bg-reason">Clinical justification <span class="req">*</span></label><textarea class="textarea" id="bg-reason" placeholder="Describe the emergency"></textarea><div class="err hidden" id="e-bg-reason"></div></div>' +
    '</form>';

  const root = Sheet.open({
    title: 'Emergency break-glass',
    body: body,
    footer: '<button class="btn" data-sheet-close>Cancel</button><button class="btn btn--danger" id="bg-submit">' + icon('alert', 16) + ' Request access</button>'
  });

  const showErr = (id, msg) => {
    const el = $(id, root);
    if (msg) { el.innerHTML = icon('alert', 13) + '<span>' + esc(msg) + '</span>'; el.classList.remove('hidden'); }
    else el.classList.add('hidden');
  };

  $('#bg-submit', root).addEventListener('click', () => {
    ['#e-bg-name', '#e-bg-role', '#e-bg-facility', '#e-bg-patient', '#e-bg-reason'].forEach(i => showErr(i, ''));
    const name = $('#bg-name', root).value.trim();
    const r = $('#bg-role', root).value;
    const facId = $('#bg-facility', root).value;
    const pid = $('#bg-patient', root).value.trim().toUpperCase();
    const reason = $('#bg-reason', root).value.trim();
    let bad = false;
    if (!name) { showErr('#e-bg-name', 'Name required.'); bad = true; }
    if (!r) { showErr('#e-bg-role', 'Role required.'); bad = true; }
    if (!facId) { showErr('#e-bg-facility', 'Facility required.'); bad = true; }
    if (!pid) { showErr('#e-bg-patient', 'Emergency code required.'); bad = true; }
    if (!reason || reason.length < 10) { showErr('#e-bg-reason', 'Provide a justification (10+ chars).'); bad = true; }
    if (bad) return;

    const check = EmergencyAccess.redeem(pid);
    if (!check.ok) {
      showErr('#e-bg-patient', check.message);
      Toast.error('Access not granted', check.message);
      return;
    }
    const patient = check.patient;

    const fac = Store.facility(facId);
    const ev = {
      id: uid('bg'), ts: nowISO(), patientId: patient.id, responderName: name,
      responderRole: r, facilityId: facId, facilityName: fac.name + ', ' + fac.city,
      reason: reason, codeId: check.token.id, scopesAccessed: ['bloodGroup', 'allergies', 'conditions', 'medications', 'emergencyContact'],
      status: 'pending', reviewedBy: null, reviewedAt: null, reviewNote: ''
    };
    Store.state.breakGlass.unshift(ev);
    Store.save();
    audit('BREAK_GLASS_ACCESS', { patientId: patient.id, detail: 'Emergency access by ' + name + ' at ' + fac.name, severity: 'critical', actor: { name: name, role: 'emergency' } });
    notify(patient.id, 'Emergency access recorded', 'A break-glass access was recorded at ' + fac.name + ' and is pending review.', 'emergency');

    Sheet.close();
    Toast.warn('Emergency access granted', 'This access is logged and will be reviewed.');
    Session.start({ id: 'emergency-' + ev.id, role: 'emergency', name: name }, { breakGlass: true, eventId: ev.id, patientId: patient.id, facilityName: ev.facilityName, responderName: name, expiresAt: new Date(Date.now() + EmergencyAccess.SESSION_MS).toISOString() });
    App.tab = 'emergency';
    App.subScreen = null;
    App.render();
  });
}