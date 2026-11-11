/** Chart.js visuals for the analytics page. */
(function () {
  if (window.Chart) {
    Chart.defaults.font.family = "Inter, system-ui, -apple-system, sans-serif";
    Chart.defaults.font.size = 11;
    Chart.defaults.color = "#475569";
  }
  const live = {};
  function draw(id, config) {
    const el = document.getElementById(id);
    if (!el || !window.Chart) return;
    if (live[id]) live[id].destroy();
    config.options = Object.assign({ responsive: true, maintainAspectRatio: false }, config.options || {});
    live[id] = new Chart(el, config);
  }

  window.Charts = {
    radar(id, labels, selfAvgs, chairAvgs) {
      draw(id, {
        type: "radar",
        data: { labels: labels, datasets: [
          { label: "Faculty self rating", data: selfAvgs, backgroundColor: "rgba(79,70,229,.18)", borderColor: "#4f46e5", pointBackgroundColor: "#4f46e5" },
          { label: "Immediate Head rating", data: chairAvgs, backgroundColor: "rgba(245,158,11,.2)", borderColor: "#f59e0b", pointBackgroundColor: "#f59e0b" }] },
        options: { scales: { r: { min: 0, max: 4, ticks: { stepSize: 1 } } }, plugins: { legend: { position: "bottom" } } }
      });
    },
    gap(id, labels, gaps) {
      draw(id, {
        type: "bar",
        data: { labels: labels, datasets: [{ label: "Gap (Immediate Head − Self)", data: gaps,
          backgroundColor: gaps.map((v) => (v < 0 ? "rgba(244,63,94,.7)" : "rgba(16,185,129,.7)")),
          borderColor: gaps.map((v) => (v < 0 ? "#f43f5e" : "#10b981")), borderWidth: 1 }] },
        options: { scales: { y: { suggestedMin: -1.5, suggestedMax: 1.5 }, x: { grid: { display: false } } }, plugins: { legend: { position: "bottom" } } }
      });
    }
  };
})();
