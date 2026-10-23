const fs=require('fs'),assert=require('assert/strict');
const setup=fs.readFileSync(__dirname+'/long-horizon.cjs','utf8').split('let oldGame;')[0];
function engine(html){return new Function('require','process','__dirname',setup+';return {game,audit,document};')(require,{env:html?{EVERWORLD_HTML:html}:{}},__dirname)}
const current=engine(),reference=process.env.REFERENCE_HTML?engine(process.env.REFERENCE_HTML):null;
for(const seed of [1840,7]){
 current.game.reset(seed);reference?.game.reset(seed);
 // A complete day must work without DOM access.
 const old=current.document.getElementById;current.document.getElementById=()=>{throw Error('DOM accessed from simulation')};
 for(let i=0;i<365;i++){
  current.audit.dailyStep();reference?.audit.dailyStep();
  if(reference&&i%30===0)assert.equal(JSON.stringify(current.game.world()),JSON.stringify(reference.game.world()),`Full state diverged: seed ${seed}, day ${i+1}`);
 }
 current.document.getElementById=old;
 if(reference)assert.equal(JSON.stringify(current.game.world()),JSON.stringify(reference.game.world()));
 console.log(reference?'PASS DOM-free atomic day and full-state parity':'PASS DOM-free atomic day (set REFERENCE_HTML for parity)',seed,365);
}
