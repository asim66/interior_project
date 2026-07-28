import React, { useEffect } from 'react';

/* ui.jsx — small reusable pieces: Modal, Field, Empty, Confirm, StatusPill */
export function Modal({title,onClose,children,footer,wide}){
  useEffect(()=>{const h=e=>{if(e.key==='Escape')onClose();};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h);},[]);
  return(<div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className={"modal"+(wide?" wide":"")}>
      <div className="modal-h"><h3>{title}</h3><button className="x" onClick={onClose}>×</button></div>
      <div className="modal-b">{children}</div>
      {footer&&<div className="modal-f">{footer}</div>}
    </div></div>);
}

export function Field({label,hint,children}){return(<div className="f"><label>{label}</label>{children}{hint&&<span className="hint">{hint}</span>}</div>);}

export function Empty({icon,title,text,action}){return(<div className="empty"><div className="em-ic">{icon}</div><h3>{title}</h3><p>{text}</p>{action}</div>);}

export function Confirm({text,onYes,onClose,confirmLabel='Delete'}){return(<Modal title="Please confirm" onClose={onClose}
  footer={<><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn danger" onClick={()=>{onYes();onClose();}}>{confirmLabel}</button></>}>
  <p style={{margin:0,color:'var(--ink-2)'}}>{text}</p></Modal>);}

export function StatusPill({status}){
  const map={active:['brass','Active'],completed:['green','Completed'],'on-hold':['amber','On hold'],lead:['gray','Lead']};
  const [c,t]=map[status]||['gray',status||'—'];
  return<span className={"pill "+c}>{t}</span>;
}
