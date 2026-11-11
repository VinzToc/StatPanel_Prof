/* StatPanel — panneau de boutons pour compter des actions (EPS et autres disciplines).
   Code commun aux versions « StatPanel - Prof » (Mes Apps EPS) et « StatPanel » (Applis EPS Élèves).
   window.SP_MODE = 'prof' | 'eleve' (défini dans index.html). Nécessite eps-core.js, sp-xlsx.js (+ eleve-core.js côté élèves).
   Données 100 % locales : bibliothèque de panneaux et historique dans localStorage, saisies élèves dans la base EPS (IndexedDB). */
(function(){
'use strict';
const MODE=window.SP_MODE==='eleve'?'eleve':'prof',APP_ID='statpanel';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const clone=o=>JSON.parse(JSON.stringify(o));
const mem={};
const store={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return k in mem?clone(mem[k]):d}},
 set(k,v){try{v==null?localStorage.removeItem(k):localStorage.setItem(k,JSON.stringify(v))}catch(e){mem[k]=v}}};
const K={panels:'statpanel_panels_v1',sess:'statpanel_session_v1',hist:'statpanel_hist_v1',cls:'statpanel_classe'};
const PAL=['#22c55e','#10b981','#06b6d4','#3b82f6','#6366f1','#a855f7','#ec4899','#ef4444','#f97316','#f59e0b','#eab308','#64748b'];
const PER=['Période','Set','Manche','Mi-temps','Quart-temps','Round','Séquence'];
const p2=n=>String(n).padStart(2,'0');
const isoDay=d=>d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate());
const hhmm=d=>p2(d.getHours())+':'+p2(d.getMinutes());
const fmt=ms=>{const s=Math.max(0,Math.floor(ms/1000));return p2(Math.floor(s/60))+':'+p2(s%60)};
const num=v=>{v=Math.round(v*100)/100;return String(v).replace('.',',')};
const sval=b=>(b.type==='-'?-1:1)*Math.abs(+b.val||0);
const sgn=v=>(v>0?'+':v<0?'−':'±')+num(Math.abs(v));
const rgba=(hex,a)=>{const m=/^#?([0-9a-f]{6})$/i.exec(hex||'');const n=m?parseInt(m[1],16):0x3b82f6;return`rgba(${n>>16&255},${n>>8&255},${n&255},${a})`};
const fileSafe=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^\w-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,40)||'StatPanel';
function toast(msg,kind){const t=document.createElement('div');t.className='toast '+(kind||'')+(typeof cur!=='undefined'&&cur==='vRun'?' up':'');t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),kind==='ko'?5000:2800)}
const vib=p=>{try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}};

/* ───────── modèles de terrains (demi-terrain adverse, filet en haut) ───────── */
const COURTS={
 badminton:{nom:'Badminton',emoji:'🏸',surf:'#14784a',rows:'1fr 1.3fr 1fr',cols:'1fr 1fr',zones:['Avant','Milieu','Fond','Fautes'],
  btn:[['Avant G','+',1,'#22d3ee',0,[1,1]],['Avant D','+',1,'#22d3ee',0,[1,2]],['Milieu G','+',1,'#60a5fa',1,[2,1]],['Milieu D','+',1,'#60a5fa',1,[2,2]],
   ['Fond G','+',2,'#a78bfa',2,[3,1]],['Fond D','+',2,'#a78bfa',2,[3,2]],['Filet','-',1,'#f87171',3,null],['Dehors','-',1,'#fb923c',3,null]]},
 tennis:{nom:'Tennis',emoji:'🎾',surf:'#1b5aa3',rows:'1fr 1fr',cols:'repeat(6,1fr)',zones:['Carrés de service','Fond de court','Fautes'],
  btn:[['Carré G','+',1,'#22d3ee',0,[1,1,1,3]],['Carré D','+',1,'#22d3ee',0,[1,4,1,3]],['Fond G','+',2,'#a78bfa',1,[2,1,1,2]],['Fond centre','+',1,'#60a5fa',1,[2,3,1,2]],
   ['Fond D','+',2,'#a78bfa',1,[2,5,1,2]],['Filet','-',1,'#f87171',2,null],['Faute (out)','-',1,'#fb923c',2,null]]},
 tt:{nom:'Tennis de table',emoji:'🏓',surf:'#1d4ed8',rows:'1fr 1fr 1fr',cols:'1fr 1fr 1fr',zones:['Courte','Mi-longue','Longue','Fautes'],
  btn:[['Courte G','+',1,'#22d3ee',0,[1,1]],['Courte C','+',1,'#22d3ee',0,[1,2]],['Courte D','+',1,'#22d3ee',0,[1,3]],
   ['Mi-longue G','+',1,'#60a5fa',1,[2,1]],['Mi-longue C','+',1,'#60a5fa',1,[2,2]],['Mi-longue D','+',1,'#60a5fa',1,[2,3]],
   ['Longue G','+',2,'#a78bfa',2,[3,1]],['Longue C','+',1,'#a78bfa',2,[3,2]],['Longue D','+',2,'#a78bfa',2,[3,3]],
   ['Filet','-',1,'#f87171',3,null],['Dehors','-',1,'#fb923c',3,null]]}
};
const LAYOUTS=[['grid','🔲','Grille libre'],['tennis','🎾','Tennis'],['badminton','🏸','Badminton'],['tt','🏓','Tennis de table']];
const layName=k=>(LAYOUTS.find(l=>l[0]===k)||LAYOUTS[0])[2];
const courtButtons=k=>COURTS[k].btn.map(([label,type,val,color,zone])=>({label,type,val,color,zone}));
const newBtn=(i,z)=>({label:'Action '+(i+1),type:'+',val:1,color:PAL[i%PAL.length],zone:z||0});
function fromCourt(k,nom){return{id:uid(),nom:nom||COURTS[k].nom+' – zones de chute',layout:k,zones:[...COURTS[k].zones],buttons:courtButtons(k),chrono:{mode:'up',dur:600},periode:k==='grid'?'Période':'Set',vib:true}}
function mk(nom,zones,btns,extra){return Object.assign({id:'ex_'+fileSafe(nom).toLowerCase(),ex:true,nom,layout:'grid',zones,
 buttons:btns.map(([label,type,val,color,zone])=>({label,type,val,color,zone})),chrono:{mode:'up',dur:600},periode:'Période',vib:true},extra||{})}
const EXAMPLES=[
 mk('Sports collectifs – bilan offensif/défensif',['Attaque','Défense'],[['But / panier','+',2,'#22c55e',0],['Tir cadré','+',1,'#10b981',0],['Tir non cadré','-',1,'#f97316',0],['Passe décisive','+',1,'#06b6d4',0],['Perte de balle','-',1,'#ef4444',0],
  ['Interception','+',1,'#3b82f6',1],['Contre / dissuasion','+',1,'#6366f1',1],['Faute','-',1,'#ec4899',1]],{periode:'Mi-temps',chrono:{mode:'down',dur:600}}),
 mk('Arbitrage – volley-ball',['Décisions','Attitude'],[['Décision juste','+',1,'#22c55e',0],['Décision erronée','-',1,'#ef4444',0],['Faute non sifflée','-',1,'#f97316',0],
  ['Geste réglementaire','+',1,'#3b82f6',1],['Coup de sifflet net','+',1,'#06b6d4',1],['Hésitation','-',1,'#ec4899',1]],{periode:'Set'}),
 Object.assign(fromCourt('badminton','Badminton – zones de chute'),{id:'ex_badminton',ex:true}),
 Object.assign(fromCourt('tennis','Tennis – zones de chute'),{id:'ex_tennis',ex:true}),
 Object.assign(fromCourt('tt','Tennis de table – placement'),{id:'ex_tt',ex:true}),
];
const panels=()=>store.get(K.panels,[]);
const allPanels=()=>[...panels(),...EXAMPLES];
const savePanel=p=>{const L=panels(),i=L.findIndex(x=>x.id===p.id);delete p.ex;if(i>=0)L[i]=p;else L.unshift(p);store.set(K.panels,L)};

/* ───────── vues ───────── */
const V=['vHome','vEdit','vSetup','vRun','vStats','vHist'];
let cur='vHome';
function show(v){cur=v;V.forEach(x=>$('#'+x).classList.toggle('hide',x!==v));if(v!=='vRun')releaseWake();window.scrollTo(0,0)}

/* ───────── ACCUEIL ───────── */
function renderHome(){
 const s=store.get(K.sess,null);
 $('#resume').innerHTML=s&&!s.done?`<div class="card resume"><h2>⏸ Observation en cours</h2><p class="mut" style="margin:0 0 10px">${esc(s.panel.nom)} · ${esc(s.camps.map(c=>c.nom).join(' vs '))} · ${s.clicks.length} action(s)</p>
  <div class="row"><button class="btn p" data-a="resume">▶ Reprendre</button><button class="btn" data-a="finish">✓ Voir le bilan</button><button class="btn d" data-a="drop">🗑 Abandonner</button></div></div>`:'';
 const card=p=>`<div class="pc"><h4>${p.layout==='grid'?'🔲':COURTS[p.layout].emoji} ${esc(p.nom)}</h4>
  <div class="row" style="gap:6px"><span class="tag">${esc(layName(p.layout))}</span><span class="tag">${p.buttons.length} bouton(s)</span>${p.layout==='grid'&&p.zones.length>1?`<span class="tag">${p.zones.length} zones</span>`:''}${p.ex?'<span class="tag">Exemple</span>':''}</div>
  <div class="dots">${p.buttons.map(b=>`<i style="background:${esc(b.color)}" title="${esc(b.label)}"></i>`).join('')}</div>
  <div class="acts"><button class="btn p s" data-a="go" data-id="${p.id}">▶ Lancer</button><button class="btn s" data-a="edit" data-id="${p.id}">✏️ ${p.ex?'Personnaliser':'Modifier'}</button>
  <button class="btn s" data-a="dup" data-id="${p.id}" title="Dupliquer">⧉</button><button class="btn s" data-a="share" data-id="${p.id}" title="Exporter ce panneau (.xlsx)">📤</button>${p.ex?'':`<button class="btn s d" data-a="del" data-id="${p.id}" title="Supprimer">🗑</button>`}</div></div>`;
 const mine=panels();
 $('#libMine').innerHTML=mine.length?mine.map(card).join(''):'<p class="mut">Aucun panneau personnel pour l\'instant : créez-en un ou partez d\'un exemple.</p>';
 $('#libEx').innerHTML=EXAMPLES.map(card).join('');
 $('#nHist').textContent=store.get(K.hist,[]).length;
}
async function homeClick(e){const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a,p=allPanels().find(x=>x.id===b.dataset.id);
 if(a==='new')openEdit(null);
 else if(a==='edit')openEdit(p);
 else if(a==='dup'){const c=clone(p);c.id=uid();c.nom=p.nom+' (copie)';savePanel(c);renderHome();toast('Panneau dupliqué','ok')}
 else if(a==='del'){if(confirm(`Supprimer le panneau « ${p.nom} » ?`)){store.set(K.panels,panels().filter(x=>x.id!==p.id));renderHome()}}
 else if(a==='share')exportConfig([p]);
 else if(a==='shareAll'){const L=panels();if(!L.length)return toast('Aucun panneau personnel à exporter.','ko');exportConfig(L)}
 else if(a==='imp')$('#cfgFile').click();
 else if(a==='go')openSetup(p);
 else if(a==='resume')startRun(store.get(K.sess,null));
 else if(a==='finish'){const s=store.get(K.sess,null);s.done=true;store.set(K.sess,s);openStats(s)}
 else if(a==='drop'){if(confirm('Abandonner l\'observation en cours ? Les clics seront perdus.')){store.set(K.sess,null);renderHome()}}
 else if(a==='hist')openHist();
}

/* ───────── ÉDITEUR (formulaire) ───────── */
let E=null;
function openEdit(p){E=p?clone(p):{id:uid(),nom:'',layout:'grid',zones:['Zone 1','Zone 2'],buttons:[0,1,2,3,4,5].map(i=>newBtn(i,i<3?0:1)),chrono:{mode:'up',dur:600},periode:'Période',vib:true};
 if(E.ex){E.id=uid();E.ex=false}
 renderEdit();show('vEdit')}
function renderEdit(){const c=E.layout!=='grid',z=E.zones.length;
 $('#eNom').value=E.nom;
 $('#eLay').innerHTML=LAYOUTS.map(([k,em,n])=>`<button type="button" class="${E.layout===k?'on':''}" data-lay="${k}"><span>${em}</span>${n}</button>`).join('');
 $('#eGridOpts').classList.toggle('hide',c);
 $('#eCourtInfo').classList.toggle('hide',!c);
 if(c)$('#eCourtInfo').innerHTML=`${COURTS[E.layout].emoji} Le demi-terrain adverse est découpé en zones cibles (filet en haut). Vous pouvez renommer chaque zone et changer son type, sa valeur et sa couleur. Zones regroupées : ${E.zones.map(esc).join(' · ')}.`;
 $('#eN').textContent=E.buttons.length;
 $('#eZ').innerHTML=[1,2,3,4].map(n=>`<button type="button" class="${z===n?'on':''}" data-z="${n}">${n===1?'Aucune':n}</button>`).join('');
 $('#eZn').innerHTML=z>1?E.zones.map((n,i)=>`<label class="f">Nom de la zone ${i+1}<input type="text" data-zn="${i}" value="${esc(n)}" maxlength="30"></label>`).join(''):'';
 const zs=!c&&z>1;
 $('#eBtns').innerHTML=E.buttons.map((b,i)=>`<div class="brow ${zs?'':'nz'}" data-i="${i}"><span class="n">${i+1}</span>
  <label class="sw" style="background:${esc(b.color)}" title="Couleur"><input type="color" data-k="color" value="${esc(b.color)}"></label>
  <input class="lbl" type="text" data-k="label" value="${esc(b.label)}" maxlength="28" placeholder="Libellé">
  <span class="pm"><button type="button" data-t="+" class="pos ${b.type==='+'?'on':''}" title="Action positive">＋</button><button type="button" data-t="-" class="neg ${b.type==='-'?'on':''}" title="Action négative">−</button></span>
  <input class="val" type="number" data-k="val" value="${Math.abs(+b.val||0)}" min="0" max="100" step="0.5" title="Valeur (points)">
  ${zs?`<select class="zn" data-k="zone">${E.zones.map((n,j)=>`<option value="${j}" ${b.zone===j?'selected':''}>${esc(n)}</option>`).join('')}</select>`:''}</div>`).join('');
 $('#eChr').innerHTML=[['up','⏱ Chronomètre'],['down','⏳ Compte à rebours']].map(([k,n])=>`<button type="button" class="${E.chrono.mode===k?'on':''}" data-chr="${k}">${n}</button>`).join('');
 $('#eDurW').classList.toggle('hide',E.chrono.mode!=='down');
 $('#eMin').value=Math.floor(E.chrono.dur/60);$('#eSec').value=E.chrono.dur%60;
 $('#ePer').innerHTML=PER.map(n=>`<option ${E.periode===n?'selected':''}>${n}</option>`).join('');
 $('#eVib').checked=E.vib!==false;
}
function editEvents(){
 const f=$('#vEdit');
 f.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;
  if(t.dataset.lay){const k=t.dataset.lay;if(k===E.layout)return;
   if(k==='grid'){E.layout='grid';E.zones=['Zone 1','Zone 2'];E.buttons=E.buttons.slice(0,12).map((b,i)=>Object.assign(b,{zone:i<Math.ceil(E.buttons.length/2)?0:1}))}
   else{const keep=E.nom;Object.assign(E,fromCourt(k),{id:E.id,nom:keep||COURTS[k].nom+' – zones de chute'})}
   renderEdit()}
  else if(t.dataset.z){const n=+t.dataset.z,grow=n>E.zones.length;while(E.zones.length<n)E.zones.push('Zone '+(E.zones.length+1));E.zones.length=n;
   const L=E.buttons.length;E.buttons.forEach((b,i)=>{if(grow)b.zone=Math.min(n-1,Math.floor(i*n/L));else if(b.zone>=n)b.zone=n-1});renderEdit()}
  else if(t.dataset.t){const i=+t.closest('.brow').dataset.i;E.buttons[i].type=t.dataset.t;renderEdit()}
  else if(t.dataset.chr){E.chrono.mode=t.dataset.chr;renderEdit()}
  else if(t.id==='eMinus'||t.id==='ePlus'){const n=E.buttons.length+(t.id==='ePlus'?1:-1);if(n<1||n>12)return;
   if(n>E.buttons.length)E.buttons.push(newBtn(E.buttons.length,E.zones.length-1));else E.buttons.pop();renderEdit()}
 });
 f.addEventListener('input',e=>{const t=e.target;
  if(t.id==='eNom')E.nom=t.value;
  else if(t.dataset.zn!=null){E.zones[+t.dataset.zn]=t.value;$$('#eBtns select option[value="'+t.dataset.zn+'"]').forEach(o=>o.textContent=t.value)}
  else if(t.dataset.k){const i=+t.closest('.brow').dataset.i,k=t.dataset.k;
   E.buttons[i][k]=k==='val'?Math.abs(parseFloat(t.value)||0):k==='zone'?+t.value:t.value;
   if(k==='color')t.parentNode.style.background=t.value}
  else if(t.id==='eMin'||t.id==='eSec')E.chrono.dur=Math.max(5,(parseInt($('#eMin').value)||0)*60+Math.min(59,parseInt($('#eSec').value)||0));
  else if(t.id==='ePer')E.periode=t.value;
  else if(t.id==='eVib')E.vib=t.checked;
 });
 f.addEventListener('change',e=>{if(e.target.id==='ePer')E.periode=e.target.value;if(e.target.id==='eVib')E.vib=e.target.checked});
 const save=()=>{E.nom=(E.nom||'').trim()||'Mon panneau';E.buttons.forEach((b,i)=>{b.label=(b.label||'').trim()||'Action '+(i+1)});
  if(E.layout==='grid'){E.zones=E.zones.map((z,i)=>(z||'').trim()||'Zone '+(i+1));if(E.zones.length===1)E.buttons.forEach(b=>b.zone=0)}
  savePanel(clone(E));return E};
 $('#eSave').onclick=()=>{save();toast('Panneau enregistré','ok');renderHome();show('vHome')};
 $('#eGo').onclick=()=>{const p=save();renderHome();openSetup(allPanels().find(x=>x.id===p.id))};
 $('#eBack').onclick=()=>{renderHome();show('vHome')};
}

/* ───────── PARTAGE DE PANNEAUX (fichier .xlsx de configuration) ───────── */
const CFG_SHEET='StatPanel_Config',CFG_H=['Panneau','Disposition','Zones','Chrono','Durée (s)','Périodes','Vibration','N°','Libellé','Type','Valeur','Couleur','Zone'];
const CHR_N={up:'Chronomètre',down:'Compte à rebours'};
function exportConfig(L){
 const rows=[CFG_H];L.forEach(p=>p.buttons.forEach((b,i)=>rows.push([p.nom,layName(p.layout),p.zones.join(' ; '),CHR_N[p.chrono.mode],p.chrono.dur,p.periode,p.vib===false?'Non':'Oui',i+1,b.label,b.type==='-'?'Négative':'Positive',Math.abs(+b.val||0),b.color,p.zones[b.zone]||p.zones[0]])));
 const lis=[['StatPanel – fichier de panneaux'],['À importer dans StatPanel (élèves) ou StatPanel - Prof : bouton « 📥 Importer des panneaux ».'],
  ['La feuille « '+CFG_SHEET+' » peut être modifiée dans un tableur : une ligne par bouton, 12 boutons maximum par panneau.'],
  ['Disposition : Grille libre, Tennis, Badminton ou Tennis de table. Type : Positive ou Négative. Couleur : code #RRVVBB.'],[],['Créé le',new Date().toLocaleString('fr-FR')],['Panneaux',L.map(p=>p.nom).join(' ; ')]];
 const name=L.length===1?'StatPanel_'+fileSafe(L[0].nom)+'.xlsx':'StatPanel_Panneaux_'+isoDay(new Date())+'.xlsx';
 SPX.download(SPX.write([{name:'Lisez-moi',rows:lis},{name:CFG_SHEET,rows}]),name);toast('Fichier de panneaux exporté','ok')}
async function importConfig(file){try{
 const buf=await file.arrayBuffer();if(!SPX.isZip(buf))throw new Error('Fichier .xlsx attendu.');
 const sh=(await SPX.read(buf)).find(s=>EPS.norm(s.name)===EPS.norm(CFG_SHEET));
 if(!sh)throw new Error('Feuille « '+CFG_SHEET+' » introuvable : ce fichier n\'est pas un fichier de panneaux StatPanel.');
 const h=(sh.rows[0]||[]).map(v=>EPS.norm(v)),ix=n=>h.indexOf(EPS.norm(n)),G=new Map();
 sh.rows.slice(1).forEach(r=>{if(!r)return;const g=(k)=>{const i=ix(k);return i<0||r[i]==null?'':String(r[i]).trim()};const n=g('Panneau');if(!n)return;if(!G.has(n))G.set(n,[]);G.get(n).push(g)});
 const L=panels();let add=0,upd=0;
 for(const [nom,rs] of G){const g0=rs[0],dn=EPS.norm(g0('Disposition'));
  const layout=dn.includes('table')?'tt':dn.includes('badminton')?'badminton':dn.includes('tennis')?'tennis':'grid';
  let zones=g0('Zones').split(/\s*;\s*/).filter(Boolean);
  let buttons=rs.slice(0,12).map((g,i)=>{const zn=g('Zone');let zi=zones.findIndex(z=>EPS.norm(z)===EPS.norm(zn));if(zi<0&&/^\d+$/.test(zn))zi=+zn-1;
   const col=g('Couleur');return{label:g('Libellé')||'Action '+(i+1),type:/^(n|-|−)/i.test(EPS.norm(g('Type'))||g('Type'))?'-':'+',val:Math.abs(parseFloat(String(g('Valeur')).replace(',','.')))||0,color:/^#[0-9a-f]{6}$/i.test(col)?col:PAL[i%PAL.length],zone:Math.max(0,zi)}});
  if(layout!=='grid'){const def=courtButtons(layout);zones=[...COURTS[layout].zones];buttons=def.map((d,i)=>buttons[i]?Object.assign({},buttons[i],{zone:d.zone}):d)}
  else{if(!zones.length)zones=['Zone 1'];zones=zones.slice(0,4);buttons.forEach(b=>{if(b.zone>=zones.length)b.zone=zones.length-1})}
  const dur=parseInt(g0('Durée (s)'))||600,old=L.find(p=>p.nom===nom);
  const p={id:old?old.id:uid(),nom,layout,zones,buttons,chrono:{mode:EPS.norm(g0('Chrono')).includes('rebours')?'down':'up',dur},periode:g0('Périodes')||'Période',vib:EPS.norm(g0('Vibration'))!=='non'};
  if(old){L[L.indexOf(old)]=p;upd++}else{L.unshift(p);add++}}
 if(!add&&!upd)throw new Error('Aucun panneau trouvé dans le fichier.');
 store.set(K.panels,L);renderHome();toast(`✅ ${add} panneau(x) ajouté(s)${upd?`, ${upd} mis à jour`:''}.`,'ok');
}catch(e){toast('❌ '+e.message,'ko')}}

/* ───────── LANCEMENT : qui est observé ? ───────── */
let S=null; // brouillon de séance
let ELEVES=[];
async function loadEleves(){if(MODE!=='prof')return;ELEVES=(await EPS.all()).sort((a,b)=>(a.classe||'').localeCompare(b.classe||'','fr',{numeric:true})||(a.nom+a.prenom).localeCompare(b.nom+b.prenom,'fr'))}
const fullName=m=>(m.prenom?m.prenom+' ':'')+(m.nom||'').toUpperCase();
async function openSetup(p){await loadEleves();
 const prev=S&&S.panelId===p.id?S:null;
 S=prev||{panelId:p.id,panel:clone(p),mode:'solo',camps:[{nom:'',membres:[],auto:true},{nom:'',membres:[],auto:true}],classe:''};
 S.panel=clone(p);renderSetup();show('vSetup')}
function campTitle(i){return S.mode==='avb'?(i?'Camp B':'Camp A'):S.mode==='equipe'?'Équipe observée':'Élève observé'}
function renderSetup(){
 $('#sTitle').textContent='▶ '+S.panel.nom;
 $('#sMode').innerHTML=[['solo','👤 Un élève'],['equipe','👥 Une équipe'],['avb','⚔️ A contre B']].map(([k,n])=>`<button type="button" class="${S.mode===k?'on':''}" data-m="${k}">${n}</button>`).join('');
 const n=S.mode==='avb'?2:1;
 $('#sCamps').innerHTML=`<div class="${n===2?'cmp':''}">`+[0,1].slice(0,n).map(i=>{const c=S.camps[i];
  const nameIn=`<label class="f">${S.mode==='solo'?'Nom affiché (facultatif)':'Nom de l\'équipe'}<input type="text" data-cn="${i}" value="${esc(c.auto?'':c.nom)}" placeholder="${esc(defName(i))}" maxlength="40"></label>`;
  let body='';
  if(MODE==='prof'){
   body=`<div class="chips">${c.membres.map((m,j)=>`<span class="chip">${esc(fullName(m))} <small class="mut">${esc(m.classe)}</small><button type="button" data-rm="${i}:${j}" aria-label="Retirer">✕</button></span>`).join('')||'<span class="mut">Aucun élève rattaché</span>'}</div>
    <button type="button" class="btn s" data-pick="${i}">${S.mode==='solo'?'👤 Choisir l\'élève':'＋ Ajouter des élèves'}</button>`;
  }else{
   if(S.mode==='solo'){const m=c.membres[0]||{};body=`<div class="grid2"><label class="f">Nom<input type="text" data-sf="${i}:nom" value="${esc(m.nom||'')}" autocomplete="off"></label><label class="f">Prénom<input type="text" data-sf="${i}:prenom" value="${esc(m.prenom||'')}" autocomplete="off"></label></div>`}
   else body=`<label class="f">Membres (un élève par ligne : NOM Prénom)<textarea data-ta="${i}" placeholder="DUPONT Léa&#10;MARTIN Noah">${esc(c.membres.map(m=>m.nom.toUpperCase()+' '+m.prenom).join('\n'))}</textarea></label>`;
  }
  return`<div class="camp ${n===2?(i?'b':'a'):''}"><h3 style="margin-top:0">${campTitle(i)}</h3>${S.mode==='solo'?'':nameIn}${body}</div>`}).join('')+'</div>';
 $('#sClasse').classList.toggle('hide',MODE!=='eleve');
 if(MODE==='eleve')$('#sClasseIn').value=S.classe||'';
 $('#sListe').classList.toggle('hide',!(MODE==='prof'&&!ELEVES.length));
}
function defName(i){const c=S.camps[i];if(c.membres.length===1&&S.mode!=='equipe')return fullName(c.membres[0]);return S.mode==='avb'?(i?'Équipe B':'Équipe A'):S.mode==='equipe'?'Équipe':'Élève'}
function readStudentFields(){if(MODE!=='eleve')return;const cl=($('#sClasseIn').value||'').trim();S.classe=cl;
 $$('[data-sf]').forEach(inp=>{const [i,k]=inp.dataset.sf.split(':');const c=S.camps[+i];c.membres[0]=c.membres[0]||{nom:'',prenom:''};c.membres[0][k]=inp.value.trim()});
 S.camps.forEach(c=>{if(c.membres[0]&&!c.membres[0].nom&&!c.membres[0].prenom&&S.mode==='solo')c.membres=[]});
 $$('[data-ta]').forEach(t=>{S.camps[+t.dataset.ta].membres=t.value.split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{const [nom,prenom]=EPS.splitName(l);return{nom:nom||l,prenom:prenom||''}})});
 S.camps.forEach(c=>c.membres.forEach(m=>m.classe=cl))}
function setupEvents(){const v=$('#vSetup');
 v.addEventListener('click',async e=>{const t=e.target.closest('button');if(!t)return;
  if(t.dataset.m){readStudentFields();S.mode=t.dataset.m;if(S.mode==='solo'&&MODE==='prof')S.camps.forEach(c=>c.membres=c.membres.slice(0,1));renderSetup()}
  else if(t.dataset.rm){const [i,j]=t.dataset.rm.split(':').map(Number);S.camps[i].membres.splice(j,1);renderSetup()}
  else if(t.dataset.pick)openPicker(+t.dataset.pick);
 });
 v.addEventListener('input',e=>{const t=e.target;if(t.dataset.cn!=null){const c=S.camps[+t.dataset.cn];c.nom=t.value;c.auto=!t.value.trim()}});
 $('#sListeIn').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const r=await EPS.importFile(f);toast(`✅ ${r.add} élève(s) ajouté(s), ${r.upd} mis à jour.`,'ok');await loadEleves();renderSetup()}catch(x){toast('❌ '+x.message,'ko')}e.target.value=''};
 $('#sBack').onclick=()=>{readStudentFields();show('vHome')};
 $('#sStart').onclick=async()=>{readStudentFields();
  const n=S.mode==='avb'?2:1,camps=S.camps.slice(0,n).map((c,i)=>({nom:(c.auto||!c.nom.trim())?defName(i):c.nom.trim(),membres:clone(c.membres).filter(m=>m.nom||m.prenom)}));
  if(MODE==='eleve'&&S.mode==='solo'&&camps.some(c=>!c.membres.length)&&!confirm('Aucun camarade indiqué : l\'observation ne pourra pas être rattachée à un élève. Continuer ?'))return;
  const now=new Date(),sess={id:uid(),panel:clone(S.panel),mode:S.mode,camps,date:isoDay(now),heure:hhmm(now),started:now.getTime(),
   clicks:[],periodes:[S.panel.periode+' 1'],pi:0,chr:{run:false,acc:0,since:0,base:0},done:false,saved:false};
  if(MODE==='eleve'&&window.ELEVE){const me=await ELEVE.courant();if(me)sess.observateur=fullName(me)}
  store.set(K.sess,sess);startRun(sess)};
}
function openPicker(ci){const c=S.camps[ci],single=S.mode==='solo',sel=new Set(c.membres.map(m=>m.id));
 const used=new Set(S.mode==='avb'?S.camps[1-ci].membres.map(m=>m.id):[]);
 const classes=[...new Set(ELEVES.map(e=>e.classe||''))];let cl=store.get(K.cls,'');if(!classes.includes(cl))cl=classes[0]||'';
 const ov=document.createElement('div');ov.className='ov';
 ov.innerHTML=`<div class="card modal"><h2>${single?'👤 Choisir l\'élève':'👥 Élèves de « '+esc(c.nom||defName(ci))+' »'}</h2>
  <div class="row"><select id="pkC">${classes.map(k=>`<option ${k===cl?'selected':''} value="${esc(k)}">${esc(k||'Sans classe')}</option>`).join('')}<option value="*">Toutes les classes</option></select><input id="pkS" type="search" placeholder="🔍 Rechercher" style="flex:1"></div>
  <div class="lst" id="pkL"></div><div class="row"><span class="mut" id="pkN" style="flex:1"></span><button class="btn" id="pkX">Annuler</button><button class="btn p" id="pkOk">✓ Valider</button></div></div>`;
 document.body.appendChild(ov);
 const draw=()=>{const k=$('#pkC',ov).value,q=EPS.norm($('#pkS',ov).value);
  $('#pkL',ov).innerHTML=ELEVES.filter(e=>(k==='*'||(e.classe||'')===k)&&(!q||EPS.norm(e.nom+e.prenom).includes(q)||EPS.norm(e.prenom+e.nom).includes(q))).map(e=>
   `<label><input type="${single?'radio':'checkbox'}" name="pk" value="${esc(e.id)}" ${sel.has(e.id)?'checked':''} ${used.has(e.id)?'disabled':''}> ${esc(e.nom.toUpperCase())} ${esc(e.prenom)}<small>${esc(e.classe)}${used.has(e.id)?' · autre camp':''}</small></label>`).join('')||'<p class="mut" style="padding:10px">Aucun élève.</p>';
  $('#pkN',ov).textContent=sel.size+' sélectionné(s)'};
 $('#pkC',ov).onchange=()=>{store.set(K.cls,$('#pkC',ov).value);draw()};$('#pkS',ov).oninput=draw;
 $('#pkL',ov).onchange=e=>{const t=e.target;if(single)sel.clear();t.checked?sel.add(t.value):sel.delete(t.value);$('#pkN',ov).textContent=sel.size+' sélectionné(s)'};
 $('#pkX',ov).onclick=()=>ov.remove();ov.onclick=e=>{if(e.target===ov)ov.remove()};
 $('#pkOk',ov).onclick=()=>{c.membres=ELEVES.filter(e=>sel.has(e.id)).map(e=>({id:e.id,nom:e.nom,prenom:e.prenom,classe:e.classe}));ov.remove();renderSetup()};
 draw()}

/* ───────── PANNEAU DE COMPTAGE ───────── */
let R=null,tick=null,wake=null;
const elapsed=s=>s.chr.acc+(s.chr.run?Date.now()-s.chr.since:0);
const persist=()=>R&&store.set(K.sess,R);
async function keepAwake(){try{if('wakeLock' in navigator&&!wake){wake=await navigator.wakeLock.request('screen');wake.addEventListener('release',()=>wake=null)}}catch(e){}}
function releaseWake(){try{wake&&wake.release()}catch(e){}wake=null}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&cur==='vRun')keepAwake()});
function startRun(s){R=s;R.done=false;show('vRun');keepAwake();drawRun();clearInterval(tick);tick=setInterval(updClock,250)}
function bestCols(n,w,h){let best=1,bs=-1;for(let c=1;c<=n;c++){const r=Math.ceil(n/c),cw=w/c,ch=h/r,sc=Math.min(cw,ch*1.5)-(c*r-n)*2;if(sc>bs){bs=sc;best=c}}return best}
const btnHTML=(b,i,camp)=>`<button class="pb" data-b="${i}" data-c="${camp}" style="--c1:${rgba(b.color,.62)};--c2:${rgba(b.color,.18)};--c3:${rgba(b.color,.35)}">
 <span class="vl ${b.type==='-'?'neg':'pos'}">${sgn(sval(b))}</span><span class="lb">${esc(b.label)}</span><span class="ct">0</span></button>`;
function boardHTML(P,camp){
 if(P.layout!=='grid'){const C=COURTS[P.layout];const cells=[],ex=[];
  P.buttons.forEach((b,i)=>{const pos=(C.btn[i]||[])[5];if(pos)cells.push(btnHTML(b,i,camp).replace('style="','style="grid-row:'+pos[0]+(pos[2]?' / span '+pos[2]:'')+';grid-column:'+pos[1]+(pos[3]?' / span '+pos[3]:'')+';'));else ex.push(btnHTML(b,i,camp))});
  return`<div class="cw"><div class="court ${P.layout}" style="background:linear-gradient(170deg,${C.surf},${rgba(C.surf,.75)})"><div class="net"></div><div class="cg" style="grid-template-rows:${C.rows};grid-template-columns:${C.cols}">${cells.join('')}</div></div>${ex.length?`<div class="ex">${ex.join('')}</div>`:''}</div>`}
 const z=P.zones.length;
 if(z<=1)return`<div class="grp"><div class="gg">${P.buttons.map((b,i)=>btnHTML(b,i,camp)).join('')}</div></div>`;
 return P.zones.map((zn,zi)=>{const B=P.buttons.map((b,i)=>[b,i]).filter(([b])=>b.zone===zi);if(!B.length)return'';return`<div class="grp" data-n="${B.length}"><h5>${esc(zn)}</h5><div class="gg">${B.map(([b,i])=>btnHTML(b,i,camp)).join('')}</div></div>`}).join('');
}
function drawRun(){const P=R.panel,avb=R.mode==='avb';
 $('#vRun').innerHTML=`<div class="bar">
  <button class="tb" id="rQuit" title="Retour à l'accueil (l'observation est conservée)">✕</button>
  <div class="ttl">${esc(P.nom)}<small>${esc(R.camps.map(c=>c.nom).join(' vs '))}</small></div>
  ${avb?'':'<span class="score" id="rScore">0</span>'}
  <button class="tb clk" id="rClk" title="Démarrer / mettre en pause">▶ 00:00</button>
  <button class="tb" id="rPer" title="Passer à la période suivante">${esc(R.periodes[R.pi])} ⏭</button>
  <button class="tb" id="rUndo" title="Annuler le dernier clic">↶</button>
  <button class="tb" id="rFull" title="Plein écran">⛶</button>
  <button class="tb on" id="rEnd" title="Terminer et voir le bilan">✓ Fin</button></div>
  <div class="stage ${avb?'avb':''}">${R.camps.map((c,ci)=>`<div class="pane ${avb?(ci?'b':'a'):''}">${avb?`<div class="phead"><span class="nm">${ci?'🅱':'🅰'} ${esc(c.nom)}</span><span class="mut" id="rPN${ci}"></span><span class="sc" id="rSc${ci}">0</span></div>`:''}
   <div class="board" data-camp="${ci}">${boardHTML(P,ci)}</div></div>`).join('')}</div>`;
 layoutBoards();refreshCounts();updClock();
 $$('#vRun .pb').forEach(b=>b.addEventListener('pointerdown',hit));
 $('#rQuit').onclick=()=>{persist();clearInterval(tick);renderHome();show('vHome')};
 $('#rClk').onclick=()=>{toggleClock();updClock()};
 $('#rUndo').onclick=undo;
 $('#rPer').onclick=nextPeriod;
 $('#rFull').onclick=()=>{try{document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen()}catch(e){}};
 $('#rEnd').onclick=()=>{if(!confirm('Terminer l\'observation et afficher le bilan ?'))return;if(R.chr.run)toggleClock();R.done=true;persist();clearInterval(tick);openStats(R)};
}
function layoutBoards(){if(!R||cur!=='vRun')return;
 $$('#vRun .board').forEach(bd=>{const g=bd.querySelectorAll('.grp').length,W=bd.clientWidth,H=bd.clientHeight;
  bd.classList.remove('col','q');if(g===4&&W>360&&H>360)bd.classList.add('q');else if(g>1&&H>W*0.9)bd.classList.add('col');
  bd.querySelectorAll('.grp[data-n]').forEach(gr=>{gr.style.flex=bd.classList.contains('q')?'':String(Math.sqrt(+gr.dataset.n))});
  bd.querySelectorAll('.gg').forEach(gg=>{const n=gg.querySelectorAll('.pb').length||1;gg.style.gridTemplateColumns=`repeat(${bestCols(n,gg.clientWidth||W,gg.clientHeight||H)},1fr)`;gg.style.gridAutoRows='1fr'})})}
window.addEventListener('resize',()=>{clearTimeout(layoutBoards.t);layoutBoards.t=setTimeout(layoutBoards,80)});
function toggleClock(){const c=R.chr;if(c.run){c.acc+=Date.now()-c.since;c.run=false}else{if(R.panel.chrono.mode==='down'&&remaining()<=0)return toast('Temps écoulé : passez à la période suivante.','ko');c.since=Date.now();c.run=true}persist()}
const remaining=()=>R.panel.chrono.dur*1000-(elapsed(R)-R.chr.base);
function updClock(){if(!R||cur!=='vRun')return;const el=$('#rClk');if(!el)return;const down=R.panel.chrono.mode==='down';
 if(down&&R.chr.run&&remaining()<=0){toggleClock();el.classList.add('end');vib([250,120,250,120,400]);toast('⏳ Temps écoulé !','ko')}
 el.textContent=(R.chr.run?'⏸ ':'▶ ')+fmt(down?remaining():elapsed(R)-R.chr.base);el.classList.toggle('on',R.chr.run)}
function hit(e){e.preventDefault();const b=e.currentTarget,bi=+b.dataset.b,ci=+b.dataset.c,B=R.panel.buttons[bi];
 if(!R.chr.run&&!R.clicks.length&&!(R.panel.chrono.mode==='down'&&remaining()<=0))toggleClock();
 R.clicks.push({t:elapsed(R),p:R.pi,b:bi,c:ci});persist();
 if(R.panel.vib!==false)vib(B.type==='-'?[18,40,18]:15);
 const v=sval(B),pop=document.createElement('span');pop.className='pop';pop.textContent=sgn(v);pop.style.color=v<0?'#ffd1d8':'#d1ffef';b.appendChild(pop);
 const fl=document.createElement('span');fl.className='flash';b.appendChild(fl);setTimeout(()=>{pop.remove();fl.remove()},720);
 refreshCounts();updClock()}
function undo(){if(!R.clicks.length)return toast('Rien à annuler.');const c=R.clicks.pop(),B=R.panel.buttons[c.b];persist();refreshCounts();vib(30);
 toast(`↶ Annulé : ${B.label}${R.mode==='avb'?' ('+R.camps[c.c].nom+')':''}`)}
function nextPeriod(){const n=R.periodes.length+1,name=R.panel.periode+' '+n;if(!confirm(`Terminer « ${R.periodes[R.pi]} » et passer à « ${name} » ?`))return;
 R.periodes.push(name);R.pi=R.periodes.length-1;
 if(R.panel.chrono.mode==='down'){if(R.chr.run)toggleClock();R.chr.base=elapsed(R)}
 persist();$('#rPer').textContent=name+' ⏭';$('#rClk').classList.remove('end');updClock();toast('▶ '+name)}
function refreshCounts(){const P=R.panel;R.camps.forEach((c,ci)=>{const st=stats(R,ci);
  $$(`#vRun .pb[data-c="${ci}"]`).forEach(b=>b.querySelector('.ct').textContent=st.byBtn[+b.dataset.b]);
  if(R.mode==='avb'){$('#rSc'+ci).textContent=num(st.pts);$('#rPN'+ci).textContent=`${st.pos}✓ ${st.neg}✗`}else $('#rScore').textContent=num(st.pts)})}

/* ───────── STATISTIQUES ───────── */
function stats(s,ci,pf){const P=s.panel,byBtn=P.buttons.map(()=>0);let pts=0,pos=0,neg=0;
 const per=s.periodes.map(n=>({nom:n,pts:0,pos:0,neg:0,n:0}));
 s.clicks.forEach(k=>{if(k.c!==ci||(pf!=null&&k.p!==pf))return;const B=P.buttons[k.b];if(!B)return;byBtn[k.b]++;const v=sval(B);pts+=v;B.type==='-'?neg++:pos++;
  const q=per[k.p];if(q){q.n++;q.pts+=v;B.type==='-'?q.neg++:q.pos++}});
 const byZone=P.zones.map((z,zi)=>{let n=0,p=0;P.buttons.forEach((b,i)=>{if(b.zone===zi){n+=byBtn[i];p+=byBtn[i]*sval(b)}});return{nom:z,n,pts:p}});
 const total=pos+neg;return{byBtn,pts,pos,neg,total,pct:total?Math.round(pos/total*100):null,byZone,per}}
const durMs=s=>{let m=0;s.clicks.forEach(k=>m=Math.max(m,k.t));return Math.max(m,s.chr?s.chr.acc+(s.chr.run?Date.now()-s.chr.since:0):0)};
let ST=null;
function openStats(s){ST=s;clearInterval(tick);renderStats();show('vStats')}
function renderStats(){const s=ST,P=s.panel,avb=s.mode==='avb',all=s.camps.map((c,ci)=>stats(s,ci));
 const maxB=Math.max(1,...all.flatMap(a=>a.byBtn));
 const campCard=(c,ci)=>{const st=all[ci],adv=avb?all[1-ci]:null;
  const res=avb?(st.pts>adv.pts?'🏆 Gagné':st.pts<adv.pts?'Perdu':'Égalité'):'';
  return`<div class="card" style="${avb?`border-color:${ci?'rgba(251,113,133,.5)':'rgba(61,155,255,.5)'}`:''}"><h2>${avb?(ci?'🅱':'🅰'):S_MODE_ICON(s)} ${esc(c.nom)} ${res?`<span class="tag" style="margin-left:auto">${res}</span>`:''}</h2>
  ${c.membres.length&&(c.membres.length>1||c.nom!==fullName(c.membres[0]))?`<p class="mut" style="margin:-6px 0 10px">${c.membres.map(fullName).map(esc).join(', ')}</p>`:''}
  <div class="kpis"><div class="kpi"><b>${num(st.pts)}</b><span>Score</span></div><div class="kpi pos"><b>${st.pos}</b><span>Actions +</span></div><div class="kpi neg"><b>${st.neg}</b><span>Actions −</span></div>
   <div class="kpi"><div class="ring" style="--v:${st.pct??0}"><b>${st.pct==null?'–':st.pct+'%'}</b></div><span>Réussite</span></div></div>
  ${P.layout!=='grid'?`<div class="heat">${heatHTML(P,st)}</div>`:''}
  <table class="t"><thead><tr><th>Action</th><th class="n">Nb</th><th class="n">Points</th><th></th></tr></thead><tbody>
  ${P.buttons.map((b,i)=>`<tr><td><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${esc(b.color)};margin-right:6px"></span>${esc(b.label)} <small class="mut">${sgn(sval(b))}</small></td><td class="n"><b>${st.byBtn[i]}</b></td><td class="n">${num(st.byBtn[i]*sval(b))}</td><td style="width:30%"><div class="bars"><i style="width:${st.byBtn[i]/maxB*100}%;background:${esc(b.color)}"></i></div></td></tr>`).join('')}
  </tbody></table>
  ${P.zones.length>1?`<h3>Par zone</h3><table class="t"><tbody>${st.byZone.map(z=>`<tr><td>${esc(z.nom)}</td><td class="n"><b>${z.n}</b> action(s)</td><td class="n">${num(z.pts)} pt(s)</td></tr>`).join('')}</tbody></table>`:''}
  ${s.periodes.length>1?`<h3>Par ${esc(P.periode.toLowerCase())}</h3><table class="t"><thead><tr><th></th><th class="n">Score</th><th class="n">+</th><th class="n">−</th><th class="n">Réussite</th></tr></thead><tbody>${st.per.map(q=>`<tr><td>${esc(q.nom)}</td><td class="n"><b>${num(q.pts)}</b></td><td class="n">${q.pos}</td><td class="n">${q.neg}</td><td class="n">${q.n?Math.round(q.pos/q.n*100)+'%':'–'}</td></tr>`).join('')}</tbody></table>`:''}
  </div>`};
 const att=s.camps.map(c=>c.membres.length).reduce((a,b)=>a+b,0);
 $('#stBody').innerHTML=`<div class="card"><h2>📊 ${esc(P.nom)}</h2><p class="mut" style="margin:0">${frDate(s.date)} à ${esc(s.heure)} · ${s.mode==='avb'?'A contre B':s.mode==='equipe'?'Équipe':'Individuel'} · durée ${fmt(durMs(s))} · ${s.clicks.length} clic(s)${s.periodes.length>1?' · '+s.periodes.length+' '+esc(P.periode.toLowerCase())+'s':''}${s.observateur?' · observé par '+esc(s.observateur):''}</p></div>
  <div class="${avb?'cmp':''}">${s.camps.map(campCard).join('')}</div>
  <div class="card"><h2>🕑 Chronologie</h2><div class="tl">${timelineHTML(s)}</div></div>`;
 $('#stSave').innerHTML=MODE==='prof'?'💾 Enregistrer dans Mes Apps EPS':'💾 Enregistrer sur cet appareil';
 $('#stSave').disabled=!att||s.saved;$('#stEps').disabled=!att;
 $('#stNote').innerHTML=!att?`⚠ Aucun élève rattaché : ${MODE==='prof'?'choisissez des élèves au lancement pour enregistrer dans Mes Apps EPS':'indiquez le camarade observé au lancement pour remettre le fichier au professeur'}. Le bilan détaillé (.xlsx) reste téléchargeable.`
  :s.saved?(MODE==='prof'?'✅ Enregistré dans Mes Apps EPS (fiches élèves).':'✅ Enregistré sur cet appareil. Exporte le fichier pour le remettre au professeur.')
  :`${att} élève(s) recevront ce bilan : ${s.camps.flatMap(c=>c.membres).map(fullName).map(esc).join(', ')}.`;
 $('#stResume').classList.toggle('hide',!!s.saved||!store.get(K.sess,null)||store.get(K.sess,null).id!==s.id);
}
const S_MODE_ICON=s=>s.mode==='equipe'?'👥':'👤';
const frDate=iso=>{const m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(iso||'');return m?`${m[3]}/${m[2]}/${m[1]}`:iso};
function heatHTML(P,st){const C=COURTS[P.layout],mx=Math.max(1,...st.byBtn),cells=[],ex=[];
 P.buttons.forEach((b,i)=>{const pos=(C.btn[i]||[])[5],a=.12+.75*st.byBtn[i]/mx;
  const h=`<div class="pb" style="--c1:${rgba(b.color,a)};--c2:${rgba(b.color,a*.5)};--c3:${rgba(b.color,a*.6)};${pos?`grid-row:${pos[0]}${pos[2]?' / span '+pos[2]:''};grid-column:${pos[1]}${pos[3]?' / span '+pos[3]:''}`:''}"><span class="lb">${esc(b.label)}</span><span class="ct">${st.byBtn[i]}</span></div>`;
  pos?cells.push(h):ex.push(h)});
 return`<div class="cw"><div class="court ${P.layout}" style="background:${C.surf}"><div class="net"></div><div class="cg" style="grid-template-rows:${C.rows};grid-template-columns:${C.cols}">${cells.join('')}</div></div>${ex.length?`<div class="ex" style="height:48px">${ex.join('')}</div>`:''}</div>`}
function timeline(s){const P=s.panel,sc=s.camps.map(()=>0);return s.clicks.map((k,i)=>{const B=P.buttons[k.b]||{label:'?',type:'+',val:0};sc[k.c]+=sval(B);
 return{n:i+1,t:k.t,per:s.periodes[k.p]||'',camp:s.camps[k.c]?s.camps[k.c].nom:'',cl:k.c,label:B.label,type:B.type,val:sval(B),zone:P.zones[B.zone]||'',cumul:sc[k.c]}})}
function timelineHTML(s){let lp=-1;const T=timeline(s);if(!T.length)return'<p class="mut">Aucune action.</p>';
 return T.map((x,i)=>{const pp=s.clicks[i].p;const head=pp!==lp&&s.periodes.length>1?`<div class="pp">${esc(x.per)}</div>`:'';lp=pp;
  return head+`<div>${fmt(x.t)} · ${s.mode==='avb'?(x.cl?'🅱 ':'🅰 '):''}<b>${esc(x.label)}</b> <span style="color:${x.val<0?'var(--neg)':'var(--pos)'}">${sgn(x.val)}</span> <span class="mut">→ ${num(x.cumul)}</span></div>`}).join('')}
function chronoText(s){let lp=-1;return timeline(s).map((x,i)=>{const pp=s.clicks[i].p;const h=pp!==lp&&s.periodes.length>1?`[${x.per}] `:'';lp=pp;
 return h+fmt(x.t)+' '+(s.mode==='avb'?(x.cl?'B·':'A·'):'')+x.label+' ('+sgn(x.val)+')'}).join(' ; ').slice(0,32000)}

/* ligne enregistrée pour chaque élève (mode « lignes » de Mes Apps EPS) */
function ligne(s,ci){const P=s.panel,st=stats(s,ci),c=s.camps[ci],avb=s.mode==='avb',L={Date:s.date,Heure:s.heure,Panneau:P.nom,
 Mode:avb?'A contre B':s.mode==='equipe'?'Équipe':'Individuel'};
 if(s.mode!=='solo')L['Équipe']=c.nom;
 if(c.membres.length>1)L.Membres=c.membres.map(fullName).join(', ');
 if(avb){L.Camp=ci?'B':'A';L.Adversaire=s.camps[1-ci].nom}
 if(s.observateur)L.Observateur=s.observateur;
 L['Durée']=fmt(durMs(s));if(s.periodes.length>1)L['Périodes']=s.periodes.length;
 L.Score=st.pts;
 if(avb){const o=stats(s,1-ci);L['Score adverse']=o.pts;L['Résultat']=st.pts>o.pts?'Gagné':st.pts<o.pts?'Perdu':'Égalité'}
 L['Actions +']=st.pos;L['Actions −']=st.neg;L['Total actions']=st.total;L['% réussite']=st.pct==null?'':st.pct;
 if(s.periodes.length>1)L['Détail périodes']=st.per.map(q=>`${q.nom} : ${num(q.pts)} (${q.pos}+/${q.neg}−)`).join(' | ');
 const used=new Set(Object.keys(L));P.buttons.forEach((b,i)=>{let k='Nb '+b.label;while(used.has(k))k+=' ';used.add(k);L[k]=st.byBtn[i]});
 if(P.zones.length>1)st.byZone.forEach(z=>{let k=/^zone/i.test(z.nom)?z.nom:'Zone '+z.nom;while(used.has(k))k+=' ';used.add(k);L[k]=z.n});
 L.Chronologie=chronoText(s);return L}
async function saveToEps(s){const ids=[];
 for(let ci=0;ci<s.camps.length;ci++){const L=ligne(s,ci);
  for(const m of s.camps[ci].membres){let id=m.id;
   if(MODE==='eleve'){const e=await EPS.putEleve({nom:m.nom,prenom:m.prenom,classe:m.classe||''});id=m.id=e.id}
   if(!id)continue;await EPS.addLigne(APP_ID,id,L);ids.push(id)}}
 return ids}
function addHist(s){const H=store.get(K.hist,[]).filter(h=>h.id!==s.id);H.unshift(clone(s));store.set(K.hist,H.slice(0,80))}
function statsEvents(){
 $('#stSave').onclick=async()=>{try{const ids=await saveToEps(ST);if(!ids.length)throw new Error(MODE==='prof'?'Élèves introuvables dans la base Mes Apps EPS de cet appareil.':'Aucun élève à enregistrer.');
   ST.saved=true;addHist(ST);const cur=store.get(K.sess,null);if(cur&&cur.id===ST.id)store.set(K.sess,null);
   toast(MODE==='prof'?`✅ Enregistré dans Mes Apps EPS (${ids.length} élève(s))`:`✅ Enregistré (${ids.length} élève(s))`,'ok');renderStats()}catch(e){toast('❌ '+e.message,'ko')}};
 $('#stEps').onclick=async()=>{try{if(!ST.saved){await saveToEps(ST);ST.saved=true;addHist(ST);const cur=store.get(K.sess,null);if(cur&&cur.id===ST.id)store.set(K.sess,null)}
   const ids=[...new Set(ST.camps.flatMap(c=>c.membres.map(m=>m.id)).filter(Boolean))];
   const bytes=await EPS.exportXLSX(MODE==='prof'?{ids,apps:[APP_ID]}:{ids,apps:[APP_ID],sansEleves:true});
   EPS.downloadXLSX(bytes,'StatPanel_'+fileSafe(ST.panel.nom)+'_'+ST.date+'.xlsx');renderStats()}catch(e){toast('❌ '+e.message,'ko')}};
 $('#stXlsx').onclick=()=>exportBilan(ST);
 $('#stResume').onclick=()=>startRun(ST);
 $('#stHome').onclick=()=>{if(!ST.saved){addHist(ST);const cur=store.get(K.sess,null);if(cur&&cur.id===ST.id)store.set(K.sess,null)}renderHome();show('vHome')};
 $('#stAgain').onclick=()=>{if(!ST.saved){addHist(ST);const cur=store.get(K.sess,null);if(cur&&cur.id===ST.id)store.set(K.sess,null)}const p=allPanels().find(x=>x.id===ST.panel.id)||ST.panel;openSetup(p)};
}
function exportBilan(s){const P=s.panel,rows=[['Camp','Élèves','Action','Type','Valeur','Zone','Nombre','Points']];
 s.camps.forEach((c,ci)=>{const st=stats(s,ci);P.buttons.forEach((b,i)=>rows.push([c.nom,c.membres.map(fullName).join(', '),b.label,b.type==='-'?'Négative':'Positive',sval(b),P.zones[b.zone]||'',st.byBtn[i],st.byBtn[i]*sval(b)]));
  rows.push([c.nom,'','TOTAL','','','',st.total,st.pts],[c.nom,'','Actions + / −','','','',st.pos+' / '+st.neg,''],[c.nom,'','% réussite','','','',st.pct==null?'':st.pct,''],[])});
 const res=[['StatPanel – bilan'],['Panneau',P.nom],['Date',frDate(s.date)+' '+s.heure],['Mode',s.mode==='avb'?'A contre B':s.mode==='equipe'?'Équipe':'Individuel'],['Durée',fmt(durMs(s))]];
 if(s.observateur)res.push(['Observateur',s.observateur]);
 res.push([]);s.camps.forEach((c,ci)=>{const st=stats(s,ci);res.push([c.nom,'Score',st.pts,'Réussite',st.pct==null?'':st.pct+' %']);if(s.periodes.length>1)st.per.forEach(q=>res.push(['',q.nom,q.pts,q.pos+' + / '+q.neg+' −']))});
 const tl=[['N°','Temps','Période','Camp','Action','Type','Valeur','Zone','Score cumulé']].concat(timeline(s).map(x=>[x.n,fmt(x.t),x.per,x.camp,x.label,x.type==='-'?'Négative':'Positive',x.val,x.zone,x.cumul]));
 SPX.download(SPX.write([{name:'Résumé',rows:res},{name:'Bilan',rows},{name:'Chronologie',rows:tl}]),'StatPanel_Bilan_'+fileSafe(P.nom)+'_'+s.date+'_'+s.heure.replace(':','h')+'.xlsx')}

/* ───────── HISTORIQUE ───────── */
function openHist(){const H=store.get(K.hist,[]);
 $('#hList').innerHTML=H.length?H.map(h=>{const sc=h.camps.map((c,ci)=>c.nom+' '+num(stats(h,ci).pts)).join(' – ');
  return`<div class="pc"><h4>${h.panel.layout==='grid'?'🔲':COURTS[h.panel.layout].emoji} ${esc(h.panel.nom)}</h4><p class="mut" style="margin:0">${frDate(h.date)} ${esc(h.heure)} · ${h.clicks.length} clic(s)<br><b style="color:var(--txt)">${esc(sc)}</b></p>
  <div class="row" style="gap:6px"><span class="tag">${h.saved?'✅ Enregistré':'Non enregistré'}</span></div>
  <div class="acts"><button class="btn p s" data-h="${h.id}">📊 Bilan</button><button class="btn s d" data-hd="${h.id}">🗑</button></div></div>`}).join(''):'<p class="mut">Aucune observation terminée.</p>';
 show('vHist')}
function histEvents(){$('#hList').onclick=e=>{const t=e.target.closest('button');if(!t)return;const H=store.get(K.hist,[]);
  if(t.dataset.h)openStats(H.find(h=>h.id===t.dataset.h));
  else if(t.dataset.hd&&confirm('Supprimer cette observation de l\'historique ? (Les données déjà enregistrées pour les élèves sont conservées.)')){store.set(K.hist,H.filter(h=>h.id!==t.dataset.hd));openHist()}};
 $('#hBack').onclick=()=>{renderHome();show('vHome')};
 $('#hAll').onclick=async()=>{try{const L=(await EPS.all()).filter(e=>e.ext&&e.ext[APP_ID]);if(!L.length)throw new Error('Aucune observation enregistrée pour des élèves sur cet appareil.');
   const bytes=await EPS.exportXLSX(MODE==='prof'?{ids:L.map(e=>e.id),apps:[APP_ID]}:{ids:L.map(e=>e.id),apps:[APP_ID],sansEleves:true});
   let who='';if(MODE==='eleve'&&window.ELEVE){const me=await ELEVE.courant();if(me)who='_'+fileSafe(me.nom)+'_'+fileSafe(me.prenom)}
   EPS.downloadXLSX(bytes,'StatPanel'+who+'_'+isoDay(new Date())+'.xlsx')}catch(x){toast('❌ '+x.message,'ko')}};
}

/* ───────── démarrage ───────── */
async function boot(){
 $('#vHome').addEventListener('click',homeClick);
 $('#cfgFile').onchange=e=>{e.target.files[0]&&importConfig(e.target.files[0]);e.target.value=''};
 editEvents();setupEvents();statsEvents();histEvents();
 if(MODE==='eleve'&&window.ELEVE){ELEVE.bandeau($('#who'));ELEVE.demander();
 }
 renderHome();show('vHome');
 if(MODE==='prof'){try{const n=(await EPS.all()).length;$('#who').innerHTML=n?`👥 <b>${n}</b> élève(s) dans Mes Apps EPS sur cet appareil.`:`⚠ Aucune liste d'élèves sur cet appareil : ouvrez Mes Apps EPS dans ce navigateur ou chargez le fichier .xlsx au lancement d'une observation.`}catch(e){}}
 const ver=typeof APP_VERSION!=='undefined'?'v'+APP_VERSION:'';$$('.ver').forEach(x=>x.textContent=ver);
 if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js').catch(()=>{});
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
window.StatPanel={stats,ligne,COURTS,EXAMPLES};
})();
