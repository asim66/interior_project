import React from 'react';
import { sum, invTotal, monthKey, dstr, rollup, loadSample, getPaymentsMade, getPaymentsReceived, accountsReceivable, accountsPayable, pettyExpenseTotal, pettyPaidTotal, milestoneHealth, projectCostControl } from '../shared';
import { StatusPill, Empty } from './ui';

export function Dashboard({data,M,cur,setView,flash,setData}){
  const d=data;
  const invoiced=sum(d.invoices.filter(i=>i.status!=='draft'),i=>invTotal(i).total);
  const paymentsReceived=getPaymentsReceived(d);
  const received=sum(paymentsReceived,'amount');
  const expenses=sum(d.expenses,'amount')+pettyExpenseTotal(d);
  const paymentsMade=getPaymentsMade(d);
  const paidOut=sum(paymentsMade,'amount')+pettyPaidTotal(d);
  const payable=accountsPayable(d);
  const receivable=accountsReceivable(d);
  const profit=invoiced-expenses;

  // 6-month cashflow
  const months=[];const now=new Date();
  for(let i=5;i>=0;i--){const dt=new Date(now.getFullYear(),now.getMonth()-i,1);months.push(dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0'));}
  const inByM=Object.fromEntries(months.map(m=>[m,0]));
  const outByM=Object.fromEntries(months.map(m=>[m,0]));
  paymentsReceived.forEach(p=>{const k=monthKey(p.date);if(k in inByM)inByM[k]+=Number(p.amount)||0;});
  paymentsMade.forEach(p=>{const k=monthKey(p.date);if(k in outByM)outByM[k]+=Number(p.amount)||0;});
  const maxV=Math.max(1,...months.map(m=>Math.max(inByM[m],outByM[m])));

  const activity=[
    ...paymentsReceived.map(p=>({t:'in',date:p.date,label:'Payment received',amt:p.amount,pid:p.projectId})),
    ...paymentsMade.map(p=>({t:'out',date:p.date,label:'Payment made',amt:p.amount,pid:p.projectId})),
    ...d.expenses.map(e=>({t:'out',date:e.date,label:'Expense · '+(e.description||e.category),amt:e.amount,pid:e.projectId})),
  ].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,7);
  const pname=id=>d.projects.find(p=>p.id===id)?.name||'—';

  const empty=d.projects.length===0&&d.invoices.length===0&&d.expenses.length===0;
  const atRisk=d.projects.filter(p=>{
    const cc=projectCostControl(d,p.id);
    return cc.budget>0&&cc.variance<0;
  }).length;
  const delayed=(d.milestones||[]).filter(m=>['overdue','blocked'].includes(milestoneHealth(m).key)).length;

  return(<>
    <div className="topbar"><div><h1>Dashboard</h1><div className="desc">Money across every project, at a glance.</div></div>
      {empty&&<button className="btn primary" onClick={()=>{loadSample(setData);flash('Sample data loaded');}}>✦ Load sample data</button>}
    </div>
    <div className="content">
      {empty?<div className="card"><Empty icon="◱" title="Your ledger is empty"
        text="Add your first project, or load sample data to see how everything fits together — then clear it anytime in Settings."
        action={<div style={{display:'flex',gap:10,justifyContent:'center'}}>
          <button className="btn primary" onClick={()=>setView('projects')}>Create a project</button>
          <button className="btn" onClick={()=>{loadSample(setData);flash('Sample data loaded');}}>Load sample data</button></div>}/></div>
      :<>
      <div className="kpis">
        <div className="kpi in"><div className="bar"></div><div className="lbl">Received</div><div className="val num">{M(received)}</div><div className="meta">Cash in from clients</div></div>
        <div className="kpi out"><div className="bar"></div><div className="lbl">Vendor bills</div><div className="val num">{M(expenses)}</div><div className="meta">{M(paidOut)} paid out</div></div>
        <div className="kpi pro"><div className="bar"></div><div className="lbl">Net profit</div><div className="val num money" style={{color:profit>=0?'var(--green)':'var(--clay)'}}>{M(profit)}</div><div className="meta">Invoiced − expenses</div></div>
        <div className="kpi due"><div className="bar"></div><div className="lbl">To collect</div><div className="val num">{M(receivable)}</div><div className="meta">Outstanding from clients</div></div>
        <div className="kpi out"><div className="bar"></div><div className="lbl">To pay</div><div className="val num">{M(payable)}</div><div className="meta">Vendor bills minus payments</div></div>
        <div className="kpi due"><div className="bar"></div><div className="lbl">Delivery risk</div><div className="val num">{delayed}</div><div className="meta">{atRisk} projects forecast over budget</div></div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1.4fr 1fr',gap:18}} className="dash-split">
        <div className="card">
          <div className="card-h"><h3>Cash flow · last 6 months</h3>
            <div className="legend"><span><i style={{background:'var(--green)'}}></i>In</span><span><i style={{background:'var(--clay)'}}></i>Out</span></div></div>
          <div className="pad">
            <div className="chart">
              {months.map(m=>(<div className="grp" key={m}>
                <div className="bars">
                  <div className="bar-in" style={{height:(inByM[m]/maxV*100)+'%'}} title={M(inByM[m])}></div>
                  <div className="bar-out" style={{height:(outByM[m]/maxV*100)+'%'}} title={M(outByM[m])}></div>
                </div>
                <div className="mlbl">{new Date(m+'-01').toLocaleDateString('en',{month:'short'})}</div>
              </div>))}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-h"><h3>Recent activity</h3></div>
          <div className="card-b">
            {activity.length===0?<div style={{padding:20,color:'var(--muted)',fontSize:13}}>Nothing yet.</div>:
            <table><tbody>
              {activity.map((a,i)=>(<tr key={i}>
                <td style={{width:34}}><span className="pill" style={{width:22,height:22,justifyContent:'center',padding:0,borderRadius:6,background:a.t==='in'?'var(--green-soft)':'var(--clay-soft)',color:a.t==='in'?'var(--green)':'var(--clay)'}}>{a.t==='in'?'↓':'↑'}</span></td>
                <td>{a.label}<div style={{fontSize:11,color:'var(--muted)'}}>{pname(a.pid)} · {dstr(a.date)}</div></td>
                <td className="r num money" style={{color:a.t==='in'?'var(--green)':'var(--clay)'}}>{a.t==='in'?'+':'−'}{M(a.amt)}</td>
              </tr>))}
            </tbody></table>}
          </div>
        </div>
      </div>

      <div className="card" style={{marginTop:18}}>
        <div className="card-h"><h3>Projects overview</h3><button className="btn sm" onClick={()=>setView('projects')}>All projects →</button></div>
        <div className="card-b">
          {d.projects.length===0?<div style={{padding:20,color:'var(--muted)',fontSize:13}}>No projects yet.</div>:
          <table>
            <thead><tr><th>Project</th><th>Status</th><th className="r">Invoiced</th><th className="r">Received</th><th className="r">Spent</th><th className="r">Profit</th><th className="r">To collect</th></tr></thead>
            <tbody>
              {d.projects.map(p=>{const r=rollup(p.id,d);return(<tr key={p.id}>
                <td style={{fontWeight:600}}>{p.name}<div style={{fontSize:11,color:'var(--muted)',fontWeight:400}}>{p.client}</div></td>
                <td><StatusPill status={p.status}/></td>
                <td className="r num">{M(r.invoiced)}</td>
                <td className="r num">{M(r.received)}</td>
                <td className="r num">{M(r.expenses)}</td>
                <td className="r num money" style={{color:r.profit>=0?'var(--green)':'var(--clay)'}}>{M(r.profit)}</td>
                <td className="r num">{M(r.receivable)}</td>
              </tr>);})}
            </tbody>
          </table>}
        </div>
      </div>
      </>}
    </div>
  </>);
}
