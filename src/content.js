
(() => { const s=document.createElement('script'); s.src=chrome.runtime.getURL('src/injected.js'); s.type='module'; (document.head||document.documentElement).appendChild(s); s.onload=()=>s.remove(); })();
const overlay=document.createElement('div'); overlay.id='riskx-overlay'; overlay.attachShadow({mode:'open'}); document.documentElement.appendChild(overlay);
overlay.shadowRoot.innerHTML=`
<link rel="stylesheet" href="${chrome.runtime.getURL('styles/overlay.css')}">
<div id="riskx-panel">
  <div id="riskx-header"><div>SafeSend <span style='color:var(--neon)'>™</span></div><div id="riskx-close">✕</div></div>
  <div id="riskx-riskbar"><div class="dot" style="left:70%"></div></div>
  <div id="riskx-summary"></div>
  <div id="riskx-details"></div>
  <div style="display:flex;gap:12px;margin-top:12px;">
    <button class="riskx-btn" id="riskx-cancel">Cancel</button>
    <button class="riskx-btn primary" id="riskx-override">Override & Send</button>
  </div>
  <div class="riskx-meta">X‑Wallet by RiskXLabs</div>
</div>`;
const root=overlay.shadowRoot;
root.getElementById('riskx-close').onclick=()=>overlay.classList.remove('active');
root.getElementById('riskx-cancel').onclick=()=>{ overlay.classList.remove('active'); window.postMessage({type:'RXL:CANCEL_TX'}, '*'); };
root.getElementById('riskx-override').onclick=()=>{ overlay.classList.remove('active'); window.postMessage({type:'RXL:OVERRIDE_TX'}, '*'); };
window.addEventListener('message',(ev)=>{ if(ev.source!==window) return; if(ev.data?.type==='RXL:SHOW_REPORT'){ const p=ev.data.payload||{}; overlay.classList.add('active');
  root.getElementById('riskx-summary').innerHTML = `<strong>Risk Score:</strong> ${p.score}/100 — ${p.severity}<br><strong>To:</strong> ${p.to} • <strong>Amount:</strong> ${p.amount} • <strong>Network:</strong> ${p.networkName}`;
  root.getElementById('riskx-details').innerHTML = (p.findings||[]).map(f=>`<div>⚠️ ${f}</div>`).join('');
  root.querySelector('#riskx-riskbar .dot').style.left = Math.min(98, Math.max(2, p.score||50)) + '%'; }});
chrome.runtime.onMessage.addListener((msg)=>{ if(msg?.type==='RXL:OPEN_DEMO'){ chrome.runtime.sendMessage({ type:'SIMULATE_TX', payload:{
  method:'eth_sendTransaction', chainId: msg.chainId || '0x1', tx:{ to:'0xdAC17F958D2ee523a2206206994597C13D831ec7', value:'0', data:'0x095ea7b3'+'0'.repeat(64)+'f'.repeat(64) },
  context:{ origin: location.hostname, from:'0x0000000000000000000000000000000000000001' } } }, (resp)=>{ if(resp) window.postMessage({type:'RXL:SHOW_REPORT', payload:resp}, '*'); }); }});
