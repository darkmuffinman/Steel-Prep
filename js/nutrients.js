/* =========================================================
   NUTRIENTS — bars, targets, food catalog, daily log, water, caffeine
   How it fits together:
     · the day on screen (viewDay) is loaded from the database into `day`
     · totals() adds up that day's rows; updateBars() paints the 34 bars from it
     · every change is written to the database first, then the screen re-renders
   Units: foods are stored per 100 g; a log row stores the grams it came to and a
   snapshot of its nutrients, so later edits to a food never rewrite history.
   ========================================================= */
import {db} from './db.js';
import {$,lcd,toast,esc,onOpen,openSheet,closeSheets,todayKey,fromKey,shiftDay,fmtDay,fmtTime} from './ui.js';
import {NUTRIENTS,GROUP_LABEL,FOOD_KEYS,byKey,derive,defaultTargets} from './data/nutrient-defs.js';
import {PRELOAD_FOODS,CAFFEINE_DEFAULTS} from './data/foods-preload.js';

const G_PER={g:1,oz:28.3495,lb:453.592,floz:29.5735};          // grams in one unit; a fl oz is counted at water density
const UNIT_LABEL={g:'G',oz:'OZ',lb:'LB',serving:'SERVING',floz:'FL OZ'};
const LOG_STORE={food:'foodLog',water:'waterLog',caffeine:'caffeineLog'};

let foods=[],sources=[],targets={};
let viewDay=todayKey(),lastToday=viewDay;
const day={food:[],water:[],caffeine:[]};                       // the rows of the day on screen
const barEls={};

export async function initNutrients(){
  await seed();
  foods=await db.all('foods');
  sources=await db.all('caffeineSources');
  loadTargets();
  buildBars();
  buildFoodForm();
  wire();
  await setDay(viewDay);
  onOpen('nutrients',checkMidnight);
  setInterval(checkMidnight,15000);
}

/* first run: the preloaded foods and the two caffeine sources, once */
async function seed(){
  if(await db.get('meta','seeded'))return;
  for(const f of PRELOAD_FOODS)if(!(await db.get('foods',f.id)))await db.put('foods',{...f,per100g:{...f.per100g},useCount:0,lastUsed:0});
  if((await db.all('caffeineSources')).length===0)for(const s of CAFFEINE_DEFAULTS)await db.put('caffeineSources',{...s});
  await db.put('meta',{key:'seeded',value:1});
}
function loadTargets(){                                         // saved targets over the defaults, nutrient by nutrient
  const saved=db.setting('targets',{}),def=defaultTargets();
  targets={};for(const n of NUTRIENTS)targets[n.key]={...def[n.key],...(saved[n.key]||{})};
}

/* ---------- the day ---------- */
async function setDay(k){
  viewDay=k;
  const [f,w,c]=await Promise.all([db.byIndex('foodLog','day',k),db.byIndex('waterLog','day',k),db.byIndex('caffeineLog','day',k)]);
  day.food=f;day.water=w;day.caffeine=c;
  render();
}
function checkMidnight(){                                       // the day rolls over at midnight; follow it if "today" was on screen
  const t=todayKey();if(t===lastToday)return;
  const wasToday=viewDay===lastToday;lastToday=t;
  if(wasToday)setDay(t);else render();
}
function stampFor(k){                                           // an entry on a past day gets that date and the current clock time
  if(k===todayKey())return Date.now();
  const d=fromKey(k),n=new Date();d.setHours(n.getHours(),n.getMinutes(),n.getSeconds(),0);return d.getTime();
}
const cutoffMin=()=>{const [h,m]=db.setting('caffeineCutoff','13:00').split(':').map(Number);return h*60+m;};
const isLate=ts=>{const d=new Date(ts);return d.getHours()*60+d.getMinutes()>=cutoffMin();};

function render(){renderHeader();updateBars();renderLog();}
function renderHeader(){
  const {dow,date}=fmtDay(viewDay),today=todayKey();
  $('#dayLcd').innerHTML=`<div class="lcd m l14"><span class="ghost">~~~</span><span class="val">${dow}</span></div>&nbsp;${lcd(date,'m')}`;
  $('#dayToday').hidden=viewDay===today;
  $('#dayState').innerHTML=viewDay===today?'TODAY · <b>DAY ENDS AT MIDNIGHT</b>':viewDay<today?'PAST DAY · <b>EDITABLE</b> · TOO LITTLE SHOWS RED':'FUTURE DAY · <b>PLANNING</b>';
}

/* ---------- totals and bars ---------- */
function totals(){
  const t={},s={};                                              // t: everything; s: what came from SUPPLEMENT-typed foods
  for(const r of day.food)for(const k in r.snapshot){t[k]=(t[k]||0)+r.snapshot[k];if(r.foodType==='supplement')s[k]=(s[k]||0)+r.snapshot[k];}
  t.water=day.water.reduce((a,r)=>a+r.floz,0);
  t.caffeine=day.caffeine.reduce((a,r)=>a+r.mg,0);
  return {t,s};
}
/* whole numbers, one decimal under 10 (zinc 8.3 mg), thousands separators (1,650 kcal) */
const fmt=(v,unit)=>{if(v==null||isNaN(v))return '—';const n=(unit!=='kcal'&&Math.abs(v)<10)?Math.round(v*10)/10:Math.round(v);return n.toLocaleString('en-US');};

function buildBars(){
  const host=$('#bars');host.innerHTML='';let grp='';
  const txt=n=>`<span class="nm">${n.label}<i class="flag" hidden></i></span><span class="num"></span>`;
  for(const n of NUTRIENTS){
    if(n.group!==grp){grp=n.group;const h=document.createElement('div');h.className='ngrp';h.innerHTML=`<span>${GROUP_LABEL[grp]}</span><em>${grp==='daily'?'TAP TARGETS TO CHANGE THE LINES':(grp==='mineral'?'13':'14')+' · MIN = TARGET · MAX = UPPER LIMIT'}</em>`;host.append(h);}
    const el=document.createElement('div');el.className='nbar';el.dataset.key=n.key;
    el.innerHTML=`<div class="track"><div class="fill"></div><div class="txt">${txt(n)}</div><div class="txt over">${txt(n)}</div></div>`;
    host.append(el);barEls[n.key]=el;
  }
}
function updateBars(){
  const {t,s}=totals(),dayOver=viewDay<todayKey();              // "too little" only counts once the day is over
  const late=day.caffeine.some(r=>isLate(r.ts));
  for(const n of NUTRIENTS){
    const el=barEls[n.key],eff=targets[n.key],v=t[n.key]||0;
    const pct=eff.target>0?v/eff.target*100:0,w=Math.min(100,pct);     // the fill stops at 100%, the number keeps counting
    const text=`${fmt(v,n.unit)} / ${fmt(eff.target,n.unit)} ${n.unit} · ${eff.target>0?Math.round(pct)+'%':'—'}`;
    el.querySelector('.fill').style.width=w+'%';
    el.querySelector('.txt.over').style.clipPath=`inset(0 ${100-w}% 0 0)`;     // dark text shows only over the white fill
    el.querySelectorAll('.num').forEach(x=>x.textContent=text);
    const vMax=n.maxSupplementsOnly?(s[n.key]||0):v;
    const over=eff.max!=null&&vMax>eff.max,under=eff.min!=null&&v<eff.min&&dayOver;
    el.classList.toggle('red',over||under);
    el.title=over?'TOO HIGH':under?'TOO LITTLE':'';
    el.querySelectorAll('.flag').forEach(f=>{f.hidden=!(n.key==='caffeine'&&late);f.textContent=' ⚑ AFTER 1 PM';});
  }
}

/* ---------- the day's log (right pane) ---------- */
function renderLog(){
  const rows=[...day.food.map(r=>({kind:'food',r})),...day.water.map(r=>({kind:'water',r})),...day.caffeine.map(r=>({kind:'caffeine',r}))].sort((a,b)=>a.r.ts-b.r.ts);
  const {t}=totals();
  $('#logSum').textContent=`${rows.length} ${rows.length===1?'ENTRY':'ENTRIES'} · ${fmt(t.kcal||0,'kcal')} KCAL`;
  const host=$('#logList');
  if(!rows.length){host.innerHTML='<div class="note">NOTHING LOGGED THIS DAY · TAP <b>+ LOG FOOD</b>, <b>WATER</b> OR <b>CAFFEINE</b> BELOW</div>';return;}
  host.innerHTML=rows.map(({kind,r})=>{
    const time=`<span class="ltime">${fmtTime(r.ts)}</span>`;
    if(kind==='food')return `<div class="lrow" data-kind="food" data-id="${r.id}">${time}<span class="lname">${esc(r.foodName)}<em>${fmt(r.amount)} ${UNIT_LABEL[r.unit]}${r.unit!=='g'?` · ${fmt(r.grams)} G`:''}</em></span><span class="lkcal">${fmt(r.snapshot.kcal||0,'kcal')}<small>KCAL</small></span><span class="lmac">P ${fmt(r.snapshot.protein||0)} · C ${fmt(r.snapshot.carbs||0)} · F ${fmt(r.snapshot.fat||0)}</span></div>`;
    if(kind==='water')return `<div class="lrow one" data-kind="water" data-id="${r.id}">${time}<span class="lname"><span class="tag">WATER</span>${fmt(r.floz)} OZ</span></div>`;
    return `<div class="lrow one" data-kind="caffeine" data-id="${r.id}">${time}<span class="lname"><span class="tag">CAFFEINE</span>${esc(r.name)}<em>${fmt(r.mg)} MG</em>${isLate(r.ts)?'<i class="late">AFTER 1 PM</i>':''}</span></div>`;
  }).join('');
}

/* ---------- catalog ---------- */
function sortedFoods(q){                                        // most used first, then most recent, then A–Z
  q=(q||'').trim().toLowerCase();
  return foods.filter(f=>!q||f.name.toLowerCase().includes(q)||(f.brand||'').toLowerCase().includes(q))
    .sort((a,b)=>(b.useCount||0)-(a.useCount||0)||(b.lastUsed||0)-(a.lastUsed||0)||a.name.localeCompare(b.name));
}
function openCatalog(){$('#foodSearch').value='';$('#barcodeBox').value='';renderCatalog();openSheet('catalogSheet');}
function renderCatalog(){
  const q=$('#foodSearch').value,list=sortedFoods(q);
  $('#catalogCount').textContent=`${foods.length} FOODS · MOST USED FIRST`;
  $('#foodList').innerHTML=list.length?list.map(f=>`<div class="frow" data-id="${esc(f.id)}"><div class="fmain"><div class="fname">${esc(f.name)}${f.brand?`<em>${esc(f.brand)}</em>`:''}${f.type==='supplement'?'<span class="tag">SUPP</span>':''}${f.isLiquid?'<span class="tag">LIQUID</span>':''}</div><div class="fmeta">${fmt(f.per100g.kcal||0,'kcal')} KCAL · P ${fmt(f.per100g.protein||0)} · C ${fmt(f.per100g.carbs||0)} · F ${fmt(f.per100g.fat||0)} · PER 100 G · SERVING ${fmt(f.servingG)} G${f.barcode?` · #${esc(f.barcode)}`:''}</div></div><button class="btn sm" data-edit="${esc(f.id)}">EDIT</button></div>`).join('')
    :`<div class="note">NO MATCH FOR "${esc(q)}" · TAP <b>+ NEW FOOD</b></div>`;
}
function findBarcode(){
  const code=$('#barcodeBox').value.trim();
  if(!code){toast('TYPE THE BARCODE NUMBER FIRST');return;}
  const f=foods.find(x=>(x.barcode||'')===code);
  if(f)openAmount(f);else{toast(`BARCODE <i>${esc(code)}</i> NOT IN THE CATALOG · NEW FOOD`);openFoodForm(null,code);}
}

/* ---------- amount sheet: log a food, or edit any entry ---------- */
let ctx=null;                                                   // {kind, food, row}: row set = editing an existing entry
const currentUnit=()=>$('#unitSeg button.on')?.dataset.unit||'g';
const gramsFor=(servingG,amount,unit)=>unit==='serving'?amount*servingG:amount*G_PER[unit];
function openAmount(food,row){
  ctx={kind:'food',food,row};
  $('#amountTitle').innerHTML=`${esc(food?.name||row.foodName)} <span>${row?'EDIT ENTRY':'HOW MUCH?'}</span>`;
  const units=['g','oz','lb','serving'];if(food?.isLiquid||row?.unit==='floz')units.push('floz');
  const unit=row?row.unit:'g',amount=row?row.amount:(food.servingG||100);
  $('#unitSeg').innerHTML=units.map(u=>`<button data-unit="${u}" class="${u===unit?'on':''}">${UNIT_LABEL[u]}</button>`).join('');
  $('#amountIn').value=amount;
  $('#amountDelete').hidden=!row;$('#amountSave').textContent=row?'SAVE':'ADD TO LOG';
  previewAmount();openSheet('amountSheet');setTimeout(()=>$('#amountIn').select(),60);
}
function openEntry(kind,id){
  const row=day[kind].find(r=>r.id===id);if(!row)return;
  if(kind==='food')return openAmount(foods.find(f=>f.id===row.foodId)||null,row);
  ctx={kind,row};
  $('#amountTitle').innerHTML=kind==='water'?'WATER <span>EDIT ENTRY</span>':`${esc(row.name)} <span>EDIT ENTRY · CAFFEINE</span>`;
  $('#unitSeg').innerHTML=`<button class="on" data-unit="${kind==='water'?'oz':'mg'}">${kind==='water'?'OZ':'MG'}</button>`;
  $('#amountIn').value=kind==='water'?row.floz:row.mg;
  $('#amountDelete').hidden=false;$('#amountSave').textContent='SAVE';
  $('#amountPreview').innerHTML=`LOGGED <b>${fmtTime(row.ts)}</b>`;
  openSheet('amountSheet');setTimeout(()=>$('#amountIn').select(),60);
}
function previewAmount(){
  if(ctx?.kind!=='food')return;
  const {food,row}=ctx,a=+$('#amountIn').value||0,u=currentUnit(),servingG=food?.servingG??row?.servingG??100,grams=gramsFor(servingG,a,u);
  const per=k=>row&&row.grams>0?(row.snapshot[k]??0)/row.grams:(food?.per100g?.[k]??0)/100;   // per gram, from the snapshot when editing
  $('#amountPreview').innerHTML=`<b>${fmt(grams)} G</b> · ${fmt(per('kcal')*grams,'kcal')} KCAL · P ${fmt(per('protein')*grams)} · C ${fmt(per('carbs')*grams)} · F ${fmt(per('fat')*grams)}${u!=='serving'?` · 1 SERVING = ${fmt(servingG)} G`:''}`;
}
async function saveAmount(){
  const a=+$('#amountIn').value;if(!(a>0)){toast('ENTER AN AMOUNT ABOVE 0');return;}
  const {kind,food,row}=ctx;
  if(kind==='water'){row.floz=a;await db.put('waterLog',row);toast(`WATER ENTRY · <i>${fmt(a)} OZ</i>`);}
  else if(kind==='caffeine'){row.mg=a;await db.put('caffeineLog',row);toast(`${esc(row.name)} · <i>${fmt(a)} MG</i>`);}
  else if(row){                                                  // edit: scale the as-logged snapshot to the new grams
    const u=currentUnit(),grams=gramsFor(food?.servingG??row.servingG??100,a,u),factor=row.grams>0?grams/row.grams:0;
    for(const k in row.snapshot)row.snapshot[k]*=factor;
    Object.assign(row,{amount:a,unit:u,grams});await db.put('foodLog',row);
    toast(`UPDATED <i>${esc(row.foodName)}</i> · ${fmt(grams)} G`);
  }else{                                                         // add: snapshot the food's values for these grams
    const u=currentUnit(),grams=gramsFor(food.servingG||100,a,u),snapshot={};
    for(const k of FOOD_KEYS){const v=food.per100g[k];if(v!=null&&v!=='')snapshot[k]=v*grams/100;}
    const r={ts:stampFor(viewDay),day:viewDay,foodId:food.id,foodName:food.name,foodType:food.type,servingG:food.servingG||100,amount:a,unit:u,grams,snapshot};
    r.id=await db.put('foodLog',r);day.food.push(r);
    food.useCount=(food.useCount||0)+1;food.lastUsed=Date.now();await db.put('foods',food);
    toast(`LOGGED <i>${esc(food.name)}</i> · ${fmt(grams)} G · ${fmt(snapshot.kcal||0,'kcal')} KCAL`);
  }
  closeSheets();render();
}
async function deleteEntry(){
  const {kind,row}=ctx;await db.del(LOG_STORE[kind],row.id);day[kind]=day[kind].filter(r=>r!==row);
  closeSheets();render();toast(`REMOVED <i>${esc(row.foodName||row.name||'WATER')}</i>`);
}

/* ---------- food form: new / edit / delete ---------- */
let formFood=null;
const segVal=id=>$('#'+id+' button.on')?.dataset.v;
const setSeg=(id,v)=>$('#'+id).querySelectorAll('button').forEach(x=>x.classList.toggle('on',x.dataset.v===String(v)));
function segWire(id,fn){$('#'+id).addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const prev=segVal(id);setSeg(id,b.dataset.v);fn?.(b.dataset.v,prev);});}
function buildFoodForm(){
  const inp=n=>`<label class="fld"><span>${n.label} <em>${n.unit}</em></span><input class="field num" type="number" inputmode="decimal" min="0" step="any" data-k="${n.key}"></label>`;
  const grp=g=>NUTRIENTS.filter(n=>n.group===g&&!n.logged).map(inp).join('');
  $('#foodForm').innerHTML=`
    <div class="fgrid top">
      <label class="fld wide"><span>NAME</span><input class="field" id="fName" maxlength="60" autocomplete="off" placeholder="E.G. QUAKER RICE CAKE"></label>
      <label class="fld"><span>BRAND <em>OPTIONAL</em></span><input class="field" id="fBrand" maxlength="40" autocomplete="off"></label>
      <div class="fld"><span>TYPE</span><div class="seg" id="fType"><button class="on" data-v="food">FOOD</button><button data-v="supplement">SUPPLEMENT</button></div></div>
      <label class="fld"><span>BARCODE # <em>OPTIONAL</em></span><input class="field num" id="fBarcode" inputmode="numeric" autocomplete="off"></label>
      <label class="fld"><span>DEFAULT SERVING <em>GRAMS</em></span><input class="field num" id="fServing" type="number" inputmode="decimal" min="0" step="any" value="100"></label>
      <div class="fld"><span>LIQUID <em>ALLOWS FL OZ</em></span><div class="seg" id="fLiquid"><button class="on" data-v="0">NO</button><button data-v="1">YES</button></div></div>
      <div class="fld"><span>VALUES TYPED PER</span><div class="seg" id="fBasis"><button class="on" data-v="100">100 G</button><button data-v="serving">1 SERVING</button></div></div>
    </div>
    <div class="ngrp"><span>MACROS</span><em id="fBasisNote">PER 100 G</em></div><div class="fgrid">${grp('daily')}</div>
    <div class="ngrp"><span>MINERALS</span><em>BLANK = UNKNOWN</em></div><div class="fgrid">${grp('mineral')}</div>
    <div class="ngrp"><span>VITAMINS</span><em>BLANK = UNKNOWN</em></div><div class="fgrid">${grp('vitamin')}</div>
    <div class="note" id="fSource"></div>`;
}
function openFoodForm(food,barcode=''){
  formFood=food;
  $('#foodTitle').innerHTML=food?`EDIT FOOD <span>${esc(food.name)}</span>`:'NEW FOOD <span>TYPE WHAT THE LABEL SAYS · BLANKS ARE FINE</span>';
  $('#fName').value=food?.name||'';$('#fBrand').value=food?.brand||'';$('#fBarcode').value=food?.barcode||barcode||'';$('#fServing').value=food?.servingG||100;
  setSeg('fType',food?.type||'food');setSeg('fLiquid',food?.isLiquid?'1':'0');setSeg('fBasis','100');$('#fBasisNote').textContent='PER 100 G';
  for(const inp of $('#foodForm').querySelectorAll('[data-k]')){const v=food?.per100g?.[inp.dataset.k];inp.value=v==null?'':v;}
  $('#fSource').textContent=food?.source?`SOURCE · ${food.source}`:'';
  $('#fDelete').hidden=!food;
  openSheet('foodSheet');$('#foodForm').scrollTop=0;
  setTimeout(()=>$('#fName').focus(),60);
}
function switchBasis(v,prev){                                   // US labels are per serving; the app stores per 100 g
  if(v===prev)return;
  const servingG=+$('#fServing').value||100,f=v==='serving'?servingG/100:100/servingG;
  for(const inp of $('#foodForm').querySelectorAll('[data-k]'))if(inp.value!=='')inp.value=Math.round(+inp.value*f*1000)/1000;
  $('#fBasisNote').textContent=v==='serving'?`PER 1 SERVING (${fmt(servingG)} G)`:'PER 100 G';
}
async function saveFood(){
  const name=$('#fName').value.trim();if(!name){toast('A NAME IS NEEDED');return;}
  const servingG=+$('#fServing').value;if(!(servingG>0)){toast('SERVING MUST BE ABOVE 0 G');return;}
  const barcode=$('#fBarcode').value.trim();
  if(barcode){const dup=foods.find(f=>f.barcode===barcode&&f!==formFood);if(dup){toast(`BARCODE ALREADY ON <i>${esc(dup.name)}</i>`);return;}}
  const basis=segVal('fBasis'),per100g={};
  for(const inp of $('#foodForm').querySelectorAll('[data-k]')){
    if(inp.value==='')continue;let v=+inp.value;if(!(v>=0))continue;
    if(basis==='serving')v=v*100/servingG;
    per100g[inp.dataset.k]=Math.round(v*1000)/1000;
  }
  const isNew=!formFood;
  const f=formFood||{id:'f-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),useCount:0,lastUsed:0};
  Object.assign(f,{name,brand:$('#fBrand').value.trim(),type:segVal('fType'),barcode,servingG,isLiquid:segVal('fLiquid')==='1',per100g});
  await db.put('foods',f);
  if(isNew)foods.push(f);
  toast(`SAVED <i>${esc(name)}</i>`);
  if(isNew)openAmount(f);else openCatalog();                    // a new food is usually about to be logged
}
async function deleteFood(){
  const f=formFood;await db.del('foods',f.id);foods=foods.filter(x=>x!==f);formFood=null;
  toast(`DELETED <i>${esc(f.name)}</i> · PAST LOG ROWS KEEP THEIR NUMBERS`);openCatalog();
}

/* ---------- targets ---------- */
function openTargets(){
  $('#targetsList').innerHTML=`<div class="trow head"><div class="tname">NUTRIENT</div><span>TARGET</span><span>MIN</span><span>MAX</span></div>`+NUTRIENTS.map(n=>{const e=targets[n.key];
    return `<div class="trow" data-key="${n.key}"><div class="tname">${n.label}<em>${n.unit}${n.note?' · '+n.note:''}${n.maxSupplementsOnly?' · MAX COUNTS SUPPLEMENTS ONLY':''}</em></div>
      <input class="field num" type="number" inputmode="decimal" min="0" step="any" data-f="target" data-prev="${e.target??''}" value="${e.target??''}">
      <input class="field num" type="number" inputmode="decimal" min="0" step="any" data-f="min" value="${e.min??''}" placeholder="NONE">
      <input class="field num" type="number" inputmode="decimal" min="0" step="any" data-f="max" value="${e.max??''}" placeholder="NONE"></div>`;}).join('');
  openSheet('targetsSheet');
}
function linkTargets(e){                                        // changing a target moves its min/max along while they still follow the rule
  const inp=e.target;if(inp.dataset.f!=='target')return;
  const row=inp.closest('.trow'),def=byKey[row.dataset.key],old=derive(def,+inp.dataset.prev||0),nu=derive(def,+inp.value||0);
  const mn=row.querySelector('[data-f=min]'),mx=row.querySelector('[data-f=max]');
  if(mn.value===String(old.min??''))mn.value=nu.min??'';
  if(mx.value===String(old.max??''))mx.value=nu.max??'';
  inp.dataset.prev=inp.value;
}
function fillTargets(set){for(const row of $('#targetsList').querySelectorAll('.trow[data-key]')){const e=set[row.dataset.key];for(const f of ['target','min','max']){const i=row.querySelector(`[data-f=${f}]`);i.value=e[f]??'';if(f==='target')i.dataset.prev=i.value;}}}
async function saveTargets(){
  const out={};
  for(const row of $('#targetsList').querySelectorAll('.trow[data-key]')){
    const g=f=>{const v=row.querySelector(`[data-f=${f}]`).value;return v===''?null:+v;};
    out[row.dataset.key]={target:g('target')??0,min:g('min'),max:g('max')};
  }
  await db.setSetting('targets',out);loadTargets();closeSheets();updateBars();toast('TARGETS SAVED');
}

/* ---------- water ---------- */
async function addWater(oz){
  if(!(oz>0)){toast('ENTER OUNCES ABOVE 0');return;}
  const r={ts:stampFor(viewDay),day:viewDay,floz:oz};r.id=await db.put('waterLog',r);day.water.push(r);
  closeSheets();render();toast(`WATER <i>+${fmt(oz)} OZ</i> · ${fmt(totals().t.water)} / ${fmt(targets.water.target)} OZ`);
}

/* ---------- caffeine: named sources only, so nothing double-counts ---------- */
function renderCaffeine(){
  $('#caffeineQuick').innerHTML=sources.length?sources.map(s=>`<button class="btn" data-src="${s.id}">${esc(s.name)} <b>${fmt(s.mg)} MG</b></button>`).join(''):'<div class="note">NO SOURCES YET · TAP EDIT SOURCES</div>';
  $('#sourcesList').innerHTML=sources.map(s=>`<div class="srow" data-id="${s.id}"><input class="field" data-f="name" value="${esc(s.name)}" maxlength="30"><input class="field num" data-f="mg" type="number" inputmode="decimal" min="0" step="any" value="${s.mg}"><span class="unit">MG</span><button class="btn sm danger" data-del="${s.id}">✕</button></div>`).join('')+'<button class="btn sm" id="sourceAdd">+ ADD SOURCE</button>';
}
async function addCaffeine(src){
  const r={ts:stampFor(viewDay),day:viewDay,sourceId:src.id,name:src.name,mg:src.mg};r.id=await db.put('caffeineLog',r);day.caffeine.push(r);
  closeSheets();render();toast(`${esc(src.name)} <i>+${fmt(src.mg)} MG</i>${isLate(r.ts)?' · <i>AFTER 1 PM</i>':''}`);
}
async function sourceChanged(e){
  const row=e.target.closest('.srow');if(!row)return;
  const s=sources.find(x=>x.id===+row.dataset.id);if(!s)return;
  s.name=row.querySelector('[data-f=name]').value.trim()||s.name;s.mg=Math.max(0,+row.querySelector('[data-f=mg]').value||0);
  await db.put('caffeineSources',s);renderCaffeine();
}
async function sourceClick(e){
  const del=e.target.closest('[data-del]');
  if(del){const id=+del.dataset.del;await db.del('caffeineSources',id);sources=sources.filter(s=>s.id!==id);renderCaffeine();$('#sourcesList').hidden=false;return;}
  if(e.target.closest('#sourceAdd')){const s={name:'NEW SOURCE',mg:100};s.id=await db.put('caffeineSources',s);sources.push(s);renderCaffeine();$('#sourcesList').hidden=false;$('#sourcesList').querySelector(`.srow[data-id="${s.id}"] [data-f=name]`)?.select();}
}

/* ---------- wiring ---------- */
function wire(){
  $('#dayPrev').onclick=()=>setDay(shiftDay(viewDay,-1));
  $('#dayNext').onclick=()=>setDay(shiftDay(viewDay,1));
  $('#dayToday').onclick=()=>setDay(todayKey());
  const pick=$('#dayPick');
  $('#dayLcd').onclick=()=>{pick.value=viewDay;if(pick.showPicker){try{pick.showPicker();return;}catch{}}pick.style.cssText='position:static;opacity:1;pointer-events:auto;width:auto;height:auto';pick.focus();};
  pick.onchange=()=>{if(pick.value)setDay(pick.value);pick.style.cssText='';};
  $('#logFoodBtn').onclick=openCatalog;
  $('#waterBtn').onclick=()=>{$('#waterCustom').value='';openSheet('waterSheet');};
  $('#caffeineBtn').onclick=()=>{renderCaffeine();$('#sourcesList').hidden=true;openSheet('caffeineSheet');};
  $('#targetsBtn').onclick=openTargets;
  $('#logList').onclick=e=>{const row=e.target.closest('.lrow');if(row)openEntry(row.dataset.kind,+row.dataset.id);};
  // catalog
  $('#foodSearch').oninput=renderCatalog;
  $('#barcodeGo').onclick=findBarcode;$('#barcodeBox').onkeydown=e=>{if(e.key==='Enter')findBarcode();};
  $('#newFoodBtn').onclick=()=>openFoodForm(null,$('#barcodeBox').value.trim());
  $('#foodList').onclick=e=>{const ed=e.target.closest('[data-edit]');if(ed)return openFoodForm(foods.find(f=>f.id===ed.dataset.edit));const row=e.target.closest('.frow');if(row)openAmount(foods.find(f=>f.id===row.dataset.id));};
  // amount
  $('#amountIn').oninput=previewAmount;$('#amountIn').onkeydown=e=>{if(e.key==='Enter')saveAmount();};
  $('#unitSeg').onclick=e=>{const b=e.target.closest('button');if(!b)return;$('#unitSeg').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));previewAmount();};
  $('#amountSave').onclick=saveAmount;$('#amountDelete').onclick=deleteEntry;
  // food form
  segWire('fType');segWire('fLiquid');segWire('fBasis',switchBasis);
  $('#fServing').oninput=()=>{if(segVal('fBasis')==='serving')$('#fBasisNote').textContent=`PER 1 SERVING (${fmt(+$('#fServing').value||0)} G)`;};
  $('#fSave').onclick=saveFood;$('#fDelete').onclick=deleteFood;
  // targets
  $('#targetsList').addEventListener('input',linkTargets);
  $('#targetsSave').onclick=saveTargets;
  $('#targetsReset').onclick=()=>{fillTargets(defaultTargets());toast('DEFAULTS FILLED IN · TAP SAVE TARGETS TO KEEP THEM');};
  // water
  $('#waterQuick').onclick=e=>{const b=e.target.closest('[data-oz]');if(b)addWater(+b.dataset.oz);};
  $('#waterAdd').onclick=()=>addWater(+$('#waterCustom').value);
  $('#waterCustom').onkeydown=e=>{if(e.key==='Enter')addWater(+$('#waterCustom').value);};
  // caffeine
  $('#caffeineQuick').onclick=e=>{const b=e.target.closest('[data-src]');if(b)addCaffeine(sources.find(s=>s.id===+b.dataset.src));};
  $('#sourcesEdit').onclick=()=>{const l=$('#sourcesList');l.hidden=!l.hidden;};
  $('#sourcesList').addEventListener('change',sourceChanged);
  $('#sourcesList').onclick=sourceClick;
}
