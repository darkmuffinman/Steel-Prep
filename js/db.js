/* =========================================================
   DATA LAYER — IndexedDB, the database built into the browser.
   Everything the app remembers lives here, on the device only.
   One database "steelprep" with one store (a table) per kind of record.
   Calls return promises (the browser answers a moment later), except
   settings, which are also kept in memory so screens can read them at once.
   If IndexedDB is unavailable (some private windows), a memory-only
   fallback keeps the app usable for the session; nothing is kept then.
   ========================================================= */
const NAME='steelprep',VERSION=2;      // 2: workouts (slice W1). Raising VERSION makes the browser call onupgradeneeded, which adds the new stores
const STORES={
  settings:       {keyPath:'key'},                                        // {key, value}: compDate, targets, caffeineCutoff…
  foods:          {keyPath:'id',indexes:{barcode:'barcode',name:'name'}},
  foodLog:        {keyPath:'id',autoIncrement:true,indexes:{day:'day'}},
  waterLog:       {keyPath:'id',autoIncrement:true,indexes:{day:'day'}},
  caffeineSources:{keyPath:'id',autoIncrement:true},
  caffeineLog:    {keyPath:'id',autoIncrement:true,indexes:{day:'day'}},
  measurements:   {keyPath:'v'},                                          // filled in slice 4
  muscleTune:     {keyPath:'group'},                                      // filled in slice 4
  weights:        {keyPath:'date'},                                       // filled in slice 4
  scans:          {keyPath:'date'},                                       // filled in slice 4
  photos:         {keyPath:'id',autoIncrement:true},                      // filled in slice 4
  workoutSplits:  {keyPath:'id'},                                         // the plan per split: 7 days of label / rest / movements
  workoutSessions:{keyPath:'date'},                                       // what happened on a calendar day: sets, weights, notes, completed
  meta:           {keyPath:'key'},                                        // schemaVersion, migrated, seeded
};
let idb=null;                       // the open database, or null in fallback mode
const mem={};                       // fallback: one Map per store
const cache={};                     // settings in memory: {key: value}
const wrap=r=>new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});
const os=(store,mode='readonly')=>idb.transaction(store,mode).objectStore(store);
const keyOf=(store,v)=>v[STORES[store].keyPath];

export const db={
  available:false,
  async open(){
    try{
      if(!('indexedDB' in window))throw new Error('no IndexedDB');
      idb=await new Promise((res,rej)=>{
        const r=indexedDB.open(NAME,VERSION);
        r.onupgradeneeded=()=>{                                  // runs once, when the database is first created (or VERSION grows)
          const d=r.result;
          for(const [name,def] of Object.entries(STORES)){
            if(d.objectStoreNames.contains(name))continue;
            const s=d.createObjectStore(name,{keyPath:def.keyPath,autoIncrement:!!def.autoIncrement});
            for(const [ix,path] of Object.entries(def.indexes||{}))s.createIndex(ix,path);
          }
        };
        r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);r.onblocked=()=>rej(new Error('blocked'));
      });
      this.available=true;
    }catch(e){
      console.warn('IndexedDB unavailable — running from memory for this session',e);
      idb=null;this.available=false;
    }
    if(!idb)for(const n in STORES)mem[n]=new Map();
    await migrateLocalStorage();
    for(const row of await this.all('settings'))cache[row.key]=row.value;
    const sv=await this.get('meta','schemaVersion');
    if(!sv||sv.value<VERSION)await this.put('meta',{key:'schemaVersion',value:VERSION});
  },
  get(store,key){return idb?wrap(os(store).get(key)):Promise.resolve(mem[store].get(key));},
  all(store){return idb?wrap(os(store).getAll()):Promise.resolve([...mem[store].values()]);},
  byIndex(store,index,value){
    if(idb)return wrap(os(store).index(index).getAll(value));
    const path=STORES[store].indexes[index];return Promise.resolve([...mem[store].values()].filter(r=>r[path]===value));
  },
  put(store,value){                                            // add or replace; resolves to the record's key (new ids are handed out here)
    const kp=STORES[store].keyPath;
    if(value[kp]==null)delete value[kp];                       // "no id yet" must be a missing property, or the browser refuses it
    if(idb)return wrap(os(store,'readwrite').put(value));
    let k=value[kp];
    if(k==null){k=1;for(const x of mem[store].keys())if(typeof x==='number'&&x>=k)k=x+1;value[kp]=k;}
    mem[store].set(k,value);return Promise.resolve(k);
  },
  del(store,key){return idb?wrap(os(store,'readwrite').delete(key)):Promise.resolve(mem[store].delete(key));},
  /* settings: read at once from memory, written through to the database */
  setting(key,def){return key in cache?cache[key]:def;},
  setSetting(key,value){cache[key]=value;return this.put('settings',{key,value});},
};
/* slice 1 called this "store"; same two calls, now backed by the database */
export const store={get:(k,d)=>db.setting(k,d),set:(k,v)=>{db.setSetting(k,v);}};

/* Slice 1 kept four keys in localStorage (steelprep.compDate / tape / muscle / history).
   Copy them in once, never over real data, and leave the originals as a safety copy. */
async function migrateLocalStorage(){
  if(await db.get('meta','migrated'))return;
  for(const k of ['compDate','tape','muscle','history']){
    let raw=null;try{raw=localStorage.getItem('steelprep.'+k);}catch{}
    if(raw==null||await db.get('settings',k))continue;
    try{await db.put('settings',{key:k,value:JSON.parse(raw)});}catch{}
  }
  await db.put('meta',{key:'migrated',value:true,when:Date.now()});
}
