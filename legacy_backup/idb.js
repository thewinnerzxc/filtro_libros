// --- idb.js ---
// Mini key-value sobre IndexedDB para guardar el handle de carpeta

const DB = 'ms-books';
const STORE = 'kv';

function withDB(){
  return new Promise((res,rej)=>{
    const req = indexedDB.open(DB,1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

export async function idbGet(key){
  const db = await withDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction(STORE,'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

export async function idbSet(key,val){
  const db = await withDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).put(val,key);
    tx.oncomplete = () => res(true);
    tx.onerror = () => rej(tx.error);
  });
}

export async function idbDel(key){
  const db = await withDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => res(true);
    tx.onerror = () => rej(tx.error);
  });
}
