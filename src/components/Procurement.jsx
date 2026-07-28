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

export function Procurement({data,setData,M,flash}){
  const [tab,setTab]=useState('requests');
  const [requestEdit,setRequestEdit]=useState(null);
  const [billEdit,setBillEdit]=useState(null);
  const [pettyEdit,setPettyEdit]=useState(null);
  const [supervisorEdit,setSupervisorEdit]=useState(false);
  const [paymentVendor,setPaymentVendor]=useState(null);
  const [deleteBill,setDeleteBill]=useState(null);

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
    if((bill.lines||[]).some(line=>expenseHasPaymentHistory(data,line.expenseId))){
      flash('Paid vendor bills cannot be deleted');
      return;
    }
    setDeleteBill(bill);
  };
  const removeBill=bill=>{
    const ids=new Set((bill.lines||[]).map(line=>line.expenseId));
    setData(d=>({
      ...d,
      vendorBills:d.vendorBills.filter(x=>x.id!==bill.id),
      expenses:d.expenses.filter(x=>!ids.has(x.id))
    }));
    flash('Vendor bill deleted');
  };

  return(<>
    <div className="topbar">
      <div><h1>Procurement</h1><div className="desc">Site requests, multi-project vendor bills, petty cash and payment allocation.</div></div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        {tab==='requests'&&<><button className="btn" onClick={()=>setSupervisorEdit(true)}>Supervisors</button><button className="btn primary" onClick={()=>setRequestEdit({})}>+ Material request</button></>}
        {tab==='bills'&&<button className="btn primary" disabled={!data.vendors.length} onClick={()=>setBillEdit({})}>+ Vendor bill</button>}
        {tab==='petty'&&<button className="btn primary" onClick={()=>setPettyEdit({})}>+ Small expense</button>}
      </div>
    </div>
    <div className="content">
      <div className="tabs">
        {[['requests','Material requests'],['bills','Vendor bills'],['petty','Petty cash']].map(([key,label])=>
          <button key={key} className={tab===key?'active':''} onClick={()=>setTab(key)}>{label}</button>)}
      </div>

      {tab==='requests'&&<RequestsTable requests={data.materialRequests} M={M} projectName={projectName} supervisorName={supervisorName}
        onEdit={setRequestEdit} onAdvance={advanceRequest} onDecision={decideRequest}
        onBill={request=>setBillEdit({request})}/>}

      {tab==='bills'&&<BillsTable bills={data.vendorBills} M={M} vendorName={vendorName} projectName={projectName}
        paid={billPaid} balance={billBalance}
        onEdit={bill=>billPaid(bill)>0?flash('Paid bills are locked from editing'):setBillEdit(bill)}
        onDelete={requestDeleteBill}
        onPay={bill=>setPaymentVendor({vendorId:bill.vendorId,billId:bill.id})}/>}

      {tab==='petty'&&<PettyTable expenses={data.pettyExpenses} M={M} projectName={projectName} supervisorName={supervisorName}
        onEdit={setPettyEdit} onStatus={updatePetty}/>}
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

function RequestsTable({requests,M,projectName,supervisorName,onEdit,onAdvance,onDecision,onBill}){
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
      </div></td>
    </tr>)}</tbody>
  </table></div></div>;
}

function BillsTable({bills,M,vendorName,projectName,paid,balance,onEdit,onDelete,onPay}){
  const list=[...bills].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  if(!list.length)return <div className="card"><Empty icon="▥" title="No vendor bills" text="Record one vendor invoice with separate line allocations for every project."/></div>;
  return <div className="card"><div className="card-b"><table>
    <thead><tr><th>Invoice</th><th>Vendor</th><th>Projects</th><th>Due</th><th className="r">Billed</th><th className="r">Paid</th><th className="r">Balance</th><th></th></tr></thead>
    <tbody>{list.map(b=>{
      const projectIds=Array.from(new Set((b.lines||[]).map(x=>x.projectId).filter(Boolean)));
      const bal=balance(b);
      return <tr key={b.id}>
        <td style={{fontWeight:600}}>{b.invoiceNumber}<div className="subtle">{dstr(b.date)} · {(b.lines||[]).length} lines</div></td>
        <td>{vendorName(b.vendorId)}</td><td>{projectIds.map(projectName).join(', ')||'Unassigned'}</td><td>{dstr(b.dueDate)}</td>
        <td className="r num">{M(vendorBillTotal(b))}</td><td className="r num" style={{color:'var(--green)'}}>{M(paid(b))}</td>
        <td className="r num" style={{color:bal?'var(--clay)':'var(--muted)'}}>{M(bal)}</td>
        <td className="r"><div className="row-actions"><button className="btn sm ghost" onClick={()=>onEdit(b)}>Edit</button>
          {bal>0&&<button className="btn sm primary" onClick={()=>onPay(b)}>Pay</button>}
          <button className="btn sm ghost" onClick={()=>onDelete(b)}>×</button></div></td>
      </tr>;
    })}</tbody>
  </table></div></div>;
}

function PettyTable({expenses,M,projectName,supervisorName,onEdit,onStatus}){
  const list=[...expenses].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  if(!list.length)return <div className="card"><Empty icon="◌" title="No small expenses" text="Capture site purchases, cash slips and employee reimbursements before they disappear."/></div>;
  return <div className="card"><div className="card-b"><table>
    <thead><tr><th>Date</th><th>Description</th><th>Project</th><th>Submitted by</th><th>Receipt</th><th className="r">Amount</th><th>Status</th><th></th></tr></thead>
    <tbody>{list.map(e=><tr key={e.id}>
      <td>{dstr(e.date)}</td><td style={{fontWeight:500}}>{e.description}<div className="subtle">{e.category}</div></td>
      <td>{projectName(e.projectId)}</td><td>{supervisorName(e.supervisorId)}</td><td>{e.receiptRef||'—'}</td>
      <td className="r num">{M(e.amount)}</td><td><span className={'pill '+(e.status==='reimbursed'?'green':e.status==='approved'?'brass':e.status==='rejected'?'clay':'gray')}>{e.status}</span></td>
      <td className="r"><div className="row-actions">
        {e.status==='submitted'&&<><button className="btn sm" onClick={()=>onStatus(e,'approved')}>Approve</button><button className="btn sm ghost danger" onClick={()=>onStatus(e,'rejected')}>Reject</button></>}
        {e.status==='approved'&&<button className="btn sm primary" onClick={()=>onStatus(e,'reimbursed')}>Mark reimbursed</button>}
        {e.status==='submitted'&&<button className="btn sm ghost" onClick={()=>onEdit(e)}>Edit</button>}
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
      <Field label="Required by"><input type="date" value={f.requiredBy} onChange={e=>set('requiredBy',e.target.value)}/></Field></div>
    <label className="form-section-label">Requested items</label>
    <div className="lineitems">
      <div className="li-head request-lines"><span>Description</span><span>Category</span><span>Qty</span><span>Unit</span><span>Est. rate</span><span></span></div>
      {f.items.map((item,i)=><div className="li-row request-lines" key={item.id}>
        <input value={item.description} onChange={e=>setItem(i,'description',e.target.value)} placeholder="Material / specification"/>
        <select value={item.category} onChange={e=>setItem(i,'category',e.target.value)}>{EXP_CATS.map(c=><option key={c}>{c}</option>)}</select>
        <input type="number" value={item.qty} onChange={e=>setItem(i,'qty',e.target.value)}/>
        <select value={item.unit} onChange={e=>setItem(i,'unit',e.target.value)}>{UNITS.map(u=><option key={u}>{u}</option>)}</select>
        <input type="number" value={item.estimatedRate} onChange={e=>setItem(i,'estimatedRate',e.target.value)}/>
        <button className="li-del" disabled={f.items.length===1} onClick={()=>setF(s=>({...s,items:s.items.filter((_,j)=>j!==i)}))}>×</button>
      </div>)}
    </div>
    <button className="btn sm" onClick={()=>setF(s=>({...s,items:[...s.items,{id:uid('mri'),description:'',category:'Materials',qty:1,unit:'nos',estimatedRate:''}]}))}>+ Add item</button>
    <Field label="Site notes"><textarea value={f.notes} onChange={e=>set('notes',e.target.value)}/></Field>
  </Modal>;
}

function VendorBillForm({rec,data,onClose,onSave}){
  const request=rec.request;
  const requestItems=request?.items||[];
  const [error,setError]=useState('');
  const [f,setF]=useState({
    id:rec.id,vendorId:rec.vendorId||data.vendors[0]?.id||'',invoiceNumber:rec.invoiceNumber||'',
    date:rec.date||today(),dueDate:rec.dueDate||'',notes:rec.notes||'',
    lines:rec.lines?.length?rec.lines.map(x=>({...x})):requestItems.length?requestItems.map(item=>({
      id:uid('vbl'),expenseId:uid('exp'),projectId:request.projectId,materialRequestId:request.id,
      description:item.description,category:item.category,qty:item.qty,unit:item.unit,rate:item.estimatedRate||'',taxRate:0
    })):[{id:uid('vbl'),expenseId:uid('exp'),projectId:data.projects[0]?.id||'',materialRequestId:'',description:'',category:'Materials',qty:1,unit:'nos',rate:'',taxRate:0}]
  });
  const set=(k,v)=>setF(s=>({...s,[k]:v}));
  const setLine=(i,k,v)=>setF(s=>({...s,lines:s.lines.map((x,j)=>j===i?{...x,[k]:v}:x)}));
  const save=()=>{
    const lines=f.lines.filter(x=>x.description.trim()).map(x=>({...x,qty:Number(x.qty)||0,rate:Number(x.rate)||0,taxRate:Number(x.taxRate)||0}));
    if(!f.vendorId){setError('Select a vendor.');return;}
    if(!f.invoiceNumber.trim()){setError('Vendor invoice number is required.');return;}
    if(data.vendorBills.some(b=>b.id!==f.id&&b.vendorId===f.vendorId&&b.invoiceNumber.trim().toLowerCase()===f.invoiceNumber.trim().toLowerCase())){setError('This vendor invoice number already exists.');return;}
    if(!lines.length||lines.some(x=>!x.projectId||x.qty<=0||x.rate<0)){setError('Every bill line needs a project, positive quantity and valid rate.');return;}
    onSave({...f,invoiceNumber:f.invoiceNumber.trim(),id:f.id||uid('bill'),lines});
  };
  const total=vendorBillTotal(f);
  return <Modal wide title={rec.id?'Edit vendor bill':'Record vendor bill'} onClose={onClose}
    footer={<><div style={{marginRight:'auto'}}>Bill total: <b className="num">{fmt(total,data.settings.currency)}</b></div><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Save vendor bill</button></>}>
    <div className="grid2"><Field label="Vendor"><select value={f.vendorId} onChange={e=>set('vendorId',e.target.value)}>{data.vendors.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></Field>
      <Field label="Vendor invoice number"><input value={f.invoiceNumber} onChange={e=>set('invoiceNumber',e.target.value)}/></Field></div>
    {error&&<div className="form-error">{error}</div>}
    <div className="grid2"><Field label="Invoice date"><input type="date" value={f.date} onChange={e=>set('date',e.target.value)}/></Field>
      <Field label="Due date"><input type="date" value={f.dueDate} onChange={e=>set('dueDate',e.target.value)}/></Field></div>
    <label className="form-section-label">Project allocations</label>
    <div className="bill-lines">
      {f.lines.map((line,i)=><div className="bill-line" key={line.id}>
        <div className="grid3"><Field label="Project"><select value={line.projectId} onChange={e=>setLine(i,'projectId',e.target.value)}>{data.projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label="Description"><input value={line.description} onChange={e=>setLine(i,'description',e.target.value)}/></Field>
          <Field label="Category"><select value={line.category} onChange={e=>setLine(i,'category',e.target.value)}>{EXP_CATS.map(c=><option key={c}>{c}</option>)}</select></Field></div>
        <div className="grid5"><Field label="Qty"><input type="number" value={line.qty} onChange={e=>setLine(i,'qty',e.target.value)}/></Field>
          <Field label="Unit"><select value={line.unit} onChange={e=>setLine(i,'unit',e.target.value)}>{UNITS.map(u=><option key={u}>{u}</option>)}</select></Field>
          <Field label="Rate"><input type="number" value={line.rate} onChange={e=>setLine(i,'rate',e.target.value)}/></Field>
          <Field label="Tax %"><input type="number" value={line.taxRate} onChange={e=>setLine(i,'taxRate',e.target.value)}/></Field>
          <div className="bill-line-total"><span>Amount</span><b className="num">{fmt((Number(line.qty)||0)*(Number(line.rate)||0)*(1+(Number(line.taxRate)||0)/100),data.settings.currency)}</b></div></div>
        <button className="btn sm ghost danger" disabled={f.lines.length===1} onClick={()=>setF(s=>({...s,lines:s.lines.filter((_,j)=>j!==i)}))}>Remove line</button>
      </div>)}
    </div>
    <button className="btn sm" onClick={()=>setF(s=>({...s,lines:[...s.lines,{id:uid('vbl'),expenseId:uid('exp'),projectId:data.projects[0]?.id||'',materialRequestId:'',description:'',category:'Materials',qty:1,unit:'nos',rate:'',taxRate:0}]}))}>+ Add project line</button>
    <Field label="Notes"><textarea value={f.notes} onChange={e=>set('notes',e.target.value)}/></Field>
  </Modal>;
}

function saveVendorBill(data,bill){
  const old=data.vendorBills.find(x=>x.id===bill.id);
  const oldIds=new Set((old?.lines||[]).map(x=>x.expenseId));
  const lineExpenses=bill.lines.map(line=>{
    const base=(Number(line.qty)||0)*(Number(line.rate)||0);
    return{
      id:line.expenseId,projectId:line.projectId,vendorId:bill.vendorId,billId:bill.id,
      category:line.category,description:line.description,amount:base+(base*((Number(line.taxRate)||0)/100)),
      date:bill.date,dueDate:bill.dueDate
    };
  });
  const requests=new Set(bill.lines.map(x=>x.materialRequestId).filter(Boolean));
  return{
    ...data,
    vendorBills:data.vendorBills.some(x=>x.id===bill.id)?data.vendorBills.map(x=>x.id===bill.id?bill:x):[...data.vendorBills,bill],
    expenses:[...data.expenses.filter(x=>!oldIds.has(x.id)),...lineExpenses],
    materialRequests:data.materialRequests.map(r=>requests.has(r.id)&&r.status==='approved'?{...r,status:'ordered'}:r)
  };
}

function PettyExpenseForm({rec,data,onClose,onSave}){
  const [f,setF]=useState({
    id:rec.id,projectId:rec.projectId||data.projects[0]?.id||'',supervisorId:rec.supervisorId||data.supervisors[0]?.id||'',
    date:rec.date||today(),description:rec.description||'',category:rec.category||'Site expenses',amount:rec.amount||'',
    paymentMethod:rec.paymentMethod||'Cash',receiptRef:rec.receiptRef||'',notes:rec.notes||'',status:rec.status||'submitted'
  });
  const set=(k,v)=>setF(s=>({...s,[k]:v}));
  const save=()=>{if(!f.projectId||!f.supervisorId||!f.description.trim()||Number(f.amount)<=0)return;onSave({...f,id:f.id||uid('petty'),amount:Number(f.amount)});};
  return <Modal title={rec.id?'Edit small expense':'Submit small expense'} onClose={onClose}
    footer={<><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Submit for approval</button></>}>
    <div className="grid2"><Field label="Project / site"><select value={f.projectId} onChange={e=>set('projectId',e.target.value)}>{data.projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      <Field label="Paid / submitted by"><select value={f.supervisorId} onChange={e=>set('supervisorId',e.target.value)}><option value="">Select…</option>{data.supervisors.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></Field></div>
    <Field label="Description"><input value={f.description} onChange={e=>set('description',e.target.value)}/></Field>
    <div className="grid2"><Field label="Amount"><input type="number" value={f.amount} onChange={e=>set('amount',e.target.value)}/></Field>
      <Field label="Date"><input type="date" value={f.date} onChange={e=>set('date',e.target.value)}/></Field></div>
    <div className="grid2"><Field label="Category"><select value={f.category} onChange={e=>set('category',e.target.value)}>{EXP_CATS.map(c=><option key={c}>{c}</option>)}</select></Field>
      <Field label="Payment method"><select value={f.paymentMethod} onChange={e=>set('paymentMethod',e.target.value)}>{METHODS.map(m=><option key={m}>{m}</option>)}</select></Field></div>
    <Field label="Receipt / voucher reference"><input value={f.receiptRef} onChange={e=>set('receiptRef',e.target.value)} placeholder="Receipt number or photo filename"/></Field>
    <Field label="Notes"><textarea value={f.notes} onChange={e=>set('notes',e.target.value)}/></Field>
  </Modal>;
}

function SupervisorsModal({data,setData,onClose,flash}){
  const [name,setName]=useState('');
  const [phone,setPhone]=useState('');
  const add=()=>{
    if(!name.trim())return;
    setData(d=>({...d,supervisors:[...d.supervisors,{id:uid('sup'),name:name.trim(),phone:phone.trim(),active:true}]}));
    setName('');setPhone('');flash('Supervisor added');
  };
  return <Modal title="Project supervisors" onClose={onClose} footer={<button className="btn primary" onClick={onClose}>Done</button>}>
    <div className="grid2"><Field label="Name"><input value={name} onChange={e=>setName(e.target.value)}/></Field><Field label="Phone"><input value={phone} onChange={e=>setPhone(e.target.value)}/></Field></div>
    <button className="btn" onClick={add}>+ Add supervisor</button>
    <div className="simple-list">{data.supervisors.map(s=><div key={s.id}><div><b>{s.name}</b><span>{s.phone||'No phone'}</span></div><span className="pill gray">{s.active?'Active':'Inactive'}</span></div>)}</div>
  </Modal>;
}

function VendorPaymentAllocation({data,M,fixed,onClose,onSave}){
  const vendorId=fixed.vendorId;
  const vendor=data.vendors.find(v=>v.id===vendorId);
  const bill=fixed.billId?data.vendorBills.find(b=>b.id===fixed.billId):null;
  const allLines=data.vendorBills.filter(b=>b.vendorId===vendorId).flatMap(b=>(b.lines||[]).map(line=>({
    ...line,billId:b.id,invoiceNumber:b.invoiceNumber,dueDate:b.dueDate,
    balance:expenseBalance({id:line.expenseId,amount:(Number(line.qty)||0)*(Number(line.rate)||0)*(1+(Number(line.taxRate)||0)/100)},data.paymentsMade)
  }))).filter(x=>x.balance>0);
  const ordered=bill?[...allLines].sort((a,b)=>Number(b.billId===bill.id)-Number(a.billId===bill.id)):allLines;
  const [amount,setAmount]=useState('');
  const [date,setDate]=useState(today());
  const [method,setMethod]=useState('Bank transfer');
  const [reference,setReference]=useState('');
  const [allocations,setAllocations]=useState({});
  const allocated=sum(Object.values(allocations));
  const setAllocation=(id,value)=>setAllocations(s=>({...s,[id]:Math.max(0,Number(value)||0)}));
  const autoAllocate=()=>{
    let remaining=Number(amount)||0;const next={};
    ordered.forEach(line=>{const value=Math.min(remaining,line.balance);if(value>0)next[line.expenseId]=value;remaining-=value;});
    setAllocations(next);
  };
  const save=()=>{
    const total=Number(amount)||0;
    if(total<=0||allocated>total+0.01)return;
    const batchId=uid('paybatch');
    const records=ordered.filter(line=>(allocations[line.expenseId]||0)>0).map(line=>({
      id:uid('pay'),batchId,projectId:line.projectId,vendorId,expenseId:line.expenseId,
      amount:allocations[line.expenseId],date,method,reference,notes:'Allocated to '+line.invoiceNumber
    }));
    if(total-allocated>0.01)records.push({id:uid('pay'),batchId,projectId:'',vendorId,expenseId:'',amount:total-allocated,date,method,reference,notes:'Unapplied vendor advance'});
    onSave(records);
  };
  return <Modal wide title={'Pay '+(vendor?.name||'vendor')} onClose={onClose}
    footer={<><div style={{marginRight:'auto'}}>Allocated <b>{M(allocated)}</b> · Unapplied <b>{M(Math.max(0,(Number(amount)||0)-allocated))}</b></div><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Record payment</button></>}>
    <div className="grid3"><Field label="Payment amount"><input autoFocus type="number" value={amount} onChange={e=>setAmount(e.target.value)}/></Field>
      <Field label="Date"><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field>
      <Field label="Method"><select value={method} onChange={e=>setMethod(e.target.value)}>{METHODS.map(m=><option key={m}>{m}</option>)}</select></Field></div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><label className="form-section-label">Allocate across open bill lines</label><button className="btn sm" onClick={autoAllocate}>Auto-allocate oldest</button></div>
    <div className="allocation-list">{ordered.map(line=><div key={line.expenseId}>
      <div><b>{line.invoiceNumber} · {line.description}</b><span>{dstr(line.dueDate)} · open {M(line.balance)}</span></div>
      <input className="ctl" type="number" min="0" max={line.balance} value={allocations[line.expenseId]||''} onChange={e=>setAllocation(line.expenseId,Math.min(line.balance,Number(e.target.value)||0))}/>
    </div>)}</div>
    <Field label="Bank / transaction reference"><input value={reference} onChange={e=>setReference(e.target.value)}/></Field>
  </Modal>;
}
