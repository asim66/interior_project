import React, { useState } from 'react';
import { dstr, milestoneHealth, MILESTONE_STATUSES, today, uid } from '../shared';
import { Empty, Field, Modal } from './ui';

export function Schedule({data,setData,flash}){
  const [edit,setEdit]=useState(null);
  const [projectFilter,setProjectFilter]=useState('all');
  const projectName=id=>data.projects.find(p=>p.id===id)?.name||'Unknown project';
  const ownerName=id=>data.supervisors.find(s=>s.id===id)?.name||'Unassigned';
  const list=[...data.milestones].filter(m=>projectFilter==='all'||m.projectId===projectFilter)
    .sort((a,b)=>(a.plannedEnd||'9999').localeCompare(b.plannedEnd||'9999'));
  const save=record=>{
    setData(d=>({...d,milestones:d.milestones.some(x=>x.id===record.id)?d.milestones.map(x=>x.id===record.id?record:x):[...d.milestones,record]}));
    flash(edit.id?'Milestone updated':'Milestone added');setEdit(null);
  };
  const quickStatus=(milestone,status)=>{
    setData(d=>({...d,milestones:d.milestones.map(m=>m.id===milestone.id?{
      ...m,status,progress:status==='completed'?100:m.progress,actualEnd:status==='completed'?today():m.actualEnd
    }:m)}));flash('Milestone updated');
  };
  const delayed=list.filter(m=>['overdue','blocked'].includes(milestoneHealth(m).key)).length;
  const completed=list.filter(m=>m.status==='completed').length;
  return(<>
    <div className="topbar"><div><h1>Project schedule</h1><div className="desc">Milestones, accountable owners, blockers and completion risk.</div></div>
      <button className="btn primary" disabled={!data.projects.length} onClick={()=>setEdit({})}>+ Milestone</button></div>
    <div className="content">
      <div className="toolbar"><select className="ctl" value={projectFilter} onChange={e=>setProjectFilter(e.target.value)}><option value="all">All projects</option>{data.projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <div className="spacer"></div><span className="pill green">{completed} completed</span><span className={'pill '+(delayed?'clay':'gray')}>{delayed} delayed / blocked</span></div>
      {!list.length?<div className="card"><Empty icon="◫" title="No project milestones" text="Create the baseline schedule and assign every deliverable to a responsible supervisor."/></div>:
      <div className="schedule-list">{list.map(m=>{const health=milestoneHealth(m);return <div className="card milestone-card" key={m.id}>
        <div className="milestone-main">
          <div className="milestone-date"><b>{dstr(m.plannedEnd)}</b><span>planned finish</span></div>
          <div className="milestone-info"><div className="milestone-title"><h3>{m.name}</h3><span className={'pill '+health.c}>{health.t}</span></div>
            <div className="subtle">{projectName(m.projectId)} · Owner: {ownerName(m.ownerId)} · {dstr(m.plannedStart)}–{dstr(m.plannedEnd)}</div>
            <div className="progress-row"><div className="pbar"><span style={{width:Math.min(100,Number(m.progress)||0)+'%',background:health.c==='clay'?'var(--clay)':'var(--green)'}}></span></div><b>{Number(m.progress)||0}%</b></div>
            {m.blocker&&<div className="blocker"><b>Blocker:</b> {m.blocker}</div>}
          </div>
          <div className="milestone-actions"><button className="btn sm ghost" onClick={()=>setEdit(m)}>Edit</button>
            {m.status!=='completed'&&<button className="btn sm primary" onClick={()=>quickStatus(m,'completed')}>Complete</button>}</div>
        </div>
      </div>;})}</div>}
    </div>
    {edit&&<MilestoneForm rec={edit} data={data} onClose={()=>setEdit(null)} onSave={save}/>}
  </>);
}

function MilestoneForm({rec,data,onClose,onSave}){
  const [f,setF]=useState({
    id:rec.id,projectId:rec.projectId||data.projects[0]?.id||'',name:rec.name||'',ownerId:rec.ownerId||data.supervisors[0]?.id||'',
    plannedStart:rec.plannedStart||today(),plannedEnd:rec.plannedEnd||'',actualEnd:rec.actualEnd||'',
    status:rec.status||'not-started',progress:rec.progress||0,blocker:rec.blocker||'',notes:rec.notes||''
  });
  const set=(k,v)=>setF(s=>({...s,[k]:v}));
  const save=()=>{if(!f.projectId||!f.name.trim()||!f.plannedEnd)return;onSave({...f,id:f.id||uid('mile'),progress:Math.max(0,Math.min(100,Number(f.progress)||0))});};
  return <Modal title={rec.id?'Edit milestone':'New milestone'} onClose={onClose}
    footer={<><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Save milestone</button></>}>
    <Field label="Project"><select value={f.projectId} onChange={e=>set('projectId',e.target.value)}>{data.projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
    <Field label="Milestone / deliverable"><input autoFocus value={f.name} onChange={e=>set('name',e.target.value)} placeholder="Flooring complete, kitchen installation, client handover…"/></Field>
    <div className="grid2"><Field label="Owner"><select value={f.ownerId} onChange={e=>set('ownerId',e.target.value)}><option value="">Unassigned</option>{data.supervisors.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
      <Field label="Status"><select value={f.status} onChange={e=>set('status',e.target.value)}>{MILESTONE_STATUSES.map(s=><option key={s} value={s}>{s.replace('-',' ')}</option>)}</select></Field></div>
    <div className="grid2"><Field label="Planned start"><input type="date" value={f.plannedStart} onChange={e=>set('plannedStart',e.target.value)}/></Field>
      <Field label="Planned finish"><input type="date" value={f.plannedEnd} onChange={e=>set('plannedEnd',e.target.value)}/></Field></div>
    <Field label="Progress %"><input type="number" min="0" max="100" value={f.progress} onChange={e=>set('progress',e.target.value)}/></Field>
    <Field label="Current blocker / delay reason"><input value={f.blocker} onChange={e=>set('blocker',e.target.value)} placeholder="Client approval, material unavailable, vendor delay…"/></Field>
    <Field label="Notes"><textarea value={f.notes} onChange={e=>set('notes',e.target.value)}/></Field>
  </Modal>;
}
