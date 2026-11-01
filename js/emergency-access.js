/* ============================================================
   emergency-access.js — short-lived emergency codes for break-glass
   Exposes globals: EmergencyAccess

   A patient's Medical ID shows a QR code holding a random one-time code.
   The QR contains no name, MedVault ID or ABHA number. A responder needs
   that code (scanned or typed) to open a break-glass session; knowing the
   MedVault ID alone is no longer enough.

   Prototype limits: codes live in this browser's localStorage, so a code
   only works in the same browser that issued it, and anyone with access
   to the device's developer tools could read them. A real deployment
   would issue and check codes on a server.
   ============================================================ */

const EmergencyAccess = {
  CODE_TTL_MS: 10 * 60 * 1000,
  SESSION_MS: 30 * 60 * 1000,
  MAX_FAILS: 5,
  LOCK_MS: 5 * 60 * 1000,
  LOCK_KEY: 'medvault.breakglass.lock.v1',
  ALPHABET: 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', // no 0/O, 1/I/L

  tokens() {
    if (!Array.isArray(Store.state.accessTokens)) Store.state.accessTokens = [];
    return Store.state.accessTokens;
  },

  randomCode() {
    const out = [], buf = new Uint32Array(10);
    crypto.getRandomValues(buf);
    for (let i = 0; i < buf.length; i++) out.push(this.ALPHABET[buf[i] % this.ALPHABET.length]);
    return out.join('');
  },

  format(code) { return code.slice(0, 5) + '-' + code.slice(5); },

  /* Accepts a typed code, "ABCDE-FGHJK", a scanned app URL or the plain
     MEDVAULT-EMERGENCY: payload. */
  normalize(input) {
    let s = String(input || '').trim();
    const m = s.match(/(?:#|[?&])emergency=([A-Za-z0-9-]+)/) || s.match(/^MEDVAULT-EMERGENCY:([A-Za-z0-9-]+)$/i);
    if (m) s = m[1];
    return s.toUpperCase().replace(/[^A-Z0-9]/g, '');
  },

  isLive(t, now) {
    now = now || Date.now();
    return !t.usedAt && !t.revokedAt && Date.parse(t.expiresAt) > now;
  },

  current(pid) { return this.tokens().find(t => t.patientId === pid && this.isLive(t)) || null; },

  issue(pid) {
    const now = Date.now();
    const list = this.tokens();
    list.forEach(t => { if (t.patientId === pid && this.isLive(t, now)) t.revokedAt = new Date(now).toISOString(); });
    // Keep a day of history for the access log; drop older codes.
    Store.state.accessTokens = list.filter(t => now - Date.parse(t.createdAt) < 86400000);
    const t = {
      id: uid('tok'), code: this.randomCode(), patientId: pid, purpose: 'emergency',
      createdAt: new Date(now).toISOString(), expiresAt: new Date(now + this.CODE_TTL_MS).toISOString(),
      usedAt: null, revokedAt: null, createdBy: App.actor().name
    };
    Store.state.accessTokens.push(t);
    Store.save();
    audit('EMERGENCY_CODE_ISSUED', { patientId: pid, detail: 'One-time emergency code issued (valid 10 minutes)' });
    return t;
  },

  payload(t) {
    const code = this.format(t.code);
    if (/^https?:$/.test(location.protocol)) return location.origin + location.pathname + '#emergency=' + code;
    return 'MEDVAULT-EMERGENCY:' + code;
  },

  lockState() {
    try { return JSON.parse(localStorage.getItem(this.LOCK_KEY)) || { fails: 0, until: 0 }; } catch (_) { return { fails: 0, until: 0 }; }
  },
  setLock(s) { try { localStorage.setItem(this.LOCK_KEY, JSON.stringify(s)); } catch (_) {} },

  /* Check a code and mark it used. Returns { ok, patient, token } or
     { ok:false, reason, message }. */
  redeem(input) {
    const now = Date.now();
    const lock = this.lockState();
    if (lock.until > now) {
      const mins = Math.ceil((lock.until - now) / 60000);
      return { ok: false, reason: 'locked', message: 'Too many incorrect codes. Try again in ' + mins + ' minute' + (mins === 1 ? '' : 's') + '.' };
    }
    const code = this.normalize(input);
    const t = code.length === 10 ? this.tokens().find(x => x.code === code) : null;
    let fail = null;
    if (!t) fail = { reason: 'invalid', message: 'That code is not valid.' };
    else if (t.usedAt) fail = { reason: 'used', message: 'This code has already been used. Ask for a new code from the patient’s Medical ID.' };
    else if (t.revokedAt) fail = { reason: 'replaced', message: 'This code was replaced by a newer one.' };
    else if (Date.parse(t.expiresAt) <= now) fail = { reason: 'expired', message: 'This code has expired. Codes are valid for 10 minutes.' };
    const patient = t && !fail ? Store.patient(t.patientId) : null;
    if (!fail && !patient) fail = { reason: 'invalid', message: 'That code is not valid.' };

    if (fail) {
      const fails = (lock.until && lock.until <= now ? 0 : lock.fails || 0) + 1;
      this.setLock({ fails: fails >= this.MAX_FAILS ? 0 : fails, until: fails >= this.MAX_FAILS ? now + this.LOCK_MS : 0 });
      audit('BREAK_GLASS_DENIED', { patientId: t ? t.patientId : null, detail: 'Emergency code rejected (' + fail.reason + ')', severity: 'warning', actor: { name: 'Unverified responder', role: 'emergency' } });
      if (fails >= this.MAX_FAILS) fail.message += ' Break-glass is locked for 5 minutes on this device.';
      return Object.assign({ ok: false }, fail);
    }
    t.usedAt = new Date(now).toISOString();
    this.setLock({ fails: 0, until: 0 });
    Store.save();
    return { ok: true, token: t, patient };
  },

  sessionEndsAt(data) {
    return Date.parse(data.expiresAt) || (Date.parse(data.loginAt) + this.SESSION_MS);
  },
  sessionExpired(data) { return !!(data && data.breakGlass && Date.now() >= this.sessionEndsAt(data)); }
};
