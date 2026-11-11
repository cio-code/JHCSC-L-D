/**
 * Annex I - Individual Development Plan.
 *   faculty : writes Part III (goals) for themselves
 *   chair   : reviews faculty of their department and writes the sign-off name
 *   admin   : read-only viewer for any faculty member
 * Parts I-II (ratings, gaps, priority topics) are calculated from Annex D, C and G.
 */
(function () {
  const esc = UI.esc;
  let root;
  const $ = (s) => root.querySelector(s);
  const role = () => State.session.role;
  const canEditGoals = () => role() === "faculty";
  const canSign = () => role() === "chair";

  const FIELDS = [
    ["goal1", "interv1", "supp1", "time1"],
    ["goal2", "interv2", "supp2", "time2"]
  ];
  const PLACEHOLDERS = [
    ["e.g., Enhance outcomes-based instructional design...", "e.g., OBTL workshop (10%) and classroom LAP (60%)", "e.g., L&D funding, LMS course shell allocation", "e.g., Target: Q2; Indicator: Revised course syllabus"],
    ["e.g., Produce one publishable research paper draft...", "e.g., Research mentoring (30%) and writing retreat", "e.g., Institutional research grant, statistical mentorship", "e.g., Target: Q3; Indicator: Submitted journal draft"]
  ];

  const TEMPLATE = () => Data.facultyBarHtml("i-faculty") + `
    <div class="flex flex-wrap justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print gap-3">
      <div>
        <h2 class="text-base font-bold text-slate-800">Annex I: Individual Development Plan (IDP) for Faculty</h2>
        <p class="text-xs text-slate-500">Parts I–II are calculated from Annex D (self), Annex C (Immediate Head) and Annex G (learner needs).</p>
      </div>
      <div class="flex gap-2">
        <button id="i-print" class="btn btn-light">Print / export PDF</button>
        <button id="i-save" class="btn btn-primary hidden">Save IDP</button>
      </div>
    </div>
    <div id="printable-idp" class="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6 text-slate-800"></div>`;

  function gapRows(p) {
    return State.framework.domains.map((dom) => {
      const s = Forms.domainAvg(dom, p.self && p.self.ratings);
      const c = Forms.domainAvg(dom, p.chair && p.chair.ratings);
      const gap = s !== null && c !== null ? c - s : null;
      const topic = (p.lns && p.lns.topics[dom.id]) || "";
      return `<tr>
        <td class="border border-slate-300 p-2 font-medium">${esc(dom.title)}</td>
        <td class="border border-slate-300 p-2 text-center">${Forms.f2(s)}</td>
        <td class="border border-slate-300 p-2 text-center">${Forms.f2(c)}</td>
        <td class="border border-slate-300 p-2 text-center">${Forms.gapHtml(gap)}</td>
        <td class="border border-slate-300 p-2">${topic ? esc(topic) : '<span class="text-slate-400">Not yet selected</span>'}</td></tr>`;
    }).join("");
  }

  function render(p) {
    const area = $("#printable-idp");
    $("#i-save").classList.toggle("hidden", !(canEditGoals() || canSign()) || !p);
    if (!p) { area.innerHTML = '<p class="text-sm text-slate-400 no-print">' + esc(Data.emptyHtml()) + "</p>"; return; }

    const f = p.faculty, idp = p.idp || {};
    const ro = canEditGoals() ? "" : " readonly";
    const cell = (k, i, j) => `<td class="border border-slate-300 p-2"><textarea id="i-${k}" rows="4" maxlength="600" class="inp"${ro} placeholder="${esc(canEditGoals() ? PLACEHOLDERS[i][j] : "")}">${esc(idp[k] || "")}</textarea></td>`;

    area.innerHTML = `
      <div class="text-center border-b pb-4 space-y-1">
        <img src="assets/logo.png" alt="" class="w-14 h-14 mx-auto">
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Republic of the Philippines</p>
        <h3 class="text-base font-bold text-slate-900 uppercase">J. H. Cerilles State College</h3>
        <p class="text-xs text-slate-600">Mati, San Miguel, Zamboanga del Sur</p>
        <h2 class="text-lg font-bold text-indigo-900 pt-2 uppercase tracking-wide">Individual Development Plan for Faculty (Annex I)</h2>
        <p class="text-xs text-slate-500 italic">Faculty Performance Development Program (${esc(State.framework.settings.manual)})</p>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200 keep-together">
        <div><span class="font-bold text-slate-500 block">Name of Faculty</span><span class="font-semibold">${esc(f.name)}</span></div>
        <div><span class="font-bold text-slate-500 block">Position / Academic Rank</span><span class="font-semibold">${esc(f.rank)}</span></div>
        <div><span class="font-bold text-slate-500 block">School / Department</span><span class="font-semibold">${esc(f.department)}</span></div>
        <div><span class="font-bold text-slate-500 block">Target Assessment Period</span><span class="font-semibold">${esc(State.framework.settings.schoolYear)}</span></div>
      </div>

      <div class="space-y-3">
        <h4 class="text-xs font-bold uppercase tracking-wider text-indigo-900 border-b pb-1">Part I &amp; II: Identified Priority Development Needs (calculated)</h4>
        <div class="overflow-x-auto"><table class="w-full text-xs text-left border-collapse border border-slate-300">
          <thead class="bg-slate-100 uppercase text-slate-700 font-bold"><tr>
            <th class="border border-slate-300 p-2">FPDP Domain</th><th class="border border-slate-300 p-2 text-center">Self rating</th>
            <th class="border border-slate-300 p-2 text-center">Supervisor rating</th><th class="border border-slate-300 p-2 text-center">Gap</th>
            <th class="border border-slate-300 p-2">Priority topic (Learner Needs Survey)</th></tr></thead>
          <tbody>${gapRows(p)}</tbody></table></div>
        <p class="text-xs text-slate-400 no-print">A dash means that rating has not been submitted yet. Gap = Supervisor − Self; a negative gap means the faculty rated themselves higher than the Immediate Head did.</p>
      </div>

      <div class="space-y-3 pt-2">
        <div class="flex justify-between items-center border-b pb-1">
          <h4 class="text-xs font-bold uppercase tracking-wider text-indigo-900">Part III: Individual Action Plan &amp; Development Objectives</h4>
          ${canEditGoals() ? '<span class="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium no-print">Fill in your objectives, interventions, resources and timelines</span>' : ""}
        </div>
        <div class="overflow-x-auto"><table class="w-full text-xs text-left border-collapse border border-slate-300">
          <thead class="bg-indigo-900 text-white uppercase font-semibold"><tr>
            <th class="border border-slate-300 p-2 w-1/4">Development goal / objective</th><th class="border border-slate-300 p-2 w-1/4">Target L&amp;D intervention (60-30-10)</th>
            <th class="border border-slate-300 p-2 w-1/4">Support / resources needed</th><th class="border border-slate-300 p-2 w-1/4">Timeline &amp; success indicator</th></tr></thead>
          <tbody>${FIELDS.map((row, i) => "<tr>" + row.map((k, j) => cell(k, i, j)).join("") + "</tr>").join("")}</tbody></table></div>
      </div>

      <div class="space-y-4 pt-4 border-t keep-together">
        <h4 class="text-xs font-bold uppercase tracking-wider text-indigo-900">Part IV: Review, Commitment and Sign-Off</h4>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs pt-2">
          <div class="border p-4 rounded-lg text-center space-y-3 bg-slate-50">
            <p class="font-bold text-slate-700">Prepared by (Faculty Member)</p>
            <div class="h-12 flex items-center justify-center font-serif italic text-base">${esc(f.name)}</div>
            <p class="border-t pt-1 font-semibold text-slate-600">Faculty signature &amp; date</p></div>
          <div class="border p-4 rounded-lg text-center space-y-3 bg-slate-50">
            <p class="font-bold text-slate-700">Reviewed &amp; endorsed by</p>
            <input id="i-chair" maxlength="80" class="w-full text-center border-b border-slate-400 bg-transparent py-1 font-semibold focus:outline-none" value="${esc(idp.chairName || "")}"${canSign() ? "" : " readonly"} placeholder="${canSign() ? "Enter Immediate Head / Chair name" : ""}">
            <p class="border-t pt-1 font-semibold text-slate-600">Immediate Head / Department Chair</p></div>
          <div class="border p-4 rounded-lg text-center space-y-3 bg-slate-50">
            <p class="font-bold text-slate-700">Approved by (HRMO / L&amp;D Unit)</p>
            <div class="h-12 flex items-center justify-center font-semibold">JHCSC L&amp;D Committee</div>
            <p class="border-t pt-1 font-semibold text-slate-600">Personnel Development Committee</p></div>
        </div>
      </div>`;
  }

  async function load() {
    await Data.faculty();
    Data.fillFacultySelect($("#i-faculty"));
    render(await Data.profile(true));
  }

  window.Steps.idp = {
    mount(el) {
      root = el;
      root.innerHTML = TEMPLATE();
      const sel = $("#i-faculty");
      if (sel) sel.onchange = function () { Data.setFaculty(this.value); UI.run(null, async () => render(await Data.profile(true))); };
      $("#i-print").onclick = function () { window.print(); };
      $("#i-save").onclick = function () {
        UI.run(this, async () => {
          if (canEditGoals()) {
            const body = {};
            FIELDS.forEach((row) => row.forEach((k) => { body[k] = $("#i-" + k).value; }));
            await API.call("saveIdp", body);
          } else {
            await API.call("saveIdp", { facultyId: State.facultyId, chairName: $("#i-chair").value });
          }
          UI.toast("IDP saved.", "success");
          render(await Data.profile(true));
        });
      };
    },
    onShow() { UI.run(null, load); }
  };
})();
