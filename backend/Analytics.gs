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
