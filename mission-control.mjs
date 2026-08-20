




const $=id=>document.getElementById(id),TEAM_NAMES=["ALPHA","BRAVO","CHARLIE","DELTA","ECHO","FOXTROT"];
let db,auth,user=null,priv=null,pub=null,states={};
const DEFAULT_PRIVATE={
 teams:{ALPHA:{pin:"3817"},BRAVO:{pin:"6042"},CHARLIE:{pin:"9153"},DELTA:{pin:"2478"},ECHO:{pin:"5361"},FOXTROT:{pin:"8294"}},
 cores:[
  {name:"NAVIGATION CORE",message:"Löst die physische Aufgabe vor Ort und gebt anschließend den Code ein."},
  {name:"LIFELINE CORE",message:"Arbeitet als Team und sichert den nächsten Zugangscode."},
  {name:"STABILITY CORE",message:"Die Systemstabilität ist kritisch. Löst die Aufgabe und übermittelt den Code."},
  {name:"BREACH CORE",message:"Absolviert die physische Mission und gebt anschließend den Code ein."},
  {name:"TRANSFER CORE",message:"Löst die Aufgabe an eurem Einsatzort und bestätigt den Code."},
  {name:"VELOCITY CORE",message:"Absolviert die finale physische Herausforderung."}
 ],
 routes:{ALPHA:[0,1,2,3,4,5],BRAVO:[1,2,3,4,5,0],CHARLIE:[2,3,4,5,0,1],DELTA:[3,4,5,0,1,2],ECHO:[4,5,0,1,2,3],FOXTROT:[5,0,1,2,3,4]},
 answers:{ALPHA:["1","32","12","25","6","8"],BRAVO:["1","32","12","25","6","8"],CHARLIE:["1","32","12","25","6","8"],DELTA:["1","32","12","25","6","8"],ECHO:["1","32","12","25","6","8"],FOXTROT:["1","32","12","25","6","8"]},
 fragments:{ALPHA:["N7","L4","S2","B9","T3","V5"],BRAVO:["N7","L4","S2","B9","T3","V5"],CHARLIE:["N7","L4","S2","B9","T3","V5"],DELTA:["N7","L4","S2","B9","T3","V5"],ECHO:["N7","L4","S2","B9","T3","V5"],FOXTROT:["N7","L4","S2","B9","T3","V5"]},
 finals:{ALPHA:"LIFE-A1",BRAVO:"LIFE-B2",CHARLIE:"LIFE-C3",DELTA:"LIFE-D4",ECHO:"LIFE-E5",FOXTROT:"LIFE-F6"}
};
function esc(s){return String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
async function sha(text){const data=new TextEncoder().encode(String(text));const digest=await crypto.subtle.digest("SHA-256",data);return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("")}
function emptyState(){return {started:false,step:0,done:[],fragments:[],hints:0,penalty:0,online:false,lastUpdate:0}}
async function makePublic(p){
 const teamPinHashes={},answerHashes={},finalHashes={};
 for(const n of TEAM_NAMES){teamPinHashes[n]=await sha(p.teams[n].pin);answerHashes[n]=[];for(const a of p.answers[n])answerHashes[n].push(await sha(String(a).toUpperCase()));finalHashes[n]=await sha(String(p.finals[n]).toUpperCase())}
 return {cores:p.cores,routes:p.routes,teamPinHashes,answerHashes,fragments:p.fragments,finalHashes};
}
async function boot(){
 try{
  if(!firebaseConfig.apiKey||firebaseConfig.apiKey.includes("HIER_"))throw new Error("Firebase-Konfiguration fehlt");
  const app=initializeApp(firebaseConfig);db=getDatabase(app);auth=getAuth(app);$("email").value=gameMasterEmail||"";
  onAuthStateChanged(auth,async u=>{
    user=u;
    if(!u){
      connected=false;
      $("login").classList.remove("hidden");
      $("dashboard").classList.add("hidden");
      $("net").textContent="READY FOR LOGIN";
      return;
    }
    const expectedEmail=String(gameMasterEmail||"").toLowerCase();
    const actualEmail=String(u.email||"").toLowerCase();
    if(u.isAnonymous || !actualEmail || actualEmail!==expectedEmail){
      connected=false;
      try{await signOut(auth)}catch(e){console.warn(e)}
      $("login").classList.remove("hidden");
      $("dashboard").classList.add("hidden");
      $("net").textContent="GAME MASTER LOGIN REQUIRED";
      return;
    }
    connect();
  });
  $("net").textContent="READY FOR LOGIN";
 }catch(e){$("net").textContent="ERROR";$("loginMsg").innerHTML='<div class="terminal red">'+esc(e.message)+'</div>'}
}
async function login(){
 try{await signInWithEmailAndPassword(auth,$("email").value.trim(),$("password").value)}catch(e){$("loginMsg").innerHTML='<div class="terminal red">LOGIN FAILED // '+esc(e.message)+'</div>'}
}
let connected=false;
async function connect(){
 const expectedEmail=String(gameMasterEmail||"").toLowerCase();
 const actualEmail=String(user?.email||"").toLowerCase();
 if(!user || user.isAnonymous || !actualEmail || actualEmail!==expectedEmail){
   connected=false;
   $("login").classList.remove("hidden");
   $("dashboard").classList.add("hidden");
   $("net").textContent="GAME MASTER LOGIN REQUIRED";
   return;
 }
 if(connected)return;
 connected=true;
 $("login").classList.add("hidden");
 $("dashboard").classList.remove("hidden");
 $("net").textContent="REALTIME CONNECTED";
 onValue(ref(db,"mission/privateConfig"),snap=>{priv=snap.val();if(!priv)renderInit();else render()});
 onValue(ref(db,"mission/publicConfig"),snap=>{pub=snap.val();render()});
 onValue(ref(db,"mission/teams"),snap=>{states=snap.val()||{};render()});
}
function renderInit(){$("dashboard").innerHTML='<div class="card hero"><div class="title">&gt;&gt; FIRST START</div><p class="muted">Noch keine Mission vorhanden.</p><button id="initBtn" class="primary" type="button">INITIALIZE MISSION</button></div>';$("initBtn").onclick=initializeMission}
async function initializeMission(){
 const p=JSON.parse(JSON.stringify(DEFAULT_PRIVATE)),publicCfg=await makePublic(p),teamStates={};TEAM_NAMES.forEach(n=>teamStates[n]=emptyState());
 await set(ref(db,"mission/privateConfig"),p);await set(ref(db,"mission/publicConfig"),publicCfg);await set(ref(db,"mission/teams"),teamStates);
}
function st(n){return states[n]||emptyState()} function route(n){return priv?.routes?.[n]||[0,1,2,3,4,5]} function idx(n){const s=st(n),r=route(n);return s.step<r.length?r[s.step]:null}
function render(){
 if(!priv)return;
 const online=TEAM_NAMES.filter(n=>st(n).online).length;
 $("dashboard").innerHTML=`${online===6?'<div class="card hero global-online"><div class="title">&gt;&gt; GLOBAL LIFELINE RESTORED</div><div class="big">6 / 6 ONLINE</div><p class="online">MISSION COMPLETE</p></div>':""}
 <div class="card hero"><div class="title">LIVE MISSION CONTROL</div><div class="terminal">FIELD UNITS ONLINE: ${online} / 6</div></div>
 <div class="grid" style="margin-top:14px">${TEAM_NAMES.map(n=>{const s=st(n),i=idx(n),c=i===null?null:priv.cores[i];return `<div class="card ${s.online?"online-card":""}"><div class="row"><div class="title">${n}</div><div style="flex:0"><span class="live-dot ${s.online?"on":""}"></span></div></div><div class="${s.online?"online":"muted"}" style="font-size:20px;font-weight:900;margin:8px 0">${s.online?"ONLINE":s.started?"ACTIVE":"OFFLINE"}</div><p><b>${s.step}/6</b> • ${c?esc(c.name):"FINAL ACCESS"}</p><div class="progress"><div style="width:${s.step/6*100}%"></div></div><p class="small muted">Hints: ${s.hints||0} • Penalty: ${s.penalty||0} min</p><div class="row"><button data-next="${n}" type="button">FORCE NEXT</button><button data-reset="${n}" class="danger" type="button">RESET TEAM</button></div></div>`}).join("")}</div>
 <div class="card" style="margin-top:14px"><div class="title">TEAM ACCESS CODES</div>${TEAM_NAMES.map(n=>`<div class="core"><b>${n}</b><input id="pin_${n}" maxlength="4" value="${esc(priv.teams[n].pin)}"></div>`).join("")}<button id="savePins">SAVE TEAM CODES</button></div>
 <div class="card" style="margin-top:14px"><div class="title">WECHSELMATRIX</div><div style="overflow:auto"><table class="matrix-table"><thead><tr><th>TEAM</th>${[1,2,3,4,5,6].map(i=>`<th>POS ${i}</th>`).join("")}</tr></thead><tbody>${TEAM_NAMES.map(n=>`<tr><th>${n}</th>${priv.routes[n].map((v,p)=>`<td><select id="r_${n}_${p}">${priv.cores.map((c,i)=>`<option value="${i}" ${i===v?"selected":""}>${esc(c.name)}</option>`).join("")}</select></td>`).join("")}</tr>`).join("")}</tbody></table></div><button id="saveRoutes">SAVE WECHSELMATRIX</button></div>
 <div class="card" style="margin-top:14px"><div class="title">TEAM-SPECIFIC SOLUTIONS</div><div style="overflow:auto"><table class="matrix-table"><thead><tr><th>TEAM</th>${priv.cores.map(c=>`<th>${esc(c.name)}</th>`).join("")}</tr></thead><tbody>${TEAM_NAMES.map(n=>`<tr><th>${n}</th>${priv.answers[n].map((v,i)=>`<td><input id="a_${n}_${i}" value="${esc(v)}"></td>`).join("")}</tr>`).join("")}</tbody></table></div><button id="saveAnswers">SAVE SOLUTIONS</button></div>
 <div class="card" style="margin-top:14px"><div class="title">TEAM-SPECIFIC FRAGMENTS</div><div style="overflow:auto"><table class="matrix-table"><thead><tr><th>TEAM</th>${priv.cores.map(c=>`<th>${esc(c.name)}</th>`).join("")}</tr></thead><tbody>${TEAM_NAMES.map(n=>`<tr><th>${n}</th>${priv.fragments[n].map((v,i)=>`<td><input id="f_${n}_${i}" value="${esc(v)}"></td>`).join("")}</tr>`).join("")}</tbody></table></div><button id="saveFragments">SAVE FRAGMENTS</button></div>
 <div class="card" style="margin-top:14px"><div class="title">FINAL LIFELINE CODES</div>${TEAM_NAMES.map(n=>`<div class="core"><b>${n}</b><input id="fin_${n}" value="${esc(priv.finals[n])}"></div>`).join("")}<button id="saveFinals">SAVE FINAL CODES</button></div>
 <div class="card" style="margin-top:14px"><div class="title">CORE MESSAGES</div>${priv.cores.map((c,i)=>`<div class="core"><b>CORE ${i+1}</b><label>Name</label><input id="cn_${i}" value="${esc(c.name)}"><label>System Message</label><textarea id="cm_${i}">${esc(c.message)}</textarea></div>`).join("")}<button id="saveCores">SAVE CORE MESSAGES</button></div>
 <div class="card" style="margin-top:14px"><div class="row"><button id="resetAll" class="danger">RESET ALL TEAM STATES</button><button id="logout">LOGOUT</button></div></div>`;
 document.querySelectorAll("[data-next]").forEach(b=>b.onclick=()=>forceNext(b.dataset.next));document.querySelectorAll("[data-reset]").forEach(b=>b.onclick=()=>resetTeam(b.dataset.reset));
 $("savePins").onclick=savePins;$("saveRoutes").onclick=saveRoutes;$("saveAnswers").onclick=saveAnswers;$("saveFragments").onclick=saveFragments;$("saveFinals").onclick=saveFinals;$("saveCores").onclick=saveCores;$("resetAll").onclick=resetAll;$("logout").onclick=async()=>{connected=false;await signOut(auth);};
}
async function syncPrivate(p){priv=p;const pubCfg=await makePublic(p);await set(ref(db,"mission/privateConfig"),p);await set(ref(db,"mission/publicConfig"),pubCfg)}
async function savePins(){const p=JSON.parse(JSON.stringify(priv)),vals=TEAM_NAMES.map(n=>$("pin_"+n).value.trim());if(vals.some(v=>!/^[0-9]{4}$/.test(v))||new Set(vals).size!==6){alert("Codes müssen eindeutig und vierstellig sein.");return}TEAM_NAMES.forEach((n,i)=>p.teams[n].pin=vals[i]);await syncPrivate(p)}
async function saveRoutes(){const p=JSON.parse(JSON.stringify(priv));for(const n of TEAM_NAMES){const a=[0,1,2,3,4,5].map(i=>Number($("r_"+n+"_"+i).value));if(new Set(a).size!==6){alert("Jeder Core muss genau einmal vorkommen.");return}p.routes[n]=a}await syncPrivate(p)}
async function saveAnswers(){const p=JSON.parse(JSON.stringify(priv));TEAM_NAMES.forEach(n=>p.answers[n]=p.cores.map((_,i)=>$("a_"+n+"_"+i).value.trim()));await syncPrivate(p)}
async function saveFragments(){const p=JSON.parse(JSON.stringify(priv));TEAM_NAMES.forEach(n=>p.fragments[n]=p.cores.map((_,i)=>$("f_"+n+"_"+i).value.trim()));await syncPrivate(p)}
async function saveFinals(){const p=JSON.parse(JSON.stringify(priv));TEAM_NAMES.forEach(n=>p.finals[n]=$("fin_"+n).value.trim());await syncPrivate(p)}
async function saveCores(){const p=JSON.parse(JSON.stringify(priv));p.cores=p.cores.map((c,i)=>({name:$("cn_"+i).value.trim(),message:$("cm_"+i).value.trim()}));await syncPrivate(p)}
async function forceNext(n){const s=st(n),i=idx(n);if(i===null)return;const done=[...(s.done||[])];if(!done.includes(i))done.push(i);await update(ref(db,"mission/teams/"+n),{done,fragments:[...(s.fragments||[]),priv.fragments[n][i]],step:s.step+1,lastUpdate:serverTimestamp()})}
async function resetTeam(n){if(confirm("Team "+n+" zurücksetzen?"))await set(ref(db,"mission/teams/"+n),emptyState())}
async function resetAll(){if(!confirm("Alle Teamstände zurücksetzen?"))return;const all={};TEAM_NAMES.forEach(n=>all[n]=emptyState());await set(ref(db,"mission/teams"),all)}
$("loginBtn").onclick=login;$("password").addEventListener("keydown",e=>{if(e.key==="Enter")login()});function tick(){$("clock").textContent=new Date().toLocaleTimeString("de-DE")}tick();setInterval(tick,1000);

function startMatrix(){
 const c=document.getElementById("matrix"),x=c.getContext("2d"),chars="01アイウエオABCDEFGHIJKLMNOPQRSTUVWXYZ#$%",size=15;let drops=[];
 function resize(){c.width=innerWidth;c.height=innerHeight;drops=Array(Math.max(1,Math.floor(c.width/size))).fill(1)}
 resize();addEventListener("resize",resize);
 function f(){x.fillStyle="rgba(1,3,1,.10)";x.fillRect(0,0,c.width,c.height);x.fillStyle="#00ff66";x.font=size+"px monospace";drops.forEach((y,i)=>{x.fillText(chars[Math.floor(Math.random()*chars.length)],i*size,y*size);if(y*size>c.height&&Math.random()>.975)drops[i]=0;drops[i]++});requestAnimationFrame(f)}f()
}

startMatrix();boot();
