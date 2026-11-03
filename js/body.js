import * as THREE from '../vendor/three.module.min.js';   // three.js 0.160 (MIT), shipped in /vendor
import {$,toast,esc,stampNow,onOpen} from './ui.js';
import {store} from './db.js';
import {loadGLB} from './glb.js';
import {MUSCLES} from './data/muscle-map.js';

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
const vals=store.get('tape',structuredClone({relaxed:baseRelaxed,flexed:baseFlexed}));   // a copy: baseRelaxed stays the Oct 26 baseline the model is calibrated to
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
segWire('poseSeg','pose',v=>{
  if(real&&v==='T'){toast('T-POSE COMES WITH THE RIG · <i>LATER</i>');$('#poseSeg button[data-pose="A"]').click();return;}   // the real muscles have no rig yet
  state.pose=v;$('#poselbl').textContent=v+'-POSE';});
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

/* =========================================================
   BODY — the Z-Anatomy model (slice 7)
   assets/body.glb holds 1,510 muscle meshes. The ones listed in
   data/muscle-map.js are merged into ONE mesh (one draw call) and kept
   in two copies: the resting shape and the live one. Each driver (a tape
   site or a MUSCLE slider) pushes its muscles out or in along the resting
   normals: offset = Σ weight × amount. Tape: 1 inch of girth = 1/(2π) inch
   of radius, 1:1, no cap. MUSCLE: 0–100 → ±12% of the muscle's own
   thickness. Leg length and wingspan stretch the limb parts from the hip
   and shoulder lines. The mannequin stays as the fallback if the file
   cannot load (for example when the page is opened straight from a folder).
   ========================================================= */
let real=null;                                              // the loaded model, or null while loading / if it failed
const IN2M=0.0254,HEIGHT_M=(5*12+11)*IN2M;                  // GG is 5'11"; the model is scaled to that
const GROUP_SET=new Set(GROUPS);
const holoMat=new THREE.ShaderMaterial({                    // hologram: bright where the surface turns away from you
  uniforms:{color:{value:new THREE.Color(0xff1f33)}},
  vertexShader:'varying vec3 vN,vV;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
  fragmentShader:'uniform vec3 color;varying vec3 vN,vV;void main(){float f=pow(1.0-abs(dot(normalize(vN),normalize(vV))),2.2);gl_FragColor=vec4(color*(0.22+1.1*f),0.10+0.85*f);}',
  transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
const solidReal=new THREE.MeshStandardMaterial({color:0xb01220,roughness:0.55,metalness:0.1});

async function loadModel(){
  const info=$('#modelInfo');
  try{
    const glb=await loadGLB(window.STEELPREP_MODEL||'assets/body.glb',(got,total)=>{   // a host that cannot serve .glb (the claude.ai preview) names another path
      info.innerHTML=`MODEL · <b>LOADING ${total?Math.round(got/total*100)+'%':(got/1e6).toFixed(1)+' MB'}</b><br>Z-ANATOMY · <i>CC BY-SA 4.0</i>`;});
    const want=new Map(MUSCLES.map(m=>[m.n,m]));
    const segs=[];let nV=0,nI=0;
    for(const mesh of glb.meshes){const m=want.get(mesh.name);if(!m)continue;for(const p of mesh.primitives){segs.push({m,mesh,p});nV+=p.pos.length/3;nI+=p.idx.length;}}
    if(!segs.length)throw new Error('none of the mapped muscles are in the file');
    const pos=new Float32Array(nV*3),nrm=new Float32Array(nV*3),idx=new Uint32Array(nI),vPart=new Uint16Array(nV);
    const M=new THREE.Matrix4(),N=new THREE.Matrix3(),v=new THREE.Vector3();
    let vo=0,io=0;
    for(let i=0;i<segs.length;i++){                          // copy every muscle in, in world space
      const {mesh,p}=segs[i];M.fromArray(mesh.matrix);N.getNormalMatrix(M);
      const n=p.pos.length/3;
      for(let k=0;k<n;k++){
        v.set(p.pos[3*k],p.pos[3*k+1],p.pos[3*k+2]).applyMatrix4(M);pos[3*(vo+k)]=v.x;pos[3*(vo+k)+1]=v.y;pos[3*(vo+k)+2]=v.z;
        if(p.nrm)v.set(p.nrm[3*k],p.nrm[3*k+1],p.nrm[3*k+2]).applyMatrix3(N).normalize();else v.set(0,1,0);
        nrm[3*(vo+k)]=v.x;nrm[3*(vo+k)+1]=v.y;nrm[3*(vo+k)+2]=v.z;
        vPart[vo+k]=i;
      }
      for(let k=0;k<p.idx.length;k++)idx[io+k]=vo+p.idx[k];
      segs[i].v0=vo;segs[i].v1=vo+n;segs[i].i0=io;segs[i].i1=io+p.idx.length;vo+=n;io+=p.idx.length;
    }
    let minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9,minZ=1e9,maxZ=-1e9;   // scale to GG's height, feet on the floor, centred
    for(let k=0;k<nV;k++){const x=pos[3*k],y=pos[3*k+1],z=pos[3*k+2];if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;if(z<minZ)minZ=z;if(z>maxZ)maxZ=z;}
    const s=HEIGHT_M/(maxY-minY),cx=(minX+maxX)/2,cz=(minZ+maxZ)/2;
    for(let k=0;k<nV;k++){pos[3*k]=(pos[3*k]-cx)*s;pos[3*k+1]=(pos[3*k+1]-minY)*s;pos[3*k+2]=(pos[3*k+2]-cz)*s;}
    let flipped=0;
    for(const sg of segs){                                   // each muscle's bounds and thickness (half its smallest extent)
      const a=[1e9,1e9,1e9],b=[-1e9,-1e9,-1e9],c=[0,0,0];
      for(let k=sg.v0;k<sg.v1;k++)for(let d=0;d<3;d++){const x=pos[3*k+d];if(x<a[d])a[d]=x;if(x>b[d])b[d]=x;c[d]+=x;}
      sg.min=a;sg.max=b;sg.r=Math.min(0.08,Math.max(0.01,0.5*Math.min(b[0]-a[0],b[1]-a[1],b[2]-a[2])));
      // some Z-Anatomy meshes are inside out (normals point in). Test: do most normals point away from the centre?
      const n=sg.v1-sg.v0;c[0]/=n;c[1]/=n;c[2]/=n;let out=0;
      for(let k=sg.v0;k<sg.v1;k++)if(nrm[3*k]*(pos[3*k]-c[0])+nrm[3*k+1]*(pos[3*k+1]-c[1])+nrm[3*k+2]*(pos[3*k+2]-c[2])>0)out++;
      sg.outward=out/n;
      if(sg.outward<0.5){                                    // flip the normals and the triangle winding so lighting agrees
        for(let k=sg.v0;k<sg.v1;k++){nrm[3*k]=-nrm[3*k];nrm[3*k+1]=-nrm[3*k+1];nrm[3*k+2]=-nrm[3*k+2];}
        for(let t=sg.i0;t<sg.i1;t+=3){const tmp=idx[t+1];idx[t+1]=idx[t+2];idx[t+2]=tmp;}
        sg.outward=1-sg.outward;flipped++;
      }
    }
    const topOf=(key,side)=>{let y=-1e9;for(const sg of segs)if(sg.m.g[key]&&sg.m.s===side)y=Math.max(y,sg.max[1]);return y>-1e8?y:HEIGHT_M*0.52;};
    const pivots={hip:{L:topOf('quad','L'),R:topOf('quad','R')},shoulder:{L:topOf('shoulders','L'),R:topOf('shoulders','R')}};
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    geo.setAttribute('normal',new THREE.BufferAttribute(nrm.slice(),3));
    geo.setIndex(new THREE.BufferAttribute(idx,1));
    const mesh=new THREE.Mesh(geo,state.look==='holo'?holoMat:solidReal);
    real={mesh,geo,segs,vPart,nV,base:{pos:pos.slice(),nrm},pivots,tris:nI/3,flipped};
    parts.forEach(p=>{p.geometry?.dispose();p.parent?.remove(p);});parts=[];   // the mannequin bows out
    model.add(mesh);
    applyShape();
    info.innerHTML=`MODEL · <b>Z-ANATOMY</b> · ${segs.length} MUSCLES<br>CC BY-SA 4.0 · <i>${Math.round(real.tris/1000)}K TRIANGLES</i>`;
  }catch(e){
    console.warn('body model: keeping the mannequin',e);
    info.innerHTML='MODEL · <b>PLACEHOLDER</b><br>Z-ANATOMY · <i>NOT LOADED</i>';
    toast(`3D MODEL NOT LOADED · <i>${esc(e.message||e)}</i>`,9000);
  }
}
function drivers(){                                         // how far each driver moves its muscles, from the editor's values
  const site={},len={},grp={};
  const girth=(id,sd)=>{let x=get(id,sd);if(x==null&&sd==='L')x=get(id,'R');return x;};            // blank left mirrors right
  const baseOf=(id,sd)=>{const b=baseRelaxed[id];return (b&&typeof b==='object')?(b[sd]??b.R):b;};   // Oct 26 = as modelled
  for(const st of SITES)for(const sd of (st.sides?['L','R']:['X'])){
    const key=st.sides?`${st.id}|${sd}`:st.id,b=baseOf(st.id,sd);
    site[key]=((girth(st.id,sd)??b)-b)*IN2M/(2*Math.PI);                                           // inches of girth → metres of radius
  }
  for(const sd of ['L','R'])len['leglen|'+sd]=(girth('leglen',sd)??baseOf('leglen',sd))/baseOf('leglen',sd);
  len.wingspan=(girth('wingspan','X')??baseOf('wingspan','X'))/baseOf('wingspan','X');
  for(const g of GROUPS)grp[g]=(muscle[g]-50)/50*0.12;
  return {site,len,grp};
}
function applyShape(){
  if(!real)return;
  const {site,len,grp}=drivers(),{segs,vPart,nV,base,geo,pivots}=real,p=geo.attributes.position.array;
  const amt=new Float32Array(segs.length),leg=new Float32Array(segs.length),arm=new Float32Array(segs.length);
  segs.forEach((sg,i)=>{
    const side=sg.m.s==='C'?'R':sg.m.s;let a=0;
    for(const key in sg.m.g){
      const w=sg.m.g[key];
      if(key==='leglen')leg[i]=len['leglen|'+side];
      else if(key==='wingspan')arm[i]=len.wingspan;
      else if(GROUP_SET.has(key))a+=w*grp[key]*sg.r;
      else a+=w*(site[key]??site[key+'|'+side]??0);
    }
    amt[i]=a;
  });
  for(let k=0;k<nV;k++){
    const i=vPart[k],a=amt[i];
    let x=base.pos[3*k]+base.nrm[3*k]*a,y=base.pos[3*k+1]+base.nrm[3*k+1]*a,z=base.pos[3*k+2]+base.nrm[3*k+2]*a;
    if(leg[i]&&leg[i]!==1){const py=pivots.hip[segs[i].m.s==='L'?'L':'R'];y=py-(py-y)*leg[i];}
    if(arm[i]&&arm[i]!==1){const py=pivots.shoulder[segs[i].m.s==='L'?'L':'R'];y=py-(py-y)*arm[i];}
    p[3*k]=x;p[3*k+1]=y;p[3*k+2]=z;
  }
  geo.attributes.position.needsUpdate=true;
  geo.computeVertexNormals();geo.computeBoundingSphere();
}
/* for the headless checks: size of the muscles a driver moves */
window.steelprepModel=()=>real&&{muscles:real.segs.length,tris:real.tris,vertices:real.nV,flipped:real.flipped,drivers,value:get,
  part(name){const sg=real.segs.find(s=>s.m.name===name||s.m.n===name);if(!sg)return null;const p=real.geo.attributes.position.array;let a=[1e9,1e9,1e9],b=[-1e9,-1e9,-1e9];for(let k=sg.v0;k<sg.v1;k++)for(let d=0;d<3;d++){const x=p[3*k+d];if(x<a[d])a[d]=x;if(x>b[d])b[d]=x;}return {g:sg.m.g,s:sg.m.s,r:sg.r,outward:sg.outward,extent:[b[0]-a[0],b[1]-a[1],b[2]-a[2]],min:a};},
  orient(key,side){return Math.min(...real.segs.filter(sg=>sg.m.g[key]&&(!side||sg.m.s===side)).map(sg=>sg.outward));},
  extent(key,side){let a=[1e9,1e9,1e9],b=[-1e9,-1e9,-1e9];const p=real.geo.attributes.position.array;
    for(const sg of real.segs){if(!sg.m.g[key]||(side&&sg.m.s!==side))continue;for(let k=sg.v0;k<sg.v1;k++)for(let d=0;d<3;d++){const x=p[3*k+d];if(x<a[d])a[d]=x;if(x>b[d])b[d]=x;}}
    return [b[0]-a[0],b[1]-a[1],b[2]-a[2]];}};

function rebuild(){
  if(!started)return;
  if(real){real.mesh.material=state.look==='holo'?holoMat:solidReal;applyShape();return;}
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
  loadModel();                                              // the Z-Anatomy muscles replace the mannequin once the file is in
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
