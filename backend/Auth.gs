/** Login, password hashing and sessions. */

function hash_(password, salt) {
  let h = salt + ':' + password;
  for (let i = 0; i < HASH_ROUNDS; i++) {
    const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h, Utilities.Charset.UTF_8);
    h = bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
  }
  return h;
}

function newSalt_() { return Utilities.getUuid().replace(/-/g, ''); }
function isActive_(v) { return String(v).toLowerCase() !== 'no'; }

function findUser_(username) {
  const u = String(username || '').trim().toLowerCase();
  return readAll_('Users').find(function (r) { return String(r.username).toLowerCase() === u; }) || null;
}

function login(p) {
  const username = String(p.username || '').trim().toLowerCase();
  const password = String(p.password || '');
  if (!username || !password) throw new Error('Enter your username and password.');

  const cache = CacheService.getScriptCache();
  const failKey = 'fail:' + username;
  if (Number(cache.get(failKey) || 0) >= MAX_LOGIN_FAILS) {
    throw new Error('Too many failed attempts. Try again in 10 minutes.');
  }

  const user = findUser_(username);
  const ok = user && isActive_(user.active) && hash_(password, String(user.salt)) === String(user.passwordHash);
  if (!ok) {
    cache.put(failKey, String(Number(cache.get(failKey) || 0) + 1), 600);
    throw new Error('Invalid username or password.');
  }
  cache.remove(failKey);

  cleanupSessions_();
  const session = {
    token: Utilities.getUuid() + Utilities.getUuid().replace(/-/g, ''),
    username: String(user.username),
    role: String(user.role),
    fullName: String(user.fullName),
    expiresAt: new Date(Date.now() + SESSION_HOURS * 3600 * 1000).toISOString()
  };
  appendObj_('Sessions', session);
  cache.put('sess:' + session.token, JSON.stringify(session), 21000);
  log_(session.username, 'login', '');
  return session;
}

function getSession_(token) {
  if (!token) return null;
  const cache = CacheService.getScriptCache();
  const hit = cache.get('sess:' + token);
  let s = null;
  if (hit) {
    s = JSON.parse(hit);
  } else {
    const row = readAll_('Sessions').find(function (r) { return r.token === token; });
    if (row) s = { token: String(row.token), username: String(row.username), role: String(row.role), fullName: String(row.fullName), expiresAt: String(row.expiresAt) };
  }
  if (!s) return null;
  if (new Date(s.expiresAt) < new Date()) { destroySession_(token); return null; }
  if (!hit) {
    const u = findUser_(s.username);
    if (!u || !isActive_(u.active)) { destroySession_(token); return null; }
    cache.put('sess:' + token, JSON.stringify(s), 21000);
  }
  return s;
}

function destroySession_(token) {
  CacheService.getScriptCache().remove('sess:' + token);
  const rows = readAll_('Sessions').filter(function (r) { return r.token === token; });
  rows.reverse().forEach(function (r) { deleteRow_('Sessions', r._row); });
}

function destroyUserSessions_(username) {
  const cache = CacheService.getScriptCache();
  const rows = readAll_('Sessions').filter(function (r) { return r.username === username; });
  rows.forEach(function (r) { cache.remove('sess:' + r.token); });
  rows.reverse().forEach(function (r) { deleteRow_('Sessions', r._row); });
}

function cleanupSessions_() {
  const rows = readAll_('Sessions');
  const nowMs = Date.now();
  rows.filter(function (r) { return new Date(String(r.expiresAt)).getTime() < nowMs; })
      .reverse()
      .forEach(function (r) { deleteRow_('Sessions', r._row); });
}

function logout(p, session) {
  destroySession_(session.token);
  return true;
}

function changePassword(p, session) {
  const user = findUser_(session.username);
  if (!user || hash_(String(p.oldPassword || ''), String(user.salt)) !== String(user.passwordHash)) {
    throw new Error('Your current password is incorrect.');
  }
  checkPassword_(p.newPassword);
  const salt = newSalt_();
  updateRow_('Users', user._row, { salt: salt, passwordHash: hash_(String(p.newPassword), salt) });
  return true;
}

function checkPassword_(pw) {
  if (String(pw || '').length < 8) throw new Error('Password must be at least 8 characters.');
}
