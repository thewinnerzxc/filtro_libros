/* ===============================
   MS Books — Sheets Sync (no token)
   =============================== */

const GSHEET_ENDPOINT = "https://script.google.com/macros/s/AKfycbweofz8w6PK33MuLY8NfNjtadSnUFzS1H0zEW4qqU2MkiKLbWlL2mHsxf8ITdrpnYr85g/exec";

/* --- Red --- */
async function apiGET(params = {}) {
  const url = `${GSHEET_ENDPOINT}?${new URLSearchParams(params)}`;
  const res = await fetch(url, { method: "GET" });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "GET_failed");
  return data;
}
async function apiPOST(body) {
  const res = await fetch(GSHEET_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "POST_failed");
  return data;
}

/* --- Operaciones --- */
async function loadFromSheet({ since = null } = {}) {
  const params = { op: "list" };
  if (since) params.since = since;
  const data = await apiGET(params);
  return data.rows || [];
}
async function appendRows(rows) {
  // rows: [{ id?, titulo, notas, fileURL, fecha? }, ...]
  return await apiPOST({ op: "append", rows });
}
async function upsertRows(rows, key = "fileURL") {
  return await apiPOST({ op: "upsert", key, rows });
}

/* --- Auto refresh (delta) --- */
let lastSync = null;
function startAutoRefresh(intervalMs = 25000) {
  lastSync = nowStr();
  setInterval(async () => {
    try {
      const rows = await loadFromSheet({ since: lastSync });
      if (rows.length) mergeRowsIntoUI(rows);
      lastSync = nowStr();
    } catch (e) {
      console.warn("Auto-refresh error:", e);
    }
  }, intervalMs);
}

/* --- Utilidades --- */
function nowStr() {
  // ISO-like sin zona (YYYY-MM-DD HH:mm:ss) basado en hora local
  const d = new Date();
  const pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/* --- Integración con tu UI ---
   Tu app usa claves: title, notes, file_url (según tu screenshot).
   Mapeamos desde el servidor (titulo, notas, fileURL) → tu estructura UI.
*/
function mergeRowsIntoUI(newRows) {
  const mapped = newRows.map(r => ({
    id: r.id,
    title: r.titulo,
    notes: r.notas,
    file_url: r.fileURL,
    fecha: r.fecha
  }));

  // Si tienes un store propio, actualízalo aquí. Si no, render mínimo:
  const tbody = document.querySelector("#tbody");
  if (!tbody) return;
  const frag = document.createDocumentFragment();
  mapped.forEach(it => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${it.title || ""}</td>
      <td><small>${(it.notes||"").slice(0,200)}</small></td>
      <td><a class="pill" href="${it.file_url||'#'}" target="_blank" rel="noopener">open</a></td>
      <td><small>${it.fecha||""}</small></td>
    `;
    frag.appendChild(tr);
  });
  tbody.innerHTML = "";
  tbody.appendChild(frag);
}

/* --- Init --- */
async function initSheetsSync() {
  const rows = await loadFromSheet();  // carga completa
  mergeRowsIntoUI(rows);
  startAutoRefresh(25000);             // delta cada 25 s
}

window.MSBooksSheets = { initSheetsSync, loadFromSheet, appendRows, upsertRows };
