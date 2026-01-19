/* global AuthService */
// transactions.js — client-side deposit/withdraw logic (localStorage-backed)

// Determine API base dynamically
const API_BASE = (typeof window !== 'undefined' && window.__apiBase) 
  ? window.__apiBase 
  : ((typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1'))
    ? 'http://localhost:5001/api'
    : '/api');

function loadTransactions(){

  const tx = JSON.parse(localStorage.getItem('transactions')||'[]');
  return tx;
}

function saveTransactions(tx){
  localStorage.setItem('transactions', JSON.stringify(tx));
}

function getAuthToken(){
  try {
    if (window.AuthService && typeof AuthService.getToken === 'function') {
      const t = AuthService.getToken();
      if (t) return t;
    }
  } catch (_) { /* ignore if AuthService not present */ }
  return localStorage.getItem('authToken') || localStorage.getItem('token') || null; 
}

function clearTransactionCache(){
  localStorage.removeItem('transactions');
}

let transactionsLoaded = false;
let transactionsError = null;

function renderDeposits(){
  const tb = document.getElementById('deposits-tbody');
  const token = getAuthToken();
  if(!tb) return;

  if (!token) {
    tb.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted)">Log in to view deposits</td></tr>';
    return;
  }

  if (transactionsError) {
    tb.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#dc2626">${transactionsError}</td></tr>`;
    return;
  }

  const tx = loadTransactions().filter(t=>t.type==='deposit');
  if(!tx.length){
    const msg = transactionsLoaded ? 'No deposits yet' : 'Loading latest deposits...';
    tb.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--muted)">${msg}</td></tr>`;
    return;
  }
  tb.innerHTML = tx.map(t=>`<tr><td>${t.date||''}</td><td>${t.method||'-'}</td><td>${formatCurrency(Number(t.amount)||0)}</td><td>${t.status||'-'}</td><td>${t.txid||'-'}</td></tr>`).join('');
}

function renderWithdrawals(){
  const tb = document.getElementById('withdrawals-tbody');
  const token = getAuthToken();
  if(!tb) return;

  if (!token) {
    tb.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted)">Log in to view withdrawals</td></tr>';
    return;
  }
  if (transactionsError) {
    tb.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#dc2626">${transactionsError}</td></tr>`;
    return;
  }

  const tx = loadTransactions().filter(t=>t.type==='withdrawal');
  if(!tx.length){
    const msg = transactionsLoaded ? 'No withdrawals yet' : 'Loading latest withdrawals...';
    tb.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--muted)">${msg}</td></tr>`;
    return;
  }
  tb.innerHTML = tx.map(t=>`<tr><td>${t.date||''}</td><td>${t.method||'-'}</td><td>${formatCurrency(Number(t.amount)||0)}</td><td>${t.status||'-'}</td><td>${t.txid||'-'}</td></tr>`).join('');
}

function renderTrades(){
  const tb = document.getElementById('trades-tbody');
  const token = getAuthToken();
  if(!tb) return;

  if (!token) {
    tb.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted)">Log in to view trades</td></tr>';
    return;
  }
  if (transactionsError) {
    tb.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#dc2626">${transactionsError}</td></tr>`;
    return;
  }

  const tx = loadTransactions().filter(t=>t.type==='trade');
  if(!tx.length){
    const msg = transactionsLoaded ? 'No trades yet' : 'Loading latest trades...';
    tb.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--muted)">${msg}</td></tr>`;
    return;
  }
  tb.innerHTML = tx.map(t=>`<tr><td>${t.date||''}</td><td>${t.side||'-'}</td><td>${t.asset||'-'}</td><td>${t.amount||'-'}</td><td>${t.price||'-'}</td><td>${formatCurrency(Number(t.total)||0)}</td></tr>`).join('');
}

function formatCurrency(n){
  return new Intl.NumberFormat(undefined,{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n);
}

// Quick deposit/withdraw popups — create simple modal forms dynamically
function createModal(html, onSubmit){
  const wrap = document.createElement('div');
  wrap.style.position='fixed';wrap.style.left=0;wrap.style.top=0;wrap.style.right=0;wrap.style.bottom=0;wrap.style.background='rgba(0,0,0,0.35)';wrap.style.display='flex';wrap.style.alignItems='center';wrap.style.justifyContent='center';wrap.style.zIndex=9999;
  const card = document.createElement('div');
  card.style.background='var(--card)';card.style.padding='20px';card.style.borderRadius='8px';card.style.minWidth='320px';card.innerHTML = html;
  wrap.appendChild(card);
  document.body.appendChild(wrap);
  const form = card.querySelector('form');
  card.querySelector('.cancel')?.addEventListener('click', ()=>wrap.remove());
  form?.addEventListener('submit', (e)=>{
    e.preventDefault();
    onSubmit(new FormData(form));
    wrap.remove();
  });
}

function openDepositForm(){
  createModal(`
    <h3 style="margin-top:0">Add Funds</h3>
    <form>
      <label style="display:flex;flex-direction:column;margin-bottom:8px"><span>Amount (USD)</span><input name="amount" type="number" step="0.01" required></label>
      <label style="display:flex;flex-direction:column;margin-bottom:8px"><span>Method</span><select name="method"><option>Bank Transfer</option><option>Card</option><option>Crypto Transfer</option></select></label>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
        <button type="button" class="btn btn-secondary cancel">Cancel</button>
        <button type="submit" class="btn">Deposit</button>
      </div>
    </form>
  `, async (formData)=>{
    const amount = parseFloat(formData.get('amount'))||0;
    const method = formData.get('method');
    const now = new Date().toLocaleString();

    // Try API deposit first
    try{
      const token = getAuthToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(API_BASE + '/transactions/deposit',{method:'POST',headers,body:JSON.stringify({amount,method})});
      if(res.ok){
        // refresh transactions from server
        await fetchAndRenderTransactions();
        renderBalancesUI();
        return;
      }
    }catch(e){/*ignore and fallback*/}

    // Fallback to localStorage
    const tx = loadTransactions();
    tx.unshift({id:Date.now(),type:'deposit',date:now,method,amount,status:'Completed',txid: 'DEP'+Math.random().toString(36).slice(2,10)});
    saveTransactions(tx);
    applyBalanceChange(amount);
    renderDeposits();
    renderBalancesUI();
  });
}

function openWithdrawForm(){
  createModal(`
    <h3 style="margin-top:0">Withdraw Funds</h3>
    <form>
      <label style="display:flex;flex-direction:column;margin-bottom:8px"><span>Amount (USD)</span><input name="amount" type="number" step="0.01" required></label>
      <label style="display:flex;flex-direction:column;margin-bottom:8px"><span>Method</span><select name="method"><option>Bank Transfer</option><option>Crypto Transfer</option></select></label>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
        <button type="button" class="btn btn-secondary cancel">Cancel</button>
        <button type="submit" class="btn btn-danger">Withdraw</button>
      </div>
    </form>
  `, async (formData)=>{
    const amount = parseFloat(formData.get('amount'))||0;
    const method = formData.get('method');

    // Try API withdraw first
    try{
      const token = getAuthToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(API_BASE + '/transactions/withdraw',{method:'POST',headers,body:JSON.stringify({amount,method})});
      if(res.ok){
        await fetchAndRenderTransactions();
        renderBalancesUI();
        return;
      }
      const j = await res.json();
      alert(j.error||'Withdrawal failed');
      return;
    }catch(e){/*ignore and fallback*/}

    // Get current balance from server/cache, not localStorage
    let balance = 0;
    try {
      const profile = await AuthService.fetchUserProfile();
      balance = parseFloat(profile.balance) || 0;
    } catch (e) {
      // Fallback to localStorage if profile fetch fails
      balance = parseFloat(localStorage.getItem('balance')||'0');
    }
    
    if(amount > balance){ alert('Insufficient balance'); return }
    const tx = loadTransactions();
    const now = new Date().toLocaleString();
    tx.unshift({id:Date.now(),type:'withdrawal',date:now,method,amount,status:'Completed',txid: 'WDL'+Math.random().toString(36).slice(2,10)});
    saveTransactions(tx);
    applyBalanceChange(-amount);
    renderWithdrawals();
    renderBalancesUI();
  });
}

function applyBalanceChange(delta){
  // Update localStorage for UI consistency (will be overridden by server on next fetch)
  const b = parseFloat(localStorage.getItem('balance')||'0');
  const newBalance = b + delta;
  localStorage.setItem('balance', String(newBalance.toFixed(2)));
  
  // Try to sync with server if possible
  if (typeof AuthService !== 'undefined' && AuthService.isAuthenticated()) {
    // In a real scenario, you'd have an endpoint to update balance
    // For now, just mark that local balance changed and needs refresh
    if (typeof window.syncBalanceWithServer === 'function') {
      window.syncBalanceWithServer();
    }
  }
}

function renderBalancesUI(){
  // find elements with data-balance target and update
  document.querySelectorAll('[data-balance]').forEach(el=>{
    // Try to get balance from server first, fall back to localStorage
    let balance = parseFloat(localStorage.getItem('balance')||'0');
    
    // If AuthService is available, try to get server balance
    if (typeof AuthService !== 'undefined') {
      try {
        // Note: This is synchronous UI render, so we can't await here
        // The balance will be updated when profile_update SSE event arrives
        // For now, use cached balance
      } catch (e) { /* use fallback */ }
    }
    
    el.textContent = new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(balance);
  });
}

// Tab + logout helpers (needed by transactions.html inline handlers)
function switchTab(e, tabId){
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  if (e && e.target) e.target.classList.add('active');
  const target = document.getElementById(tabId);
  if (target) target.classList.add('active');
}
function logout(){
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  window.location.href = '/login.html';
}
window.switchTab = switchTab;
window.logout = logout;

async function fetchAndRenderTransactions(){
  const token = getAuthToken();
  if (!token) {
    transactionsLoaded = false;
    transactionsError = null;
    clearTransactionCache();
    renderDeposits();
    renderWithdrawals();
    renderTrades();
    return;
  }

  try{
    transactionsError = null;
    const headers = { Authorization: `Bearer ${token}` };
    const res = await fetch(API_BASE + '/transactions', { headers });
    if(!res.ok) {
      transactionsLoaded = true;
      transactionsError = 'Unable to load transactions (HTTP ' + res.status + ')';
      clearTransactionCache();
      renderDeposits();
      renderWithdrawals();
      renderTrades();
      return;
    }
    const j = await res.json();
    const txs = j.transactions||[];
    // Map API format to display format
    const mapped = txs.map(t=>{
      const rawDate = t.createdAt || t.created_at || t.date;
      const dateStr = rawDate ? new Date(rawDate).toLocaleString() : '';
      const type = (t.type || '').toLowerCase();
      if(type === 'deposit') {
        return {
          id: t.id,
          type: 'deposit',
          date: dateStr,
          method: t.method || 'Bank Transfer',
          amount: t.amount,
          status: t.status || 'Completed',
          txid: t.txid || t.reference || t.id
        };
      }
      if(type === 'withdrawal') {
        return {
          id: t.id,
          type: 'withdrawal',
          date: dateStr,
          method: t.method || 'Bank Transfer',
          amount: t.amount,
          status: t.status || 'Completed',
          txid: t.txid || t.reference || t.id
        };
      }
      if(type === 'buy')  return {id:t.id,type:'trade',side:'buy', asset:t.symbol,amount:t.amount,price:t.price,total:t.total,date:dateStr};
      if(type === 'sell') return {id:t.id,type:'trade',side:'sell',asset:t.symbol,amount:t.amount,price:t.price,total:t.total,date:dateStr};
      return null;
    }).filter(t=>t);
    transactionsLoaded = true;
    localStorage.setItem('transactions',JSON.stringify(mapped));
    renderDeposits();
    renderWithdrawals();
    renderTrades();
  }catch(e){
    console.warn('Could not fetch transactions from API',e);
    transactionsLoaded = true;
    transactionsError = 'Unable to load transactions. Please try again later.';
    clearTransactionCache();
    renderDeposits();
    renderWithdrawals();
    renderTrades();
  }
}

// init
window.addEventListener('DOMContentLoaded', ()=>{
  // wire Add/Withdraw buttons if present
  document.querySelectorAll('button').forEach(btn=>{
    if(btn.textContent.trim()==='Add Funds'){ btn.addEventListener('click', openDepositForm) }
    if(btn.textContent.trim()==='Withdraw Funds'){ btn.addEventListener('click', openWithdrawForm) }
  });
  renderDeposits();
  renderWithdrawals();
  renderTrades();
  fetchAndRenderTransactions();
  renderBalancesUI();
});
