




const $=id=>document.getElementById(id), TEAM_NAMES=["ALPHA","BRAVO","CHARLIE","DELTA","ECHO","FOXTROT"];
let db,auth,cfg=null,team=sessionStorage.getItem("lifelineTeamV91")||null,state=null,unsubTeam=null;
function esc(s){return String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
async function sha(text){const data=new TextEncoder().encode(String(text));const digest=await crypto.subtle.digest("SHA-256",data);return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("")}
function route(){return cfg.routes[team]} function currentIdx(){return state.step<route().length?route()[state.step]:null}
async function boot(){
 try{
  if(!firebaseConfig.apiKey||firebaseConfig.apiKey.includes("HIER_"))throw new Error("Firebase-Konfiguration fehlt");
  const app=initializeApp(firebaseConfig);db=getDatabase(app);auth=getAuth(app);
  onAuthStateChanged(auth,u=>{if(u)connectConfig()});
  await signInAnonymously(auth);
 }catch(e){$("net").textContent="ERROR";$("net").style.color="#ff7083";$("loginMsg").innerHTML='<div class="terminal red">'+esc(e.message)+'</div>'}
}
let configStarted=false;
function connectConfig(){
 if(configStarted)return;configStarted=true;
 onValue(ref(db,"mission/publicConfig"),snap=>{cfg=snap.val();if(cfg){$("net").textContent="REALTIME CONNECTED";if(team)connectTeam();}else {$("net").textContent="WAITING FOR GAME MASTER"}});
}
async function login(){
 if(!cfg){$("loginMsg").innerHTML='<div class="terminal warnc">Mission noch nicht initialisiert.</div>';return}
 const entered=await sha($("teamPin").value.trim());
 const found=TEAM_NAMES.find(n=>cfg.teamPinHashes[n]===entered);
 if(!found){$("loginMsg").innerHTML='<div class="terminal red">ACCESS DENIED</div>';return}
 team=found;sessionStorage.setItem("lifelineTeamV91",team);$("loginCard").classList.add("hidden");
 await update(ref(db,"mission/teams/"+team),{started:true,lastUpdate:serverTimestamp()});
 connectTeam();
}
function connectTeam(){
 if(!team||!cfg)return;
 $("loginCard").classList.add("hidden");
 if(unsubTeam)unsubTeam();
 unsubTeam=onValue(ref(db,"mission/teams/"+team),snap=>{state=snap.val()||{started:true,step:0,done:[],fragments:[],hints:0,penalty:0,online:false};render()});
}
function render(){
 if(!state||!cfg)return;
 if(state.online){$("game").classList.remove("hidden");$("game").innerHTML=`<div class="card hero online-card"><div class="title">&gt;&gt; LIFELINE NODE</div><div class="big">ONLINE</div><div class="terminal">FIELD UNIT: ${team}
MISSION STATUS: SUCCESS</div></div>`;return}
 const r=route();
 if(state.step>=r.length){$("game").classList.remove("hidden");$("game").innerHTML=`<div class="card hero"><div class="title">&gt;&gt; FINAL LIFELINE ACCESS</div><p class="muted">Nutzt eure gesammelten Fragmente und bestimmt das Lifeline-Passwort.</p><div class="terminal">${(state.fragments||[]).map((f,i)=>`${i+1}. ${esc(f)}`).join("\n")}</div><label>LIFELINE PASSWORT</label><input id="finalInput" placeholder="Passwort eingeben"><button id="finalBtn" class="primary" type="button">VERIFY LIFELINE PASSWORD</button><div id="feedback"></div></div>`;$("finalBtn").onclick=verifyFinal;return}
 const idx=currentIdx(),c=cfg.cores[idx];
 $("game").classList.remove("hidden");$("game").innerHTML=`<div class="card hero"><div class="small muted">FIELD UNIT // ${team}</div><div class="big">${state.step}/6</div><div class="progress"><div style="width:${state.step/6*100}%"></div></div></div><div class="card" style="margin-top:14px"><div class="title">${esc(c.name)}</div><div class="terminal">${esc(c.message)}</div><label>CODE FROM PHYSICAL STATION</label><input id="answerInput" placeholder="Code eingeben"><div class="row"><button id="answerBtn" class="primary" type="button">VERIFY ACCESS</button><button id="hintBtn" type="button">REQUEST HINT</button></div><div id="feedback"></div></div>`;
 $("answerBtn").onclick=verifyAnswer;$("hintBtn").onclick=requestHint;
}
async function verifyAnswer(){
 const idx=currentIdx(),entered=await sha($("answerInput").value.trim().toUpperCase()),expected=cfg.answerHashes[team][idx];
 if(entered!==expected){$("feedback").innerHTML='<div class="terminal red">ACCESS DENIED</div>';await update(ref(db,"mission/teams/"+team),{penalty:(state.penalty||0)+2,lastUpdate:serverTimestamp()});return}
 const fragment=cfg.fragments[team][idx],done=[...(state.done||[])];if(!done.includes(idx))done.push(idx);const fragments=[...(state.fragments||[]),fragment];
 await update(ref(db,"mission/teams/"+team),{done,fragments,step:state.step+1,lastUpdate:serverTimestamp()});
 showFragment(fragment);
}
function showFragment(fragment){$("game").innerHTML=`<div class="card hero"><div class="title">&gt;&gt; SYSTEM FRAGMENT RECOVERED</div><div class="terminal" style="text-align:center"><div class="big">${esc(fragment)}</div>SAVE THIS FRAGMENT FOR FINAL ACCESS</div><button id="continueBtn" class="primary" type="button">CONTINUE MISSION</button></div>`;$("continueBtn").onclick=render}
async function requestHint(){await update(ref(db,"mission/teams/"+team),{hints:(state.hints||0)+1,lastUpdate:serverTimestamp()});$("feedback").innerHTML='<div class="terminal warnc">MISSION CONTROL INFORMED</div>'}
async function verifyFinal(){
 const entered=await sha($("finalInput").value.trim().toUpperCase());
 if(entered!==cfg.finalHashes[team]){$("feedback").innerHTML='<div class="terminal red">LIFELINE PASSWORD INVALID</div>';return}
 await update(ref(db,"mission/teams/"+team),{online:true,lastUpdate:serverTimestamp()});
}
$("loginBtn").onclick=login;$("teamPin").addEventListener("keydown",e=>{if(e.key==="Enter")login()});
function tick(){$("clock").textContent=new Date().toLocaleTimeString("de-DE")}tick();setInterval(tick,1000);

function startMatrix(){
 const c=document.getElementById("matrix"),x=c.getContext("2d"),chars="01アイウエオABCDEFGHIJKLMNOPQRSTUVWXYZ#$%",size=15;let drops=[];
 function resize(){c.width=innerWidth;c.height=innerHeight;drops=Array(Math.max(1,Math.floor(c.width/size))).fill(1)}
 resize();addEventListener("resize",resize);
 function f(){x.fillStyle="rgba(1,3,1,.10)";x.fillRect(0,0,c.width,c.height);x.fillStyle="#00ff66";x.font=size+"px monospace";drops.forEach((y,i)=>{x.fillText(chars[Math.floor(Math.random()*chars.length)],i*size,y*size);if(y*size>c.height&&Math.random()>.975)drops[i]=0;drops[i]++});requestAnimationFrame(f)}f()
}

startMatrix();boot();
