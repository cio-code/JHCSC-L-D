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
