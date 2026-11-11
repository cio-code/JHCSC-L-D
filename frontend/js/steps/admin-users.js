/** Admin - manage accounts (with department / rank) and read the activity log. */
(function () {
  let root, users = [], editing = null;
  const ROLE = EDU_CONFIG.ROLE_LABELS;
  const $ = (s) => root.querySelector(s);

  const TEMPLATE = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 self-start">
        <h3 id="u-title" class="font-bold text-sm text-slate-800 border-b pb-2">Create account</h3>
        <div><label for="u-name" class="lbl">Username</label><input id="u-name" class="inp" maxlength="30" autocomplete="off"></div>
        <div><label for="u-full" class="lbl">Full name (as printed on the IDP)</label><input id="u-full" class="inp" maxlength="80" autocomplete="off"></div>
        <div><label for="u-role" class="lbl">Role</label>
          <select id="u-role" class="inp">
            <option value="faculty">Faculty — Annex D, G, I (own)</option>
            <option value="chair">Immediate Head / Chair — Annex C, I, analytics (own department)</option>
            <option value="admin">L&amp;D Administrator — analytics, IDP viewer, users</option>
          </select></div>
        <div id="u-dept-wrap"><label for="u-dept" class="lbl">Department</label><input id="u-dept" class="inp" maxlength="80" list="u-dept-list" autocomplete="off"><datalist id="u-dept-list"></datalist>
          <p class="text-xs text-slate-400 mt-1">A chair sees faculty whose department is spelled the same.</p></div>
        <div id="u-rank-wrap"><label for="u-rank" class="lbl">Academic rank</label><input id="u-rank" class="inp" maxlength="60" placeholder="e.g. Assistant Professor II" autocomplete="off"></div>
        <div id="u-pass-wrap"><label for="u-pass" class="lbl">Temporary password (8+ characters)</label><input id="u-pass" type="password" class="inp" autocomplete="new-password"></div>
        <div class="flex gap-2">
          <button id="u-create" class="btn btn-primary flex-1 justify-center">Create account</button>
          <button id="u-cancel" class="btn btn-light hidden">Cancel</button>
        </div>
      </div>
      <div class="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <h3 class="font-bold text-sm text-slate-800 border-b pb-2">Accounts</h3>
        <div class="overflow-x-auto"><table class="w-full text-xs border text-left">
          <thead class="bg-slate-100"><tr><th class="p-2 border">Username</th><th class="p-2 border">Name</th><th class="p-2 border">Role</th><th class="p-2 border">Department / rank</th><th class="p-2 border">Status</th><th class="p-2 border">Actions</th></tr></thead>
          <tbody id="u-body"></tbody></table></div>
      </div>
    </div>
    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
      <div class="flex justify-between items-center border-b pb-2"><h3 class="font-bold text-sm text-slate-800">Recent activity</h3><button id="log-refresh" class="btn btn-light">Refresh</button></div>
      <div class="overflow-x-auto max-h-80 overflow-y-auto"><table class="w-full text-xs border text-left">
        <thead class="bg-slate-100"><tr><th class="p-2 border">Time</th><th class="p-2 border">User</th><th class="p-2 border">Action</th><th class="p-2 border">Detail</th></tr></thead>
        <tbody id="log-body"></tbody></table></div>
    </div>`;

  function syncForm() {
    const role = $("#u-role").value;
    $("#u-dept-wrap").classList.toggle("hidden", role === "admin");
    $("#u-rank-wrap").classList.toggle("hidden", role !== "faculty");
    $("#u-pass-wrap").classList.toggle("hidden", !!editing);
    $("#u-role").disabled = !!editing;
    $("#u-name").disabled = !!editing;
    $("#u-title").textContent = editing ? "Edit " + editing : "Create account";
    $("#u-create").textContent = editing ? "Save changes" : "Create account";
    $("#u-cancel").classList.toggle("hidden", !editing);
  }
  function clearForm() { editing = null; ["#u-name", "#u-full", "#u-dept", "#u-rank", "#u-pass"].forEach((s) => ($(s).value = "")); $("#u-role").value = "faculty"; syncForm(); }

  function renderUsers() {
    const depts = {}; users.forEach((u) => { if (u.department) depts[u.department] = 1; });
    $("#u-dept-list").innerHTML = Object.keys(depts).sort().map((d) => '<option value="' + UI.esc(d) + '">').join("");
    $("#u-body").innerHTML = users.map((u) => `<tr>
      <td class="p-2 border font-semibold">${UI.esc(u.username)}</td><td class="p-2 border">${UI.esc(u.fullName)}</td>
      <td class="p-2 border">${UI.esc(ROLE[u.role] || u.role)}</td>
      <td class="p-2 border">${UI.esc(u.department || "–")}${u.rank ? '<div class="text-slate-400">' + UI.esc(u.rank) + "</div>" : ""}</td>
      <td class="p-2 border">${UI.badge(u.active ? "Active" : "Disabled", u.active ? "green" : "red")}</td>
      <td class="p-2 border"><span class="flex flex-wrap gap-3">
        <button class="link-btn text-indigo-600" data-edit="${UI.esc(u.username)}">Edit</button>
        <button class="link-btn text-indigo-600" data-reset="${UI.esc(u.username)}">Reset password</button>
        ${u.username === State.session.username ? "" : `<button class="link-btn text-rose-600" data-active="${UI.esc(u.username)}" data-to="${u.active ? "0" : "1"}">${u.active ? "Disable" : "Enable"}</button>`}
      </span></td></tr>`).join("");
  }

  async function loadUsers() { users = await API.call("listUsers"); renderUsers(); }
  async function loadLog() {
    const log = await API.call("getAuditLog", { limit: 100 });
    $("#log-body").innerHTML = log.map((l) => `<tr><td class="p-2 border whitespace-nowrap">${UI.esc(new Date(l.time).toLocaleString())}</td><td class="p-2 border">${UI.esc(l.username)}</td><td class="p-2 border">${UI.esc(l.action)}</td><td class="p-2 border text-slate-500">${UI.esc(l.detail)}</td></tr>`).join("")
      || '<tr><td colspan="4" class="p-3 text-center text-slate-400">No activity yet.</td></tr>';
  }

  window.Steps.users = {
    mount(el) {
      root = el;
      root.innerHTML = TEMPLATE;
      syncForm();
      $("#u-role").onchange = syncForm;
      $("#u-cancel").onclick = clearForm;
      $("#u-create").onclick = function () {
        UI.run(this, async () => {
          if (editing) {
            await API.call("updateUser", { username: editing, fullName: $("#u-full").value, department: $("#u-dept").value, rank: $("#u-rank").value });
            UI.toast("Account updated. They must sign in again.", "success");
          } else {
            await API.call("createUser", { username: $("#u-name").value, fullName: $("#u-full").value, role: $("#u-role").value,
              department: $("#u-dept").value, rank: $("#u-rank").value, password: $("#u-pass").value });
            UI.toast("Account created.", "success");
          }
          clearForm();
          await loadUsers();
        });
      };
      $("#u-body").addEventListener("click", (e) => {
        const t = e.target;
        if (t.dataset.edit) {
          const u = users.find((x) => x.username === t.dataset.edit);
          editing = u.username;
          $("#u-name").value = u.username; $("#u-full").value = u.fullName; $("#u-role").value = u.role;
          $("#u-dept").value = u.department || ""; $("#u-rank").value = u.rank || "";
          syncForm(); $("#u-full").focus();
        } else if (t.dataset.reset) {
          const pw = prompt("New temporary password for " + t.dataset.reset + " (8+ characters):");
          if (!pw) return;
          UI.run(null, async () => { await API.call("resetPassword", { username: t.dataset.reset, newPassword: pw }); UI.toast("Password reset. They are signed out.", "success"); });
        } else if (t.dataset.active) {
          UI.run(null, async () => { await API.call("setUserActive", { username: t.dataset.active, active: t.dataset.to === "1" }); await loadUsers(); });
        }
      });
      $("#log-refresh").onclick = function () { UI.run(this, loadLog); };
    },
    onShow() { UI.run(null, async () => { await loadUsers(); await loadLog(); }); }
  };
})();
