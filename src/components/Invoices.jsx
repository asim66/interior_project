import React, { useState } from 'react';
import { invTotal, invReceived, invoiceBalance, invStatus, dstr, today, uid, fmt, invoiceHasPaymentHistory } from '../shared';
import { Empty, Confirm, Modal, Field } from './ui';
import { PaymentForm } from './Payments';

export function Invoices({data,M,cur,S,upsert,remove,flash,setData}){
  const [edit,setEdit]=useState(null);const [del,setDel]=useState(null);const [preview,setPreview]=useState(null);const [pay,setPay]=useState(null);const [fp,setFp]=useState('all');
  let list=[...data.invoices].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  if(fp!=='all')list=list.filter(i=>i.projectId===fp);
  const pname=id=>data.projects.find(p=>p.id===id)?.name||'—';
  const requestDelete=inv=>{
    if(inv.status!=='draft'){flash('Only draft invoices can be deleted');return;}
    if(invoiceHasPaymentHistory(data,inv.id)){flash('Invoice has payment history and cannot be deleted');return;}
    setDel(inv);
  };
  const requestEdit=inv=>{
    if(inv.status!=='draft'){flash('Issued invoices are locked; create an adjustment instead');return;}
    if(invoiceHasPaymentHistory(data,inv.id)){flash('Invoice has payment history and cannot be edited');return;}
    setEdit(inv);
  };
  return(<>
    <div className="topbar"><div><h1>Invoices</h1><div className="desc">Bill clients, track what's paid, print or export.</div></div>
      <button className="btn primary" onClick={()=>setEdit({})} disabled={data.projects.length===0}>+ New invoice</button></div>
    <div className="content">
      <div className="toolbar">
        <div className="field-inline"><span style={{fontSize:12,color:'var(--muted)'}}>Project</span>
          <select className="ctl" value={fp} onChange={e=>setFp(e.target.value)}><option value="all">All projects</option>
            {data.projects.map(p=>(<option key={p.id} value={p.id}>{p.name}</option>))}</select></div>
      </div>
      {data.projects.length===0?<div className="card"><Empty icon="❋" title="Create a project first" text="Invoices are billed against a project and its client." /></div>
      :list.length===0?<div className="card"><Empty icon="❋" title="No invoices yet" text="Generate a professional invoice with line items, tax and due date."
        action={<button className="btn primary" onClick={()=>setEdit({})}>Create an invoice</button>}/></div>
      :<div className="card"><div className="card-b"><table>
        <thead><tr><th>Number</th><th>Project</th><th>Date</th><th>Due</th><th className="r">Total</th><th className="r">Received</th><th>Status</th><th></th></tr></thead>
        <tbody>{list.map(i=>{const t=invTotal(i);const st=invStatus(i,data.paymentsReceived);const rec=invReceived(i,data.paymentsReceived);
          return(<tr key={i.id}>
            <td style={{fontWeight:600}} className="row-click" onClick={()=>setPreview(i)}>{i.number}</td>
            <td>{pname(i.projectId)}</td><td>{dstr(i.date)}</td><td>{dstr(i.dueDate)}</td>
            <td className="r num">{M(t.total)}</td><td className="r num">{M(rec)}</td>
            <td><span className={"pill "+st.c}>{st.t}</span></td>
            <td className="r"><div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
              {st.k!=='paid'&&<button className="btn sm" onClick={()=>setPay(i)}>Record payment</button>}
              <button className="btn sm ghost" onClick={()=>setPreview(i)}>View</button>
              <button className="btn sm ghost" onClick={()=>requestEdit(i)}>Edit</button>
              <button className="btn sm ghost" onClick={()=>requestDelete(i)}>×</button>
            </div></td>
          </tr>);})}
        </tbody></table></div></div>}
    </div>
    {edit&&<InvoiceForm rec={edit} data={data} S={S} onClose={()=>setEdit(null)}
      onSave={(r,newSeq)=>{const {_new,...record}=r;upsert('invoices',record);if(newSeq)setData(d=>({...d,settings:{...d.settings,invSeq:newSeq}}));flash(_new?'Invoice created':'Invoice updated');setEdit(null);}}/>}
    {preview&&<InvoicePreview inv={preview} data={data} cur={cur} S={S} onClose={()=>setPreview(null)}/>}
    {pay&&<PaymentForm kind="received" data={data} M={M} fixedInvoice={pay} onClose={()=>setPay(null)}
      onSave={r=>{upsert('paymentsReceived',r);if(pay.status==='draft')upsert('invoices',{...pay,status:'sent'});flash('Payment recorded');setPay(null);}}/>}
    {del&&<Confirm text={`Delete invoice ${del.number}?`} onClose={()=>setDel(null)} onYes={()=>{remove('invoices',del.id);flash('Invoice deleted');}}/>}
  </>);
}

export function InvoiceForm({rec,data,S,onClose,onSave}){
  const isNew=!rec.id;
  const [error,setError]=useState('');
  const [f,setF]=useState({
    id:rec.id,projectId:rec.projectId||data.projects[0]?.id||'',
    number:rec.number||(S.invPrefix+String(S.invSeq).padStart(3,'0')),
    date:rec.date||today(),dueDate:rec.dueDate||'',status:rec.status||'draft',
    taxRate:rec.taxRate??S.taxRate,discount:rec.discount||0,notes:rec.notes||'',
    items:rec.items&&rec.items.length?rec.items.map(x=>({...x})):[{desc:'',qty:1,rate:''}]
  });
  const set=(k,v)=>setF(s=>({...s,[k]:v}));
  const setItem=(i,k,v)=>setF(s=>({...s,items:s.items.map((it,j)=>j===i?{...it,[k]:v}:it)}));
  const addItem=()=>setF(s=>({...s,items:[...s.items,{desc:'',qty:1,rate:''}]}));
  const delItem=i=>setF(s=>({...s,items:s.items.filter((_,j)=>j!==i)}));
  const t=invTotal(f);
  const save=()=>{
    const number=f.number.trim();
    const items=f.items.filter(it=>it.desc||it.rate).map(it=>({...it,desc:it.desc.trim(),qty:Number(it.qty)||0,rate:Number(it.rate)||0}));
    if(!f.projectId){setError('Select a project.');return;}
    if(!number){setError('Invoice number is required.');return;}
    if(data.invoices.some(i=>i.id!==f.id&&i.number.toLowerCase()===number.toLowerCase())){setError('Invoice number already exists.');return;}
    if(!items.length||items.some(it=>!it.desc||it.qty<=0||it.rate<0)){setError('Each line needs a description, positive quantity and valid rate.');return;}
    const discount=Math.max(0,Number(f.discount)||0);
    if(discount>t.sub){setError('Discount cannot exceed the subtotal.');return;}
    if(Number(f.taxRate)<0){setError('Tax rate cannot be negative.');return;}
    const clean={...f,number,items,taxRate:Number(f.taxRate)||0,discount};
    if(isNew){onSave({...clean,id:uid('inv'),_new:true},S.invSeq+1);}
    else onSave(clean);
  };
  const M=n=>fmt(n,S.currency);
  return(<Modal wide title={isNew?'New invoice':'Edit invoice '+f.number} onClose={onClose}
    footer={<><div style={{marginRight:'auto',fontSize:13,color:'var(--ink-2)'}}>Total: <b className="num serif" style={{fontSize:17}}>{M(t.total)}</b></div>
      <button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>{isNew?'Create invoice':'Save changes'}</button></>}>
    <div className="grid3">
      <Field label="Project"><select value={f.projectId} onChange={e=>set('projectId',e.target.value)}>
        {data.projects.map(p=>(<option key={p.id} value={p.id}>{p.name}</option>))}</select></Field>
      <Field label="Invoice #"><input value={f.number} onChange={e=>set('number',e.target.value)}/></Field>
      <Field label="Status"><select value={f.status} onChange={e=>set('status',e.target.value)}>
        <option value="draft">Draft</option><option value="sent">Sent</option></select></Field>
    </div>
    {error&&<div className="form-error">{error}</div>}
    <div className="grid2">
      <Field label="Invoice date"><input type="date" value={f.date} onChange={e=>set('date',e.target.value)}/></Field>
      <Field label="Due date"><input type="date" value={f.dueDate} onChange={e=>set('dueDate',e.target.value)}/></Field>
    </div>
    <label style={{fontSize:12,fontWeight:600,color:'var(--ink-2)'}}>Line items</label>
    <div className="lineitems" style={{marginTop:6}}>
      <div className="li-head"><span>Description</span><span>Qty</span><span>Rate</span><span>Amount</span><span></span></div>
      {f.items.map((it,i)=>(<div className="li-row" key={i}>
        <input value={it.desc} placeholder="Design fee, materials, labour…" onChange={e=>setItem(i,'desc',e.target.value)}/>
        <input type="number" value={it.qty} onChange={e=>setItem(i,'qty',e.target.value)}/>
        <input type="number" value={it.rate} placeholder="0" onChange={e=>setItem(i,'rate',e.target.value)}/>
        <span className="num" style={{fontSize:13}}>{M((Number(it.qty)||0)*(Number(it.rate)||0))}</span>
        <button className="li-del" onClick={()=>delItem(i)} disabled={f.items.length===1}>×</button>
      </div>))}
    </div>
    <button className="btn sm" onClick={addItem}>+ Add line</button>
    <div className="grid2" style={{marginTop:16}}>
      <Field label="Discount" hint="Flat amount"><input type="number" value={f.discount} onChange={e=>set('discount',e.target.value)}/></Field>
      <Field label={S.taxLabel+' rate (%)'}><input type="number" value={f.taxRate} onChange={e=>set('taxRate',e.target.value)}/></Field>
    </div>
    <div style={{background:'var(--surface-2)',border:'1px solid var(--line-2)',borderRadius:8,padding:'12px 16px',marginBottom:14}}>
      <div style={{display:'flex',justifyContent:'space-between',padding:'3px 0'}}><span>Subtotal</span><span className="num">{M(t.sub)}</span></div>
      {t.disc>0&&<div style={{display:'flex',justifyContent:'space-between',padding:'3px 0'}}><span>Discount</span><span className="num">−{M(t.disc)}</span></div>}
      <div style={{display:'flex',justifyContent:'space-between',padding:'3px 0'}}><span>{S.taxLabel} ({f.taxRate}%)</span><span className="num">{M(t.tax)}</span></div>
      <div style={{display:'flex',justifyContent:'space-between',padding:'6px 0 0',fontWeight:600,borderTop:'1px solid var(--line)',marginTop:5}}><span>Total</span><span className="num serif" style={{fontSize:16}}>{M(t.total)}</span></div>
    </div>
    <Field label="Notes / terms"><textarea value={f.notes} onChange={e=>set('notes',e.target.value)} placeholder="Payment terms, bank details, thank-you note…"/></Field>
  </Modal>);
}

export function InvoicePreview({inv,data,cur,S,onClose}){
  const p=data.projects.find(x=>x.id===inv.projectId);
  const t=invTotal(inv);const rec=invReceived(inv,data.paymentsReceived);
  const M=n=>fmt(n,cur);
  return(<Modal wide title={'Invoice '+inv.number} onClose={onClose}
    footer={<><button className="btn ghost" onClick={onClose}>Close</button><button className="btn primary" onClick={()=>window.print()}>🖶 Print / Save PDF</button></>}>
    <div id="invoice-print" className="inv-doc">
      <div className="inv-top">
        <div><div className="co">{S.studioName}</div><div className="tag">{S.address}</div></div>
        <div className="rt"><div className="big">INVOICE</div><div style={{marginTop:6,fontWeight:600}}>{inv.number}</div></div>
      </div>
      <div className="inv-meta">
        <div className="blk"><div className="h">Billed to</div><div style={{fontWeight:600}}>{p?.client||'—'}</div>
          <div style={{color:'#555',whiteSpace:'pre-line'}}>{p?.address}</div>
          {p?.clientEmail&&<div style={{color:'#555'}}>{p.clientEmail}</div>}
          {p?.clientPhone&&<div style={{color:'#555'}}>{p.clientPhone}</div>}</div>
        <div className="blk rt" style={{textAlign:'right'}}>
          <div><span style={{color:'#888'}}>Project: </span>{p?.name}</div>
          <div><span style={{color:'#888'}}>Date: </span>{dstr(inv.date)}</div>
          <div><span style={{color:'#888'}}>Due: </span>{dstr(inv.dueDate)}</div>
        </div>
      </div>
      <table className="inv-tbl"><thead><tr><th style={{textAlign:'left'}}>Description</th><th style={{textAlign:'right'}}>Qty</th><th style={{textAlign:'right'}}>Rate</th><th style={{textAlign:'right'}}>Amount</th></tr></thead>
        <tbody>{(inv.items||[]).map((it,i)=>(<tr key={i}><td>{it.desc}</td><td style={{textAlign:'right'}} className="num">{it.qty}</td>
          <td style={{textAlign:'right'}} className="num">{M(it.rate)}</td><td style={{textAlign:'right'}} className="num">{M((Number(it.qty)||0)*(Number(it.rate)||0))}</td></tr>))}</tbody></table>
      <div className="inv-tot">
        <div className="rw"><span>Subtotal</span><span className="num">{M(t.sub)}</span></div>
        {t.disc>0&&<div className="rw"><span>Discount</span><span className="num">−{M(t.disc)}</span></div>}
        <div className="rw"><span>{S.taxLabel} ({inv.taxRate||0}%)</span><span className="num">{M(t.tax)}</span></div>
        <div className="rw grand"><span>Total</span><span className="num">{M(t.total)}</span></div>
        {rec>0&&<><div className="rw"><span>Received</span><span className="num">−{M(rec)}</span></div>
          <div className="rw" style={{fontWeight:600}}><span>Balance due</span><span className="num">{M(invoiceBalance(inv,data.paymentsReceived))}</span></div></>}
      </div>
      {inv.notes&&<div className="inv-note">{inv.notes}</div>}
    </div>
  </Modal>);
}
