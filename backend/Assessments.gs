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
