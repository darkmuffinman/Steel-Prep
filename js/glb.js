/* =========================================================
   GLB READER — just enough for our own model file.
   A .glb is a small box: a 12-byte header, a JSON chunk that describes the
   scene (nodes, meshes, where each list of numbers lives), and a binary
   chunk holding the numbers themselves. Our file (from tools/blender-export.py)
   uses only positions, normals and triangle indices, no compression, so a
   full loader library is not needed. Returns every mesh with its world matrix.
   ========================================================= */
const JSON_CHUNK=0x4E4F534A,BIN_CHUNK=0x004E4942;
const TYPED={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array};
const SIZE={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};

export async function loadGLB(url,onProgress){
  const res=await fetch(url);
  if(!res.ok)throw new Error(`${url}: HTTP ${res.status}`);
  if(!res.body||!onProgress)return parseGLB(await res.arrayBuffer());
  const total=+res.headers.get('content-length')||0,reader=res.body.getReader(),chunks=[];let got=0;   // stream it so the HUD can show progress
  for(;;){const {done,value}=await reader.read();if(done)break;chunks.push(value);got+=value.length;onProgress(got,total);}
  const buf=new Uint8Array(got);let o=0;for(const c of chunks){buf.set(c,o);o+=c.length;}
  return parseGLB(buf.buffer);
}

export function parseGLB(buf){
  const dv=new DataView(buf);
  if(dv.getUint32(0,true)!==0x46546C67)throw new Error('not a GLB file');          // "glTF"
  let off=12,json=null,bin=null;
  while(off<buf.byteLength){
    const len=dv.getUint32(off,true),type=dv.getUint32(off+4,true);off+=8;
    if(type===JSON_CHUNK)json=JSON.parse(new TextDecoder().decode(new Uint8Array(buf,off,len)));
    else if(type===BIN_CHUNK)bin=new Uint8Array(buf,off,len);
    off+=len;
  }
  if(!json||!bin)throw new Error('GLB is missing a chunk');
  const accessor=i=>{                                                              // one list of numbers → a typed array view
    const a=json.accessors[i],bv=json.bufferViews[a.bufferView],T=TYPED[a.componentType],n=SIZE[a.type];
    if(bv.byteStride&&bv.byteStride!==n*T.BYTES_PER_ELEMENT)throw new Error('interleaved buffers are not supported');
    const start=bin.byteOffset+(bv.byteOffset||0)+(a.byteOffset||0);
    return new T(bin.buffer,start,a.count*n);
  };
  const nodes=json.nodes,parent=new Int32Array(nodes.length).fill(-1);
  nodes.forEach((n,i)=>(n.children||[]).forEach(c=>parent[c]=i));
  const world=new Array(nodes.length);
  const worldOf=i=>world[i]||(world[i]=parent[i]<0?local(nodes[i]):mul(worldOf(parent[i]),local(nodes[i])));
  const meshes=[];
  nodes.forEach((n,i)=>{
    if(n.mesh==null)return;
    meshes.push({name:n.name||`node${i}`,matrix:worldOf(i),
      primitives:json.meshes[n.mesh].primitives.map(p=>({pos:accessor(p.attributes.POSITION),nrm:p.attributes.NORMAL!=null?accessor(p.attributes.NORMAL):null,idx:accessor(p.indices)}))});
  });
  return {json,meshes};
}

/* 4×4 matrices as 16 numbers, column by column (the glTF and three.js convention) */
function local(n){
  if(n.matrix)return Float64Array.from(n.matrix);
  const [tx,ty,tz]=n.translation||[0,0,0],[qx,qy,qz,qw]=n.rotation||[0,0,0,1],[sx,sy,sz]=n.scale||[1,1,1];
  const xx=qx*qx,yy=qy*qy,zz=qz*qz,xy=qx*qy,xz=qx*qz,yz=qy*qz,wx=qw*qx,wy=qw*qy,wz=qw*qz;
  return Float64Array.from([
    (1-2*(yy+zz))*sx,(2*(xy+wz))*sx,(2*(xz-wy))*sx,0,
    (2*(xy-wz))*sy,(1-2*(xx+zz))*sy,(2*(yz+wx))*sy,0,
    (2*(xz+wy))*sz,(2*(yz-wx))*sz,(1-2*(xx+yy))*sz,0,
    tx,ty,tz,1]);
}
function mul(a,b){                                                                 // a × b
  const o=new Float64Array(16);
  for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s;}
  return o;
}
