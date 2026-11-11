/* sp-xlsx.js — lecture/écriture .xlsx sans dépendance pour StatPanel (fonctions reprises d'eps-core.js v2.3). */
(function(){
const XL_NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main',REL_NS='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const XLSX_MIME='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const crcT=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const crc32=b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=crcT[(c^b[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0};
const concat=a=>{const o=new Uint8Array(a.reduce((s,x)=>s+x.length,0));let p=0;for(const x of a){o.set(x,p);p+=x.length}return o};
function zip(files){const enc=new TextEncoder(),parts=[],cen=[];let off=0;const n=new Date();
 const dt=(n.getHours()<<11)|(n.getMinutes()<<5)|(n.getSeconds()>>1),dd=((n.getFullYear()-1980)<<9)|((n.getMonth()+1)<<5)|n.getDate();
 for(const f of files){const nm=enc.encode(f.name),crc=crc32(f.data),sz=f.data.length;
  const l=new DataView(new ArrayBuffer(30));l.setUint32(0,0x04034b50,true);l.setUint16(4,20,true);l.setUint16(6,0x0800,true);l.setUint16(10,dt,true);l.setUint16(12,dd,true);
  l.setUint32(14,crc,true);l.setUint32(18,sz,true);l.setUint32(22,sz,true);l.setUint16(26,nm.length,true);
  parts.push(new Uint8Array(l.buffer),nm,f.data);
  const c=new DataView(new ArrayBuffer(46));c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(12,dt,true);c.setUint16(14,dd,true);
  c.setUint32(16,crc,true);c.setUint32(20,sz,true);c.setUint32(24,sz,true);c.setUint16(28,nm.length,true);c.setUint32(42,off,true);
  cen.push(new Uint8Array(c.buffer),nm);off+=30+nm.length+sz}
 const cs=cen.reduce((s,x)=>s+x.length,0),e=new DataView(new ArrayBuffer(22));
 e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,cs,true);e.setUint32(16,off,true);
 return concat([...parts,...cen,new Uint8Array(e.buffer)])}
const xe=v=>String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const colL=i=>{let s='';for(i++;i>0;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s};
function sheetXml(rows){let nc=1;for(const r of rows)nc=Math.max(nc,r.length);
 const w=[];for(let c=0;c<nc;c++){let m=8;for(const r of rows)m=Math.max(m,String(r[c]??'').length+2);w.push(Math.min(40,m))}
 let x=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${XL_NS}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>`
  +w.map((v,i)=>`<col min="${i+1}" max="${i+1}" width="${v}" customWidth="1"/>`).join('')+'</cols><sheetData>';
 rows.forEach((r,ri)=>{x+=`<row r="${ri+1}">`;
  for(let ci=0;ci<r.length;ci++){const v=r[ci];if(v===null||v===undefined||v==='')continue;const ref=colL(ci)+(ri+1),st=ri===0?' s="1"':'';
   if(typeof v==='number'&&isFinite(v))x+=`<c r="${ref}"${st}><v>${v}</v></c>`;
   else x+=`<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${xe(typeof v==='object'?JSON.stringify(v):v)}</t></is></c>`}
  x+='</row>'});
 return x+'</sheetData></worksheet>'}
function buildXLSX(sheets){const enc=new TextEncoder(),H='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
 const f=[
 {name:'[Content_Types].xml',x:H+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
  +sheets.map((s,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')+'</Types>'},
 {name:'_rels/.rels',x:H+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL_NS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`},
 {name:'xl/workbook.xml',x:H+`<workbook xmlns="${XL_NS}" xmlns:r="${REL_NS}"><sheets>`+sheets.map((s,i)=>`<sheet name="${xe(s.name)}" sheetId="${i+1}"${s.hidden?' state="hidden"':''} r:id="rId${i+1}"/>`).join('')+'</sheets></workbook>'},
 {name:'xl/_rels/workbook.xml.rels',x:H+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map((s,i)=>`<Relationship Id="rId${i+1}" Type="${REL_NS}/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')+`<Relationship Id="rId${sheets.length+1}" Type="${REL_NS}/styles" Target="styles.xml"/></Relationships>`},
 {name:'xl/styles.xml',x:H+`<styleSheet xmlns="${XL_NS}"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDDEBFF"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`},
 ...sheets.map((s,i)=>({name:`xl/worksheets/sheet${i+1}.xml`,x:sheetXml(s.rows)}))];
 return zip(f.map(o=>({name:o.name,data:enc.encode(o.x)})))}

/* ───────── XLSX : lecture ───────── */
const isZip=b=>{const u=new Uint8Array(b,0,Math.min(4,b.byteLength));return u[0]===0x50&&u[1]===0x4B};
async function unzip(buf){const u=new Uint8Array(buf),v=new DataView(buf);let e=u.length-22;
 while(e>=0&&v.getUint32(e,true)!==0x06054b50)e--;if(e<0)throw new Error('Fichier XLSX invalide.');
 const n=v.getUint16(e+10,true);let p=v.getUint32(e+16,true);const dec=new TextDecoder(),out={};
 for(let i=0;i<n&&v.getUint32(p,true)===0x02014b50;i++){
  const m=v.getUint16(p+10,true),cs=v.getUint32(p+20,true),nl=v.getUint16(p+28,true),xl=v.getUint16(p+30,true),cl=v.getUint16(p+32,true),lo=v.getUint32(p+42,true);
  const name=dec.decode(u.subarray(p+46,p+46+nl)),ds=lo+30+v.getUint16(lo+26,true)+v.getUint16(lo+28,true);let d=u.subarray(ds,ds+cs);
  if(m===8){if(typeof DecompressionStream==='undefined')throw new Error("Ce navigateur ne sait pas lire un XLSX enregistré par Excel : utilisez un navigateur récent ou un export de Mes Apps EPS.");
   d=new Uint8Array(await new Response(new Blob([d]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer())}
  else if(m!==0)throw new Error('Compression XLSX non prise en charge.');
  out[name]=d;p+=46+nl+xl+cl}
 return out}
const unxml=s=>s.replace(/&(lt|gt|quot|apos|amp|#\d+|#x[0-9a-fA-F]+);/g,(_,k)=>({lt:'<',gt:'>',quot:'"',apos:"'",amp:'&'}[k]||String.fromCodePoint(k[1]==='x'?parseInt(k.slice(2),16):+k.slice(1))));
const attr=(t,n)=>{const m=new RegExp('(?:^|\\s)'+n+'\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\')').exec(t);return m?unxml(m[1]??m[2]):null};
const strs=b=>[...b.replace(/<rPh\b[\s\S]*?<\/rPh>/g,'').matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(m=>unxml(m[1])).join('');
const colI=r=>{let n=0;for(const ch of /^[A-Z]+/.exec(r)[0])n=n*26+ch.charCodeAt(0)-64;return n-1};
function readSheet(x,ss){const rows=[];let rn=0;
 for(const rm of x.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)){
  const r=attr(rm[1],'r'),ri=r?+r-1:rn;rn=ri+1;const row=rows[ri]=[];
  for(const cm of(rm[2]||'').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)){
   const ref=attr(cm[1],'r'),t=attr(cm[1],'t'),b=cm[2]||'',ci=ref?colI(ref):row.length;let v;
   if(t==='inlineStr')v=strs(b);
   else{const m=/<v>([\s\S]*?)<\/v>/.exec(b);if(m){const raw=m[1];
    if(t==='s')v=ss[+raw];else if(t==='str'||t==='e')v=unxml(raw);else if(t==='b')v=raw==='1';
    else{const n=Number(raw);v=raw!==''&&isFinite(n)?n:unxml(raw)}}}
   if(v!==undefined)row[ci]=v}}
 return rows}
async function read(buf){const files=await unzip(buf),T=n=>files[n]?new TextDecoder().decode(files[n]):null;
 const wb=T('xl/workbook.xml'),rel=T('xl/_rels/workbook.xml.rels');if(!wb||!rel)throw new Error('Fichier XLSX invalide.');
 const tg={};for(const m of rel.matchAll(/<Relationship\b[^>]*>/g)){const id=attr(m[0],'Id'),t=attr(m[0],'Target');if(id&&t)tg[id]=t.startsWith('/')?t.slice(1):'xl/'+t}
 const ss=[],sx=T('xl/sharedStrings.xml');if(sx)for(const m of sx.matchAll(/<si\b[^>]*?(?:\/>|>([\s\S]*?)<\/si>)/g))ss.push(strs(m[1]||''));
 const sheets=[];for(const m of wb.matchAll(/<sheet\b[^>]*>/g)){const p=tg[attr(m[0],'r:id')];if(p&&files[p])sheets.push({name:attr(m[0],'name'),rows:readSheet(T(p),ss)})}
 return sheets}
function download(bytes,name){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([bytes],{type:XLSX_MIME}));a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}
window.SPX={write:buildXLSX,read,isZip,download};
})();
