/**
 * JHCSC Faculty L&D Portal - backend entry point (Google Apps Script web app).
 * The browser sends: POST { action, token, payload }  (Content-Type: text/plain to avoid CORS preflight)
 * The server answers: { ok: true, data } or { ok: false, error }
 */

/** Open the web app URL in a browser to check the deployment. */
function doGet() {
  return json_({ ok: true, data: { status: 'JHCSC L&D Portal API is running.', build: 'ld-v1', scriptId: ScriptApp.getScriptId() } });
}

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    return json_({ ok: true, data: route_(req) });
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}

function route_(req) {
  const def = ACTIONS[req.action];
  if (!def) throw new Error('Unknown action.');

  let session = null;
  if (!def.public) {
    session = getSession_(req.token);
    if (!session) throw new Error('SESSION_EXPIRED');
    if (def.roles !== '*' && def.roles.indexOf(session.role) < 0) {
      throw new Error('You do not have permission for this action.');
    }
  }

  const payload = req.payload || {};
  const run = function () { return globalThis[def.fn](payload, session); };
  let result;
  if (def.write) {
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try { result = run(); } finally { lock.releaseLock(); }
    // only ids are logged - never passwords or answers
    if (session) log_(session.username, req.action, str_(payload.facultyId || payload.username));
  } else {
    result = run();
  }
  return result === undefined ? null : result;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
