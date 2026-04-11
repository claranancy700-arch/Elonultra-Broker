import React, { useEffect, useState, useRef } from 'react';
import {
  LayoutDashboard, Users, Wallet, Receipt, TrendingUp,
  Megaphone, MessageSquare, Settings as SettingsIcon, Shield,
  Lock, Sun, Moon, Cpu, Play, Pause, DollarSign, Briefcase,
  Save, AlertTriangle, Bell, RefreshCw, Trash2, MessageCircle,
  Plus, ArrowUpRight, Check, X
} from 'lucide-react';
import './AdminPage.css';

const API_BASE =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? `http://${window.location.hostname}:5001/api`
    : `${typeof window !== 'undefined' ? window.location.origin : ''}/api`;

async function adminFetch(path, adminKey, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'x-admin-key': adminKey, 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

const PAGE_TITLES = {
  dashboard:    'Dashboard',
  users:        'Users',
  balance:      'Balance & Portfolio',
  transactions: 'Transactions',
  market:       'Market',
  prompts:      'Prompts',
  testimonies:  'Testimonies',
  settings:     'Settings',
  security:     'Security',
};

export const AdminPage = () => {
  /* ── Standalone auth gate ──────────────────────────────────── */
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem('admin_key') || '');
  const [keyInput, setKeyInput] = useState('');
  const [keyVerified, setKeyVerified] = useState(() => !!sessionStorage.getItem('admin_key'));
  const [keyError, setKeyError] = useState('');
  const [keyLoading, setKeyLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const verifyKey = async (e) => {
    e.preventDefault();
    if (!keyInput.trim()) return;
    setKeyLoading(true);
    setKeyError('');
    try {
      const res = await fetch(`${API_BASE}/admin/verify-key`, {
        headers: { 'x-admin-key': keyInput.trim() },
      });
      if (!res.ok) throw new Error('Invalid admin key');
      sessionStorage.setItem('admin_key', keyInput.trim());
      setAdminKey(keyInput.trim());
      setKeyVerified(true);
    } catch {
      setKeyError('Invalid key. Access denied.');
    } finally {
      setKeyLoading(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem('admin_key');
    setAdminKey('');
    setKeyVerified(false);
    setKeyInput('');
  };

  /* ── Key-auth login screen ─────────────────────────────────── */
  if (!keyVerified) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0d0f14', fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{
          background: '#161920', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px',
          padding: '48px 40px', width: '100%', maxWidth: '400px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '14px', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
              fontSize: '22px', fontWeight: 800, color: '#fff',
            }}>E</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#f1f5f9' }}>Admin Console</div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Enter your admin key to continue</div>
          </div>
          <form onSubmit={verifyKey}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  autoFocus
                  placeholder="Admin key…"
                  value={keyInput}
                  onChange={e => { setKeyInput(e.target.value); setKeyError(''); }}
                  style={{
                    width: '100%', padding: '12px 44px 12px 14px', borderRadius: '10px', fontSize: '15px',
                    background: '#0d0f14', border: `1px solid ${keyError ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
                    color: '#f1f5f9', outline: 'none', boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(s => !s)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                    color: '#64748b', fontSize: '13px', lineHeight: 1,
                  }}
                  title={showKey ? 'Hide' : 'Show'}
                >
                  {showKey ? '🙈' : '👁️'}
                </button>
              </div>
              {keyError && <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '8px' }}>{keyError}</div>}
            </div>
            <button
              type="submit"
              disabled={keyLoading || !keyInput.trim()}
              style={{
                width: '100%', padding: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff',
                fontSize: '15px', fontWeight: 600, opacity: keyLoading || !keyInput.trim() ? 0.6 : 1,
              }}
            >
              {keyLoading ? 'Verifying…' : 'Access Admin'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ── UI state ──────────────────────────────────────────────── */
  const [activePage, setActivePage] = useState(() => localStorage.getItem('admin_last_page') || 'dashboard');
  const [theme, setTheme] = useState('dark');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [keyPopupOpen, setKeyPopupOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [txTab, setTxTab] = useState('deposits');

  /* ── Data state ────────────────────────────────────────────── */
  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState(null); // { type: 'success'|'error', text }

  /* ── Balance form ──────────────────────────────────────────── */
  const [creditAmount, setCreditAmount] = useState('');
  const [creditCurrency, setCreditCurrency] = useState('USD');
  const [creditTaxId, setCreditTaxId] = useState('');

  /* ── Address form ──────────────────────────────────────────── */
  const [depAddr, setDepAddr] = useState({ BTC: '', ETH: '', USDT: '', USDC: '' });

  /* ── Prompts ───────────────────────────────────────────────── */
  const [promptMsg, setPromptMsg] = useState('');
  const [promptTargets, setPromptTargets] = useState('');
  const [activePrompts, setActivePrompts] = useState([
    { id: 1, text: 'Your account is under review. Please contact support.', date: '2026-04-05', target: 'All Users', active: true },
    { id: 2, text: 'Withdrawal processing — may take up to 48 hours.', date: '2026-04-06', target: 'User #14', active: true },
  ]);

  /* ── Testimony form ────────────────────────────────────────── */
  const [tForm, setTForm] = useState({ name: '', title: '', image: '', rating: '5', content: '', featured: false });
  const [testimonies, setTestimonies] = useState([
    { id: 1, name: 'John Smith',    title: 'Independent Investor', stars: 5, featured: true,  text: '"The trading service has been honest, transparent, and consistently efficient."' },
    { id: 2, name: 'Sarah Johnson', title: 'CEO, Tech Startup',    stars: 5, featured: false, text: '"Best crypto trading platform I have used. Customer support is exceptional."' },
    { id: 3, name: 'Michael Chen',  title: 'Quant Trader',         stars: 5, featured: false, text: '"Real-time data and low fees make this my go-to platform."' },
  ]);

  /* ── Add asset form ────────────────────────────────────────── */
  const [assetSymbol, setAssetSymbol] = useState('');
  const [assetAmount, setAssetAmount] = useState('');

  /* ── Loaded data ─────────────────────────────────────────────── */
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [allTx, setAllTx] = useState([]);
  const [growthTrades, setGrowthTrades] = useState([]);
  const [growthStats, setGrowthStats] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [simStatus, setSimStatus] = useState(null);
  const [otpList, setOtpList] = useState([]);

  /* ── Portfolio editable inputs ──────────────────────────── */
  const COINS = ['BTC', 'ETH', 'USDT', 'USDC', 'XRP', 'ADA'];
  const [portfolioInputs, setPortfolioInputs] = useState({ BTC: '', ETH: '', USDT: '', USDC: '', XRP: '', ADA: '' });
  const [editTotalInput, setEditTotalInput] = useState('');

  const keyWrapRef = useRef(null);

  /* ── Persist page ──────────────────────────────────────────── */
  useEffect(() => {
    localStorage.setItem('admin_last_page', activePage);
  }, [activePage]);

  /* ── Close key popup on outside click ─────────────────────── */
  useEffect(() => {
    if (!keyPopupOpen) return;
    const handler = (e) => {
      if (!e.target.closest('.topbar-key-wrap')) setKeyPopupOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [keyPopupOpen]);

  /* ── Sync portfolio inputs from API data ─────────────────── */
  useEffect(() => {
    if (!portfolio?.assets) return;
    setPortfolioInputs(prev => {
      const next = { ...prev };
      COINS.forEach(c => {
        next[c] = portfolio.assets[c] != null ? String(portfolio.assets[c]) : '';
      });
      return next;
    });
  }, [portfolio]);

  /* ── Helpers ───────────────────────────────────────────────── */
  const flash = (type, text) => {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg(null), 3500);
  };

  const navTo = (page) => {
    setActivePage(page);
    if (window.innerWidth <= 900) setSidebarOpen(false);
  };

  const loadUsers = async () => {
    if (!adminKey.trim()) { alert('Enter admin key first.'); return; }
    setUsersLoading(true);
    try {
      const data = await adminFetch('/admin/users', adminKey.trim());
      const list = Array.isArray(data) ? data : (data.users || []);
      setUsers(list);
      setActiveModal('users');
    } catch (err) {
      alert('Failed to load users: ' + err.message);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleCredit = async (e) => {
    e.preventDefault();
    if (!activeUser) { flash('error', 'Select a user first.'); return; }
    if (!adminKey)   { flash('error', 'Enter admin key.');       return; }
    try {
      await adminFetch('/admin/credit', adminKey, {
        method: 'POST',
        body: JSON.stringify({ userId: activeUser.id, amount: parseFloat(creditAmount), currency: creditCurrency, reference: creditTaxId || 'admin-credit' }),
      });
      flash('success', 'Balance credited successfully!');
      setCreditAmount('');
    } catch (err) {
      flash('error', 'Failed: ' + err.message);
    }
  };

  const handleSaveAddresses = async () => {
    if (!adminKey) { flash('error', 'Enter admin key.'); return; }
    try {
      await adminFetch('/admin/config/deposit-addresses', adminKey, {
        method: 'POST',
        body: JSON.stringify(depAddr),
      });
      flash('success', 'Addresses saved!');
    } catch (err) {
      flash('error', 'Failed: ' + err.message);
    }
  };

  const handleSendPrompt = async () => {
    if (!promptMsg.trim()) { flash('error', 'Enter a message.'); return; }
    if (!adminKey)         { flash('error', 'Enter admin key.'); return; }
    try {
      const targets = promptTargets.trim() ? promptTargets.split(',').map(t => parseInt(t.trim())).filter(Boolean) : null;
      await adminFetch('/admin/prompts', adminKey, {
        method: 'POST',
        body: JSON.stringify({ message: promptMsg, userIds: targets || undefined }),
      });
      flash('success', 'Prompt sent!');
      setActivePrompts(p => [{ id: Date.now(), text: promptMsg, date: new Date().toISOString().slice(0,10), target: targets ? `Users: ${targets.join(',')}` : 'All Users', active: true }, ...p]);
      setPromptMsg('');
      setPromptTargets('');
    } catch (err) {
      flash('error', 'Failed: ' + err.message);
    }
  };

  /* ── Additional handlers ─────────────────────────────────── */
  const handleSetBalance = async () => {
    if (!activeUser) { flash('error', 'Select a user first.'); return; }
    if (!adminKey)   { flash('error', 'Enter admin key.');       return; }
    const amt = parseFloat(creditAmount);
    if (isNaN(amt))  { flash('error', 'Enter a valid amount.'); return; }
    try {
      await adminFetch(`/admin/users/${activeUser.id}/set-balance`, adminKey, {
        method: 'POST', body: JSON.stringify({ amount: amt }),
      });
      flash('success', `Balance set to $${amt.toFixed(2)}`);
    } catch (err) { flash('error', 'Failed: ' + err.message); }
  };

  const loadDeposits = async () => {
    if (!adminKey) return;
    try {
      const data = await adminFetch('/admin/deposits', adminKey);
      setDeposits(data.deposits || []);
    } catch (err) { flash('error', 'Failed to load deposits: ' + err.message); }
  };

  const loadWithdrawals = async () => {
    if (!adminKey) return;
    try {
      const data = await adminFetch('/admin/withdrawals', adminKey);
      setWithdrawals(data.withdrawals || []);
    } catch (err) { flash('error', 'Failed to load withdrawals: ' + err.message); }
  };

  const loadAllTx = async () => {
    if (!adminKey) return;
    try {
      const data = await adminFetch('/admin/transactions', adminKey);
      setAllTx(Array.isArray(data) ? data : (data.transactions || []));
    } catch (err) { flash('error', 'Failed to load transactions: ' + err.message); }
  };

  const loadGrowthData = async (userId) => {
    if (!userId || !adminKey) return;
    try {
      const [tradesData, statsData] = await Promise.all([
        adminFetch(`/admin/users/${userId}/growth-trades?limit=50`, adminKey),
        adminFetch(`/admin/users/${userId}/growth-stats`, adminKey),
      ]);
      setGrowthTrades(tradesData.trades || []);
      setGrowthStats(statsData.stats || null);
    } catch (err) { flash('error', 'Failed to load growth data: ' + err.message); }
  };

  const loadPortfolio = async (userId) => {
    if (!userId || !adminKey) return;
    try {
      const data = await adminFetch(`/admin/users/${userId}/portfolio`, adminKey);
      setPortfolio(data);
    } catch (err) { /* CoinGecko may be unavailable */ }
  };

  const loadSimStatus = async (userId) => {
    if (!userId || !adminKey) return;
    try {
      const data = await adminFetch(`/admin/users/${userId}/simulator`, adminKey);
      setSimStatus(data.simulator || data);
    } catch (err) { /* silent */ }
  };

  const handleSimStart = async () => {
    if (!activeUser) { flash('error', 'Select a user first.'); return; }
    try {
      await adminFetch(`/admin/users/${activeUser.id}/simulator/start`, adminKey, { method: 'POST', body: '{}' });
      flash('success', 'Simulator started!');
      loadSimStatus(activeUser.id);
    } catch (err) { flash('error', 'Failed: ' + err.message); }
  };

  const handleSimPause = async () => {
    if (!activeUser) { flash('error', 'Select a user first.'); return; }
    try {
      await adminFetch(`/admin/users/${activeUser.id}/simulator/pause`, adminKey, { method: 'POST', body: '{}' });
      flash('success', 'Simulator paused!');
      loadSimStatus(activeUser.id);
    } catch (err) { flash('error', 'Failed: ' + err.message); }
  };

  const handleTriggerGrowth = async () => {
    if (!activeUser) { flash('error', 'Select a user first.'); return; }
    try {
      await adminFetch(`/admin/users/${activeUser.id}/simulator/trigger-growth`, adminKey, { method: 'POST', body: '{}' });
      flash('success', 'Growth triggered for ' + (activeUser.name || activeUser.email));
    } catch (err) { flash('error', 'Failed: ' + err.message); }
  };

  const handleTriggerAllGrowth = async () => {
    if (!adminKey) { flash('error', 'Enter admin key.'); return; }
    if (!window.confirm('Trigger growth for ALL users?')) return;
    try {
      await adminFetch('/admin/trades/clear-all', adminKey, { method: 'POST', body: '{}' });
      flash('success', 'Global growth triggered!');
    } catch (err) { flash('error', 'Failed: ' + err.message); }
  };

  const handleClearAllTrades = async () => {
    if (!adminKey) { flash('error', 'Enter admin key.'); return; }
    if (!window.confirm('Clear ALL trade history? This cannot be undone.')) return;
    try {
      await adminFetch('/admin/trades/clear-all', adminKey, { method: 'POST', body: '{}' });
      flash('success', 'All trades cleared!');
      setGrowthTrades([]);
    } catch (err) { flash('error', 'Failed: ' + err.message); }
  };

  const loadOtp = async () => {
    if (!adminKey) { flash('error', 'Enter admin key.'); return; }
    try {
      const data = await adminFetch('/users/pending-verifications', adminKey);
      setOtpList(Array.isArray(data) ? data : []);
    } catch (err) { flash('error', 'Failed to load OTPs: ' + err.message); }
  };

  const loadPrompts = async () => {
    if (!adminKey) return;
    try {
      const data = await adminFetch('/admin/prompts', adminKey);
      const list = data.prompts || [];
      setActivePrompts(list.map(p => ({
        id: p.id,
        text: p.message,
        date: p.created_at ? new Date(p.created_at).toISOString().slice(0, 10) : '—',
        target: p.user_id ? `User #${p.user_id}` : 'All Users',
        active: p.is_active,
      })));
    } catch (err) { /* silent */ }
  };

  const handleSavePortfolio = async (e) => {
    e.preventDefault();
    if (!activeUser) { flash('error', 'Select a user first.'); return; }
    if (!adminKey)   { flash('error', 'Enter admin key.'); return; }
    const assets = {};
    COINS.forEach(c => {
      const v = parseFloat(portfolioInputs[c]);
      if (!isNaN(v) && v > 0) assets[c] = v;
    });
    try {
      await adminFetch(`/admin/users/${activeUser.id}/set-portfolio`, adminKey, {
        method: 'POST', body: JSON.stringify({ assets }),
      });
      flash('success', 'Portfolio saved!');
      loadPortfolio(activeUser.id);
    } catch (err) { flash('error', 'Failed: ' + err.message); }
  };

  const handleEditTotalValue = async () => {
    if (!activeUser) { flash('error', 'Select a user first.'); return; }
    const amt = parseFloat(editTotalInput);
    if (isNaN(amt)) { flash('error', 'Enter a valid amount.'); return; }
    try {
      await adminFetch(`/admin/users/${activeUser.id}/set-balance`, adminKey, {
        method: 'POST', body: JSON.stringify({ amount: amt }),
      });
      flash('success', `Total value set to $${amt.toFixed(2)}`);
      setActiveModal(null);
      setEditTotalInput('');
    } catch (err) { flash('error', 'Failed: ' + err.message); }
  };

  const handleDisablePrompt = async (id) => {
    try {
      await adminFetch(`/admin/prompts/${id}/disable`, adminKey, { method: 'POST', body: '{}' });
      setActivePrompts(ps => ps.filter(x => x.id !== id));
      flash('success', 'Prompt disabled!');
    } catch (err) { flash('error', 'Failed: ' + err.message); }
  };

  const handleUserAction = async (userId, action) => {
    if (!adminKey) { flash('error', 'Enter admin key.'); return; }
    if (action === 'delete' && !window.confirm('Delete this user? This cannot be undone.')) return;
    try {
      await adminFetch(`/admin/users/${userId}/${action}`, adminKey, { method: 'POST', body: '{}' });
      flash('success', `User ${action}d successfully!`);
      loadUsers();
    } catch (err) { flash('error', 'Failed: ' + err.message); }
  };

  const handleDepositAction = async (depositId, action) => {
    if (!adminKey) return;
    try {
      await adminFetch(`/admin/deposits/${depositId}/${action}`, adminKey, { method: 'POST', body: '{}' });
      flash('success', `Deposit ${action}d!`);
      loadDeposits();
    } catch (err) { flash('error', 'Failed: ' + err.message); }
  };

  const handleWithdrawalAction = async (wdId, action) => {
    if (!adminKey) return;
    try {
      await adminFetch(`/admin/withdrawals/${wdId}/${action}`, adminKey, { method: 'POST', body: '{}' });
      flash('success', 'Withdrawal action applied!');
      loadWithdrawals();
    } catch (err) { flash('error', 'Failed: ' + err.message); }
  };

  /* ── Data-loading effects ──────────────────────────────────── */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!adminKey) return;
    if (activePage === 'prompts')      loadPrompts();
    if (activePage === 'security')     loadOtp();
    if (activePage === 'transactions') loadDeposits();
    if (activePage === 'settings') {
      adminFetch('/admin/config/deposit-addresses', adminKey)
        .then(d => { if (d) setDepAddr(a => ({ ...a, ...d })); })
        .catch(() => {});
    }
  }, [activePage, adminKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!adminKey || activePage !== 'transactions') return;
    if (txTab === 'deposits')    loadDeposits();
    if (txTab === 'withdrawals') loadWithdrawals();
    if (txTab === 'all')         loadAllTx();
    if (txTab === 'growth' && activeUser) loadGrowthData(activeUser.id);
  }, [txTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!activeUser || !adminKey) return;
    loadPortfolio(activeUser.id);
    loadSimStatus(activeUser.id);
    if (txTab === 'growth') loadGrowthData(activeUser.id);
  }, [activeUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Render helpers ────────────────────────────────────────── */
  const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

  /* ════════════════════════════════════════════════════════════ */
  return (
    <div className="admin-redesign" data-theme={theme}>

      {/* ═══ MODALS ═════════════════════════════════════════════ */}

      {/* Users Modal */}
      <div className={`modal-overlay${activeModal === 'users' ? ' open' : ''}`}
           onClick={(e) => e.target === e.currentTarget && setActiveModal(null)}>
        <div className="modal" style={{ maxWidth: '480px' }}>
          <div className="modal-header">
            <h3>Select User</h3>
            <button className="modal-close" onClick={() => setActiveModal(null)}>&times;</button>
          </div>
          <div className="modal-body">
            {users.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '32px 0' }}>
                Enter admin key &amp; click &ldquo;Load Users&rdquo; first.
              </div>
            ) : users.map(u => (
              <div key={u.id} className="user-card" onClick={() => { setActiveUser(u); setActiveModal(null); }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="user-card-name">{u.name || u.full_name || 'N/A'}</div>
                    <div className="user-card-email">{u.email}</div>
                    <div className="user-card-balance">${parseFloat(u.balance || 0).toFixed(2)}</div>
                  </div>
                  <span className={`badge ${u.is_verified ? 'badge-green' : 'badge-red'}`}>
                    {u.is_verified ? 'Verified' : 'Unverified'}
                  </span>
                </div>
                <div className="user-card-meta">
                  <span className="badge badge-gray">#{u.id}</span>
                  <button className="btn btn-primary btn-xs">Select</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Total Value Modal */}
      <div className={`modal-overlay${activeModal === 'edit-total' ? ' open' : ''}`}
           onClick={(e) => e.target === e.currentTarget && setActiveModal(null)}>
        <div className="modal" style={{ maxWidth: '380px' }}>
          <div className="modal-header">
            <h3>Edit Portfolio Value</h3>
            <button className="modal-close" onClick={() => setActiveModal(null)}>&times;</button>
          </div>
          <div className="modal-body">
            <label><span>New Total Value (USD)</span>
              <input type="number" step="0.01" placeholder="0.00" value={editTotalInput} onChange={e => setEditTotalInput(e.target.value)} />
            </label>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setActiveModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleEditTotalValue}>Save</button>
          </div>
        </div>
      </div>

      {/* Add Asset Modal */}
      <div className={`modal-overlay${activeModal === 'add-asset' ? ' open' : ''}`}
           onClick={(e) => e.target === e.currentTarget && setActiveModal(null)}>
        <div className="modal" style={{ maxWidth: '400px' }}>
          <div className="modal-header">
            <h3>Add / Edit Asset</h3>
            <button className="modal-close" onClick={() => setActiveModal(null)}>&times;</button>
          </div>
          <div className="modal-body">
            <div className="stack">
              <label><span>Symbol</span><input value={assetSymbol} onChange={e => setAssetSymbol(e.target.value)} placeholder="BTC" /></label>
              <label><span>Amount</span><input type="number" step="any" value={assetAmount} onChange={e => setAssetAmount(e.target.value)} placeholder="0.00" /></label>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setActiveModal(null)}>Cancel</button>
            <button className="btn btn-primary">Add Asset</button>
          </div>
        </div>
      </div>

      {/* Testimony Modal */}
      <div className={`modal-overlay${activeModal === 'testimony' ? ' open' : ''}`}
           onClick={(e) => e.target === e.currentTarget && setActiveModal(null)}>
        <div className="modal" style={{ maxWidth: '540px' }}>
          <div className="modal-header">
            <h3>Add Testimony</h3>
            <button className="modal-close" onClick={() => setActiveModal(null)}>&times;</button>
          </div>
          <div className="modal-body">
            <div className="stack">
              <div className="form-grid form-2">
                <label><span>Client Name *</span><input value={tForm.name} onChange={e => setTForm(f=>({...f,name:e.target.value}))} placeholder="John Doe" /></label>
                <label><span>Title / Position</span><input value={tForm.title} onChange={e => setTForm(f=>({...f,title:e.target.value}))} placeholder="CEO, Tech Co." /></label>
              </div>
              <div className="form-grid form-2">
                <label><span>Image URL</span><input type="url" value={tForm.image} onChange={e => setTForm(f=>({...f,image:e.target.value}))} placeholder="https://..." /></label>
                <label><span>Rating</span>
                  <select value={tForm.rating} onChange={e => setTForm(f=>({...f,rating:e.target.value}))}>
                    <option value="5">5 ★★★★★</option>
                    <option value="4">4 ★★★★☆</option>
                    <option value="3">3 ★★★☆☆</option>
                    <option value="2">2 ★★☆☆☆</option>
                    <option value="1">1 ★☆☆☆☆</option>
                  </select>
                </label>
              </div>
              <label><span>Testimony *</span><textarea value={tForm.content} onChange={e => setTForm(f=>({...f,content:e.target.value}))} placeholder="Share the client's experience…" /></label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={tForm.featured} onChange={e => setTForm(f=>({...f,featured:e.target.checked}))} />
                <span style={{ display: 'inline', textTransform: 'none', fontSize: '13px', color: 'var(--text)' }}>Feature on landing page</span>
              </label>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setActiveModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => {
              if (!tForm.name || !tForm.content) return;
              setTestimonies(t => [...t, { id: Date.now(), ...tForm, stars: parseInt(tForm.rating) }]);
              setActiveModal(null);
              setTForm({ name:'', title:'', image:'', rating:'5', content:'', featured:false });
            }}>Save Testimony</button>
          </div>
        </div>
      </div>

      {/* Sidebar overlay (mobile) */}
      <div className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* ═══ LAYOUT ═════════════════════════════════════════════ */}
      <div className="layout">

        {/* ── SIDEBAR ─────────────────────────────────────────── */}
        <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">E</div>
            <div>
              <div className="sidebar-logo-text">ELON-ULTRA</div>
              <div className="sidebar-logo-sub">Admin Console</div>
            </div>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-label">Overview</div>
            <div className={`nav-item${activePage === 'dashboard' ? ' active' : ''}`} onClick={() => navTo('dashboard')}>
              <span className="icon"><LayoutDashboard size={16}/></span> Dashboard
            </div>
            <div className={`nav-item${activePage === 'users' ? ' active' : ''}`} onClick={() => navTo('users')}>
              <span className="icon"><Users size={16}/></span> Users
              {users.length > 0 && <span className="nav-badge">{users.length}</span>}
            </div>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-label">Finance</div>
            <div className={`nav-item${activePage === 'balance' ? ' active' : ''}`} onClick={() => navTo('balance')}>
              <span className="icon"><Wallet size={16}/></span> Balance &amp; Portfolio
            </div>
            <div className={`nav-item${activePage === 'transactions' ? ' active' : ''}`} onClick={() => navTo('transactions')}>
              <span className="icon"><Receipt size={16}/></span> Transactions
            </div>
            <div className={`nav-item${activePage === 'market' ? ' active' : ''}`} onClick={() => navTo('market')}>
              <span className="icon"><TrendingUp size={16}/></span> Market
            </div>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-label">Platform</div>
            <div className={`nav-item${activePage === 'prompts' ? ' active' : ''}`} onClick={() => navTo('prompts')}>
              <span className="icon"><Megaphone size={16}/></span> Prompts
              {activePrompts.length > 0 && <span className="nav-badge success">{activePrompts.length}</span>}
            </div>
            <div className={`nav-item${activePage === 'testimonies' ? ' active' : ''}`} onClick={() => navTo('testimonies')}>
              <span className="icon"><MessageSquare size={16}/></span> Testimonies
            </div>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-label">System</div>
            <div className={`nav-item${activePage === 'settings' ? ' active' : ''}`} onClick={() => navTo('settings')}>
              <span className="icon"><SettingsIcon size={16}/></span> Settings
            </div>
            <div className={`nav-item${activePage === 'security' ? ' active' : ''}`} onClick={() => navTo('security')}>
              <span className="icon"><Shield size={16}/></span> Security
            </div>
          </div>

          <div className="sidebar-footer">
            <div className="nav-item" style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', cursor: 'default' }}>
              <span className="status-dot dot-green" />
              Trade Engine: <strong style={{ color: 'var(--success)' }}>Running</strong>
            </div>
          </div>
        </aside>

        {/* ── MAIN AREA ────────────────────────────────────────── */}
        <div className="main-area">

          {/* Topbar */}
          <div className="topbar">
            <button className="topbar-hamburger" onClick={() => setSidebarOpen(o => !o)}>☰</button>
            <div style={{ flex: 1 }}>
              <div className="topbar-title">{PAGE_TITLES[activePage]}</div>
            </div>

            {/* Admin key button — concept topbar-key-wrap */}
            <div className="topbar-key-wrap">
              <button
                className="topbar-key-btn"
                title={keyVerified ? 'Key active' : 'Set admin key'}
                onClick={() => setKeyPopupOpen(o => !o)}
              >
                <Lock size={14}/>
                <span className={`topbar-key-dot${keyVerified ? ' active' : ''}`} />
              </button>
              <div className={`topbar-key-popup${keyPopupOpen ? ' open' : ''}`}>
                <label>Access Key</label>
                <input
                  type="password"
                  placeholder="Enter key…"
                  autoComplete="off"
                  defaultValue={adminKey}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      setAdminKey(e.target.value);
                      sessionStorage.setItem('adminKey', e.target.value);
                      setKeyPopupOpen(false);
                    }
                    if (e.key === 'Escape') setKeyPopupOpen(false);
                  }}
                />
                <span className="key-save">
                  {keyVerified
                    ? <span style={{ color: 'var(--success)' }}>● Key active</span>
                    : 'Press Enter to save'}
                </span>
              </div>
            </div>

            {/* Active user pill */}
            <div className="user-pill">
              Viewing: <strong>{activeUser ? (activeUser.name || activeUser.full_name || activeUser.email) : '—'}</strong>
              <span className="user-pill-change" onClick={() => setActiveModal('users')}>change ↗</span>
            </div>

            {/* Theme toggle */}
            <button className="theme-toggle" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
          </div>

          {/* Ticker */}
          <div className="ticker">
            <div className="ticker-inner">
              {[...testimonies, ...testimonies].map((t, i) => (
                <span key={i} className="ticker-item">
                  <strong>{t.name}</strong> — &ldquo;{t.text.replace(/^"|"$/g,'').slice(0,60)}&rdquo; {stars(t.stars)}
                </span>
              ))}
            </div>
          </div>

          {/* ── CONTENT ─────────────────────────────────────────── */}
          <div className="content">

            {/* Action status banner */}
            {actionMsg && (
              <div className={`status-banner ${actionMsg.type}`} style={{ marginBottom: '16px' }}>
                {actionMsg.text}
              </div>
            )}

            {/* ══ DASHBOARD ══════════════════════════════════════ */}
            <div className={`page${activePage === 'dashboard' ? ' active' : ''}`}>
              <div className="stack">

                {/* Load users quick-action */}
                <div className="card card-sm">
                  <div className="section-header" style={{ marginBottom: '10px' }}>
                    <div>
                      <div className="section-title">Quick Actions</div>
                      <div className="section-sub">Key authenticated — load users to begin</div>
                    </div>
                    <span className="status-dot dot-green" style={{ marginTop: '4px' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button className="btn btn-primary" onClick={loadUsers} disabled={usersLoading}>
                      {usersLoading ? 'Loading…' : 'Load Users'}
                    </button>
                    <button className="btn btn-ghost" onClick={() => setActiveModal('users')}>
                      <Users size={14} /> View Users
                    </button>
                  </div>
                </div>

                {/* Stat cards */}
                <div className="stat-grid">
                  <div className="stat-card c-green">
                    <div className="stat-top">
                      <div className="stat-icon"><TrendingUp size={18}/></div>
                      <span className="stat-badge badge-up">▲ 0%</span>
                    </div>
                    <div className="stat-label">Total Portfolio</div>
                    <div className="stat-val">{activeUser ? `$${parseFloat(activeUser.balance || 0).toFixed(2)}` : '$0.00'}</div>
                    <div className="stat-sub">vs. yesterday</div>
                    <div className="stat-edit-hint">click to edit</div>
                  </div>
                  <div className="stat-card c-blue">
                    <div className="stat-top">
                      <div className="stat-icon"><DollarSign size={18}/></div>
                      <span className="stat-badge badge-neu">24H</span>
                    </div>
                    <div className="stat-label">24h Change</div>
                    <div className="stat-val">{activeUser ? `+$${(parseFloat(activeUser.balance || 0) * 0.002).toFixed(2)}` : '+$0.00'}</div>
                    <div className="stat-sub">{activeUser ? '+0.2% today' : '+0% today'}</div>
                    <div className="stat-edit-hint">click to edit</div>
                  </div>
                  <div className="stat-card c-gold">
                    <div className="stat-top">
                      <div className="stat-icon"><Wallet size={18}/></div>
                      <span className="stat-badge badge-neu">CASH</span>
                    </div>
                    <div className="stat-label">Available Balance</div>
                    <div className="stat-val">{activeUser ? `$${parseFloat(activeUser.balance || 0).toFixed(2)}` : '$0.00'}</div>
                    <div className="stat-sub">Ready to deploy</div>
                    <div className="stat-edit-hint">click to edit</div>
                  </div>
                  <div className="stat-card c-red">
                    <div className="stat-top">
                      <div className="stat-icon"><Briefcase size={18}/></div>
                      <span className="stat-badge badge-neu">ACTIVE</span>
                    </div>
                    <div className="stat-label">Active Positions</div>
                    <div className="stat-val">{portfolio ? Object.keys(portfolio.assets || {}).length : 0}</div>
                    <div className="stat-sub">Holdings</div>
                    <div className="stat-edit-hint">click to edit</div>
                  </div>
                </div>

                {/* Quick action cards */}
                <div className="row-3">
                  <div className="card card-sm">
                    <div className="section-header">
                      <div className="section-title"><Cpu size={14}/> Simulator</div>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '10px' }}>
                      Status: <span style={{ color: simStatus?.sim_enabled && !simStatus?.sim_paused ? 'var(--success)' : 'var(--warn)', fontWeight: 600 }}>{simStatus ? (simStatus.sim_enabled && !simStatus.sim_paused ? 'Running' : simStatus.sim_paused ? 'Paused' : 'Stopped') : '—'}</span><br/>
                      Next run: <span style={{ color: 'var(--text-3)' }}>{simStatus?.sim_next_run_at ? new Date(simStatus.sim_next_run_at).toLocaleTimeString() : '—'}</span>
                    </div>
                    <div className="btn-group">
                      <button className="btn btn-success btn-xs" onClick={handleSimStart}><Play size={11}/> Start</button>
                      <button className="btn btn-ghost btn-xs" onClick={handleSimPause}><Pause size={11}/> Pause</button>
                    </div>
                  </div>

                  <div className="card card-sm">
                    <div className="section-header">
                      <div className="section-title"><Wallet size={14}/> Quick Balance</div>
                    </div>
                    <div className="stack" style={{ gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input type="number" step="0.01" placeholder="Amount" value={creditAmount} onChange={e => setCreditAmount(e.target.value)} style={{ flex: 1 }} />
                        <select value={creditCurrency} onChange={e => setCreditCurrency(e.target.value)} style={{ width: '80px' }}>
                          <option>USD</option><option>BTC</option><option>ETH</option><option>USDT</option><option>USDC</option>
                        </select>
                      </div>
                      <div className="btn-group">
                        <button className="btn btn-primary btn-xs" onClick={handleCredit}>Credit</button>
                        <button className="btn btn-ghost btn-xs" onClick={handleSetBalance}>Set</button>
                      </div>
                    </div>
                  </div>

                  <div className="card card-sm">
                    <div className="section-header">
                      <div className="section-title"><TrendingUp size={14}/> Trigger Trade</div>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-2)', marginBottom: '10px' }}>
                      Trigger balance growth immediately.
                    </div>
                    <div className="btn-group">
                      <button className="btn btn-primary btn-xs" onClick={handleTriggerGrowth}>This User</button>
                      <button className="btn btn-ghost btn-xs" onClick={handleTriggerAllGrowth}>All Users</button>
                    </div>
                  </div>
                </div>

                {/* Holdings quick view */}
                <div className="card card-sm">
                  <div className="section-header">
                    <div className="section-title">User Holdings</div>
                    <a style={{ fontSize: '12px', color: 'var(--accent)', cursor: 'pointer' }} onClick={() => navTo('balance')}>Full view →</a>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Asset</th><th>Amount</th><th>Price</th><th>Value</th><th>% of Portfolio</th><th>Actions</th></tr></thead>
                      <tbody>
                        {!activeUser ? (
                          <tr className="empty-row"><td colSpan={6}>Select a user to see holdings.</td></tr>
                        ) : !portfolio ? (
                          <tr className="empty-row"><td colSpan={6}>Loading portfolio…</td></tr>
                        ) : Object.keys(portfolio?.assets || {}).length === 0 ? (
                          <tr className="empty-row"><td colSpan={6}>No crypto holdings.</td></tr>
                        ) : Object.entries(portfolio.assets).map(([symbol, amount]) => (
                          <tr key={symbol}>
                            <td><strong>{symbol}</strong></td>
                            <td>{parseFloat(amount).toFixed(6)}</td>
                            <td>—</td><td>—</td><td>—</td>
                            <td><button className="btn btn-ghost btn-xs" onClick={() => navTo('balance')}>Manage</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>{/* /dashboard */}


            {/* ══ USERS ══════════════════════════════════════════ */}
            <div className={`page${activePage === 'users' ? ' active' : ''}`}>
              <div className="stack">
                <div className="card card-sm">
                  <div className="section-header">
                    <div>
                      <div className="section-title">User Management</div>
                      <div className="section-sub">Browse, select, and manage individual users</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button className="btn btn-primary" onClick={() => setActiveModal('users')}><Users size={13}/> User List</button>
                      <button className="btn btn-ghost" onClick={loadUsers} disabled={usersLoading}>{usersLoading ? 'Loading…' : 'Reload'}</button>
                    </div>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>ID</th><th>Name</th><th>Email</th><th>Balance</th><th>Verified</th><th>Joined</th><th>Actions</th></tr>
                      </thead>
                      <tbody>
                        {users.length === 0 ? (
                          <tr className="empty-row"><td colSpan={7}>Load users via admin key.</td></tr>
                        ) : users.map(u => (
                          <tr key={u.id}>
                            <td>#{u.id}</td>
                            <td>{u.name || u.full_name || 'N/A'}</td>
                            <td>{u.email}</td>
                            <td>${parseFloat(u.balance || 0).toFixed(2)}</td>
                            <td><span className={`badge ${u.is_verified ? 'badge-green' : 'badge-red'}`}>{u.is_verified ? 'Yes' : 'No'}</span></td>
                            <td>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                            <td>
                              <div className="btn-group">
                                <button className="btn btn-ghost btn-xs" onClick={() => { setActiveUser(u); navTo('balance'); }}>Select</button>
                                <button className="btn btn-warn btn-xs" onClick={() => handleUserAction(u.id, u.is_active === false ? 'enable' : 'disable')}>{u.is_active === false ? 'Enable' : 'Disable'}</button>
                                <button className="btn btn-danger btn-xs" onClick={() => handleUserAction(u.id, 'delete')}>Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>{/* /users */}


            {/* ══ BALANCE & PORTFOLIO ════════════════════════════ */}
            <div className={`page${activePage === 'balance' ? ' active' : ''}`}>
              <div className="stack">

                <div className="card">
                  <div className="section-header">
                    <div className="section-title"><DollarSign size={15}/> Balance Management</div>
                  </div>
                  {activeUser ? (
                    <div style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--text-2)' }}>
                      Editing: <strong style={{ color: 'var(--accent)' }}>{activeUser.name || activeUser.email}</strong>
                      &nbsp;<button className="btn btn-ghost btn-xs" onClick={() => setActiveModal('users')}>Change User</button>
                    </div>
                  ) : (
                    <div style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--warn)' }}>
                      ⚠ No user selected. <button className="btn btn-ghost btn-xs" onClick={() => setActiveModal('users')}>Select User</button>
                    </div>
                  )}
                  <form onSubmit={handleCredit}>
                    <div className="form-grid form-3" style={{ marginBottom: '12px' }}>
                      <label><span>Amount</span><input type="number" step="0.01" required placeholder="0.00" value={creditAmount} onChange={e => setCreditAmount(e.target.value)} /></label>
                      <label><span>Currency</span>
                        <select value={creditCurrency} onChange={e => setCreditCurrency(e.target.value)}>
                          <option>USD</option><option>BTC</option><option>ETH</option><option>USDT</option><option>USDC</option>
                        </select>
                      </label>
                      <label><span>Tax ID (optional)</span><input placeholder="e.g. TX-00291" value={creditTaxId} onChange={e => setCreditTaxId(e.target.value)} /></label>
                    </div>
                    <div className="btn-group">
                      <button type="submit" className="btn btn-primary">Credit (Add)</button>
                      <button type="button" className="btn btn-ghost" onClick={handleSetBalance}>Set Balance</button>
                      <button type="button" className="btn btn-ghost" onClick={() => { setEditTotalInput(activeUser ? String(parseFloat(activeUser.balance||0).toFixed(2)) : ''); setActiveModal('edit-total'); }}>Edit Total Value</button>
                    </div>
                  </form>
                </div>

                <div className="card">
                  <div className="section-header">
                    <div className="section-title"><Briefcase size={15}/> Portfolio Holdings</div>
                  </div>
                  <form onSubmit={handleSavePortfolio}>
                    <div style={{ marginBottom: '12px' }}>
                      <button type="button" className="btn btn-ghost btn-xs" onClick={() => setActiveModal('add-asset')}><Plus size={11}/> Add Asset</button>
                    </div>
                    <div className="form-grid form-3" style={{ maxHeight: '220px', overflowY: 'auto', marginBottom: '12px' }}>
                      {COINS.map(coin => (
                        <label key={coin}>
                          <span>{coin}</span>
                          <input
                            type="number" step="any" placeholder="0.00"
                            value={portfolioInputs[coin]}
                            onChange={e => setPortfolioInputs(p => ({ ...p, [coin]: e.target.value }))}
                          />
                        </label>
                      ))}
                    </div>
                    <button type="submit" className="btn btn-primary"><Save size={13}/> Save Holdings</button>
                  </form>
                </div>

                <div className="card">
                  <div className="section-header"><div className="section-title">Holdings Overview</div></div>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Asset</th><th>Amount</th><th>Price</th><th>Value</th><th>% Portfolio</th><th>Actions</th></tr></thead>
                      <tbody>
                        {!activeUser ? (
                          <tr className="empty-row"><td colSpan={6}>Select a user first.</td></tr>
                        ) : !portfolio ? (
                          <tr className="empty-row"><td colSpan={6}>Loading portfolio…</td></tr>
                        ) : Object.keys(portfolio?.assets || {}).length === 0 ? (
                          <tr className="empty-row"><td colSpan={6}>No crypto holdings for this user.</td></tr>
                        ) : Object.entries(portfolio.assets).map(([symbol, amount]) => (
                          <tr key={symbol}>
                            <td><strong>{symbol}</strong></td>
                            <td>{parseFloat(amount).toFixed(8)}</td>
                            <td>—</td><td>—</td><td>—</td>
                            <td><button className="btn btn-danger btn-xs" onClick={() => {
                              setPortfolioInputs(p => ({ ...p, [symbol]: '' }));
                              setPortfolio(prev => { const a = { ...prev?.assets }; delete a[symbol]; return { ...prev, assets: a }; });
                            }}>Remove</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="card">
                  <div className="section-header"><div className="section-title">Recent Trades</div></div>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Date</th><th>Type</th><th>Asset</th><th>Amount</th><th>Price</th><th>Total</th></tr></thead>
                      <tbody><tr className="empty-row"><td colSpan={6}>Select a user to view trades.</td></tr></tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>{/* /balance */}


            {/* ══ TRANSACTIONS ═══════════════════════════════════ */}
            <div className={`page${activePage === 'transactions' ? ' active' : ''}`}>
              <div className="stack">
                <div className="section-header">
                  <div className="section-title">Transaction Management</div>
                  <div className="btn-group">
                    <button className="btn btn-ghost btn-xs" onClick={() => { loadDeposits(); loadWithdrawals(); loadAllTx(); }}><RefreshCw size={11}/> Refresh</button>
                    <button className="btn btn-danger btn-xs" onClick={handleClearAllTrades}><Trash2 size={11}/> Clear All Trades</button>
                  </div>
                </div>

                <div className="tab-bar">
                  {['deposits','withdrawals','growth','all'].map(t => (
                    <button key={t} className={`tab-btn${txTab === t ? ' active' : ''}`} onClick={() => setTxTab(t)}>
                      {t === 'deposits' ? 'Deposits' : t === 'withdrawals' ? 'Withdrawals' : t === 'growth' ? 'Growth Trades' : 'All Transactions'}
                    </button>
                  ))}
                </div>

                <div className={`tab-pane${txTab === 'deposits' ? ' active' : ''}`}>
                  <div className="section-header">
                    <span className="section-title" style={{ fontSize: '13px' }}>Deposit History</span>
                    <div className="btn-group">
                      <button className="btn btn-ghost btn-xs" onClick={loadDeposits}>Refresh</button>
                      <button className="btn btn-primary btn-xs">+ Add Deposit</button>
                    </div>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Date</th><th>User</th><th>Method</th><th>Amount</th><th>Status</th><th>TxID</th><th>Actions</th></tr></thead>
                      <tbody>
                        {deposits.length === 0 ? (
                          <tr className="empty-row"><td colSpan={7}>No deposits. Click Refresh to load.</td></tr>
                        ) : deposits.map(d => (
                          <tr key={d.id}>
                            <td>{d.created_at ? new Date(d.created_at).toLocaleDateString() : '—'}</td>
                            <td>#{d.user_id}</td>
                            <td>{d.currency || '—'}</td>
                            <td>${parseFloat(d.amount || 0).toFixed(2)}</td>
                            <td><span className={`badge ${d.status === 'completed' ? 'badge-green' : d.status === 'pending' ? 'badge-blue' : 'badge-red'}`}>{d.status}</span></td>
                            <td style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.reference || '—'}</td>
                            <td>
                              <div className="btn-group">
                                {d.status !== 'completed' && <button className="btn btn-success btn-xs" onClick={() => handleDepositAction(d.id, 'approve')}>Approve</button>}
                                {d.status !== 'completed' && <button className="btn btn-primary btn-xs" onClick={() => handleDepositAction(d.id, 'complete')}>Complete</button>}
                                {d.status !== 'failed'    && <button className="btn btn-danger btn-xs"  onClick={() => handleDepositAction(d.id, 'fail')}>Fail</button>}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className={`tab-pane${txTab === 'withdrawals' ? ' active' : ''}`}>
                  <div className="section-header">
                    <span className="section-title" style={{ fontSize: '13px' }}>Withdrawal History</span>
                    <div className="btn-group">
                      <button className="btn btn-ghost btn-xs" onClick={loadWithdrawals}>Refresh</button>
                      <button className="btn btn-primary btn-xs">+ Add Withdrawal</button>
                    </div>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Date</th><th>User</th><th>Method</th><th>Amount</th><th>Status</th><th>Fee</th><th>TxID</th><th>Actions</th></tr></thead>
                      <tbody>
                        {withdrawals.length === 0 ? (
                          <tr className="empty-row"><td colSpan={8}>No withdrawals. Click Refresh to load.</td></tr>
                        ) : withdrawals.map(w => (
                          <tr key={w.id}>
                            <td>{w.created_at ? new Date(w.created_at).toLocaleDateString() : '—'}</td>
                            <td>#{w.user_id}</td>
                            <td>{w.method || w.currency || '—'}</td>
                            <td>${parseFloat(w.amount || 0).toFixed(2)}</td>
                            <td><span className={`badge ${w.status === 'approved' ? 'badge-green' : w.status === 'pending' ? 'badge-blue' : 'badge-red'}`}>{w.status || '—'}</span></td>
                            <td>{w.fee != null ? `$${parseFloat(w.fee).toFixed(2)}` : '—'}</td>
                            <td style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.tx_id || w.reference || '—'}</td>
                            <td>
                              <div className="btn-group">
                                {w.fee_status !== 'confirmed' && <button className="btn btn-ghost btn-xs" onClick={() => handleWithdrawalAction(w.id, 'confirm-fee')}>Fee</button>}
                                {w.status !== 'approved' && <button className="btn btn-success btn-xs" onClick={() => handleWithdrawalAction(w.id, 'approve')}>Approve</button>}
                                <button className="btn btn-danger btn-xs" onClick={() => handleWithdrawalAction(w.id, 'fail')}>Fail</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className={`tab-pane${txTab === 'growth' ? ' active' : ''}`}>
                  <div className="growth-stats">
                    {[
                      ['Total Trades',      growthStats?.total_trades ?? '—'],
                      ['Total Volume',      growthStats?.total_volume != null ? `$${parseFloat(growthStats.total_volume).toFixed(2)}` : '—'],
                      ['Avg Boost / Trade', growthStats?.avg_boost != null ? `${parseFloat(growthStats.avg_boost).toFixed(2)}%` : '—'],
                      ['Peak Balance',      growthStats?.peak_balance != null ? `$${parseFloat(growthStats.peak_balance).toFixed(2)}` : '—'],
                    ].map(([l,v],i) => (
                      <div key={i} className="growth-stat">
                        <div className="growth-stat-label">{l}</div>
                        <div className="growth-stat-value" style={i===2?{color:'var(--success)'}:{}}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Date</th><th>Type</th><th>Asset</th><th>Amount</th><th>Price</th><th>Total</th><th>Before</th><th>After</th><th>Boost %</th></tr></thead>
                      <tbody>
                        {growthTrades.length === 0 ? (
                          <tr className="empty-row"><td colSpan={9}>{activeUser ? 'No growth trades found.' : 'Select a user to view growth trades.'}</td></tr>
                        ) : growthTrades.map((t, i) => (
                          <tr key={t.id || i}>
                            <td>{t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}</td>
                            <td>{t.type || '—'}</td>
                            <td>{t.asset || t.currency || '—'}</td>
                            <td>{t.amount != null ? parseFloat(t.amount).toFixed(6) : '—'}</td>
                            <td>{t.price != null ? `$${parseFloat(t.price).toFixed(2)}` : '—'}</td>
                            <td>{t.total != null ? `$${parseFloat(t.total).toFixed(2)}` : '—'}</td>
                            <td>{t.balance_before != null ? `$${parseFloat(t.balance_before).toFixed(2)}` : '—'}</td>
                            <td>{t.balance_after != null ? `$${parseFloat(t.balance_after).toFixed(2)}` : '—'}</td>
                            <td style={{ color: 'var(--success)' }}>{t.boost_pct != null ? `${parseFloat(t.boost_pct).toFixed(2)}%` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className={`tab-pane${txTab === 'all' ? ' active' : ''}`}>
                  <div className="section-header">
                    <span className="section-title" style={{ fontSize: '13px' }}>All Transactions</span>
                    <div className="btn-group">
                      <button className="btn btn-ghost btn-xs" onClick={loadAllTx}><RefreshCw size={11}/> Refresh</button>
                      <button className="btn btn-primary btn-xs">+ Add Transaction</button>
                    </div>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>ID</th><th>User</th><th>Type</th><th>Amount</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
                      <tbody>
                        {allTx.length === 0 ? (
                          <tr className="empty-row"><td colSpan={7}>No transactions. Click Refresh.</td></tr>
                        ) : allTx.map(t => (
                          <tr key={t.id}>
                            <td>#{t.id}</td>
                            <td>#{t.user_id || t.user}</td>
                            <td>{t.type}</td>
                            <td>${parseFloat(t.amount || 0).toFixed(2)} {t.currency || ''}</td>
                            <td>{t.created_at ? new Date(t.created_at).toLocaleDateString() : (t.date || '—')}</td>
                            <td><span className={`badge ${t.status === 'completed' ? 'badge-green' : t.status === 'pending' ? 'badge-blue' : 'badge-red'}`}>{t.status || '—'}</span></td>
                            <td><button className="btn btn-danger btn-xs" onClick={() => { if (window.confirm('Delete this transaction?')) adminFetch(`/admin/transactions/${t.id}`, adminKey, { method: 'DELETE' }).then(() => loadAllTx()).catch(err => flash('error', err.message)); }}>Delete</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>{/* /transactions */}


            {/* ══ MARKET ═════════════════════════════════════════ */}
            <div className={`page${activePage === 'market' ? ' active' : ''}`}>
              <div className="stack">
                <div className="section-header">
                  <div className="section-title"><TrendingUp size={15}/> Live Market Overview</div>
                  <button className="btn btn-ghost btn-xs">Refresh Prices</button>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Asset</th><th>Price</th><th>24h Change</th><th>Volume</th><th>Action</th></tr></thead>
                    <tbody><tr className="empty-row"><td colSpan={5}>Loading market data…</td></tr></tbody>
                  </table>
                </div>
              </div>
            </div>{/* /market */}


            {/* ══ PROMPTS ════════════════════════════════════════ */}
            <div className={`page${activePage === 'prompts' ? ' active' : ''}`}>
              <div className="stack">

                <div className="card">
                  <div className="section-header">
                    <div>
                      <div className="section-title"><Megaphone size={15}/> Send Prompt to Users</div>
                      <div className="section-sub">Broadcast or target specific users</div>
                    </div>
                  </div>
                  <div className="stack">
                    <label><span>Message</span>
                      <textarea value={promptMsg} onChange={e => setPromptMsg(e.target.value)} placeholder="Message to show as a prompt to users…" />
                    </label>
                    <label><span>Target User IDs (leave blank to broadcast)</span>
                      <input value={promptTargets} onChange={e => setPromptTargets(e.target.value)} placeholder="e.g. 1, 2, 5  — or leave empty for all" />
                    </label>
                    <div>
                      <button className="btn btn-primary" onClick={handleSendPrompt}>Send Prompt</button>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="section-header">
                    <div>
                      <div className="section-title"><Bell size={15}/> Active Prompts</div>
                      <div className="section-sub">Disable to stop showing to users</div>
                    </div>
                    <button className="btn btn-ghost btn-xs" onClick={loadPrompts}>Refresh</button>
                  </div>
                  <div className="stack">
                    {activePrompts.map(p => (
                      <div key={p.id} className="prompt-item">
                        <div>
                          <div className="prompt-text">{p.text}</div>
                          <div className="prompt-meta">
                            Sent: {p.date} · Target: {p.target} ·{' '}
                            <span className="badge badge-green">Active</span>
                          </div>
                        </div>
                        <button className="btn btn-danger btn-xs" onClick={() => handleDisablePrompt(p.id)}>
                          Disable
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>{/* /prompts */}


            {/* ══ TESTIMONIES ════════════════════════════════════ */}
            <div className={`page${activePage === 'testimonies' ? ' active' : ''}`}>
              <div className="stack">
                <div className="section-header">
                  <div className="section-title"><MessageSquare size={15}/> Testimonies</div>
                  <div className="btn-group">
                    <button className="btn btn-ghost btn-xs">Refresh</button>
                    <button className="btn btn-primary btn-xs" onClick={() => setActiveModal('testimony')}><Plus size={11}/> Add Testimony</button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '14px' }}>
                  {testimonies.map(t => (
                    <div key={t.id} className="testimony-card">
                      <div className="testimony-card-header">
                        <div>
                          <div className="testimony-card-name">{t.name}</div>
                          <div className="testimony-card-title">{t.title}</div>
                        </div>
                        <span className={`badge ${t.featured ? 'badge-blue' : 'badge-gray'}`}>
                          {t.featured ? 'Featured' : 'Standard'}
                        </span>
                      </div>
                      <div className="testimony-card-stars">{stars(t.stars)}</div>
                      <div className="testimony-card-text">{t.text}</div>
                      <div className="btn-group">
                        <button className="btn btn-ghost btn-xs">Edit</button>
                        <button className="btn btn-danger btn-xs" onClick={() => setTestimonies(ts => ts.filter(x => x.id !== t.id))}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>{/* /testimonies */}


            {/* ══ SETTINGS ═══════════════════════════════════════ */}
            <div className={`page${activePage === 'settings' ? ' active' : ''}`}>
              <div className="stack">

                <div className="card">
                  <div className="section-header">
                    <div>
                      <div className="section-title">Deposit Addresses</div>
                      <div className="section-sub">Wallet addresses shown on the deposit page</div>
                    </div>
                  </div>
                  <div className="addr-grid" style={{ marginBottom: '14px' }}>
                    {['BTC','ETH','USDT','USDC'].map(sym => (
                      <label key={sym}>
                        <span>{sym}</span>
                        <input value={depAddr[sym]} onChange={e => setDepAddr(d => ({...d,[sym]:e.target.value}))} placeholder={sym === 'BTC' ? 'bc1…' : sym === 'ETH' || sym === 'USDC' ? '0x…' : 'T…'} />
                      </label>
                    ))}
                  </div>
                  <div className="btn-group">
                    <button className="btn btn-primary" onClick={handleSaveAddresses}>Save Addresses</button>
                    <button className="btn btn-ghost" onClick={() => setDepAddr({ BTC:'', ETH:'', USDT:'', USDC:'' })}>Reset</button>
                  </div>
                </div>

                <div className="card">
                  <div className="section-header">
                    <div>
                      <div className="section-title"><Cpu size={15}/> Balance Growth Simulator</div>
                      <div className="section-sub">Controls and schedule for automated balance growth</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '14px' }}>
                    Status: <span style={{ color: simStatus?.sim_enabled && !simStatus?.sim_paused ? 'var(--success)' : 'var(--warn)', fontWeight: 700 }}>
                      <span className={`status-dot ${simStatus?.sim_enabled && !simStatus?.sim_paused ? 'dot-green' : 'dot-red'}`} />
                      {simStatus ? (simStatus.sim_enabled && !simStatus.sim_paused ? 'Running' : simStatus.sim_paused ? 'Paused' : 'Stopped') : '—'}
                    </span>
                    &nbsp;·&nbsp; Next run: <span style={{ color: 'var(--text-3)' }}>{simStatus?.sim_next_run_at ? new Date(simStatus.sim_next_run_at).toLocaleTimeString() : '—'}</span>
                  </div>
                  <div className="btn-group">
                    <button className="btn btn-success" onClick={handleSimStart}><Play size={13}/> Start Simulator</button>
                    <button className="btn btn-warn" onClick={handleSimPause}><Pause size={13}/> Pause Simulator</button>
                    <button className="btn btn-primary" onClick={handleTriggerGrowth}>Trigger Growth — This User</button>
                    <button className="btn btn-ghost" onClick={handleTriggerAllGrowth}>Trigger Growth — All Users</button>
                  </div>
                </div>

                <div className="card">
                  <div className="section-header">
                    <div>
                      <div className="section-title">Admin Preview User</div>
                      <div className="section-sub">Select the user whose data is shown across the admin</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select style={{ minWidth: '220px' }} value={activeUser?.id || ''} onChange={e => {
                      const u = users.find(x => x.id === parseInt(e.target.value));
                      if (u) setActiveUser(u);
                    }}>
                      <option value="">— none —</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email} (#{u.id})</option>)}
                    </select>
                    <button className="btn btn-primary">Set Preview User</button>
                  </div>
                </div>

              </div>
            </div>{/* /settings */}


            {/* ══ SECURITY ═══════════════════════════════════════ */}
            <div className={`page${activePage === 'security' ? ' active' : ''}`}>
              <div className="stack">

                <div className="card">
                  <div className="section-header">
                    <div>
                      <div className="section-title"><Shield size={15}/> Email Verification Codes</div>
                      <div className="section-sub">OTP codes requested by users — valid 10 minutes</div>
                    </div>
                    <button className="btn btn-ghost btn-xs" onClick={loadOtp}><RefreshCw size={11}/> Refresh</button>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>User</th><th>Email</th><th style={{ textAlign: 'center' }}>Code</th><th style={{ textAlign: 'center' }}>Expires In</th><th>Requested At</th></tr></thead>
                      <tbody>
                        {otpList.length === 0 ? (
                          <tr className="empty-row"><td colSpan={5}>Enter admin key and click Refresh.</td></tr>
                        ) : otpList.map((o, i) => (
                          <tr key={i}>
                            <td>{o.name || `User #${o.userId}`}</td>
                            <td>{o.email}</td>
                            <td style={{ textAlign: 'center' }}><span className="otp-code">{o.code}</span></td>
                            <td style={{ textAlign: 'center' }}>{o.expiresIn || '—'}</td>
                            <td>{o.createdAt ? new Date(o.createdAt).toLocaleTimeString() : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="danger-card">
                  <div className="danger-title"><AlertTriangle size={13}/> Danger Zone</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div className="danger-desc">Delete all trade history for every user. This cannot be undone.</div>
                      <button className="btn btn-danger"><Trash2 size={13}/> Clear All Trades</button>
                    </div>
                    <div>
                      <div className="danger-desc">Wipe all data for the currently selected user.</div>
                      <button className="btn btn-danger">Reset Selected User</button>
                    </div>
                  </div>
                </div>

              </div>
            </div>{/* /security */}

          </div>{/* /content */}
        </div>{/* /main-area */}
      </div>{/* /layout */}
    </div>
  );
};

