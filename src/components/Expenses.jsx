import React, { useState } from 'react';
import { sum, dstr, today, uid, EXP_CATS, expensePaid, expenseBalance, expenseStatus, expenseHasPaymentHistory } from '../shared';
import { Empty, Confirm, Modal, Field } from './ui';
import { PaymentForm } from './Payments';

export function Expenses({data,setData,M,upsert,flash}){
  const [edit,setEdit]=useState(null);const [del,setDel]=useState(null);const [pay,setPay]=useState(null);const [fp,setFp]=useState('all');const [fs,setFs]=useState('all');
  let list=[...data.expenses].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  if(fp!=='all')list=list.filter(e=>e.projectId===fp);
  if(fs!=='all')list=list.filter(e=>{
    const st=expenseStatus(e,data.paymentsMade).key;
    if(fs==='open')return st!=='paid';
    if(fs==='due')return ['due','overdue'].includes(st);
    return st===fs;
  });
  const pname=id=>data.projects.find(p=>p.id===id)?.name||'—';
  const vname=id=>data.vendors.find(v=>v.id===id)?.name||'—';
  const billNumber=id=>data.vendorBills.find(b=>b.id===id)?.invoiceNumber||'—';
  const total=sum(list,'amount');
  const balance=sum(list,e=>expenseBalance(e,data.paymentsMade));
  const requestDelete=exp=>{
    if(exp.billId||data.vendorBills.some(b=>(b.lines||[]).some(line=>line.expenseId===exp.id))){
      flash('Combined vendor-bill lines must be managed in Procurement');
      return;
    }
    if(expenseHasPaymentHistory(data,exp.id)){
      flash('Bill has payment history and cannot be deleted');
      return;
    }
    setDel(exp);
  };
  const requestEdit=exp=>{
    if(exp.billId||data.vendorBills.some(b=>(b.lines||[]).some(line=>line.expenseId===exp.id))){
      flash('Combined vendor-bill lines must be edited in Procurement');
      return;
    }
    if(expenseHasPaymentHistory(data,exp.id)){
      flash('Paid expenses are locked; reverse the payment before correcting the bill');
      return;
    }
    setEdit(exp);
  };
  const deleteExpense=exp=>{
    setData(d=>({...d,expenses:d.expenses.filter(e=>e.id!==exp.id)}));
    flash('Expense deleted');
  };
  return(<>
    <div className="topbar"><div><h1>Expenses</h1><div className="desc">Vendor bills, due dates, and payments against them.</div></div>
      <button className="btn primary" onClick={()=>setEdit({})}>+ Add expense</button></div>
    <div className="content">
      <div className="toolbar">
        <select className="ctl" value={fp} onChange={e=>setFp(e.target.value)}><option value="all">All projects</option>{data.projects.map(p=>(<option key={p.id} value={p.id}>{p.name}</option>))}</select>
        <select className="ctl" value={fs} onChange={e=>setFs(e.target.value)}><option value="all">All bills</option><option value="open">Open balance</option><option value="due">Due now</option><option value="paid">Paid</option></select>
        <div className="spacer"></div>
        <div style={{fontSize:13,color:'var(--ink-2)'}}>Showing <b className="num">{M(total)}</b> billed · <b className="num">{M(balance)}</b> open</div>
      </div>
      {list.length===0?<div className="card"><Empty icon="▾" title="No vendor bills recorded" text="Log materials, labour, vendor bills and studio costs here."
        action={<button className="btn primary" onClick={()=>setEdit({})}>Add an expense</button>}/></div>
      :<div className="card"><div className="card-b"><table>
        <thead><tr><th>Date</th><th>Description</th><th>Project</th><th>Vendor bill</th><th>Vendor</th><th>Category</th><th>Due</th><th className="r">Billed</th><th className="r">Paid</th><th className="r">Balance</th><th>Status</th><th></th></tr></thead>
        <tbody>{list.map(e=>{const paid=expensePaid(e,data.paymentsMade);const bal=expenseBalance(e,data.paymentsMade);const st=expenseStatus(e,data.paymentsMade);return(<tr key={e.id}>
          <td>{dstr(e.date)}</td><td style={{fontWeight:500}}>{e.description}</td><td>{pname(e.projectId)}</td><td>{billNumber(e.billId)}</td><td>{vname(e.vendorId)}</td><td>{e.category}</td>
          <td>{dstr(e.dueDate)}</td>
          <td className="r num">{M(e.amount)}</td><td className="r num" style={{color:'var(--green)'}}>{M(paid)}</td>
          <td className="r num" style={{color:bal>0?'var(--clay)':'var(--muted)'}}>{M(bal)}</td><td><span className={"pill "+st.c}>{st.t}</span></td>
          <td className="r"><div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
            {bal>0&&<button className="btn sm ghost" onClick={()=>setPay(e)}>Pay</button>}<button className="btn sm ghost" onClick={()=>requestEdit(e)}>Edit</button><button className="btn sm ghost" onClick={()=>requestDelete(e)}>×</button></div></td>
        </tr>);})}</tbody></table></div></div>}
    </div>
    {edit&&<ExpenseForm rec={edit} data={data} onClose={()=>setEdit(null)} onSave={r=>{upsert('expenses',r);flash(r.id?'Expense updated':'Expense added');setEdit(null);}}/>}
    {pay&&<PaymentForm kind="made" data={data} M={M} fixedExpense={pay} onClose={()=>setPay(null)}
      onSave={r=>{upsert('paymentsMade',r);flash('Payment recorded');setPay(null);}}/>}
    {del&&<Confirm text="Delete this unpaid expense?" onClose={()=>setDel(null)} onYes={()=>deleteExpense(del)}/>}
  </>);
}

export function ExpenseForm({rec,data,onClose,onSave}){
  const [error,setError]=useState('');
  const [f,setF]=useState({id:rec.id,projectId:rec.projectId||data.projects[0]?.id||'',vendorId:rec.vendorId||'',
    category:rec.category||'Materials',description:rec.description||'',amount:rec.amount||'',date:rec.date||today(),dueDate:rec.dueDate||''});
  const set=(k,v)=>setF(s=>({...s,[k]:v}));
  const save=()=>{if(!f.description.trim()){setError('Description is required.');return;}if(Number(f.amount)<=0){setError('Amount must be greater than zero.');return;}onSave({...f,id:f.id||uid('exp'),description:f.description.trim(),amount:Number(f.amount)});};
  return(<Modal title={rec.id?'Edit expense':'Add expense'} onClose={onClose}
    footer={<><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>{rec.id?'Save':'Add expense'}</button></>}>
    <Field label="Description"><input autoFocus value={f.description} onChange={e=>set('description',e.target.value)} placeholder="e.g. Teak plywood — 12 sheets"/></Field>
    {error&&<div className="form-error">{error}</div>}
    <div className="grid2">
      <Field label="Amount"><input type="number" value={f.amount} onChange={e=>set('amount',e.target.value)}/></Field>
      <Field label="Date"><input type="date" value={f.date} onChange={e=>set('date',e.target.value)}/></Field>
    </div>
    <div className="grid2">
      <Field label="Project"><select value={f.projectId} onChange={e=>set('projectId',e.target.value)}><option value="">— None —</option>{data.projects.map(p=>(<option key={p.id} value={p.id}>{p.name}</option>))}</select></Field>
      <Field label="Vendor"><select value={f.vendorId} onChange={e=>set('vendorId',e.target.value)}><option value="">— None —</option>{data.vendors.map(v=>(<option key={v.id} value={v.id}>{v.name}</option>))}</select></Field>
    </div>
    <div className="grid2">
      <Field label="Category"><select value={f.category} onChange={e=>set('category',e.target.value)}>{EXP_CATS.map(c=>(<option key={c}>{c}</option>))}</select></Field>
      <Field label="Due date"><input type="date" value={f.dueDate} onChange={e=>set('dueDate',e.target.value)}/></Field>
    </div>
  </Modal>);
}
