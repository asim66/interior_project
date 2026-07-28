import React, { useState } from 'react';
import { estimateTotal, EXP_CATS, fmt, projectCostControl, today, uid, UNITS } from '../shared';
import { Empty, Field, Modal } from './ui';

export function Estimates({data,setData,M,flash}){
  const [edit,setEdit]=useState(null);
  const [projectFilter,setProjectFilter]=useState('all');
  const projectName=id=>data.projects.find(p=>p.id===id)?.name||'Unknown project';
  const list=[...data.estimates]
    .filter(e=>projectFilter==='all'||e.projectId===projectFilter)
    .sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(Number(b.version)||0)-(Number(a.version)||0));
  const save=estimate=>{
    setData(d=>({...d,estimates:d.estimates.some(e=>e.id===estimate.id)
      ?d.estimates.map(e=>e.id===estimate.id?estimate:e):[...d.estimates,estimate]}));
    flash(edit.id?'Estimate updated':'Estimate created');setEdit(null);
  };
  const approve=estimate=>{
    setData(d=>({...d,estimates:d.estimates.map(e=>{
      if(e.id===estimate.id)return{...e,status:'approved',approvedAt:new Date().toISOString()};
      if(e.projectId===estimate.projectId&&e.type===estimate.type&&e.status==='approved')return{...e,status:'superseded'};
      return e;
    })}));
    flash('Estimate approved as project baseline');
  };
  const duplicate=estimate=>{
    const versions=data.estimates.filter(e=>e.projectId===estimate.projectId&&e.type===estimate.type).map(e=>Number(e.version)||0);
    setEdit({...estimate,id:undefined,version:Math.max(0,...versions)+1,status:'draft',date:today()});
  };

  return(<>
    <div className="topbar"><div><h1>Estimation &amp; cost control</h1><div className="desc">Pre-design budget ranges, room-wise BOQs, revisions and forecast-versus-actual.</div></div>
      <div style={{display:'flex',gap:8}}><button className="btn" disabled={!data.projects.length} onClick={()=>setEdit({type:'rough'})}>+ Rough estimate</button>
        <button className="btn primary" disabled={!data.projects.length} onClick={()=>setEdit({type:'detailed'})}>+ Detailed BOQ</button></div></div>
    <div className="content">
      <div className="toolbar"><select className="ctl" value={projectFilter} onChange={e=>setProjectFilter(e.target.value)}><option value="all">All projects</option>{data.projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      <CostControlTable data={data} M={M} filter={projectFilter}/>
      <div className="section-title">Estimate versions</div>
      {!list.length?<div className="card"><Empty icon="▧" title="No estimates yet" text="Start with a range before floor planning, then replace it with a measured room-wise BOQ."/></div>:
      <div className="estimate-grid">{list.map(e=><div className="card estimate-card" key={e.id}>
        <div className="pad">
          <div className="estimate-head"><span className={'pill '+(e.status==='approved'?'green':e.status==='superseded'?'gray':'brass')}>{e.status}</span><span className="subtle">Version {e.version||1}</span></div>
          <h3>{e.type==='rough'?'Pre-design budget':'Detailed BOQ'}</h3><div className="subtle">{projectName(e.projectId)} · {e.date}</div>
          <div className="estimate-total num">{M(estimateTotal(e))}</div>
          <div className="subtle">{e.type==='rough'?`${e.area||0} sq ft · ${e.finishLevel||'standard'} finish · working range ${M(estimateTotal(e)*.85)}–${M(estimateTotal(e)*1.15)}`:`${(e.lines||[]).length} measured cost lines`}</div>
        </div>
        <div className="card-h">{e.status==='draft'?<button className="btn sm ghost" onClick={()=>setEdit(e)}>Edit</button>:<span className="subtle">Approved versions are locked</span>}<div className="row-actions">
          <button className="btn sm" onClick={()=>duplicate(e)}>New revision</button>
          {e.status==='draft'&&<button className="btn sm primary" onClick={()=>approve(e)}>Approve baseline</button>}
        </div></div>
      </div>)}</div>}
    </div>
    {edit&&<EstimateForm rec={edit} data={data} onClose={()=>setEdit(null)} onSave={save}/>}
  </>);
}

function CostControlTable({data,M,filter}){
  const projects=data.projects.filter(p=>filter==='all'||p.id===filter);
  if(!projects.length)return null;
  return <div className="card"><div className="card-h"><h3>Budget health</h3><span className="subtle">Approved estimate + open requests vs actual cost</span></div><div className="card-b"><table>
    <thead><tr><th>Project</th><th>Baseline</th><th className="r">Actual</th><th className="r">Open requests</th><th className="r">Forecast</th><th className="r">Variance</th><th>Health</th></tr></thead>
    <tbody>{projects.map(p=>{const c=projectCostControl(data,p.id);const pct=c.budget?c.forecast/c.budget*100:0;return <tr key={p.id}>
      <td style={{fontWeight:600}}>{p.name}</td><td>{c.estimate?(c.estimate.type==='rough'?'Rough estimate':'Detailed BOQ'):'Project budget'}</td>
      <td className="r num">{M(c.actual)}</td><td className="r num">{M(c.pendingRequests)}</td><td className="r num">{M(c.forecast)}</td>
      <td className="r num" style={{color:c.variance<0?'var(--clay)':'var(--green)'}}>{c.variance<0?'−':'+'}{M(Math.abs(c.variance))}</td>
      <td><span className={'pill '+(!c.budget?'gray':pct>100?'clay':pct>85?'amber':'green')}>{!c.budget?'No baseline':pct>100?'Over budget':pct>85?'At risk':'On track'}</span></td>
    </tr>;})}</tbody>
  </table></div></div>;
}

function EstimateForm({rec,data,onClose,onSave}){
  const isNew=!rec.id;
  const type=rec.type||'rough';
  const projectId=rec.projectId||data.projects[0]?.id||'';
  const versions=data.estimates.filter(e=>e.projectId===projectId&&e.type===type).map(e=>Number(e.version)||0);
  const [f,setF]=useState({
    id:rec.id,projectId,type,version:rec.version||Math.max(0,...versions)+1,status:rec.status||'draft',date:rec.date||today(),
    area:rec.area||'',finishLevel:rec.finishLevel||'standard',baseRate:rec.baseRate||'',designFee:rec.designFee||'',
    contingencyPct:rec.contingencyPct??10,assumptions:rec.assumptions||'',exclusions:rec.exclusions||'',notes:rec.notes||'',
    lines:rec.lines?.length?rec.lines.map(x=>({...x})):[{id:uid('boq'),room:'General',description:'',category:'Materials',qty:1,unit:'nos',materialRate:'',labourRate:'',markupPct:0}]
  });
  const set=(k,v)=>setF(s=>({...s,[k]:v}));
  const setLine=(i,k,v)=>setF(s=>({...s,lines:s.lines.map((x,j)=>j===i?{...x,[k]:v}:x)}));
  const save=()=>{
    if(!f.projectId)return;
    if(type==='rough'&&(Number(f.area)<=0||Number(f.baseRate)<=0))return;
    const lines=type==='detailed'?f.lines.filter(x=>x.description.trim()).map(x=>({
      ...x,qty:Number(x.qty)||0,materialRate:Number(x.materialRate)||0,labourRate:Number(x.labourRate)||0,markupPct:Number(x.markupPct)||0
    })):[];
    if(type==='detailed'&&!lines.length)return;
    onSave({...f,id:f.id||uid('est'),area:Number(f.area)||0,baseRate:Number(f.baseRate)||0,designFee:Number(f.designFee)||0,contingencyPct:Number(f.contingencyPct)||0,lines});
  };
  const total=estimateTotal(f);
  return <Modal wide title={(isNew?'New ':'Edit ')+(type==='rough'?'rough estimate':'detailed BOQ')} onClose={onClose}
    footer={<><div style={{marginRight:'auto'}}>Estimated total: <b className="num">{fmt(total,data.settings.currency)}</b></div><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Save estimate</button></>}>
    <div className="grid3"><Field label="Project"><select value={f.projectId} onChange={e=>set('projectId',e.target.value)}>{data.projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      <Field label="Version"><input type="number" min="1" value={f.version} onChange={e=>set('version',e.target.value)}/></Field>
      <Field label="Estimate date"><input type="date" value={f.date} onChange={e=>set('date',e.target.value)}/></Field></div>
    {type==='rough'?<>
      <div className="callout"><b>Pre-design estimate</b><span>Use area × package rate to establish a realistic range before measurements and floor plans. Clearly communicate assumptions and expected accuracy.</span></div>
      <div className="grid3"><Field label="Approx. area (sq ft)"><input type="number" value={f.area} onChange={e=>set('area',e.target.value)}/></Field>
        <Field label="Finish package"><select value={f.finishLevel} onChange={e=>set('finishLevel',e.target.value)}><option>essential</option><option>standard</option><option>premium</option><option>luxury</option></select></Field>
        <Field label="Package rate / sq ft"><input type="number" value={f.baseRate} onChange={e=>set('baseRate',e.target.value)}/></Field></div>
    </>:<>
      <div className="callout"><b>Measured BOQ</b><span>Break the design into room-wise quantities, material and labour rates. Approved revisions become the cost-control baseline.</span></div>
      <div className="boq-lines">{f.lines.map((line,i)=><div className="boq-line" key={line.id}>
        <div className="grid3"><Field label="Room / zone"><input value={line.room} onChange={e=>setLine(i,'room',e.target.value)}/></Field>
          <Field label="Work / material description"><input value={line.description} onChange={e=>setLine(i,'description',e.target.value)}/></Field>
          <Field label="Category"><select value={line.category} onChange={e=>setLine(i,'category',e.target.value)}>{EXP_CATS.map(c=><option key={c}>{c}</option>)}</select></Field></div>
        <div className="grid5"><Field label="Qty"><input type="number" value={line.qty} onChange={e=>setLine(i,'qty',e.target.value)}/></Field>
          <Field label="Unit"><select value={line.unit} onChange={e=>setLine(i,'unit',e.target.value)}>{UNITS.map(u=><option key={u}>{u}</option>)}</select></Field>
          <Field label="Material rate"><input type="number" value={line.materialRate} onChange={e=>setLine(i,'materialRate',e.target.value)}/></Field>
          <Field label="Labour rate"><input type="number" value={line.labourRate} onChange={e=>setLine(i,'labourRate',e.target.value)}/></Field>
          <Field label="Markup %"><input type="number" value={line.markupPct} onChange={e=>setLine(i,'markupPct',e.target.value)}/></Field></div>
        <button className="btn sm ghost danger" disabled={f.lines.length===1} onClick={()=>setF(s=>({...s,lines:s.lines.filter((_,j)=>j!==i)}))}>Remove line</button>
      </div>)}</div>
      <button className="btn sm" onClick={()=>setF(s=>({...s,lines:[...s.lines,{id:uid('boq'),room:'General',description:'',category:'Materials',qty:1,unit:'nos',materialRate:'',labourRate:'',markupPct:0}]}))}>+ Add BOQ line</button>
    </>}
    <div className="grid2" style={{marginTop:16}}><Field label="Design fee"><input type="number" value={f.designFee} onChange={e=>set('designFee',e.target.value)}/></Field>
      <Field label="Contingency %"><input type="number" value={f.contingencyPct} onChange={e=>set('contingencyPct',e.target.value)}/></Field></div>
    <Field label="Assumptions"><textarea value={f.assumptions} onChange={e=>set('assumptions',e.target.value)} placeholder="Area basis, finish grade, brands, site condition, expected accuracy…"/></Field>
    <Field label="Exclusions"><textarea value={f.exclusions} onChange={e=>set('exclusions',e.target.value)} placeholder="Loose appliances, statutory fees, structural repairs…"/></Field>
  </Modal>;
}
