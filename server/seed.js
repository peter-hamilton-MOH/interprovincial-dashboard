import { initDatabase } from './db.js';

const db = initDatabase(true);
const itemCnt = db.prepare('SELECT COUNT(*) as c FROM intelligence_items').get().c;
const dashCnt = db.prepare('SELECT COUNT(*) as c FROM funding_dashboard').get().c;
const catCnt = db.prepare('SELECT COUNT(*) as c FROM funding_category').get().c;
const ageCnt = db.prepare('SELECT COUNT(*) as c FROM funding_age_sex').get().c;

console.log({
  intelligence_items: itemCnt,
  funding_dashboard: dashCnt,
  funding_category: catCnt,
  funding_age_sex: ageCnt,
});
