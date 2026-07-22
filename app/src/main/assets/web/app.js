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
const SHARE_KEY = "tiny-evidence-shares-v1";
const PENDING_KEY = "tiny-evidence-pending-v1";
const BURNS_KEY = "tiny-evidence-burns-v1";
const SLEEP_KEY = "tiny-evidence-sleep-v1";

let notes = JSON.parse(localStorage.getItem(NOTES_KEY) || "[]");
let shares = JSON.parse(localStorage.getItem(SHARE_KEY) || "[]");
let pendingItems = JSON.parse(localStorage.getItem(PENDING_KEY) || "[]");
let burnsRecords = JSON.parse(localStorage.getItem(BURNS_KEY) || "[]");
let activeBurnsTaskId = null;
let feelingScore = null;
let pendingCompletionContext = null;
let sleepRecords = JSON.parse(localStorage.getItem(SLEEP_KEY) || "[]");
let currentSleepMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
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
function launchConfetti(){const layer=$("#confettiLayer");if(!layer)return;layer.innerHTML="";const colors=["#e9bd56","#7fa38a","#8fa7bd","#b48fb7","#d99891"];for(let i=0;i<42;i++){const p=document.createElement("span");p.className="confetti-piece";p.style.left=`${Math.random()*100}%`;p.style.background=colors[Math.floor(Math.random()*colors.length)];p.style.animationDelay=`${Math.random()*.22}s`;p.style.setProperty("--drift",`${(Math.random()-.5)*240}px`);p.style.setProperty("--spin",`${(Math.random()>.5?1:-1)*(360+Math.random()*720)}deg`);layer.appendChild(p)}setTimeout(()=>layer.innerHTML="",1900)}

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
  if(name==="pending") renderPending();
  if(name==="sleep") renderSleepPage();
  if(name==="home") renderMemory();
  window.scrollTo({top:0,behavior:"smooth"});
}
$("#menuButton").addEventListener("click",()=>$("#drawer").classList.contains("open")?closeDrawer():openDrawer());
$$("[data-close-drawer]").forEach(x=>x.addEventListener("click",closeDrawer));
$("#drawer").addEventListener("click",e=>{ const b=e.target.closest("[data-view]"); if(!b)return; switchView(b.dataset.view); closeDrawer(); });
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


function saveShares(){localStorage.setItem(SHARE_KEY,JSON.stringify(shares))}
function savePending(){localStorage.setItem(PENDING_KEY,JSON.stringify(pendingItems))}
function saveBurns(){localStorage.setItem(BURNS_KEY,JSON.stringify(burnsRecords))}

$("#shareForm").addEventListener("submit",e=>{
  e.preventDefault();
  const text=$("#shareText").value.trim(); if(!text)return;
  const item={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),createdAt:Date.now(),text,time:$("#shareTime").value,direction:$("#shareDirection").value,mood:$("#shareMood").value,calendar:$("#shareCalendar").value};
  shares.unshift(item); saveShares();
  if(item.calendar==="yes"){
    notes.unshift({id:item.id,createdAt:item.createdAt,text:`想分享的一件事：${item.text}${item.time?`（${item.time}）`:""}${item.direction?` · ${item.direction}`:""}`,mood:item.mood,type:"值得留下的瞬间"});
    saveNotes();
  }
  const rewardMap={"学习":{curiosity:2},"创作":{creativity:2},"工作":{vitality:1},"生活整理":{vitality:1,calm:1},"身体照顾":{vitality:2},"情绪照顾":{calm:2},"人际联系":{connection:2},"兴趣探索":{curiosity:2},"其他":{calm:1}};
  addPetReward(rewardMap[item.direction]||{connection:1});
  e.target.hidden=true;$("#shareResult").hidden=false;
});
$("#shareAnotherButton").addEventListener("click",()=>{$("#shareForm").reset();$("#shareForm").hidden=false;$("#shareResult").hidden=true;$("#shareText").focus()});

function importanceLabel(v){return ({1:"低",2:"中",3:"高",4:"非常重要"})[v]||"中"}
function pendingUrgency(item){
  if(item.status==="已完成")return -999;
  let score=Number(item.importance||1)*100;
  if(item.deadline){
    const diff=(new Date(item.deadline)-Date.now())/86400000;
    if(diff<0)score+=1000; else if(diff<=1)score+=700; else if(diff<=7)score+=400; else if(diff<=14)score+=200;
  }
  return score;
}
function formatDeadline(v){
  if(!v)return"暂无截止时间";
  const d=new Date(v),diff=(d-Date.now())/86400000;
  if(diff<0)return"截止时间已过去";
  if(diff<1)return"今天";
  if(diff<2)return"明天";
  if(diff<=7)return"这周内";
  return new Intl.DateTimeFormat("zh-CN",{month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(d);
}
function renderPending(){
  const box=$("#pendingList"),empty=$("#pendingEmpty"); box.innerHTML="";
  let list=pendingItems.filter(item=>item.status!=="已完成"), sort=$("#pendingSort").value;
  if(sort==="smart")list.sort((a,b)=>pendingUrgency(b)-pendingUrgency(a));
  if(sort==="deadline")list.sort((a,b)=>(a.deadline?new Date(a.deadline):Infinity)-(b.deadline?new Date(b.deadline):Infinity));
  if(sort==="importance")list.sort((a,b)=>b.importance-a.importance);
  if(sort==="created")list.sort((a,b)=>b.createdAt-a.createdAt);
  empty.style.display=list.length?"none":"grid";
  list.forEach(item=>{
    const c=document.createElement("article"); c.className="pending-card";
    const overdue=item.deadline&&new Date(item.deadline)<new Date()&&item.status!=="已完成";
    c.innerHTML=`<div class="pending-top"><div><h3>${escapeHtml(item.title)}</h3><p class="muted">${escapeHtml(item.notes||"")}</p></div><button class="text-link" data-edit-pending="${item.id}">编辑</button></div>
      <div class="pending-tags"><span class="tag">${importanceLabel(item.importance)}</span><span class="tag ${overdue?"deadline-overdue":""}">${formatDeadline(item.deadline)}</span><span class="tag">${escapeHtml(item.status)}</span></div>
      <div class="pending-actions">
        <button class="start" data-complete-pending="${item.id}">${item.status==="已完成"?"已完成":"标记完成"}</button>
        <button class="burns" data-burns="${item.id}">${item.burnsSetup?"查看反拖延症表":"使用反拖延症表"}</button>
        <button class="ghost" data-delete-pending="${item.id}">删除</button>
      </div>`;
    box.appendChild(c);
  });
}
$("#pendingSort").addEventListener("change",renderPending);
$("#newPendingButton").addEventListener("click",()=>openPendingModal());
function openPendingModal(item=null){
  $("#pendingId").value=item?.id||""; $("#pendingModalTitle").textContent=item?"编辑待处理的事":"添加一件待处理的事";
  $("#pendingTitleInput").value=item?.title||""; $("#pendingImportance").value=item?.importance||2; $("#pendingDeadline").value=item?.deadline||""; $("#pendingStatus").value=item?.status||"还没开始"; $("#pendingNotes").value=item?.notes||""; $("#pendingUseBurns").checked=!!item?.useBurns;
  $("#pendingModal").hidden=false;
}
$$("[data-close-pending]").forEach(x=>x.addEventListener("click",()=>$("#pendingModal").hidden=true));
$("#pendingForm").addEventListener("submit",e=>{
  e.preventDefault();
  const id=$("#pendingId").value;
  const item={id:id||(crypto.randomUUID?crypto.randomUUID():String(Date.now())),createdAt:id?(pendingItems.find(x=>x.id===id)?.createdAt||Date.now()):Date.now(),title:$("#pendingTitleInput").value.trim(),importance:Number($("#pendingImportance").value),deadline:$("#pendingDeadline").value,status:$("#pendingStatus").value,notes:$("#pendingNotes").value.trim(),useBurns:$("#pendingUseBurns").checked};
  if(id)pendingItems=pendingItems.map(x=>x.id===id?item:x); else pendingItems.unshift(item);
  savePending(); $("#pendingModal").hidden=true; renderPending();
  if(item.useBurns&&!id)openBurns(item.id);
});
$("#pendingList").addEventListener("click",e=>{
  const edit=e.target.closest("[data-edit-pending]"); if(edit){openPendingModal(pendingItems.find(x=>x.id===edit.dataset.editPending));return}
  const del=e.target.closest("[data-delete-pending]"); if(del&&confirm("删除这件事吗？")){pendingItems=pendingItems.filter(x=>x.id!==del.dataset.deletePending);savePending();renderPending();return}
  const done=e.target.closest("[data-complete-pending]"); if(done){
    const item=pendingItems.find(x=>x.id===done.dataset.completePending); if(!item||item.status==="已完成")return;
    item.status="已完成"; item.completedAt=Date.now(); savePending();
    notes.unshift({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),createdAt:Date.now(),text:`完成了待处理的事情：${item.title}`,mood:"",type:"已经做过的事"}); saveNotes(); addPetReward({vitality:2,calm:1}); launchConfetti(); renderPending(); showToast("这件事完成了。"); return;
  }
  const burns=e.target.closest("[data-burns]"); if(burns)openBurns(burns.dataset.burns);
});
function setBurnsStep(name){$$(".burns-step").forEach(x=>x.classList.toggle("active",x.dataset.step===name))}
function openBurns(id){activeBurnsTaskId=id;const item=pendingItems.find(x=>x.id===id);if(!item)return;$("#burnsTaskTitle").textContent=item.title||"反拖延症表";if(item.burnsSetup){$("#savedTinyStep").textContent=item.burnsSetup.tinyStep;$("#savedPredDifficulty").textContent=`${item.burnsSetup.predDifficulty}%`;$("#savedPredSatisfaction").textContent=`${item.burnsSetup.predSatisfaction}%`;$("#actualDifficulty").value=50;$("#actualSatisfaction").value=50;$("#actualDifficultyValue").textContent=50;$("#actualSatisfactionValue").textContent=50;$("#burnsActualTime").value="";setBurnsStep("result")}else{$("#burnsTinyStep").value="";$("#predDifficulty").value=50;$("#predSatisfaction").value=50;$("#predDifficultyValue").textContent=50;$("#predSatisfactionValue").textContent=50;setBurnsStep("setup")}$("#burnsModal").hidden=false}
$$("[data-close-burns]").forEach(x=>x.addEventListener("click",()=>$("#burnsModal").hidden=true));
[["predDifficulty","predDifficultyValue"],["predSatisfaction","predSatisfactionValue"],["actualDifficulty","actualDifficultyValue"],["actualSatisfaction","actualSatisfactionValue"]].forEach(([a,b])=>$("#"+a).addEventListener("input",e=>$("#"+b).textContent=e.target.value));
$("#burnsStartButton").addEventListener("click",e=>{e.preventDefault();const t=$("#burnsTinyStep").value.trim();if(!t){showToast("先写下一个启动小步骤。");return}$("#confirmTinyStep").textContent=t;$("#confirmPredDifficulty").textContent=`${$("#predDifficulty").value}%`;$("#confirmPredSatisfaction").textContent=`${$("#predSatisfaction").value}%`;setBurnsStep("confirm")});
$("#backToBurnsSetupButton").addEventListener("click",()=>setBurnsStep("setup"));
$("#confirmBurnsStartButton").addEventListener("click",()=>{const item=pendingItems.find(x=>x.id===activeBurnsTaskId);if(!item)return;item.burnsSetup={tinyStep:$("#burnsTinyStep").value.trim(),predDifficulty:Number($("#predDifficulty").value),predSatisfaction:Number($("#predSatisfaction").value),startedAt:Date.now()};if(item.status==="还没开始")item.status="已经开始一点";savePending();$("#burnsModal").hidden=true;renderPending();showToast("启动小步骤已经保存。")});
$("#burnsCompleteTaskButton").addEventListener("click",()=>{const item=pendingItems.find(x=>x.id===activeBurnsTaskId);if(!item||!item.burnsSetup)return;pendingCompletionContext={taskId:item.id,title:item.title,tinyStep:item.burnsSetup.tinyStep,predDifficulty:item.burnsSetup.predDifficulty,predSatisfaction:item.burnsSetup.predSatisfaction,actualDifficulty:Number($("#actualDifficulty").value),actualSatisfaction:Number($("#actualSatisfaction").value),actualTime:$("#burnsActualTime").value.trim()};feelingScore=null;$$("#emojiRating button").forEach(x=>x.classList.remove("selected"));$("#lowFeelingBox").hidden=true;$("#feelingNote").value="";$("#feelingModal").hidden=false});
$("#emojiRating").addEventListener("click",e=>{const b=e.target.closest("[data-score]");if(!b)return;feelingScore=Number(b.dataset.score);$$("#emojiRating button").forEach(x=>x.classList.toggle("selected",x===b));$("#lowFeelingBox").hidden=feelingScore>2});
function finishBurns(skip=false){if(!pendingCompletionContext)return;const item=pendingItems.find(x=>x.id===pendingCompletionContext.taskId);if(!item)return;const rec={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),taskId:item.id,taskTitle:item.title,createdAt:Date.now(),tinyStep:pendingCompletionContext.tinyStep,predDifficulty:pendingCompletionContext.predDifficulty,predSatisfaction:pendingCompletionContext.predSatisfaction,actualDifficulty:pendingCompletionContext.actualDifficulty,actualSatisfaction:pendingCompletionContext.actualSatisfaction,actualTime:pendingCompletionContext.actualTime,feelingScore:skip?null:feelingScore,feelingNote:skip?"":$("#feelingNote").value.trim()};burnsRecords.unshift(rec);item.status="已完成";item.completedAt=Date.now();item.burnsRecordId=rec.id;saveBurns();savePending();notes.unshift({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),createdAt:Date.now(),text:`完成了待处理的事情：${item.title}`,mood:"",type:"已经做过的事",pendingTaskId:item.id,burnsRecordId:rec.id});saveNotes();addPetReward({calm:2,vitality:2});$("#feelingModal").hidden=true;$("#burnsModal").hidden=true;pendingCompletionContext=null;launchConfetti();renderPending();showToast("这件事完成了。")}
$("#saveFeelingButton").addEventListener("click",()=>finishBurns(false));$("#skipFeelingButton").addEventListener("click",()=>finishBurns(true));

function saveSleepRecords(){localStorage.setItem(SLEEP_KEY,JSON.stringify(sleepRecords))}
function todayKey(){return dateKey(Date.now())}
function todayTraceItems(){const key=todayKey();return notes.filter(n=>dateKey(n.createdAt)===key).slice(0,8)}
function renderTodaySummary(){const box=$("#todaySummary");if(!box)return;const list=todayTraceItems();box.innerHTML="";if(!list.length){box.innerHTML='<div class="today-summary-empty">今天还没有正式记录。可以补充一件已经发生的小事。</div>';return}list.forEach(item=>{const div=document.createElement("div");div.className="today-summary-item";div.textContent=item.text;box.appendChild(div)})}
function sleepRecordForToday(type){return sleepRecords.find(r=>r.date===todayKey()&&r.type===type)}
function setSleepScene(mode){const card=$("#sleepSceneCard"),win=$("#sleepWindow");if(!card||!win)return;card.classList.remove("awake","asleep");win.classList.remove("awake","asleep");if(mode){card.classList.add(mode);win.classList.add(mode)}$("#sleepSceneText").textContent=mode==="awake"?"窗帘已经拉开。小团和你一起醒来了。":mode==="asleep"?"灯已经关好，小团盖着毯子休息了。":"小团正在房间里等你。"}
function renderSleepPage(){renderTodaySummary();renderSleepCalendar();if(sleepRecordForToday("evening"))setSleepScene("asleep");else if(sleepRecordForToday("morning"))setSleepScene("awake");else setSleepScene("");const isAndroid=typeof AndroidBridge!=="undefined"&&typeof AndroidBridge.saveReminderSettings==="function";$("#mobileReminderCard").hidden=!isAndroid;if(isAndroid){try{const saved=JSON.parse(AndroidBridge.getReminderSettings()||"{}");$("#morningReminderTime").value=saved.morningTime||"07:30";$("#eveningReminderTime").value=saved.eveningTime||"23:30";$("#morningReminderEnabled").checked=!!saved.morningEnabled;$("#eveningReminderEnabled").checked=!!saved.eveningEnabled}catch(e){}}}
$("#addEndDayThingButton").addEventListener("click",()=>{const text=$("#endDayTinyThing").value.trim();if(!text){showToast("先写下一件小事。");return}notes.unshift({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),createdAt:Date.now(),text,mood:"",type:"随手记"});saveNotes();$("#endDayTinyThing").value="";addPetReward({connection:1,calm:1});renderTodaySummary();showToast("已经加到今天。")});
$("#wakePetButton").addEventListener("click",()=>{if(!sleepRecordForToday("morning")){sleepRecords.unshift({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),date:todayKey(),createdAt:Date.now(),type:"morning"});notes.unshift({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),createdAt:Date.now(),text:"☀ 我起床了，和小团一起拉开了窗帘。",mood:"",type:"值得留下的瞬间"});saveSleepRecords();saveNotes();addPetReward({vitality:2})}setSleepScene("awake");renderSleepCalendar();launchConfetti();showToast("早上好。")});
$("#endDayButton").addEventListener("click",()=>{if(!sleepRecordForToday("evening")){const note=$("#endDayNote").value.trim();sleepRecords.unshift({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),date:todayKey(),createdAt:Date.now(),type:"evening",note});notes.unshift({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),createdAt:Date.now(),text:`☾ 今天可以结束了。${note?` ${note}`:""}`,mood:"",type:"值得留下的瞬间"});saveSleepRecords();saveNotes();addPetReward({calm:2,connection:1})}setSleepScene("asleep");renderSleepCalendar();showToast("今天到这里就可以了。")});
$("#notYetButton").addEventListener("click",()=>showToast("可以等你准备好。"));
$("#prevSleepMonth").addEventListener("click",()=>{currentSleepMonth=new Date(currentSleepMonth.getFullYear(),currentSleepMonth.getMonth()-1,1);renderSleepCalendar()});$("#nextSleepMonth").addEventListener("click",()=>{currentSleepMonth=new Date(currentSleepMonth.getFullYear(),currentSleepMonth.getMonth()+1,1);renderSleepCalendar()});
function renderSleepCalendar(){const grid=$("#sleepCalendarGrid");if(!grid)return;$("#sleepMonthTitle").textContent=new Intl.DateTimeFormat("zh-CN",{year:"numeric",month:"long"}).format(currentSleepMonth);grid.innerHTML="";const first=new Date(currentSleepMonth.getFullYear(),currentSleepMonth.getMonth(),1);const offset=(first.getDay()+6)%7;for(let i=0;i<offset;i++){const e=document.createElement("div");e.className="day-cell empty";grid.appendChild(e)}const days=new Date(currentSleepMonth.getFullYear(),currentSleepMonth.getMonth()+1,0).getDate();for(let day=1;day<=days;day++){const key=dateKey(new Date(currentSleepMonth.getFullYear(),currentSleepMonth.getMonth(),day,12));const dayRecords=sleepRecords.filter(r=>r.date===key);const cell=document.createElement("div");cell.className=`day-cell ${dayRecords.length?"has-note":""}`;const icons=[dayRecords.some(r=>r.type==="morning")?"☀":"",dayRecords.some(r=>r.type==="evening")?"☾":""].filter(Boolean).join("");cell.innerHTML=`<span class="day-number">${day}</span><span class="sleep-day-icons">${icons}</span>`;grid.appendChild(cell)}}
$("#saveReminderSettingsButton").addEventListener("click",()=>{if(typeof AndroidBridge==="undefined"||typeof AndroidBridge.saveReminderSettings!=="function")return;const settings={morningTime:$("#morningReminderTime").value||"07:30",eveningTime:$("#eveningReminderTime").value||"23:30",morningEnabled:$("#morningReminderEnabled").checked,eveningEnabled:$("#eveningReminderEnabled").checked};AndroidBridge.saveReminderSettings(JSON.stringify(settings));$("#reminderStatusText").textContent="提醒设置已经保存。";showToast("提醒设置已经保存。")});
window.openSleepInteraction=function(mode){switchView("sleep");setTimeout(()=>{if(mode==="morning"){$("#sleepSceneText").textContent="小团醒了。请拉开窗帘。";$("#wakePetButton").focus()}else{renderTodaySummary();$("#sleepSceneText").textContent="小团准备休息了。请帮它关灯并盖好毯子。";$("#endDayButton").focus()}},120)};

function buildBackup(){return{version:"1.4",exportedAt:new Date().toISOString(),notes,shares,pendingItems,burnsRecords,sleepRecords,pet,settings:{theme:localStorage.getItem(THEME_KEY),calendarMode:localStorage.getItem(MODE_KEY)}}}
$("#exportFullButton").addEventListener("click",()=>{
  const blob=new Blob([JSON.stringify(buildBackup(),null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=`tiny-evidence-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);
});
async function readImport(){const f=$("#importFile").files[0];if(!f){showToast("请先选择备份文件。");return null}try{return JSON.parse(await f.text())}catch{showToast("这个文件无法读取。");return null}}
function mergeById(a=[],b=[]){const map=new Map(a.map(x=>[x.id,x]));b.forEach(x=>{if(!map.has(x.id))map.set(x.id,x)});return[...map.values()]}
$("#mergeImportButton").addEventListener("click",async()=>{const d=await readImport();if(!d)return;notes=mergeById(notes,d.notes);shares=mergeById(shares,d.shares);pendingItems=mergeById(pendingItems,d.pendingItems);burnsRecords=mergeById(burnsRecords,d.burnsRecords);sleepRecords=mergeById(sleepRecords,d.sleepRecords);if(d.pet){for(const k of ["curiosity","creativity","vitality","calm","connection"])pet[k]=Math.max(pet[k]||0,d.pet[k]||0);if(!pet.name&&d.pet.name)pet.name=d.pet.name}saveNotes();saveShares();savePending();saveBurns();saveSleepRecords();savePet();updatePetVisual();showToast("已经合并导入。")});
$("#replaceImportButton").addEventListener("click",async()=>{const d=await readImport();if(!d)return;if(!confirm("当前设备中的内容将被替换。此操作无法撤销。"))return;notes=d.notes||[];shares=d.shares||[];pendingItems=d.pendingItems||[];burnsRecords=d.burnsRecords||[];sleepRecords=d.sleepRecords||[];pet=d.pet||pet;saveNotes();saveShares();savePending();saveBurns();saveSleepRecords();savePet();updatePetVisual();showToast("已经替换并恢复。")});


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
    const record=n.burnsRecordId?burnsRecords.find(r=>r.id===n.burnsRecordId):null; a.innerHTML=`<div class="note-meta"><span>${formatDate(n.createdAt)}</span><span>${escapeHtml(n.type)}${n.mood?` · ${escapeHtml(n.mood)}`:""}</span></div><p class="note-body">${escapeHtml(n.text)}</p>${burnsDetailHtml(record)}<button class="delete-note" data-id="${n.id}">删除</button>`;
    list.appendChild(a);
  });
}
function feelingEmoji(score){return({1:"😣",2:"😕",3:"😐",4:"🙂",5:"😄"})[score]||""}
function burnsDetailHtml(record){if(!record)return"";return `<div class="burns-comparison-detail"><p class="eyebrow">反拖延记录</p><p><b>启动小步骤：</b>${escapeHtml(record.tinyStep||"")}</p><div class="comparison-grid"><div class="comparison-item"><small>困难程度</small><h3>${record.predDifficulty}% → ${record.actualDifficulty}%</h3></div><div class="comparison-item"><small>满意程度</small><h3>${record.predSatisfaction}% → ${record.actualSatisfaction}%</h3></div></div>${record.actualTime?`<p><b>实际投入时间：</b>${escapeHtml(record.actualTime)}</p>`:""}${record.feelingScore?`<div class="burns-feeling-line"><b>完成后的感受：</b><span>${feelingEmoji(record.feelingScore)}</span></div>`:""}${record.feelingNote?`<p class="burns-feeling-note">${escapeHtml(record.feelingNote)}</p>`:""}</div>`}
function openDay(key,list){
  $("#dayModalDate").textContent=formatDate(key+"T12:00:00");
  const box=$("#dayModalList"); box.innerHTML="";
  list.forEach(n=>{ const a=document.createElement("article"); a.className="note-card"; const record=n.burnsRecordId?burnsRecords.find(r=>r.id===n.burnsRecordId):null; a.innerHTML=`<div class="note-meta"><span>${escapeHtml(n.type)}</span><span>${escapeHtml(n.mood||"")}</span></div><p class="note-body">${escapeHtml(n.text)}</p>${burnsDetailHtml(record)}`; box.appendChild(a); });
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

$("#clearButton").addEventListener("click",()=>{
  if(!notes.length)return;
  if(!confirm("确定清空全部内容吗？此操作无法撤销。"))return;
  notes=[];shares=[];pendingItems=[];burnsRecords=[];sleepRecords=[];saveNotes();saveShares();savePending();saveBurns();saveSleepRecords();closeDrawer();renderTraces();renderPending();renderMemory();showToast("内容已经清空。");
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
