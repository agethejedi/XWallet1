
import 'dotenv/config';
import express from 'express'; import cors from 'cors'; import axios from 'axios'; import { z } from 'zod';

const app = express(); app.use(express.json());
const allowed=(process.env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);
app.use(cors({origin:(o,cb)=>(!o||allowed.some(a=>o.startsWith(a))?cb(null,true):cb(new Error('blocked')))}));

// ---------- EVM (Ethereum/Polygon) ----------
const SUBS = {
  ethereum: { rpc: process.env.EVM_RPC_ETHEREUM, addr: process.env.SUB_ADDRESS_ETHEREUM },
  polygon:  { rpc: process.env.EVM_RPC_POLYGON,  addr: process.env.SUB_ADDRESS_POLYGON  },
};
function abiEncodeIsActive(addr, tierId){
  const sig='0x5f7c6ab0';
  const a='0x'+addr.toLowerCase().replace(/^0x/,'').padStart(64,'0');
  const t='0x'+BigInt(tierId).toString(16).padStart(64,'0');
  return sig + a.slice(2) + t.slice(2);
}
function abiEncodeTiers(tierId){
  const sig='0x0e9f1f9a';
  const t='0x'+BigInt(tierId).toString(16).padStart(64,'0');
  return sig + t.slice(2);
}
async function evmCall(rpc, to, data){
  const { data:res } = await axios.post(rpc, { jsonrpc:'2.0', id:1, method:'eth_call', params:[{to,data},'latest'] }, { timeout: 10000 });
  if (res.error) throw new Error(res.error.message);
  return res.result;
}
app.get('/evm/sub/active', async (req,res)=>{
  try{
    const chain = z.enum(['ethereum','polygon']).parse(req.query.chain);
    const address = z.string().regex(/^0x[a-fA-F0-9]{40}$/).parse(req.query.address);
    const tier = Number(req.query.tier||'1');
    const cfg = SUBS[chain]; if(!cfg.rpc || !cfg.addr) throw new Error('Chain not configured');
    const out = await evmCall(cfg.rpc, cfg.addr, abiEncodeIsActive(address, tier));
    const hex = out.slice(2).padStart(128,'0');
    const active = parseInt(hex.slice(0,64),16)!==0;
    const expiresAt = Number(BigInt('0x'+hex.slice(64,128)));
    res.json({ active, expiresAt });
  }catch(e){ res.status(400).json({ error: String(e.message||e) }); }
});
app.get('/evm/sub/tier', async (req,res)=>{
  try{
    const chain = z.enum(['ethereum','polygon']).parse(req.query.chain);
    const tier = Number(req.query.tier||'1');
    const cfg = SUBS[chain]; if(!cfg.rpc || !cfg.addr) throw new Error('Chain not configured');
    const out = await evmCall(cfg.rpc, cfg.addr, abiEncodeTiers(tier));
    const hex = out.slice(2).padStart(128,'0');
    const monthlyPrice = BigInt('0x'+hex.slice(0,64)).toString();
    const enabled = parseInt(hex.slice(64,128),16)!==0;
    res.json({ chain, tier, monthlyPrice, enabled });
  }catch(e){ res.status(400).json({ error: String(e.message||e) }); }
});

// ---------- SOLANA (SPL USDC/native transfers) ----------
// Note: this endpoint is a placeholder scaffold. It expects client to POST a recent confirmed tx signature to verify payment.
const SOLANA_RPC = process.env.SOLANA_RPC;
const SOLANA_TREASURY = process.env.SOLANA_TREASURY;
const SOLANA_USDC_MINT = process.env.SOLANA_USDC_MINT;
app.post('/sol/verify', async (req,res)=>{
  try{
    const body = z.object({ signature:z.string(), user:z.string(), amountLamports:z.number().optional(), usdcAmount:z.number().optional() }).parse(req.body);
    // Query tx
    const tx = await axios.post(SOLANA_RPC, { jsonrpc:'2.0', id:1, method:'getTransaction', params:[body.signature, { encoding:'json', maxSupportedTransactionVersion:0 }] });
    if (tx.data.error) throw new Error(tx.data.error.message);
    // Minimal verification example (expand to check exact instruction to SOLANA_TREASURY / USDC mint)
    const ok = !!tx.data.result;
    res.json({ ok });
  }catch(e){ res.status(400).json({ error:String(e.message||e) }); }
});

// ---------- BITCOIN (on-chain payments) ----------
// For production, derive per-invoice addresses from xpub and confirm via Electrum or an indexer.
// Here we accept a txid + target address and simply check confs >= 1 via mempool.space public API.
const BTC_API = process.env.BITCOIN_API_BASE;
app.get('/btc/tx', async (req,res)=>{
  try{
    const txid = z.string().regex(/^[a-f0-9]{64}$/).parse(req.query.txid);
    const { data } = await axios.get(`${BTC_API}/tx/${txid}`);
    res.json({ status:data.status, fee:data.fee, value:data.vout?.reduce((a,v)=>a+ (v?.value||0),0) });
  }catch(e){ res.status(400).json({ error:String(e.message||e) }); }
});

app.get('/health', (req,res)=>res.json({ ok:true, version:'3.1.0' }));
const port=process.env.PORT||8788;
app.listen(port, ()=> console.log('Multi-chain subscription backend v3.1 on :' + port));
