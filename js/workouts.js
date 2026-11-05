/* =========================================================
   WORKOUTS — splits as flashcards, a weekly planner, one sheet per day
   Two kinds of record:
     · the PLAN, one per split: seven days, each with a label, a rest flag
       and its movements (name, sets, reps). It repeats every week.
     · a SESSION, one per calendar day, created the moment a day gets a
       note or a workout is started: per-set weight / reps / done, the
       notes, and whether the day was marked completed.
   Next week the plan is back with nothing ticked; the weight you used
   last time for the same movement name is offered as the starting point.
   ========================================================= */
import {db} from './db.js';
import {$,esc,toast,onOpen,openSheet,closeSheets,lcd,dayKey,todayKey,fromKey,shiftDay,fmtDay,pad} from './ui.js';

const DAYS=[['MONDAY','MON'],['TUESDAY','TUE'],['WEDNESDAY','WED'],['THURSDAY','THU'],['FRIDAY','FRI'],['SATURDAY','SAT'],['SUNDAY','SUN']];
const PRESETS=[                                                 // null = rest day, '' = blank
  {id:'ul',   name:'UPPER / LOWER',                      days:['UPPER','LOWER',null,'UPPER','LOWER',null,null]},
  {id:'ppl',  name:'PUSH / PULL / LEGS',                 days:['PUSH','PULL','LEGS','PUSH','PULL','LEGS',null]},
  {id:'bro',  name:'BRO SPLIT',                          days:['CHEST','BACK','SHOULDERS','ARMS','LEGS',null,null]},
  {id:'full', name:'FULL BODY',                          days:['FULL BODY',null,'FULL BODY',null,'FULL BODY',null,null]},
  {id:'ulppl',name:'UPPER / LOWER / PUSH / PULL / LEGS', days:['UPPER','LOWER',null,'PUSH','PULL','LEGS',null]},
  {id:'custom',name:'CUSTOM',                            days:['','','','','','','']},
];
const mondayOf=k=>{const d=fromKey(k);d.setDate(d.getDate()-((d.getDay()+6)%7));return dayKey(d);};

let splits=[],front=0,flipped=false,viewMonday=mondayOf(todayKey()),sessions={},open=null;   // open = {date, i} of the day sheet
const active=()=>splits[front];
const weekDates=()=>Array.from({length:7},(_,i)=>shiftDay(viewMonday,i));

export async function initWorkouts(){
  await seed();
  splits=await db.all('workoutSplits');
  splits.sort((a,b)=>PRESETS.findIndex(p=>p.id===a.id)-PRESETS.findIndex(p=>p.id===b.id));
  front=Math.max(0,splits.findIndex(s=>s.id===db.setting('activeSplit','ppl')));
  wire();renderDeck();await loadWeek();
  onOpen('workouts',loadWeek);
}
async function seed(){                                          // the six splits, once; labels and rest days from the presets
  if(await db.get('meta','workoutsSeeded'))return;
  for(const p of PRESETS)if(!(await db.get('workoutSplits',p.id)))
    await db.put('workoutSplits',{id:p.id,name:p.name,days:p.days.map(l=>({label:l||'',rest:l===null,movements:[]}))});
  await db.put('meta',{key:'workoutsSeeded',value:1});
}
const saveSplit=()=>db.put('workoutSplits',active());
const saveSession=s=>db.put('workoutSessions',s);

/* ---------- the flashcard deck ---------- */
function renderDeck(){
  const deck=$('#deck');deck.innerHTML='';
  splits.forEach((s,k)=>{
    const pos=(k-front+splits.length)%splits.length;             // 0 = front card
    const c=document.createElement('div');
    c.className='fc '+(pos===0?'f0'+(flipped?' flipped':''):pos===1?'f1':pos===2?'f2':'hid');c.style.zIndex=10-pos;
    const training=s.days.filter(d=>!d.rest).length,planned=s.days.filter(d=>!d.rest&&d.movements.length).length;
    c.innerHTML=`<div class="face front"><div class="top"></div><div class="name">${esc(s.name)}</div><div class="pattern">${training} TRAINING DAYS · ${7-training} REST · ${planned} PLANNED</div><div class="tag">${pos===0?'ACTIVE SPLIT':''}</div></div>
      <div class="face back"><div class="top"></div><div class="pattern">${s.days.map((d,i)=>`${DAYS[i][1]} ${d.rest?'REST':(esc(d.label)||'—')}`).join(' · ')}</div><div class="tag">TAP TO FLIP BACK</div></div>`;
    deck.append(c);
  });
}
function setFront(k){front=(k+splits.length)%splits.length;flipped=false;db.setSetting('activeSplit',active().id);renderDeck();renderWeek();}

/* ---------- the week ---------- */
async function loadWeek(){
  sessions={};
  for(const d of weekDates()){const s=await db.get('workoutSessions',d);if(s)sessions[d]=s;}
  renderWeek();
}
const fmtSets=m=>Array.isArray(m.sets)?`${m.sets.filter(x=>x.done).length}/${m.sets.length} × ${m.sets[0]?.reps??''}`:`${m.sets} × ${m.reps}`;
function renderWeek(){
  const today=todayKey();
  $('#wkLcd').innerHTML=`<div class="lcd m l14"><span class="ghost">~~~~~~~</span><span class="val">WEEK OF</span></div>&nbsp;${lcd(fmtDay(viewMonday).date,'m')}`;
  $('#wkThis').hidden=viewMonday===mondayOf(today);
  const sp=active(),host=$('#week');host.innerHTML='';
  weekDates().forEach((d,i)=>{
    const plan=sp.days[i],ses=sessions[d],done=!!ses?.completed,moves=ses?.movements||plan.movements,md=fromKey(d);
    const col=document.createElement('div');
    col.className='wd'+(d===today?' today':'')+(done?' done':'')+(plan.rest?' rest':'');col.dataset.i=i;
    col.innerHTML=`<div class="wd-head"><div class="dn"><span class="long">${DAYS[i][0]}</span><span class="short">${DAYS[i][1]}</span></div><div class="dt">${pad(md.getMonth()+1)}.${pad(md.getDate())}</div><div class="lbl">${plan.rest?'REST DAY':esc(plan.label)}</div></div>
      <div class="wd-body" data-open="${i}">${plan.rest&&!moves.length?'<div class="rest">REST</div>':moves.length?moves.map(m=>`<div class="mv${Array.isArray(m.sets)&&m.sets.length&&m.sets.every(x=>x.done)?' done':''}"><span>${esc(m.name)}</span><em>${fmtSets(m)}</em></div>`).join(''):'<div class="empty">NOTHING PLANNED<br>TAP ADD +</div>'}</div>
      <div class="wd-foot"><button class="btn" data-add="${i}">ADD +</button><button class="btn" data-rest="${i}">${plan.rest?'UNSET REST':'SET REST DAY'}</button></div>
      ${done?'<div class="tape"><div>COMPLETED</div></div>':''}`;
    host.append(col);
  });
}
async function toggleRest(i){const d=active().days[i];d.rest=!d.rest;await saveSplit();renderDeck();renderWeek();toast(d.rest?`<i>${DAYS[i][0]}</i> IS A REST DAY`:`<i>${DAYS[i][0]}</i> IS A TRAINING DAY`);}

/* ---------- one day ---------- */
function openDay(i,focusAdd=false){
  open={date:shiftDay(viewMonday,i),i};
  renderDay();openSheet('daySheet');
  if(focusAdd)setTimeout(()=>$('#mvName')?.focus(),80);
}
const modeOf=ses=>ses?.completed?'done':ses?.started?'workout':'plan';
const addRow=()=>`<div class="mrow add"><input class="field" id="mvName" placeholder="MOVEMENT" maxlength="40" autocomplete="off"><input class="field num" id="mvSets" type="number" inputmode="numeric" min="1" max="20" value="3" title="sets"><input class="field num" id="mvReps" type="number" inputmode="numeric" min="1" max="100" value="10" title="reps"><button class="btn sm primary" id="mvAdd">ADD +</button></div>`;
function renderDay(){
  const {date:d,i}=open,plan=active().days[i],ses=sessions[d],mode=modeOf(ses);
  $('#dayTitle').innerHTML=`${DAYS[i][0]} ${fmtDay(d).date} <span>${plan.rest?'REST DAY':esc(plan.label)||'UNLABELLED'}${mode==='done'?' · COMPLETED':mode==='workout'?' · IN PROGRESS':''}</span>`;
  $('#dayMode').textContent=mode==='plan'?'PLAN · SETS AND REPS · WEIGHT COMES WITH THE WORKOUT':mode==='workout'?'WORKOUT · TICK EACH SET · WEIGHT, REPS AND SETS ARE EDITABLE':'COMPLETED · NOTES STAY EDITABLE';
  const host=$('#dayMoves');
  if(mode==='plan'){
    host.innerHTML=(plan.movements.length?`<div class="mrow head"><span class="sn">MOVEMENT</span><span class="sn">SETS</span><span class="sn">REPS</span><span></span></div>`:'')
      +plan.movements.map((m,k)=>`<div class="mrow" data-k="${k}"><input class="field" data-f="name" value="${esc(m.name)}" maxlength="40"><input class="field num" data-f="sets" type="number" inputmode="numeric" min="1" max="20" value="${m.sets}"><input class="field num" data-f="reps" type="number" inputmode="numeric" min="1" max="100" value="${m.reps}"><button class="btn sm danger" data-del="${k}">✕</button></div>`).join('')
      +addRow();
  }else{
    const ro=mode==='done'?' disabled':'';
    host.innerHTML=ses.movements.map((m,k)=>`<div class="mblock" data-k="${k}"><div class="mname"><span>${esc(m.name)}</span><span class="mstat">${m.sets.filter(x=>x.done).length} / ${m.sets.length} SETS</span></div>
      ${m.sets.map((s,j)=>`<div class="srow"><span class="sn">SET ${j+1}</span><input class="field num" data-f="weight" data-j="${j}" type="number" inputmode="decimal" min="0" step="any" value="${s.weight??''}" placeholder="LB"${ro}><span class="x">LB ×</span><input class="field num" data-f="reps" data-j="${j}" type="number" inputmode="numeric" min="0" max="100" value="${s.reps}"${ro}><span></span><button class="tick${s.done?' on':''}" data-tick="${j}" title="done"${ro}>${s.done?'✓':''}</button></div>`).join('')}
      ${mode==='workout'?`<div class="mtools"><button class="btn sm" data-setadd="${k}">+ SET</button><button class="btn sm" data-setdel="${k}">− SET</button></div>`:''}</div>`).join('')
      +(ses.movements.length?'':'<div class="note">NO MOVEMENTS IN THIS WORKOUT.</div>')+(mode==='workout'?addRow():'');
  }
  const notes=ses?.notes||[];
  $('#dayNotes').innerHTML=notes.length?notes.map((n,k)=>`<div class="nrow"><input class="field" data-n="${k}" value="${esc(n.text)}" maxlength="200" placeholder="NOTE"><button class="btn sm danger" data-ndel="${k}">✕</button></div>`).join(''):'<div class="note">NO NOTES YET.</div>';
  $('#dayStart').hidden=mode!=='plan'||!plan.movements.length;
  $('#dayComplete').hidden=mode!=='workout';
  $('#dayUnmark').hidden=mode!=='done';
}
async function ensureSession(){
  const {date:d,i}=open;
  if(!sessions[d]){sessions[d]={date:d,splitId:active().id,dayIndex:i,label:active().days[i].label,started:null,completed:false,completedAt:null,movements:null,notes:[]};await saveSession(sessions[d]);}
  return sessions[d];
}
/* the weight used last time for this movement name, set by set (most recent day first) */
function lastWeight(all,name,j,before){
  const n=name.trim().toLowerCase();
  for(const s of all.filter(s=>s.date<before&&s.movements).sort((a,b)=>a.date<b.date?1:-1)){
    const m=s.movements.find(x=>x.name.trim().toLowerCase()===n);
    if(m){const w=m.sets[j]?.weight??m.sets.find(x=>x.weight!=null)?.weight;if(w!=null)return w;}
  }
  return null;
}
async function startWorkout(){
  const {date:d,i}=open,plan=active().days[i],ses=await ensureSession(),all=await db.all('workoutSessions');
  ses.movements=plan.movements.map(m=>({name:m.name,sets:Array.from({length:m.sets},(_,j)=>({weight:lastWeight(all,m.name,j,d),reps:m.reps,done:false}))}));
  ses.started=Date.now();await saveSession(ses);renderDay();renderWeek();toast('WORKOUT STARTED · <i>TICK EACH SET AS YOU GO</i>');
}
async function addMovement(){
  const name=$('#mvName').value.trim(),sets=Math.max(1,Math.min(20,+$('#mvSets').value||3)),reps=Math.max(1,Math.min(100,+$('#mvReps').value||10));
  if(!name){toast('TYPE THE MOVEMENT FIRST');$('#mvName').focus();return;}
  const {date:d,i}=open,plan=active().days[i];
  plan.movements.push({id:'m-'+Date.now().toString(36),name,sets,reps});await saveSplit();
  const ses=sessions[d];
  if(ses?.started&&!ses.completed){const all=await db.all('workoutSessions');ses.movements.push({name,sets:Array.from({length:sets},(_,j)=>({weight:lastWeight(all,name,j,d),reps,done:false}))});await saveSession(ses);}
  renderDay();renderDeck();renderWeek();setTimeout(()=>$('#mvName')?.focus(),30);
}
function ask(q,yes,no){
  const a=$('#ask');$('#askQ').textContent=q;a.classList.add('show');
  $('#askYes').onclick=()=>{a.classList.remove('show');yes();};
  $('#askNo').onclick=()=>{a.classList.remove('show');no?.();};
}
function markCompleted(){
  const ses=sessions[open.date];
  const left=ses.movements.map(m=>({m,n:m.sets.filter(x=>!x.done).length})).filter(x=>x.n);
  ask('ARE YOU FINISHED?',()=>{
    if(!left.length)return finish(ses);
    ask('SOME ITEMS ARE NOT MARKED OFF, LEAVE IN NOTES AS UNCOMPLETED?',()=>{
      for(const {m,n} of left)ses.notes.push({ts:Date.now(),text:`${m.name}: ${n} of ${m.sets.length} sets left (${m.sets.filter(x=>!x.done).map(x=>x.reps).join('/')} reps)`,auto:true});
      finish(ses);
    });
  });
}
async function finish(ses){ses.completed=true;ses.completedAt=Date.now();await saveSession(ses);closeSheets();renderWeek();toast(`<i>${DAYS[open.i][0]}</i> COMPLETED`);}
async function unmark(){const ses=sessions[open.date];ses.completed=false;ses.completedAt=null;await saveSession(ses);renderDay();renderWeek();toast('DAY REOPENED');}

/* ---------- wiring ---------- */
function wire(){
  $('#wkTabs').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;$('#wkTabs').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    $('#wkSplit').hidden=b.dataset.tab!=='split';$('#wkForm').hidden=b.dataset.tab!=='form';$('#wkNav').style.visibility=b.dataset.tab==='split'?'':'hidden';});
  $('#wkPrev').onclick=()=>{viewMonday=shiftDay(viewMonday,-7);loadWeek();};
  $('#wkNext').onclick=()=>{viewMonday=shiftDay(viewMonday,7);loadWeek();};
  $('#wkThis').onclick=()=>{viewMonday=mondayOf(todayKey());loadWeek();};
  // deck: arrows, swipe, tap to flip
  $('#deckPrev').onclick=()=>setFront(front-1);$('#deckNext').onclick=()=>setFront(front+1);
  const deck=$('#deck');let dx0=null;
  deck.addEventListener('pointerdown',e=>{dx0=e.clientX;deck.setPointerCapture(e.pointerId);});
  deck.addEventListener('pointerup',e=>{if(dx0==null)return;const dx=e.clientX-dx0;dx0=null;
    if(dx<-40)setFront(front+1);else if(dx>40)setFront(front-1);else{flipped=!flipped;renderDeck();}});
  deck.addEventListener('pointercancel',()=>{dx0=null;});
  // week columns
  $('#week').addEventListener('click',e=>{
    const add=e.target.closest('[data-add]'),rest=e.target.closest('[data-rest]'),body=e.target.closest('[data-open]');
    if(add)openDay(+add.dataset.add,true);else if(rest)toggleRest(+rest.dataset.rest);else if(body)openDay(+body.dataset.open);
  });
  // day sheet: movements
  const moves=$('#dayMoves');
  moves.addEventListener('change',async e=>{
    const inp=e.target;if(!inp.dataset.f)return;
    const {date:d,i}=open,ses=sessions[d];
    if(modeOf(ses)==='plan'){const k=+inp.closest('.mrow').dataset.k,m=active().days[i].movements[k];
      if(inp.dataset.f==='name')m.name=inp.value.trim()||m.name;else m[inp.dataset.f]=Math.max(1,+inp.value||1);await saveSplit();}
    else{const k=+inp.closest('.mblock').dataset.k,j=+inp.dataset.j,s=ses.movements[k].sets[j];
      if(inp.dataset.f==='weight')s.weight=inp.value===''?null:+inp.value;else s.reps=Math.max(0,+inp.value||0);await saveSession(ses);}
    renderWeek();
  });
  moves.addEventListener('click',async e=>{
    const b=e.target.closest('button');if(!b)return;
    const {date:d,i}=open,plan=active().days[i],ses=sessions[d];
    if(b.id==='mvAdd')return addMovement();
    if(b.dataset.del!=null){plan.movements.splice(+b.dataset.del,1);await saveSplit();renderDay();renderDeck();renderWeek();return;}
    if(b.dataset.tick!=null){const s=ses.movements[+b.closest('.mblock').dataset.k].sets[+b.dataset.tick];s.done=!s.done;await saveSession(ses);renderDay();renderWeek();return;}
    if(b.dataset.setadd!=null){const m=ses.movements[+b.dataset.setadd],last=m.sets[m.sets.length-1];m.sets.push({weight:last?.weight??null,reps:last?.reps??10,done:false});await saveSession(ses);renderDay();renderWeek();return;}
    if(b.dataset.setdel!=null){const m=ses.movements[+b.dataset.setdel];if(m.sets.length>1)m.sets.pop();await saveSession(ses);renderDay();renderWeek();}
  });
  moves.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.closest('.mrow.add')){e.preventDefault();addMovement();}});
  // day sheet: notes
  const notes=$('#dayNotes');
  notes.addEventListener('change',async e=>{const k=e.target.dataset.n;if(k==null)return;const ses=sessions[open.date];ses.notes[+k].text=e.target.value;await saveSession(ses);});
  notes.addEventListener('click',async e=>{const b=e.target.closest('[data-ndel]');if(!b)return;const ses=sessions[open.date];ses.notes.splice(+b.dataset.ndel,1);await saveSession(ses);renderDay();});
  $('#dayAddNote').onclick=async()=>{const ses=await ensureSession();ses.notes.push({ts:Date.now(),text:''});await saveSession(ses);renderDay();const last=notes.querySelectorAll('[data-n]');last[last.length-1]?.focus();};
  $('#dayStart').onclick=startWorkout;
  $('#dayComplete').onclick=markCompleted;
  $('#dayUnmark').onclick=unmark;
}
