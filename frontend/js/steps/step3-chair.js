/** Annex C - Faculty competency assessment by the Immediate Head / Chair (chair role). */
(function () {
  let root;
  const $ = (s) => root.querySelector(s);

  const TEMPLATE = () => Data.facultyBarHtml("c-faculty") + `
    <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div class="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 mb-4 gap-2">
        <div>
          <h2 class="text-xl font-bold text-slate-800">Annex C: Faculty Competency Assessment Form</h2>
          <p class="text-xs text-slate-500">Evaluate the competency level of a faculty member of your department across the FPDP domains.</p>
        </div>
        <span class="text-xs bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1 rounded-full font-medium">Assessing: <strong id="c-target">–</strong></span>
      </div>
      <div id="c-status" class="mb-4"></div>
      <form id="c-form" class="space-y-6">
        <div class="space-y-6">${Forms.ratingBlocks("chair", "amber")}</div>
        <div class="bg-amber-50 p-4 rounded-lg border border-amber-200 space-y-2">
          <label for="c-remarks" class="block text-xs font-bold text-amber-900">Qualitative feedback &amp; developmental recommendations</label>
          <textarea id="c-remarks" rows="3" maxlength="1500" class="inp" style="font-size:.8rem" placeholder="Strengths and developmental areas..."></textarea>
        </div>
        <div class="flex justify-end gap-3 pt-4 border-t">
          <button type="button" id="c-reset" class="btn btn-light">Reset</button>
          <button type="submit" class="btn btn-primary">Save evaluation</button>
        </div>
      </form>
    </div>`;

  function render(p) {
    const form = $("#c-form");
    if (!p) { $("#c-target").textContent = "–"; $("#c-status").innerHTML = '<div class="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3">' + UI.esc(Data.emptyHtml()) + "</div>"; form.classList.add("hidden"); return; }
    form.classList.remove("hidden");
    $("#c-target").textContent = p.faculty.name;
    Forms.fill(root, "chair", p.chair ? p.chair.ratings : null);
    $("#c-remarks").value = p.chair ? p.chair.remarks : "";
    $("#c-status").innerHTML =
      (p.chair ? UI.badge("Evaluated " + Forms.stamp(p.chair.updatedAt), "green") : UI.badge("Not evaluated yet", "amber")) + " " +
      (p.self ? UI.badge("Self-assessment submitted", "indigo") : UI.badge("Self-assessment pending", "slate"));
  }

  async function load() {
    await Data.faculty();
    Data.fillFacultySelect($("#c-faculty"));
    render(await Data.profile(true));
  }

  window.Steps.chair = {
    mount(el) {
      root = el;
      root.innerHTML = TEMPLATE();
      $("#c-faculty").onchange = function () { Data.setFaculty(this.value); UI.run(null, async () => render(await Data.profile(true))); };
      $("#c-reset").onclick = function () { render(State.profile); };
      $("#c-form").addEventListener("submit", function (e) {
        e.preventDefault();
        const r = Forms.read(root, "chair");
        if (r.missing) { UI.toast("Please rate every item (" + r.missing + " still unanswered).", "error"); return; }
        UI.run(e.submitter, async () => {
          await API.call("saveChair", { facultyId: State.facultyId, ratings: r.ratings, remarks: $("#c-remarks").value });
          UI.toast("Evaluation saved.", "success");
          render(await Data.profile(true));
        });
      });
    },
    onShow() { UI.run(null, load); }
  };
})();
