import React, { useState } from 'react';
import { dstr, invoiceBalance, invStatus, invTotal, today, uid } from '../shared';
import { Empty, Field, Modal } from './ui';

export function Collections({data,setData,M,flash}){
  const [activityFor,setActivityFor]=useState(null);
  const [termsFor,setTermsFor]=useState(null);
  const projectName=id=>data.projects.find(p=>p.id===id)?.name||'Unknown project';
  const clientName=id=>data.projects.find(p=>p.id===id)?.client||'Unknown client';
  const open=data.invoices.filter(inv=>inv.status!=='draft'&&invoiceBalance(inv,data.paymentsReceived)>0)
    .sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999'));
  const totalOpen=open.reduce((s,inv)=>s+invoiceBalance(inv,data.paymentsReceived),0);
  const overdue=open.filter(inv=>inv.dueDate&&inv.dueDate<today());
  const saveActivity=activity=>{
    setData(d=>({...d,collectionActivities:[...d.collectionActivities,{...activity,id:uid('collect')}]}));
    flash('Collection follow-up logged');setActivityFor(null);
  };
  const saveTerms=terms=>{
    setData(d=>({...d,projects:d.projects.map(p=>p.id===terms.id?{...p,...terms}:p)}));
    flash('Commercial terms saved');setTermsFor(null);
  };
  return(<>
    <div className="topbar"><div><h1>Client collections</h1><div className="desc">Design engagement protection, milestone receivables and final-payment follow-up.</div></div></div>
    <div className="content">
      <div className="kpis compact-kpis">
        <div className="kpi due"><div className="bar"></div><div className="lbl">Open receivables</div><div className="val num">{M(totalOpen)}</div><div className="meta">{open.length} invoices</div></div>
        <div className="kpi out"><div className="bar"></div><div className="lbl">Overdue</div><div className="val num">{M(overdue.reduce((s,i)=>s+invoiceBalance(i,data.paymentsReceived),0))}</div><div className="meta">{overdue.length} require follow-up</div></div>
        <div className="kpi pro"><div className="bar"></div><div className="lbl">Execution conversion</div><div className="val num">{data.projects.filter(p=>p.conversionStatus==='won').length}/{data.projects.length}</div><div className="meta">Design clients converted</div></div>
      </div>

      <div className="section-title">Receivables follow-up</div>
      {!open.length?<div className="card"><Empty icon="↓" title="No open client balances" text="All issued invoices are currently settled."/></div>:
      <div className="card"><div className="card-b"><table>
        <thead><tr><th>Invoice</th><th>Client / project</th><th>Due</th><th>Aging</th><th className="r">Invoice</th><th className="r">Balance</th><th>Last follow-up</th><th></th></tr></thead>
        <tbody>{open.map(inv=>{
          const status=invStatus(inv,data.paymentsReceived);
          const age=inv.dueDate?Math.max(0,Math.floor((new Date(today())-new Date(inv.dueDate))/86400000)):0;
          const acts=data.collectionActivities.filter(a=>a.invoiceId===inv.id).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
          return <tr key={inv.id}>
            <td style={{fontWeight:600}}>{inv.number}<div className="subtle"><span className={'pill '+status.c}>{status.t}</span></div></td>
            <td>{clientName(inv.projectId)}<div className="subtle">{projectName(inv.projectId)}</div></td><td>{dstr(inv.dueDate)}</td>
            <td><span className={'pill '+(age>30?'clay':age>0?'amber':'gray')}>{age?age+' days overdue':'Current'}</span></td>
            <td className="r num">{M(invTotal(inv).total)}</td><td className="r num" style={{color:'var(--clay)',fontWeight:600}}>{M(invoiceBalance(inv,data.paymentsReceived))}</td>
            <td>{acts[0]?<>{dstr(acts[0].date)}<div className="subtle">{acts[0].type}{acts[0].promiseDate?' · promised '+dstr(acts[0].promiseDate):''}</div></>:'—'}</td>
            <td className="r"><button className="btn sm primary" onClick={()=>setActivityFor(inv)}>Log follow-up</button></td>
          </tr>;
        })}</tbody>
      </table></div></div>}

      <div className="section-title">Design-to-execution terms</div>
      <div className="commercial-grid">{data.projects.map(p=><div className="card commercial-card" key={p.id}>
        <div className="pad"><div className="estimate-head"><span className={'pill '+(p.conversionStatus==='won'?'green':p.conversionStatus==='lost'?'clay':'gray')}>{p.conversionStatus||'design stage'}</span></div>
          <h3>{p.name}</h3><div className="subtle">{p.client||'No client'}</div>
          <div className="terms-grid">
            <div><span>Design fee</span><b className="num">{M(p.designFee||0)}</b></div>
            <div><span>Execution credit</span><b className="num">{M(p.executionCredit||0)}</b></div>
            <div><span>Credit valid until</span><b>{dstr(p.creditExpiry)}</b></div>
            <div><span>Minimum execution</span><b className="num">{M(p.minimumExecutionValue||0)}</b></div>
          </div>
        </div><div className="card-h"><span className="subtle">Keep design and execution commercially separate.</span><button className="btn sm" onClick={()=>setTermsFor(p)}>Set terms</button></div>
      </div>)}</div>
    </div>
    {activityFor&&<CollectionActivityForm inv={activityFor} data={data} onClose={()=>setActivityFor(null)} onSave={saveActivity}/>}
    {termsFor&&<CommercialTermsForm project={termsFor} onClose={()=>setTermsFor(null)} onSave={saveTerms}/>}
  </>);
}

function CollectionActivityForm({inv,data,onClose,onSave}){
  const [f,setF]=useState({invoiceId:inv.id,projectId:inv.projectId,date:today(),type:'reminder',promiseDate:'',note:''});
  const set=(k,v)=>setF(s=>({...s,[k]:v}));
  return <Modal title={'Follow up '+inv.number} onClose={onClose}
    footer={<><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={()=>f.note.trim()&&onSave(f)}>Save follow-up</button></>}>
    <div className="callout"><b>Open balance</b><span>{data.settings.currency} {invoiceBalance(inv,data.paymentsReceived).toLocaleString('en-IN')}</span></div>
    <div className="grid2"><Field label="Activity"><select value={f.type} onChange={e=>set('type',e.target.value)}><option value="reminder">Payment reminder</option><option value="promise">Payment promise</option><option value="dispute">Dispute / hold</option><option value="note">Collection note</option></select></Field>
      <Field label="Date"><input type="date" value={f.date} onChange={e=>set('date',e.target.value)}/></Field></div>
    {f.type==='promise'&&<Field label="Promised payment date"><input type="date" value={f.promiseDate} onChange={e=>set('promiseDate',e.target.value)}/></Field>}
    <Field label="Conversation and next action"><textarea autoFocus value={f.note} onChange={e=>set('note',e.target.value)} placeholder="Contact method, client response, commitment and next follow-up…"/></Field>
  </Modal>;
}

function CommercialTermsForm({project,onClose,onSave}){
  const [f,setF]=useState({
    id:project.id,designFee:project.designFee||'',executionCredit:project.executionCredit||'',creditExpiry:project.creditExpiry||'',
    minimumExecutionValue:project.minimumExecutionValue||'',conversionStatus:project.conversionStatus||'design-stage',
    designTerms:project.designTerms||'Design fee is independent. Any execution credit is conditional on the execution contract, minimum project value and validity date.'
  });
  const set=(k,v)=>setF(s=>({...s,[k]:v}));
  const save=()=>onSave({...f,designFee:Number(f.designFee)||0,executionCredit:Number(f.executionCredit)||0,minimumExecutionValue:Number(f.minimumExecutionValue)||0});
  return <Modal title="Design engagement terms" onClose={onClose}
    footer={<><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Save terms</button></>}>
    <div className="callout"><b>Commercial safeguard</b><span>Price design as a standalone professional service. Treat any adjustment against execution as an explicit, time-bound conditional credit.</span></div>
    <div className="grid2"><Field label="Standalone design fee"><input type="number" value={f.designFee} onChange={e=>set('designFee',e.target.value)}/></Field>
      <Field label="Conditional execution credit"><input type="number" value={f.executionCredit} onChange={e=>set('executionCredit',e.target.value)}/></Field></div>
    <div className="grid2"><Field label="Credit valid until"><input type="date" value={f.creditExpiry} onChange={e=>set('creditExpiry',e.target.value)}/></Field>
      <Field label="Minimum execution value"><input type="number" value={f.minimumExecutionValue} onChange={e=>set('minimumExecutionValue',e.target.value)}/></Field></div>
    <Field label="Conversion status"><select value={f.conversionStatus} onChange={e=>set('conversionStatus',e.target.value)}><option value="design-stage">Design stage</option><option value="proposal-sent">Execution proposal sent</option><option value="won">Execution won</option><option value="lost">Design-only / lost</option></select></Field>
    <Field label="Terms summary"><textarea value={f.designTerms} onChange={e=>set('designTerms',e.target.value)}/></Field>
    <div className="subtle">Have final contract language reviewed by your legal adviser before use.</div>
  </Modal>;
}
