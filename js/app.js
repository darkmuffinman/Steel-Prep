/* =========================================================
   STEEL PREP — boot
   Opens the on-device database first, then starts each screen.
   Each screen starts on its own, so one failing cannot take the
   menu down with it. Everything else lives in the other js files:
     ui.js         shared helpers, screen switching, sheets
     db.js         the database (IndexedDB) and the settings cache
     menu.js       countdown, date, clock, the drum of tabs
     body.js       the Body HUD + placeholder mannequin (slice 1)
     nutrients.js  bars, targets, catalog, daily log, water, caffeine (slice 2)
     data/         nutrient definitions and the preloaded foods
   ========================================================= */
import {db} from './db.js';
import {wireScreens,toast} from './ui.js';
import {initMenu} from './menu.js';
import {initBody} from './body.js';
import {initNutrients} from './nutrients.js';

await db.open();                                   // "await": wait for the database before any screen reads it
wireScreens();
const start=async(name,fn)=>{try{await fn();}catch(e){console.error(name+' failed to start',e);toast(`<i>${name.toUpperCase()}</i> FAILED TO START · SEE CONSOLE`);}};
await start('menu',initMenu);
await start('body',initBody);
await start('nutrients',initNutrients);
if(!db.available)toast('STORAGE UNAVAILABLE · THIS SESSION WILL NOT BE KEPT');
