const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const NOTES_KEY = "tiny-evidence-notes-v1";

const PET_KEY="tiny-evidence-pet-v1";
let pet=JSON.parse(localStorage.getItem(PET_KEY)||'{"name":"小团","curiosity":0,"creativity":0,"vitality":0,"calm":0,"connection":0}');
let activeSuggestion=null;
const suggestionRewards={"看向远处":{curiosity:1,calm:1},"喝一口水":{vitality:2},"放松肩膀":{calm:2},"收拾五件东西":{vitality:1,creativity:1},"读一小段":{curiosity:2},"走动一会儿":{vitality:2},"做一件小而完整的事":{creativity:2},"接触一个感兴趣的内容":{curiosity:2},"整理一个小区域":{vitality:1,calm:1},"碰一下正在回避的事":{vitality:1,curiosity:1},"做一个不完美的小版本":{creativity:3},"表达一个简单需要":{connection:3}};
function savePet(){localStorage.setItem(PET_KEY,JSON.stringify(pet))}
function petDominantState(){const e=[["curious",pet.curiosity],["creative",pet.creativity],["active",pet.vitality],["calm",pet.calm],["connected",pet.connection]].sort((a,b)=>b[1]-a[1]);return e[0][1]===0?"calm":e[0][0]}
function updatePetVisual(){if(!$("#petNameDisplay"))return;$("#petNameDisplay").textContent=pet.name||"小团";const c=$("#petCharacter");c.className="pet-character";const s=petDominantState();c.classList.add(`pet-${s}`);$("#petStateText").textContent={curious:"它最近总爱歪着头观察周围。",creative:"桌边好像多了几张小小的涂鸦。",active:"它今天看起来很有精神。",calm:"它正在安静地看看窗外。",connected:"它一看到你，就悄悄靠近了一点。"}[s];const total=pet.curiosity+pet.creativity+pet.vitality+pet.calm+pet.connection;[["item-book",pet.curiosity>=4],["item-art",pet.creativity>=5],["item-ball",pet.vitality>=5],["item-lamp",pet.calm>=5],["item-letter",pet.connection>=5],["item-plant",total>=12]].forEach(([id,on])=>{const el=$(`#${id}`);if(el)el.hidden=!on})}
function addPetReward(r){Object.entries(r||{}).forEach(([k,v])=>{if(k in pet)pet[k]+=v});savePet();updatePetVisual();animatePetReward()}
function animatePetReward(){const p=$("#petCharacter");p.classList.add("pet-happy");setTimeout(()=>{p.classList.remove("pet-happy");updatePetVisual()},850);const b=$("#petSparkles");b.innerHTML="";for(let i=0;i<7;i++){const s=document.createElement("span");s.className="pet-spark";s.textContent=i%2?"✦":"•";s.style.left=`${40+Math.random()*24}%`;s.style.top=`${58+Math.random()*16}%`;s.style.animationDelay=`${Math.random()*.25}s`;b.appendChild(s)}setTimeout(()=>b.innerHTML="",1400)}

const THEME_KEY = "tiny-evidence-theme";
const MODE_KEY = "tiny-evidence-calendar-mode";

let notes = JSON.parse(localStorage.getItem(NOTES_KEY) || "[]");
let currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let noteFilter = "全部";
let suggestionTime = "1";
let breathingDuration = 60;
let breathingTimer = null;
let groundingStep = 0;

const typeColors = {
  "随手记": "#6f8fa5",
  "已经做过的事": "#739676",
  "一个想法": "#9a7fa5",
  "值得留下的瞬间": "#c09b63"
};

function migrateOldData() {
  if (notes.length) return;
  const old = JSON.parse(localStorage.getItem("tiny-evidence-records-v1") || "[]");
  if (!old.length) return;
  notes = old.map(r => ({
    id: r.id || String(Math.random()),
    createdAt: r.createdAt || Date.now(),
    text: r.action || "",
    mood: r.mood || "",
    type: r.category === "情绪照顾" ? "随手记" : "已经做过的事"
  }));
  saveNotes();
}
function saveNotes(){ localStorage.setItem(NOTES_KEY, JSON.stringify(notes)); }
function escapeHtml(v=""){ return v.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c])); }
function dateKey(v){ const d=new Date(v); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function formatDate(v){ return new Intl.DateTimeFormat("zh-CN",{year:"numeric",month:"long",day:"numeric",weekday:"short"}).format(new Date(v)); }
function showToast(text){ const t=$("#toast"); t.textContent=text; t.classList.add("show"); clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>t.classList.remove("show"),2200); }

function openDrawer(){
  $("#drawer").classList.add("open"); $("#drawer").setAttribute("aria-hidden","false");
  $("#menuButton").classList.add("open"); $("#menuButton").setAttribute("aria-expanded","true");
  document.body.style.overflow="hidden";
}
function closeDrawer(){
  $("#drawer").classList.remove("open"); $("#drawer").setAttribute("aria-hidden","true");
  $("#menuButton").classList.remove("open"); $("#menuButton").setAttribute("aria-expanded","false");
  document.body.style.overflow="";
}
function switchView(name){
  $$(".view").forEach(v=>v.classList.remove("active"));
  $$(".drawer-item").forEach(v=>v.classList.remove("active"));
  $(`#view-${name}`).classList.add("active");
  const item=$(`.drawer-item[data-view="${name}"]`); if(item)item.classList.add("active");
  if(name==="traces") renderTraces();
  if(name==="home") renderMemory();
  window.scrollTo({top:0,behavior:"smooth"});
}
$("#menuButton").addEventListener("click",()=>$("#drawer").classList.contains("open")?closeDrawer():openDrawer());
$$("[data-close-drawer]").forEach(x=>x.addEventListener("click",closeDrawer));
$(".drawer-nav").addEventListener("click",e=>{ const b=e.target.closest("[data-view]"); if(!b)return; switchView(b.dataset.view); closeDrawer(); });
$$("[data-go]").forEach(b=>b.addEventListener("click",()=>switchView(b.dataset.go)));

function renderMemory(){
  const card=$("#memoryCard");
  if(!notes.length || Math.random()>.65){ card.hidden=true; return; }
  const note=notes[Math.floor(Math.random()*notes.length)];
  $("#memoryText").textContent=note.text.length>90?note.text.slice(0,90)+"…":note.text;
  card.hidden=false;
  card.onclick=()=>{ switchView("traces"); };
}

$("#noteForm").addEventListener("submit",e=>{
  e.preventDefault();
  const text=$("#noteText").value.trim(); if(!text)return;
  notes.unshift({
    id: crypto.randomUUID?crypto.randomUUID():String(Date.now()),
    createdAt:Date.now(), text,
    mood:$("#noteMood").value,
    type:$("#noteType").value
  });
  saveNotes();
  const noteReward={"随手记":{calm:1},"已经做过的事":{vitality:1},"一个想法":{curiosity:1},"值得留下的瞬间":{connection:1}}[$("#noteType").value]||{calm:1};
  if($("#noteMood").value==="焦虑"||$("#noteMood").value==="烦躁")noteReward.calm=(noteReward.calm||0)+1;
  addPetReward(noteReward);
  e.target.hidden=true; $("#saveResult").hidden=false;
  showToast("已经放在这里。");
});
$("#writeAnotherButton").addEventListener("click",()=>{
  $("#noteForm").reset(); $("#noteForm").hidden=false; $("#saveResult").hidden=true; $("#noteText").focus();
});

function renderTraces(){
  renderCalendar(); renderCollection(); renderVisuals(); renderNotes();
}
function monthNotes(){
  return notes.filter(n=>{ const d=new Date(n.createdAt); return d.getFullYear()===currentMonth.getFullYear()&&d.getMonth()===currentMonth.getMonth(); });
}
function renderCalendar(){
  const mode=$("#calendarMode").value;
  $("#calendarSection").hidden=mode!=="calendar";
  $("#collectionGrid").hidden=mode!=="collection";
  if(mode==="hidden") return;

  $("#monthTitle").textContent=new Intl.DateTimeFormat("zh-CN",{year:"numeric",month:"long"}).format(currentMonth);
  const grid=$("#calendarGrid"); grid.innerHTML="";
  const first=new Date(currentMonth.getFullYear(),currentMonth.getMonth(),1);
  const offset=(first.getDay()+6)%7;
  for(let i=0;i<offset;i++){ const e=document.createElement("div"); e.className="day-cell empty"; grid.appendChild(e); }
  const days=new Date(currentMonth.getFullYear(),currentMonth.getMonth()+1,0).getDate();
  for(let day=1;day<=days;day++){
    const key=dateKey(new Date(currentMonth.getFullYear(),currentMonth.getMonth(),day,12));
    const list=notes.filter(n=>dateKey(n.createdAt)===key);
    const b=document.createElement("button");
    b.className=`day-cell ${list.length?"has-note":""}`;
    const dots=list.slice(0,6).map(n=>`<span class="trace-dot" style="background:${typeColors[n.type]||typeColors["随手记"]}"></span>`).join("");
    b.innerHTML=`<span class="day-number">${day}</span><span class="trace-dots">${dots}</span>`;
    if(list.length)b.addEventListener("click",()=>openDay(key,list));
    grid.appendChild(b);
  }
}
function renderCollection(){
  const grid=$("#collectionGrid"); grid.innerHTML="";
  const grouped={};
  notes.forEach(n=>(grouped[dateKey(n.createdAt)] ||= []).push(n));
  Object.entries(grouped).sort((a,b)=>b[0].localeCompare(a[0])).forEach(([key,list])=>{
    const d=document.createElement("button"); d.className="collection-day";
    d.innerHTML=`<b>${new Date(key+"T12:00:00").getMonth()+1}月${new Date(key+"T12:00:00").getDate()}日</b><span class="trace-dots">${list.slice(0,8).map(n=>`<span class="trace-dot" style="background:${typeColors[n.type]||typeColors["随手记"]}"></span>`).join("")}</span>`;
    d.addEventListener("click",()=>openDay(key,list)); grid.appendChild(d);
  });
}
function renderVisuals(){
  $("#noteTotal").textContent=notes.length;
  const types=Object.keys(typeColors), box=$("#typeBars"); box.innerHTML="";
  const max=Math.max(1,...types.map(t=>notes.filter(n=>n.type===t).length));
  types.forEach(t=>{
    const count=notes.filter(n=>n.type===t).length;
    const row=document.createElement("div"); row.className="type-row";
    row.innerHTML=`<div class="type-meta"><span>${t}</span><span>${count}</span></div><div class="bar-track"><div class="bar-fill" style="width:${count/max*100}%;background:${typeColors[t]}"></div></div>`;
    box.appendChild(row);
  });
  const moods=["轻松","平静","普通","烦躁","焦虑","低落"], cloud=$("#moodCloud"); cloud.innerHTML="";
  const present=moods.map(m=>[m,notes.filter(n=>n.mood===m).length]).filter(x=>x[1]);
  if(!present.length){ cloud.innerHTML='<span class="muted">没有记录心情也完全可以。</span>'; return; }
  present.forEach(([m,c])=>{ const s=document.createElement("span"); s.className="mood-chip"; s.textContent=`${m} · ${c}`; cloud.appendChild(s); });
}
function renderNotes(){
  const list=$("#notesList"), empty=$("#notesEmpty"); list.innerHTML="";
  const filtered=noteFilter==="全部"?notes:notes.filter(n=>n.type===noteFilter);
  empty.style.display=filtered.length?"none":"grid";
  filtered.forEach(n=>{
    const a=document.createElement("article"); a.className="note-card";
    a.innerHTML=`<div class="note-meta"><span>${formatDate(n.createdAt)}</span><span>${escapeHtml(n.type)}${n.mood?` · ${escapeHtml(n.mood)}`:""}</span></div><p class="note-body">${escapeHtml(n.text)}</p><button class="delete-note" data-id="${n.id}">删除</button>`;
    list.appendChild(a);
  });
}
function openDay(key,list){
  $("#dayModalDate").textContent=formatDate(key+"T12:00:00");
  const box=$("#dayModalList"); box.innerHTML="";
  list.forEach(n=>{ const a=document.createElement("article"); a.className="note-card"; a.innerHTML=`<div class="note-meta"><span>${escapeHtml(n.type)}</span><span>${escapeHtml(n.mood||"")}</span></div><p class="note-body">${escapeHtml(n.text)}</p>`; box.appendChild(a); });
  $("#dayModal").hidden=false;
}
$$("[data-close-day]").forEach(x=>x.addEventListener("click",()=>$("#dayModal").hidden=true));
$("#prevMonth").addEventListener("click",()=>{ currentMonth=new Date(currentMonth.getFullYear(),currentMonth.getMonth()-1,1); renderCalendar(); });
$("#nextMonth").addEventListener("click",()=>{ currentMonth=new Date(currentMonth.getFullYear(),currentMonth.getMonth()+1,1); renderCalendar(); });
$("#calendarMode").value=localStorage.getItem(MODE_KEY)||"calendar";
$("#calendarMode").addEventListener("change",e=>{localStorage.setItem(MODE_KEY,e.target.value);renderCalendar();renderCollection();});
$("#noteFilter").addEventListener("change",e=>{noteFilter=e.target.value;renderNotes();});
$("#notesList").addEventListener("click",e=>{
  const b=e.target.closest("[data-id]"); if(!b)return;
  if(!confirm("删除这条内容吗？"))return;
  notes=notes.filter(n=>n.id!==b.dataset.id); saveNotes(); renderTraces();
});

function showQuiet(name){
  $("#quietMenu").hidden=true; $$(".quiet-panel").forEach(p=>p.hidden=true);
  $(`#quiet-${name}`).hidden=false;
}
$(".quiet-menu").addEventListener("click",e=>{const b=e.target.closest("[data-quiet]");if(b)showQuiet(b.dataset.quiet);});
$$(".back-quiet").forEach(b=>b.addEventListener("click",()=>{stopBreathing();$$(".quiet-panel").forEach(p=>p.hidden=true);$("#quietMenu").hidden=false;}));

$$("[data-duration]").forEach(b=>b.addEventListener("click",()=>{
  $$("[data-duration]").forEach(x=>x.classList.remove("active")); b.classList.add("active"); breathingDuration=Number(b.dataset.duration);
}));
function stopBreathing(){
  clearInterval(breathingTimer); breathingTimer=null;
  $("#breathingCircle").className="breathing-circle"; $("#breathingText").textContent="准备好时开始"; $("#breathingButton").textContent="开始";
}
$("#breathingButton").addEventListener("click",()=>{
  if(breathingTimer){stopBreathing();return;}
  let remain=breathingDuration, inhale=true;
  const circle=$("#breathingCircle"), text=$("#breathingText");
  function tick(){
    circle.className=`breathing-circle ${inhale?"inhale":"exhale"}`;
    text.textContent=inhale?"慢慢吸气":"慢慢呼气";
    inhale=!inhale;
  }
  tick(); breathingTimer=setInterval(()=>{remain-=4;if(remain<=0){stopBreathing();text.textContent="可以继续停留，也可以离开";return;}tick();},4000);
  $("#breathingButton").textContent="停止";
});
$("#stopBreathingButton").addEventListener("click",stopBreathing);
$("#saveDumpButton").addEventListener("click",()=>{
  const text=$("#dumpText").value.trim(); if(!text){showToast("这里还没有内容。");return;}
  notes.unshift({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),createdAt:Date.now(),text,mood:"",type:"随手记"});
  saveNotes(); addPetReward({calm:2}); $("#dumpText").value=""; showToast("已经放在我的痕迹里。");
});
$("#clearDumpButton").addEventListener("click",()=>{$("#dumpText").value="";showToast("已经清空。");});

const grounding=[
  ["看看周围","找到 3 个你能看到的东西。不需要写下来。"],
  ["听一听","注意 2 个你现在能听到的声音。"],
  ["感受身体","注意 1 个身体正在接触到的表面。"]
];
$("#nextGroundingButton").addEventListener("click",()=>{
  groundingStep++;
  if(groundingStep>=grounding.length){$("#groundingTitle").textContent="练习到这里就可以了";$("#groundingText").textContent="现在可以继续停留，也可以离开。";$("#nextGroundingButton").hidden=true;}
  else{
    $("#groundingTitle").textContent=grounding[groundingStep][0];$("#groundingText").textContent=grounding[groundingStep][1];
    $$(".grounding-dots span").forEach((s,i)=>s.classList.toggle("active",i===groundingStep));
  }
});

const suggestions={
  "1":[["喝一口水","慢慢喝一口水，然后决定是否还想做别的。"],["看向远处","让视线离开屏幕，看看远处十秒钟。"],["放松肩膀","留意肩膀的位置，让它稍微松一点。"]],
  "5":[["收拾五件东西","只处理眼前的五件物品。"],["读一小段","随便找一段你愿意看的内容，五分钟后就可以停。"],["走动一会儿","离开座位走几分钟，不需要达到任何强度。"]],
  "15":[["做一件小而完整的事","选一件十五分钟内可以结束的小事。"],["接触一个感兴趣的内容","看、听或尝试一点你此刻真正有兴趣的东西。"],["整理一个小区域","只整理桌面、抽屉或文件夹中的一小部分。"]],
  "challenge":[["碰一下正在回避的事","只做它的第一个动作，之后可以停止。"],["做一个不完美的小版本","让某个想法形成一个可以保存的粗糙版本。"],["表达一个简单需要","向可信任的人清楚地说出一个小请求。"]]
};
function drawSuggestion(){
  const pool=suggestions[suggestionTime], pick=pool[Math.floor(Math.random()*pool.length)];
  activeSuggestion={title:pick[0],text:pick[1]};
  $("#suggestionTime").textContent=suggestionTime==="challenge"?"稍微挑战一下":`${suggestionTime} 分钟以内`;
  $("#suggestionTitle").textContent=pick[0];$("#suggestionText").textContent=pick[1];$("#suggestionComplete").hidden=true;$("#suggestionCard").hidden=false;
}
$(".suggestion-settings").addEventListener("click",e=>{const b=e.target.closest("[data-time]");if(!b)return;$$("[data-time]").forEach(x=>x.classList.remove("active"));b.classList.add("active");suggestionTime=b.dataset.time;});
$("#drawSuggestionButton").addEventListener("click",drawSuggestion);
$("#anotherSuggestionButton").addEventListener("click",drawSuggestion);
$("#shrinkSuggestionButton").addEventListener("click",()=>{
  $("#suggestionText").textContent="把它缩小到只做第一个动作，或者只花一分钟。之后可以停止。";
});

$("#exportButton").addEventListener("click",()=>{
  const json=JSON.stringify(notes,null,2);
  if(window.AndroidBridge&&typeof window.AndroidBridge.exportNotes==="function"){
    window.AndroidBridge.exportNotes(json);
    return;
  }
  const blob=new Blob([json],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=`tiny-evidence-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);
});
$("#clearButton").addEventListener("click",()=>{
  if(!notes.length)return;
  if(!confirm("确定清空全部内容吗？此操作无法撤销。"))return;
  notes=[];saveNotes();closeDrawer();renderTraces();renderMemory();showToast("内容已经清空。");
});


$("#petCharacter").addEventListener("click",()=>{animatePetReward();const m=["它轻轻蹭了蹭你的手。","它好像很高兴你来看它。","它眨了眨眼，安静地陪着你。","它把小翅膀靠近了一点。"];$("#petStateText").textContent=m[Math.floor(Math.random()*m.length)]});
$("#renamePetButton").addEventListener("click",()=>{$("#petNameInput").value=pet.name||"";$("#renameModal").hidden=false;setTimeout(()=>$("#petNameInput").focus(),50)});
$$("[data-close-rename]").forEach(x=>x.addEventListener("click",()=>$("#renameModal").hidden=true));
$("#renamePetForm").addEventListener("submit",e=>{e.preventDefault();const n=$("#petNameInput").value.trim();if(n)pet.name=n;savePet();updatePetVisual();$("#renameModal").hidden=true;showToast("名字已经保存。")});
$("#completeSuggestionButton").addEventListener("click",()=>{if(!activeSuggestion)return;addPetReward(suggestionRewards[activeSuggestion.title]||{calm:1});const f=["它看起来有点开心。","它好像精神了一点。","它悄悄做了一个新的小动作。","房间里的气氛似乎变得更亮了一点。"];$("#suggestionCompleteText").textContent=f[Math.floor(Math.random()*f.length)];$("#suggestionComplete").hidden=false;notes.unshift({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),createdAt:Date.now(),text:`完成了一个小建议：${activeSuggestion.title}`,mood:"",type:"已经做过的事"});saveNotes();showToast("完成了。")});

const savedTheme=localStorage.getItem(THEME_KEY);
if(savedTheme==="dark")document.body.classList.add("dark");
$("#themeButton").textContent=document.body.classList.contains("dark")?"☀":"☾";
$("#themeButton").addEventListener("click",()=>{
  document.body.classList.toggle("dark"); const dark=document.body.classList.contains("dark");
  localStorage.setItem(THEME_KEY,dark?"dark":"light");$("#themeButton").textContent=dark?"☀":"☾";
});

$("#dateLabel").textContent=new Intl.DateTimeFormat("zh-CN",{month:"long",day:"numeric",weekday:"long"}).format(new Date());
migrateOldData();
updatePetVisual();
renderMemory();
