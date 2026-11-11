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
