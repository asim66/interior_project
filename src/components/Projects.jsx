import React, { useState } from 'react';
import { sum, rollup, dstr, invTotal, invReceived, invStatus, today, uid, getPaymentsMade, getPaymentsReceived, projectHasFinancialHistory, projectCostControl, materialRequestEstimate, milestoneHealth } from '../shared';
import { StatusPill, Empty, Modal, Field, Confirm } from './ui';

export function Projects({data,M,upsert,remove,flash,setOpenProject,currentUser}){
  const [edit,setEdit]=useState(null);const [del,setDel]=useState(null);const [q,setQ]=useState('');
  const list=data.projects.filter(p=>(p.name+p.client).toLowerCase().includes(q.toLowerCase()));
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const requestDelete=p=>{
    if(currentUser?.role === 'site_supervisor'){
      flash('Permission denied: Site Supervisors cannot delete projects');
      return;
    }
    if(projectHasFinancialHistory(data,p.id) && !isSuperAdmin){
      flash('Project has financial records and cannot be deleted');
      return;
    }
    setDel(p);
  };
  return(<>
    <div className="topbar"><div><h1>Projects</h1><div className="desc">Every job you track, with its own P&amp;L.</div></div>
      <button className="btn primary" onClick={()=>setEdit({})}>+ New project</button></div>
    <div className="content">
      <div className="toolbar"><input className="ctl search" placeholder="Search projects…" value={q} onChange={e=>setQ(e.target.value)}/></div>
      {list.length===0?<div className="card"><Empty icon="▤" title="No projects yet"
        text="A project holds its client, budget, invoices, expenses and payments together."
        action={<button className="btn primary" onClick={()=>setEdit({})}>Create your first project</button>}/></div>
      :<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:16}}>
        {list.map(p=>{const r=rollup(p.id,data);const bpc=p.budget?Math.min(100,r.expenses/p.budget*100):0;
          return(<div className="card" key={p.id}>
            <div className="pad">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div><h3 className="serif" style={{fontSize:18}}>{p.name}</h3>
                  <div style={{fontSize:12.5,color:'var(--muted)',marginTop:2}}>{p.client||'No client set'}</div></div>
                <StatusPill status={p.status}/>
              </div>
              <div className="stat-grid" style={{marginTop:16,gridTemplateColumns:'1fr 1fr'}}>
                <div className="stat"><div className="l">Received</div><div className="v num" style={{color:'var(--green)'}}>{M(r.received)}</div></div>
                <div className="stat"><div className="l">Profit</div><div className="v num" style={{color:r.profit>=0?'var(--green)':'var(--clay)'}}>{M(r.profit)}</div></div>
              </div>
              {p.budget>0&&<div style={{marginTop:14}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:11.5,color:'var(--muted)',marginBottom:5}}>
                  <span>Budget used</span><span className="num">{M(r.expenses)} / {M(p.budget)}</span></div>
                <div className="pbar"><span style={{width:bpc+'%',background:bpc>100?'var(--clay)':'var(--brass)'}}></span></div>
              </div>}
            </div>
            <div className="card-h" style={{borderTop:'1px solid var(--line-2)',borderBottom:'none'}}>
              <button className="btn sm" onClick={()=>setOpenProject(p)}>Open statement</button>
              <div style={{display:'flex',gap:6}}>
                <button className="btn sm ghost" onClick={()=>setEdit(p)}>Edit</button>
                <button className="btn sm ghost" onClick={()=>requestDelete(p)}>Delete</button></div>
            </div>
          </div>);})}
      </div>}
    </div>
    {edit&&<ProjectForm rec={edit} onClose={()=>setEdit(null)} onSave={r=>{upsert('projects',r);flash(r.id?'Project updated':'Project added');setEdit(null);}}/>}
    {del&&<Confirm text={`Delete empty project "${del.name}"?`} onClose={()=>setDel(null)} onYes={()=>{remove('projects',del.id);flash('Project deleted');}}/>}
  </>);
}

export function ProjectForm({rec,onClose,onSave}){
  const [f,setF]=useState({id:rec.id,name:rec.name||'',client:rec.client||'',clientEmail:rec.clientEmail||'',clientPhone:rec.clientPhone||'',address:rec.address||'',status:rec.status||'active',budget:rec.budget||'',startDate:rec.startDate||today(),notes:rec.notes||''});
  const set=(k,v)=>setF(s=>({...s,[k]:v}));
  const save=()=>{if(!f.name.trim())return;onSave({...f,id:f.id||uid('prj'),budget:Number(f.budget)||0});};
  return(<Modal title={rec.id?'Edit project':'New project'} onClose={onClose}
    footer={<><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>{rec.id?'Save changes':'Add project'}</button></>}>
    <Field label="Project name"><input value={f.name} autoFocus onChange={e=>set('name',e.target.value)} placeholder="e.g. Mehta Residence — Living Room"/></Field>
    <div className="grid2">
      <Field label="Client name"><input value={f.client} onChange={e=>set('client',e.target.value)}/></Field>
      <Field label="Status"><select value={f.status} onChange={e=>set('status',e.target.value)}>
        <option value="lead">Lead</option><option value="active">Active</option><option value="on-hold">On hold</option><option value="completed">Completed</option></select></Field>
    </div>
    <div className="grid2">
      <Field label="Client email"><input value={f.clientEmail} onChange={e=>set('clientEmail',e.target.value)}/></Field>
      <Field label="Client phone"><input value={f.clientPhone} onChange={e=>set('clientPhone',e.target.value)}/></Field>
    </div>
    <Field label="Site address"><textarea value={f.address} onChange={e=>set('address',e.target.value)}/></Field>
    <div className="grid2">
      <Field label="Project budget" hint="Optional — used for the budget bar"><input type="number" value={f.budget} onChange={e=>set('budget',e.target.value)}/></Field>
      <Field label="Start date"><input type="date" value={f.startDate} onChange={e=>set('startDate',e.target.value)}/></Field>
    </div>
    <Field label="Notes"><textarea value={f.notes} onChange={e=>set('notes',e.target.value)}/></Field>
  </Modal>);
}

export function ProjectDetail({data,M,setOpenProject,project}){
  const p=data.projects.find(x=>x.id===project.id)||project;
  const r=rollup(p.id,data);
  const invs=data.invoices.filter(i=>i.projectId===p.id);
  const exps=data.expenses.filter(e=>e.projectId===p.id);
  const rec=getPaymentsReceived(data).filter(x=>x.projectId===p.id);
  const paymentsMade=getPaymentsMade(data);
  const made=paymentsMade.filter(x=>x.projectId===p.id);
  const petty=(data.pettyExpenses||[]).filter(x=>x.projectId===p.id&&['approved','reimbursed'].includes(x.status));
  const requests=(data.materialRequests||[]).filter(x=>x.projectId===p.id);
  const milestones=(data.milestones||[]).filter(x=>x.projectId===p.id);
  const control=projectCostControl(data,p.id);
  const vname=id=>data.vendors.find(v=>v.id===id)?.name||'—';
  const billNumber=id=>(data.vendorBills||[]).find(b=>b.id===id)?.invoiceNumber||'—';
  const paidFor=e=>sum(paymentsMade.filter(x=>x.expenseId===e.id),'amount');
  const balFor=e=>Math.max(0,(Number(e.amount)||0)-paidFor(e));
  return(<>
    <div className="topbar"><div>
      <button className="btn sm ghost" style={{marginBottom:8}} onClick={()=>setOpenProject(null)}>← All projects</button>
      <h1>{p.name}</h1><div className="desc">{p.client||'No client'} {p.address?'· '+p.address.split('\n')[0]:''} · <StatusPill status={p.status}/></div>
    </div></div>
    <div className="content">
      <div className="stat-grid">
        <div className="stat"><div className="l">Invoiced</div><div className="v num">{M(r.invoiced)}</div></div>
        <div className="stat"><div className="l">Received</div><div className="v num" style={{color:'var(--green)'}}>{M(r.received)}</div></div>
        <div className="stat"><div className="l">To collect</div><div className="v num" style={{color:'var(--amber)'}}>{M(r.receivable)}</div></div>
        <div className="stat"><div className="l">Expenses</div><div className="v num">{M(r.expenses)}</div></div>
        <div className="stat"><div className="l">To pay</div><div className="v num" style={{color:'var(--clay)'}}>{M(r.payable)}</div></div>
        <div className="stat"><div className="l">Profit</div><div className="v num" style={{color:r.profit>=0?'var(--green)':'var(--clay)'}}>{M(r.profit)}</div></div>
      </div>
      <div className="card" style={{marginTop:18}}>
        <div className="card-h"><h3>Cost control</h3><span className={'pill '+(!control.budget?'gray':control.variance<0?'clay':'green')}>{!control.budget?'No approved baseline':control.variance<0?'Forecast over budget':'Within baseline'}</span></div>
        <div className="pad"><div className="stat-grid">
          <div className="stat"><div className="l">Approved baseline</div><div className="v num">{M(control.budget)}</div></div>
          <div className="stat"><div className="l">Actual cost</div><div className="v num">{M(control.actual)}</div></div>
          <div className="stat"><div className="l">Open material requests</div><div className="v num">{M(control.pendingRequests)}</div></div>
          <div className="stat"><div className="l">Forecast final cost</div><div className="v num">{M(control.forecast)}</div></div>
          <div className="stat"><div className="l">Forecast variance</div><div className="v num" style={{color:control.variance<0?'var(--clay)':'var(--green)'}}>{control.variance<0?'−':'+'}{M(Math.abs(control.variance))}</div></div>
        </div></div>
      </div>

      <div className="section-title">❋ Invoices</div>
      <div className="card"><div className="card-b">
        {invs.length===0?<div style={{padding:16,color:'var(--muted)'}}>No invoices for this project.</div>:
        <table><thead><tr><th>Number</th><th>Date</th><th className="r">Total</th><th className="r">Received</th><th>Status</th></tr></thead><tbody>
          {invs.map(i=>{const t=invTotal(i);const st=invStatus(i,data.paymentsReceived);return(<tr key={i.id}>
            <td style={{fontWeight:600}}>{i.number}</td><td>{dstr(i.date)}</td><td className="r num">{M(t.total)}</td>
            <td className="r num">{M(invReceived(i,data.paymentsReceived))}</td><td><span className={"pill "+st.c}>{st.t}</span></td></tr>);})}
        </tbody></table>}
      </div></div>

      <div className="section-title">▾ Expenses</div>
      <div className="card"><div className="card-b">
        {exps.length===0?<div style={{padding:16,color:'var(--muted)'}}>No expenses recorded.</div>:
        <table><thead><tr><th>Date</th><th>Description</th><th>Vendor bill</th><th>Vendor</th><th>Due</th><th className="r">Billed</th><th className="r">Paid</th><th className="r">Balance</th></tr></thead><tbody>
          {exps.map(e=>(<tr key={e.id}><td>{dstr(e.date)}</td><td>{e.description}</td><td>{billNumber(e.billId)}</td><td>{vname(e.vendorId)}</td><td>{dstr(e.dueDate)}</td>
            <td className="r num">{M(e.amount)}</td><td className="r num" style={{color:'var(--green)'}}>{M(paidFor(e))}</td><td className="r num" style={{color:balFor(e)>0?'var(--clay)':'var(--muted)'}}>{M(balFor(e))}</td></tr>))}
        </tbody></table>}
      </div></div>

      {petty.length>0&&<><div className="section-title">◌ Approved small expenses</div>
        <div className="card"><div className="card-b"><table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Status</th><th className="r">Amount</th></tr></thead>
          <tbody>{petty.map(x=><tr key={x.id}><td>{dstr(x.date)}</td><td>{x.description}</td><td>{x.category}</td><td><span className={'pill '+(x.status==='reimbursed'?'green':'brass')}>{x.status}</span></td><td className="r num">{M(x.amount)}</td></tr>)}</tbody>
        </table></div></div></>}

      {requests.length>0&&<><div className="section-title">▦ Material requests</div>
        <div className="card"><div className="card-b"><table><thead><tr><th>Request</th><th>Required</th><th>Items</th><th className="r">Estimate</th><th>Status</th></tr></thead>
          <tbody>{requests.map(x=><tr key={x.id}><td style={{fontWeight:600}}>{x.number}</td><td>{dstr(x.requiredBy)}</td><td>{(x.items||[]).length}</td><td className="r num">{M(materialRequestEstimate(x))}</td><td><span className="pill gray">{x.status}</span></td></tr>)}</tbody>
        </table></div></div></>}

      {milestones.length>0&&<><div className="section-title">◫ Delivery milestones</div>
        <div className="card"><div className="card-b"><table><thead><tr><th>Milestone</th><th>Planned finish</th><th>Progress</th><th>Status</th><th>Blocker</th></tr></thead>
          <tbody>{milestones.map(x=>{const h=milestoneHealth(x);return <tr key={x.id}><td style={{fontWeight:600}}>{x.name}</td><td>{dstr(x.plannedEnd)}</td><td className="num">{x.progress||0}%</td><td><span className={'pill '+h.c}>{h.t}</span></td><td>{x.blocker||'—'}</td></tr>;})}</tbody>
        </table></div></div></>}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}} className="dash-split">
        <div><div className="section-title">↓ Payments received</div>
          <div className="card"><div className="card-b">
            {rec.length===0?<div style={{padding:16,color:'var(--muted)'}}>None yet.</div>:
            <table><tbody>{rec.map(x=>(<tr key={x.id}><td>{dstr(x.date)}<div style={{fontSize:11,color:'var(--muted)'}}>{x.method}</div></td><td className="r num" style={{color:'var(--green)'}}>+{M(x.amount)}</td></tr>))}</tbody></table>}
          </div></div></div>
        <div><div className="section-title">↑ Payments made</div>
          <div className="card"><div className="card-b">
            {made.length===0?<div style={{padding:16,color:'var(--muted)'}}>None yet.</div>:
            <table><tbody>{made.map(x=>(<tr key={x.id}><td>{dstr(x.date)}<div style={{fontSize:11,color:'var(--muted)'}}>{vname(x.vendorId)} · {x.method}</div></td><td className="r num" style={{color:'var(--clay)'}}>−{M(x.amount)}</td></tr>))}</tbody></table>}
          </div></div></div>
      </div>
      {p.notes&&<><div className="section-title">Notes</div><div className="card"><div className="pad" style={{whiteSpace:'pre-line',color:'var(--ink-2)'}}>{p.notes}</div></div></>}
    </div>
  </>);
}
