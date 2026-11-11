/** L&D analytics and competency gap report (chair = own department, admin = everyone). */
(function () {
  const esc = UI.esc;
  let root, rows = [];
  const $ = (s) => root.querySelector(s);
  const isAdmin = () => State.session.role === "admin";

  const TEMPLATE = () => `
    <div class="flex flex-col md:flex-row md:items-end justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4 no-print">
      <div>
        <h2 class="text-xl font-bold text-slate-800">L&amp;D Analytics &amp; Competency Gap Report</h2>
        <p class="text-xs text-slate-500">${isAdmin() ? "All departments." : "Your department."} Calculated from Annex D, Annex C and Annex G. Only faculty with both ratings are counted in the averages.</p>
      </div>
      <div class="flex items-end gap-2">
        ${isAdmin() ? '<div><label for="a-dept" class="lbl">Department</label><select id="a-dept" class="inp" style="min-width:14rem"></select></div>' : ""}
        <button id="a-refresh" class="btn btn-light">Refresh</button>
        <button id="a-print" class="btn btn-light">Print report</button>
      </div>
    </div>
    <div id="printable-analytics-report" class="space-y-6">
      <div id="a-cards" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"></div>
      <div class="grid lg:grid-cols-2 gap-6">
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 keep-together">
          <div class="flex justify-between items-center border-b pb-2"><h3 class="text-sm font-bold text-slate-800">FPDP domain competency profile</h3><span class="text-xs text-slate-500">Self vs Immediate Head</span></div>
          <div class="chart-box"><canvas id="a-radar"></canvas></div></div>
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 keep-together">
          <div class="flex justify-between items-center border-b pb-2"><h3 class="text-sm font-bold text-slate-800">Domain competency gap</h3><span class="text-xs text-slate-500">Negative = developmental gap</span></div>
          <div class="chart-box"><canvas id="a-gap"></canvas></div></div>
      </div>
      <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <h3 class="text-sm font-bold text-slate-800 border-b pb-2">Faculty competency assessment &amp; gap matrix</h3>
        <div class="overflow-x-auto"><table class="w-full text-xs text-left border-collapse border border-slate-200">
          <thead class="bg-slate-100 uppercase text-slate-700 font-bold"><tr>
            <th class="p-2 border">Faculty</th>${State.framework.domains.map((d) => '<th class="p-2 border">' + esc(d.short) + "</th>").join("")}<th class="p-2 border text-center">Status</th></tr></thead>
          <tbody id="a-body"></tbody></table></div>
      </div>
      <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 keep-together">
        <h3 class="text-sm font-bold text-slate-800 border-b pb-2">Priority learning topics (Learner Needs Survey)</h3>
        <div id="a-topics" class="text-xs"></div>
      </div>
    </div>`;

  function status(r) {
    if (r.self && r.chair) return UI.badge("Assessed", "green");
    if (r.self) return UI.badge("Awaiting chair", "amber");
    if (r.chair) return UI.badge("Awaiting self", "amber");
    return UI.badge("Not started", "slate");
  }

  function compute() {
    const doms = State.framework.domains;
    const done = rows.filter((r) => r.self && r.chair);
    const mean = (vals) => { const v = vals.filter((x) => x !== null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
    const selfAvg = doms.map((d) => mean(done.map((r) => Forms.domainAvg(d, r.self))));
    const chairAvg = doms.map((d) => mean(done.map((r) => Forms.domainAvg(d, r.chair))));
    const gaps = doms.map((d, i) => (selfAvg[i] !== null && chairAvg[i] !== null ? chairAvg[i] - selfAvg[i] : null));

    const counts = {};
    rows.forEach((r) => { if (r.lns) Object.keys(r.lns).forEach((k) => { const t = r.lns[k]; if (t) counts[t] = (counts[t] || 0) + 1; }); });
    const topics = Object.keys(counts).map((t) => ({ t: t, n: counts[t] })).sort((a, b) => b.n - a.n);
    return { done: done, selfAvg: selfAvg, chairAvg: chairAvg, gaps: gaps, topics: topics, surveyed: rows.filter((r) => r.lns).length };
  }

  function render() {
    const doms = State.framework.domains;
    const c = compute();
    const total = rows.length;

    let low = -1;
    c.gaps.forEach((g, i) => { if (g !== null && (low < 0 || g < c.gaps[low])) low = i; });
    const top = c.topics[0];

    $("#a-cards").innerHTML =
      UI.statCard("Faculty fully assessed", c.done.length + " / " + total, "indigo", total ? Math.round((c.done.length / total) * 100) + "% complete" : "No faculty yet") +
      UI.statCard("Largest competency gap", low >= 0 ? doms[low].short : "–", low >= 0 && c.gaps[low] < 0 ? "rose" : "slate", low >= 0 ? "Gap score: " + Forms.f2(c.gaps[low]) : "Needs Annex D and C") +
      UI.statCard("Top priority LNS topic", top ? top.t : "–", "amber", top ? "Chosen " + top.n + " time" + (top.n === 1 ? "" : "s") : "No surveys yet") +
      UI.statCard("Learner Needs Surveys", c.surveyed + " / " + total, "emerald", total - c.surveyed + " still to submit");

    $("#a-body").innerHTML = rows.map((r) => {
      const cells = doms.map((d) => {
        const s = Forms.domainAvg(d, r.self), ch = Forms.domainAvg(d, r.chair);
        return '<td class="p-2 border"><div class="flex justify-between gap-2"><span>Self: ' + Forms.f1(s) + "</span><span>Chair: " + Forms.f1(ch) + "</span></div>" +
          '<div class="text-xs">Gap: ' + Forms.gapHtml(s !== null && ch !== null ? ch - s : null, 1) + "</div></td>";
      }).join("");
      return '<tr><td class="p-2 border font-semibold text-slate-800">' + esc(r.name) + '<div class="text-slate-400 font-normal">' + esc(r.department) + "</div></td>" + cells + '<td class="p-2 border text-center">' + status(r) + "</td></tr>";
    }).join("") || '<tr><td colspan="' + (doms.length + 2) + '" class="p-3 text-center text-slate-400">' + esc(Data.emptyHtml()) + "</td></tr>";

    $("#a-topics").innerHTML = c.topics.length
      ? '<table class="w-full border-collapse border border-slate-200"><tbody>' + c.topics.map((x) => '<tr><td class="p-2 border">' + esc(x.t) + '</td><td class="p-2 border w-24 text-center font-semibold">' + x.n + "</td></tr>").join("") + "</tbody></table>"
      : '<p class="text-slate-400">No learner needs surveys submitted yet.</p>';

    const labels = doms.map((d) => d.short);
    Charts.radar("a-radar", labels, c.selfAvg.map((v) => (v === null ? 0 : +v.toFixed(2))), c.chairAvg.map((v) => (v === null ? 0 : +v.toFixed(2))));
    Charts.gap("a-gap", labels, c.gaps.map((v) => (v === null ? 0 : +v.toFixed(2))));
  }

  async function load() {
    const dept = isAdmin() && $("#a-dept") ? $("#a-dept").value : "";
    const data = await API.call("getAnalytics", { department: dept });
    rows = data.faculty;
    if (isAdmin()) {
      const sel = $("#a-dept");
      sel.innerHTML = '<option value="">All departments</option>' + data.departments.map((d) => '<option value="' + esc(d) + '">' + esc(d) + "</option>").join("");
      sel.value = dept;
    }
    render();
  }

  window.Steps.analytics = {
    mount(el) {
      root = el;
      root.innerHTML = TEMPLATE();
      if (isAdmin()) $("#a-dept").innerHTML = '<option value="">All departments</option>';
      if (isAdmin()) $("#a-dept").onchange = function () { UI.run(null, load); };
      $("#a-refresh").onclick = function () { UI.run(this, load); };
      $("#a-print").onclick = function () { window.print(); };
    },
    onShow() { UI.run(null, load); }
  };
})();
