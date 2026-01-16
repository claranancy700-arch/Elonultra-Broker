(function(){
  // Scoped admin script to avoid leaking globals and duplicate declarations
  // baseApi should be the ROOT API endpoint (e.g., /api or https://domain.com/api)
  const baseApi = window.__apiBase || ((typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) ? `http://${location.hostname}:5001/api` : (`${location.origin}/api`));

  async function getJSON(url, opts = {}) {
    // url should be like /admin/users (without /api prefix)
    // baseApi already has /api, so combine them: /api + /admin/users = /api/admin/users
    const full = url.startsWith('http') ? url : baseApi + url;
  // Ensure headers object exists and accept json
  opts.headers = Object.assign({ Accept: 'application/json' }, opts.headers || {});
  const res = await fetch(full, opts);
  if (!res.ok) {
    let body = null;
    try { body = await res.json(); } catch (e) { body = await res.text().catch(()=>null); }
    const msg = body && body.error ? body.error : `Request failed: ${res.status}`;
    throw new Error(msg);
  }

  return res.json();
}

const usersTbody = document.getElementById('users-tbody');
const userDetail = document.getElementById('user-detail');
const transactionsTbody = document.getElementById('transactions-tbody');
const adminKeyInput = document.getElementById('admin-key');
const loadUsersBtn = document.getElementById('load-users');
const creditForm = document.getElementById('credit-form');
const currentUserSelect = document.getElementById('current-user-select');
const editBalanceBtn = document.getElementById('edit-balance-btn');
const editTotalBtn = document.getElementById('edit-total-btn');
const depositAddressInputs = document.querySelectorAll('[data-deposit-symbol]');
const saveDepositAddressesBtn = document.getElementById('save-deposit-addresses');
const resetDepositAddressesBtn = document.getElementById('reset-deposit-addresses');

const DEFAULT_DEPOSIT_ADDRESSES = {
  BTC: 'bc1qmockaddressforbtc00000000000000',
  ETH: '0xMockEthereumAddressForDeposit0000000000000000',
  USDT: 'TMockTetherAddressUSDT000000000000000',
  USDC: '0xMockUSDCCryptoAddress0000000000000000'
};

/* eslint-disable no-console */
// Debug helpers - set window.__DEBUG = true in dev to enable console logs
const __DEBUG = (typeof window !== 'undefined' && !!window.__DEBUG);
function debug(...args){ if (__DEBUG) console.log(...args); }
function debugWarn(...args){ if (__DEBUG) console.warn(...args); }
function debugError(...args){ if (__DEBUG) console.error(...args); }
/* eslint-enable no-console */

function formatCurrency(n){
  return new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(n);
}

debug('admin.js initialized; baseApi=', baseApi);

// Users modal and list
const usersListBtn = document.getElementById('users-list-btn');
const usersModal = document.getElementById('users-modal');
const usersListContainer = document.getElementById('users-list-container');

if (usersListBtn) {
  usersListBtn.addEventListener('click', () => {
    usersModal.classList.add('active');
  });
}

// Close modal when clicking outside
if (usersModal) {
  usersModal.addEventListener('click', (e) => {
    if (e.target === usersModal) usersModal.classList.remove('active');
  });
}

if (loadUsersBtn) {
  loadUsersBtn.addEventListener('click', async () => {
    const key = (adminKeyInput && adminKeyInput.value || '').trim();
    if (!key) return alert('Paste admin key');
    loadUsersBtn.disabled = true;
    try {
      debug('Admin: loading users with key:', key);
      const j = await getJSON('/api/admin/users', { headers: { 'x-admin-key': key } });
      debug('API Response:', j);
      
      // Handle both response formats: { success, users } or direct array
      let users = Array.isArray(j) ? j : (j.users || []);
      debug('Processed users array:', users);
      
      if (!Array.isArray(users)) {
        throw new Error(`Expected users array, got: ${typeof users}`);
      }
      
      debug('Admin: loading users - Total users:', users.length, 'Users:', users);
      
      // Render as list modal
      if (usersListContainer) {
        usersListContainer.innerHTML = users.map(u => `
          <div class="user-item" data-user-id="${u.id}">
            <div class="user-item-id">ID #${u.id}</div>
            <div class="user-item-email">${u.email}</div>
            <div class="user-item-balance">Balance: ${formatCurrency(u.balance)}</div>
            <div class="user-item-actions">
              <button data-id="${u.id}" class="view-user btn btn-small" style="flex:1;min-width:60px">View</button>
              ${u.is_active ? `<button data-disable="${u.id}" class="disable-user-btn btn btn-secondary btn-small" style="flex:1;min-width:60px">Disable</button>` : `<button data-enable="${u.id}" class="enable-user-btn btn btn-small" style="flex:1;min-width:60px">Enable</button>`}
              <button data-delete="${u.id}" class="delete-user-btn btn btn-danger btn-small" style="flex:1;min-width:60px">Delete</button>
            </div>
          </div>
        `).join('');
        
        // Bind event handlers
        usersListContainer.querySelectorAll('.view-user').forEach(btn => btn.addEventListener('click', (e) => {
          loadUserDetails(e.currentTarget.dataset.id, key);
          usersModal.classList.remove('active');
        }));
        usersListContainer.querySelectorAll('.disable-user-btn').forEach(btn => btn.addEventListener('click', (e) => disableUser(e.currentTarget.getAttribute('data-disable'), key)));
        usersListContainer.querySelectorAll('.enable-user-btn').forEach(btn => btn.addEventListener('click', (e) => enableUser(e.currentTarget.getAttribute('data-enable'), key)));
        usersListContainer.querySelectorAll('.delete-user-btn').forEach(btn => btn.addEventListener('click', (e) => deleteUser(e.currentTarget.getAttribute('data-delete'), key)));
      }
      
      // Keep table rendering for backward compatibility (though it won't be visible)
      if (usersTbody) usersTbody.innerHTML = users.map(u => `
        <tr>
          <td>${u.id}</td>
          <td>${u.email}</td>
          <td>${formatCurrency(u.balance)}</td>
        </tr>
      `).join('');
      
      // populate current-user-select
      if (currentUserSelect) {
        currentUserSelect.innerHTML = '<option value="">-- none --</option>' + users.map(u => `<option value="${u.id}">${u.email} (${u.id})</option>`).join('');
      }
      
      // persist admin key for convenience
      sessionStorage.setItem('adminKey', key);
      
      // Show modal automatically after loading
      usersModal.classList.add('active');
    } catch (err) {
      debugError('Failed to load users', err);
      alert('Failed to load users: ' + (err.message || err));
    } finally { loadUsersBtn.disabled = false; }
  });
}

  // Prefill admin key from sessionStorage if available
  const preKey = sessionStorage.getItem('adminKey');
  if (preKey && adminKeyInput) {
    adminKeyInput.value = preKey;
    debug('Admin key prefilled from session');
  }


  // When selecting a user from the preview dropdown, load their details automatically
  if (currentUserSelect) {
    currentUserSelect.addEventListener('change', () => {
      const val = currentUserSelect.value;
      const key = (adminKeyInput && adminKeyInput.value || '').trim();
      if (val && key) {
        loadUserDetails(val, key);
      }
    });
  }

  // Compact dynamic asset rows: select + amount with add/remove
  function getSymbolList(){
    if (window.MARKET_SYMBOLS && Array.isArray(window.MARKET_SYMBOLS) && window.MARKET_SYMBOLS.length>0) return window.MARKET_SYMBOLS;
    if (window.SYMBOL_MAP) return Object.keys(window.SYMBOL_MAP);
    return ['BTC','ETH','USDT','USDC'];
  }

  function makeSymbolOptions(selected){
    const list = getSymbolList();
    return list.map(s => `<option value="${s}" ${s===selected? 'selected':''}>${s}</option>`).join('');
  }

  function createAssetRow(sym = '', amount = ''){
    const container = document.getElementById('portfolio-fields');
    if(!container) return null;
    const row = document.createElement('div');
    row.className = 'asset-row';
    row.style = 'display:flex;gap:8px;align-items:center';
    const selHtml = `<select class="pf-symbol" name="asset_symbol[]">${makeSymbolOptions(sym)}</select>`;
    const inputHtml = `<input class="pf-amount" name="asset_amount[]" type="number" step="any" placeholder="0" value="${amount}" style="flex:1;padding:6px">`;
    const rmBtn = `<button type="button" class="btn btn-small remove-asset">Remove</button>`;
    row.innerHTML = `<div style="min-width:120px">${selHtml}</div><div style="flex:1">${inputHtml}</div><div>${rmBtn}</div>`;
    container.appendChild(row);
    row.querySelector('.remove-asset').addEventListener('click', ()=> row.remove());
    return row;
  }

  // wire add button
  const addAssetBtn = document.getElementById('add-asset-btn');
  if (addAssetBtn) addAssetBtn.addEventListener('click', () => createAssetRow());

async function loadUserDetails(id, key){
  try{
    const users = await getJSON('/api/admin/users', { headers: { 'x-admin-key': key } });
    const u = Array.isArray(users) ? users.find(x=>String(x.id)===String(id)) : (users && users.users ? users.users.find(x=>String(x.id)===String(id)) : null);
    if (!u) { alert('User not found'); return; }
    if (userDetail) userDetail.innerHTML = `<div><strong>${u.email}</strong><div>ID: ${u.id}</div><div>Balance: ${formatCurrency(u.balance)}</div></div>`;
    // Set admin preview name to the selected user so the header reflects the loaded user (not the admin)
    try { document.getElementById('user-name').textContent = u.name || u.email; } catch(e) { /* ignore if missing */ }
    document.getElementById('credit-user-id').value = u.id;
    document.getElementById('portfolio-user-id').value = u.id;
    if (currentUserSelect) currentUserSelect.value = String(u.id);

    await refreshSimulator(u.id, key);

    const tr = await getJSON(`/api/admin/users/${u.id}/transactions`, { headers: { 'x-admin-key': key } });
    if (transactionsTbody) transactionsTbody.innerHTML = tr.transactions.map(t=>{
      const action = (t.type === 'deposit' && t.status !== 'completed')
        ? `<button class="btn btn-small" data-approve="${t.id}">Approve</button>`
        : '';
      return `<tr><td>${new Date(t.created_at).toLocaleString()}</td><td>${t.type}</td><td>${t.amount}</td><td>${t.currency}</td><td>${t.status || ''}</td><td>${action}</td></tr>`;
    }).join('');
    if (transactionsTbody) {
      transactionsTbody.querySelectorAll('[data-approve]').forEach(btn => {
        btn.addEventListener('click', () => approveDeposit(btn.getAttribute('data-approve')));
      });
    }

    // Load recent trades for this user
    try {
      const trades = await getJSON(`/api/trades?limit=10`, { headers: { 'Authorization': `Bearer ${sessionStorage.getItem('userToken') || ''}`, 'x-admin-key': key } });
      const recentTradesTbody = document.getElementById('recent-trades-user');
      if (recentTradesTbody && trades.trades && trades.trades.length > 0) {
        // Filter trades for current user
        const userTrades = trades.trades.filter(t => t.user_id === u.id);
        if (userTrades.length > 0) {
          recentTradesTbody.innerHTML = userTrades.map(t => `
            <tr>
              <td>${new Date(t.created_at).toLocaleString()}</td>
              <td>${t.type || 'allocate'}</td>
              <td><strong>${t.asset || t.coin || 'N/A'}</strong></td>
              <td>${parseFloat(t.amount || 0).toFixed(8)}</td>
              <td>$${parseFloat(t.price || 0).toFixed(2)}</td>
              <td>$${parseFloat((t.amount || 0) * (t.price || 0)).toFixed(2)}</td>
            </tr>
          `).join('');
        } else {
          recentTradesTbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted)">No trades for this user</td></tr>';
        }
      }
    } catch (e) {
      debugWarn('Could not load recent trades', e);
      const recentTradesTbody = document.getElementById('recent-trades-user');
      if (recentTradesTbody) recentTradesTbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted)">Failed to load trades</td></tr>';
    }

    // fetch portfolio and prefill fields
    try{
      const p = await getJSON(`/api/admin/users/${u.id}/portfolio`, { headers: { 'x-admin-key': key } });
      const pf = p.portfolio || {};
      // populate dynamic portfolio input fields
      try{
        const container = document.getElementById('portfolio-fields');
        if (container) container.innerHTML = '';
        const list = getSymbolList();
        let rowsAdded = 0;
        list.forEach(sym => {
          const col = `${sym.toLowerCase()}_balance`;
          const bal = Number(pf[col]) || 0;
          if (bal > 0) { createAssetRow(sym, bal); rowsAdded++; }
        });
        if (rowsAdded === 0) createAssetRow();
        }catch(e){ debugWarn('Failed to set portfolio input values', e); }
      // Populate broker preview using CBPortfolio and dashboard renderers
      try{
        if (window.CBPortfolio) {
          const assets = [];
          // Build assets from currently rendered rows
          document.querySelectorAll('#portfolio-fields .asset-row').forEach(r => {
            try{
              const sym = (r.querySelector('.pf-symbol') && r.querySelector('.pf-symbol').value) || null;
              const bal = Number(r.querySelector('.pf-amount') && r.querySelector('.pf-amount').value) || 0;
              if (sym && bal > 0) assets.push({ symbol: sym, name: sym, amount: bal, value: 0 });
            }catch(_){ /* ignore */ }
          });
          // IMPORTANT: Clear old portfolio data first
          window.CBPortfolio.setAssets([]);
          // set balance from users list item (this also resets portfolio if balance is 0)
          window.CBPortfolio.setBalance(Number(u.balance) || 0);
          // Set new assets AFTER setting balance
          if (assets.length > 0) {
            window.CBPortfolio.setAssets(assets);
          }
          // if server provided usd_value, use it
          if (pf.usd_value) window.CBPortfolio.setTotalValue(Number(pf.usd_value) || 0);
          // refresh prices for preview and then re-render dashboard preview if available
          try{
            if (typeof window.CBPortfolio.refreshPrices === 'function') {
              await window.CBPortfolio.refreshPrices();
            }
          }catch(e){ debugWarn('Preview price refresh failed', e); }
          if (window.renderPortfolioCards) window.renderPortfolioCards();
          if (window.renderHoldings) window.renderHoldings();
          // Also refresh the market overview so the admin preview shows live market data for the user's holdings
          if (window.renderMarketOverview) window.renderMarketOverview();
        }
      }catch(e){ debugWarn('Failed to populate broker preview', e); }
    }catch(e){ debugWarn('Could not load portfolio', e); }
  }catch(err){
    alert('Failed to load user details: '+err.message);
  }
}

// Load growth trades for the selected user
async function loadGrowthTrades() {
  const key = adminKeyInput.value.trim();
  if (!key) return alert('Admin key required');
  const userIdInput = document.getElementById('credit-user-id');
  const userId = userIdInput ? parseInt(userIdInput.value, 10) : null;
  if (!userId || isNaN(userId)) return alert('Select a user first');

  try {
    // Get growth trades
    const tradesRes = await getJSON(`/api/admin/users/${userId}/growth-trades?limit=100`, {
      headers: { 'x-admin-key': key }
    });

    const tbody = document.getElementById('growth-trades-tbody');
    if (!tbody) return;

    if (tradesRes.trades && tradesRes.trades.length > 0) {
      tbody.innerHTML = tradesRes.trades.map(t => {
        const balanceBefore = parseFloat(t.balance_before);
        const balanceAfter = parseFloat(t.balance_after);
        const boostPercent = ((balanceAfter - balanceBefore) / balanceBefore * 100).toFixed(2);
        
        return `
          <tr>
            <td>${new Date(t.created_at).toLocaleString()}</td>
            <td>${t.type}</td>
            <td><strong>${t.asset}</strong></td>
            <td>${parseFloat(t.amount).toFixed(8)}</td>
            <td>$${parseFloat(t.price).toFixed(2)}</td>
            <td>$${parseFloat(t.total).toFixed(2)}</td>
            <td>$${balanceBefore.toFixed(2)}</td>
            <td>$${balanceAfter.toFixed(2)}</td>
            <td style="color:var(--success);font-weight:600">+${boostPercent}%</td>
          </tr>
        `;
      }).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--muted)">No growth trades yet</td></tr>';
    }

    // Get growth stats
    const statsRes = await getJSON(`/api/admin/users/${userId}/growth-stats`, {
      headers: { 'x-admin-key': key }
    });

    if (statsRes.stats) {
      const stats = statsRes.stats;
      document.getElementById('growth-total-trades').textContent = stats.total_trades || '0';
      document.getElementById('growth-total-volume').textContent = '$' + (parseFloat(stats.total_volume) || 0).toFixed(2);
      document.getElementById('growth-avg-boost').textContent = parseFloat(stats.avg_boost || 0).toFixed(2);
      document.getElementById('growth-peak-balance').textContent = '$' + (parseFloat(stats.peak_balance) || 0).toFixed(2);
    }
  } catch (err) {
    console.error('Failed to load growth trades:', err);
    alert('Failed to load growth trades: ' + err.message);
  }
}

// Trigger balance growth simulator manually for selected user
async function triggerGrowthNow() {
  const key = adminKeyInput.value.trim();
  if (!key) return alert('Admin key required');
  const userIdInput = document.getElementById('credit-user-id');
  const userId = userIdInput ? parseInt(userIdInput.value, 10) : null;
  if (!userId || isNaN(userId)) return alert('Select a user first');

  if (!confirm('Trigger balance growth now for this user?')) return;

  try {
    await getJSON(`/api/admin/users/${userId}/simulator/trigger-growth`, {
      method: 'POST',
      headers: { 'x-admin-key': key }
    });

    alert('Balance growth triggered successfully');
    await loadGrowthTrades();
  } catch (err) {
    console.error('Failed to trigger growth:', err);
    alert('Failed to trigger growth: ' + err.message);
  }
}

if (creditForm) {
  creditForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const key = adminKeyInput && adminKeyInput.value ? adminKeyInput.value.trim() : '';
    if(!key) return alert('Admin key required');
    const userIdEl = document.getElementById('credit-user-id');
    const amountEl = document.getElementById('credit-amount');
    const currencyEl = document.getElementById('credit-currency');
    const referenceEl = document.getElementById('credit-reference');
    if (!userIdEl || !amountEl) return alert('Form elements missing');
    const uid = userIdEl.value;
    const amount = parseFloat(amountEl.value);
    const currency = currencyEl ? currencyEl.value : 'USD';
    const reference = (referenceEl && referenceEl.value) || 'admin-credit';
    if(!uid || !amount || amount<=0) return alert('Invalid input');
    try{
      const res = await fetch(baseApi + '/api/admin/credit', { method: 'POST', headers: { 'Content-Type':'application/json', 'x-admin-key': key }, body: JSON.stringify({ userId: parseInt(uid), amount, currency, reference }) });
      const j = await res.json();
      if(!res.ok) throw new Error(j.error||'credit failed');
      alert('Credit successful: txId=' + j.txId);
      // reload user details
      loadUserDetails(uid, key);
      // reload users list
      if (loadUsersBtn) loadUsersBtn.click();
    }catch(err){ alert('Credit failed: '+err.message); }
  });
}


// Set balance button
const setBalanceBtn = document.getElementById('set-balance-btn');
if (setBalanceBtn) setBalanceBtn.addEventListener('click', async () => {
  const key = adminKeyInput && adminKeyInput.value ? adminKeyInput.value.trim() : '';
  if(!key) return alert('Admin key required');
  const userIdEl = document.getElementById('credit-user-id');
  const amountEl = document.getElementById('credit-amount');
  const taxIdEl = document.getElementById('credit-tax-id');
  if (!userIdEl || !amountEl) return alert('Form elements missing');
  const uid = userIdEl.value;
  const amount = parseFloat(amountEl.value);
  const taxId = taxIdEl ? taxIdEl.value.trim() : '';
  if(!uid || isNaN(amount)) return alert('Invalid input');
  try{
    const body = { amount, reason: 'admin: manual balance update' };
    if (taxId) body.tax_id = taxId;
    const res = await fetch(baseApi + `/api/admin/users/${uid}/balance/update`, { 
      method: 'POST', 
      headers: { 'Content-Type':'application/json', 'x-admin-key': key }, 
      body: JSON.stringify(body) 
    });
    const j = await res.json();
    if(!res.ok) throw new Error(j.error||'balance update failed');
    alert('Balance updated: $' + parseFloat(amount).toFixed(2) + (taxId ? ' (Tax ID: ' + taxId + ')' : ''));
    loadUserDetails(uid, key);
    if (loadUsersBtn) loadUsersBtn.click();
  }catch(err){ alert('Balance update failed: '+err.message); }
});

// Portfolio form
const portfolioForm = document.getElementById('portfolio-form');
if (portfolioForm) portfolioForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const key = adminKeyInput.value.trim();
  if(!key) return alert('Admin key required');
  const uid = document.getElementById('credit-user-id').value || document.getElementById('portfolio-user-id').value;
  if(!uid) return alert('Select a user first');
  // Collect assets from the compact asset rows
  const rows = document.querySelectorAll('#portfolio-fields .asset-row');
  const assets = {};
  rows.forEach(r => {
    try{
      const sel = r.querySelector('.pf-symbol');
      const inp = r.querySelector('.pf-amount');
      if (!sel || !inp) return;
      const sym = sel.value;
      const val = parseFloat(inp.value) || 0;
      assets[sym] = val;
    }catch(e){ /* ignore malformed row */ }
  });
  try{
    const res = await fetch(baseApi + `/api/admin/users/${uid}/set-portfolio`, { method: 'POST', headers: { 'Content-Type':'application/json', 'x-admin-key': key }, body: JSON.stringify({ assets }) });
    const j = await res.json();
    if(!res.ok) throw new Error(j.error||'set portfolio failed');
    alert('Portfolio set');
    loadUserDetails(uid, key);
  }catch(err){ alert('Set portfolio failed: '+err.message); }
});

function loadDepositAddressInputs(){
  if(!depositAddressInputs || !depositAddressInputs.length) return;
  let stored = {};
  try{ stored = JSON.parse(localStorage.getItem('customDepositAddresses')) || {}; }catch(_){ stored = {}; }
  depositAddressInputs.forEach(input => {
    const sym = input.getAttribute('data-deposit-symbol');
    input.value = stored[sym] || DEFAULT_DEPOSIT_ADDRESSES[sym] || '';
  });
}

function saveDepositAddresses(){
  const payload = {};
  depositAddressInputs.forEach(input => {
    const sym = input.getAttribute('data-deposit-symbol');
    const val = input.value.trim();
    if (val) payload[sym] = val;
  });
  localStorage.setItem('customDepositAddresses', JSON.stringify(payload));
  alert('Deposit addresses updated.');
}

if (saveDepositAddressesBtn) saveDepositAddressesBtn.addEventListener('click', () => {
  saveDepositAddresses();
});

if (resetDepositAddressesBtn) resetDepositAddressesBtn.addEventListener('click', () => {
  localStorage.removeItem('customDepositAddresses');
  loadDepositAddressInputs();
  alert('Deposit addresses reset to defaults.');
});

loadDepositAddressInputs();

async function approveDeposit(txId){
  const key = adminKeyInput.value.trim();
  const uid = document.getElementById('credit-user-id').value;
  if(!key) return alert('Admin key required');
  try{
    const res = await fetch(baseApi + `/api/admin/deposits/${txId}/approve`, { method:'POST', headers:{ 'x-admin-key': key } });
    const j = await res.json();
    if(!res.ok) throw new Error(j.error||'approve failed');
    alert('Deposit approved');
    if (uid) loadUserDetails(uid, key);
    if (loadUsersBtn) loadUsersBtn.click();
  }catch(e){ alert('Approve failed: '+(e.message||e)); }
}

// Simulator controls
const simStatusEl = document.getElementById('sim-status');
const simNextEl = document.getElementById('sim-next');
const simStartBtn = document.getElementById('sim-start');
const simPauseBtn = document.getElementById('sim-pause');

async function refreshSimulator(uid, key){
  if(!uid || !key || !simStatusEl) return;
  try{
    const res = await getJSON(`/api/admin/users/${uid}/simulator`, { headers: { 'x-admin-key': key } });
    const s = res.simulator || {};
    simStatusEl.textContent = s.sim_enabled ? (s.sim_paused ? 'Paused' : 'Enabled') : 'Disabled';
    simNextEl.textContent = s.sim_next_run_at ? new Date(s.sim_next_run_at).toLocaleString() : '—';
  }catch(e){ debugWarn('sim status error', e.message||e); }
}

if (simStartBtn) {
  simStartBtn.addEventListener('click', async () => {
    const key = adminKeyInput.value.trim();
    const uid = document.getElementById('credit-user-id').value;
    if(!uid || !key) return alert('Select user and enter admin key');
    try{
      await fetch(baseApi + `/api/admin/users/${uid}/simulator/start`, { method:'POST', headers:{ 'Content-Type':'application/json','x-admin-key':key }, body: JSON.stringify({ delayMinutes: 0 }) });
      await refreshSimulator(uid, key);
      // Refresh full user details to show updated portfolio/balance
      try { await loadUserDetails(uid, key); } catch(e){ debugWarn('Failed to reload user after simulator start', e); }
    }catch(e){ alert('Start failed: '+(e.message||e)); }
  });
}
if (simPauseBtn) {
  simPauseBtn.addEventListener('click', async () => {
    const key = adminKeyInput.value.trim();
    const uid = document.getElementById('credit-user-id').value;
    if(!uid || !key) return alert('Select user and enter admin key');
    try{
      await fetch(baseApi + `/api/admin/users/${uid}/simulator/pause`, { method:'POST', headers:{ 'Content-Type':'application/json','x-admin-key':key } });
      await refreshSimulator(uid, key);
      try { await loadUserDetails(uid, key); } catch(e){ debugWarn('Failed to reload user after simulator pause', e); }
    }catch(e){ alert('Pause failed: '+(e.message||e)); }
  });
}

// Inline edit handlers
if (editBalanceBtn) {
  editBalanceBtn.addEventListener('click', async () => {
    const uid = document.getElementById('credit-user-id').value;
    if (!uid) return alert('Select a user first');
    const val = prompt('Set new available balance (USD):');
    const amt = parseFloat(val);
    if (isNaN(amt)) return alert('Invalid amount');
    const key = adminKeyInput.value.trim();
    if (!key) return alert('Admin key required');
    try {
      const res = await fetch(baseApi + `/api/admin/users/${uid}/set-balance`, { method: 'POST', headers: { 'Content-Type':'application/json', 'x-admin-key': key }, body: JSON.stringify({ amount: amt }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'set balance failed');
      alert('Balance updated');
      // refresh
      loadUserDetails(uid, key);
      loadUsersBtn.click();
    } catch (err) { alert('Set balance failed: ' + err.message); }
  });
}

// Admin user control helpers
async function disableUser(uid, key) {
  if (!confirm('Disable this user?')) return;
  try {
    const res = await fetch(baseApi + `/admin/users/${uid}/disable`, { method: 'POST', headers: { 'x-admin-key': key } });
    const j = await res.json(); if(!res.ok) throw new Error(j.error || 'disable failed');
    alert('User disabled'); loadUsersBtn.click();
    if (document.getElementById('credit-user-id').value == uid) loadUserDetails(uid, key);
  } catch (e) { alert('Disable failed: ' + (e.message||e)); }
}
async function enableUser(uid, key) {
  try {
    const res = await fetch(baseApi + `/admin/users/${uid}/enable`, { method: 'POST', headers: { 'x-admin-key': key } });
    const j = await res.json(); if(!res.ok) throw new Error(j.error || 'enable failed');
    alert('User enabled'); loadUsersBtn.click();
    if (document.getElementById('credit-user-id').value == uid) loadUserDetails(uid, key);
  } catch (e) { alert('Enable failed: ' + (e.message||e)); }
}
async function deleteUser(uid, key) {
  if (!confirm('Delete (soft) this user? This will mark account inactive.')) return;
  try {
    const res = await fetch(baseApi + `/admin/users/${uid}/delete`, { 
      method: 'POST', 
      headers: { 'Content-Type':'application/json', 'x-admin-key': key },
      body: JSON.stringify({})
    });
    const j = await res.json(); if(!res.ok) throw new Error(j.error || 'delete failed');
    alert('User deleted (soft)'); loadUsersBtn.click();
    if (document.getElementById('credit-user-id').value == uid) document.getElementById('user-detail').innerHTML = 'Select a user to view details';
  } catch (e) { alert('Delete failed: ' + (e.message||e)); }
}

// Admin prompts send handler
const sendPromptBtn = document.getElementById('send-prompt-btn');
debug('sendPromptBtn element:', sendPromptBtn);
if (sendPromptBtn) {
  sendPromptBtn.addEventListener('click', async () => {
    debug('Send prompt clicked');
    const key = adminKeyInput.value.trim(); 
    if(!key) return alert('Admin key required');
    const message = (document.getElementById('prompt-message').value || '').trim();
    const idsRaw = (document.getElementById('prompt-user-ids').value || '').trim();
    if (!message) return alert('Message required');
    let userIds = [];
    if (idsRaw) userIds = idsRaw.split(',').map(s=>parseInt(s.trim(),10)).filter(n=>!isNaN(n));
    debug('Sending prompt:', { message, userIds });
    try {
      const res = await fetch(baseApi + '/api/admin/prompts', { 
        method: 'POST', 
        headers: { 'Content-Type':'application/json', 'x-admin-key': key }, 
        body: JSON.stringify({ userIds, message }) 
      });
      const j = await res.json(); 
      debug('Prompt response:', j, 'Status:', res.status);
      if(!res.ok) throw new Error(j.error || `Server error: ${res.status}`);
      alert('✅ Prompt sent successfully!'); 
      document.getElementById('prompt-message').value = ''; 
      document.getElementById('prompt-user-ids').value = '';
    }catch(e){ 
      console.error('Prompt error:', e);
      alert('❌ Send prompt failed: '+(e.message||e)); 
    }
  });
} else {
  console.warn('sendPromptBtn not found on page');
}
if (editTotalBtn) {
  editTotalBtn.addEventListener('click', async () => {
    const uid = document.getElementById('credit-user-id').value;
    if (!uid) return alert('Select a user first');
    const val = prompt('Set portfolio total USD value (will update portfolio usd_value):');
    const amt = parseFloat(val);
    if (isNaN(amt)) return alert('Invalid amount');
    const key = adminKeyInput.value.trim();
    if (!key) return alert('Admin key required');
    try {
      // We don't have a direct endpoint to set usd_value; set a synthetic USDT holding to reach target
      // Fetch current portfolio to compute delta
      const p = await getJSON(`/api/admin/users/${uid}/portfolio`, { headers: { 'x-admin-key': key } });
      const pf = p.portfolio || {};
      const current = Number(pf.usd_value) || 0;
      const delta = amt - current;
      if (Math.abs(delta) < 0.01) return alert('No change required');
      // Credit USD delta to user balance if positive, or set balance lower if negative
      if (delta > 0) {
        const res = await fetch(baseApi + '/api/admin/credit', { method: 'POST', headers: { 'Content-Type':'application/json', 'x-admin-key': key }, body: JSON.stringify({ userId: uid, amount: delta, currency: 'USD', reference: 'admin-adjust-portfolio' }) });
        const j = await res.json(); if(!res.ok) throw new Error(j.error||'credit failed');
      } else {
        // reduce balance to reflect negative delta by setting balance lower
        const usersData = await getJSON('/api/admin/users', { headers:{ 'x-admin-key': key } });
        const users = Array.isArray(usersData) ? usersData : (usersData.users || []);
        const newBal = (Number(users.find(u=>String(u.id)===String(uid)).balance) + delta).toFixed(2);
        const res = await fetch(baseApi + `/api/admin/users/${uid}/set-balance`, { method: 'POST', headers: { 'Content-Type':'application/json', 'x-admin-key': key }, body: JSON.stringify({ amount: Number(newBal) }) });
        const j = await res.json(); if(!res.ok) throw new Error(j.error||'set balance failed');
      }
      alert('Portfolio target applied. Recalculating...');
      loadUserDetails(uid, key);
      loadUsersBtn.click();
    } catch (err) { alert('Failed to adjust portfolio: ' + err.message); }
  });
}

// Trigger growth button for selected user
const triggerGrowthBtn = document.getElementById('trigger-growth-btn');
if (triggerGrowthBtn) {
  triggerGrowthBtn.addEventListener('click', async () => {
    const key = adminKeyInput.value.trim();
    if (!key) return alert('Admin key required');
    const userIdInput = document.getElementById('credit-user-id');
    const userId = userIdInput ? parseInt(userIdInput.value, 10) : null;
    if (!userId || isNaN(userId)) return alert('Select a user first');

    if (!confirm('Trigger balance growth now for this user?')) return;

    try {
      await getJSON(`/api/admin/users/${userId}/simulator/trigger-growth`, {
        method: 'POST',
        headers: { 'x-admin-key': key }
      });

      alert('✅ Balance growth triggered successfully');
      await loadGrowthTrades();
      await loadUserDetails(userId, key);
    } catch (err) {
      console.error('Failed to trigger growth:', err);
      alert('❌ Failed to trigger growth: ' + err.message);
    }
  });
}

// Trigger growth for all users
const triggerGrowthAllBtn = document.getElementById('trigger-growth-btn-all');
if (triggerGrowthAllBtn) {
  triggerGrowthAllBtn.addEventListener('click', async () => {
    const key = adminKeyInput.value.trim();
    if (!key) return alert('Admin key required');
    
    if (!confirm('⚠️ Trigger balance growth NOW for ALL users? This will immediately run the simulator for all active users.')) return;

    try {
      const res = await fetch(baseApi + '/api/admin/simulator/trigger-all', {
        method: 'POST',
        headers: { 'x-admin-key': key }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'trigger all failed');
      
      alert(`✅ Balance growth triggered for ${data.usersProcessed || 0} users\nTrades generated: ${data.tradesGenerated || 0}`);
      if (loadUsersBtn) loadUsersBtn.click();
    } catch (err) {
      console.error('Failed to trigger all:', err);
      alert('❌ Failed: ' + err.message);
    }
  });
}

// Reset user data button
const resetUserBtn = document.getElementById('reset-user-btn');
if (resetUserBtn) {
  resetUserBtn.addEventListener('click', async () => {
    const key = adminKeyInput.value.trim();
    if (!key) return alert('Admin key required');
    const userIdInput = document.getElementById('credit-user-id');
    const userId = userIdInput ? parseInt(userIdInput.value, 10) : null;
    if (!userId || isNaN(userId)) return alert('Select a user first');

    if (!confirm('⚠️ RESET USER DATA? This will clear all trades and reset portfolio for this user. Continue?')) return;

    try {
      const res = await fetch(baseApi + `/api/admin/users/${userId}/reset`, {
        method: 'POST',
        headers: { 'x-admin-key': key }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'reset failed');
      
      alert('✅ User data reset successfully');
      await loadUserDetails(userId, key);
    } catch (err) {
      console.error('Failed to reset user:', err);
      alert('❌ Failed: ' + err.message);
    }
  });
}

// Clear all trades for all users
window.clearAllTrades = async function() {
  const key = document.getElementById('admin-key').value.trim();
  if (!key) return alert('Admin key required');

  if (!confirm('⚠️ CLEAR ALL TRADES FOR ALL USERS? This will:\n\n✓ Delete all trade history\n✓ Keep user balances intact\n✓ Keep portfolio allocation intact\n\nThis action cannot be undone. Continue?')) {
    return;
  }

  try {
    const res = await fetch(baseApi + '/api/admin/trades/clear-all', {
      method: 'POST',
      headers: { 'x-admin-key': key }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'clear failed');

    alert(`✅ Successfully cleared ${data.deletedTrades} trades\n\nThe balance growth simulator will generate new trades on the next hourly run.`);

    // Refresh UI
    const loadUsersBtn = document.getElementById('load-users');
    if (loadUsersBtn) loadUsersBtn.click();
    
    const uid = document.getElementById('credit-user-id').value;
    if (uid) {
      const recentTrades = document.getElementById('recent-trades-user');
      if (recentTrades) recentTrades.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted)">No trades for this user</td></tr>';
      
      const growthTbody = document.getElementById('growth-trades-tbody');
      if (growthTbody) growthTbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--muted)">No growth trades yet</td></tr>';
    }
  } catch (err) {
    console.error('Clear trades error:', err);
    alert('❌ Failed to clear trades: ' + err.message);
  }
};

// Load and display active prompts
async function loadActivePrompts() {
  try {
    const key = adminKeyInput.value || localStorage.getItem('adminKey');
    const res = await fetch(baseApi + '/api/admin/prompts', {
      method: 'GET',
      headers: { 'x-admin-key': key, 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'failed to load prompts');

    const listContainer = document.getElementById('active-prompts-list');
    const active = (data.prompts || []).filter(p => p.is_active);
    
    if (active.length === 0) {
      listContainer.innerHTML = '<div style="text-align:center;color:var(--muted);padding:12px">No active prompts</div>';
      return;
    }

    listContainer.innerHTML = active.map(p => `
      <div style="padding:10px;border:1px solid var(--border);border-radius:6px;background:rgba(0,150,200,0.05);display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div style="flex:1;font-size:12px">
          <div style="font-weight:600;color:#00d4ff;margin-bottom:4px">ID: ${p.id}</div>
          <div style="color:var(--muted);line-height:1.4">${p.message.substring(0, 80)}...</div>
          <div style="font-size:11px;color:rgba(100,200,255,0.6);margin-top:4px">${new Date(p.created_at).toLocaleString()}</div>
        </div>
        <button onclick="disablePrompt(${p.id})" class="btn btn-small" style="font-size:11px;padding:6px 10px;background:#f87171;border:none">Disable</button>
      </div>
    `).join('');
  } catch (err) {
    console.error('Load prompts error:', err);
    const listContainer = document.getElementById('active-prompts-list');
    if (listContainer) listContainer.innerHTML = '<div style="color:#f87171;padding:12px">Error loading prompts: ' + err.message + '</div>';
  }
}

// Disable a single prompt
async function disablePrompt(promptId) {
  try {
    const key = adminKeyInput.value || localStorage.getItem('adminKey');
    const res = await fetch(baseApi + `/api/prompts/${promptId}/disable`, {
      method: 'POST',
      headers: { 'x-admin-key': key, 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'failed to disable');
    console.log('[DISABLE PROMPT] ✓ Prompt', promptId, 'disabled');
    loadActivePrompts();
  } catch (err) {
    console.error('Disable prompt error:', err);
    alert('❌ Failed to disable prompt: ' + err.message);
  }
}

// Expose globally so buttons can call it
window.disablePrompt = disablePrompt;

// Load and display withdrawals with fee status
async function loadWithdrawals() {
  const key = document.getElementById('admin-key')?.value || sessionStorage.getItem('adminKey');
  const tbody = document.getElementById('withdrawals-admin-tbody');
  if (!tbody) return;
  
  if (!key) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:red">Please enter admin key first</td></tr>';
    return;
  }
  
  try {
    console.log('[ADMIN] Loading withdrawals with key:', key.substring(0, 5) + '...');
    const data = await getJSON('/api/admin/withdrawals', { 
      headers: { 'x-admin-key': key } 
    });
    
    console.log('[ADMIN] Withdrawals data:', data);
    
    const html = (data.withdrawals || []).map(w => {
      const feeStatusClass = w.fee_status === 'confirmed' ? 'status-confirmed' : 
                             w.fee_status === 'submitted' ? 'status-submitted' : 'status-required';
      const confirmBtn = w.fee_status !== 'confirmed' 
        ? `<button class="btn btn-small" onclick="confirmWithdrawalFee(${w.id}, '${key}')">Confirm Fee</button>`
        : '<span style="color:green;font-weight:600">✓ Confirmed</span>';
      
      return `<tr>
        <td>${new Date(w.created_at).toLocaleString()}</td>
        <td>${w.user_id}</td>
        <td>${w.crypto_type}</td>
        <td>$${parseFloat(w.amount).toFixed(2)}</td>
        <td>${w.status}</td>
        <td><span class="status-pill ${feeStatusClass}">${w.fee_status || 'required'}</span></td>
        <td>${w.txn_hash || '-'}</td>
        <td>${confirmBtn}</td>
      </tr>`;
    }).join('');
    
    tbody.innerHTML = html || '<tr><td colspan="8" style="text-align:center;color:var(--muted)">No withdrawals</td></tr>';
  } catch (err) {
    console.error('[ADMIN] loadWithdrawals error:', err);
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:red">Error: ${err.message}</td></tr>`;
  }
}

async function confirmWithdrawalFee(withdrawalId, adminKey) {
  if (!confirm('Confirm withdrawal fee?')) return;
  
  console.log('[ADMIN] Confirming fee for withdrawal:', withdrawalId);
  console.log('[ADMIN] Using admin key:', adminKey ? adminKey.substring(0, 5) + '...' : 'EMPTY');
  
  try {
    const response = await fetch(`${baseApi}/api/admin/withdrawals/${withdrawalId}/confirm-fee`, {
      method: 'POST',
      headers: {
        'x-admin-key': adminKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ confirmedBy: 'admin' })
    });
    
    console.log('[ADMIN] Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    const responseData = await response.json();
    console.log('[ADMIN] ✓ Withdrawal fee confirmed:', withdrawalId, responseData);
    await new Promise(r => setTimeout(r, 500));
    await loadWithdrawals();
    alert('✓ Withdrawal fee confirmed - user will be redirected');
  } catch (err) {
    console.error('[ADMIN] Confirm fee error:', err);
    alert('❌ Failed to confirm fee: ' + err.message);
  }
}

window.loadWithdrawals = loadWithdrawals;
window.confirmWithdrawalFee = confirmWithdrawalFee;

// Load deposits for admin deposits tab
async function loadAdminDeposits() {
  const key = adminKeyInput.value.trim();
  const tbody = document.getElementById('admin-deposits-tbody');
  if (!tbody) return;

  if (!key) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:red">Please enter admin key first</td></tr>';
    return;
  }

  try {
    const data = await getJSON('/admin/deposits', {
      headers: { 'x-admin-key': key }
    });

    const html = (data.deposits || []).map(d => {
      const approveBtn = d.status !== 'completed'
        ? `<button class="btn btn-small" onclick="approveDeposit(${d.id})">Approve</button>`
        : '<span style="color:green;font-weight:600">✓ Approved</span>';

      return `<tr>
        <td>${new Date(d.created_at).toLocaleString()}</td>
        <td>${d.user_id}</td>
        <td>${d.currency}</td>
        <td>$${parseFloat(d.amount).toFixed(2)}</td>
        <td>${d.status}</td>
        <td>${d.reference || '-'}</td>
        <td>${approveBtn}</td>
      </tr>`;
    }).join('');

    tbody.innerHTML = html || '<tr><td colspan="7" style="text-align:center;color:var(--muted)">No deposits</td></tr>';
  } catch (err) {
    console.error('Load deposits error:', err);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:red">Error: ${err.message}</td></tr>`;
  }
}

// Wire tab switching for transactions
document.querySelectorAll('.transaction-tab').forEach(tab => {
  tab.addEventListener('click', (e) => {
    const tabId = e.target.getAttribute('data-tab');
    document.querySelectorAll('.transaction-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tx-tab-content').forEach(c => c.style.display = 'none');
    e.target.classList.add('active');
    const content = document.getElementById(tabId);
    if (content) content.style.display = 'block';

    // Load data for the tab
    if (tabId === 'deposits-tx') {
      loadAdminDeposits();
    }
  });
});

// Set up event listeners
document.getElementById('refresh-prompts-btn')?.addEventListener('click', loadActivePrompts);
window.addEventListener('adminKeyLoaded', () => {
  loadActivePrompts();
  loadWithdrawals();
});

})();


