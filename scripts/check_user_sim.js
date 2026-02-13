const db = require('../src/db/index.js');
const userId = process.argv[2] || 1;
(async ()=>{
  try{
    const r = await db.query('SELECT id,email,balance,sim_enabled,sim_paused,sim_next_run_at,sim_last_run_at FROM users WHERE id=$1',[userId]);
    console.log(JSON.stringify(r.rows,null,2));
  }catch(e){
    console.error('ERR',e && e.message ? e.message : e);
  }finally{ process.exit(0); }
})();
