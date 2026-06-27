/* ===== DONNÉES (issues du carnet LaTeX) ===== */
const PROGRAM = {
  PUSH: { day:"Vendredi", label:"PUSH", ex:[
    {n:"Développé couché haltères", m:"Pectoraux"},
    {n:"Pec Deck ou Écartés poulie", m:"Pectoraux"},
    {n:"Développé militaire haltères", m:"Épaules"},
    {n:"Élévations latérales haltères", m:"Épaules"},
    {n:"Extension triceps poulie corde", m:"Triceps"},
    {n:"Extension nuque haltère", m:"Triceps"},
  ]},
  PULL: { day:"Samedi", label:"PULL", ex:[
    {n:"Tirage poitrine poulie haute", m:"Dos"},
    {n:"Tirage horizontal poulie basse", m:"Dos"},
    {n:"Curl alterné haltères", m:"Biceps"},
    {n:"Curl poulie basse", m:"Biceps"},
  ]},
  LEGS: { day:"Dimanche", label:"LEGS", ex:[
    {n:"Presse à cuisses", m:"Quadriceps"},
    {n:"Goblet Squat avec haltère", m:"Quadriceps"},
    {n:"Leg Curl machine", m:"Ischios"},
    {n:"Soulevé de terre jambes tendues", m:"Ischios"},
    {n:"Extensions mollets machine/presse", m:"Mollets"},
  ]},
};
const SESS = ["PUSH","PULL","LEGS"];
const MONTHS = 6, WEEKS = 4, SETS = 3;
const TOTAL_SESSIONS = MONTHS * WEEKS * SESS.length; // 72

/* ===== ÉTAT + PERSISTANCE ===== */
const KEY = "ppl_carnet_v1";
let DB = load();
let cur = { m: DB.cur?.m ?? 1, w: DB.cur?.w ?? 1, s: DB.cur?.s ?? "PUSH" };
let tab = "train";

function load(){
  try{ return JSON.parse(localStorage.getItem(KEY)) || {logs:{},cur:null}; }
  catch(e){ return {logs:{},cur:null}; }
}
function save(){
  DB.cur = cur;
  try{ localStorage.setItem(KEY, JSON.stringify(DB)); }catch(e){}
}
function logKey(m,w,s){ return `${m}-${w}-${s}`; }
function getLog(m,w,s){ return DB.logs[logKey(m,w,s)] || null; }

/* Dernière perf (semaine/mois précédent même séance) pour surcharge */
function prevLog(m,w,s){
  // cherche la séance la plus récente AVANT (m,w) pour ce type s
  let best=null;
  for(let mm=1; mm<=m; mm++){
    for(let ww=1; ww<=WEEKS; ww++){
      if(mm===m && ww>=w) continue;
      if(mm>m) continue;
      const lg = getLog(mm,ww,s);
      if(lg) best = {mm,ww,lg};
    }
  }
  return best;
}

function sessionDone(m,w,s){
  const lg = getLog(m,w,s); if(!lg) return false;
  return PROGRAM[s].ex.every((_,i)=>{
    const e = lg[i]; if(!e) return false;
    return e.some(set=>set && (set.kg||set.reps));
  });
}
function completedCount(){
  let c=0;
  for(let m=1;m<=MONTHS;m++)for(let w=1;w<=WEEKS;w++)for(const s of SESS)
    if(sessionDone(m,w,s)) c++;
  return c;
}

/* ===== NAV ===== */
function go(t){
  tab=t;
  document.querySelectorAll(".nav button").forEach(b=>b.classList.toggle("on",b.dataset.tab===t));
  render();
}
function toast(msg){
  const el=document.getElementById("toast");
  el.textContent=msg; el.classList.add("show");
  clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove("show"),1600);
}

/* ===== RENDER ===== */
function render(){
  const done = completedCount();
  const pct = Math.round(done/TOTAL_SESSIONS*100);
  document.getElementById("hdrProg").textContent = pct+"%";
  const v=document.getElementById("view");
  if(tab==="train") v.innerHTML=viewTrain();
  else if(tab==="cal") v.innerHTML=viewCal();
  else if(tab==="stats") v.innerHTML=viewStats();
  else v.innerHTML=viewInfo();
  if(tab==="train") bindInputs();
}

/* --- VUE SÉANCE --- */
function viewTrain(){
  const p=PROGRAM[cur.s];
  const lg=getLog(cur.m,cur.w,cur.s)||[];
  const prev=prevLog(cur.m,cur.w,cur.s);
  let monthOpts="",weekChips="";
  for(let m=1;m<=MONTHS;m++) monthOpts+=`<option value="${m}" ${m===cur.m?'selected':''}>Mois ${m}</option>`;
  for(let w=1;w<=WEEKS;w++){
    const d=sessionDone(cur.m,w,cur.s);
    weekChips+=`<div class="chip ${w===cur.w?'on':''} ${d?'done':''}" onclick="setWeek(${w})">S${w}${d?' ✓':''}</div>`;
  }
  let seg="";
  SESS.forEach(s=>{
    seg+=`<button class="${s===cur.s?'on':''}" onclick="setSess('${s}')">${PROGRAM[s].day.slice(0,3)} · ${s}</button>`;
  });

  let exHtml="";
  p.ex.forEach((e,i)=>{
    const elog=lg[i]||[];
    const pe = prev ? (prev.lg[i]||[]) : [];
    let setsHtml="";
    for(let s=0;s<SETS;s++){
      const cell=elog[s]||{};
      setsHtml+=`<div class="setbox"><label>Série ${s+1}</label>
        <div class="in">
          <input type="number" inputmode="decimal" placeholder="kg" data-ex="${i}" data-set="${s}" data-f="kg" value="${cell.kg??''}">
          <span class="x">×</span>
          <input type="number" inputmode="numeric" placeholder="rép" data-ex="${i}" data-set="${s}" data-f="reps" value="${cell.reps??''}">
        </div></div>`;
    }
    // hint surcharge
    let hint=`<div class="hint none">⓪ Aucune référence — note ta première perf</div>`;
    const peBest = bestSet(pe);
    if(peBest){
      hint=`<div class="hint same">↗︎ Précédent : <b style="margin:0 4px">${peBest.kg||0}kg × ${peBest.reps||0}</b> → vise +1 rép ou +0.5–1kg</div>`;
    }
    exHtml+=`<div class="ex">
      <div class="row between">
        <div><div class="name">${e.n}</div><div class="tag">${e.m}</div></div>
      </div>
      <div class="sets">${setsHtml}</div>
      ${hint}
    </div>`;
  });

  const dn = sessionDone(cur.m,cur.w,cur.s);
  return `<div class="wrap">
    <div class="card">
      <div class="row between" style="margin-bottom:10px">
        <select onchange="setMonth(this.value)">${monthOpts}</select>
        <span class="daytag ${cur.s}">${p.day} · ${p.label}</span>
      </div>
      <div class="weeksel">${weekChips}</div>
      <div class="seg" style="margin-top:10px">${seg}</div>
    </div>
    <div class="card">
      <div class="row between">
        <b style="font-size:15px">${p.day} — ${p.label}</b>
        ${dn?'<span class="done-badge">✓ Complétée</span>':'<span class="muted">En cours</span>'}
      </div>
      <div class="progwrap"><div class="progbar" style="width:${exDoneRatio(lg,p)}%"></div></div>
    </div>
    <div class="card">${exHtml}</div>
    <button class="btn" style="width:100%" onclick="saveSession()">💾 Enregistrer la séance</button>
    <div style="height:14px"></div>
  </div>`;
}
function bestSet(arr){
  if(!arr) return null;
  let b=null;
  arr.forEach(s=>{ if(s&&(s.kg||s.reps)){ const v=(+s.kg||0)*100+(+s.reps||0); if(!b||v>b._v){b={...s,_v:v};} } });
  return b;
}
function exDoneRatio(lg,p){
  let d=0; p.ex.forEach((_,i)=>{ const e=lg[i]; if(e&&e.some(s=>s&&(s.kg||s.reps))) d++; });
  return Math.round(d/p.ex.length*100);
}

function bindInputs(){
  document.querySelectorAll('input[data-ex]').forEach(inp=>{
    inp.addEventListener('input',()=>{
      const k=logKey(cur.m,cur.w,cur.s);
      if(!DB.logs[k]) DB.logs[k]=[];
      const ex=+inp.dataset.ex, st=+inp.dataset.set, f=inp.dataset.f;
      if(!DB.logs[k][ex]) DB.logs[k][ex]=[];
      if(!DB.logs[k][ex][st]) DB.logs[k][ex][st]={};
      DB.logs[k][ex][st][f]= inp.value===''? '' : inp.value;
      save();
      // live progress bar
      const p=PROGRAM[cur.s];
      const bar=document.querySelector('.progbar');
      if(bar) bar.style.width=exDoneRatio(DB.logs[k],p)+"%";
    });
  });
}
function saveSession(){
  save();
  const pct=Math.round(completedCount()/TOTAL_SESSIONS*100);
  document.getElementById("hdrProg").textContent=pct+"%";
  toast(sessionDone(cur.m,cur.w,cur.s)?"Séance complétée ✓":"Progression enregistrée");
  render();
}
function setMonth(m){ cur.m=+m; save(); render(); }
function setWeek(w){ cur.w=w; save(); render(); }
function setSess(s){ cur.s=s; save(); render(); }

/* --- VUE PLANNING --- */
function viewCal(){
  let html=`<div class="wrap">`;
  for(let m=1;m<=MONTHS;m++){
    html+=`<div class="card"><div class="row between" style="margin-bottom:8px">
      <b>Mois ${m}</b><span class="muted">${monthDone(m)}/${WEEKS*SESS.length} séances</span></div>`;
    for(let w=1;w<=WEEKS;w++){
      html+=`<div class="row between" style="padding:7px 0;border-bottom:1px solid var(--line)">
        <span class="muted">Semaine ${w}</span><div class="row" style="gap:6px">`;
      SESS.forEach(s=>{
        const d=sessionDone(m,w,s);
        html+=`<span class="daytag ${s}" style="opacity:${d?1:.35};cursor:pointer" onclick="jump(${m},${w},'${s}')">${s[0]}${d?'✓':''}</span>`;
      });
      html+=`</div></div>`;
    }
    html+=`</div>`;
  }
  html+=`</div>`;
  return html;
}
function monthDone(m){let c=0;for(let w=1;w<=WEEKS;w++)for(const s of SESS)if(sessionDone(m,w,s))c++;return c;}
function jump(m,w,s){ cur={m,w,s}; save(); go('train'); }

/* --- VUE STATS --- */
function viewStats(){
  const done=completedCount();
  const pct=Math.round(done/TOTAL_SESSIONS*100);
  let vol=0, totalSets=0;
  for(const k in DB.logs){ DB.logs[k].forEach(ex=>ex&&ex.forEach(s=>{if(s&&s.kg&&s.reps){vol+=(+s.kg)*(+s.reps);totalSets++;}}));}
  // volume par séance (somme kg×reps) pour les 12 dernières renseignées
  const series=[];
  for(let m=1;m<=MONTHS;m++)for(let w=1;w<=WEEKS;w++)for(const s of SESS){
    const lg=getLog(m,w,s); if(!lg)continue;
    let v=0;lg.forEach(ex=>ex&&ex.forEach(set=>{if(set&&set.kg&&set.reps)v+=(+set.kg)*(+set.reps);}));
    if(v>0) series.push({lbl:`M${m}S${w}·${s[0]}`,v});
  }
  const last=series.slice(-12);
  const max=Math.max(1,...last.map(x=>x.v));
  let bars=last.map(b=>`<div class="bar" style="height:${Math.max(3,b.v/max*100)}%"><span>${b.v>=1000?(b.v/1000).toFixed(1)+'k':b.v}</span></div>`).join('');
  let lbls=last.map(b=>`<div class="barlbl">${b.lbl}</div>`).join('');
  if(last.length===0){bars='';lbls='<div class="muted" style="text-align:center;padding:20px 0">Aucune donnée — commence une séance</div>';}

  return `<div class="wrap">
    <div class="grid2">
      <div class="stat"><div class="v" style="color:var(--blue)">${done}</div><div class="l">Séances / ${TOTAL_SESSIONS}</div></div>
      <div class="stat"><div class="v" style="color:var(--green)">${pct}%</div><div class="l">Programme</div></div>
      <div class="stat"><div class="v">${(vol/1000).toFixed(1)}k</div><div class="l">Volume total (kg)</div></div>
      <div class="stat"><div class="v">${totalSets}</div><div class="l">Séries faites</div></div>
    </div>
    <div class="card">
      <b>Progression du volume</b>
      <div class="muted" style="font-size:11px">kg × répétitions par séance (12 dernières)</div>
      <div class="bars">${bars}</div>
      <div style="display:flex;gap:4px">${lbls}</div>
    </div>
    <button class="btn ghost" style="width:100%" onclick="exportData()">⬇︎ Exporter mes données (JSON)</button>
    <div style="height:8px"></div>
    <button class="btn ghost" style="width:100%;color:var(--red)" onclick="resetAll()">Réinitialiser</button>
  </div>`;
}
function exportData(){
  const blob=new Blob([JSON.stringify(DB,null,2)],{type:"application/json"});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download="carnet_ppl_"+new Date().toISOString().slice(0,10)+".json";a.click();
  toast("Données exportées");
}
function resetAll(){
  if(confirm("Effacer toutes les données ?")){DB={logs:{},cur:null};save();cur={m:1,w:1,s:"PUSH"};render();toast("Réinitialisé");}
}

/* --- VUE CONSEILS --- */
function viewInfo(){
  return `<div class="wrap">
    <div class="card">
      <span class="pill">OBJECTIF</span>
      <div style="margin-top:10px;font-size:15px;font-weight:700">Masse musculaire</div>
      <div class="muted">Profil 70kg skinny-fat · Recomposition</div>
    </div>
    <div class="card">
      <b style="display:block;margin-bottom:10px">Conseils recomposition</b>
      <div class="adviceblk" style="margin-bottom:10px"><b>1. Surcharge progressive.</b> Note tes poids. Si tu as fait 10 reps à 15kg, vise 11 reps ou 16kg la semaine suivante.</div>
      <div class="adviceblk" style="margin-bottom:10px"><b>2. Protéines.</b> Indispensable pour ton profil. Vise <b>130 g/jour</b>.</div>
      <div class="adviceblk"><b>3. Repos.</b> Repose-toi du lundi au jeudi pour compenser le bloc intense du week-end.</div>
    </div>
    <div class="card">
      <b style="display:block;margin-bottom:8px">Règles du programme</b>
      <div class="muted" style="line-height:1.7">
      • 2 exercices max par muscle<br>
      • 3 séries par exercice<br>
      • Vendredi PUSH · Samedi PULL · Dimanche LEGS<br>
      • 6 mois × 4 semaines = 72 séances
      </div>
    </div>
    <div class="card">
      <b style="display:block;margin-bottom:8px">Vue d'ensemble</b>
      <div class="muted">PUSH : Pectoraux, Épaules, Triceps<br>
      PULL : Dos, Biceps<br>
      LEGS : Quadriceps, Ischios, Mollets</div>
    </div>
  </div>`;
}

/* init */
render();
if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(()=>{});}
