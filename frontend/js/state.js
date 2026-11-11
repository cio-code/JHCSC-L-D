/** Shared in-memory data, the selected faculty member, and small loaders used by several steps. */
window.Steps = window.Steps || {};
window.State = { session: null, framework: null, faculty: [], facultyId: "", profile: null };

(function () {
  const KEY = "jhcsc.ld.faculty";

  window.Data = {
    /** The FPDP framework (domains, questions, topics, scale). It lives on the server only. */
    async framework() {
      if (!State.framework) State.framework = await API.call("getFramework");
      return State.framework;
    },

    /** The faculty this user may see (the server decides: own record / own department / everyone). */
    async faculty() {
      State.faculty = await API.call("listFaculty");
      if (!State.faculty.some((f) => f.facultyId === State.facultyId)) {
        const saved = sessionStorage.getItem(KEY);
        State.facultyId = State.faculty.some((f) => f.facultyId === saved) ? saved : (State.faculty[0] ? State.faculty[0].facultyId : "");
        State.profile = null;
      }
      return State.faculty;
    },
    setFaculty(id) {
      State.facultyId = id || "";
      sessionStorage.setItem(KEY, State.facultyId);
      State.profile = null;
    },

    /** Annex D + C + G + I of the selected faculty member. */
    async profile(force) {
      if (!State.facultyId) { State.profile = null; return null; }
      if (force || !State.profile || State.profile.faculty.facultyId !== State.facultyId) {
        State.profile = await API.call("getProfile", { facultyId: State.facultyId });
      }
      return State.profile;
    },

    /** The "Faculty" picker shown at the top of the chair and admin steps (faculty never get one). */
    facultyBarHtml(selectId, extraHtml) {
      if (State.session.role === "faculty") return "";
      return '<div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-end gap-4 no-print">' +
        '<div class="flex-1" style="min-width:16rem"><label for="' + selectId + '" class="lbl">Faculty member</label>' +
        '<select id="' + selectId + '" class="inp" style="font-size:.875rem;padding:.5rem"></select></div>' + (extraHtml || "") + "</div>";
    },
    fillFacultySelect(sel) {
      if (!sel) return;
      sel.innerHTML = State.faculty.length
        ? State.faculty.map((f) => '<option value="' + UI.esc(f.facultyId) + '">' + UI.esc(f.name) + " — " + UI.esc(f.department) + "</option>").join("")
        : '<option value="">No faculty yet</option>';
      sel.value = State.facultyId;
    },

    /** Shown instead of a form when there is nobody to work on. */
    emptyHtml() {
      return State.session.role === "faculty"
        ? "Your account is not linked to a faculty profile. Ask the L&D administrator."
        : (State.session.role === "chair" ? "No faculty found in your department yet. Ask the administrator to create faculty accounts with your department." : "No faculty accounts yet. Create them under Users & activity log.");
    }
  };
})();
