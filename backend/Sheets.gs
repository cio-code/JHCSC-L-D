/** Small helpers for reading and writing the Google Sheet "database". */

function now_() { return new Date().toISOString(); }
function str_(v) { return (v === null || v === undefined) ? '' : String(v).trim(); }
function newId_(prefix) { return prefix + Utilities.getUuid().replace(/-/g, '').slice(0, 8); }
function parseJson_(s, fallback) {
  try { return (s === '' || s === null || s === undefined) ? fallback : JSON.parse(s); } catch (e) { return fallback; }
}

function sheet_(name) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('Missing sheet tab "' + name + '". Run setupSheets() once from the Apps Script editor.');
  return sh;
}

/** Returns every data row as an object keyed by header name. _row = sheet row number. */
function readAll_(name) {
  const sh = sheet_(name);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const head = values[0].map(String);
  const out = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    let empty = true;
    for (let j = 0; j < row.length; j++) { if (row[j] !== '') { empty = false; break; } }
    if (empty) continue;
    const o = { _row: i + 1 };
    for (let j = 0; j < head.length; j++) o[head[j]] = row[j];
    out.push(o);
  }
  return out;
}

function toRow_(name, obj) {
  return SCHEMA[name].map(function (c) {
    const v = obj[c];
    return (v === undefined || v === null) ? '' : v;
  });
}

function writeRange_(name, startRow, rows2d) {
  if (!rows2d.length) return;
  const rng = sheet_(name).getRange(startRow, 1, rows2d.length, SCHEMA[name].length);
  if (TEXT_SHEETS.indexOf(name) >= 0) rng.setNumberFormat('@');
  rng.setValues(rows2d);
}

function appendObj_(name, obj) { appendMany_(name, [obj]); }

function appendMany_(name, objs) {
  if (!objs.length) return;
  const sh = sheet_(name);
  const start = Math.max(sh.getLastRow(), 1) + 1;
  writeRange_(name, start, objs.map(function (o) { return toRow_(name, o); }));
}

/** Patch one row (found earlier through readAll_, which supplies _row). */
function updateRow_(name, rowNum, patch) {
  const sh = sheet_(name);
  const cols = SCHEMA[name];
  const cur = sh.getRange(rowNum, 1, 1, cols.length).getValues()[0];
  const obj = {};
  cols.forEach(function (c, i) { obj[c] = cur[i]; });
  Object.keys(patch).forEach(function (k) { obj[k] = patch[k]; });
  writeRange_(name, rowNum, [toRow_(name, obj)]);
}

function deleteRow_(name, rowNum) { sheet_(name).deleteRow(rowNum); }

/** Replace every data row of a tab (header row is kept). */
function replaceAll_(name, objs) {
  const sh = sheet_(name);
  const last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, Math.max(sh.getLastColumn(), SCHEMA[name].length)).clearContent();
  writeRange_(name, 2, objs.map(function (o) { return toRow_(name, o); }));
}

/** Update the row where match(row) is true, otherwise append a new one. */
function upsert_(name, match, obj) {
  const row = readAll_(name).find(match);
  if (row) updateRow_(name, row._row, obj); else appendObj_(name, obj);
}

function getSettings_() {
  const out = {};
  Object.keys(DEFAULT_SETTINGS).forEach(function (k) { out[k] = DEFAULT_SETTINGS[k]; });
  readAll_('Settings').forEach(function (r) { if (r.key !== '') out[String(r.key)] = str_(r.value); });
  return out;
}
