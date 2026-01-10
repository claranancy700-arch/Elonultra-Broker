(function(){
  // Scoped admin script to avoid leaking globals and duplicate declarations
  const baseApi = window.__apiBase || ((typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) ? `http://${location.hostname}:5001` : (location.origin || `http://localhost:5001`));

  async function getJSON(url, opts = {}) {
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

function safeEl(id){ return document.getElementById(id) || null; }

function formatCurrency(n){
  return new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(n);
}

console.log('admin.js initialized; baseApi=', baseApi);
if (loadUsersBtn) {
  loadUsersBtn.addEventListener('click', async () => {
    const key = (adminKeyInput && adminKeyInput.value || '').trim();
    if (!key) return alert('Paste admin key');
    loadUsersBtn.disabled = true;
    try {
      console.log('Admin: loading users');
      const j = await getJSON('/api/admin/users', { headers: { 'x-admin-key': key } });
      console.log('API Response - Total users:', j.users.length, 'Users:', j.users);
      if (usersTbody) usersTbody.innerHTML = j.users.map(u => `<tr><td>${u.id}</td><td>${u.email}</td><td>${formatCurrency(u.balance)}</td><td><button data-id="${u.id}" class="view-user btn btn-small">View</button></td></tr>`).join('');
      document.querySelectorAll('.view-user').forEach(btn => btn.addEventListener('click', (e) => loadUserDetails(e.target.dataset.id, key)));
      // populate current-user-select
      if (currentUserSelect) {
        currentUserSelect.innerHTML = '<option value="">-- none --</option>' + j.users.map(u => `<option value="${u.id}">${u.email} (${u.id})</option>`).join('');
      }
      // persist admin key for convenience
      sessionStorage.setItem('adminKey', key);
    } catch (err) {
      console.error('Failed to load users', err);
      alert('Failed to load users: ' + err.message);
    } finally { loadUsersBtn.disabled = false; }
  });
}

  // Prefill admin key from sessionStorage if available
  const preKey = sessionStorage.getItem('adminKey');
  if (preKey) {
    adminKeyInput.value = preKey;
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
    const selHtml = `<select class="pf-symbol">${makeSymbolOptions(sym)}</select>`;
    const inputHtml = `<input class="pf-amount" type="number" step="any" placeholder="0" value="${amount}" style="flex:1;padding:6px">`;
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
    const u = users.users.find(x=>String(x.id)===String(id));
    if (userDetail) userDetail.innerHTML = `<div><strong>${u.email}</strong><div>ID: ${u.id}</div><div>Balance: ${formatCurrency(u.balance)}</div></div>`;
    // Set admin preview name to the selected user so the header reflects the loaded user (not the admin)
    try { document.getElementById('user-name').textContent = u.name || u.email; } catch(e) { /* ignore if missing */ }
    document.getElementById('credit-user-id').value = u.id;
    document.getElementById('portfolio-user-id').value = u.id;
    if (currentUserSelect) currentUserSelect.value = String(u.id);

    const tr = await getJSON(`/api/admin/users/${u.id}/transactions`, { headers: { 'x-admin-key': key } });
    if (transactionsTbody) transactionsTbody.innerHTML = tr.transactions.map(t=>`<tr><td>${new Date(t.created_at).toLocaleString()}</td><td>${t.type}</td><td>${t.amount}</td><td>${t.currency}</td></tr>`).join('');

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
      }catch(e){ console.warn('Failed to set portfolio input values', e); }
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
            }catch(_){}
          });
          window.CBPortfolio.setAssets(assets);
          // set balance from users list item
          window.CBPortfolio.setBalance(Number(u.balance) || 0);
          // if server provided usd_value, use it
          if (pf.usd_value) window.CBPortfolio.setTotalValue(Number(pf.usd_value) || 0);
          // refresh prices for preview and then re-render dashboard preview if available
          try{
            if (typeof window.CBPortfolio.refreshPrices === 'function') {
              await window.CBPortfolio.refreshPrices();
            }
          }catch(e){ console.warn('Preview price refresh failed', e); }
          if (window.renderPortfolioCards) window.renderPortfolioCards();
          if (window.renderHoldings) window.renderHoldings();
          // Also refresh the market overview so the admin preview shows live market data for the user's holdings
          if (window.renderMarketOverview) window.renderMarketOverview();
        }
      }catch(e){ console.warn('Failed to populate broker preview', e); }
    }catch(e){ console.warn('Could not load portfolio', e); }
  }catch(err){
    alert('Failed to load user details: '+err.message);
  }
}

creditForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const key = adminKeyInput.value.trim();
  if(!key) return alert('Admin key required');
  const uid = document.getElementById('credit-user-id').value;
  const amount = parseFloat(document.getElementById('credit-amount').value);
  const currency = document.getElementById('credit-currency').value;
  const reference = document.getElementById('credit-reference').value || 'admin-credit';
  if(!uid || !amount || amount<=0) return alert('Invalid input');
  try{
    const res = await fetch(baseApi + '/api/admin/credit', { method: 'POST', headers: { 'Content-Type':'application/json', 'x-admin-key': key }, body: JSON.stringify({ userId: uid, amount, currency, reference }) });
    const j = await res.json();
    if(!res.ok) throw new Error(j.error||'credit failed');
    alert('Credit successful: txId=' + j.txId);
    // reload user details
    loadUserDetails(uid, key);
    // reload users list
    loadUsersBtn.click();
  }catch(err){ alert('Credit failed: '+err.message); }
});

// Set balance button
document.getElementById('set-balance-btn').addEventListener('click', async () => {
  const key = adminKeyInput.value.trim();
  if(!key) return alert('Admin key required');
  const uid = document.getElementById('credit-user-id').value;
  const amount = parseFloat(document.getElementById('credit-amount').value);
  if(!uid || isNaN(amount)) return alert('Invalid input');
  try{
    const res = await fetch(baseApi + `/api/admin/users/${uid}/set-balance`, { method: 'POST', headers: { 'Content-Type':'application/json', 'x-admin-key': key }, body: JSON.stringify({ amount }) });
    const j = await res.json();
    if(!res.ok) throw new Error(j.error||'set balance failed');
    alert('Balance set: ' + j.balance);
    loadUserDetails(uid, key);
    loadUsersBtn.click();
  }catch(err){ alert('Set balance failed: '+err.message); }
});

// Portfolio form
const portfolioForm = document.getElementById('portfolio-form');
portfolioForm.addEventListener('submit', async (e) => {
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
    }catch(e){}
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
        const newBal = (Number((await getJSON('/api/admin/users', { headers:{ 'x-admin-key': key } })).users.find(u=>String(u.id)===String(uid)).balance) + delta).toFixed(2);
        const res = await fetch(baseApi + `/api/admin/users/${uid}/set-balance`, { method: 'POST', headers: { 'Content-Type':'application/json', 'x-admin-key': key }, body: JSON.stringify({ amount: Number(newBal) }) });
        const j = await res.json(); if(!res.ok) throw new Error(j.error||'set balance failed');
      }
      alert('Portfolio target applied. Recalculating...');
      loadUserDetails(uid, key);
      loadUsersBtn.click();
    } catch (err) { alert('Failed to adjust portfolio: ' + err.message); }
  });
}

})();
