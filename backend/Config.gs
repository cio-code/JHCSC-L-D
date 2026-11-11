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
