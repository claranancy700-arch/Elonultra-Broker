const db = require('../src/db/index.js');
const userId = process.argv[2] || 1;
(async ()=>{
  try{
    const r = await db.query('SELECT id,created_at,type,asset,total,balance_before,balance_after,is_simulated FROM trades WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20',[userId]);
    console.log(JSON.stringify(r.rows,null,2));
  }catch(e){
    console.error('ERR',e && e.message ? e.message : e);
  }finally{ process.exit(0); }
})();
