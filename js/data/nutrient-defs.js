/* =========================================================
   NUTRIENT DEFINITIONS — the 34 bars, in display order.
   target / min / max are the defaults (CLAUDE.md §4.2 and §4.3: US DRIs, men 19–30).
   min = the "too little" line (red only after the day ends);
   max = the "too high" line (red the moment it is crossed); null = no line.
   maxSupplementsOnly: that upper limit counts only foods typed SUPPLEMENT
   (magnesium, niacin, folate — their ULs apply to supplements, not food).
   ========================================================= */
export const NUTRIENTS=[
  {key:'kcal',      label:'CALORIES',       unit:'kcal',group:'daily',  target:2000,rule:'pct5'},
  {key:'protein',   label:'PROTEIN',        unit:'g',   group:'daily',  target:190, min:175, max:200},
  {key:'carbs',     label:'CARBS',          unit:'g',   group:'daily',  target:190, min:175, max:205},
  {key:'fat',       label:'FAT',            unit:'g',   group:'daily',  target:50,  min:40,  max:60},
  {key:'fiber',     label:'FIBER',          unit:'g',   group:'daily',  target:30,  min:30,  max:null},
  {key:'water',     label:'WATER',          unit:'oz',  group:'daily',  target:128, min:128, max:null, logged:'water'},
  {key:'caffeine',  label:'CAFFEINE',       unit:'mg',  group:'daily',  target:200, min:null,max:200,  logged:'caffeine'},
  {key:'potassium', label:'POTASSIUM',      unit:'mg',  group:'mineral',target:3400,max:null},
  {key:'sodium',    label:'SODIUM',         unit:'mg',  group:'mineral',target:1500,max:2300},
  {key:'magnesium', label:'MAGNESIUM',      unit:'mg',  group:'mineral',target:400, max:350,  maxSupplementsOnly:true},
  {key:'calcium',   label:'CALCIUM',        unit:'mg',  group:'mineral',target:1000,max:2500},
  {key:'zinc',      label:'ZINC',           unit:'mg',  group:'mineral',target:11,  max:40},
  {key:'iron',      label:'IRON',           unit:'mg',  group:'mineral',target:8,   max:45},
  {key:'selenium',  label:'SELENIUM',       unit:'µg',  group:'mineral',target:55,  max:400},
  {key:'phosphorus',label:'PHOSPHORUS',     unit:'mg',  group:'mineral',target:700, max:4000},
  {key:'iodine',    label:'IODINE',         unit:'µg',  group:'mineral',target:150, max:1100},
  {key:'copper',    label:'COPPER',         unit:'µg',  group:'mineral',target:900, max:10000},
  {key:'manganese', label:'MANGANESE',      unit:'mg',  group:'mineral',target:2.3, max:11},
  {key:'chromium',  label:'CHROMIUM',       unit:'µg',  group:'mineral',target:35,  max:null},
  {key:'molybdenum',label:'MOLYBDENUM',     unit:'µg',  group:'mineral',target:45,  max:2000},
  {key:'vitA',      label:'VITAMIN A',      unit:'µg',  group:'vitamin',target:900, max:3000},
  {key:'vitC',      label:'VITAMIN C',      unit:'mg',  group:'vitamin',target:90,  max:2000},
  {key:'vitD',      label:'VITAMIN D',      unit:'µg',  group:'vitamin',target:15,  max:100,  note:'15 µg = 600 IU · 100 µg = 4,000 IU'},
  {key:'vitE',      label:'VITAMIN E',      unit:'mg',  group:'vitamin',target:15,  max:1000},
  {key:'vitK',      label:'VITAMIN K',      unit:'µg',  group:'vitamin',target:120, max:null},
  {key:'b1',        label:'B1 THIAMIN',     unit:'mg',  group:'vitamin',target:1.2, max:null},
  {key:'b2',        label:'B2 RIBOFLAVIN',  unit:'mg',  group:'vitamin',target:1.3, max:null},
  {key:'b3',        label:'B3 NIACIN',      unit:'mg',  group:'vitamin',target:16,  max:35,   maxSupplementsOnly:true},
  {key:'b6',        label:'B6',             unit:'mg',  group:'vitamin',target:1.3, max:100},
  {key:'folate',    label:'FOLATE',         unit:'µg',  group:'vitamin',target:400, max:1000, maxSupplementsOnly:true},
  {key:'b12',       label:'B12',            unit:'µg',  group:'vitamin',target:2.4, max:null},
  {key:'b5',        label:'B5 PANTOTHENIC', unit:'mg',  group:'vitamin',target:5,   max:null},
  {key:'b7',        label:'B7 BIOTIN',      unit:'µg',  group:'vitamin',target:30,  max:null},
  {key:'choline',   label:'CHOLINE',        unit:'mg',  group:'vitamin',target:550, max:3500},
];
export const GROUP_LABEL={daily:'MACROS · WATER · CAFFEINE',mineral:'MINERALS',vitamin:'VITAMINS'};
export const FOOD_KEYS=NUTRIENTS.filter(n=>!n.logged).map(n=>n.key);        // the 32 values a food can carry (per 100 g)
export const byKey=Object.fromEntries(NUTRIENTS.map(n=>[n.key,n]));

/* The band rule for a nutrient, given its target:
   calories ±5%; minerals and vitamins min = target (max = the UL); the rest have fixed lines. */
export function derive(def,target){
  if(def.rule==='pct5')return {target,min:Math.round(target*0.95),max:Math.round(target*1.05)};
  if(def.group!=='daily')return {target,min:target,max:def.max??null};
  return {target,min:def.min??null,max:def.max??null};
}
export const defaultTargets=()=>Object.fromEntries(NUTRIENTS.map(n=>[n.key,derive(n,n.target)]));
