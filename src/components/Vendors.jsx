import React, { useState } from 'react';
import { sum, uid, today, expenseBalance, getPaymentsMade, getVendorCategories, normalizeCategories, vendorHasFinancialHistory } from '../shared';
import { Empty, Confirm, Modal, Field } from './ui';

export function Vendors({data,M,upsert,remove,flash}){
  const [edit,setEdit]=useState(null);const [del,setDel]=useState(null);const [q,setQ]=useState('');
  const paymentsMade=getPaymentsMade(data);
  const list=data.vendors.filter(v=>(v.name+v.category).toLowerCase().includes(q.toLowerCase()));
  const requestDelete=v=>{
    if(vendorHasFinancialHistory(data,v.id)){flash('Vendor has financial records and cannot be deleted');return;}
    setDel(v);
  };
  const vstats=v=>{const bills=data.expenses.filter(e=>e.vendorId===v.id);
    const billed=sum(bills,'amount');
    const paid=sum(paymentsMade.filter(p=>p.vendorId===v.id),'amount');
    const balance=sum(bills,e=>expenseBalance(e,paymentsMade));
    const due=sum(bills.filter(e=>e.dueDate&&e.dueDate<=today()),e=>expenseBalance(e,paymentsMade));
    return{billed,paid,balance,due};};
  return(<>
    <div className="topbar"><div><h1>Vendors</h1><div className="desc">Suppliers &amp; contractors — what you owe each.</div></div>
      <button className="btn primary" onClick={()=>setEdit({})}>+ New vendor</button></div>
    <div className="content">
      <div className="toolbar"><input className="ctl search" placeholder="Search vendors…" value={q} onChange={e=>setQ(e.target.value)}/></div>
      {list.length===0?<div className="card"><Empty icon="⬡" title="No vendors yet" text="Track carpenters, suppliers, electricians and other contractors."
        action={<button className="btn primary" onClick={()=>setEdit({})}>Add a vendor</button>}/></div>
      :<div className="card"><div className="card-b"><table>
        <thead><tr><th>Vendor</th><th>Category</th><th>Contact</th><th className="r">Billed</th><th className="r">Paid</th><th className="r">Balance</th><th className="r">Due now</th><th></th></tr></thead>
        <tbody>{list.map(v=>{const s=vstats(v);return(<tr key={v.id}>
          <td style={{fontWeight:600}}>{v.name}</td><td><span className="pill gray">{v.category}</span></td>
          <td style={{fontSize:12.5,color:'var(--ink-2)'}}>{v.phone||v.email||'—'}</td>
          <td className="r num">{M(s.billed)}</td><td className="r num" style={{color:'var(--green)'}}>{M(s.paid)}</td>
          <td className="r num" style={{color:s.balance>0?'var(--clay)':'var(--muted)'}}>{M(s.balance)}</td>
          <td className="r num" style={{color:s.due>0?'var(--clay)':'var(--muted)'}}>{M(s.due)}</td>
          <td className="r"><div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
            <button className="btn sm ghost" onClick={()=>setEdit(v)}>Edit</button><button className="btn sm ghost" onClick={()=>requestDelete(v)}>×</button></div></td>
        </tr>);})}</tbody></table></div></div>}
    </div>
    {edit&&<VendorForm rec={edit} categories={getVendorCategories(data)} onClose={()=>setEdit(null)} onSave={r=>{upsert('vendors',r);flash(r.id?'Vendor updated':'Vendor added');setEdit(null);}}/>}
    {del&&<Confirm text={`Delete vendor "${del.name}"?`} onClose={()=>setDel(null)} onYes={()=>{remove('vendors',del.id);flash('Vendor deleted');}}/>}
  </>);
}

export function VendorForm({rec,categories,onClose,onSave}){
  const opts=normalizeCategories([...(categories||[]),rec.category]);
  const [f,setF]=useState({id:rec.id,name:rec.name||'',category:rec.category||opts[0]||'Other',contact:rec.contact||'',email:rec.email||'',phone:rec.phone||'',notes:rec.notes||''});
  const set=(k,v)=>setF(s=>({...s,[k]:v}));
  const save=()=>{if(!f.name.trim())return;onSave({...f,id:f.id||uid('ven')});};
  return(<Modal title={rec.id?'Edit vendor':'New vendor'} onClose={onClose}
    footer={<><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>{rec.id?'Save':'Add vendor'}</button></>}>
    <Field label="Vendor name"><input autoFocus value={f.name} onChange={e=>set('name',e.target.value)}/></Field>
    <div className="grid2">
      <Field label="Category"><select value={f.category} onChange={e=>set('category',e.target.value)}>{opts.map(c=>(<option key={c}>{c}</option>))}</select></Field>
      <Field label="Contact person"><input value={f.contact} onChange={e=>set('contact',e.target.value)}/></Field>
    </div>
    <div className="grid2">
      <Field label="Phone"><input value={f.phone} onChange={e=>set('phone',e.target.value)}/></Field>
      <Field label="Email"><input value={f.email} onChange={e=>set('email',e.target.value)}/></Field>
    </div>
    <Field label="Notes"><textarea value={f.notes} onChange={e=>set('notes',e.target.value)}/></Field>
  </Modal>);
}
