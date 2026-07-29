import React, { useState } from 'react';
import {
  dstr, expenseBalance, expenseHasPaymentHistory, EXP_CATS, fmt, materialRequestEstimate,
  METHODS, sum, today, uid, UNITS, vendorBillTotal
} from '../shared';
import { Confirm, Empty, Field, Modal } from './ui';

const nextRequestStatus={
  submitted:'approved',
  approved:'ordered',
  ordered:'part-delivered',
  'part-delivered':'delivered'
};

export function Procurement({data,setData,M,flash,currentUser}){
  const [tab,setTab]=useState('requests');
  const [requestEdit,setRequestEdit]=useState(null);
  const [billEdit,setBillEdit]=useState(null);
  const [pettyEdit,setPettyEdit]=useState(null);
  const [supervisorEdit,setSupervisorEdit]=useState(false);
  const [paymentVendor,setPaymentVendor]=useState(null);
  const [deleteBill,setDeleteBill]=useState(null);

  const canDeleteRec = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  const projectName=id=>data.projects.find(p=>p.id===id)?.name||'Unassigned';
  const vendorName=id=>data.vendors.find(v=>v.id===id)?.name||'Unknown vendor';
  const supervisorName=id=>data.supervisors.find(s=>s.id===id)?.name||'Unassigned';
  const billPaid=bill=>{
    const ids=new Set((bill.lines||[]).map(line=>line.expenseId));
    return sum(data.paymentsMade.filter(p=>!p.reversedAt&&ids.has(p.expenseId)),'amount');
  };
  const billBalance=bill=>Math.max(0,vendorBillTotal(bill)-billPaid(bill));

  const advanceRequest=request=>{
    const status=nextRequestStatus[request.status];
    if(!status)return;
    setData(d=>({...d,materialRequests:d.materialRequests.map(r=>r.id===request.id?{...r,status}:r)}));
    flash('Request moved to '+status.replace('-', ' '));
  };
  const decideRequest=(request,status)=>{
    setData(d=>({...d,materialRequests:d.materialRequests.map(r=>r.id===request.id?{...r,status}:r)}));
    flash(status==='rejected'?'Request rejected':'Request updated');
  };
  const updatePetty=(expense,status)=>{
    setData(d=>({...d,pettyExpenses:d.pettyExpenses.map(x=>x.id===expense.id?{
      ...x,status,
      approvedAt:status==='approved'?new Date().toISOString():x.approvedAt,
      reimbursedAt:status==='reimbursed'?new Date().toISOString():x.reimbursedAt
    }:x)}));
    flash('Expense marked '+status);
  };
  const requestDeleteBill=bill=>{
    if((bill.lines||[]).some(line=>expenseHasPaymentHistory(data,line.expenseId)) && currentUser?.role !== 'super_admin'){
      flash('Paid vendor bills cannot be deleted by standard roles');
      return;
    }
    setDeleteBill(bill);
  };
  const removeBill=bill=>{
    const ids=new Set((bill.lines||[]).map(line=>line.expenseId));
    setData(d=>({
      ...d,
      vendorBills:d.vendorBills.filter(b=>b.id!==bill.id),
      expenses:d.expenses.filter(e=>!ids.has(e.id))
    }));
    flash('Vendor bill deleted');
    setDeleteBill(null);
  };

  const deleteRequestRecord = (request) => {
    if (!canDeleteRec) {
      flash('Permission denied: Standard users cannot delete material requests.');
      return;
    }
    if (confirm(`Delete material request ${request.number}?`)) {
      setData(d => ({
        ...d,
        materialRequests: d.materialRequests.filter(r => r.id !== request.id)
      }));
      flash(`Material request ${request.number} deleted`);
    }
  };

  const deletePettyRecord = (expense) => {
    if (!canDeleteRec) {
      flash('Permission denied: Standard users cannot delete petty cash expenses.');
      return;
    }
    if (confirm(`Delete petty expense "${expense.description}"?`)) {
      setData(d => ({
        ...d,
        pettyExpenses: d.pettyExpenses.filter(x => x.id !== expense.id)
      }));
      flash('Petty expense deleted');
    }
  };

  return(<>
    <div className="topbar"><div><h1>Procurement &amp; site requests</h1><div className="desc">Site material requests, vendor bills, small site expenses and supervisor tracking.</div></div>
      <div style={{display:'flex',gap:8}}>
        <button className="btn" onClick={()=>setSupervisorEdit(true)}>Manage site supervisors</button>
        <button className="btn" disabled={!data.projects.length} onClick={()=>setPettyEdit({})}>+ Small site expense</button>
        <button className="btn" disabled={!data.projects.length||!data.vendors.length} onClick={()=>setBillEdit({})}>+ Vendor bill</button>
        <button className="btn primary" disabled={!data.projects.length} onClick={()=>setRequestEdit({})}>+ Material request</button>
      </div></div>
    <div className="content">
      <div className="tabs">
        {[['requests','Material requests ('+data.materialRequests.length+')'],
          ['bills','Vendor bills ('+data.vendorBills.length+')'],
          ['petty','Petty cash & small expenses ('+data.pettyExpenses.length+')']].map(([key,label])=>
          <button key={key} className={tab===key?'active':''} onClick={()=>setTab(key)}>{label}</button>)}
      </div>

      {tab==='requests'&&<RequestsTable requests={data.materialRequests} M={M} projectName={projectName} supervisorName={supervisorName}
        onEdit={setRequestEdit} onAdvance={advanceRequest} onDecision={decideRequest}
        onBill={request=>setBillEdit({request})} onDelete={deleteRequestRecord} canDelete={canDeleteRec}/>}

      {tab==='bills'&&<BillsTable bills={data.vendorBills} M={M} vendorName={vendorName} projectName={projectName}
        paid={billPaid} balance={billBalance}
        onEdit={bill=>billPaid(bill)>0 && currentUser?.role !== 'super_admin' ? flash('Paid bills are locked from editing') : setBillEdit(bill)}
        onDelete={requestDeleteBill}
        onPay={bill=>setPaymentVendor({vendorId:bill.vendorId,billId:bill.id})}/>}

      {tab==='petty'&&<PettyTable expenses={data.pettyExpenses} M={M} projectName={projectName} supervisorName={supervisorName}
        onEdit={setPettyEdit} onStatus={updatePetty} onDelete={deletePettyRecord} canDelete={canDeleteRec}/>}
    </div>

    {requestEdit&&<MaterialRequestForm rec={requestEdit} data={data} onClose={()=>setRequestEdit(null)} onSave={record=>{
      setData(d=>({...d,materialRequests:d.materialRequests.some(x=>x.id===record.id)
        ?d.materialRequests.map(x=>x.id===record.id?record:x):[...d.materialRequests,record]}));
      flash(requestEdit.id?'Request updated':'Request submitted');setRequestEdit(null);
    }}/>}
    {billEdit&&<VendorBillForm rec={billEdit} data={data} onClose={()=>setBillEdit(null)} onSave={bill=>{
      setData(d=>saveVendorBill(d,bill));
      flash(billEdit.id?'Vendor bill updated':'Vendor bill recorded');setBillEdit(null);
    }}/>}
    {pettyEdit&&<PettyExpenseForm rec={pettyEdit} data={data} onClose={()=>setPettyEdit(null)} onSave={record=>{
      setData(d=>({...d,pettyExpenses:d.pettyExpenses.some(x=>x.id===record.id)
        ?d.pettyExpenses.map(x=>x.id===record.id?record:x):[...d.pettyExpenses,record]}));
      flash(pettyEdit.id?'Small expense updated':'Expense submitted for approval');setPettyEdit(null);
    }}/>}
    {supervisorEdit&&<SupervisorsModal data={data} setData={setData} onClose={()=>setSupervisorEdit(false)} flash={flash}/>}
    {paymentVendor&&<VendorPaymentAllocation data={data} M={M} fixed={paymentVendor} onClose={()=>setPaymentVendor(null)} onSave={records=>{
      setData(d=>({...d,paymentsMade:[...d.paymentsMade,...records]}));
      flash('Vendor payment allocated');setPaymentVendor(null);
    }}/>}
    {deleteBill&&<Confirm text={`Delete vendor bill "${deleteBill.invoiceNumber}" and its unpaid project cost lines?`}
      onClose={()=>setDeleteBill(null)} onYes={()=>removeBill(deleteBill)}/>}
  </>);
}

function RequestsTable({requests,M,projectName,supervisorName,onEdit,onAdvance,onDecision,onBill,onDelete,canDelete}){
  const list=[...requests].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  if(!list.length)return <div className="card"><Empty icon="▦" title="No material requests" text="Site supervisors can submit project-specific material requirements for approval and ordering."/></div>;
  return <div className="card"><div className="card-b"><table>
    <thead><tr><th>Request</th><th>Project</th><th>Supervisor</th><th>Required</th><th>Items</th><th className="r">Estimate</th><th>Status</th><th></th></tr></thead>
    <tbody>{list.map(r=><tr key={r.id}>
      <td style={{fontWeight:600}}>{r.number}<div className="subtle">{dstr(r.date)} · {r.priority||'normal'}</div></td>
      <td>{projectName(r.projectId)}</td><td>{supervisorName(r.supervisorId)}</td><td>{dstr(r.requiredBy)}</td>
      <td>{(r.items||[]).length}</td><td className="r num">{M(materialRequestEstimate(r))}</td>
      <td><span className={'pill '+(r.status==='delivered'?'green':r.status==='rejected'?'clay':r.status==='approved'?'brass':'gray')}>{(r.status||'submitted').replace('-',' ')}</span></td>
      <td className="r"><div className="row-actions">
        {['submitted','rejected'].includes(r.status)&&<button className="btn sm ghost" onClick={()=>onEdit(r)}>Edit</button>}
        {r.status==='submitted'&&<><button className="btn sm" onClick={()=>onDecision(r,'approved')}>Approve</button><button className="btn sm ghost danger" onClick={()=>onDecision(r,'rejected')}>Reject</button></>}
        {nextRequestStatus[r.status]&&r.status!=='submitted'&&<button className="btn sm" onClick={()=>onAdvance(r)}>Mark {nextRequestStatus[r.status].replace('-',' ')}</button>}
        {['approved','ordered','part-delivered'].includes(r.status)&&<button className="btn sm primary" onClick={()=>onBill(r)}>Create bill</button>}
        {canDelete && <button className="btn sm ghost danger" title="Delete Request" onClick={()=>onDelete(r)}>Delete</button>}
      </div></td>
    </tr>)}</tbody>
  </table></div></div>;
}

function BillsTable({bills,M,vendorName,projectName,paid,balance,onEdit,onDelete,onPay}){
  const list=[...bills].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  if(!list.length)return <div className="card"><Empty icon="▦" title="No vendor bills recorded" text="Record bills against approved material requests to track accounts payable."/></div>;
  return <div className="card"><div className="card-b"><table>
    <thead><tr><th>Bill / invoice</th><th>Vendor</th><th>Projects</th><th className="r">Amount</th><th className="r">Paid</th><th className="r">Balance</th><th></th></tr></thead>
    <tbody>{list.map(b=>{const p=paid(b);const bal=balance(b);const projects=Array.from(new Set((b.lines||[]).map(l=>projectName(l.projectId)))).join(', ');
      return <tr key={b.id}>
        <td style={{fontWeight:600}}>{b.invoiceNumber}<div className="subtle">{dstr(b.date)}</div></td>
        <td>{vendorName(b.vendorId)}</td><td>{projects||'General'}</td><td className="r num">{M(vendorBillTotal(b))}</td>
        <td className="r num" style={{color:'var(--green)'}}>{M(p)}</td>
        <td className="r num" style={{color:bal>0?'var(--clay)':'var(--muted)'}}>{M(bal)}</td>
        <td className="r"><div className="row-actions">
          <button className="btn sm ghost" onClick={()=>onEdit(b)}>Edit</button>
          {bal>0&&<button className="btn sm primary" onClick={()=>onPay(b)}>Pay vendor</button>}
          <button className="btn sm ghost danger" onClick={()=>onDelete(b)}>Delete</button>
        </div></td>
      </tr>;})}</tbody>
  </table></div></div>;
}

function PettyTable({expenses,M,projectName,supervisorName,onEdit,onStatus,onDelete,canDelete}){
  const list=[...expenses].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  if(!list.length)return <div className="card"><Empty icon="▦" title="No petty cash expenses" text="Record small site purchases made by supervisors."/></div>;
  return <div className="card"><div className="card-b"><table>
    <thead><tr><th>Expense</th><th>Project</th><th>Supervisor</th><th>Payment</th><th className="r">Amount</th><th>Status</th><th></th></tr></thead>
    <tbody>{list.map(e=><tr key={e.id}>
      <td style={{fontWeight:600}}>{e.description}<div className="subtle">{dstr(e.date)} · {e.category}</div></td>
      <td>{projectName(e.projectId)}</td><td>{supervisorName(e.supervisorId)}</td><td>{e.paymentMethod||'Cash'}{e.receiptRef?` (${e.receiptRef})`:''}</td>
      <td className="r num">{M(e.amount)}</td><td><span className={'pill '+(e.status==='reimbursed'?'green':e.status==='approved'?'brass':e.status==='rejected'?'clay':'gray')}>{e.status}</span></td>
      <td className="r"><div className="row-actions">
        {e.status==='submitted'&&<><button className="btn sm" onClick={()=>onStatus(e,'approved')}>Approve</button><button className="btn sm ghost danger" onClick={()=>onStatus(e,'rejected')}>Reject</button></>}
        {e.status==='approved'&&<button className="btn sm primary" onClick={()=>onStatus(e,'reimbursed')}>Mark reimbursed</button>}
        {e.status==='submitted'&&<button className="btn sm ghost" onClick={()=>onEdit(e)}>Edit</button>}
        {canDelete && <button className="btn sm ghost danger" title="Delete Expense" onClick={()=>onDelete(e)}>Delete</button>}
      </div></td>
    </tr>)}</tbody>
  </table></div></div>;
}

function MaterialRequestForm({rec,data,onClose,onSave}){
  const isNew=!rec.id;
  const [f,setF]=useState({
    id:rec.id,number:rec.number||'MR-'+String(data.materialRequests.length+1).padStart(4,'0'),
    projectId:rec.projectId||data.projects[0]?.id||'',supervisorId:rec.supervisorId||data.supervisors[0]?.id||'',
    date:rec.date||today(),requiredBy:rec.requiredBy||'',priority:rec.priority||'normal',status:rec.status||'submitted',notes:rec.notes||'',
    items:rec.items?.length?rec.items.map(x=>({...x})):[{id:uid('mri'),description:'',category:'Materials',qty:1,unit:'nos',estimatedRate:''}]
  });
  const set=(k,v)=>setF(s=>({...s,[k]:v}));
  const setItem=(i,k,v)=>setF(s=>({...s,items:s.items.map((x,j)=>j===i?{...x,[k]:v}:x)}));
  const save=()=>{
    const items=f.items.filter(x=>x.description.trim()).map(x=>({...x,qty:Number(x.qty)||0,estimatedRate:Number(x.estimatedRate)||0}));
    if(!f.projectId||!f.supervisorId||!items.length)return;
    onSave({...f,id:f.id||uid('req'),items});
  };
  return <Modal wide title={isNew?'New material request':'Material request '+f.number} onClose={onClose}
    footer={<><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>{isNew?'Submit request':'Save changes'}</button></>}>
    <div className="grid3"><Field label="Project / site"><select value={f.projectId} onChange={e=>set('projectId',e.target.value)}>{data.projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      <Field label="Supervisor"><select value={f.supervisorId} onChange={e=>set('supervisorId',e.target.value)}><option value="">Select…</option>{data.supervisors.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
      <Field label="Priority"><select value={f.priority} onChange={e=>set('priority',e.target.value)}><option>normal</option><option>urgent</option><option>critical</option></select></Field></div>
    <div className="grid2"><Field label="Request date"><input type="date" value={f.date} onChange={e=>set('date',e.target.value)}/></Field>
      <Field label="Required by date"><input type="date" value={f.requiredBy} onChange={e=>set('requiredBy',e.target.value)}/></Field></div>
    <div className="boq-lines">{f.items.map((item,i)=><div className="boq-line" key={item.id}>
      <div className="grid3"><Field label="Material description"><input value={item.description} onChange={e=>setItem(i,'description',e.target.value)}/></Field>
        <Field label="Category"><select value={item.category} onChange={e=>setItem(i,'category',e.target.value)}>{EXP_CATS.map(c=><option key={c}>{c}</option>)}</select></Field>
        <Field label="Unit"><select value={item.unit} onChange={e=>setItem(i,'unit',e.target.value)}>{UNITS.map(u=><option key={u}>{u}</option>)}</select></Field></div>
      <div className="grid2"><Field label="Required quantity"><input type="number" value={item.qty} onChange={e=>setItem(i,'qty',e.target.value)}/></Field>
        <Field label="Estimated rate"><input type="number" value={item.estimatedRate} onChange={e=>setItem(i,'estimatedRate',e.target.value)}/></Field></div>
      <button className="btn sm ghost danger" disabled={f.items.length===1} onClick={()=>setF(s=>({...s,items:s.items.filter((_,j)=>j!==i)}))}>Remove item</button>
    </div>)}</div>
    <button className="btn sm" onClick={()=>setF(s=>({...s,items:[...s.items,{id:uid('mri'),description:'',category:'Materials',qty:1,unit:'nos',estimatedRate:''}]}))}>+ Add item</button>
    <Field label="Notes"><textarea value={f.notes} onChange={e=>set('notes',e.target.value)} placeholder="Delivery location, brand preference, urgency reasons…"/></Field>
  </Modal>;
}

function VendorBillForm({rec,data,onClose,onSave}){
  const isNew=!rec.id;
  const request=rec.request;
  const vendorId=rec.vendorId||data.vendors[0]?.id||'';
  const initialLines=rec.lines?.length?rec.lines.map(x=>({...x})):request?.items?.map(item=>({
    id:uid('line'),projectId:request.projectId,category:item.category,description:item.description,qty:item.qty,unit:item.unit,rate:item.estimatedRate||'',taxPct:data.settings.taxRate||0
  }))||[{id:uid('line'),projectId:data.projects[0]?.id||'',category:'Materials',description:'',qty:1,unit:'nos',rate:'',taxPct:data.settings.taxRate||0}];

  const [f,setF]=useState({
    id:rec.id,vendorId,invoiceNumber:rec.invoiceNumber||'',date:rec.date||today(),notes:rec.notes||'',
    lines:initialLines
  });
  const set=(k,v)=>setF(s=>({...s,[k]:v}));
  const setLine=(i,k,v)=>setF(s=>({...s,lines:s.lines.map((x,j)=>j===i?{...x,[k]:v}:x)}));
  const save=()=>{
    if(!f.vendorId||!f.invoiceNumber.trim())return;
    const lines=f.lines.filter(x=>x.description.trim()&&x.projectId).map(x=>({
      ...x,qty:Number(x.qty)||0,rate:Number(x.rate)||0,taxPct:Number(x.taxPct)||0
    }));
    if(!lines.length)return;
    onSave({...f,id:f.id||uid('vbill'),lines});
  };
  const total=vendorBillTotal(f);
  return <Modal wide title={isNew?(request?`Create bill from ${request.number}`:'New vendor bill'):`Edit bill ${f.invoiceNumber}`} onClose={onClose}
    footer={<><div style={{marginRight:'auto'}}>Bill total: <b className="num">{fmt(total,data.settings.currency)}</b></div><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>{isNew?'Save vendor bill':'Save changes'}</button></>}>
    <div className="grid3"><Field label="Vendor"><select value={f.vendorId} onChange={e=>set('vendorId',e.target.value)}>{data.vendors.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></Field>
      <Field label="Vendor invoice #"><input value={f.invoiceNumber} onChange={e=>set('invoiceNumber',e.target.value)} placeholder="e.g. INV-8821"/></Field>
      <Field label="Bill date"><input type="date" value={f.date} onChange={e=>set('date',e.target.value)}/></Field></div>
    <div className="boq-lines">{f.lines.map((line,i)=><div className="boq-line" key={line.id}>
      <div className="grid3"><Field label="Project"><select value={line.projectId} onChange={e=>setLine(i,'projectId',e.target.value)}>{data.projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label="Description"><input value={line.description} onChange={e=>setLine(i,'description',e.target.value)}/></Field>
        <Field label="Category"><select value={line.category} onChange={e=>setLine(i,'category',e.target.value)}>{EXP_CATS.map(c=><option key={c}>{c}</option>)}</select></Field></div>
      <div className="grid4"><Field label="Qty"><input type="number" value={line.qty} onChange={e=>setLine(i,'qty',e.target.value)}/></Field>
        <Field label="Unit"><select value={line.unit} onChange={e=>setLine(i,'unit',e.target.value)}>{UNITS.map(u=><option key={u}>{u}</option>)}</select></Field>
        <Field label="Unit rate"><input type="number" value={line.rate} onChange={e=>setLine(i,'rate',e.target.value)}/></Field>
        <Field label="Tax %"><input type="number" value={line.taxPct} onChange={e=>setLine(i,'taxPct',e.target.value)}/></Field></div>
      <button className="btn sm ghost danger" disabled={f.lines.length===1} onClick={()=>setF(s=>({...s,lines:s.lines.filter((_,j)=>j!==i)}))}>Remove line</button>
    </div>)}</div>
    <button className="btn sm" onClick={()=>setF(s=>({...s,lines:[...s.lines,{id:uid('line'),projectId:data.projects[0]?.id||'',category:'Materials',description:'',qty:1,unit:'nos',rate:'',taxPct:data.settings.taxRate||0}]}))}>+ Add bill line</button>
    <Field label="Notes"><textarea value={f.notes} onChange={e=>set('notes',e.target.value)} placeholder="Delivery note numbers, warranty, payment terms…"/></Field>
  </Modal>;
}

function PettyExpenseForm({rec,data,onClose,onSave}){
  const isNew=!rec.id;
  const [f,setF]=useState({
    id:rec.id,projectId:rec.projectId||data.projects[0]?.id||'',supervisorId:rec.supervisorId||data.supervisors[0]?.id||'',
    date:rec.date||today(),description:rec.description||'',category:rec.category||'Site expenses',amount:rec.amount||'',
    paymentMethod:rec.paymentMethod||'Cash',receiptRef:rec.receiptRef||'',notes:rec.notes||'',status:rec.status||'submitted'
  });
  const set=(k,v)=>setF(s=>({...s,[k]:v}));
  const save=()=>{
    if(!f.projectId||!f.description.trim()||Number(f.amount)<=0)return;
    onSave({...f,id:f.id||uid('petty'),amount:Number(f.amount)||0});
  };
  return <Modal title={isNew?'New small site expense':'Edit small site expense'} onClose={onClose}
    footer={<><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>{isNew?'Submit expense':'Save changes'}</button></>}>
    <Field label="Project / site"><select value={f.projectId} onChange={e=>set('projectId',e.target.value)}>{data.projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
    <Field label="Supervisor"><select value={f.supervisorId} onChange={e=>set('supervisorId',e.target.value)}><option value="">Select…</option>{data.supervisors.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
    <Field label="Description"><input value={f.description} onChange={e=>set('description',e.target.value)} placeholder="e.g. Masking tape and site fasteners"/></Field>
    <div className="grid2"><Field label="Category"><select value={f.category} onChange={e=>set('category',e.target.value)}>{EXP_CATS.map(c=><option key={c}>{c}</option>)}</select></Field>
      <Field label="Amount"><input type="number" value={f.amount} onChange={e=>set('amount',e.target.value)}/></Field></div>
    <div className="grid2"><Field label="Payment method"><select value={f.paymentMethod} onChange={e=>set('paymentMethod',e.target.value)}>{METHODS.map(m=><option key={m}>{m}</option>)}</select></Field>
      <Field label="Receipt / Voucher #"><input value={f.receiptRef} onChange={e=>set('receiptRef',e.target.value)} placeholder="e.g. PETTY-104"/></Field></div>
    <Field label="Notes"><textarea value={f.notes} onChange={e=>set('notes',e.target.value)}/></Field>
  </Modal>;
}

function SupervisorsModal({data,setData,onClose,flash}){
  const [name,setName]=useState('');
  const [phone,setPhone]=useState('');
  const list=data.supervisors||[];
  const add=e=>{
    e.preventDefault();
    if(!name.trim())return;
    const rec={id:uid('sup'),name:name.trim(),phone:phone.trim()};
    setData(d=>({...d,supervisors:[...(d.supervisors||[]),rec]}));
    setName('');setPhone('');flash('Site supervisor added');
  };
  const removeSup=sup=>{
    const used=data.materialRequests.some(r=>r.supervisorId===sup.id)||data.pettyExpenses.some(p=>p.supervisorId===sup.id);
    if(used){flash('Supervisor has site logs and cannot be removed');return;}
    setData(d=>({...d,supervisors:d.supervisors.filter(s=>s.id!==sup.id)}));
    flash('Supervisor removed');
  };
  return <Modal title="Site supervisors" onClose={onClose} footer={<button className="btn primary" onClick={onClose}>Done</button>}>
    <form className="grid2" onSubmit={add} style={{alignItems:'flex-end'}}>
      <Field label="Supervisor name"><input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Rajesh Kumar"/></Field>
      <div style={{display:'flex',gap:8,alignItems:'flex-end'}}><div style={{flex:1}}><Field label="Phone"><input value={phone} onChange={e=>setPhone(e.target.value)}/></Field></div><button className="btn primary" style={{marginBottom:12}}>Add</button></div>
    </form>
    <div className="category-list" style={{marginTop:16}}>{list.map(sup=><div className="category-item" key={sup.id}>
      <div><div style={{fontWeight:600}}>{sup.name}</div><div className="subtle">{sup.phone||'No phone'}</div></div>
      <button className="btn sm ghost danger" onClick={()=>removeSup(sup)}>Remove</button>
    </div>)}</div>
  </Modal>;
}

function saveVendorBill(data,bill){
  const currentBill=data.vendorBills.find(b=>b.id===bill.id);
  const oldExpenseIds=new Set((currentBill?.lines||[]).map(l=>l.expenseId));
  const newExpenses=[];
  const updatedLines=bill.lines.map(line=>{
    const expId=line.expenseId||uid('exp');
    oldExpenseIds.delete(expId);
    newExpenses.push({
      id:expId,projectId:line.projectId,vendorId:bill.vendorId,date:bill.date,category:line.category,
      amount:roundMoney((line.qty*line.rate)*(1+(line.taxPct/100))),invoiceNumber:bill.invoiceNumber,
      notes:line.description,dueDate:''
    });
    return {...line,expenseId:expId};
  });
  const keptExpenses=data.expenses.filter(e=>!oldExpenseIds.has(e.id));
  const expenseMap=new Map(newExpenses.map(e=>[e.id,e]));
  const finalExpenses=keptExpenses.map(e=>expenseMap.get(e.id)||e);
  newExpenses.forEach(e=>{if(!keptExpenses.some(x=>x.id===e.id))finalExpenses.push(e);});
  const updatedBill={...bill,lines:updatedLines};
  const vendorBills=data.vendorBills.some(b=>b.id===bill.id)
    ?data.vendorBills.map(b=>b.id===bill.id?updatedBill:b)
    :[...data.vendorBills,updatedBill];
  return {...data,vendorBills,expenses:finalExpenses};
}

function roundMoney(n){return Math.round((n+Number.EPSILON)*100)/100;}
