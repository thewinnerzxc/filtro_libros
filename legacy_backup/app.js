// ====== Fecha/hora en Lima (UTC-5) ======
const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000; // 5 horas

// Formato YYYY-MM-DD HH:mm:ss usando getters UTC
function fmtYYYYMMDD_HHMMSS_UTC(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ` +
         `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

// “Ahora” en Lima = UTC - 5h
function nowLimaString() {
  return fmtYYYYMMDD_HHMMSS_UTC(new Date(Date.now() - LIMA_OFFSET_MS));
}

// --- app.js ---
import { toCSV } from './csv.js';
import { pickFolder, tryReconnect, loadCsvFromFolder, saveAllFiles, dirHandle } from './fs.js';

const $ = s => document.querySelector(s);

// Top UI
const qInp  = $("#q"),             // buscador A (oficial)
      q2Inp = $("#q2");            // buscador B (independiente)
const clearQBtn  = $("#clearQ"),
      clearQ2Btn = $("#clearQ2");

const perSel  = $("#per"),
      list    = $("#list");
const info    = $("#info"),
      sugg    = $("#sugg"),
      pageLbl = $("#page");
const prev    = $("#prev"),
      next    = $("#next");
const addQuick = $("#addQuick"),
      addDialog = $("#addDialog"),
      bulkBtn   = $("#bulkBtn");
const downCSV      = $("#downCSV");
const btnImportJSON = $("#btnImportJSON"),
      fileJSON      = $("#fileJSON");
const chooseFolder  = $("#chooseFolder"),
      btnReconnect  = $("#btnReconnect"),
      saveFolderBtn = $("#saveFolderBtn"),
      resetLocal    = $("#resetLocal");
const folderStatus  = $("#folderStatus"),
      datasetStatus = $("#datasetStatus");

// Table UI
const tblBody   = $("#tbl tbody"),
      tblQ      = $("#tblQ"),
      tblCount  = $("#tblCount");
const clearAllBtn       = $("#clearAll"),
      checkAll          = $("#checkAll"),
      thDate            = $("#thDate");
const copyGreensBtn     = $("#copyGreens"),
      copySelectedBtn   = $("#copySelected"),
      deleteSelectedBtn = $("#deleteSelected");

// Dialogs
const dlgAdd  = $("#dlgAdd"),
      fTitle  = $("#fTitle"),
      fNotes  = $("#fNotes"),
      fURL    = $("#fURL");
const saveAdd   = $("#saveAdd"),
      cancelAdd = $("#cancelAdd");
const dlgBulk   = $("#dlgBulk"),
      bulkTxt   = $("#bulkTxt");
const saveBulk   = $("#saveBulk"),
      cancelBulk = $("#cancelBulk");

// --- Nuevos de la sesión (IDs) ---
const NEW_KEY = 'ms_new_ids_v1';
let newIds = new Set(loadNewIds());
function loadNewIds() {
  try { return JSON.parse(sessionStorage.getItem(NEW_KEY) || '[]'); }
  catch { return []; }
}
function saveNewIds() {
  sessionStorage.setItem(NEW_KEY, JSON.stringify([...newIds]));
}
function markNew(id) {
  newIds.add(+id);
  saveNewIds();
}
function unmarkNew(id) {
  newIds.delete(+id);
  saveNewIds();
}
function clearNewMarks() {
  newIds.clear();
  saveNewIds();
}

// State
let all = [], view = [];
let state = { q: '', per: 5, page: 1, total: 0 };
let tableFilterTokens = [];
let sortDesc = true; // fecha desc por defecto

// Utils
const norm = s => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const tok  = s => norm(s).split(/[^a-z0-9]+/).filter(Boolean);
const esc  = s => (s || "").replace(/[&<>"']/g,
  m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])
);
const existsTitle = (title, excludeId = null) =>
  all.some(b => (excludeId ? b.id !== excludeId : true) && norm(b.title) === norm(title));
const nextId = () => all.length ? Math.max(...all.map(x => x.id || 0)) + 1 : 1;

// Persistencia local
const LS_KEY = 'ms_books_table_v2';
const saveLocal = () => localStorage.setItem(LS_KEY, JSON.stringify(all));
const loadLocal = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); }
  catch { return null; }
};
const resetLS = () => localStorage.removeItem(LS_KEY);

// Soporte File System Access (FSA) / https (Netlify)
const supportsFSA = 'showDirectoryPicker' in window;
const isHttps     = location.protocol === 'https:';

function setFolderUI(ok, note = '') {
  folderStatus.classList.toggle('status-ok', !!ok);
  folderStatus.classList.toggle('status-bad', !ok);
  folderStatus.textContent = ok
    ? `Carpeta conectada${note ? ' · ' + note : ''}`
    : 'Carpeta: —';
}

function setDatasetUI(ok, note = '') {
  datasetStatus.classList.toggle('status-ok', !!ok);
  datasetStatus.classList.toggle('status-bad', !ok);
  datasetStatus.textContent = ok
    ? `Dataset: books.csv${note ? ' · ' + note : ''}`
    : 'Dataset: —';
}

// Mensaje inicial según soporte FSA/https (pensado para Netlify + OneDrive)
function updateFSASupportBanner() {
  if (!supportsFSA) {
    folderStatus.classList.add('status-bad');
    folderStatus.textContent =
      'Este navegador no permite elegir carpetas. Usa Chrome o Edge en escritorio.';
  } else if (!isHttps || !isSecureContext) {
    folderStatus.classList.add('status-bad');
    folderStatus.textContent =
      'Abre esta app desde HTTPS (por ejemplo Netlify) para conectar tu carpeta de OneDrive.';
  }
}

// Verificación central antes de tocar carpeta
function ensureReady() {
  if (!supportsFSA) {
    alert('Este navegador no soporta selección de carpetas.\n\nUsa Chrome/Edge en PC.');
    return false;
  }
  if (!isSecureContext || !isHttps) {
    alert('Para usar la carpeta de OneDrive, abre la app desde una URL HTTPS (Netlify).');
    return false;
  }
  if (!dirHandle) {
    alert('Selecciona una carpeta de OneDrive primero con el botón “Elegir carpeta”.');
    return false;
  }
  return true;
}

// -------- listado superior ----------
function scoreItem(it, ts) {
  if (!ts.length) return 0;
  const t = norm(it.title),
        n = norm(it.notes || "");
  let s = 0;
  for (const k of ts) {
    if (t.includes(k)) s += 3;
    if (n.includes(k)) s += 1;
  }
  return s;
}

function highlight(text, tokens) {
  if (!tokens.length) return esc(text || "");
  let out = "", src = text || "";
  for (let i = 0; i < src.length; i++) {
    let m = 0;
    for (const tk of tokens) {
      if (norm(src.slice(i, i + tk.length)) === tk) {
        m = tk.length;
        break;
      }
    }
    if (m) {
      out += "<mark>" + esc(src.slice(i, i + m)) + "</mark>";
      i += m - 1;
    } else {
      out += esc(src[i]);
    }
  }
  return out;
}

function filterAndRank() {
  const tokens = tok(state.q);
  view = all
    .map(it => ({ ...it, _s: scoreItem(it, tokens) }))
    .filter(x => tokens.length ? x._s > 0 : true)
    .sort((a, b) => b._s - a._s || a.title.localeCompare(b.title));
  state.total = view.length;
  state.page  = 1;
  sugg.textContent = tokens.length ? `${view.length} resultado(s)` : '';
}

function renderList() {
  const tokens = tok(state.q),
        start  = (state.page - 1) * state.per,
        end    = start + state.per;
  const items = view.slice(start, end);

  if (items.length === 0) {
    list.innerHTML = `
      <li>
        <div class="row">
          <strong>Sin resultados</strong>
          <button class="pill" id="addFromQuery">Agregar “${esc(state.q)}”</button>
        </div>
        <small class="muted">
          Tip: pega el título completo y agrégalo si no existe.
        </small>
      </li>`;
    $("#addFromQuery")?.addEventListener('click', () => {
      if (!ensureReady()) return;
      openAdd({ title: state.q });
    });
  } else {
    list.innerHTML = items.map(it => {
      const open = it.file_url
        ? ` <a class="pill" href="${esc(it.file_url)}" target="_blank" rel="noreferrer">Abrir</a>`
        : '';
      return `<li data-query="${esc(state.q)}">
        <div class="row">
          <strong>${highlight(it.title, tokens)}</strong>
          <span>${open}</span>
        </div>
        <small>${highlight((it.notes || "").slice(0, 220), tokens)}</small>
      </li>`;
    }).join('');

    list.querySelectorAll('li').forEach(li => {
      li.addEventListener('click', () => {
        const q = state.q || li.dataset.query || '';
        tblQ.value = q;
        tableFilterTokens = tok(q);
        renderTable();
      });
    });
  }

  const tp = Math.max(1, Math.ceil(state.total / state.per));
  pageLbl.textContent = String(state.page);
  prev.disabled = state.page <= 1;
  next.disabled = state.page >= tp;
  info.textContent = `${state.total} resultado${state.total === 1 ? '' : 's'}`;
}

// --------- tabla ----------
function rowsForTable() {
  const base = [...all].sort((a, b) => {
    const A = a.date_added || '',
          B = b.date_added || '';
    return sortDesc ? B.localeCompare(A) : A.localeCompare(B);
  });
  if (!tableFilterTokens.length) return base;
  return base.filter(b => {
    const cols = [b.title || '', b.notes || '', b.file_url || ''].map(norm);
    return tableFilterTokens.every(t => cols.some(c => c.includes(t)));
  });
}

function renderTable() {
  const rows = rowsForTable();
  tblCount.textContent = `${rows.length} de ${all.length} fila(s)`;

  tblBody.innerHTML = '';
  rows.forEach((it, i) => {
    const tr = document.createElement('tr');
    tr.dataset.id = it.id;
    if (newIds.has(+it.id)) tr.classList.add('is-new');

    const numDesc = rows.length - i;

    tr.innerHTML = `
      <td>${numDesc}</td>
      <td><input type="checkbox" class="rowchk"></td>
      <td contenteditable="true" class="c-title">${esc(it.title)}</td>
      <td contenteditable="true" class="c-notes">${esc(it.notes || '')}</td>
      <td contenteditable="true" class="c-url">${esc(it.file_url || '')}</td>
      <td>${esc(it.date_added || '')}</td>
      <td><button class="pill btnDel">Eliminar</button></td>
    `;

    tr.querySelector('.c-title').addEventListener('blur', e => {
      if (!ensureReady()) { e.target.textContent = it.title; return; }
      const nv = (e.target.textContent || '').trim() || 'Untitled';
      if (existsTitle(nv, it.id)) {
        alert('Ya existe un título idéntico.');
        e.target.textContent = it.title;
        return;
      }
      it.title = nv;
      saveLocal();
      maybeSaveFolder();
      filterAndRank();
      renderList();
    });

    tr.querySelector('.c-notes').addEventListener('blur', e => {
      if (!ensureReady()) { e.target.textContent = it.notes || ''; return; }
      it.notes = (e.target.textContent || '').trim();
      saveLocal();
      maybeSaveFolder();
    });

    tr.querySelector('.c-url').addEventListener('blur', e => {
      if (!ensureReady()) { e.target.textContent = it.file_url || ''; return; }
      it.file_url = (e.target.textContent || '').trim();
      saveLocal();
      maybeSaveFolder();
    });

    tr.querySelector('.btnDel').addEventListener('click', () => {
      if (!ensureReady()) return;
      if (!confirm('¿Eliminar este libro?')) return;
      all = all.filter(x => x.id !== it.id);
      unmarkNew(it.id);
      saveLocal();
      maybeSaveFolder();
      filterAndRank();
      renderList();
      renderTable();
    });

    tblBody.appendChild(tr);
  });

  if (rows.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 7;
    td.innerHTML = '<span class="muted">Sin coincidencias en la tabla.</span>';
    tr.appendChild(td);
    tblBody.appendChild(tr);
  }
}

function copyTitles(list) {
  if (!list.length) { alert('Nada para copiar'); return; }
  const out = list.join('\n');
  navigator.clipboard.writeText(out)
    .then(() => alert(`Copiado ${list.length} título(s) al portapapeles.`))
    .catch(err => alert('No se pudo copiar: ' + err.message));
}

// ---- altas ----
function addBook({ title, notes = '', file_url = '' }) {
  if (!ensureReady()) return null;
  const raw = (title || '').trim();
  if (!raw) { alert('Escribe un título.'); return null; }
  if (existsTitle(raw)) { alert('Ya existe un título idéntico.'); return null; }

  const item = {
    id: nextId(),
    title: raw,
    notes: (notes || '').trim(),
    file_url: (file_url || '').trim(),
    date_added: nowLimaString()
  };

  all.push(item);
  markNew(item.id);
  saveLocal();
  maybeSaveFolder();
  filterAndRank();
  renderList();
  renderTable();
  return item;
}

const openAdd = (prefill = {}) => {
  fTitle.value = prefill.title || '';
  fNotes.value = prefill.notes || '';
  fURL.value   = prefill.file_url || '';
  dlgAdd.showModal();
  fTitle.focus();
};

// ---- eventos ----
// Debounce buscador A
let tA;
qInp.addEventListener('input', () => {
  // exclusividad: al usar A, se limpia B (pero NO se copia)
  if (q2Inp && q2Inp.value !== '') q2Inp.value = '';
  clearTimeout(tA);
  tA = setTimeout(() => {
    state.q = qInp.value;
    filterAndRank();
    renderList();
  }, 120);
});

// Debounce buscador B: independiente; al usar B, limpia A y filtra con B
let tB;
if (q2Inp) {
  q2Inp.addEventListener('input', () => {
    if (qInp.value !== '') qInp.value = '';
    clearTimeout(tB);
    tB = setTimeout(() => {
      state.q = q2Inp.value;
      filterAndRank();
      renderList();
    }, 120);
  });
}

// Botones Clear
if (clearQBtn) {
  clearQBtn.addEventListener('click', e => {
    e.preventDefault();
    if (qInp.value !== '') qInp.value = '';
    state.q = qInp.value;
    filterAndRank();
    renderList();
    qInp.focus();
  });
}
if (clearQ2Btn) {
  clearQ2Btn.addEventListener('click', e => {
    e.preventDefault();
    if (q2Inp && q2Inp.value !== '') q2Inp.value = '';
    state.q = q2Inp ? q2Inp.value : '';
    filterAndRank();
    renderList();
    if (q2Inp) q2Inp.focus();
  });
}

// ESC limpia el campo activo
[qInp, q2Inp].forEach(inp => {
  if (!inp) return;
  inp.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      e.preventDefault();
      inp.value = '';
      state.q = inp.value;
      filterAndRank();
      renderList();
    }
  });
});

perSel.addEventListener('change', () => {
  state.per = +perSel.value || 5;
  state.page = 1;
  renderList();
});
prev.addEventListener('click', () => {
  if (state.page > 1) {
    state.page--;
    renderList();
  }
});
next.addEventListener('click', () => {
  const tp = Math.max(1, Math.ceil(state.total / state.per));
  if (state.page < tp) {
    state.page++;
    renderList();
  }
});

// filtro tabla
let t2;
tblQ.addEventListener('input', () => {
  clearTimeout(t2);
  t2 = setTimeout(() => {
    tableFilterTokens = tok(tblQ.value);
    renderTable();
  }, 120);
});

// clear global
clearAllBtn.addEventListener('click', () => {
  qInp.value = '';
  if (q2Inp) q2Inp.value = '';
  tblQ.value = '';
  state.q = '';
  tableFilterTokens = [];
  filterAndRank();
  renderList();
  renderTable();
});

// ordenar fecha
thDate.addEventListener('click', () => {
  sortDesc = !sortDesc;
  thDate.textContent = sortDesc ? 'Fecha ▼' : 'Fecha ▲';
  renderTable();
});

// altas
addQuick.addEventListener('click', () => {
  const ok = addBook({ title: qInp.value || (q2Inp?.value || '') });
  if (ok) maybeSaveFolder();
});
addDialog.addEventListener('click', () => {
  if (!ensureReady()) return;
  openAdd({ title: qInp.value || (q2Inp?.value || '') });
});
saveAdd.addEventListener('click', () => {
  const ok = addBook({ title: fTitle.value, notes: fNotes.value, file_url: fURL.value });
  if (ok) { dlgAdd.close(); maybeSaveFolder(); }
});
cancelAdd.addEventListener('click', () => dlgAdd.close());

// bulk
bulkBtn.addEventListener('click', () => {
  if (!ensureReady()) return;
  bulkTxt.value = '';
  dlgBulk.showModal();
  bulkTxt.focus();
});
const parseLine = line => {
  let p = line.split("|");
  if (p.length === 1) p = line.split(",");
  p = p.map(s => s.trim());
  return { title: p[0] || '', notes: p[1] || '', file_url: p[2] || '' };
};
saveBulk.addEventListener('click', () => {
  if (!ensureReady()) return;
  const lines = bulkTxt.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  let added = 0, dups = 0, empty = 0;
  for (const ln of lines) {
    const it = parseLine(ln);
    if (!it.title) { empty++; continue; }
    if (existsTitle(it.title)) { dups++; continue; }
    if (addBook(it)) added++;
  }
  dlgBulk.close();
  alert(`Importados: ${added}\nDuplicados: ${dups}\nVacíos: ${empty}`);
  if (added > 0) maybeSaveFolder();
});
cancelBulk.addEventListener('click', () => dlgBulk.close());

// copiar verdes
copyGreensBtn.addEventListener('click', () => {
  const titles = all
    .filter(b => newIds.has(+b.id))
    .sort((a, b) => {
      const A = a.date_added || '';
      const B = b.date_added || '';
      const byDate = A.localeCompare(B);
      return byDate !== 0 ? byDate : (a.id - b.id);
    })
    .map(b => b.title);

  copyTitles(titles);
});

// copiar / eliminar seleccionados
copySelectedBtn.addEventListener('click', () => {
  const selected = [...tblBody.querySelectorAll('tr')]
    .filter(tr => tr.querySelector('.rowchk')?.checked)
    .map(tr => +tr.dataset.id);

  const titles = all
    .filter(b => selected.includes(+b.id))
    .sort((a, b) => {
      const A = a.date_added || '';
      const B = b.date_added || '';
      const byDate = A.localeCompare(B);
      return byDate !== 0 ? byDate : (a.id - b.id);
    })
    .map(b => b.title);

  copyTitles(titles);
});

deleteSelectedBtn.addEventListener('click', () => {
  if (!ensureReady()) return;
  const ids = [...tblBody.querySelectorAll('tr')]
    .filter(tr => tr.querySelector('.rowchk')?.checked)
    .map(tr => +tr.dataset.id);
  if (!ids.length) return alert('Nada seleccionado.');
  if (!confirm(`¿Eliminar ${ids.length} registro(s)?`)) return;
  all = all.filter(it => !ids.includes(it.id));
  ids.forEach(unmarkNew);
  saveLocal();
  maybeSaveFolder();
  filterAndRank();
  renderList();
  renderTable();
});
checkAll.addEventListener('change', e => {
  tblBody.querySelectorAll('.rowchk').forEach(ch => ch.checked = e.target.checked);
});

// descargas / import JSON
downCSV.addEventListener('click', () => {
  const blob = new Blob([toCSV(all)], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'books.csv';
  a.click();
  URL.revokeObjectURL(a.href);
});
btnImportJSON.addEventListener('click', () => fileJSON.click());
fileJSON.addEventListener('change', async e => {
  const f = e.target.files?.[0];
  if (!f) return;
  try {
    const j = JSON.parse(await f.text());
    if (!Array.isArray(j)) throw new Error('JSON debe ser un array');
    all = j.map((b, i) => ({
      id: +(b.id ?? i + 1),
      title: b.title || 'Untitled',
      notes: b.notes || '',
      file_url: b.file_url || '',
      date_added: b.date_added || ''
    }));
    clearNewMarks();
    saveLocal();
    filterAndRank();
    renderList();
    renderTable();
    maybeSaveFolder();
  } catch (ex) {
    alert('JSON inválido: ' + ex.message);
  }
  fileJSON.value = '';
});

// carpeta
chooseFolder.addEventListener('click', async () => {
  const dh = await pickFolder();
  setFolderUI(!!dh);
  if (dh) {
    const arr = await loadCsvFromFolder();
    if (Array.isArray(arr)) {
      all = arr;
      setDatasetUI(true, 'cargado');
      saveLocal();
    } else {
      all = [];
      setDatasetUI(true, 'creado vacío');
      saveLocal();
    }
    filterAndRank();
    renderList();
    renderTable();
  }
});
btnReconnect.addEventListener('click', async () => {
  const ok = await tryReconnect(setFolderUI);
  if (ok) {
    const arr = await loadCsvFromFolder();
    if (Array.isArray(arr)) {
      all = arr;
      setDatasetUI(true, 'cargado');
      saveLocal();
      filterAndRank();
      renderList();
      renderTable();
    }
  }
});

// guardar a carpeta
async function maybeSaveFolder() {
  if (!dirHandle) return;
  await saveAllFiles(all);
  setFolderUI(true, 'guardado ' + new Date().toLocaleTimeString());
  setDatasetUI(true);
}
saveFolderBtn.addEventListener('click', () => maybeSaveFolder());

// reset autosave
resetLocal.addEventListener('click', () => {
  if (!confirm('Borrar autosave local y recargar?')) return;
  resetLS();
  location.reload();
});

// init
async function init() {
  const saved = loadLocal();
  all = Array.isArray(saved) ? saved : [];
  state.per = +perSel.value || 5;
  filterAndRank();
  renderList();
  renderTable();

  // mensaje sobre soporte FSA / HTTPS (Netlify)
  updateFSASupportBanner();

  // intento de reconexión automática a carpeta (por dispositivo)
  const ok = await tryReconnect(setFolderUI);
  if (ok) {
    const arr = await loadCsvFromFolder();
    if (Array.isArray(arr)) {
      all = arr;
      setDatasetUI(true, 'cargado auto');
      saveLocal();
      filterAndRank();
      renderList();
      renderTable();
    }
  }

  // atajo Ctrl+S → alta rápida
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      addQuick.click();
    }
  });
}
init();

// Cambiar botones rojos a verde sutil al hacer click (una sola vez)
function wireRedButtonsToGreen() {
  document.querySelectorAll('.btn.btn-red').forEach((el) => {
    el.addEventListener('click', () => {
      el.classList.remove('btn-red');
      el.classList.add('btn-green');
    }, { once: true });
  });
}
document.addEventListener('DOMContentLoaded', wireRedButtonsToGreen);
