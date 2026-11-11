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
