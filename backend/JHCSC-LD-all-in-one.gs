// ===== Config.gs =====
/**
 * JHCSC L&D Portal backend - configuration.
 * Every tab in the Google Sheet is described in SCHEMA (column order matters).
 * The FPDP framework (domains, questions, topics) lives HERE ONLY: the browser loads it with the getFramework action.
 */

const SCHEMA = {
  Users:       ['username', 'fullName', 'role', 'passwordHash', 'salt', 'active', 'createdAt', 'facultyId', 'department'],
  Sessions:    ['token', 'username', 'role', 'fullName', 'expiresAt'],
  Settings:    ['key', 'value'],
  Faculty:     ['facultyId', 'name', 'rank', 'department', 'username', 'createdAt', 'updatedAt'],
  Assessments: ['facultyId', 'source', 'ratings', 'remarks', 'assessor', 'updatedAt'],   // source = self | chair
  LnsSurvey:   ['facultyId', 'topics', 'modality', 'schedule', 'updatedAt'],
  Idp:         ['facultyId', 'goal1', 'interv1', 'supp1', 'time1', 'goal2', 'interv2', 'supp2', 'time2', 'chairName', 'updatedAt'],
  AuditLog:    ['time', 'username', 'action', 'detail']
};

// Stored as plain text so Sheets never turns values into dates or numbers.
const TEXT_SHEETS = Object.keys(SCHEMA);

const ROLES = ['admin', 'chair', 'faculty'];
const SESSION_HOURS = 6;        // CacheService keeps entries for 6 hours max
const MAX_LOGIN_FAILS = 5;      // per username, per 10 minutes
const HASH_ROUNDS = 300;

const DEFAULT_SETTINGS = {
  schoolYear: 'AY 2025-2026',
  manual: 'FPDP 2025 Manual'
};

const FRAMEWORK = {
  scale: [
    { value: 1, label: 'Novice' }, { value: 2, label: 'Competent' },
    { value: 3, label: 'Proficient' }, { value: 4, label: 'Expert' }
  ],
  modalities: [
    'On-the-Job / LAP Projects (60%)',
    'Peer Coaching & Mentoring (30%)',
    'Formal Workshops & Seminars (10%)',
    'Blended / Hybrid Modality'
  ],
  schedules: ['Mid-Year Term Break', 'Semestral Break', 'Monthly Friday Afternoons'],
  domains: [
    {
      id: 'd1', short: 'Teaching & Learning', title: 'Domain 1: Teaching & Learning Excellence',
      questions: [
        { id: 'q1_1', text: '1.1 Instructional Design & Outcomes-Based Delivery' },
        { id: 'q1_2', text: '1.2 Assessment, Feedback & Outcome-Based Evaluation' },
        { id: 'q1_3', text: '1.3 Curriculum Development & Vertical Alignment' },
        { id: 'q1_4', text: '1.4 Learning Environment & Inclusivity Management' }
      ],
      lnsTopics: [
        'Outcomes-Based Education (OBE) Course Design',
        'Digital Pedagogy & LMS Course Shell Development',
        'Formative & Summative Assessment Strategies',
        'Student Engagement & Inclusive Teaching'
      ]
    },
    {
      id: 'd2', short: 'Research & Scholarship', title: 'Domain 2: Research & Scholarship',
      questions: [
        { id: 'q2_1', text: '2.1 Research Methodology & Experimental Design' },
        { id: 'q2_2', text: '2.2 Scholarly Writing & High-Impact Dissemination' },
        { id: 'q2_3', text: '2.3 Research Collaboration, Funding & Proposal Writing' },
        { id: 'q2_4', text: '2.4 Scholarship of Teaching & Disciplinary Integration' }
      ],
      lnsTopics: [
        'Grant Writing & External Funding Proposals',
        'Publishing in Scopus / Web of Science Journals',
        'Statistical Analysis & Data Science Tools',
        'Intellectual Property & Technology Transfer'
      ]
    },
    {
      id: 'd3', short: 'Service & Citizenship', title: 'Domain 3: Service & Professional Citizenship',
      questions: [
        { id: 'q3_1', text: '3.1 Departmental & Institutional Governance Service' },
        { id: 'q3_2', text: '3.2 Professional Organizations & Journal Peer Review' },
        { id: 'q3_3', text: '3.3 Extension Services & Community Engagement' }
      ],
      lnsTopics: [
        'Community Extension Project Packaging & Impact Assessment',
        'Accreditation & Quality Assurance Standards',
        'Partnership Building & NGO Linkages'
      ]
    },
    {
      id: 'd4', short: 'Leadership & Admin', title: 'Domain 4: Leadership & Administration',
      questions: [
        { id: 'q4_1', text: '4.1 Academic Program Leadership & Faculty Mentorship' },
        { id: 'q4_2', text: '4.2 Strategic Planning & Data-Informed Governance' },
        { id: 'q4_3', text: '4.3 Organizational Change & Innovation Management' }
      ],
      lnsTopics: [
        'Strategic Planning & Risk Management',
        'Faculty Mentorship & Team Leadership',
        'Academic Budgeting & Resource Allocation'
      ]
    },
    {
      id: 'd5', short: 'Professional Values', title: 'Domain 5: Professional Identity & Values',
      questions: [
        { id: 'q5_1', text: '5.1 Reflective Practice & Professional Learning' },
        { id: 'q5_2', text: '5.2 Academic Integrity & Ethical Conduct' }
      ],
      lnsTopics: [
        'Academic Ethics & Integrity in Higher Ed',
        'Faculty Wellness, Stress Management & Resilience',
        'Career Progression & Academic Portfolio Building'
      ]
    }
  ]
};

/**
 * Permission table. The server checks this on EVERY request.
 * roles: '*' = any logged-in user. write: true = runs under a script lock and is logged.
 * fn is a string so file load order never matters.
 */
const ACTIONS = {
  login:          { fn: 'login', public: true },
  logout:         { fn: 'logout', roles: '*' },
  changePassword: { fn: 'changePassword', roles: '*', write: true },
  getFramework:   { fn: 'getFramework', roles: '*' },

  // Faculty records (each role only ever sees the records it is allowed to - see Faculty.gs)
  listFaculty:    { fn: 'listFaculty', roles: ['admin', 'chair', 'faculty'] },
  getProfile:     { fn: 'getProfile', roles: ['admin', 'chair', 'faculty'] },

  // Faculty: Annex D (self-assessment), Annex G (learner needs survey)
  saveSelf:       { fn: 'saveSelf', roles: ['faculty'], write: true },
  saveLns:        { fn: 'saveLns', roles: ['faculty'], write: true },

  // Immediate Head / Chair: Annex C (competency assessment)
  saveChair:      { fn: 'saveChair', roles: ['chair'], write: true },

  // Annex I (IDP): faculty write their goals, the chair signs off
  saveIdp:        { fn: 'saveIdp', roles: ['faculty', 'chair'], write: true },

  // Analytics (chair = own department, admin = everyone)
  getAnalytics:   { fn: 'getAnalytics', roles: ['admin', 'chair'] },

  // Users + audit (admin)
  listUsers:      { fn: 'listUsers', roles: ['admin'] },
  createUser:     { fn: 'createUser', roles: ['admin'], write: true },
  updateUser:     { fn: 'updateUser', roles: ['admin'], write: true },
  setUserActive:  { fn: 'setUserActive', roles: ['admin'], write: true },
  resetPassword:  { fn: 'resetPassword', roles: ['admin'], write: true },
  getAuditLog:    { fn: 'getAuditLog', roles: ['admin'] }
};

// ===== Sheets.gs =====
/** Small helpers for reading and writing the Google Sheet "database". */

function now_() { return new Date().toISOString(); }
function str_(v) { return (v === null || v === undefined) ? '' : String(v).trim(); }
function newId_(prefix) { return prefix + Utilities.getUuid().replace(/-/g, '').slice(0, 8); }
function parseJson_(s, fallback) {
  try { return (s === '' || s === null || s === undefined) ? fallback : JSON.parse(s); } catch (e) { return fallback; }
}

function sheet_(name) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('Missing sheet tab "' + name + '". Run setupSheets() once from the Apps Script editor.');
  return sh;
}

/** Returns every data row as an object keyed by header name. _row = sheet row number. */
function readAll_(name) {
  const sh = sheet_(name);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const head = values[0].map(String);
  const out = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    let empty = true;
    for (let j = 0; j < row.length; j++) { if (row[j] !== '') { empty = false; break; } }
    if (empty) continue;
    const o = { _row: i + 1 };
    for (let j = 0; j < head.length; j++) o[head[j]] = row[j];
    out.push(o);
  }
  return out;
}

function toRow_(name, obj) {
  return SCHEMA[name].map(function (c) {
    const v = obj[c];
    return (v === undefined || v === null) ? '' : v;
  });
}

function writeRange_(name, startRow, rows2d) {
  if (!rows2d.length) return;
  const rng = sheet_(name).getRange(startRow, 1, rows2d.length, SCHEMA[name].length);
  if (TEXT_SHEETS.indexOf(name) >= 0) rng.setNumberFormat('@');
  rng.setValues(rows2d);
}

function appendObj_(name, obj) { appendMany_(name, [obj]); }

function appendMany_(name, objs) {
  if (!objs.length) return;
  const sh = sheet_(name);
  const start = Math.max(sh.getLastRow(), 1) + 1;
  writeRange_(name, start, objs.map(function (o) { return toRow_(name, o); }));
}

/** Patch one row (found earlier through readAll_, which supplies _row). */
function updateRow_(name, rowNum, patch) {
  const sh = sheet_(name);
  const cols = SCHEMA[name];
  const cur = sh.getRange(rowNum, 1, 1, cols.length).getValues()[0];
  const obj = {};
  cols.forEach(function (c, i) { obj[c] = cur[i]; });
  Object.keys(patch).forEach(function (k) { obj[k] = patch[k]; });
  writeRange_(name, rowNum, [toRow_(name, obj)]);
}

function deleteRow_(name, rowNum) { sheet_(name).deleteRow(rowNum); }

/** Replace every data row of a tab (header row is kept). */
function replaceAll_(name, objs) {
  const sh = sheet_(name);
  const last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, Math.max(sh.getLastColumn(), SCHEMA[name].length)).clearContent();
  writeRange_(name, 2, objs.map(function (o) { return toRow_(name, o); }));
}

/** Update the row where match(row) is true, otherwise append a new one. */
function upsert_(name, match, obj) {
  const row = readAll_(name).find(match);
  if (row) updateRow_(name, row._row, obj); else appendObj_(name, obj);
}

function getSettings_() {
  const out = {};
  Object.keys(DEFAULT_SETTINGS).forEach(function (k) { out[k] = DEFAULT_SETTINGS[k]; });
  readAll_('Settings').forEach(function (r) { if (r.key !== '') out[String(r.key)] = str_(r.value); });
  return out;
}

// ===== Audit.gs =====
/** Action log. Never logs passwords or answers. */

function log_(username, action, detail) {
  try {
    appendObj_('AuditLog', { time: now_(), username: username || '', action: action, detail: detail || '' });
  } catch (e) { /* logging must never break a request */ }
}

function getAuditLog(p) {
  const limit = Math.min(Number(p.limit) || 100, 500);
  const rows = readAll_('AuditLog');
  return rows.slice(-limit).reverse().map(function (r) {
    return { time: str_(r.time), username: str_(r.username), action: str_(r.action), detail: str_(r.detail) };
  });
}

// ===== Auth.gs =====
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

// ===== Users.gs =====
/** Account management (admin only). */

function addUser_(username, fullName, role, password, facultyId, department) {
  const salt = newSalt_();
  appendObj_('Users', {
    username: username, fullName: fullName, role: role,
    passwordHash: hash_(password, salt), salt: salt, active: 'yes', createdAt: now_(),
    facultyId: facultyId || '', department: department || ''
  });
}

function listUsers() {
  const faculty = {};
  readAll_('Faculty').forEach(function (f) { faculty[str_(f.facultyId)] = f; });
  return readAll_('Users').map(function (r) {
    const f = faculty[str_(r.facultyId)];
    return {
      username: str_(r.username), fullName: str_(r.fullName), role: str_(r.role), active: isActive_(r.active),
      createdAt: str_(r.createdAt), department: str_(r.department), rank: f ? str_(f.rank) : ''
    };
  });
}

function validateProfile_(role, fullName, department, rank) {
  if (!fullName || fullName.length > 80) throw new Error('Enter the full name (up to 80 characters).');
  if (department.length > 80) throw new Error('Department is too long (80 characters max).');
  if (rank.length > 60) throw new Error('Rank is too long (60 characters max).');
  if (role === 'chair' && !department) throw new Error('Enter the department this Immediate Head / Chair supervises.');
  if (role === 'faculty' && (!department || !rank)) throw new Error('Faculty need an academic rank and a department.');
}

function createUser(p) {
  const username = str_(p.username).toLowerCase();
  const fullName = str_(p.fullName);
  const role = str_(p.role);
  const department = str_(p.department);
  const rank = str_(p.rank);
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) throw new Error('Username must be 3-30 characters: letters, numbers, dot, dash or underscore.');
  if (ROLES.indexOf(role) < 0) throw new Error('Choose a valid role.');
  validateProfile_(role, fullName, department, rank);
  checkPassword_(p.password);
  if (findUser_(username)) throw new Error('That username already exists.');

  let facultyId = '';
  if (role === 'faculty') {
    facultyId = newId_('F-');
    appendObj_('Faculty', { facultyId: facultyId, name: fullName, rank: rank, department: department, username: username, createdAt: now_(), updatedAt: now_() });
  }
  addUser_(username, fullName, role, String(p.password), facultyId, role === 'admin' ? '' : department);
  return { username: username };
}

function updateUser(p) {
  const user = findUser_(p.username);
  if (!user) throw new Error('User not found.');
  const role = str_(user.role);
  const fullName = str_(p.fullName);
  const department = role === 'admin' ? '' : str_(p.department);
  const rank = str_(p.rank);
  validateProfile_(role, fullName, department, rank);
  updateRow_('Users', user._row, { fullName: fullName, department: department });
  if (role === 'faculty') {
    const f = readAll_('Faculty').find(function (r) { return str_(r.facultyId) === str_(user.facultyId); });
    if (f) updateRow_('Faculty', f._row, { name: fullName, rank: rank, department: department, updatedAt: now_() });
  }
  destroyUserSessions_(String(user.username));   // so the new name/role details are picked up at next sign-in
  return { username: String(user.username) };
}

function setUserActive(p, session) {
  const user = findUser_(p.username);
  if (!user) throw new Error('User not found.');
  if (String(user.username).toLowerCase() === session.username.toLowerCase()) throw new Error('You cannot disable your own account.');
  const active = !!p.active;
  updateRow_('Users', user._row, { active: active ? 'yes' : 'no' });
  if (!active) destroyUserSessions_(String(user.username));
  return { username: String(user.username), active: active };
}

function resetPassword(p) {
  const user = findUser_(p.username);
  if (!user) throw new Error('User not found.');
  checkPassword_(p.newPassword);
  const salt = newSalt_();
  updateRow_('Users', user._row, { salt: salt, passwordHash: hash_(String(p.newPassword), salt) });
  destroyUserSessions_(String(user.username));
  return { username: String(user.username) };
}

// ===== Faculty.gs =====
/**
 * Who may see which faculty record - enforced here, on the server, for every request.
 *   admin   : every faculty record
 *   chair   : faculty whose department equals the chair's department
 *   faculty : only their own record
 */

function sameText_(a, b) { return str_(a).toLowerCase() === str_(b).toLowerCase() && str_(a) !== ''; }

function userRec_(session) {
  const u = findUser_(session.username);
  if (!u || !isActive_(u.active)) throw new Error('SESSION_EXPIRED');
  return u;
}

function visibleFaculty_(session) {
  const u = userRec_(session);
  const all = readAll_('Faculty');
  if (session.role === 'admin') return all;
  if (session.role === 'chair') return all.filter(function (f) { return sameText_(f.department, u.department); });
  return all.filter(function (f) { return str_(f.facultyId) !== '' && str_(f.facultyId) === str_(u.facultyId); });
}

function requireFaculty_(session, facultyId) {
  const id = str_(facultyId);
  const f = visibleFaculty_(session).find(function (x) { return str_(x.facultyId) === id; });
  if (!f) throw new Error('You do not have access to that faculty record.');
  return f;
}

/** The faculty member this (faculty-role) account is linked to. */
function ownFacultyId_(session) {
  const id = str_(userRec_(session).facultyId);
  if (!id) throw new Error('Your account is not linked to a faculty profile. Ask the administrator.');
  return id;
}

function facultyDto_(f) {
  return { facultyId: str_(f.facultyId), name: str_(f.name), rank: str_(f.rank), department: str_(f.department) };
}

function getFramework() {
  const s = getSettings_();
  return { scale: FRAMEWORK.scale, modalities: FRAMEWORK.modalities, schedules: FRAMEWORK.schedules,
           domains: FRAMEWORK.domains, settings: { schoolYear: s.schoolYear, manual: s.manual } };
}

function listFaculty(p, session) {
  return visibleFaculty_(session).map(facultyDto_)
    .sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
}

// ===== Assessments.gs =====
/** Annex D (self), Annex C (chair), Annex G (learner needs survey), Annex I (IDP). */

function allQuestionIds_() {
  const ids = [];
  FRAMEWORK.domains.forEach(function (d) { d.questions.forEach(function (q) { ids.push(q.id); }); });
  return ids;
}

function cleanRatings_(r) {
  r = r || {};
  const out = {};
  let missing = 0;
  allQuestionIds_().forEach(function (id) {
    const v = Number(r[id]);
    if (v === 1 || v === 2 || v === 3 || v === 4) out[id] = v; else missing++;
  });
  if (missing) throw new Error('Please rate every item (' + missing + ' still unanswered).');
  return out;
}

function findBy_(sheet, facultyId, source) {
  return readAll_(sheet).find(function (r) {
    return str_(r.facultyId) === facultyId && (source === undefined || str_(r.source) === source);
  }) || null;
}

/** Everything about one faculty member: profile + Annex D + Annex C + Annex G + Annex I. */
function getProfile(p, session) {
  const id = session.role === 'faculty' ? ownFacultyId_(session) : str_(p.facultyId);
  const fac = requireFaculty_(session, id);
  const fid = str_(fac.facultyId);

  const self = findBy_('Assessments', fid, 'self');
  const chair = findBy_('Assessments', fid, 'chair');
  const lns = findBy_('LnsSurvey', fid);
  const idp = findBy_('Idp', fid);

  return {
    faculty: facultyDto_(fac),
    self: self ? { ratings: parseJson_(self.ratings, {}), updatedAt: str_(self.updatedAt) } : null,
    chair: chair ? { ratings: parseJson_(chair.ratings, {}), remarks: str_(chair.remarks), assessor: str_(chair.assessor), updatedAt: str_(chair.updatedAt) } : null,
    lns: lns ? { topics: parseJson_(lns.topics, {}), modality: str_(lns.modality), schedule: str_(lns.schedule), updatedAt: str_(lns.updatedAt) } : null,
    idp: idp ? {
      goal1: str_(idp.goal1), interv1: str_(idp.interv1), supp1: str_(idp.supp1), time1: str_(idp.time1),
      goal2: str_(idp.goal2), interv2: str_(idp.interv2), supp2: str_(idp.supp2), time2: str_(idp.time2),
      chairName: str_(idp.chairName), updatedAt: str_(idp.updatedAt)
    } : null
  };
}

function saveAssessment_(facultyId, source, ratings, remarks, assessor) {
  upsert_('Assessments',
    function (r) { return str_(r.facultyId) === facultyId && str_(r.source) === source; },
    { facultyId: facultyId, source: source, ratings: JSON.stringify(ratings), remarks: remarks, assessor: assessor, updatedAt: now_() });
}

/** Annex D - a faculty member rates themselves. */
function saveSelf(p, session) {
  const fid = ownFacultyId_(session);
  saveAssessment_(fid, 'self', cleanRatings_(p.ratings), '', session.fullName);
  return { facultyId: fid };
}

/** Annex C - the Immediate Head / Chair rates a faculty member of their department. */
function saveChair(p, session) {
  const fac = requireFaculty_(session, p.facultyId);
  const fid = str_(fac.facultyId);
  const remarks = str_(p.remarks);
  if (remarks.length > 1500) throw new Error('Feedback is too long (1500 characters max).');
  saveAssessment_(fid, 'chair', cleanRatings_(p.ratings), remarks, session.fullName);

  // first evaluation: pre-fill the sign-off name on the IDP (the chair can still change it)
  const idp = findBy_('Idp', fid);
  if (!idp || str_(idp.chairName) === '') upsertIdp_(fid, { chairName: session.fullName });
  return { facultyId: fid };
}

/** Annex G - priority topics per domain, delivery modality and schedule. */
function saveLns(p, session) {
  const fid = ownFacultyId_(session);
  const topics = {};
  FRAMEWORK.domains.forEach(function (d) {
    const t = str_((p.topics || {})[d.id]);
    if (d.lnsTopics.indexOf(t) < 0) throw new Error('Choose a priority topic for "' + d.short + '".');
    topics[d.id] = t;
  });
  const modality = str_(p.modality), schedule = str_(p.schedule);
  if (FRAMEWORK.modalities.indexOf(modality) < 0) throw new Error('Choose a preferred delivery modality.');
  if (FRAMEWORK.schedules.indexOf(schedule) < 0) throw new Error('Choose a preferred schedule window.');
  upsert_('LnsSurvey', function (r) { return str_(r.facultyId) === fid; },
    { facultyId: fid, topics: JSON.stringify(topics), modality: modality, schedule: schedule, updatedAt: now_() });
  return { facultyId: fid };
}

function upsertIdp_(fid, patch) {
  const row = findBy_('Idp', fid);
  patch.updatedAt = now_();
  if (row) updateRow_('Idp', row._row, patch);
  else { patch.facultyId = fid; appendObj_('Idp', patch); }
}

/** Annex I - faculty write their goals; the chair writes the sign-off name. Each role can only change its own part. */
function saveIdp(p, session) {
  if (session.role === 'faculty') {
    const fid = ownFacultyId_(session);
    const patch = {};
    ['goal1', 'interv1', 'supp1', 'time1', 'goal2', 'interv2', 'supp2', 'time2'].forEach(function (k) {
      const v = str_(p[k]);
      if (v.length > 600) throw new Error('Each IDP box can hold up to 600 characters.');
      patch[k] = v;
    });
    upsertIdp_(fid, patch);
    return { facultyId: fid };
  }
  const fac = requireFaculty_(session, p.facultyId);
  const name = str_(p.chairName);
  if (name.length > 80) throw new Error('The sign-off name is too long (80 characters max).');
  upsertIdp_(str_(fac.facultyId), { chairName: name });
  return { facultyId: str_(fac.facultyId) };
}

// ===== Analytics.gs =====
/** Raw material for the analytics page. The browser works out the averages and gaps. */

function getAnalytics(p, session) {
  let list = visibleFaculty_(session);
  const dept = str_(p.department);
  if (session.role === 'admin' && dept) list = list.filter(function (f) { return sameText_(f.department, dept); });

  const byId = function (rows, source) {
    const m = {};
    rows.forEach(function (r) { if (source === undefined || str_(r.source) === source) m[str_(r.facultyId)] = r; });
    return m;
  };
  const assess = readAll_('Assessments');
  const selfBy = byId(assess, 'self'), chairBy = byId(assess, 'chair'), lnsBy = byId(readAll_('LnsSurvey'));

  const departments = {};
  readAll_('Faculty').forEach(function (f) { if (str_(f.department)) departments[str_(f.department)] = true; });

  return {
    departments: session.role === 'admin' ? Object.keys(departments).sort() : [],
    faculty: list.map(function (f) {
      const id = str_(f.facultyId);
      return Object.assign(facultyDto_(f), {
        self: selfBy[id] ? parseJson_(selfBy[id].ratings, null) : null,
        chair: chairBy[id] ? parseJson_(chairBy[id].ratings, null) : null,
        lns: lnsBy[id] ? parseJson_(lnsBy[id].topics, null) : null
      });
    })
  };
}

// ===== Setup.gs =====
/**
 * One-time setup. Run these from the Apps Script editor (select the function, press Run):
 *   1. setupSheets()        - creates every tab with its headers. Safe to run again: it never deletes data.
 *   2. createInitialUsers() - creates the first accounts (edit SEED_USERS below first)
 *   3. seedSampleData()     - OPTIONAL: fills the three sample faculty with example ratings for testing
 */

// Change every CHANGE_ME (8+ characters) before running createInitialUsers(), then delete the passwords again.
const SEED_USERS = [
  { username: 'admin',          fullName: 'L&D Administrator',   role: 'admin',   password: 'CHANGE_ME' },
  { username: 'chair.teached',  fullName: 'Dr. Roberto Cruz',    role: 'chair',   password: 'CHANGE_ME', department: 'Department of Teacher Education' },
  { username: 'maria.santos',   fullName: 'Dr. Maria Santos',    role: 'faculty', password: 'CHANGE_ME', department: 'Department of Teacher Education', rank: 'Assistant Professor II' },
  { username: 'juan.delacruz',  fullName: 'Prof. Juan Dela Cruz', role: 'faculty', password: 'CHANGE_ME', department: 'Department of Computer Studies', rank: 'Associate Professor I' },
  { username: 'alex.reyes',     fullName: 'Engr. Alex Reyes',    role: 'faculty', password: 'CHANGE_ME', department: 'School of Engineering & Tech', rank: 'Instructor III' }
];

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SCHEMA).forEach(function (name) {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const cols = SCHEMA[name];
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#e0e7ff');
    sh.setFrozenRows(1);
    if (TEXT_SHEETS.indexOf(name) >= 0) {
      sh.getRange(2, 1, Math.max(sh.getMaxRows() - 1, 1), cols.length).setNumberFormat('@');
    }
  });

  // add any missing default setting without touching existing values
  const have = {};
  readAll_('Settings').forEach(function (r) { have[String(r.key)] = true; });
  appendMany_('Settings', Object.keys(DEFAULT_SETTINGS).filter(function (k) { return !have[k]; })
    .map(function (k) { return { key: k, value: DEFAULT_SETTINGS[k] }; }));

  const blank = ss.getSheetByName('Sheet1');
  if (blank && ss.getSheets().length > 1 && blank.getLastRow() === 0) ss.deleteSheet(blank);
  Logger.log('Sheets are ready. Next: edit SEED_USERS in Setup.gs, then run createInitialUsers().');
}

function createInitialUsers() {
  SEED_USERS.forEach(function (u) {
    if (u.password === 'CHANGE_ME' || u.password.length < 8) {
      throw new Error('Edit SEED_USERS in Setup.gs: give every account a real password (8+ characters) before running this.');
    }
  });
  SEED_USERS.forEach(function (u) {
    if (findUser_(u.username)) { Logger.log('Skipped (exists): ' + u.username); return; }
    createUser({ username: u.username, fullName: u.fullName, role: u.role, password: u.password,
                 department: u.department || '', rank: u.rank || '' });
    Logger.log('Created: ' + u.username + ' (' + u.role + ')');
  });
  Logger.log('Done. Now remove the passwords from SEED_USERS in Setup.gs.');
}

/** Example data for testing the analytics page. It only fills faculty accounts that exist and have no data yet. */
function seedSampleData() {
  const R = function (a) {   // [q1_1 ... q5_2] in order -> ratings object
    const o = {}; allQuestionIds_().forEach(function (id, i) { o[id] = a[i]; }); return o;
  };
  const SAMPLE = {
    'maria.santos': {
      self:  R([3,3,2,3, 2,2,1,2, 3,2,3, 2,2,2, 3,4]),
      chair: R([3,2,2,3, 2,1,1,2, 3,2,3, 2,2,2, 3,4]),
      remarks: 'Excellent teaching aptitude. Developmental focus should be on grant writing and Scopus publication.',
      topics: { d1: 'Outcomes-Based Education (OBE) Course Design', d2: 'Grant Writing & External Funding Proposals',
                d3: 'Community Extension Project Packaging & Impact Assessment', d4: 'Faculty Mentorship & Team Leadership',
                d5: 'Academic Ethics & Integrity in Higher Ed' },
      modality: 'On-the-Job / LAP Projects (60%)', schedule: 'Mid-Year Term Break'
    },
    'juan.delacruz': {
      self:  R([4,3,3,4, 3,3,2,3, 3,3,2, 3,3,2, 4,4]),
      chair: R([4,3,3,4, 3,2,2,3, 3,2,2, 3,2,2, 4,4]),
      remarks: 'Strong instructional leader. Highly capable in IT curriculum; recommend focus on research grant acquisition.',
      topics: { d1: 'Digital Pedagogy & LMS Course Shell Development', d2: 'Publishing in Scopus / Web of Science Journals',
                d3: 'Accreditation & Quality Assurance Standards', d4: 'Strategic Planning & Risk Management',
                d5: 'Career Progression & Academic Portfolio Building' },
      modality: 'Blended / Hybrid Modality', schedule: 'Semestral Break'
    },
    'alex.reyes': {
      self:  R([2,2,2,2, 1,1,1,2, 2,1,2, 1,1,1, 3,3]),
      chair: R([2,2,2,2, 1,1,1,1, 2,1,1, 1,1,1, 3,3]),
      remarks: 'Junior faculty requiring foundational pedagogical training and research orientation.',
      topics: { d1: 'Formative & Summative Assessment Strategies', d2: 'Grant Writing & External Funding Proposals',
                d3: 'Community Extension Project Packaging & Impact Assessment', d4: 'Faculty Mentorship & Team Leadership',
                d5: 'Faculty Wellness, Stress Management & Resilience' },
      modality: 'Formal Workshops & Seminars (10%)', schedule: 'Monthly Friday Afternoons'
    }
  };

  Object.keys(SAMPLE).forEach(function (username) {
    const u = findUser_(username);
    if (!u || !str_(u.facultyId)) { Logger.log('Skipped (no faculty account): ' + username); return; }
    const fid = str_(u.facultyId), s = SAMPLE[username];
    if (!findBy_('Assessments', fid, 'self'))  saveAssessment_(fid, 'self', s.self, '', str_(u.fullName));
    if (!findBy_('Assessments', fid, 'chair')) saveAssessment_(fid, 'chair', s.chair, s.remarks, 'Sample Chair');
    if (!findBy_('LnsSurvey', fid)) appendObj_('LnsSurvey', { facultyId: fid, topics: JSON.stringify(s.topics), modality: s.modality, schedule: s.schedule, updatedAt: now_() });
    Logger.log('Sample data added for ' + username);
  });
}

// ===== Code.gs =====
/**
 * JHCSC Faculty L&D Portal - backend entry point (Google Apps Script web app).
 * The browser sends: POST { action, token, payload }  (Content-Type: text/plain to avoid CORS preflight)
 * The server answers: { ok: true, data } or { ok: false, error }
 */

/** Open the web app URL in a browser to check the deployment. */
function doGet() {
  return json_({ ok: true, data: { status: 'JHCSC L&D Portal API is running.', build: 'ld-v1', scriptId: ScriptApp.getScriptId() } });
}

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    return json_({ ok: true, data: route_(req) });
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}

function route_(req) {
  const def = ACTIONS[req.action];
  if (!def) throw new Error('Unknown action.');

  let session = null;
  if (!def.public) {
    session = getSession_(req.token);
    if (!session) throw new Error('SESSION_EXPIRED');
    if (def.roles !== '*' && def.roles.indexOf(session.role) < 0) {
      throw new Error('You do not have permission for this action.');
    }
  }

  const payload = req.payload || {};
  const run = function () { return globalThis[def.fn](payload, session); };
  let result;
  if (def.write) {
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try { result = run(); } finally { lock.releaseLock(); }
    // only ids are logged - never passwords or answers
    if (session) log_(session.username, req.action, str_(payload.facultyId || payload.username));
  } else {
    result = run();
  }
  return result === undefined ? null : result;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

