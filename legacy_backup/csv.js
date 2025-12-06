// --- csv.js ---
// Conversión CSV <-> Array<Object>

export function toCSV(arr){
  const headers = ['id','title','notes','file_url','date'];
  const lines = [headers.join(',')];

  for(const b of arr){
    const row = [
      b.id ?? '',
      b.title ?? '',
      b.notes ?? '',
      b.file_url ?? '',
      b.date_added ?? ''
    ].map(csvEscape).join(',');
    lines.push(row);
  }
  return lines.join('\n');
}

export function fromCSV(text){
  const rows = parseCSV(text).filter(r=>r.some(x=>x.trim()!==''));
  if(!rows.length) return [];
  const hdr = rows[0].map(h=>h.trim().toLowerCase());
  const idx = {
    id: hdr.indexOf('id'),
    title: hdr.indexOf('title'),
    notes: hdr.indexOf('notes'),
    file_url: hdr.indexOf('file_url'),
    date: hdr.indexOf('date')
  };
  const out=[];
  for(let i=1;i<rows.length;i++){
    const r=rows[i];
    const o={
      id:Number((idx.id>=0?r[idx.id]:i))||i,
      title:(idx.title>=0?r[idx.title]:'').trim(),
      notes:(idx.notes>=0?r[idx.notes]:'').trim(),
      file_url:(idx.file_url>=0?r[idx.file_url]:'').trim(),
      date_added:(idx.date>=0?r[idx.date]:'').trim()
    };
    if(o.title) out.push(o);
  }
  return out;
}

/* helpers */
function csvEscape(v){
  v = v==null ? '' : String(v);
  v = v.replace(/"/g,'""');
  return /[",\n]/.test(v) ? `"${v}"` : v;
}

function parseCSV(text){
  const rows=[]; let row=[],cur='',q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(q){
      if(c==='"' && text[i+1]==='"'){cur+='"';i++}
      else if(c==='"'){q=false}
      else cur+=c;
    }else{
      if(c==='"'){q=true}
      else if(c===','){row.push(cur);cur=''}
      else if(c==='\n'){row.push(cur);rows.push(row);row=[];cur=''}
      else if(c!=='\r'){cur+=c}
    }
  }
  if(cur.length>0 || row.length>0){ row.push(cur); rows.push(row); }
  return rows;
}
