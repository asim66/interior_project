import React, { useState } from 'react';
import { sum, dstr, today, uid, invoiceBalance, expenseBalance, isActivePayment, METHODS } from '../shared';
import { Empty, Confirm, Modal, Field } from './ui';

export function Payments({data,M,upsert,flash,setData}){
  const [tab,setTab]=useState('received');const [edit,setEdit]=useState(null);const [del,setDel]=useState(null);const [fp,setFp]=useState('all');
  const pname=id=>data.projects.find(p=>p.id===id)?.name||'—';
  const vname=id=>data.vendors.find(v=>v.id===id)?.name||'—';
  const billName=id=>{const e=data.expenses.find(x=>x.id===id);return e?(e.description||e.category):'—';};
  let received=[...data.paymentsReceived].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  let made=[...data.paymentsMade].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  if(fp!=='all'){received=received.filter(x=>x.projectId===fp);made=made.filter(x=>x.projectId===fp);}
  const totalIn=sum(received.filter(isActivePayment),'amount'),totalOut=sum(made.filter(isActivePayment),'amount');
  const reversePayment=payment=>{
    const coll=payment.kind==='received'?'paymentsReceived':'paymentsMade';
    const {kind,...record}=payment;
    const reversedAt=new Date().toISOString();
    if(record.batchId){
      setData(d=>({...d,[coll]:d[coll].map(item=>item.batchId===record.batchId&&!item.reversedAt?{...item,reversedAt}:item)}));
      flash('Vendor payment batch reversed');
    }else{
      upsert(coll,{...record,reversedAt});
      flash('Payment reversed');
    }
  };
  return(<>
    <div className="topbar"><div><h1>Payments</h1><div className="desc">The cash ledger — money in from clients, money out to vendors.</div></div>
      <button className="btn primary" onClick={()=>setEdit({kind:tab})}>+ Record {tab==='received'?'receipt':'payment'}</button></div>
    <div className="content">
      <div className="toolbar">
        <div style={{display:'flex',gap:4,background:'var(--line-2)',padding:4,borderRadius:9}}>
          <button className={"btn sm "+(tab==='received'?'primary':'ghost')} onClick={()=>setTab('received')}>↓ Received</button>
          <button className={"btn sm "+(tab==='made'?'primary':'ghost')} onClick={()=>setTab('made')}>↑ Made</button>
        </div>
        <select className="ctl" value={fp} onChange={e=>setFp(e.target.value)}><option value="all">All projects</option>{data.projects.map(p=>(<option key={p.id} value={p.id}>{p.name}</option>))}</select>
        <div className="spacer"></div>
        <div style={{fontSize:13,color:'var(--ink-2)'}}>{tab==='received'?<>Received <b className="num" style={{color:'var(--green)'}}>{M(totalIn)}</b></>:<>Paid out <b className="num" style={{color:'var(--clay)'}}>{M(totalOut)}</b></>}</div>
      </div>
      {tab==='received'?(
        received.length===0?<div className="card"><Empty icon="↓" title="No receipts logged" text="Record what clients have paid you — link it to an invoice to update its status."
          action={<button className="btn primary" onClick={()=>setEdit({kind:'received'})}>Record a receipt</button>}/></div>
        :<div className="card"><div className="card-b"><table>
          <thead><tr><th>Date</th><th>Project</th><th>Invoice</th><th>Method</th><th>Reference</th><th>Status</th><th className="r">Amount</th><th></th></tr></thead>
          <tbody>{received.map(x=>(<tr key={x.id} style={isActivePayment(x)?undefined:{opacity:.55}}><td>{dstr(x.date)}</td><td>{pname(x.projectId)}</td>
            <td>{data.invoices.find(i=>i.id===x.invoiceId)?.number||'—'}</td><td>{x.method}</td><td style={{color:'var(--muted)'}}>{x.reference||'—'}</td>
            <td>{isActivePayment(x)?<span className="pill green">Posted</span>:<span className="pill gray">Reversed</span>}</td>
            <td className="r num" style={{color:'var(--green)'}}>+{M(x.amount)}</td>
            <td className="r">{isActivePayment(x)&&<button className="btn sm ghost" onClick={()=>setDel({...x,kind:'received'})}>Reverse</button>}</td>
          </tr>))}</tbody></table></div></div>
      ):(
        made.length===0?<div className="card"><Empty icon="↑" title="No payments made" text="Record money paid to vendors and contractors."
          action={<button className="btn primary" onClick={()=>setEdit({kind:'made'})}>Record a payment</button>}/></div>
        :<div className="card"><div className="card-b"><table>
          <thead><tr><th>Date</th><th>Project</th><th>Vendor</th><th>Bill</th><th>Method</th><th>Reference</th><th>Status</th><th className="r">Amount</th><th></th></tr></thead>
          <tbody>{made.map(x=>(<tr key={x.id} style={isActivePayment(x)?undefined:{opacity:.55}}><td>{dstr(x.date)}</td><td>{pname(x.projectId)}</td><td>{vname(x.vendorId)}</td><td>{billName(x.expenseId)}</td><td>{x.method}</td><td style={{color:'var(--muted)'}}>{x.reference||'—'}</td>
            <td>{isActivePayment(x)?<span className="pill green">Posted</span>:<span className="pill gray">Reversed</span>}</td>
            <td className="r num" style={{color:'var(--clay)'}}>−{M(x.amount)}</td>
            <td className="r">{isActivePayment(x)&&<button className="btn sm ghost" onClick={()=>setDel({...x,kind:'made'})}>Reverse</button>}</td>
          </tr>))}</tbody></table></div></div>
      )}
    </div>
    {edit&&<PaymentForm kind={edit.kind} rec={edit.id?edit:null} data={data} M={M} onClose={()=>setEdit(null)}
      onSave={r=>{upsert(edit.kind==='received'?'paymentsReceived':'paymentsMade',r);flash('Payment saved');setEdit(null);}}/>}
    {del&&<Confirm confirmLabel="Reverse" text="Reverse this payment? The original record will remain in the ledger and will no longer affect balances." onClose={()=>setDel(null)} onYes={()=>reversePayment(del)}/>}
  </>);
}

export function PaymentForm({kind,rec,data,M,fixedInvoice,fixedExpense,onClose,onSave}){
  const received=kind==='received';
  const inv=fixedInvoice;
  const bill=fixedExpense;
  const init={
    id:rec?.id,projectId:rec?.projectId||inv?.projectId||bill?.projectId||data.projects[0]?.id||'',
    invoiceId:rec?.invoiceId||inv?.id||'',vendorId:rec?.vendorId||bill?.vendorId||'',expenseId:rec?.expenseId||bill?.id||'',
    amount:rec?.amount||(inv?invoiceBalance(inv,data.paymentsReceived):(bill?expenseBalance(bill,data.paymentsMade):'')),
    date:rec?.date||today(),method:rec?.method||'Bank transfer',reference:rec?.reference||'',notes:rec?.notes||''
  };
  const [f,setF]=useState(init);
  const [error,setError]=useState('');
  const set=(k,v)=>setF(s=>({...s,[k]:v}));
  const save=()=>{const amount=Number(f.amount)||0;if(amount<=0){setError('Amount must be greater than zero.');return;}
    const linkedInvoice=data.invoices.find(i=>i.id===f.invoiceId);
    const linkedExpense=data.expenses.find(e=>e.id===f.expenseId);
    if(received&&linkedInvoice&&amount>invoiceBalance(linkedInvoice,data.paymentsReceived)+0.01){setError('Amount exceeds the open invoice balance. Record any excess as an unlinked advance.');return;}
    if(!received&&linkedExpense&&amount>expenseBalance(linkedExpense,data.paymentsMade)+0.01){setError('Amount exceeds the open bill balance. Record any excess as an unlinked vendor advance.');return;}
    const base={id:f.id||uid('pay'),projectId:f.projectId,amount,date:f.date,method:f.method,reference:f.reference,notes:f.notes};
    onSave(received?{...base,invoiceId:f.invoiceId}:{...base,vendorId:f.vendorId,expenseId:f.expenseId});};
  const projInvoices=data.invoices.filter(i=>i.projectId===f.projectId);
  const billOptions=data.expenses.filter(e=>(!f.projectId||e.projectId===f.projectId)&&(!f.vendorId||e.vendorId===f.vendorId)&&(expenseBalance(e,data.paymentsMade)>0||e.id===f.expenseId));
  const selectExpense=id=>{
    const e=data.expenses.find(x=>x.id===id);
    setF(s=>e?{...s,expenseId:id,projectId:e.projectId,vendorId:e.vendorId,amount:expenseBalance(e,data.paymentsMade)||s.amount}:{...s,expenseId:id});
  };
  return(<Modal title={(rec?'Edit ':'Record ')+(received?'receipt':'payment')} onClose={onClose}
    footer={<><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Save</button></>}>
    {inv&&<div style={{background:'var(--brass-soft)',borderRadius:8,padding:'10px 14px',marginBottom:14,fontSize:13}}>For invoice <b>{inv.number}</b></div>}
    {bill&&<div style={{background:'var(--brass-soft)',borderRadius:8,padding:'10px 14px',marginBottom:14,fontSize:13}}>For vendor bill <b>{bill.description||bill.category}</b></div>}
    <div className="grid2">
      <Field label="Amount"><input autoFocus type="number" value={f.amount} onChange={e=>set('amount',e.target.value)}/></Field>
      <Field label="Date"><input type="date" value={f.date} onChange={e=>set('date',e.target.value)}/></Field>
    </div>
    {error&&<div className="form-error">{error}</div>}
    <Field label="Project"><select value={f.projectId} onChange={e=>setF(s=>({...s,projectId:e.target.value,invoiceId:received?'':s.invoiceId,expenseId:received?s.expenseId:''}))} disabled={!!inv||!!bill}>
      <option value="">— None —</option>{data.projects.map(p=>(<option key={p.id} value={p.id}>{p.name}</option>))}</select></Field>
    {received?
      <Field label="Against invoice" hint="Optional — links receipt to an invoice"><select value={f.invoiceId} onChange={e=>set('invoiceId',e.target.value)} disabled={!!inv}>
        <option value="">— Unlinked —</option>{projInvoices.map(i=>(<option key={i.id} value={i.id}>{i.number}</option>))}</select></Field>
      :<>
        <Field label="Vendor"><select value={f.vendorId} onChange={e=>setF(s=>({...s,vendorId:e.target.value,expenseId:''}))} disabled={!!bill}>
          <option value="">— None —</option>{data.vendors.map(v=>(<option key={v.id} value={v.id}>{v.name}</option>))}</select></Field>
        <Field label="Against bill" hint="Optional — links this payment to a vendor bill"><select value={f.expenseId} onChange={e=>selectExpense(e.target.value)} disabled={!!bill}>
          <option value="">— Unlinked —</option>{billOptions.map(e=>(<option key={e.id} value={e.id}>{dstr(e.date)} · {e.description||e.category} · balance {M?M(expenseBalance(e,data.paymentsMade)):expenseBalance(e,data.paymentsMade)}</option>))}</select></Field>
      </>}
    <div className="grid2">
      <Field label="Method"><select value={f.method} onChange={e=>set('method',e.target.value)}>{METHODS.map(m=>(<option key={m}>{m}</option>))}</select></Field>
      <Field label="Reference" hint="Txn ID, cheque no."><input value={f.reference} onChange={e=>set('reference',e.target.value)}/></Field>
    </div>
    <Field label="Notes"><textarea value={f.notes} onChange={e=>set('notes',e.target.value)}/></Field>
  </Modal>);
}
