/* =========================================================
   PRELOADED FOODS — CLAUDE.md §4.4. Values per 100 g, cooked where GG weighs cooked.
   Source: USDA FoodData Central, SR Legacy. The USDA site could not be reached
   from the build session, so these are the SR Legacy numbers as known to Claude —
   close, but check them against fdc.nal.usda.gov (the id in "source") and fix
   any number in the food's EDIT form. Blank = USDA lists no value (iodine,
   chromium, molybdenum and biotin are blank for nearly all foods).
   Units follow the bars: mg / µg as in nutrient-defs.js (copper in µg).
   ========================================================= */
export const PRELOAD_FOODS=[
  {id:'usda-chicken-breast',name:'CHICKEN BREAST, SKINLESS, ROASTED',brand:'USDA',type:'food',barcode:'',servingG:100,isLiquid:false,
   source:'USDA SR Legacy 171477 (NDB 05064) · approx — check',
   per100g:{kcal:165,protein:31.0,carbs:0,fat:3.6,fiber:0,potassium:256,sodium:74,magnesium:29,calcium:15,zinc:1.0,iron:1.04,selenium:27.6,phosphorus:228,copper:49,manganese:0.017,
            vitA:6,vitC:0,vitD:0.1,vitE:0.27,vitK:0.3,b1:0.07,b2:0.114,b3:13.7,b6:0.6,folate:4,b12:0.34,b5:0.97,choline:85}},
  {id:'usda-beef-shoulder-steak',name:'BEEF SHOULDER STEAK, BONELESS, LEAN, GRILLED',brand:'USDA',type:'food',barcode:'',servingG:100,isLiquid:false,
   source:'USDA SR Legacy, chuck shoulder clod top & center steaks, lean only, grilled · approx — check',
   per100g:{kcal:176,protein:28.0,carbs:0,fat:6.7,fiber:0,potassium:330,sodium:63,magnesium:24,calcium:10,zinc:6.5,iron:2.9,selenium:32,phosphorus:215,copper:90,manganese:0.012,
            vitA:0,vitC:0,vitD:0.1,vitE:0.2,vitK:1.5,b1:0.075,b2:0.22,b3:5.0,b6:0.45,folate:8,b12:2.6,b5:0.65,choline:95}},
  {id:'usda-egg-whole',name:'EGG, WHOLE, LARGE',brand:'USDA',type:'food',barcode:'',servingG:50,isLiquid:false,
   source:'USDA SR Legacy 171287 (NDB 01123), raw · 1 egg = 50 g · approx — check',
   per100g:{kcal:143,protein:12.6,carbs:0.72,fat:9.5,fiber:0,potassium:138,sodium:142,magnesium:12,calcium:56,zinc:1.29,iron:1.75,selenium:30.7,phosphorus:198,copper:72,manganese:0.028,
            vitA:160,vitC:0,vitD:2.0,vitE:1.05,vitK:0.3,b1:0.04,b2:0.457,b3:0.075,b6:0.17,folate:47,b12:0.89,b5:1.53,choline:294}},
  {id:'usda-egg-white',name:'EGG WHITES, LIQUID (CARTON)',brand:'USDA',type:'food',barcode:'',servingG:46,isLiquid:true,
   source:'USDA SR Legacy 171288 (NDB 01124), egg white raw · 3 tbsp = 46 g · approx — check',
   per100g:{kcal:52,protein:10.9,carbs:0.73,fat:0.17,fiber:0,potassium:163,sodium:166,magnesium:11,calcium:7,zinc:0.03,iron:0.08,selenium:20,phosphorus:15,copper:23,manganese:0.011,
            vitA:0,vitC:0,vitD:0,vitE:0,vitK:0,b1:0.004,b2:0.439,b3:0.105,b6:0.005,folate:4,b12:0.09,b5:0.19,choline:1.1}},
  {id:'usda-salmon-atlantic',name:'SALMON, ATLANTIC, FARMED, COOKED',brand:'USDA',type:'food',barcode:'',servingG:100,isLiquid:false,
   source:'USDA SR Legacy 175168 (NDB 15237), dry heat · approx — check',
   per100g:{kcal:206,protein:22.1,carbs:0,fat:12.4,fiber:0,potassium:384,sodium:61,magnesium:30,calcium:15,zinc:0.43,iron:0.34,selenium:41.4,phosphorus:252,copper:54,manganese:0.011,
            vitA:58,vitC:3.7,vitD:11,vitE:3.4,vitK:0.6,b1:0.34,b2:0.155,b3:8.0,b6:0.65,folate:34,b12:2.8,b5:1.55,choline:91}},
  {id:'usda-tuna-light-water',name:'TUNA, LIGHT, CANNED IN WATER, DRAINED',brand:'USDA',type:'food',barcode:'',servingG:85,isLiquid:false,
   source:'USDA SR Legacy (NDB 15121) · drained can ≈ 85 g · approx — check',
   per100g:{kcal:86,protein:19.4,carbs:0,fat:0.96,fiber:0,potassium:179,sodium:247,magnesium:24,calcium:17,zinc:0.69,iron:1.63,selenium:70.6,phosphorus:139,copper:45,manganese:0.012,
            vitA:10,vitC:0,vitD:1.2,vitE:0.33,vitK:0.2,b1:0.03,b2:0.07,b3:11.6,b6:0.32,folate:4,b12:2.5,b5:0.2,choline:29}},
  {id:'usda-rice-white-cooked',name:'JASMINE RICE, COOKED',brand:'USDA',type:'food',barcode:'',servingG:100,isLiquid:false,
   source:'USDA SR Legacy 169756 (NDB 20045), white long-grain cooked — USDA has no jasmine line · approx — check',
   per100g:{kcal:130,protein:2.7,carbs:28.2,fat:0.28,fiber:0.4,potassium:35,sodium:1,magnesium:12,calcium:10,zinc:0.49,iron:1.2,selenium:7.5,phosphorus:43,copper:69,manganese:0.47,
            vitA:0,vitC:0,vitD:0,vitE:0.04,vitK:0,b1:0.163,b2:0.013,b3:1.48,b6:0.093,folate:58,b12:0,b5:0.39,choline:2.1}},
  {id:'usda-sweet-potato-baked',name:'SWEET POTATO, BAKED',brand:'USDA',type:'food',barcode:'',servingG:100,isLiquid:false,
   source:'USDA SR Legacy 168483 (NDB 11508), baked in skin, flesh · approx — check',
   per100g:{kcal:90,protein:2.0,carbs:20.7,fat:0.15,fiber:3.3,potassium:475,sodium:36,magnesium:27,calcium:38,zinc:0.32,iron:0.69,selenium:0.2,phosphorus:54,copper:161,manganese:0.5,
            vitA:961,vitC:19.6,vitD:0,vitE:0.71,vitK:2.3,b1:0.107,b2:0.106,b3:1.49,b6:0.286,folate:6,b12:0,b5:0.88,choline:13.1}},
];

/* CLAUDE.md §3.3: caffeine is logged only through named sources; GG edits these and adds more */
export const CAFFEINE_DEFAULTS=[
  {name:'PRE-WORKOUT',mg:200},
  {name:'BUM ENERGY',mg:125},
];
