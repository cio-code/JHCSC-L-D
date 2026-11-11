/** Rating blocks (Annex D and C) and the small maths used by the IDP and the analytics page. */
(function () {
  const esc = UI.esc;
  const ids = () => State.framework.domains.reduce((a, d) => a.concat(d.questions.map((q) => q.id)), []);

  function ratingBlocks(prefix, tone) {
    const amber = tone === "amber";
    const wrap = amber ? "bg-amber-50/50 border-amber-200" : "bg-slate-50 border-slate-200";
    const head = amber ? "text-amber-900 border-amber-200" : "text-indigo-800 border-slate-200";
    return State.framework.domains.map((dom) =>
      '<div class="' + wrap + ' p-4 rounded-xl border space-y-3">' +
        '<h3 class="text-xs font-bold uppercase tracking-wider ' + head + ' border-b pb-2">' + esc(dom.title) + "</h3>" +
        '<div class="space-y-2">' + dom.questions.map((q) =>
          '<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-white p-2.5 rounded-lg border border-slate-200">' +
            '<span class="font-medium text-slate-700 sm:w-2/3">' + esc(q.text) + "</span>" +
            '<div class="flex items-center gap-4 radio-row" role="radiogroup" aria-label="' + esc(q.text) + '">' +
              State.framework.scale.map((s) =>
                '<label title="' + esc(s.label) + '"><input type="radio" name="' + prefix + "_" + q.id + '" value="' + s.value + '"><span>' + s.value + "</span></label>").join("") +
            "</div></div>").join("") +
        "</div></div>").join("");
  }

  function fill(root, prefix, ratings) {
    ids().forEach((id) => root.querySelectorAll('input[name="' + prefix + "_" + id + '"]').forEach((r) => { r.checked = !!ratings && String(ratings[id]) === r.value; }));
  }

  function read(root, prefix) {
    const ratings = {}; let missing = 0;
    ids().forEach((id) => {
      const c = root.querySelector('input[name="' + prefix + "_" + id + '"]:checked');
      if (c) ratings[id] = Number(c.value); else missing++;
    });
    return { ratings: ratings, missing: missing };
  }

  /** Average rating (1-4) of one domain, or null when there are no ratings. */
  function domainAvg(dom, ratings) {
    if (!ratings) return null;
    const v = dom.questions.map((q) => Number(ratings[q.id])).filter((n) => n >= 1 && n <= 4);
    return v.length === dom.questions.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  }

  const f2 = (n) => (n === null || n === undefined || isNaN(n) ? "–" : n.toFixed(2));
  const f1 = (n) => (n === null || n === undefined || isNaN(n) ? "–" : n.toFixed(1));
  function gapHtml(gap, digits) {
    if (gap === null || isNaN(gap)) return '<span class="text-slate-400">–</span>';
    const txt = (gap > 0 ? "+" : "") + gap.toFixed(digits || 2);
    return '<span class="' + (gap < -0.004 ? "gap-neg" : gap > 0.004 ? "gap-pos" : "text-slate-600 font-semibold") + '">' + txt + "</span>";
  }
  function stamp(iso) { const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }); }

  window.Forms = { ratingBlocks: ratingBlocks, fill: fill, read: read, domainAvg: domainAvg, f1: f1, f2: f2, gapHtml: gapHtml, stamp: stamp };
})();
