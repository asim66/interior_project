import React, { useState, useRef } from 'react';
import {
  fmt, curSym, today, EMPTY_DATA, VEN_CATS, normalizeCategories, normalizeData,
  hasProtectedHistory, mergeLedgerData
} from '../shared';
import { Field } from './ui';

function toCSV(rows){
  if(!rows.length)return'';
  const cols=Object.keys(rows[0]);
  const esc=v=>{v=v==null?'':String(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
  return cols.join(',')+'\n'+rows.map(r=>cols.map(c=>esc(r[c])).join(',')).join('\n');
}

function download(name,text,type='text/plain'){
  const b=new Blob([text],{type});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=name;a.click();URL.revokeObjectURL(u);
}

export function Settings({data,S,setSettings,flash,setData,smode}){
  const [f,setF]=useState({...S});
  const [newCat,setNewCat]=useState('');
  const [editingCat,setEditingCat]=useState('');
  const [editCatName,setEditCatName]=useState('');
  const fileRef=useRef();
  const set=(k,v)=>setF(s=>({...s,[k]:v}));
  const savedSettings=()=>{const {vendorCategories,...settings}=f;setSettings(settings);flash('Settings saved');};
  const categories=normalizeCategories(S.vendorCategories||VEN_CATS);
  const usage=cat=>data.vendors.filter(v=>v.category===cat).length;
  const categoryLabel=cat=>{const count=usage(cat);return count+' vendor'+(count===1?'':'s');};
  const saveCategories=(updater)=>setData(d=>{
    const current=normalizeCategories(d.settings?.vendorCategories||VEN_CATS);
    const next=updater(current);
    return{...d,settings:{...d.settings,vendorCategories:normalizeCategories(next)}};
  });
  const addCategory=e=>{
    e.preventDefault();
    const name=newCat.trim();
    if(!name)return;
    if(categories.some(c=>c.toLowerCase()===name.toLowerCase())){flash('Category already exists');return;}
    saveCategories(cats=>[...cats,name]);
    setNewCat('');
    flash('Vendor category added');
  };
  const startEditCategory=cat=>{setEditingCat(cat);setEditCatName(cat);};
  const renameCategory=cat=>{
    const name=editCatName.trim();
    if(!name){flash('Category name is required');return;}
    if(name.toLowerCase()!==cat.toLowerCase()&&categories.some(c=>c.toLowerCase()===name.toLowerCase())){flash('Category already exists');return;}
    setData(d=>{
      const current=normalizeCategories(d.settings?.vendorCategories||VEN_CATS);
      let found=false;
      const next=current.map(c=>{if(c!==cat)return c;found=true;return name;});
      const vendors=d.vendors.map(v=>v.category===cat?{...v,category:name}:v);
      return{...d,vendors,settings:{...d.settings,vendorCategories:normalizeCategories(found?next:[...next,name])}};
    });
    setEditingCat('');
    setEditCatName('');
    flash('Vendor category renamed');
  };
  const deleteCategory=cat=>{
    const count=usage(cat);
    if(count>0){flash('Category is used by '+count+' vendor'+(count===1?'':'s'));return;}
    if(categories.length<=1){flash('Keep at least one vendor category');return;}
    saveCategories(cats=>cats.filter(c=>c!==cat));
    flash('Vendor category removed');
  };
  const restoreDefaultCategories=()=>{
    const used=data.vendors.map(v=>v.category);
    saveCategories(()=>normalizeCategories([...VEN_CATS,...used]));
    setEditingCat('');
    setEditCatName('');
    flash('Default vendor categories restored');
  };

  const M=n=>fmt(n,S.currency);
  const exportCSV=(coll,label)=>{
    let rows=data[coll];
    if(coll==='invoices')rows=data.invoices.flatMap(inv=>(inv.items||[]).map((item,index)=>({...inv,items:undefined,line:index+1,itemDescription:item.desc,itemQty:item.qty,itemRate:item.rate})));
    if(coll==='materialRequests')rows=data.materialRequests.flatMap(req=>(req.items||[]).map((item,index)=>({...req,items:undefined,line:index+1,...item})));
    if(coll==='vendorBills')rows=data.vendorBills.flatMap(bill=>(bill.lines||[]).map((line,index)=>({...bill,lines:undefined,line:index+1,...line})));
    if(coll==='estimates')rows=data.estimates.flatMap(est=>(est.lines||[]).length?(est.lines||[]).map((line,index)=>({...est,lines:undefined,line:index+1,...line})):[{...est,lines:undefined}]);
    if(!rows.length){flash('Nothing to export in '+label);return;}
    download(label.toLowerCase().replace(/ /g,'_')+'.csv',toCSV(rows),'text/csv');flash(label+' exported');
  };
  const exportAll=()=>{download('studio_ledger_backup_'+today()+'.json',JSON.stringify(data,null,2),'application/json');flash('Backup downloaded');};
  const importJSON=e=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();
    r.onload=()=>{try{const d=JSON.parse(r.result);if(!d.projects)throw 0;setData(current=>mergeLedgerData(current,normalizeData(d)));flash('Backup merged without deleting current records');}catch(x){flash('That file could not be read');}};
    r.readAsText(file);e.target.value='';};
  const protectedHistory=hasProtectedHistory(data);
  const clearAll=()=>{
    if(protectedHistory){flash('Financial and operational history cannot be erased');return;}
    if(confirm('Reset this empty workspace?')){setData({...EMPTY_DATA,settings:S});flash('Empty workspace reset');}
  };

  return(<>
    <div className="topbar"><div><h1>Settings</h1><div className="desc">Studio details, invoice defaults, and your data.</div></div></div>
    <div className="content" style={{maxWidth:760}}>
      <div className="card"><div className="card-h"><h3>Studio &amp; invoicing</h3><button className="btn primary sm" onClick={savedSettings}>Save settings</button></div>
        <div className="pad">
          <Field label="Studio name" hint="Shown in the sidebar and on invoices"><input value={f.studioName} onChange={e=>set('studioName',e.target.value)}/></Field>
          <Field label="Studio address / contact" hint="Appears in the invoice header"><textarea value={f.address} onChange={e=>set('address',e.target.value)} placeholder={"123 Studio Lane\nBhubaneswar\n+91 …"}/></Field>
          <div className="grid3">
            <Field label="Currency"><select value={f.currency} onChange={e=>set('currency',e.target.value)}>{Object.keys(curSym).map(c=>(<option key={c} value={c}>{c} ({curSym[c]})</option>))}</select></Field>
            <Field label="Tax label"><input value={f.taxLabel} onChange={e=>set('taxLabel',e.target.value)}/></Field>
            <Field label="Default tax %"><input type="number" value={f.taxRate} onChange={e=>set('taxRate',Number(e.target.value)||0)}/></Field>
          </div>
          <Field label="Invoice number prefix" hint={"Next invoice will be "+f.invPrefix+String(f.invSeq).padStart(3,'0')}><input value={f.invPrefix} onChange={e=>set('invPrefix',e.target.value)}/></Field>
        </div>
      </div>

      <div className="card" style={{marginTop:18}}><div className="card-h"><h3>Vendor categories</h3><button className="btn sm" onClick={restoreDefaultCategories}>Restore defaults</button></div>
        <div className="pad">
          <div className="settings-row category-add-row"><div><div className="t">Categories</div><div className="d">{categories.length} active</div></div>
            <form className="category-add" onSubmit={addCategory}>
              <input className="ctl" placeholder="New category" value={newCat} onChange={e=>setNewCat(e.target.value)}/>
              <button className="btn primary sm" disabled={!newCat.trim()}>Add</button>
            </form>
          </div>
          <div className="category-list">
            {categories.map(cat=>(
              <div className="category-item" key={cat}>
                {editingCat===cat?<>
                  <input className="ctl category-edit" autoFocus value={editCatName} onChange={e=>setEditCatName(e.target.value)}
                    onKeyDown={e=>{if(e.key==='Enter')renameCategory(cat);if(e.key==='Escape')setEditingCat('');}}/>
                  <div className="category-actions">
                    <button className="btn primary sm" onClick={()=>renameCategory(cat)}>Save</button>
                    <button className="btn ghost sm" onClick={()=>setEditingCat('')}>Cancel</button>
                  </div>
                </>:<>
                  <div className="category-name"><span>{cat}</span><span className="pill gray">{categoryLabel(cat)}</span></div>
                  <div className="category-actions">
                    <button className="btn ghost sm" onClick={()=>startEditCategory(cat)}>Edit</button>
                    <button className="btn ghost sm danger" disabled={usage(cat)>0||categories.length<=1} onClick={()=>deleteCategory(cat)}>Delete</button>
                  </div>
                </>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{marginTop:18}}><div className="card-h"><h3>Export &amp; backup</h3></div>
        <div className="pad">
          <div className="settings-row"><div><div className="t">Full backup (JSON)</div><div className="d">Everything in one file — use this to move data or keep it safe.</div></div>
            <div style={{display:'flex',gap:8}}><button className="btn" onClick={exportAll}>Download backup</button>
              <button className="btn" onClick={()=>fileRef.current.click()}>Merge backup…</button>
              <input ref={fileRef} type="file" accept="application/json" style={{display:'none'}} onChange={importJSON}/></div></div>
          <div className="settings-row"><div><div className="t">Export spreadsheets (CSV)</div><div className="d">Open any of these directly in Excel or Google Sheets.</div></div></div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {[['projects','Projects'],['estimates','Estimates'],['materialRequests','Material Requests'],['vendorBills','Vendor Bills'],
              ['pettyExpenses','Petty Expenses'],['milestones','Milestones'],['invoices','Invoices'],['expenses','Expenses'],
              ['vendors','Vendors'],['paymentsReceived','Payments Received'],['paymentsMade','Payments Made'],['collectionActivities','Collection Activities']]
              .map(([c,l])=>(<button key={c} className="btn sm" onClick={()=>exportCSV(c,l)}>⬇ {l}</button>))}
          </div>
        </div>
      </div>

      <div className="card" style={{marginTop:18}}><div className="card-h"><h3>Data</h3></div>
        <div className="pad">
          <div className="settings-row"><div><div className="t">Storage</div><div className="d">{smode==='cloud'?'Your studio ledger is synchronized to the protected cloud workspace, with a local recovery cache.':smode==='claude'?'Your data saves automatically inside Claude and persists between sessions.':smode==='local'?'Your data auto-saves in this browser on this device. Clearing browser data erases it — keep occasional backups.':smode==='error'?'Cloud synchronization encountered a version conflict or connection issue. Export a backup before continuing in another session.':'This environment has no storage — download a backup to keep your work.'}</div></div>
            <span className={"pill "+(['memory','error'].includes(smode)?'amber':'green')}>{smode==='cloud'?'Cloud sync':smode==='claude'?'Auto-save · Claude':smode==='local'?'Auto-save · this device':smode==='error'?'Sync needs attention':'Not saving'}</span></div>
          <div className="settings-row"><div><div className="t" style={{color:'var(--clay)'}}>Reset empty workspace</div><div className="d">{protectedHistory?'Locked because financial or operational history exists. Imported backups merge into the ledger and never erase current records.':'Available only before any financial or operational history is recorded.'}</div></div>
            <button className="btn danger" disabled={protectedHistory} onClick={clearAll}>Reset workspace</button></div>
        </div>
      </div>
      <div style={{textAlign:'center',color:'var(--muted)',fontSize:12,marginTop:24}}>Studio Ledger · {data.projects.length} projects · {data.invoices.length} invoices · {data.expenses.length} expenses · {data.vendors.length} vendors</div>
    </div>
  </>);
}
