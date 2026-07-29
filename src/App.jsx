'use client';

import React, { useState, useEffect, useRef } from 'react';
import { loadData, saveData, getStorageMode, fmt, EMPTY_DATA, NAV, normalizeData, loadSession, saveSession, clearSession, startCloudSync } from './shared';
import { Dashboard } from './components/Dashboard';
import { Projects, ProjectDetail } from './components/Projects';
import { Invoices } from './components/Invoices';
import { Expenses } from './components/Expenses';
import { Vendors } from './components/Vendors';
import { Payments } from './components/Payments';
import { Settings } from './components/Settings';
import { Procurement } from './components/Procurement';
import { Estimates } from './components/Estimates';
import { Schedule } from './components/Schedule';
import { Collections } from './components/Collections';
import { LoginModal } from './components/LoginModal';

export default function App(){
  const [data, setData] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => loadSession());
  const [smode, setSmode] = useState('memory');
  const [view, setView] = useState('dashboard');
  const [toast, setToast] = useState('');
  const [projFilter, setProjFilter] = useState('all');
  const [openProject, setOpenProject] = useState(null);
  const firstLoad = useRef(true);
  const isIncomingSync = useRef(false);

  useEffect(() => {
    (async () => {
      const d = await loadData();
      setSmode(getStorageMode());
      const normalized = normalizeData(d);
      setData(normalized);
      const sessionUser = loadSession();
      if (sessionUser && normalized.users?.some(u => u.id === sessionUser.id)) {
        setCurrentUser(sessionUser);
      }
    })();
  }, []);

  useEffect(() => {
    if (smode === 'cloud') {
      const stopSync = startCloudSync((freshData, author) => {
        isIncomingSync.current = true;
        setData(normalizeData(freshData));
        flash(`Live update synced from ${author || 'cloud'}`);
      });
      return stopSync;
    }
  }, [smode]);

  useEffect(() => {
    if (!data) return;
    if (firstLoad.current) { firstLoad.current = false; return; }
    if (isIncomingSync.current) {
      isIncomingSync.current = false;
      return;
    }
    saveData(data, currentUser?.name).then(ok => setSmode(ok ? (getStorageMode() === 'cloud' ? 'cloud' : getStorageMode()) : 'error'));
  }, [data, currentUser]);

  const flash = m => { setToast(m); setTimeout(() => setToast(''), 2400); };
  const S = data ? data.settings : EMPTY_DATA.settings;
  const cur = S.currency;
  const M = n => fmt(n, cur);

  const handleLogin = (user, remember = true) => {
    setCurrentUser(user);
    saveSession(user, remember);
    flash(`Signed in as ${user.name}`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    clearSession();
    flash('Signed out of Studio Ledger');
  };

  const handleRegisterUser = (newUser) => {
    setData(d => {
      const users = [...(d.users || []), newUser];
      return { ...d, users };
    });
  };

  // mutation helpers
  const upsert = (coll, rec) => setData(d => {
    const list = d[coll] || [];
    const i = list.findIndex(x => x.id === rec.id);
    const author = currentUser ? currentUser.name : 'Studio Member';
    const stampedRec = { ...rec, updatedBy: author };
    if (i < 0) stampedRec.createdBy = stampedRec.createdBy || author;
    const nl = i >= 0 ? list.map(x => x.id === rec.id ? stampedRec : x) : [...list, stampedRec];
    return { ...d, [coll]: nl };
  });

  const remove = (coll, id) => {
    if (currentUser?.role === 'site_supervisor') {
      flash('Permission denied: Site Supervisors cannot delete records.');
      return;
    }
    setData(d => ({ ...d, [coll]: d[coll].filter(x => x.id !== id) }));
  };
  const setSettings = s => setData(d => normalizeData({ ...d, settings: { ...d.settings, ...s } }));

  if (!data) return (<div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>Loading your ledger…</div>);

  if (!currentUser) {
    return (
      <LoginModal
        users={data.users || []}
        onLogin={handleLogin}
        onRegisterUser={handleRegisterUser}
        studioName={S.studioName}
      />
    );
  }

  const shared = {
    data, setData, cur, M, flash, upsert, remove, S, setSettings,
    projFilter, setProjFilter, setView, openProject, setOpenProject, smode,
    currentUser, handleLogout, handleRegisterUser
  };

  return (
    <div className="app">
      <aside className="sidebar no-print">
        <div className="brand">
          <div className="mark"><span className="dot"></span><span>Studio Ledger</span></div>
          <div className="sub">{S.studioName}</div>
        </div>
        <nav className="nav">
          {NAV.map(([k, ic, l]) => (
            <button key={k} className={view === k ? 'active' : ''} onClick={() => { setView(k); setOpenProject(null); }}>
              <span className="ico">{ic}</span><span className="lbl">{l}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="save-chip">
            <span className={"led" + (smode === 'memory' ? ' warn' : '')}></span>
            {smode === 'cloud' ? 'Synced via Cloud SQLite' : smode === 'claude' ? 'Saved automatically' : smode === 'local' ? 'Saved on this device' : smode === 'error' ? 'Sync paused — export a backup' : 'Not saved — export to keep data'}
          </div>
          <div className="user-chip-side">
            <div className="avatar" style={{ backgroundColor: currentUser.color || '#6366f1' }}>
              {currentUser.avatar}
            </div>
            <div className="u-meta">
              <span className="u-name">{currentUser.name}</span>
              <span className="u-role">{currentUser.roleLabel || currentUser.role}</span>
            </div>
            <button className="btn-switch" title="Switch User / Sign Out" onClick={handleLogout}>
              ✕
            </button>
          </div>
        </div>
      </aside>
      <main className="main">
        {view === 'dashboard' && <Dashboard {...shared} />}
        {view === 'projects' && (openProject ? <ProjectDetail {...shared} project={openProject} /> : <Projects {...shared} />)}
        {view === 'estimates' && <Estimates {...shared} />}
        {view === 'procurement' && <Procurement {...shared} />}
        {view === 'schedule' && <Schedule {...shared} />}
        {view === 'invoices' && <Invoices {...shared} />}
        {view === 'collections' && <Collections {...shared} />}
        {view === 'expenses' && <Expenses {...shared} />}
        {view === 'vendors' && <Vendors {...shared} />}
        {view === 'payments' && <Payments {...shared} />}
        {view === 'settings' && <Settings {...shared} />}
      </main>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
