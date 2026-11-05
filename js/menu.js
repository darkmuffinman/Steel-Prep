import {$,pad,DOW,lcd,lcdw,toast,go,onOpen} from './ui.js';
import {store} from './db.js';

export function initMenu(){
/* =========================================================
   MENU — countdown, date, analog clock
   ========================================================= */
let compDate=store.get('compDate',null);           // "YYYY-MM-DD" or null
const cdEl=$('#cd'),cdSub=$('#cdSub'),cdInput=$('#cdDate');
function renderCountdown(){
  if(!compDate){cdEl.innerHTML=`${lcd('--','xxl')}${lcdw('WEEKS')}${lcd('-','xxl')}${lcdw('DAYS')}${lcdw('OUT')}`;cdSub.innerHTML=`<i>TAP TO SET YOUR COMPETITION DATE</i>`;return;}
  const [y,m,d]=compDate.split('-').map(Number);
  const show=new Date(y,m-1,d);const today=new Date();today.setHours(0,0,0,0);
  const days=Math.round((show-today)/86400000);
  const label=`${DOW[show.getDay()]} ${pad(m)}.${pad(d)}.${y}`;
  if(days>0){const w=Math.floor(days/7),r=days%7;
    cdEl.innerHTML=`${lcd(String(w),'xxl')}${lcdw(w===1?'WEEK':'WEEKS')}${lcd(String(r),'xxl')}${lcdw(r===1?'DAY':'DAYS')}${lcdw('OUT')}`;
    cdSub.innerHTML=`SHOW DAY <b>${label}</b> · ${days} DAYS · TAP TO CHANGE`;}
  else if(days===0){cdEl.innerHTML=`${lcdw('SHOW')}${lcdw('DAY')}`;cdSub.innerHTML=`<i>TODAY</i> · <b>${label}</b>`;}
  else{cdEl.innerHTML=`${lcd(String(-days),'xxl')}${lcdw(-days===1?'DAY':'DAYS')}${lcdw('SINCE')}`;cdSub.innerHTML=`SHOW DAY WAS <b>${label}</b> · TAP TO SET THE NEXT ONE`;}
}
cdEl.addEventListener('click',()=>{cdInput.value=compDate||'';if(cdInput.showPicker){try{cdInput.showPicker();return;}catch{}}cdInput.style.cssText='position:static;opacity:1;pointer-events:auto;width:auto;height:auto';cdInput.focus();});
cdInput.addEventListener('change',()=>{if(!cdInput.value)return;compDate=cdInput.value;store.set('compDate',compDate);renderCountdown();cdInput.style.cssText='';});
renderCountdown();

const dateLcd=$('#dateLcd');
function renderDate(){const d=new Date();dateLcd.innerHTML=`<div class="lcd m l14"><span class="ghost">~~~</span><span class="val">${DOW[d.getDay()]}</span></div>&nbsp;${lcd(`${pad(d.getMonth()+1)}.${pad(d.getDate())}.${d.getFullYear()}`,'m')}`;}

/* analog clock: red hands on a dark dial */
(function clock(){
  const svg=$('#clock'),ns='http://www.w3.org/2000/svg';
  const el=(t,a)=>{const e=document.createElementNS(ns,t);for(const k in a)e.setAttribute(k,a[k]);return e;};
  svg.append(el('circle',{cx:50,cy:50,r:47,fill:'#08080b',stroke:'#ff1f33',"stroke-width":1.5}));
  svg.append(el('circle',{cx:50,cy:50,r:42,fill:'none',stroke:'rgba(255,255,255,.12)',"stroke-width":.6}));
  for(let i=0;i<60;i++){const a=i*6*Math.PI/180,big=i%5===0,r1=big?36:39.5;
    svg.append(el('line',{x1:50+Math.sin(a)*r1,y1:50-Math.cos(a)*r1,x2:50+Math.sin(a)*42,y2:50-Math.cos(a)*42,stroke:big?'#f4f4f6':'#80808a',"stroke-width":big?1.6:.6,opacity:big?.9:.5}));}
  const hour=el('line',{x1:50,y1:54,x2:50,y2:26,stroke:'#ff1f33',"stroke-width":3.2,"stroke-linecap":'round'});
  const min=el('line',{x1:50,y1:56,x2:50,y2:16,stroke:'#ff1f33',"stroke-width":2.2,"stroke-linecap":'round'});
  const sec=el('line',{x1:50,y1:60,x2:50,y2:13,stroke:'#ff6b78',"stroke-width":.9,"stroke-linecap":'round'});
  svg.append(hour,min,sec,el('circle',{cx:50,cy:50,r:2.4,fill:'#ff1f33'}));
  function tick(){const d=new Date(),s=d.getSeconds(),m=d.getMinutes()+s/60,h=(d.getHours()%12)+m/60;
    hour.setAttribute('transform',`rotate(${h*30} 50 50)`);min.setAttribute('transform',`rotate(${m*6} 50 50)`);sec.setAttribute('transform',`rotate(${s*6} 50 50)`);
    renderDate();if(d.getHours()===0&&d.getMinutes()===0&&s===0)renderCountdown();}
  tick();setInterval(tick,1000);
})();

/* =========================================================
   MENU — the drum of tabs
   Five cards stand around a vertical axle like a slot drum turned
   on its side. Swipe or arrows rotate the whole drum; the card facing
   you is the live one. Cards facing away are hidden by the browser
   (backface-visibility), which is what makes it read as a wheel.
   ========================================================= */
const TABS=[
  {id:'nutrients',name:'NUTRIENTS',sub:'MACROS · MICROS · WATER · CAFFEINE',uc:false,
   ico:'<svg viewBox="0 0 100 100"><rect x="14" y="52" width="14" height="34"/><rect x="43" y="30" width="14" height="56"/><rect x="72" y="14" width="14" height="72"/><path d="M14 46h14M43 24h14M72 8h14" opacity=".5"/></svg>'},
  {id:'body',name:'BODY',sub:'PROPORTION · WEIGHT · HEIGHT',uc:false,
   ico:'<svg viewBox="0 0 100 100"><circle cx="50" cy="16" r="9"/><path d="M36 30h28l6 26-8 2-3-14v22l5 30h-9l-5-26-5 26h-9l5-30V44l-3 14-8-2z"/></svg>'},
  {id:'goals',name:'GOALS',sub:'PHYSIQUE · DATE',uc:true,
   ico:'<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="38"/><circle cx="50" cy="50" r="24"/><circle cx="50" cy="50" r="10"/><path d="M50 4v14M50 82v14M4 50h14M82 50h14"/></svg>'},
  {id:'workouts',name:'WORKOUTS',sub:'SPLITS · NOTES · TRACKING',uc:false,
   ico:'<svg viewBox="0 0 100 100"><rect x="8" y="36" width="10" height="28"/><rect x="18" y="28" width="12" height="44"/><rect x="70" y="28" width="12" height="44"/><rect x="82" y="36" width="10" height="28"/><path d="M30 50h40"/></svg>'},
  {id:'progress',name:'PROGRESS',sub:'PHOTOS · CHART',uc:true,
   ico:'<svg viewBox="0 0 100 100"><path d="M10 86h80M10 86V14"/><path d="M18 72l18-18 14 10 30-32"/><path d="M68 32h12v12"/></svg>'},
  {id:'misc',name:'MISC.',sub:'TO BE PLANNED',uc:true,
   ico:'<svg viewBox="0 0 100 100"><rect x="12" y="24" width="76" height="56"/><path d="M12 40h76"/><circle cx="34" cy="60" r="4"/><circle cx="50" cy="60" r="4"/><circle cx="66" cy="60" r="4"/></svg>'},
  {id:'settings',name:'SETTINGS',sub:'TO BE PLANNED',uc:true,
   ico:'<svg viewBox="0 0 100 100"><g transform="translate(50 50)">'+[0,45,90,135,180,225,270,315].map(a=>`<rect x="-7" y="-42" width="14" height="16" transform="rotate(${a})"/>`).join('')+'<circle r="28"/><circle r="12"/></g></svg>'},
];
const N=TABS.length,STEP=360/N;            // seven cards → 51.4° apart
const drum=$('#drum'),stage=$('#stage'),dots=$('#dots');
let rot=0;                                    // drum angle in degrees; 0 = card 0 faces you
TABS.forEach((t,i)=>{
  const c=document.createElement('div');c.className='card'+(t.uc?' uc':'');c.style.setProperty('--i',i);c.dataset.i=i;
  c.innerHTML=`<div class="top steel"></div><div class="ico">${t.ico}</div><div class="name">${t.name}</div><div class="sub">${t.sub}</div><div class="open">${t.uc?'NOT PLANNED YET':'OPEN ▸'}</div>${t.uc?'<div class="uc-sign"><div>UNDER CONSTRUCTION</div></div>':''}`;
  drum.append(c);
  const d=document.createElement('i');dots.append(d);
});
const cards=[...drum.children];
const centerIndex=()=>((Math.round(-rot/STEP)%N)+N)%N;
function layoutDrum(){
  const h=stage.clientHeight,w=stage.clientWidth;if(!h)return;
  const ch=Math.min(h*0.74,w*0.42),cw=ch*0.74;             // card size from the stage size
  const R=(cw/2+cw*0.14)/Math.tan(Math.PI/N);              // radius so the cards sit side by side with a gap
  drum.style.setProperty('--step',STEP+'deg');drum.style.setProperty('--cw',cw+'px');drum.style.setProperty('--ch',ch+'px');drum.style.setProperty('--R',R+'px');
  drum.style.transform=`translateZ(${-R}px) rotateY(${rot}deg)`;
}
function paintDrum(){
  const ci=centerIndex();
  cards.forEach((c,i)=>c.classList.toggle('side',i!==ci));
  [...dots.children].forEach((d,i)=>d.classList.toggle('on',i===ci));
  const R=parseFloat(drum.style.getPropertyValue('--R'))||0;
  drum.style.transform=`translateZ(${-R}px) rotateY(${rot}deg)`;
}
function spinBy(n){rot-=n*STEP;drum.classList.remove('nosnap');paintDrum();}
$('#prev').onclick=()=>spinBy(-1);$('#next').onclick=()=>spinBy(1);
function openCard(i){
  const t=TABS[i],c=cards[i];
  if(t.uc){c.classList.remove('shake');void c.offsetWidth;c.classList.add('shake');toast(`<i>${t.name}</i> · UNDER CONSTRUCTION · NOT PLANNED YET`);return;}
  go(t.id);
}
/* drag to spin, tap to open */
let drag=null;
stage.addEventListener('pointerdown',e=>{drag={x:e.clientX,rot0:rot,moved:false,t:e.target.closest('.card')};stage.classList.add('dragging');drum.classList.add('nosnap');stage.setPointerCapture(e.pointerId);});
stage.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x;if(Math.abs(dx)>6)drag.moved=true;rot=drag.rot0+dx*0.18;paintDrum();});
function endDrag(e){
  if(!drag)return;stage.classList.remove('dragging');drum.classList.remove('nosnap');
  if(!drag.moved&&drag.t){const i=+drag.t.dataset.i;if(i===centerIndex())openCard(i);else{const diff=((i-centerIndex())%N+N)%N;spinBy(diff>N/2?diff-N:diff);}}
  else{rot=Math.round(rot/STEP)*STEP;paintDrum();}
  drag=null;
}
stage.addEventListener('pointerup',endDrag);stage.addEventListener('pointercancel',endDrag);
new ResizeObserver(layoutDrum).observe(stage);layoutDrum();paintDrum();
onOpen('menu',layoutDrum);                        // re-measure the drum each time the menu shows
document.addEventListener('keydown',e=>{          // keyboard on a PC: ← → spin, Enter opens
  if(!$('#screen-menu').classList.contains('active'))return;
  if(e.key==='ArrowLeft')spinBy(-1);
  if(e.key==='ArrowRight')spinBy(1);
  if(e.key==='Enter')openCard(centerIndex());
});
}
