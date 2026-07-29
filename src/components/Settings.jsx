import React, { useState, useRef } from 'react';
import {
  fmt, curSym, today, EMPTY_DATA, VEN_CATS, normalizeCategories, normalizeData,
  hasProtectedHistory, mergeLedgerData, uid, saveSession
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

export function Settings({data,S,setSettings,flash,setData,smode,currentUser}){
  const [f,setF]=useState({...S});
  const [newCat,setNewCat]=useState('');
  const [editingCat,setEditingCat]=useState('');
  const [editCatName,setEditCatName]=useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingPinUser, setEditingPinUser] = useState(null);
  const [newPin, setNewPin] = useState('');

  // Profile editing state
  const [editingProfileUser, setEditingProfileUser] = useState(null);
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfileEmail, setEditProfileEmail] = useState('');

  // New user form state
  const [uName, setUName] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uRole, setURole] = useState('designer');
  const [uPin, setUPin] = useState('1234');

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

  const ROLE_LABELS = {
    super_admin: 'Studio Owner / Super Admin 👑',
    admin: 'Principal Architect / Admin',
    designer: 'Interior Designer',
    site_supervisor: 'Site Supervisor',
    finance: 'Finance / Accounts Lead',
  };

  const canManage = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  const handleStartEditProfile = (user) => {
    setEditingProfileUser(user);
    setEditProfileName(user.name);
    setEditProfileEmail(user.email);
  };

  const handleSaveProfile = (user) => {
    const name = editProfileName.trim();
    const email = editProfileEmail.trim();
    if (!name || !email) {
      flash('Name and email are required');
      return;
    }
    const avatar = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'SM';
    const updatedUser = { ...user, name, email, avatar };

    setData(d => ({
      ...d,
      users: (d.users || []).map(u => u.id === user.id ? updatedUser : u)
    }));

    if (currentUser?.id === user.id) {
      saveSession(updatedUser, true);
    }

    setEditingProfileUser(null);
    flash(`Updated profile for ${name}`);
  };

  const handleAddUserSubmit = (e) => {
    e.preventDefault();
    if (!canManage) {
      flash('Only Super Admins or Admins can add team members.');
      return;
    }
    if (!uName.trim() || !uEmail.trim() || !uPin.trim()) {
      flash('Please fill out all fields');
      return;
    }
    if ((data.users || []).some(u => u.email.toLowerCase() === uEmail.trim().toLowerCase())) {
      flash('User with this email already exists');
      return;
    }
    const avatar = uName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'SM';
    const newUser = {
      id: uid('usr'),
      name: uName.trim(),
      email: uEmail.trim(),
      role: uRole,
      roleLabel: ROLE_LABELS[uRole] || 'Team Member',
      pin: uPin.trim(),
      avatar,
      color: uRole === 'super_admin' ? '#f59e0b' : uRole === 'admin' ? '#6366f1' : uRole === 'finance' ? '#f59e0b' : uRole === 'site_supervisor' ? '#10b981' : '#ec4899',
    };

    setData(d => ({ ...d, users: [...(d.users || []), newUser] }));
    setUName('');
    setUEmail('');
    setUPin('1234');
    setShowAddUser(false);
    flash(`Team member ${newUser.name} added`);
  };

  const handleSavePin = (user) => {
    if (!canManage && currentUser?.id !== user.id) {
      flash('Permission denied.');
      return;
    }
    if (!newPin.trim()) {
      flash('PIN cannot be empty');
      return;
    }
    setData(d => ({
      ...d,
      users: (d.users || []).map(u => u.id === user.id ? { ...u, pin: newPin.trim() } : u)
    }));
    setEditingPinUser(null);
    setNewPin('');
    flash(`PIN updated for ${user.name}`);
  };

  const handleDeleteUser = (user) => {
    if (!canManage) {
      flash('Only Super Admins or Admins can delete team members.');
      return;
    }
    if (user.id === currentUser?.id) {
      flash('You cannot delete your own active account.');
      return;
    }
    const superAdminCount = users.filter(u => u.role === 'super_admin').length;
    if (user.role === 'super_admin' && superAdminCount <= 1) {
      flash('Cannot delete the sole Super Admin account.');
      return;
    }
    if (confirm(`Are you sure you want to delete "${user.name}" (${user.email})? This action cannot be undone.`)) {
      setData(d => ({
        ...d,
        users: (d.users || []).filter(u => u.id !== user.id)
      }));
      flash(`User ${user.name} removed from studio`);
    }
  };

  const handleUpdateRole = (user, role) => {
    if (!canManage) return;
    setData(d => ({
      ...d,
      users: (d.users || []).map(u => u.id === user.id ? { ...u, role, roleLabel: ROLE_LABELS[role] || 'Team Member' } : u)
    }));
    flash(`Updated ${user.name} role to ${ROLE_LABELS[role]}`);
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

  const users = data.users || [];

  return(<>
    <div className="topbar"><div><h1>Settings</h1><div className="desc">Studio details, team accounts, invoice defaults, and your data.</div></div></div>
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

      {/* Studio Team & User Accounts */}
      <div className="card" style={{marginTop:18}}>
        <div className="card-h">
          <h3>Studio Team &amp; User Accounts</h3>
          {canManage && <button className="btn primary sm" onClick={() => setShowAddUser(true)}>+ Add Team Member</button>}
        </div>
        <div className="pad">
          <div className="desc" style={{marginBottom:12}}>
            Members of your studio team can log in to update estimates, site requests, schedules, and invoices.
          </div>
          <div className="category-list">
            {users.map(u => (
              <div className="category-item" key={u.id}>
                <div style={{display:'flex',alignItems:'center',gap:12,flex:1}}>
                  <div className="avatar" style={{backgroundColor:u.color||'#6366f1'}}>
                    {u.avatar}
                  </div>
                  <div style={{flex:1}}>
                    {editingProfileUser?.id === u.id ? (
                      <div style={{display:'flex',gap:8,alignItems:'center',marginRight:12}}>
                        <input
                          className="ctl"
                          style={{padding:'4px 8px',fontSize:12,width:140}}
                          value={editProfileName}
                          onChange={e => setEditProfileName(e.target.value)}
                          placeholder="Full Name"
                          autoFocus
                        />
                        <input
                          className="ctl"
                          style={{padding:'4px 8px',fontSize:12,width:180}}
                          value={editProfileEmail}
                          onChange={e => setEditProfileEmail(e.target.value)}
                          placeholder="Email"
                        />
                        <button className="btn primary sm" onClick={() => handleSaveProfile(u)}>Save</button>
                        <button className="btn ghost sm" onClick={() => setEditingProfileUser(null)}>Cancel</button>
                      </div>
                    ) : (
                      <>
                        <div style={{fontWeight:600,fontSize:13,display:'flex',alignItems:'center',gap:6}}>
                          {u.name}
                          {currentUser?.id === u.id && <span className="pill green" style={{fontSize:10,padding:'2px 6px'}}>You</span>}
                          {u.role === 'super_admin' && <span className="pill amber" style={{fontSize:10,padding:'2px 6px'}}>SUPER ADMIN 👑</span>}
                        </div>
                        <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>
                          {u.email} · {canManage ? (
                            <select
                              value={u.role}
                              onChange={e => handleUpdateRole(u, e.target.value)}
                              style={{fontSize:11,padding:'1px 4px',marginLeft:4,border:'1px solid var(--line-2)',borderRadius:4}}
                              disabled={u.id === currentUser?.id && u.role === 'super_admin'}
                            >
                              <option value="super_admin">Studio Owner / Super Admin 👑</option>
                              <option value="admin">Principal Architect / Admin</option>
                              <option value="designer">Interior Designer</option>
                              <option value="site_supervisor">Site Supervisor</option>
                              <option value="finance">Finance / Accounts Lead</option>
                            </select>
                          ) : (
                            ROLE_LABELS[u.role] || u.roleLabel || u.role
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="category-actions" style={{display:'flex',gap:6,alignItems:'center'}}>
                  {editingPinUser?.id === u.id ? (
                    <div style={{display:'flex',gap:6,alignItems:'center'}}>
                      <input
                        className="ctl"
                        style={{width:70,padding:'4px 8px'}}
                        type="password"
                        maxLength={6}
                        value={newPin}
                        onChange={e => setNewPin(e.target.value)}
                        placeholder="PIN"
                        autoFocus
                      />
                      <button className="btn primary sm" onClick={() => handleSavePin(u)}>Save</button>
                      <button className="btn ghost sm" onClick={() => setEditingPinUser(null)}>Cancel</button>
                    </div>
                  ) : editingProfileUser?.id !== u.id && (
                    <>
                      {(canManage || currentUser?.id === u.id) && (
                        <button className="btn ghost sm" title="Edit Name & Email" onClick={() => handleStartEditProfile(u)}>
                          Edit
                        </button>
                      )}
                      <button className="btn ghost sm" onClick={() => { setEditingPinUser(u); setNewPin(u.pin || '1234'); }}>
                        Reset PIN
                      </button>
                      {canManage && u.id !== currentUser?.id && (
                        <button className="btn ghost sm danger" title="Delete User Account" onClick={() => handleDeleteUser(u)}>
                          Delete
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {showAddUser && (
            <form onSubmit={handleAddUserSubmit} style={{marginTop:16,padding:14,background:'var(--surface-2)',borderRadius:8,border:'1px solid var(--line-2)'}}>
              <h4 style={{margin:'0 0 12px 0',fontSize:14}}>Add New Studio Team Member</h4>
              <div className="grid2" style={{gap:12}}>
                <Field label="Full Name"><input required placeholder="e.g. Maya Lin" value={uName} onChange={e=>setUName(e.target.value)}/></Field>
                <Field label="Email Address"><input required type="email" placeholder="maya@studiovista.in" value={uEmail} onChange={e=>setUEmail(e.target.value)}/></Field>
              </div>
              <div className="grid2" style={{gap:12,marginTop:8}}>
                <Field label="Studio Role">
                  <select value={uRole} onChange={e=>setURole(e.target.value)}>
                    <option value="super_admin">Studio Owner / Super Admin 👑</option>
                    <option value="admin">Principal Architect / Admin</option>
                    <option value="designer">Interior Designer</option>
                    <option value="site_supervisor">Site Supervisor</option>
                    <option value="finance">Finance / Accounts Lead</option>
                  </select>
                </Field>
                <Field label="Security PIN (4 digits)"><input required type="password" maxLength={6} value={uPin} onChange={e=>setUPin(e.target.value)}/></Field>
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:12}}>
                <button type="button" className="btn ghost sm" onClick={() => setShowAddUser(false)}>Cancel</button>
                <button type="submit" className="btn primary sm">Add Member</button>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="card" style={{marginTop:18}}>
        <div className="card-h">
          <h3>Vendor categories</h3>
          {canManage && <button className="btn sm" onClick={restoreDefaultCategories}>Restore defaults</button>}
        </div>
        <div className="pad">
          <div className="settings-row category-add-row">
            <div><div className="t">Categories</div><div className="d">{categories.length} active</div></div>
            {canManage && (
              <form className="category-add" onSubmit={addCategory}>
                <input className="ctl" placeholder="New category" value={newCat} onChange={e=>setNewCat(e.target.value)}/>
                <button className="btn primary sm" disabled={!newCat.trim()}>Add</button>
              </form>
            )}
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
                  {canManage && (
                    <div className="category-actions">
                      <button className="btn ghost sm" onClick={()=>startEditCategory(cat)}>Edit</button>
                      <button className="btn ghost sm danger" disabled={usage(cat)>0||categories.length<=1} onClick={()=>deleteCategory(cat)}>Delete</button>
                    </div>
                  )}
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
            <button className="btn danger" disabled={protectedHistory || !canManage} onClick={clearAll}>Reset workspace</button></div>
        </div>
      </div>
      <div style={{textAlign:'center',color:'var(--muted)',fontSize:12,marginTop:24}}>Studio Ledger · {users.length} team members · {data.projects.length} projects · {data.invoices.length} invoices · {data.expenses.length} expenses</div>
    </div>
  </>);
}
