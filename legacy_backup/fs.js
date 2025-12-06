// --- fs.js ---
// Manejo de carpeta con File System Access API
import { idbGet, idbSet, idbDel } from './idb.js';
import { toCSV, fromCSV } from './csv.js';

export let dirHandle = null;
const KEY = 'ms_dir_handle';
const DATASET = 'books.csv';
const JSONFILE = 'books.json';

async function hasPerm(handle){
  if(!handle) return false;
  const p = await handle.queryPermission?.({mode:'readwrite'});
  if(p === 'granted') return true;
  if(p === 'prompt'){
    const r = await handle.requestPermission?.({mode:'readwrite'});
    return r === 'granted';
  }
  return false;
}

export async function pickFolder(){
  if(!('showDirectoryPicker' in window)){
    alert('Tu navegador no soporta File System Access API (usa Chrome o Edge).');
    return null;
  }
  try{
    const dh = await window.showDirectoryPicker({mode:'readwrite'});
    const ok = await hasPerm(dh);
    if(!ok) return null;
    dirHandle = dh;
    await idbSet(KEY, dh);
    return dh;
  }catch{
    return null;
  }
}

export async function tryReconnect(setFolderUI){
  try{
    const saved = await idbGet(KEY);
    if(!saved) return false;
    const ok = await hasPerm(saved);
    if(!ok) return false;
    dirHandle = saved;
    setFolderUI?.(true,'reconectada');
    return true;
  }catch{
    return false;
  }
}

export async function loadCsvFromFolder(){
  if(!dirHandle) return null;
  try{
    // si no existe, lo creamos vacío
    let fh;
    try{
      fh = await dirHandle.getFileHandle(DATASET);
    }catch{
      // crear vacío
      await writeFile(DATASET, new Blob(['id,title,notes,file_url,date\n'],{type:'text/csv'}));
      fh = await dirHandle.getFileHandle(DATASET);
    }
    const file = await fh.getFile();
    const txt = await file.text();
    return fromCSV(txt);
  }catch(e){
    console.warn('loadCsvFromFolder', e);
    return null;
  }
}

export async function saveAllFiles(all){
  if(!dirHandle) return;
  await writeFile(DATASET, new Blob([toCSV(all)],{type:'text/csv'}));
  await writeFile(JSONFILE, new Blob([JSON.stringify(all,null,2)],{type:'application/json'}));
}

async function writeFile(name, blob){
  const fh = await dirHandle.getFileHandle(name,{create:true});
  const w = await fh.createWritable();
  await w.write(blob);
  await w.close();
}

export async function clearRememberedFolder(){
  await idbDel(KEY);
  dirHandle = null;
}
