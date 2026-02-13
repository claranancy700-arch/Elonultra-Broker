const { manualRun } = require('../src/jobs/balanceGrowthSimulator');
const uid = process.argv[2] || 1;
(async ()=>{
  try{
    await manualRun(parseInt(uid,10));
    console.log('manualRun completed for', uid);
  }catch(e){
    console.error('ERR', e && e.message ? e.message : e);
  }finally{ process.exit(0); }
})();
