/** Annex G - Learner Needs Survey (faculty role). */
(function () {
  let root;
  const $ = (s) => root.querySelector(s);
  const opts = (list, ph) => (ph ? '<option value="">' + UI.esc(ph) + "</option>" : "") + list.map((t) => '<option value="' + UI.esc(t) + '">' + UI.esc(t) + "</option>").join("");

  const TEMPLATE = () => `
    <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div class="border-b pb-4 mb-4">
        <h2 class="text-xl font-bold text-slate-800">Annex G: Learner Needs Survey for Faculty</h2>
        <p class="text-xs text-slate-500">Choose your priority learning topic for each domain, and how and when you prefer to learn.</p>
      </div>
      <div id="l-status" class="mb-4"></div>
      <form id="l-form" class="space-y-6">
        <div>
          <h3 class="text-sm font-bold text-slate-800 border-b pb-2 mb-3">Priority L&amp;D topics (one per domain)</h3>
          <div class="grid md:grid-cols-2 gap-4">
            ${State.framework.domains.map((d) => `
              <div class="p-3 bg-slate-50 border rounded-lg space-y-2">
                <label for="l-${d.id}" class="block text-xs font-bold text-slate-700">${UI.esc(d.title)}</label>
                <select id="l-${d.id}" class="inp" style="font-size:.8rem;padding:.45rem">${opts(d.lnsTopics, "— choose a topic —")}</select>
              </div>`).join("")}
          </div>
        </div>
        <div class="grid md:grid-cols-2 gap-6 pt-4 border-t">
          <div><label for="l-modality" class="lbl">Preferred delivery modality (60-30-10 framework)</label>
            <select id="l-modality" class="inp" style="font-size:.8rem;padding:.45rem">${opts(State.framework.modalities, "— choose —")}</select></div>
          <div><label for="l-schedule" class="lbl">Preferred schedule window</label>
            <select id="l-schedule" class="inp" style="font-size:.8rem;padding:.45rem">${opts(State.framework.schedules, "— choose —")}</select></div>
        </div>
        <div class="flex justify-end gap-3 pt-4 border-t">
          <button type="button" id="l-reset" class="btn btn-light">Reset</button>
          <button type="submit" class="btn btn-primary">Submit survey</button>
        </div>
      </form>
    </div>`;

  function render(p) {
    const form = $("#l-form");
    if (!p) { $("#l-status").innerHTML = '<div class="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3">' + UI.esc(Data.emptyHtml()) + "</div>"; form.classList.add("hidden"); return; }
    form.classList.remove("hidden");
    const l = p.lns;
    State.framework.domains.forEach((d) => { $("#l-" + d.id).value = (l && l.topics[d.id]) || ""; });
    $("#l-modality").value = (l && l.modality) || "";
    $("#l-schedule").value = (l && l.schedule) || "";
    $("#l-status").innerHTML = l ? UI.badge("Saved " + Forms.stamp(l.updatedAt), "green") : UI.badge("Not submitted yet", "amber");
  }

  async function load() { await Data.faculty(); render(await Data.profile(true)); }

  window.Steps.lns = {
    mount(el) {
      root = el;
      root.innerHTML = TEMPLATE();
      $("#l-reset").onclick = function () { render(State.profile); };
      $("#l-form").addEventListener("submit", function (e) {
        e.preventDefault();
        const topics = {};
        for (const d of State.framework.domains) {
          topics[d.id] = $("#l-" + d.id).value;
          if (!topics[d.id]) { UI.toast("Choose a topic for " + d.short + ".", "error"); return; }
        }
        const modality = $("#l-modality").value, schedule = $("#l-schedule").value;
        if (!modality || !schedule) { UI.toast("Choose a delivery modality and a schedule window.", "error"); return; }
        UI.run(e.submitter, async () => {
          await API.call("saveLns", { topics: topics, modality: modality, schedule: schedule });
          UI.toast("Survey saved.", "success");
          render(await Data.profile(true));
        });
      });
    },
    onShow() { UI.run(null, load); }
  };
})();
