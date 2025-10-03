
async function getProxyUrl(){ return new Promise(res=>chrome.storage.sync.get({proxyUrl:'http://localhost:8787'},v=>res(v.proxyUrl))); }
async function getSubUrl(){ return new Promise(res=>chrome.storage.sync.get({subUrl:'http://localhost:8788'},v=>res(v.subUrl))); }
chrome.runtime.onMessage.addListener((msg,_sender,send)=>{ (async()=>{
  if (msg?.type==='SIMULATE_TX'){ const proxy=await getProxyUrl(); const r=await fetch(proxy+'/safesend',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(msg.payload)}); const j=await r.json(); send(j); }
  if (msg?.type==='CHECK_EVM_SUB'){ const sub=await getSubUrl(); const u=new URL(sub+'/evm/sub/active'); u.searchParams.set('chain', msg.chain); u.searchParams.set('address', msg.address); u.searchParams.set('tier', String(msg.tier||1)); const r=await fetch(u.toString()); const j=await r.json(); send(j); }
  if (msg?.type==='GET_EVM_TIER'){ const sub=await getSubUrl(); const u=new URL(sub+'/evm/sub/tier'); u.searchParams.set('chain', msg.chain); u.searchParams.set('tier', String(msg.tier||1)); const r=await fetch(u.toString()); const j=await r.json(); send(j); }
  if (msg?.type==='VERIFY_SOL'){ const sub=await getSubUrl(); const r=await fetch(sub+'/sol/verify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(msg.payload)}); const j=await r.json(); send(j); }
  if (msg?.type==='BTC_TX'){ const sub=await getSubUrl(); const u=new URL(sub+'/btc/tx'); u.searchParams.set('txid', msg.txid); const r=await fetch(u.toString()); const j=await r.json(); send(j); }
})();
return true; });
