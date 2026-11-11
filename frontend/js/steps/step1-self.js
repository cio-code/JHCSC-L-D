/** Annex D - Faculty self-assessment (faculty role). */
(function () {
  let root;
  const $ = (s) => root.querySelector(s);

  const TEMPLATE = () => `
    <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div class="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 mb-4 gap-2">
        <div>
          <h2 class="text-xl font-bold text-slate-800">Annex D: Faculty Self-Assessment Form</h2>
          <p class="text-xs text-slate-500">Rate your current proficiency across the five Faculty Performance Development Program (FPDP) domains.</p>
        </div>
        <span class="text-xs bg-slate-100 border text-slate-600 px-3 py-1 rounded-full font-medium">Scale: ${State.framework.scale.map((s) => s.value + " – " + UI.esc(s.label)).join(" | ")}</span>
      </div>
      <div id="s-status" class="mb-4"></div>
      <form id="s-form" class="space-y-6">
        <div class="space-y-6">${Forms.ratingBlocks("self", "indigo")}</div>
        <div class="flex justify-end gap-3 pt-4 border-t">
          <button type="button" id="s-reset" class="btn btn-light">Reset</button>
          <button type="submit" class="btn btn-primary">Save self-assessment</button>
        </div>
      </form>
    </div>`;

  function render(p) {
    const form = $("#s-form");
    if (!p) { $("#s-status").innerHTML = '<div class="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3">' + UI.esc(Data.emptyHtml()) + "</div>"; form.classList.add("hidden"); return; }
    form.classList.remove("hidden");
    Forms.fill(root, "self", p.self ? p.self.ratings : null);
    $("#s-status").innerHTML = p.self
      ? UI.badge("Saved " + Forms.stamp(p.self.updatedAt), "green") + ' <span class="text-xs text-slate-500">You can change your answers and save again.</span>'
      : UI.badge("Not submitted yet", "amber");
  }

  async function load() { await Data.faculty(); render(await Data.profile(true)); }

  window.Steps.self = {
    mount(el) {
      root = el;
      root.innerHTML = TEMPLATE();
      $("#s-reset").onclick = function () { render(State.profile); };
      $("#s-form").addEventListener("submit", function (e) {
        e.preventDefault();
        const r = Forms.read(root, "self");
        if (r.missing) { UI.toast("Please rate every item (" + r.missing + " still unanswered).", "error"); return; }
        UI.run(e.submitter, async () => {
          await API.call("saveSelf", { ratings: r.ratings });
          UI.toast("Self-assessment saved.", "success");
          render(await Data.profile(true));
        });
      });
    },
    onShow() { UI.run(null, load); }
  };
})();
