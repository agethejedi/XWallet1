
class RiskXProvider { constructor(){ this.isRiskX=true; this.selectedAddress=null; this.chainId='0x1'; }
  async request({method, params}){
    if (method==='eth_sendTransaction' || method==='eth_sign' || method==='eth_signTypedData_v4') {
      const tx=(params&&params[0])||{}; const context={origin:location.hostname, from:this.selectedAddress};
      window.postMessage({type:'RXL:SIMULATE', payload:{method, tx, context, chainId:this.chainId}}, '*');
      const decision = await new Promise((resolve)=>{ const handler=(e)=>{ if(e.source!==window) return;
        if(e.data?.type==='RXL:CANCEL_TX'){ window.removeEventListener('message',handler); resolve({ok:false}); }
        if(e.data?.type==='RXL:OVERRIDE_TX'){ window.removeEventListener('message',handler); resolve({ok:true}); } };
        window.addEventListener('message', handler); });
      if (!decision.ok) throw new Error('User rejected by SafeSend'); return '0x'+'deadbeef'.repeat(8);
    }
    throw new Error('Method not implemented: '+method);
  }}
(function(){ const p=new RiskXProvider(); if(!window.ethereum) Object.defineProperty(window,'ethereum',{value:p,writable:false}); window.riskx=p; window.dispatchEvent(new Event('ethereum#initialized')); })();
window.addEventListener('message',(ev)=>{ if(ev.source!==window) return; if(ev.data?.type==='RXL:SIMULATE'){ chrome.runtime.sendMessage({type:'SIMULATE_TX', payload:ev.data.payload}, (resp)=>{ if (chrome.runtime.lastError) return; window.postMessage({type:'RXL:SHOW_REPORT', payload: resp}, '*'); }); } });
