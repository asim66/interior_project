import React, { useState } from 'react';
import { uid } from '../shared';

export function LoginModal({ users = [], onLogin, onRegisterUser, studioName = 'Studio Ledger' }) {
  const [mode, setMode] = useState('switcher'); // 'switcher' | 'email' | 'register'
  const [selectedUser, setSelectedUser] = useState(null);
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRole, setRegRole] = useState('designer');
  const [regPin, setRegPin] = useState('');

  const ROLE_LABELS = {
    admin: 'Principal Architect / Admin',
    designer: 'Interior Designer',
    site_supervisor: 'Site Supervisor',
    finance: 'Finance / Accounts Lead',
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setPin('');
    setError('');
  };

  const handleQuickLogin = (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (selectedUser.pin && pin.trim() !== selectedUser.pin) {
      setError('Invalid PIN. Default PIN is 1234.');
      return;
    }
    setError('');
    onLogin(selectedUser, remember);
  };

  const handleEmailLogin = (e) => {
    e.preventDefault();
    const user = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user) {
      setError('No account found with this email address.');
      return;
    }
    if (user.pin && pin.trim() !== user.pin) {
      setError('Invalid PIN. Default PIN is 1234.');
      return;
    }
    setError('');
    onLogin(user, remember);
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPin.trim()) {
      setError('Please fill out all fields.');
      return;
    }
    if (users.some(u => u.email.toLowerCase() === regEmail.trim().toLowerCase())) {
      setError('An account with this email already exists.');
      return;
    }
    const avatar = regName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'SM';
    const newUser = {
      id: uid('usr'),
      name: regName.trim(),
      email: regEmail.trim(),
      role: regRole,
      roleLabel: ROLE_LABELS[regRole] || 'Team Member',
      pin: regPin.trim(),
      avatar,
      color: regRole === 'admin' ? '#6366f1' : regRole === 'finance' ? '#f59e0b' : regRole === 'site_supervisor' ? '#10b981' : '#ec4899',
    };

    onRegisterUser(newUser);
    onLogin(newUser, remember);
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-brand">
            <span className="dot"></span>
            <h2>Studio Ledger</h2>
          </div>
          <p className="sub">{studioName} — Team Sign In</p>
        </div>

        <div className="auth-tabs">
          <button className={mode === 'switcher' ? 'active' : ''} onClick={() => { setMode('switcher'); setError(''); }}>
            Team Switcher
          </button>
          <button className={mode === 'email' ? 'active' : ''} onClick={() => { setMode('email'); setError(''); }}>
            Sign In with Email
          </button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError(''); }}>
            Join Team
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {mode === 'switcher' && (
          <div className="auth-body">
            {!selectedUser ? (
              <>
                <p className="auth-instruct">Select your profile to continue working:</p>
                <div className="user-grid">
                  {users.map(u => (
                    <div key={u.id} className="user-card" onClick={() => handleSelectUser(u)}>
                      <div className="avatar" style={{ backgroundColor: u.color || '#6366f1' }}>
                        {u.avatar}
                      </div>
                      <div className="user-info">
                        <div className="uname">{u.name}</div>
                        <div className="urole">{ROLE_LABELS[u.role] || u.roleLabel || u.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <form onSubmit={handleQuickLogin} className="auth-form">
                <div className="user-selected-chip">
                  <div className="avatar" style={{ backgroundColor: selectedUser.color }}>
                    {selectedUser.avatar}
                  </div>
                  <div>
                    <strong>{selectedUser.name}</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                      {ROLE_LABELS[selectedUser.role] || selectedUser.roleLabel}
                    </div>
                  </div>
                  <button type="button" className="btn-link" style={{ marginLeft: 'auto' }} onClick={() => setSelectedUser(null)}>
                    Change
                  </button>
                </div>

                <div className="field-group">
                  <label>Enter 4-Digit Security PIN:</label>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="e.g. 1234"
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    autoFocus
                  />
                  <small style={{ color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                    Default testing PIN for all accounts: <code>1234</code>
                  </small>
                </div>

                <label className="checkbox-label" style={{ margin: '12px 0' }}>
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                  <span>Keep me signed in on this device</span>
                </label>

                <div className="auth-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setSelectedUser(null)}>
                    Back
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Sign In →
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {mode === 'email' && (
          <form onSubmit={handleEmailLogin} className="auth-form auth-body">
            <div className="field-group">
              <label>Studio Email Address:</label>
              <input
                type="email"
                placeholder="admin@studiovista.in"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="field-group">
              <label>PIN / Password:</label>
              <input
                type="password"
                placeholder="••••"
                value={pin}
                onChange={e => setPin(e.target.value)}
                required
              />
            </div>

            <label className="checkbox-label" style={{ margin: '12px 0' }}>
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
              <span>Keep me signed in on this device</span>
            </label>

            <div className="auth-actions">
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Sign In to Studio Ledger
              </button>
            </div>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} className="auth-form auth-body">
            <div className="field-group">
              <label>Full Name:</label>
              <input
                type="text"
                placeholder="e.g. Aditi Rao"
                value={regName}
                onChange={e => setRegName(e.target.value)}
                required
              />
            </div>
            <div className="field-group">
              <label>Email Address:</label>
              <input
                type="email"
                placeholder="aditi@studiovista.in"
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
                required
              />
            </div>
            <div className="field-group">
              <label>Role in Studio:</label>
              <select value={regRole} onChange={e => setRegRole(e.target.value)}>
                <option value="admin">Principal Architect / Admin</option>
                <option value="designer">Interior Designer</option>
                <option value="site_supervisor">Site Supervisor</option>
                <option value="finance">Finance Lead / Accountant</option>
              </select>
            </div>
            <div className="field-group">
              <label>Create 4-Digit Security PIN:</label>
              <input
                type="password"
                maxLength={6}
                placeholder="1234"
                value={regPin}
                onChange={e => setRegPin(e.target.value)}
                required
              />
            </div>

            <div className="auth-actions" style={{ marginTop: '16px' }}>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Create Account & Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
