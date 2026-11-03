/* =========================================================
   SMALL HELPERS — shared by every screen
   ========================================================= */
export const $=s=>document.querySelector(s);
export const pad=n=>String(n).padStart(2,'0');
export const DOW=['SUN','MON','TUE','WED','THU','FRI','SAT'];
export const ghostOf=s=>s.replace(/[0-9]/g,'8');                 // "19.4" → "88.8": the unlit segments behind a number
export const lcd=(v,size='l')=>`<div class="lcd ${size}"><span class="ghost">${ghostOf(v)}</span><span class="val">${v}</span></div>`;
export const lcdw=w=>`<span class="lcdw"><span class="ghost">${'~'.repeat(w.length)}</span><span class="val">${w}</span></span>`; // 14-segment word
export const stampNow=()=>{const d=new Date();let h=d.getHours(),ap=h>=12?'PM':'AM';h=h%12||12;return `${pad(d.getMonth()+1)}.${pad(d.getDate())}.${d.getFullYear()} · ${pad(h)}:${pad(d.getMinutes())} ${ap}`;};
export function toast(html){const t=$('#toast');t.innerHTML=html;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2400);}
/* text typed by the user goes through esc() before it is put into HTML, so a "<" in a food name stays a "<" */
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* days: everything is keyed by the local calendar day, written "2026-11-03"; the day rolls over at midnight */
export const dayKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
export const todayKey=()=>dayKey(new Date());
export const fromKey=k=>{const [y,m,d]=k.split('-').map(Number);return new Date(y,m-1,d);};   // local midnight of that day
export const shiftDay=(k,n)=>{const d=fromKey(k);d.setDate(d.getDate()+n);return dayKey(d);};
export const fmtDay=k=>{const d=fromKey(k);return {dow:DOW[d.getDay()],date:`${pad(d.getMonth()+1)}.${pad(d.getDate())}.${d.getFullYear()}`};};
export const fmtTime=ts=>{const d=new Date(ts);let h=d.getHours(),ap=h>=12?'PM':'AM';h=h%12||12;return `${pad(h)}:${pad(d.getMinutes())} ${ap}`;};

/* =========================================================
   SCREENS — one <section class="screen"> shows at a time; nothing reloads.
   A screen registers what to do each time it opens (onOpen).
   Sheets and drawers are panels that slide over a screen.
   ========================================================= */
const openHooks={};
export function onOpen(name,fn){openHooks[name]=fn;}
export function go(name){
  document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id==='screen-'+name));
  closeSheets();
  openHooks[name]?.();
}
export function openSheet(id){
  closeSheets();
  const s=$('#'+id);s.classList.add('open');
  $('#scrim').classList.toggle('show',s.classList.contains('compact'));   // a small centered sheet dims the screen behind it
}
export function closeSheets(){
  document.querySelectorAll('.drawer.open,.sheet.open').forEach(d=>d.classList.remove('open'));
  $('#scrim')?.classList.remove('show');
}
export function wireScreens(){
  document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>{$('#'+b.dataset.close).classList.remove('open');$('#scrim')?.classList.remove('show');}));
  $('#scrim')?.addEventListener('click',closeSheets);
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape')return;
    if(document.querySelector('.sheet.open,.drawer.open'))closeSheets();else go('menu');
  });
}
