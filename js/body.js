import * as THREE from '../vendor/three.module.min.js';   // three.js 0.160 (MIT), shipped in /vendor
import {$,toast,stampNow,onOpen} from './ui.js';
import {store} from './db.js';

/* Slice-1 code, moved here unchanged apart from the imports above and the
   last line, which tells the screen switcher to run bodyOpened() on open. */
export function initBody(){
/* =========================================================
   BODY — data
   GG's Oct 26 baseline (relaxed). FLEXED is a sample set until real
   flexed numbers exist. A blank left side mirrors the right.
   ========================================================= */
const SITES=[
  {id:'shoulders',label:'SHOULDERS',note:'WIDEST, ARMS AT SIDES',sides:false,min:36,max:60},
  {id:'chest',label:'CHEST',note:'6" ABOVE NAVEL',sides:false,min:30,max:56},
  {id:'waist',label:'WAIST',note:'1" ABOVE NAVEL',sides:false,min:24,max:42},
  {id:'hips',label:'HIPS',note:'4" BELOW NAVEL',sides:false,min:32,max:52},
  {id:'neck',label:'NECK',note:'BELOW ADAM\'S APPLE',sides:false,min:11,max:20},
  {id:'bicep',label:'BICEP',note:'3.5" FROM INNER ELBOW',sides:true,min:10,max:22},
  {id:'triceps',label:'TRICEPS',note:'6" FROM ELBOW',sides:true,min:10,max:22},
  {id:'forearm',label:'FOREARM',note:'2.5" FROM INNER ELBOW',sides:true,min:8,max:16},
  {id:'quad',label:'QUAD',note:'5" ABOVE KNEE',sides:true,min:16,max:32},
  {id:'calf',label:'CALF',note:'4" BELOW KNEE',sides:true,min:11,max:20},
];
const LENGTHS=[
  {id:'leglen',label:'LEG LENGTH',note:'PELVIS TO ABOVE ANKLE',sides:true,min:24,max:40},
  {id:'pec',label:'PEC HEIGHT',note:'FROM COLLARBONE, 1" OFF CENTER',sides:true,min:5,max:14},
  {id:'wingspan',label:'WINGSPAN',note:'FINGERTIP TO FINGERTIP',sides:false,min:60,max:84},
];
const baseRelaxed={shoulders:43,chest:39.5,waist:29.5,hips:40,neck:12.5,bicep:{R:12.5,L:null},triceps:{R:12.4,L:null},forearm:{R:9.25,L:null},quad:{R:19.5,L:19},calf:{R:13.25,L:13.25},leglen:{R:29.5,L:29.5},pec:{R:8.5,L:8.5},wingspan:72};
const baseFlexed={...structuredClone(baseRelaxed),chest:41,bicep:{R:13.5,L:null},triceps:{R:13.25,L:null},forearm:{R:10,L:null},quad:{R:20.5,L:20},calf:{R:13.75,L:13.75}};
const vals=store.get('tape',{relaxed:baseRelaxed,flexed:baseFlexed});
const GROUPS=['NECK','TRAPS','FRONT DELTS','SIDE DELTS','REAR DELTS','CHEST','LATS','UPPER BACK','LOWER BACK','SERRATUS','ABS','OBLIQUES','BICEPS','TRICEPS','FOREARMS','GLUTES','QUADS','HAMSTRINGS','ADDUCTORS','CALVES'];
const muscle=store.get('muscle',Object.fromEntries(GROUPS.map(g=>[g,50])));
const history=store.get('history',[
  {v:3,what:'TAPE · RELAXED · 13 SITES',when:'10.26.2026 · 07:40 AM'},
  {v:2,what:'WEIGHT · 187.0 LB',when:'10.26.2026 · 06:55 AM'},
  {v:1,what:'INBODY SCAN · 19.4 % · 87.7 LB SMM',when:'10.09.2026 · 05:10 PM'},
]);
const state={set:'relaxed',mode:'tape',pose:'A',look:'holo',spin:true};

function renderStamp(){const h=history[0];$('#stamp').innerHTML=`LAST SAVED <b>${h.when}</b><br>VERSION <span class="v">V${h.v}</span> · ${h.what.split(' · ').slice(0,2).join(' · ')}`;$('#hudSrc').innerHTML=`BODY SCAN · <b>V${h.v}</b><br>SOURCE · <b>TAPE</b> <i>■</i> ${state.set.toUpperCase()}`;}
function renderHistory(){$('#hist').innerHTML=history.map(h=>`<div class="vrow"><span class="v">V${h.v}</span><span class="what">${h.what}</span><span class="when">${h.when}</span></div>`).join('');
  document.querySelectorAll('.vrow').forEach(r=>r.onclick=()=>{document.querySelectorAll('.vrow').forEach(x=>x.style.background='');r.style.background='rgba(255,31,51,.12)';});}
renderStamp();renderHistory();

/* =========================================================
   BODY — editor (right panel)
   ========================================================= */
const list=$('#list');
const get=(id,side)=>{const v=vals[state.set][id];return (v&&typeof v==='object')?v[side]:v;};
const set=(id,side,n)=>{const v=vals[state.set][id];if(v&&typeof v==='object')v[side]=n;else vals[state.set][id]=n;};
function sliderRow(site,side){
  const raw=get(site.id,side),mirrored=side==='L'&&raw==null,v=mirrored?get(site.id,'R'):raw;
  const row=document.createElement('div');row.className='sl';
  row.innerHTML=`<span class="side">${site.sides?side:''}</span><input type="range" min="${site.min}" max="${site.max}" step="0.25" value="${v}">
    <span class="num"><input type="number" min="${site.min}" max="${site.max}" step="0.25" value="${(+v).toFixed(2).replace(/\.?0+$/,'')}">${mirrored?'<span class="mir">=R</span>':''}</span>`;
  const r=row.querySelector('[type=range]'),n=row.querySelector('[type=number]');
  const paint=()=>r.style.setProperty('--pct',((r.value-site.min)/(site.max-site.min)*100)+'%');paint();
  r.addEventListener('input',()=>{n.value=r.value;set(site.id,side,+r.value);row.querySelector('.mir')?.remove();paint();rebuild();});
  n.addEventListener('change',()=>{let x=Math.min(site.max,Math.max(site.min,+n.value||site.min));n.value=x;r.value=x;set(site.id,side,x);row.querySelector('.mir')?.remove();paint();rebuild();});
  return row;
}
function renderTape(){
  list.innerHTML='';
  const add=site=>{const d=document.createElement('div');d.className='site';d.innerHTML=`<div class="name">${site.label}<em>${site.note}</em></div>`;
    if(site.sides)d.append(sliderRow(site,'R'),sliderRow(site,'L'));else d.append(sliderRow(site,'X'));list.append(d);};
  const g=document.createElement('div');g.className='grp';g.textContent='GIRTHS · DRIVE THE MODEL';list.append(g);SITES.forEach(add);
  const g2=document.createElement('div');g2.className='grp';g2.textContent='LENGTHS';list.append(g2);LENGTHS.forEach(add);
  const n=document.createElement('div');n.className='note';n.textContent='SLIDE OR TYPE. A BLANK LEFT SIDE MIRRORS THE RIGHT (=R) UNTIL YOU MEASURE IT. TAPE IN 1/4" STEPS.';list.append(n);
}
function renderMuscle(){
  list.innerHTML='';
  const g=document.createElement('div');g.className='grp';g.textContent='MUSCLE GROUPS · 0–100 · 50 = AS MEASURED';list.append(g);
  GROUPS.forEach(name=>{
    const d=document.createElement('div');d.className='site';d.innerHTML=`<div class="name">${name}</div>`;
    const row=document.createElement('div');row.className='sl';
    row.innerHTML=`<span class="side"></span><input type="range" min="0" max="100" step="1" value="${muscle[name]}"><span class="num"><input type="number" min="0" max="100" step="1" value="${muscle[name]}"></span>`;
    const r=row.querySelector('[type=range]'),n=row.querySelector('[type=number]');
    const paint=()=>r.style.setProperty('--pct',r.value+'%');paint();
    r.addEventListener('input',()=>{n.value=r.value;muscle[name]=+r.value;paint();rebuild();});
    n.addEventListener('change',()=>{let x=Math.min(100,Math.max(0,+n.value||0));n.value=x;r.value=x;muscle[name]=x;paint();rebuild();});
    d.append(row);list.append(d);
  });
  const n=document.createElement('div');n.className='note';n.textContent='VISUAL FINE-TUNE FOR MUSCLES A TAPE CANNOT ISOLATE. IN THIS PREVIEW ONLY SOME GROUPS MOVE THE MANNEQUIN.';list.append(n);
}
const renderEditor=()=>state.mode==='tape'?renderTape():renderMuscle();
function segWire(id,attr,fn){const seg=$('#'+id);seg.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));fn(b.dataset[attr]);});}
segWire('setSeg','set',v=>{state.set=v;renderStamp();renderEditor();rebuild();});
segWire('modeSeg','mode',v=>{state.mode=v;renderEditor();});
segWire('poseSeg','pose',v=>{state.pose=v;$('#poselbl').textContent=v+'-POSE';});
segWire('lookSeg','look',v=>{state.look=v;$('#looklbl').textContent=v.toUpperCase();rebuild();});
segWire('spinSeg','spin',v=>{state.spin=v==='1';$('#spinlbl').textContent=state.spin?'ON':'OFF';});

const openDrawer=id=>document.querySelectorAll('.drawer').forEach(d=>d.classList.toggle('open',d.id===id&&!d.classList.contains('open')));
$('#histBtn').onclick=()=>openDrawer('histDrawer');
$('#photosBtn').onclick=()=>openDrawer('photoDrawer');
document.querySelectorAll('.slot input').forEach(inp=>inp.addEventListener('change',()=>{const f=inp.files[0];if(!f)return;const img=document.createElement('img');img.src=URL.createObjectURL(f);inp.parentElement.append(img);}));
$('#saveBtn').onclick=()=>{
  const v=(history[0]?.v||0)+1,when=stampNow();
  history.unshift({v,what:`TAPE · ${state.set.toUpperCase()} · 13 SITES`,when});
  store.set('tape',vals);store.set('muscle',muscle);store.set('history',history);
  renderStamp();renderHistory();toast(`SAVED <i>V${v}</i> · ${when} · PREVIOUS VERSION KEPT`);
};

/* HUD rings around the model (SVG), ticks generated here */
(function rings(){
  const svg=$('#rings'),ns='http://www.w3.org/2000/svg';
  const el=(t,a)=>{const e=document.createElementNS(ns,t);for(const k in a)e.setAttribute(k,a[k]);return e;};
  const spin=el('g',{class:'spin'}),spinR=el('g',{class:'spin-r'});
  for(let i=0;i<120;i++){const a=i*3*Math.PI/180,big=i%10===0,r1=big?44.6:46.2,r2=47.5;
    spin.append(el('line',{x1:50+Math.cos(a)*r1,y1:50+Math.sin(a)*r1,x2:50+Math.cos(a)*r2,y2:50+Math.sin(a)*r2,stroke:big?'#f4f4f6':'#80808a',"stroke-width":big?.35:.18,opacity:big?.7:.45}));}
  spin.append(el('circle',{cx:50,cy:50,r:47.6,fill:'none',stroke:'#f4f4f6',"stroke-width":.15,opacity:.35}));
  spin.append(el('path',{d:'M50 2.4 A47.6 47.6 0 0 1 97.6 50',fill:'none',stroke:'#ff1f33',"stroke-width":.7,opacity:.9}));
  spinR.append(el('circle',{cx:50,cy:50,r:42.5,fill:'none',stroke:'#ff1f33',"stroke-width":.25,"stroke-dasharray":'1.2 2.4',opacity:.55}));
  spinR.append(el('path',{d:'M50 7.5 A42.5 42.5 0 0 0 7.5 50',fill:'none',stroke:'#f4f4f6',"stroke-width":.5,opacity:.5}));
  svg.append(spin,spinR,el('circle',{cx:50,cy:50,r:36,fill:'none',stroke:'#f4f4f6',"stroke-width":.12,opacity:.18}));
  [[50,1.5,50,5],[50,95,50,98.5],[1.5,50,5,50],[95,50,98.5,50]].forEach(([x1,y1,x2,y2])=>svg.append(el('line',{x1,y1,x2,y2,stroke:'#ff1f33',"stroke-width":.4,opacity:.8})));
})();

/* =========================================================
   BODY — 3D mannequin (measurement-true placeholder)
   Every girth becomes a real radius: circumference ÷ 2π. The
   Z-Anatomy muscles replace these shapes later; sliders and HUD stay.
   ========================================================= */
const IN=0.0254;
const vp=$('#viewport'),canvas=$('#gl');
let renderer,scene,camera,root,model,armL,armR,parts=[],started=false;
const holoFill=new THREE.MeshBasicMaterial({color:0xff1f33,transparent:true,opacity:0.14,depthWrite:false});
const holoWire=new THREE.MeshBasicMaterial({color:0xff4a58,wireframe:true,transparent:true,opacity:0.42});
const solidMat=new THREE.MeshStandardMaterial({color:0xb01220,roughness:0.5,metalness:0.12});
const mul=g=>1+(muscle[g]-50)/50*0.12;
const rad=(id,side)=>{let v=get(id,side);if(v==null)v=get(id,'R');return v*IN/(2*Math.PI);};
function add(geo,x,y,z,parent=model){
  const m=new THREE.Mesh(geo,state.look==='holo'?holoFill:solidMat);m.position.set(x,y,z);parent.add(m);parts.push(m);
  if(state.look==='holo')m.add(new THREE.Mesh(geo,holoWire));return m;
}
function limb(rTop,rBot,len,parent,y0){add(new THREE.CylinderGeometry(rTop,rBot,len,14,1,true),0,y0-len/2,0,parent);add(new THREE.SphereGeometry(rBot*0.98,10,8),0,y0-len,0,parent);}
function rebuild(){
  if(!started)return;
  parts.forEach(p=>{p.geometry?.dispose();p.parent?.remove(p);});parts=[];
  const rShoulder=rad('shoulders','X'),rChest=rad('chest','X'),rWaist=rad('waist','X'),rHip=rad('hips','X'),rNeck=rad('neck','X')*mul('NECK');
  const prof=[[rHip*0.80,0.80],[rHip*mul('GLUTES'),0.95],[rWaist*mul('OBLIQUES'),1.08],[(rWaist+rChest)/2*mul('LATS'),1.20],[rChest*mul('LATS'),1.31],[rChest*0.95,1.40],[rShoulder*0.62*mul('TRAPS'),1.47],[rNeck*1.6*mul('TRAPS'),1.53]].map(([r,y])=>new THREE.Vector2(r,y));
  const torso=new THREE.LatheGeometry(prof,26),pos=torso.attributes.position;
  for(let i=0;i<pos.count;i++){const y=pos.getY(i),z=pos.getZ(i);let fz=0.66;
    if(z>0)fz*=(y>1.2?mul('CHEST'):mul('ABS'));else fz*=(y>1.2?mul('UPPER BACK'):(y>1.0?mul('LOWER BACK'):mul('GLUTES')));pos.setZ(i,z*fz);}
  torso.computeVertexNormals();
  add(torso,0,0,0);
  add(new THREE.CylinderGeometry(rNeck,rNeck*1.08,0.11,12,1,true),0,1.585,0);
  add(new THREE.SphereGeometry(0.105,14,12),0,1.70,0).scale.set(0.9,1,0.95);
  const half=rShoulder*0.78;
  [[armR,1],[armL,-1]].forEach(([grp,s])=>{
    grp.position.set(s*half,1.445,0);const side=s>0?'R':'L';
    const delt=add(new THREE.SphereGeometry(rShoulder*0.40*mul('SIDE DELTS'),12,10),0,0,0,grp);delt.scale.set(1,1.05,0.9*(mul('FRONT DELTS')+mul('REAR DELTS'))/2);
    const rUp=(rad('bicep',side)*mul('BICEPS')+rad('triceps',side)*mul('TRICEPS'))/2;limb(rUp*0.96,rUp*0.74,0.30,grp,-0.02);
    const rFa=rad('forearm',side)*mul('FOREARMS');limb(rFa,rFa*0.58,0.27,grp,-0.32);
    add(new THREE.SphereGeometry(rFa*0.75,8,6),0,-0.66,0,grp).scale.set(0.8,1.3,0.45);
  });
  [[1,'R'],[-1,'L']].forEach(([s,side])=>{
    const leg=new THREE.Group();leg.position.set(s*rHip*0.52,0.86,0);model.add(leg);parts.push(leg);
    const rQ=rad('quad',side)*(mul('QUADS')+mul('HAMSTRINGS')+mul('ADDUCTORS'))/3;limb(rQ,rQ*0.70,0.42,leg,0);
    const rC=rad('calf',side)*mul('CALVES');limb(rC,rC*0.55,0.40,leg,-0.42);
    add(new THREE.BoxGeometry(0.09,0.05,0.24),0,-0.845,0.06,leg);
  });
}
function sizeRings(){const s=Math.min(vp.clientWidth,vp.clientHeight)*0.94;const r=$('#rings');r.style.width=s+'px';r.style.height=s+'px';}
function resize(){const w=vp.clientWidth,h=vp.clientHeight;if(!w||!h||!renderer)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w/h<1.1?38:30;camera.updateProjectionMatrix();sizeRings();}
let dragging=false,lastX=0,vel=0,armAng=16*Math.PI/180;
function bodyOpened(){
  if(started){resize();return;}
  started=true;
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(30,1,0.1,50);camera.position.set(0,1.02,3.9);camera.lookAt(0,0.95,0);
  root=new THREE.Group();scene.add(root);model=new THREE.Group();root.add(model);armL=new THREE.Group();armR=new THREE.Group();model.add(armL,armR);
  root.add(new THREE.PolarGridHelper(0.62,16,5,48,0x7a1020,0x3a0a12));
  const ring=new THREE.Mesh(new THREE.RingGeometry(0.60,0.625,64),new THREE.MeshBasicMaterial({color:0xff1f33,transparent:true,opacity:0.7,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=0.001;root.add(ring);
  scene.add(new THREE.HemisphereLight(0xffffff,0x200000,0.9));const key=new THREE.DirectionalLight(0xffffff,1.3);key.position.set(1.5,3,2.5);scene.add(key);
  vp.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;vp.classList.add('dragging');vp.setPointerCapture(e.pointerId);});
  vp.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-lastX;lastX=e.clientX;root.rotation.y+=dx*0.01;vel=dx*0.01;});
  const end=()=>{dragging=false;vp.classList.remove('dragging');};vp.addEventListener('pointerup',end);vp.addEventListener('pointercancel',end);
  new ResizeObserver(resize).observe(vp);
  renderEditor();resize();rebuild();
  const rotEl=$('#rot');
  (function frame(){
    if(state.spin&&!dragging)root.rotation.y+=0.004;else if(!dragging){root.rotation.y+=vel;vel*=0.92;}
    const target=(state.pose==='T'?88:16)*Math.PI/180;armAng+=(target-armAng)*0.12;armR.rotation.z=armAng;armL.rotation.z=-armAng;
    const deg=((root.rotation.y*180/Math.PI)%360+360)%360;rotEl.textContent=String(Math.round(deg)).padStart(3,'0')+'°';
    renderer.render(scene,camera);requestAnimationFrame(frame);
  })();
}
onOpen('body',bodyOpened);
}
