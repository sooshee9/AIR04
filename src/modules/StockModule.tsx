<<<<<<< HEAD
// StockModule — AIRTECH ERP | Elegant UI + Correct Closing Stock Formula
//
// CLOSING STOCK FORMULA:
//   closingStock = stockQty + purStoreOkQty + vendorOkQty - inHouseStockOnly - vendorIssuedQty
//
// purStoreOkQty   = PSIR_OK - inHousePurchase - vendorIssuedTotal
// vendorQty       = vendorDeptTotal - vendorIssuedTotal
// vendorOkQty     = vendorDeptOkQty - inHouseVendor
// vendorIssuedQty = vendorIssuedTotal - vsirReceived  (net still at vendor)

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
=======
// NOTE: localStorage-based helpers were removed — StockModule now uses Firestore-only state
import React, { useState, useEffect } from "react";
>>>>>>> ea2b60370e32f18454b4b30c524aa7881340b2ee
import bus from '../utils/eventBus';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
<<<<<<< HEAD
import {
  subscribeStockRecords, addStockRecord, updateStockRecord, deleteStockRecord,
  subscribePurchaseOrders, subscribeVendorIssues, subscribeVendorDepts,
  subscribeVSIRRecords, getItemMaster,
} from '../utils/firestoreServices';
import { subscribePsirs } from '../utils/psirService';

interface StockRecord {
  id: string | number;
  itemName: string; itemCode: string; batchNo: string; stockQty: number;
  indentQty: number; purchaseQty: number; vendorQty: number;
  purStoreOkQty: number; vendorOkQty: number; inHouseIssuedQty: number;
  vendorIssuedQty: number; closingStock: number;
}
type RecordForm = Omit<StockRecord, 'id'>;
const EMPTY_FORM: RecordForm = {
  itemName:'',itemCode:'',batchNo:'',stockQty:0,indentQty:0,purchaseQty:0,
  vendorQty:0,purStoreOkQty:0,vendorOkQty:0,inHouseIssuedQty:0,vendorIssuedQty:0,closingStock:0,
};

const S = {
  bg:'#F7F8FC',surface:'#FFFFFF',border:'#E4E8F0',borderStrong:'#CBD2E0',
  accent:'#3B5BDB',accentLight:'#EEF2FF',
  success:'#2F9E44',danger:'#C92A2A',warning:'#E67700',
  textPrimary:'#1A1F36',textSecondary:'#6B7280',textMuted:'#9CA3AF',
  card:{background:'#FFFFFF',border:'1px solid #E4E8F0',borderRadius:12,padding:'24px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'} as React.CSSProperties,
  input:{padding:'8px 12px',borderRadius:8,border:'1px solid #CBD2E0',fontSize:14,color:'#1A1F36',background:'#fff',outline:'none',transition:'border-color 0.15s',fontFamily:'inherit',lineHeight:'1.5'} as React.CSSProperties,
  inputDisabled:{padding:'8px 12px',borderRadius:8,border:'1px solid #E4E8F0',fontSize:14,color:'#6B7280',background:'#F7F8FC',cursor:'not-allowed',fontFamily:'inherit'} as React.CSSProperties,
  btnSuccess:{background:'#2F9E44',color:'#fff',border:'none',borderRadius:8,padding:'8px 16px',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit'} as React.CSSProperties,
  btnGhost:{background:'transparent',color:'#6B7280',border:'1px solid #E4E8F0',borderRadius:8,padding:'8px 14px',fontSize:14,fontWeight:500,cursor:'pointer',fontFamily:'inherit'} as React.CSSProperties,
  btnDanger:{background:'transparent',color:'#C92A2A',border:'1px solid #FECACA',borderRadius:6,padding:'4px 10px',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'} as React.CSSProperties,
  btnEdit:{background:'#EEF2FF',color:'#3B5BDB',border:'1px solid #C5D0FA',borderRadius:6,padding:'4px 10px',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'} as React.CSSProperties,
  label:{fontSize:12,fontWeight:600,color:'#6B7280',textTransform:'uppercase' as const,letterSpacing:'0.05em',marginBottom:4,display:'block'},
  th:{padding:'10px 12px',textAlign:'left' as const,fontSize:11,fontWeight:700,color:'#6B7280',textTransform:'uppercase' as const,letterSpacing:'0.05em',background:'#F7F8FC',borderBottom:'2px solid #E4E8F0',whiteSpace:'nowrap' as const},
  thRight:{padding:'10px 12px',textAlign:'right' as const,fontSize:11,fontWeight:700,color:'#6B7280',textTransform:'uppercase' as const,letterSpacing:'0.05em',background:'#F7F8FC',borderBottom:'2px solid #E4E8F0',whiteSpace:'nowrap' as const},
  td:{padding:'10px 12px',fontSize:14,color:'#1A1F36',borderBottom:'1px solid #F1F3F9',whiteSpace:'nowrap' as const},
  tdClip:{padding:'10px 12px',fontSize:14,color:'#1A1F36',borderBottom:'1px solid #F1F3F9',maxWidth:180,overflow:'hidden' as const,textOverflow:'ellipsis' as const,whiteSpace:'nowrap' as const},
  tdRight:{padding:'10px 12px',fontSize:14,color:'#1A1F36',borderBottom:'1px solid #F1F3F9',textAlign:'right' as const,fontVariantNumeric:'tabular-nums'} as React.CSSProperties,
};

interface Toast { id:number; msg:string; type:'success'|'error'|'info'; }
let toastId = 0;

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (!toasts.length) return null;
  return (
    <div style={{position:'fixed',bottom:24,right:24,zIndex:9999,display:'flex',flexDirection:'column',gap:8}}>
      {toasts.map(t => (
        <div key={t.id} style={{padding:'12px 18px',borderRadius:10,fontSize:14,fontWeight:500,color:'#fff',
          background:t.type==='success'?'#2F9E44':t.type==='error'?'#C92A2A':'#3B5BDB',
          boxShadow:'0 4px 16px rgba(0,0,0,0.18)',animation:'stockSlide 0.2s ease',maxWidth:360,display:'flex',alignItems:'center',gap:8}}>
          {t.type==='success'?'✓':t.type==='error'?'✕':'ℹ'} {t.msg}
        </div>
      ))}
    </div>
  );
}

function Field({label,children,style}:{label:string;children:React.ReactNode;style?:React.CSSProperties}) {
  return (
    <div style={{display:'flex',flexDirection:'column',minWidth:0,...style}}>
      <span style={S.label}>{label}</span>
      {children}
    </div>
  );
}

function StatCard({label,value,sub,color}:{label:string;value:string|number;sub?:string;color?:string}) {
  return (
    <div style={{...S.card,padding:'16px 20px',display:'flex',flexDirection:'column',gap:4,minWidth:110,flex:1}}>
      <span style={{fontSize:11,fontWeight:700,color:S.textMuted,textTransform:'uppercase',letterSpacing:'0.06em'}}>{label}</span>
      <span style={{fontSize:26,fontWeight:800,color:color||S.textPrimary,lineHeight:1.2}}>{value}</span>
      {sub&&<span style={{fontSize:12,color:S.textSecondary}}>{sub}</span>}
    </div>
  );
}

function CalligraphicHeader({synced}:{synced:boolean}) {
  return (
    <div style={{background:'linear-gradient(135deg,#1a1200 0%,#2d1f00 40%,#1a1200 100%)',borderRadius:16,padding:'28px 36px',marginBottom:28,position:'relative',overflow:'hidden',boxShadow:'0 8px 32px rgba(0,0,0,0.35),inset 0 1px 0 rgba(212,175,55,0.3)'}}>
      <div style={{position:'absolute',top:10,left:12,fontSize:22,color:'rgba(212,175,55,0.5)',fontFamily:'serif'}}>✦</div>
      <div style={{position:'absolute',top:10,right:12,fontSize:22,color:'rgba(212,175,55,0.5)',fontFamily:'serif'}}>✦</div>
      <div style={{position:'absolute',bottom:10,left:12,fontSize:22,color:'rgba(212,175,55,0.5)',fontFamily:'serif'}}>✦</div>
      <div style={{position:'absolute',bottom:10,right:12,fontSize:22,color:'rgba(212,175,55,0.5)',fontFamily:'serif'}}>✦</div>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
        <div style={{flex:1,height:1,background:'linear-gradient(90deg,transparent,rgba(212,175,55,0.6),transparent)'}}/>
        <span style={{color:'rgba(212,175,55,0.7)',fontSize:16,fontFamily:'Georgia,serif'}}>✠</span>
        <div style={{flex:1,height:1,background:'linear-gradient(90deg,transparent,rgba(212,175,55,0.6),transparent)'}}/>
      </div>
      <div style={{textAlign:'center',marginBottom:6}}>
        <div style={{fontFamily:'"Palatino Linotype","Book Antiqua",Palatino,serif',fontSize:38,fontWeight:400,color:'#D4AF37',letterSpacing:'0.08em',textShadow:'0 2px 12px rgba(212,175,55,0.4)',lineHeight:1.1,fontStyle:'italic'}}>
          ✦ AIRTECH ERP ✦
        </div>
        <div style={{fontFamily:'"Palatino Linotype","Book Antiqua",Palatino,serif',fontSize:15,fontWeight:400,color:'rgba(212,175,55,0.75)',letterSpacing:'0.35em',textTransform:'uppercase',marginTop:6}}>
          Inventory Management
        </div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:12,marginTop:14}}>
        <div style={{flex:1,height:1,background:'linear-gradient(90deg,transparent,rgba(212,175,55,0.6),transparent)'}}/>
        <span style={{color:'rgba(212,175,55,0.7)',fontSize:12,fontFamily:'Georgia,serif',letterSpacing:'0.2em'}}>· STOCK MODULE ·</span>
        <div style={{flex:1,height:1,background:'linear-gradient(90deg,transparent,rgba(212,175,55,0.6),transparent)'}}/>
      </div>
      <div style={{position:'absolute',top:16,right:48,fontSize:11,fontWeight:700,color:synced?'#6ee7a0':'#f87171',letterSpacing:'0.08em'}}>
        {synced?'● SYNCED':'● OFFLINE'}
      </div>
    </div>
  );
}

const StockModule: React.FC = () => {
  const [form,setForm]=useState<RecordForm>({...EMPTY_FORM});
  const [records,setRecords]=useState<StockRecord[]>([]);
  const [userUid,setUserUid]=useState<string|null>(null);
  const [editIdx,setEditIdx]=useState<number|null>(null);
  const [toasts,setToasts]=useState<Toast[]>([]);
  const [psirsState,setPsirsState]=useState<any[]>([]);
  const [vendorIssuesState,setVendorIssuesState]=useState<any[]>([]);
  const [inHouseIssuesState,setInHouseIssuesState]=useState<any[]>([]);
  const [vendorDeptState,setVendorDeptState]=useState<any[]>([]);
  const [purchaseOrdersState,setPurchaseOrdersState]=useState<any[]>([]);
  const [indentState,setIndentState]=useState<any[]>([]);
  const [vsirRecordsState,setVsirRecordsState]=useState<any[]>([]);
  const [itemMasterState,setItemMasterState]=useState<any[]>([]);
  const [draftPsirItems,setDraftPsirItems]=useState<any[]>([]);
  const [filterText,setFilterText]=useState('');
  const [showFilters,setShowFilters]=useState(false);
  const unsubsRef=useRef<Array<()=>void>>([]);

  const showToast=useCallback((msg:string,type:Toast['type']='info')=>{
    const id=++toastId;
    setToasts(prev=>[...prev,{id,msg,type}]);
    setTimeout(()=>setToasts(prev=>prev.filter(t=>t.id!==id)),4000);
  },[]);

  useEffect(()=>{
    const unsub=onAuthStateChanged(auth,u=>setUserUid(u?u.uid:null));
    return ()=>unsub();
  },[]);

  useEffect(()=>{
    unsubsRef.current.forEach(fn=>{try{fn();}catch{}});
    unsubsRef.current=[];
    if(!userUid){
      setRecords([]);setPsirsState([]);setVendorIssuesState([]);
      setInHouseIssuesState([]);setVendorDeptState([]);setPurchaseOrdersState([]);
      setIndentState([]);setVsirRecordsState([]);setItemMasterState([]);
      return;
    }
    const subs:Array<()=>void>=[];
    const trySub=(fn:()=>(()=>void)|undefined)=>{try{const u=fn();if(u)subs.push(u);}catch{}};
    trySub(()=>subscribeStockRecords(userUid,(docs:any[])=>{
      setRecords(docs.map(d=>({
        id:d.id,itemName:d.itemName||'',itemCode:d.itemCode||'',batchNo:d.batchNo||'',
        stockQty:Number(d.stockQty)||0,indentQty:Number(d.indentQty)||0,
        purchaseQty:Number(d.purchaseQty)||0,vendorQty:Number(d.vendorQty)||0,
        purStoreOkQty:Number(d.purStoreOkQty)||0,vendorOkQty:Number(d.vendorOkQty)||0,
        inHouseIssuedQty:Number(d.inHouseIssuedQty)||0,vendorIssuedQty:Number(d.vendorIssuedQty)||0,
        closingStock:Number(d.closingStock)||0,
      }as StockRecord)));
    }));
    trySub(()=>subscribePsirs(userUid,docs=>setPsirsState(docs)));
    trySub(()=>subscribeVendorIssues(userUid,docs=>setVendorIssuesState(docs)));
    trySub(()=>subscribeVendorDepts(userUid,docs=>setVendorDeptState(docs)));
    trySub(()=>subscribePurchaseOrders(userUid,docs=>setPurchaseOrdersState(docs)));
    trySub(()=>subscribeVSIRRecords(userUid,docs=>setVsirRecordsState(docs)));
    try{const u=onSnapshot(collection(db,'users',userUid,'inHouseIssues'),snap=>setInHouseIssuesState(snap.docs.map(d=>({id:d.id,...(d.data() as any)}))));subs.push(u);}catch{}
    try{const u=onSnapshot(collection(db,'users',userUid,'indentData'),snap=>setIndentState(snap.docs.map(d=>({id:d.id,...(d.data() as any)}))));subs.push(u);}catch{}
    getItemMaster(userUid).then(items=>setItemMasterState((items||[])as any[])).catch(()=>setItemMasterState([]));
    unsubsRef.current=subs;
    return ()=>{unsubsRef.current.forEach(fn=>{try{fn();}catch{}});unsubsRef.current=[];};
  },[userUid]);

  useEffect(()=>{
    const handler=(ev:Event)=>{
      try{const det=(ev as CustomEvent).detail||{};if(det.draftItem)setDraftPsirItems(prev=>[...prev,det.draftItem]);else if(det.psirs)setDraftPsirItems([]);}catch{}
      setRecords(prev=>[...prev]);
    };
    try{bus.addEventListener('psir.updated',handler as EventListener);}catch{}
    return ()=>{try{bus.removeEventListener('psir.updated',handler as EventListener);}catch{};};
  },[]);

  useEffect(()=>{try{bus.dispatchEvent(new CustomEvent('stock.updated',{detail:{records}}));}catch{}},[records]);

  const normalize=useCallback((s:any)=>s==null?'':String(s).trim().toLowerCase(),[]);

  // ── Maps ──────────────────────────────────────────────────────────────────

  const vendorIssuedMap=useMemo(()=>{
    const m=new Map<string,number>();
    for(const issue of vendorIssuesState){
      if(!Array.isArray(issue.items))continue;
      for(const item of issue.items){
        const qty=Number(item.qty)||0;
        if(!qty)continue;
        const k=String(item.itemCode||'').trim();
        if(k)m.set(k,(m.get(k)||0)+qty);
      }
    }
    return m;
  },[vendorIssuesState]);

  const getVendorIssuedQtyTotal=useCallback((c:string)=>vendorIssuedMap.get(String(c).trim())||0,[vendorIssuedMap]);

  const vsirReceivedMap=useMemo(()=>{
    const m=new Map<string,number>();
    for(const r of vsirRecordsState){
      const k=String(r.itemCode||'').trim();
      const qty=(Number(r.okQty)||0)+(Number(r.reworkQty)||0)+(Number(r.rejectQty)||0);
      if(k&&qty)m.set(k,(m.get(k)||0)+qty);
    }
    return m;
  },[vsirRecordsState]);

  const getVSIRReceivedQtyTotal=useCallback((c:string)=>vsirReceivedMap.get(String(c).trim())||0,[vsirReceivedMap]);

  // Net qty still outstanding at vendor (sent but not yet returned)
  const getAdjustedVendorIssuedQty=useCallback((c:string)=>
    Math.max(0,getVendorIssuedQtyTotal(c)-getVSIRReceivedQtyTotal(c)),
  [getVendorIssuedQtyTotal,getVSIRReceivedQtyTotal]);

  const vendorDeptMap=useMemo(()=>{
    const qty=new Map<string,number>(),ok=new Map<string,number>();
    for(const order of vendorDeptState){
      if(!Array.isArray(order.items))continue;
      for(const item of order.items){
        const k=String(item.itemCode||'').trim();
        if(typeof item.qty==='number')qty.set(k,(qty.get(k)||0)+item.qty);
        if(typeof item.okQty==='number')ok.set(k,(ok.get(k)||0)+item.okQty);
      }
    }
    return{qty,ok};
  },[vendorDeptState]);

  const purchaseQtyMap=useMemo(()=>{
    const m=new Map<string,number>();
    for(const entry of purchaseOrdersState){
      if(Array.isArray(entry.items)){for(const item of entry.items){if(typeof item.qty==='number'){const k=String(item.itemCode||'').trim();m.set(k,(m.get(k)||0)+item.qty);}}}
      else if(entry.itemCode&&typeof entry.qty==='number'){const k=String(entry.itemCode).trim();m.set(k,(m.get(k)||0)+entry.qty);}
    }
    return m;
  },[purchaseOrdersState]);

  const indentQtyMap=useMemo(()=>{
    const m=new Map<string,number>();
    for(const indent of indentState){
      if(!Array.isArray(indent.items))continue;
      for(const item of indent.items){if(item.itemCode&&typeof item.qty==='number'){const k=String(item.itemCode).trim();m.set(k,(m.get(k)||0)+item.qty);}}
    }
    return m;
  },[indentState]);

  const psirOkMap=useMemo(()=>{
    const m=new Map<string,number>();
    const add=(nk:string,ck:string,v:number)=>{if(nk)m.set('name:'+nk,(m.get('name:'+nk)||0)+v);if(ck)m.set('code:'+ck,(m.get('code:'+ck)||0)+v);};
    const proc=(item:any)=>{
      const name=normalize(item.itemName||item.Item||'');
      const code=normalize(item.itemCode||item.Code||item.CodeNo||'');
      const ok=(item.okQty!=null&&Number(item.okQty)>0)?Number(item.okQty):(Number(item.qtyReceived)||0);
      add(name,code,ok);
    };
    for(const psir of psirsState){if(Array.isArray(psir.items))psir.items.forEach(proc);}
    draftPsirItems.forEach(proc);
    return m;
  },[psirsState,draftPsirItems,normalize]);

  const inHouseMap=useMemo(()=>{
    const m=new Map<string,number>();
    for(const issue of inHouseIssuesState){
      if(!Array.isArray(issue.items))continue;
      for(const item of issue.items){
        const code=normalize(item.itemCode||'');
        const name=normalize(item.itemName||'');
        const txType=item.transactionType||'';
        const qty=Number(item.issueQty||item.qty||0);
        if(!qty)continue;
        m.set(`code:${code}:type:${txType}`,(m.get(`code:${code}:type:${txType}`)||0)+qty);
        m.set(`code:${code}:type:*`,(m.get(`code:${code}:type:*`)||0)+qty);
        m.set(`name:${name}`,(m.get(`name:${name}`)||0)+qty);
        m.set(`name:${name}:code:${code}`,(m.get(`name:${name}:code:${code}`)||0)+qty);
        if(txType==='Stock')m.set(`stock:name:${name}:code:${code}`,(m.get(`stock:name:${name}:code:${code}`)||0)+qty);
      }
    }
    return m;
  },[inHouseIssuesState,normalize]);

  // ── Getters ───────────────────────────────────────────────────────────────

  const getVendorDeptOkQtyTotal=useCallback((c:string)=>vendorDeptMap.ok.get(String(c).trim())||0,[vendorDeptMap]);
  const getPurchaseQtyTotal=useCallback((c:string)=>purchaseQtyMap.get(String(c).trim())||0,[purchaseQtyMap]);
  const getIndentQtyTotal=useCallback((c:string)=>indentQtyMap.get(String(c).trim())||0,[indentQtyMap]);

  const getPSIROkQtyTotal=useCallback((itemName:string,itemCode?:string)=>
    Math.max(psirOkMap.get('name:'+normalize(itemName))||0,psirOkMap.get('code:'+normalize(itemCode))||0),
  [psirOkMap,normalize]);

  const getInHouseQtyByTxType=useCallback((c:string,tx:string)=>
    inHouseMap.get(tx==='*'?`code:${normalize(c)}:type:*`:`code:${normalize(c)}:type:${tx}`)||0,
  [inHouseMap,normalize]);

  const getInHouseIssuedQtyByItemName=useCallback((itemName:string,itemCode?:string)=>
    Math.max(inHouseMap.get(`name:${normalize(itemName)}`)||0,inHouseMap.get(`code:${normalize(itemCode)}:type:*`)||0),
  [inHouseMap,normalize]);

  const getInHouseStockOnly=useCallback((itemName:string,itemCode?:string)=>
    inHouseMap.get(`stock:name:${normalize(itemName)}:code:${normalize(itemCode)}`)||0,
  [inHouseMap,normalize]);

  // ── Column calculations ───────────────────────────────────────────────────

  const getVendorQty=useCallback((c:string)=>
    Math.max(0,(vendorDeptMap.qty.get(String(c).trim())||0)-getVendorIssuedQtyTotal(c)),
  [vendorDeptMap,getVendorIssuedQtyTotal]);

  const getVendorOkQty=useCallback((c:string)=>
    Math.max(0,getVendorDeptOkQtyTotal(c)-getInHouseQtyByTxType(c,'Vendor')),
  [getVendorDeptOkQtyTotal,getInHouseQtyByTxType]);

  // Pur Store OK = PSIR received − InHouse(Purchase) − VendorIssued
  const getPurStoreOkQty=useCallback((itemName:string,itemCode?:string)=>
    Math.max(0,
      getPSIROkQtyTotal(itemName,itemCode)
      - getInHouseQtyByTxType(itemCode||'','Purchase')
      - getVendorIssuedQtyTotal(itemCode||'')
    ),
  [getPSIROkQtyTotal,getInHouseQtyByTxType,getVendorIssuedQtyTotal]);

  // ★ CORRECT closing stock: deducts vendorIssuedQty (net items still at vendor)
  const computeClosingStock=useCallback((itemName:string,itemCode:string,stockQty:number)=>
    (Number(stockQty)||0)
    + getPurStoreOkQty(itemName,itemCode)
    + getVendorOkQty(itemCode)
    - getInHouseStockOnly(itemName,itemCode)
    - getAdjustedVendorIssuedQty(itemCode),   // ← vendor issued reduces closing stock
  [getPurStoreOkQty,getVendorOkQty,getInHouseStockOnly,getAdjustedVendorIssuedQty]);

  // ── Live preview ──────────────────────────────────────────────────────────

  const liveCalc=useMemo(()=>{
    const{itemName,itemCode,stockQty}=form;
    if(!itemName&&!itemCode)return null;
    return{
      indentQty:        getIndentQtyTotal(itemCode),
      purchaseQty:      getPurchaseQtyTotal(itemCode),
      vendorQty:        getVendorQty(itemCode),
      purStoreOkQty:    getPurStoreOkQty(itemName,itemCode),
      vendorOkQty:      getVendorOkQty(itemCode),
      inHouseIssuedQty: getInHouseIssuedQtyByItemName(itemName,itemCode),
      vendorIssuedQty:  getAdjustedVendorIssuedQty(itemCode),
      closingStock:     computeClosingStock(itemName,itemCode,stockQty),
    };
  },[form,getIndentQtyTotal,getPurchaseQtyTotal,getVendorQty,getPurStoreOkQty,
     getVendorOkQty,getInHouseIssuedQtyByItemName,getAdjustedVendorIssuedQty,computeClosingStock]);

  const filteredRecords=useMemo(()=>{
    if(!filterText)return records;
    const q=filterText.toLowerCase();
    return records.filter(r=>[r.itemName,r.itemCode,r.batchNo].some(f=>String(f||'').toLowerCase().includes(q)));
  },[records,filterText]);

  const totalClosing=useMemo(()=>
    records.reduce((s,r)=>s+computeClosingStock(r.itemName,r.itemCode,r.stockQty),0),
  [records,computeClosingStock]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleChange=useCallback((e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement>)=>{
    const{name,value,type}=e.target;
    if(name==='itemName'){
      const found=itemMasterState.find(item=>item.itemCode===value);
      setForm(prev=>({...prev,itemName:found?found.itemName:'',itemCode:found?found.itemCode:''}));
    }else{
      setForm(prev=>({...prev,[name]:type==='number'?Number(value):value}));
    }
  },[itemMasterState]);

  const handleSubmit=useCallback(async(e:React.FormEvent)=>{
    e.preventDefault();
    if(!form.itemName){showToast('Item Name is required','error');return;}
    const autoRecord:RecordForm={
      ...form,
      indentQty:        getIndentQtyTotal(form.itemCode),
      purchaseQty:      getPurchaseQtyTotal(form.itemCode),
      vendorQty:        getVendorQty(form.itemCode),
      purStoreOkQty:    getPurStoreOkQty(form.itemName,form.itemCode),
      vendorOkQty:      getVendorOkQty(form.itemCode),
      inHouseIssuedQty: getInHouseIssuedQtyByItemName(form.itemName,form.itemCode),
      vendorIssuedQty:  getAdjustedVendorIssuedQty(form.itemCode),
      closingStock:     computeClosingStock(form.itemName,form.itemCode,form.stockQty),
    };
    if(editIdx!==null){
      const existing=records[editIdx];
      if(userUid&&typeof(existing as any).id==='string'){
        await updateStockRecord(userUid,String((existing as any).id),autoRecord)
          .then(()=>{setRecords(prev=>prev.map((r,i)=>i===editIdx?{...autoRecord,id:r.id}:r));showToast('Record updated','success');})
          .catch(err=>showToast('Update failed: '+String((err as any)?.message||err),'error'));
      }else{
        setRecords(prev=>prev.map((r,i)=>i===editIdx?{...autoRecord,id:r.id}:r));
        showToast('Record updated (local)','success');
      }
      setEditIdx(null);
    }else{
      if(userUid){
        await addStockRecord(userUid,autoRecord)
          .then((newId:any)=>{setRecords(prev=>[...prev,{...autoRecord,id:newId}as any]);showToast('Record added','success');})
          .catch(err=>{showToast('Add failed: '+String((err as any)?.message||err),'error');setRecords(prev=>[...prev,{...autoRecord,id:Date.now()}]);});
      }else{
        setRecords(prev=>[...prev,{...autoRecord,id:Date.now()}]);
        showToast('Record added (local)','info');
      }
    }
    setForm({...EMPTY_FORM});
  },[form,editIdx,records,userUid,getIndentQtyTotal,getPurchaseQtyTotal,getVendorQty,
     getPurStoreOkQty,getVendorOkQty,getInHouseIssuedQtyByItemName,getAdjustedVendorIssuedQty,
     computeClosingStock,showToast]);

  const handleEdit=useCallback((idx:number)=>{
    setForm({...records[idx]});setEditIdx(idx);window.scrollTo({top:0,behavior:'smooth'});
  },[records]);

  const handleDelete=useCallback(async(idx:number)=>{
    const rec=records[idx];
    if(userUid&&typeof(rec as any).id==='string'){
      await deleteStockRecord(userUid,String((rec as any).id))
        .then(()=>showToast('Record deleted','success'))
        .catch(err=>showToast('Delete failed: '+String((err as any)?.message||err),'error'));
    }else{
      setRecords(prev=>prev.filter((_,i)=>i!==idx));
      showToast('Record deleted (local)','success');
    }
  },[records,userUid,showToast]);

  const isEditing=editIdx!==null;

  return (
    <>
      <style>{`
        @keyframes stockSlide{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
        .sk-btn:hover{opacity:0.88;} .sk-row:hover td{background:#F7F8FF!important;}
        .sk-input:focus{border-color:#3B5BDB!important;box-shadow:0 0 0 3px rgba(59,91,219,0.12);}
        .sk-ghost:hover{background:#F7F8FC!important;border-color:#CBD2E0!important;}
        *{box-sizing:border-box;}
      `}</style>
      <ToastContainer toasts={toasts}/>

      <div style={{background:S.bg,fontFamily:"'Geist','DM Sans',system-ui,sans-serif"}}>
        <div style={{maxWidth:1600,margin:'0 auto',padding:'24px 24px 32px'}}>

          <CalligraphicHeader synced={!!userUid}/>

          {/* ── Stat Cards ── */}
          <div style={{display:'flex',gap:14,marginBottom:24,flexWrap:'wrap'}}>
            <StatCard label="Stock Items" value={records.length}/>
            <StatCard label="Item Master" value={itemMasterState.length} sub="available" color={itemMasterState.length===0?S.warning:S.textPrimary}/>
            <StatCard label="PSIRs" value={psirsState.length} sub="loaded"/>
            <StatCard label="Vendor Depts" value={vendorDeptState.length} sub="loaded"/>
            <StatCard label="In-House Issues" value={inHouseIssuesState.length} sub="loaded"/>
            <StatCard label="Total Closing" value={totalClosing} color={totalClosing<0?S.danger:S.success} sub="across all items"/>
          </div>

          {/* ── Form ── */}
          <div style={{...S.card,marginBottom:24}}>
            <h2 style={{margin:'0 0 20px',fontSize:16,fontWeight:700,color:S.textPrimary}}>
              {isEditing?'✎ Edit Stock Record':'New Stock Record'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{display:'flex',gap:14,flexWrap:'wrap',marginBottom:16}}>
                <Field label="Item Name" style={{flex:'1 1 220px'}}>
                  <select name="itemName" className="sk-input"
                    style={{...S.input,borderColor:itemMasterState.length===0?S.warning:S.borderStrong}}
                    value={form.itemCode} onChange={handleChange}>
                    <option value="">{itemMasterState.length===0?'Item Master not loaded…':'Select item…'}</option>
                    {itemMasterState.map(item=><option key={item.id||item.itemCode} value={item.itemCode}>{item.itemName}</option>)}
                  </select>
                </Field>
                <Field label="Item Code">
                  <input style={{...S.inputDisabled,width:130}} value={form.itemCode} readOnly placeholder="Auto-filled"/>
                </Field>
                <Field label="Batch No">
                  <input name="batchNo" className="sk-input" style={{...S.input,width:130}}
                    placeholder="Optional" value={form.batchNo} onChange={handleChange}/>
                </Field>
                <Field label="Opening Stock Qty">
                  <input type="number" name="stockQty" className="sk-input" style={{...S.input,width:120}}
                    placeholder="0" min={0} value={form.stockQty||''} onChange={handleChange}/>
                </Field>
                <Field label="In-House Issued Qty">
                  <input style={{...S.inputDisabled,width:130}} value={liveCalc?.inHouseIssuedQty??0} readOnly/>
                </Field>
                <Field label="Vendor Issued Qty">
                  <input style={{...S.inputDisabled,width:120}} value={liveCalc?.vendorIssuedQty??0} readOnly/>
                </Field>
              </div>

              {/* Auto-computed preview panel */}
              {liveCalc&&(
                <div style={{background:S.bg,border:`1px solid ${S.border}`,borderRadius:10,padding:'16px 20px',marginBottom:16}}>
                  <div style={{fontSize:12,fontWeight:700,color:S.textMuted,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:12}}>
                    Auto-computed fields
                  </div>
                  <div style={{display:'flex',gap:20,flexWrap:'wrap'}}>
                    {[
                      {label:'Indent Qty',       value:liveCalc.indentQty},
                      {label:'Purchase Qty',     value:liveCalc.purchaseQty},
                      {label:'Vendor Qty',       value:liveCalc.vendorQty,      hint:'VendorDept − Issued'},
                      {label:'Pur Store OK Qty', value:liveCalc.purStoreOkQty,  hint:'PSIR − InHouse(Pur) − VendorIssued', accent:true},
                      {label:'Vendor OK Qty',    value:liveCalc.vendorOkQty,    accent:true},
                      {label:'Closing Stock',    value:liveCalc.closingStock,   closing:true},
                    ].map(f=>(
                      <div key={f.label} style={{display:'flex',flexDirection:'column',gap:2,minWidth:110}}>
                        <span style={{...S.label,marginBottom:2}}>{f.label}</span>
                        {f.hint&&<span style={{fontSize:10,color:S.textMuted,marginBottom:2}}>{f.hint}</span>}
                        <span style={{
                          fontSize:f.closing?22:18,fontWeight:800,
                          color:f.closing?(liveCalc.closingStock<0?S.danger:S.success):f.accent?S.accent:S.textPrimary,
                          fontVariantNumeric:'tabular-nums',
                        }}>{f.value}</span>
                      </div>
                    ))}
                  </div>
                  {/* Formula hint */}
                  <div style={{marginTop:14,padding:'8px 12px',background:'#fffbe6',border:'1px solid #ffe58f',borderRadius:6,fontSize:11,color:'#7c5c00'}}>
                    <strong>Closing Stock</strong> = Opening Stock + Pur Store OK + Vendor OK − InHouse(Stock) − Vendor Issued (net)
                  </div>
                </div>
              )}

              <div style={{display:'flex',gap:10}}>
                <button type="submit" className="sk-btn" style={S.btnSuccess}>
                  {isEditing?'✓ Update Record':'✓ Add Record'}
                </button>
                {isEditing&&<button type="button" className="sk-btn sk-ghost" style={S.btnGhost}
                  onClick={()=>{setForm({...EMPTY_FORM});setEditIdx(null);}}>Cancel</button>}
                {!isEditing&&<button type="button" className="sk-btn sk-ghost" style={S.btnGhost}
                  onClick={()=>setForm({...EMPTY_FORM})}>Clear</button>}
              </div>
            </form>
          </div>

          {/* ── Table ── */}
          <div style={S.card}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:10}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <h2 style={{margin:0,fontSize:16,fontWeight:700,color:S.textPrimary}}>Stock Records</h2>
                <span style={{fontSize:12,fontWeight:600,color:S.textSecondary,background:S.bg,padding:'2px 10px',borderRadius:20,border:`1px solid ${S.border}`}}>
                  {filteredRecords.length} of {records.length} items
                </span>
              </div>
              <button className="sk-btn sk-ghost"
                style={{...S.btnGhost,borderColor:showFilters?S.accent:S.border,color:showFilters?S.accent:S.textSecondary}}
                onClick={()=>setShowFilters(f=>!f)}>Search</button>
            </div>

            {showFilters&&(
              <div style={{background:S.bg,border:`1px solid ${S.border}`,borderRadius:8,padding:'14px 16px',marginBottom:16,display:'flex',gap:12,alignItems:'flex-end'}}>
                <Field label="Search items">
                  <input className="sk-input" style={{...S.input,minWidth:260}}
                    placeholder="Item name, code, batch no…" value={filterText}
                    onChange={e=>setFilterText(e.target.value)}/>
                </Field>
                {filterText&&<button className="sk-btn sk-ghost"
                  style={{...S.btnGhost,alignSelf:'flex-end',color:S.danger,borderColor:'#FECACA'}}
                  onClick={()=>setFilterText('')}>✕ Clear</button>}
              </div>
            )}

            <div style={{overflowX:'auto',borderRadius:8,border:`1px solid ${S.border}`}}>
              <table style={{width:'100%',borderCollapse:'collapse',tableLayout:'auto'}}>
                <thead>
                  <tr>
                    <th style={{...S.th,minWidth:32,textAlign:'center'}}>#</th>
                    <th style={{...S.th,minWidth:160}}>Item Name</th>
                    <th style={{...S.th,minWidth:110}}>Item Code</th>
                    <th style={{...S.th,minWidth:100}}>Batch No</th>
                    <th style={{...S.thRight,minWidth:90}}>Opening Stock</th>
                    <th style={{width:2,padding:0,background:S.borderStrong,borderBottom:`2px solid ${S.borderStrong}`}}/>
                    <th style={{...S.thRight,minWidth:80}}>Indent Qty</th>
                    <th style={{...S.thRight,minWidth:88}}>Purchase Qty</th>
                    <th style={{...S.thRight,minWidth:80}}>Vendor Qty</th>
                    <th style={{width:2,padding:0,background:S.borderStrong,borderBottom:`2px solid ${S.borderStrong}`}}/>
                    <th style={{...S.thRight,minWidth:110}}>Pur Store OK</th>
                    <th style={{...S.thRight,minWidth:96}}>Vendor OK</th>
                    <th style={{width:2,padding:0,background:S.borderStrong,borderBottom:`2px solid ${S.borderStrong}`}}/>
                    <th style={{...S.thRight,minWidth:110}}>In-House Issued</th>
                    <th style={{...S.thRight,minWidth:100}}>Vendor Issued</th>
                    <th style={{width:2,padding:0,background:S.borderStrong,borderBottom:`2px solid ${S.borderStrong}`}}/>
                    <th style={{...S.thRight,minWidth:100}}>Closing Stock</th>
                    <th style={{...S.th,textAlign:'center',minWidth:96}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.length===0?(
                    <tr><td colSpan={18} style={{padding:'40px 0',textAlign:'center',color:S.textMuted,fontSize:14}}>
                      {records.length===0?'No stock records yet. Add your first item above.':'No items match the search.'}
                    </td></tr>
                  ):filteredRecords.map((rec,rowIdx)=>{
                    const origIdx=records.indexOf(rec);
                    const indentQty=     getIndentQtyTotal(rec.itemCode);
                    const purchaseQty=   getPurchaseQtyTotal(rec.itemCode);
                    const vendorQty=     getVendorQty(rec.itemCode);
                    const purStoreOkQty= getPurStoreOkQty(rec.itemName,rec.itemCode);
                    const vendorOkQty=   getVendorOkQty(rec.itemCode);
                    const inHouseIssued= getInHouseIssuedQtyByItemName(rec.itemName,rec.itemCode);
                    const vendorIssued=  getAdjustedVendorIssuedQty(rec.itemCode);
                    const closing=       computeClosingStock(rec.itemName,rec.itemCode,rec.stockQty);
                    return(
                      <tr key={rec.id} className="sk-row" style={{background:rowIdx%2===1?S.bg:S.surface}}>
                        <td style={{...S.td,textAlign:'center',color:S.textMuted,fontSize:12}}>{rowIdx+1}</td>
                        <td style={S.tdClip} title={rec.itemName}>{rec.itemName}</td>
                        <td style={{...S.td,fontFamily:'monospace',fontSize:13}}>{rec.itemCode}</td>
                        <td style={S.td}>{rec.batchNo}</td>
                        <td style={{...S.tdRight,fontWeight:600}}>{rec.stockQty}</td>
                        <td style={{padding:0,background:S.border,width:2}}/>
                        <td style={S.tdRight}>{indentQty}</td>
                        <td style={S.tdRight}>{purchaseQty}</td>
                        <td style={S.tdRight}>{vendorQty}</td>
                        <td style={{padding:0,background:S.border,width:2}}/>
                        <td style={{...S.tdRight,color:S.accent,fontWeight:600}}>{purStoreOkQty}</td>
                        <td style={{...S.tdRight,color:S.accent,fontWeight:600}}>{vendorOkQty}</td>
                        <td style={{padding:0,background:S.border,width:2}}/>
                        <td style={S.tdRight}>{inHouseIssued}</td>
                        <td style={S.tdRight}>{vendorIssued}</td>
                        <td style={{padding:0,background:S.border,width:2}}/>
                        <td style={{...S.tdRight,fontWeight:800,fontSize:15,color:closing<0?S.danger:S.success}}>{closing}</td>
                        <td style={{...S.td,textAlign:'center'}}>
                          <div style={{display:'flex',gap:4,justifyContent:'center'}}>
                            <button className="sk-btn" style={S.btnEdit} onClick={()=>handleEdit(origIdx)}>Edit</button>
                            <button className="sk-btn" style={{...S.btnDanger,padding:'3px 8px'}} onClick={()=>handleDelete(origIdx)}>✕</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {filteredRecords.length>0&&(
                  <tfoot>
                    <tr style={{background:S.accentLight}}>
                      <td colSpan={16} style={{...S.td,fontWeight:700,color:S.textSecondary,fontSize:12,textTransform:'uppercase',letterSpacing:'0.05em'}}>
                        Total ({filteredRecords.length} items)
                      </td>
                      <td style={{padding:0,background:S.borderStrong,width:2}}/>
                      <td style={{...S.tdRight,fontWeight:800,color:totalClosing<0?S.danger:S.success,fontSize:15}}>{totalClosing}</td>
                      <td style={S.td}/>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default StockModule;
=======
import { subscribeStockRecords, addStockRecord, updateStockRecord, deleteStockRecord, subscribePurchaseOrders, subscribeVendorIssues, subscribeVendorDepts, subscribeVSIRRecords, getItemMaster } from '../utils/firestoreServices';
import { subscribePsirs } from '../utils/psirService';

interface StockRecord {
  id: number;
  itemName: string;
  itemCode: string;
  batchNo: string;
  stockQty: number;
  indentQty: number;
  purchaseQty: number;
  vendorQty: number;
  purStoreOkQty: number;
  vendorOkQty: number;
  inHouseIssuedQty: number;
  vendorIssuedQty: number;
  closingStock: number;
}

const STOCK_MODULE_FIELDS = [
  { key: "itemName", label: "Item Name", type: "text" },
  { key: "stockQty", label: "Stock Qty", type: "number" },
  { key: "indentQty", label: "Indent Qty", type: "number", readOnly: true },
  { key: "purchaseQty", label: "Purchase Qty", type: "number", readOnly: true },
  { key: "vendorQty", label: "Vendor Qty", type: "number", readOnly: true },
  { key: "purStoreOkQty", label: "Pur Store OK Qty", type: "number", readOnly: true },
  { key: "vendorOkQty", label: "Vendor OK Qty", type: "number", readOnly: true },
  { key: "inHouseIssuedQty", label: "In-House Issued Qty", type: "number" },
  { key: "vendorIssuedQty", label: "Vendor Issued Qty", type: "number" },
  { key: "closingStock", label: "Closing Stock", type: "number" }
];

const defaultItemInput: Omit<StockRecord, "id"> = {
  itemName: "",
  itemCode: "",
  batchNo: "",
  stockQty: 0,
  indentQty: 0,
  purchaseQty: 0,
  vendorQty: 0,
  purStoreOkQty: 0,
  vendorOkQty: 0,
  inHouseIssuedQty: 0,
  vendorIssuedQty: 0,
  closingStock: 0,
};

const StockModule: React.FC = () => {
  const [itemInput, setItemInput] = useState<Omit<StockRecord, "id">>(defaultItemInput);
  const [records, setRecords] = useState<StockRecord[]>([]);
  const [userUid, setUserUid] = useState<string | null>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [psirsState, setPsirsState] = useState<any[]>([]);
  const [vendorIssuesState, setVendorIssuesState] = useState<any[]>([]);
  const [inHouseIssuesState, setInHouseIssuesState] = useState<any[]>([]);
  const [vendorDeptState, setVendorDeptState] = useState<any[]>([]);
  const [purchaseOrdersState, setPurchaseOrdersState] = useState<any[]>([]);
  const [indentState, setIndentState] = useState<any[]>([]);
  const [vsirRecordsState, setVsirRecordsState] = useState<any[]>([]);
  const [itemMasterState, setItemMasterState] = useState<any[]>([]);
  const [draftPsirItems, setDraftPsirItems] = useState<any[]>([]);
  const [lastPsirEventAt, setLastPsirEventAt] = useState<string>('');
  const [, setLastPsirDetail] = useState<any>(null);
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(true);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Helper: normalization
  const normalize = (s: any) => (s === undefined || s === null ? '' : String(s).trim().toLowerCase());

  const getVendorIssuedQtyTotal = (itemCode: string) => {
    try {
      return (vendorIssuesState || []).reduce((total: number, issue: any) => {
        if (Array.isArray(issue.items)) {
          return (
            total +
            issue.items.reduce(
              (sum: number, item: any) => (item.itemCode === itemCode && typeof item.qty === 'number' ? sum + item.qty : sum),
              0
            )
          );
        }
        return total;
      }, 0);
    } catch {
      return 0;
    }
  };

  const getInHouseIssuedQtyByTransactionType = (itemCode: string, transactionType: string) => {
    try {
      return (inHouseIssuesState || []).reduce((total: number, issue: any) => {
        if (Array.isArray(issue.items)) {
          return (
            total +
            issue.items.reduce((sum: number, item: any) => {
              const matches = item.itemCode === itemCode && (item.transactionType === transactionType || transactionType === '*');
              const qty = item.issueQty || item.qty || 0;
              return matches && typeof qty === 'number' ? sum + qty : sum;
            }, 0)
          );
        }
        return total;
      }, 0);
    } catch {
      return 0;
    }
  };

  const getInHouseIssuedQtyByItemName = (itemName: string, itemCode?: string) => {
    try {
      const targetName = normalize(itemName);
      const targetCode = normalize(itemCode);
      return (inHouseIssuesState || []).reduce((total: number, issue: any) => {
        if (Array.isArray(issue.items)) {
          return (
            total +
            issue.items.reduce((sum: number, item: any) => {
              const name = normalize(item.itemName || '');
              const code = normalize(item.itemCode || '');
              const matched = (targetName && name === targetName) || (targetCode && code === targetCode);
              const qty = item.issueQty || item.qty || 0;
              return matched && typeof qty === 'number' ? sum + qty : sum;
            }, 0)
          );
        }
        return total;
      }, 0);
    } catch {
      return 0;
    }
  };

  const getInHouseIssuedQtyByItemNameStockOnly = (itemName: string, itemCode?: string) => {
    try {
      const targetName = normalize(itemName);
      const targetCode = normalize(itemCode);
      return (inHouseIssuesState || []).reduce((total: number, issue: any) => {
        if (Array.isArray(issue.items)) {
          return (
            total +
            issue.items.reduce((sum: number, item: any) => {
              const name = normalize(item.itemName || '');
              const code = normalize(item.itemCode || '');
              const matched = (targetName && name === targetName) || (targetCode && code === targetCode);
              const isStockType = item.transactionType === 'Stock';
              const qty = item.issueQty || item.qty || 0;
              return matched && isStockType && typeof qty === 'number' ? sum + qty : sum;
            }, 0)
          );
        }
        return total;
      }, 0);
    } catch {
      return 0;
    }
  };

  const getVendorDeptQtyTotal = (itemCode: string) => {
    try {
      return (vendorDeptState || []).reduce((total: number, order: any) => {
        if (Array.isArray(order.items)) {
          return (
            total +
            order.items.reduce((sum: number, item: any) => (item.itemCode === itemCode && typeof item.qty === 'number' ? sum + item.qty : sum), 0)
          );
        }
        return total;
      }, 0);
    } catch {
      return 0;
    }
  };

  const getVSIRReceivedQtyTotal = (itemCode: string) => {
    try {
      return (vsirRecordsState || []).reduce((total: number, record: any) => {
        if (record.itemCode === itemCode) {
          const okQty = typeof record.okQty === 'number' ? record.okQty : 0;
          const reworkQty = typeof record.reworkQty === 'number' ? record.reworkQty : 0;
          const rejectQty = typeof record.rejectQty === 'number' ? record.rejectQty : 0;
          return total + okQty + reworkQty + rejectQty;
        }
        return total;
      }, 0);
    } catch {
      return 0;
    }
  };

  const getAdjustedVendorIssuedQty = (itemCode: string) => {
    const vendorIssuedTotal = getVendorIssuedQtyTotal(itemCode) || 0;
    const vsirReceivedTotal = getVSIRReceivedQtyTotal(itemCode) || 0;
    return Math.max(0, vendorIssuedTotal - vsirReceivedTotal);
  };

  const getAdjustedVendorOkQty = (itemCode: string) => {
    const vendorDeptOkQty = getVendorDeptOkQtyTotal(itemCode) || 0;
    const totalInHouseIssuedVendor = getInHouseIssuedQtyByTransactionType(itemCode || '', 'Vendor') || 0;
    return Math.max(0, vendorDeptOkQty - totalInHouseIssuedVendor);
  };

  const getVendorDeptOkQtyTotal = (itemCode: string) => {
    try {
      return (vendorDeptState || []).reduce((total: number, order: any) => {
        if (Array.isArray(order.items)) {
          return (
            total +
            order.items.reduce((sum: number, item: any) => (item.itemCode === itemCode && typeof item.okQty === 'number' ? sum + item.okQty : sum), 0)
          );
        }
        return total;
      }, 0);
    } catch {
      return 0;
    }
  };

  const getIndentQtyTotal = (itemCode: string) => {
    try {
      console.log('[StockModule] Calculating indentQty for itemCode:', itemCode);
      const total = (indentState || []).reduce((total: number, indent: any) => {
        if (Array.isArray(indent.items)) {
          const indentSum = indent.items.reduce((sum: number, item: any) => {
            if (item.itemCode === itemCode && typeof item.qty === 'number') {
              console.log('[StockModule] Adding indent item qty:', item.qty, 'for itemCode:', itemCode);
              return sum + item.qty;
            }
            return sum;
          }, 0);
          return total + indentSum;
        }
        return total;
      }, 0);
      console.log('[StockModule] Total indentQty for', itemCode, ':', total);
      return total;
    } catch (e) {
      console.error('[StockModule] Error calculating indentQty:', e);
      return 0;
    }
  };

  const getPurchaseQtyTotal = (itemCode: string) => {
    try {
      let items: any[] = [];
      (purchaseOrdersState || []).forEach((entry: any) => {
        if (Array.isArray(entry.items)) items = items.concat(entry.items);
        else if (entry.itemCode && typeof entry.qty === 'number') items.push(entry);
      });
      return items.reduce((sum: number, item: any) => (item.itemCode === itemCode && typeof item.qty === 'number' ? sum + item.qty : sum), 0);
    } catch {
      return 0;
    }
  };

  const getPSIROkQtyTotal = (itemName: string, itemCode?: string) => {
    try {
      const targetName = normalize(itemName);
      const targetCode = normalize(itemCode);
      const totalFromPsirs = (psirsState || []).reduce((total: number, psir: any) => {
        if (Array.isArray(psir.items)) {
          return (
            total +
            psir.items.reduce((sum: number, item: any) => {
              const name = normalize(item.itemName || item.Item || '');
              const code = normalize(item.itemCode || item.Code || item.CodeNo || '');
              const okRaw = (item.okQty === undefined || item.okQty === null) ? 0 : Number(item.okQty || 0);
              const qtyReceivedRaw = (item.qtyReceived === undefined || item.qtyReceived === null) ? 0 : Number(item.qtyReceived || 0);
              const ok = okRaw > 0 ? okRaw : qtyReceivedRaw;
              if ((targetName && name === targetName) || (targetCode && code === targetCode)) {
                return sum + ok;
              }
              return sum;
            }, 0)
          );
        }
        return total;
      }, 0);

      const draftTotal = (draftPsirItems || []).reduce((sum: number, it: any) => {
        const name = normalize(it.itemName || it.Item || '');
        const code = normalize(it.itemCode || it.Code || it.CodeNo || '');
        const okRaw = (it.okQty === undefined || it.okQty === null) ? 0 : Number(it.okQty || 0);
        const qtyReceivedRaw = (it.qtyReceived === undefined || it.qtyReceived === null) ? 0 : Number(it.qtyReceived || 0);
        const ok = okRaw > 0 ? okRaw : qtyReceivedRaw;
        if ((targetName && name === targetName) || (targetCode && code === targetCode)) return sum + ok;
        return sum;
      }, 0);

      return totalFromPsirs + draftTotal;
    } catch (e) {
      return 0;
    }
  };

  const getAdjustedPurStoreOkQty = (itemName: string, itemCode?: string, _batchNo?: string) => {
    const psirOkQty = getPSIROkQtyTotal(itemName, itemCode) || 0;
    const totalInHouseIssuedPurchase = getInHouseIssuedQtyByTransactionType(itemCode || '', 'Purchase') || 0;
    const vendorIssuedQty = getVendorIssuedQtyTotal(itemCode || '') || 0;
    return Math.max(0, psirOkQty - totalInHouseIssuedPurchase - vendorIssuedQty);
  };

  // ─── Closing Stock helper (single source of truth) ───────────────────────
  const calcClosingStock = (
    stockQty: number,
    itemName: string,
    itemCode: string,
    batchNo?: string
  ): number => {
    return (
      (Number(stockQty) || 0)
      + (getAdjustedPurStoreOkQty(itemName, itemCode, batchNo) || 0)
      + (getAdjustedVendorOkQty(itemCode) || 0)
      - (getInHouseIssuedQtyByItemNameStockOnly(itemName, itemCode) || 0)
      - (getAdjustedVendorIssuedQty(itemCode) || 0)   // ← vendor issued deduction
    );
  };

  // Listen for same-window PSIR updates via the event bus and force re-render
  useEffect(() => {
    const psirHandler = (ev: Event) => {
      try {
        const ce = ev as CustomEvent;
        setLastPsirEventAt(new Date().toISOString());
        setLastPsirDetail((ce && (ce as any).detail) || null);
        const det = (ce && (ce as any).detail) || {};
        if (det.draftItem) {
          setDraftPsirItems(prev => [...prev, det.draftItem]);
        } else if (det.psirs) {
          setDraftPsirItems([]);
        }
      } catch (err) {}
      setRecords(prev => [...prev]);
    };
    try {
      bus.addEventListener('psir.updated', psirHandler as EventListener);
    } catch (err) {}
    return () => { try { bus.removeEventListener('psir.updated', psirHandler as EventListener); } catch (err) {} };
  }, []);

  // Load item master & track auth state
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      const uid = u ? u.uid : null;
      setUserUid(uid);
    });
    return () => { try { unsubAuth(); } catch {} };
  }, []);

  // Subscribe to Firestore stockRecords when user is signed in
  useEffect(() => {
    let unsub: (() => void) | null = null;
    if (userUid) {
      try {
        unsub = subscribeStockRecords(userUid, (docs: any[]) => {
          const mapped = docs.map(d => ({
            id: d.id,
            itemName: d.itemName || '',
            itemCode: d.itemCode || '',
            batchNo: d.batchNo || '',
            stockQty: Number(d.stockQty) || 0,
            indentQty: Number(d.indentQty) || 0,
            purchaseQty: Number(d.purchaseQty) || 0,
            vendorQty: Number(d.vendorQty) || 0,
            purStoreOkQty: Number(d.purStoreOkQty) || 0,
            vendorOkQty: Number(d.vendorOkQty) || 0,
            inHouseIssuedQty: Number(d.inHouseIssuedQty) || 0,
            vendorIssuedQty: Number(d.vendorIssuedQty) || 0,
            closingStock: Number(d.closingStock) || 0,
          } as StockRecord));
          setRecords(mapped);
        });
      } catch (err) {
        console.error('[StockModule] subscribeStockRecords error:', err);
      }
    } else {
      setRecords([]);
    }

    let unsubPsir: (() => void) | null = null;
    let unsubVendorIssues: (() => void) | null = null;
    let unsubVendorDepts: (() => void) | null = null;
    let unsubPurchaseOrders: (() => void) | null = null;
    let unsubVSIR: (() => void) | null = null;
    let unsubInHouse: (() => void) | null = null;
    let unsubIndent: (() => void) | null = null;

    if (userUid) {
      try { unsubPsir = subscribePsirs(userUid, (docs) => setPsirsState(docs)); } catch {}
      try { unsubVendorIssues = subscribeVendorIssues(userUid, (docs) => setVendorIssuesState(docs)); } catch {}
      try { unsubVendorDepts = subscribeVendorDepts(userUid, (docs) => setVendorDeptState(docs)); } catch {}
      try { unsubPurchaseOrders = subscribePurchaseOrders(userUid, (docs) => setPurchaseOrdersState(docs)); } catch {}
      try { unsubVSIR = subscribeVSIRRecords(userUid, (docs) => setVsirRecordsState(docs)); } catch {}

      try {
        const coll = collection(db, 'users', userUid, 'inHouseIssues');
        unsubInHouse = onSnapshot(coll, snap => setInHouseIssuesState(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))));
      } catch {}
      try {
        const coll2 = collection(db, 'users', userUid, 'indentData');
        unsubIndent = onSnapshot(coll2, snap => setIndentState(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))));
      } catch {}

      console.log('[StockModule] Auth effect: userUid set to', userUid);

      (async () => {
        try {
          const items = await getItemMaster(userUid);
          console.log('[StockModule] ✅ getItemMaster returned:', items?.length || 0, 'items', items);
          setItemMasterState((items || []) as any[]);
        } catch (e) {
          console.error('[StockModule] ❌ getItemMaster failed', e);
          setItemMasterState([]);
        }
      })();
    } else {
      setPsirsState([]);
      setVendorIssuesState([]);
      setInHouseIssuesState([]);
      setVendorDeptState([]);
      setPurchaseOrdersState([]);
      setIndentState([]);
      setVsirRecordsState([]);
      setItemMasterState([]);
    }

    return () => {
      try { if (unsub) unsub(); } catch {}
      try { if (unsubPsir) unsubPsir(); } catch {}
      try { if (unsubVendorIssues) unsubVendorIssues(); } catch {}
      try { if (unsubVendorDepts) unsubVendorDepts(); } catch {}
      try { if (unsubPurchaseOrders) unsubPurchaseOrders(); } catch {}
      try { if (unsubVSIR) unsubVSIR(); } catch {}
      try { if (unsubInHouse) unsubInHouse(); } catch {}
      try { if (unsubIndent) unsubIndent(); } catch {}
    };
  }, [userUid]);

  useEffect(() => {
    console.log('[StockModule] indentState updated:', indentState.length, 'indents');
    if (indentState.length > 0) {
      console.log('[StockModule] Sample indent:', indentState[0]);
    }
  }, [indentState]);

  useEffect(() => {
    if (itemInput.itemName || itemInput.itemCode) {
      const psirOkQty = getPSIROkQtyTotal(itemInput.itemName, itemInput.itemCode) || 0;
      const totalInHouseIssuedPurchase = getInHouseIssuedQtyByTransactionType(itemInput.itemCode || "", "Purchase") || 0;
      const vendorIssuedQty = getAdjustedVendorIssuedQty(itemInput.itemCode || "") || 0;
      const purStoreOkQty = Math.max(0, psirOkQty - totalInHouseIssuedPurchase - vendorIssuedQty);

      const vendorDeptOkQty = getVendorDeptOkQtyTotal(itemInput.itemCode || "") || 0;
      const totalInHouseIssuedVendor = getInHouseIssuedQtyByTransactionType(itemInput.itemCode || "", "Vendor") || 0;
      const vendorOkQty = Math.max(0, vendorDeptOkQty - totalInHouseIssuedVendor);

      setDebugInfo({
        itemName: itemInput.itemName,
        itemCode: itemInput.itemCode,
        psirOkQty,
        totalInHouseIssuedPurchase,
        vendorIssuedQty,
        purStoreOkQty,
        vendorDeptOkQty,
        totalInHouseIssuedVendor,
        vendorOkQty
      });
    } else {
      setDebugInfo(null);
    }
  }, [itemInput.itemName, itemInput.itemCode, draftPsirItems]);

  useEffect(() => {
    try {
      bus.dispatchEvent(new CustomEvent('stock.updated', { detail: { records } }));
    } catch (err) {
      console.error('[StockModule] Error dispatching stock.updated:', err);
    }
  }, [records]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (name === "itemName") {
      const found = itemMasterState.find((item) => item.itemCode === value);
      console.log('[StockModule] item selected by code:', value, 'found item:', found);
      setItemInput((prev) => ({
        ...prev,
        itemName: found ? found.itemName : "",
        itemCode: found ? found.itemCode : "",
      }));
    } else {
      setItemInput((prev) => ({
        ...prev,
        [name]: type === "number" ? Number(value) : value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemInput.itemName) {
      alert("Item Name is required.");
      return;
    }

    const vendorIssuedTotal = getVendorIssuedQtyTotal(itemInput.itemCode) || 0;
    const vendorDeptTotal = getVendorDeptQtyTotal(itemInput.itemCode) || 0;
    const vsirReceivedTotal = getVSIRReceivedQtyTotal(itemInput.itemCode) || 0;
    const vendorIssuedQtyAdjusted = Math.max(0, vendorIssuedTotal - vsirReceivedTotal);
    const purStoreOkQtyAdjusted = getAdjustedPurStoreOkQty(itemInput.itemName, itemInput.itemCode, itemInput.batchNo) || 0;
    const inHouseIssuedStockOnly = getInHouseIssuedQtyByItemNameStockOnly(itemInput.itemName, itemInput.itemCode) || 0;

    const autoRecord = {
      ...itemInput,
      indentQty: getIndentQtyTotal(itemInput.itemCode) || 0,
      purchaseQty: getPurchaseQtyTotal(itemInput.itemCode) || 0,
      vendorQty: Math.max(0, vendorDeptTotal - vendorIssuedTotal),
      purStoreOkQty: purStoreOkQtyAdjusted,
      vendorOkQty: getAdjustedVendorOkQty(itemInput.itemCode) || 0,
      inHouseIssuedQty: getInHouseIssuedQtyByItemName(itemInput.itemName, itemInput.itemCode) || 0,
      vendorIssuedQty: vendorIssuedQtyAdjusted,
      // ── FIXED: vendor issued qty now reduces closing stock ──
      closingStock:
        (Number(itemInput.stockQty) || 0)
        + purStoreOkQtyAdjusted
        + (getAdjustedVendorOkQty(itemInput.itemCode) || 0)
        - inHouseIssuedStockOnly
        - vendorIssuedQtyAdjusted,
    };

    console.log('[DEBUG] handleSubmit - Full Payload:', {
      itemInput,
      calculations: { vendorIssuedTotal, vendorDeptTotal, vsirReceivedTotal, vendorIssuedQtyAdjusted, purStoreOkQtyAdjusted },
      autoRecord
    });

    if (editIdx !== null) {
      const existing = records[editIdx];
      if (userUid && existing && typeof (existing as any).id === 'string') {
        try {
          await updateStockRecord(userUid, String((existing as any).id), autoRecord);
          setRecords((prev) =>
            prev.map((rec, idx) => (idx === editIdx ? { ...autoRecord, id: rec.id } : rec))
          );
        } catch (err) {
          console.error('[StockModule] Failed to update stock record in Firestore:', err);
        }
      } else {
        setRecords((prev) =>
          prev.map((rec, idx) => (idx === editIdx ? { ...autoRecord, id: rec.id } : rec))
        );
      }
      setEditIdx(null);
    } else {
      if (userUid) {
        try {
          const newId = await addStockRecord(userUid, autoRecord);
          setRecords((prev) => [...prev, { ...autoRecord, id: newId } as any]);
        } catch (err) {
          console.error('[StockModule] Failed to add stock record to Firestore:', err);
          setRecords((prev) => [...prev, { ...autoRecord, id: Date.now() }]);
        }
      } else {
        setRecords((prev) => [...prev, { ...autoRecord, id: Date.now() }]);
      }
    }
    setItemInput(defaultItemInput);
  };

  const handleEdit = (idx: number) => {
    setItemInput(records[idx]);
    setEditIdx(idx);
  };

  const handleDelete = async (idx: number) => {
    const rec = records[idx];
    if (userUid && rec && typeof (rec as any).id === 'string') {
      try {
        await deleteStockRecord(userUid, String((rec as any).id));
      } catch (err) {
        console.error('[StockModule] Failed to delete stock record from Firestore:', err);
        alert('Failed to delete record. Please try again.');
      }
    } else {
      setRecords((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  return (
    <div>
      <h2>Stock Module</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        {STOCK_MODULE_FIELDS.map((field) => (
          <div key={field.key} style={{ flex: "1 1 200px", minWidth: 180 }}>
            <label style={{ display: "block", marginBottom: 4 }}>{field.label}</label>
            {field.key === "itemName" ? (
              <select
                name="itemName"
                value={itemInput.itemCode}
                onChange={handleChange}
                style={{ width: "100%", padding: 6, borderRadius: 4, border: itemMasterState.length === 0 ? "2px solid red" : "1px solid #bbb" }}
              >
                <option value="">
                  {itemMasterState.length === 0 ? "No items in Item Master" : "Select Item Name"}
                </option>
                {itemMasterState.map((item) => (
                  <option key={item.id || item.itemCode} value={item.itemCode}>
                    {item.itemName} - {item.itemCode}
                  </option>
                ))}
              </select>
            ) : field.key === "indentQty" ? (
              <input
                type="number"
                name="indentQty"
                value={getIndentQtyTotal(itemInput.itemCode) || 0}
                readOnly
                style={{ width: "100%", padding: 6, borderRadius: 4, border: "1px solid #bbb", background: "#eee" }}
              />
            ) : field.key === "purchaseQty" ? (
              <input
                type="number"
                name="purchaseQty"
                value={getPurchaseQtyTotal(itemInput.itemCode) || 0}
                readOnly
                style={{ width: "100%", padding: 6, borderRadius: 4, border: "1px solid #bbb", background: "#eee" }}
              />
            ) : field.key === "vendorQty" ? (
              <input
                type="number"
                name="vendorQty"
                value={Math.max(0, (getVendorDeptQtyTotal(itemInput.itemCode) || 0) - (getVendorIssuedQtyTotal(itemInput.itemCode) || 0))}
                readOnly
                style={{ width: "100%", padding: 6, borderRadius: 4, border: "1px solid #bbb", background: "#eee" }}
              />
            ) : field.key === "purStoreOkQty" ? (
              <input
                type="number"
                name="purStoreOkQty"
                value={getAdjustedPurStoreOkQty(itemInput.itemName, itemInput.itemCode, itemInput.batchNo) || 0}
                readOnly
                style={{ width: "100%", padding: 6, borderRadius: 4, border: "1px solid #bbb", background: "#eee" }}
              />
            ) : field.key === "vendorOkQty" ? (
              <input
                type="number"
                name="vendorOkQty"
                value={getAdjustedVendorOkQty(itemInput.itemCode) || 0}
                readOnly
                style={{ width: "100%", padding: 6, borderRadius: 4, border: "1px solid #bbb", background: "#eee" }}
              />
            ) : field.key === "inHouseIssuedQty" ? (
              <input
                type="number"
                name="inHouseIssuedQty"
                value={getInHouseIssuedQtyByItemName(itemInput.itemName, itemInput.itemCode) || 0}
                readOnly
                style={{ width: "100%", padding: 6, borderRadius: 4, border: "1px solid #bbb", background: "#eee" }}
              />
            ) : field.key === "vendorIssuedQty" ? (
              <input
                type="number"
                name="vendorIssuedQty"
                value={getAdjustedVendorIssuedQty(itemInput.itemCode) || 0}
                readOnly
                style={{ width: "100%", padding: 6, borderRadius: 4, border: "1px solid #bbb", background: "#eee" }}
              />
            ) : field.key === "closingStock" ? (
              <input
                type="number"
                name="closingStock"
                value={calcClosingStock(itemInput.stockQty, itemInput.itemName, itemInput.itemCode, itemInput.batchNo)}
                readOnly
                style={{ width: "100%", padding: 6, borderRadius: 4, border: "1px solid #bbb", background: "#eee" }}
              />
            ) : (
              <input
                type={field.type}
                name={field.key}
                value={(itemInput as any)[field.key] || ""}
                onChange={handleChange}
                required
                readOnly={field.readOnly}
                style={{ width: "100%", padding: 6, borderRadius: 4, border: "1px solid #bbb" }}
              />
            )}
          </div>
        ))}
        <button
          type="submit"
          style={{
            padding: "10px 24px",
            background: "#1a237e",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            fontWeight: 500,
            marginTop: 24,
          }}
        >
          {editIdx !== null ? "Update" : "Add"}
        </button>
      </form>

      <div style={{ marginBottom: 12, padding: 12, background: showDebugPanel ? '#e3f2fd' : '#f5f5f5', border: '2px solid #1976d2', borderRadius: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <strong style={{ fontSize: '16px' }}>🐛 DEBUG PANEL - Pur Store OK Qty Calculation</strong>
          <button
            onClick={() => setShowDebugPanel(!showDebugPanel)}
            style={{ padding: '6px 12px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '12px' }}
          >
            {showDebugPanel ? 'Hide' : 'Show'}
          </button>
        </div>

        {showDebugPanel && (
          <div style={{ background: '#fff', padding: 12, borderRadius: 4, border: '1px solid #90caf9' }}>
            {debugInfo ? (
              <div>
                <div style={{ marginBottom: 12, padding: 8, background: '#f3e5f5', borderRadius: 4 }}>
                  <strong>Current Item:</strong> {debugInfo.itemName || '(none)'} [{debugInfo.itemCode || '(none)'}]
                </div>

                <div style={{ marginBottom: 12, padding: 8, background: '#fff3e0', borderRadius: 4 }}>
                  <strong style={{ display: 'block', marginBottom: 4, color: '#f57c00' }}>PSIR OK Qty Calculation:</strong>
                  <div style={{ marginLeft: 16 }}>
                    <div>Total PSIR OK Qty: <strong style={{ color: '#f57c00', fontSize: '16px' }}>{debugInfo.psirOkQty || 0}</strong></div>
                  </div>
                </div>

                <div style={{ marginBottom: 12, padding: 8, background: '#e8f5e9', borderRadius: 4 }}>
                  <strong style={{ display: 'block', marginBottom: 4, color: '#2e7d32' }}>In-House Issued Qty - Transaction Type: "Purchase" (Deduction):</strong>
                  <div style={{ marginLeft: 16 }}>
                    Total In-House Issued (Purchase): <strong style={{ color: '#2e7d32', fontSize: '16px' }}>{debugInfo.totalInHouseIssuedPurchase || 0}</strong>
                  </div>
                </div>

                <div style={{ marginBottom: 12, padding: 8, background: '#ffe0b2', borderRadius: 4 }}>
                  <strong style={{ display: 'block', marginBottom: 4, color: '#e65100' }}>Vendor Issued Qty - From Vendor Issue Module (Deduction):</strong>
                  <div style={{ marginLeft: 16 }}>
                    Total Vendor Issued: <strong style={{ color: '#e65100', fontSize: '16px' }}>{debugInfo.vendorIssuedQty || 0}</strong>
                  </div>
                </div>

                <div style={{ padding: 12, background: '#c8e6c9', borderRadius: 4, border: '2px solid #2e7d32', marginBottom: 12 }}>
                  <strong style={{ display: 'block', marginBottom: 4, color: '#1b5e20', fontSize: '16px' }}>Final Pur Store OK Qty:</strong>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1b5e20' }}>
                    {debugInfo.psirOkQty || 0} - {debugInfo.totalInHouseIssuedPurchase || 0} - {debugInfo.vendorIssuedQty || 0} = <span style={{ color: '#d32f2f', fontSize: '24px' }}>{debugInfo.purStoreOkQty || 0}</span>
                  </div>
                </div>

                <div style={{ marginBottom: 12, padding: 8, background: '#f3e0f5', borderRadius: 4 }}>
                  <strong style={{ display: 'block', marginBottom: 4, color: '#7b1fa2' }}>Vendor Dept OK Qty - Transaction Type: "Vendor" Deduction:</strong>
                  <div style={{ marginLeft: 16 }}>
                    Vendor Dept OK Qty: <strong style={{ color: '#7b1fa2', fontSize: '16px' }}>{debugInfo.vendorDeptOkQty || 0}</strong>
                    <div style={{ marginTop: 4 }}>In-House Issued (Vendor): <strong style={{ color: '#7b1fa2', fontSize: '16px' }}>{debugInfo.totalInHouseIssuedVendor || 0}</strong></div>
                  </div>
                </div>

                <div style={{ padding: 12, background: '#e1bee7', borderRadius: 4, border: '2px solid #7b1fa2', marginBottom: 12 }}>
                  <strong style={{ display: 'block', marginBottom: 4, color: '#4a148c', fontSize: '16px' }}>Final Vendor OK Qty:</strong>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4a148c' }}>
                    {debugInfo.vendorDeptOkQty || 0} - {debugInfo.totalInHouseIssuedVendor || 0} = <span style={{ color: '#d32f2f', fontSize: '28px' }}>{debugInfo.vendorOkQty || 0}</span>
                  </div>
                </div>

                <div style={{ marginTop: 12, padding: 8, background: '#eceff1', borderRadius: 4, fontSize: '12px' }}>
                  <div>Last psir.updated event: {lastPsirEventAt || '(none)'}</div>
                </div>
              </div>
            ) : (
              <div style={{ color: '#666', fontStyle: 'italic' }}>Enter an item and its values will appear here...</div>
            )}
          </div>
        )}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fafbfc" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #ddd", padding: 8, background: "#e3e6f3", fontWeight: 600 }}>S.No</th>
              {STOCK_MODULE_FIELDS.map((field) => (
                <th key={field.key} style={{ border: "1px solid #ddd", padding: 8, background: "#e3e6f3" }}>
                  {field.label}
                </th>
              ))}
              <th style={{ border: "1px solid #ddd", padding: 8, background: "#e3e6f3" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((rec, idx) => (
              <tr key={rec.id}>
                <td style={{ border: "1px solid #eee", padding: 8 }}>{idx + 1}</td>
                {STOCK_MODULE_FIELDS.map((field) => (
                  <td key={field.key} style={{ border: "1px solid #eee", padding: 8 }}>
                    {field.key === "purStoreOkQty"
                      ? getAdjustedPurStoreOkQty(rec.itemName, rec.itemCode, rec.batchNo)
                      : field.key === "indentQty"
                      ? getIndentQtyTotal(rec.itemCode)
                      : field.key === "purchaseQty"
                      ? getPurchaseQtyTotal(rec.itemCode)
                      : field.key === "vendorQty"
                      ? Math.max(0, (getVendorDeptQtyTotal(rec.itemCode) || 0) - (getVendorIssuedQtyTotal(rec.itemCode) || 0))
                      : field.key === "vendorOkQty"
                      ? getAdjustedVendorOkQty(rec.itemCode)
                      : field.key === "inHouseIssuedQty"
                      ? getInHouseIssuedQtyByItemName(rec.itemName, rec.itemCode)
                      : field.key === "vendorIssuedQty"
                      ? getAdjustedVendorIssuedQty(rec.itemCode)
                      : field.key === "closingStock"
                      // ── FIXED: vendor issued qty now reduces closing stock in table too ──
                      ? calcClosingStock(rec.stockQty, rec.itemName, rec.itemCode, rec.batchNo)
                      : (rec as any)[field.key]}
                  </td>
                ))}
                <td style={{ border: "1px solid #eee", padding: 8 }}>
                  <button
                    style={{ marginRight: 8, background: "#1976d2", color: "#fff", border: "none", padding: "4px 12px" }}
                    onClick={() => handleEdit(idx)}
                  >
                    Edit
                  </button>
                  <button
                    style={{ background: "#e53935", color: "#fff", border: "none", padding: "4px 12px" }}
                    onClick={() => handleDelete(idx)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StockModule;
>>>>>>> ea2b60370e32f18454b4b30c524aa7881340b2ee
