/** Action log. Never logs passwords or answers. */

function log_(username, action, detail) {
  try {
    appendObj_('AuditLog', { time: now_(), username: username || '', action: action, detail: detail || '' });
  } catch (e) { /* logging must never break a request */ }
}

function getAuditLog(p) {
  const limit = Math.min(Number(p.limit) || 100, 500);
  const rows = readAll_('AuditLog');
  return rows.slice(-limit).reverse().map(function (r) {
    return { time: str_(r.time), username: str_(r.username), action: str_(r.action), detail: str_(r.detail) };
  });
}
