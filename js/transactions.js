// transactions.js — client-side deposit/withdraw logic (localStorage-backed)

function loadTransactions(){
  const tx = JSON.parse(localStorage.getItem('transactions')||'[]');
  return tx;
}

function saveTransactions(tx){
  localStorage.setItem('transactions', JSON.stringify(tx));
}

async function renderDeposits(){
  const tb = document.getElementById('deposits-tbody');
  // Try to fetch from API
  try{
    const res = await fetch('http://localhost:5000/api/transactions');
    if(res.ok){
      const j = await res.json();
      const tx = (j.transactions||[]).filter(t=>t.type==='DEPOSIT' || t.type==='deposit');
      if(!tx.length){ tb.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted)">No deposits yet</td></tr>'; return }
      tb.innerHTML = tx.map(t=>`<tr><td>${t.createdAt||t.date||''}</td><td>${t.method||'-'}</td><td>${formatCurrency(t.amount)}</td><td>${t.status||'Completed'}</td><td>${t.txid||t.id||'-'}</td></tr>`).join('');
      return;
    }
  }catch(e){/*fallback*/}

  const tx = loadTransactions().filter(t=>t.type==='deposit');
  if(!tx.length){ tb.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted)">No deposits yet</td></tr>'; return }
  tb.innerHTML = tx.map(t=>`<tr><td>${t.date}</td><td>${t.method}</td><td>${formatCurrency(t.amount)}</td><td>${t.status}</td><td>${t.txid||'-'}</td></tr>`).join('');
}

function renderWithdrawals(){
  const tb = document.getElementById('withdrawals-tbody');
  const tx = loadTransactions().filter(t=>t.type==='withdrawal');
  if(!tx.length){ tb.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted)">No withdrawals yet</td></tr>'; return }
  tb.innerHTML = tx.map(t=>`<tr><td>${t.date}</td><td>${t.method}</td><td>${formatCurrency(t.amount)}</td><td>${t.status}</td><td>${t.txid||'-'}</td></tr>`).join('');
}

function renderTrades(){
  const tb = document.getElementById('trades-tbody');
  const tx = loadTransactions().filter(t=>t.type==='trade');
  if(!tx.length){ tb.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted)">No trades yet</td></tr>'; return }
  tb.innerHTML = tx.map(t=>`<tr><td>${t.date}</td><td>${t.side}</td><td>${t.asset}</td><td>${t.amount}</td><td>${t.price}</td><td>${formatCurrency(t.total)}</td></tr>`).join('');
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
      const res = await fetch('http://localhost:5000/api/transactions/deposit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount,method})});
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
      const res = await fetch('http://localhost:5000/api/transactions/withdraw',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount,method})});
      if(res.ok){
        await fetchAndRenderTransactions();
        renderBalancesUI();
        return;
      }
      const j = await res.json();
      alert(j.error||'Withdrawal failed');
      return;
    }catch(e){/*ignore and fallback*/}

    const balance = parseFloat(localStorage.getItem('balance')||'0');
    if(amount>balance){ alert('Insufficient balance'); return }
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
  const b = parseFloat(localStorage.getItem('balance')||'0');
  localStorage.setItem('balance', String((b + delta).toFixed(2)));
}

function renderBalancesUI(){
  // find elements with data-balance target and update
  document.querySelectorAll('[data-balance]').forEach(el=>{
    const b = parseFloat(localStorage.getItem('balance')||'0');
    el.textContent = new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(b);
  });
}

async function fetchAndRenderTransactions(){
  try{
    const res = await fetch('http://localhost:5000/api/transactions');
    if(!res.ok) return;
    const j = await res.json();
    const txs = j.transactions||[];
    // Map API format to display format
    const mapped = txs.map(t=>{
      let type = t.type.toLowerCase();
      if(type === 'deposit') return {id:t.id,type:'deposit',date:new Date(t.createdAt).toLocaleString(),method:'API',amount:t.amount,status:'Completed',txid:t.id};
      if(type === 'withdrawal') return {id:t.id,type:'withdrawal',date:new Date(t.createdAt).toLocaleString(),method:'API',amount:t.amount,status:'Completed',txid:t.id};
      if(type === 'buy') return {id:t.id,type:'trade',side:'buy',asset:t.symbol,amount:t.amount,price:t.price,total:t.total,date:new Date(t.createdAt).toLocaleString()};
      if(type === 'sell') return {id:t.id,type:'trade',side:'sell',asset:t.symbol,amount:t.amount,price:t.price,total:t.total,date:new Date(t.createdAt).toLocaleString()};
      return null;
    }).filter(t=>t);
    // Update localStorage cache if desired
    localStorage.setItem('transactions',JSON.stringify(mapped));
    renderDeposits();
    renderWithdrawals();
    renderTrades();
  }catch(e){
    console.warn('Could not fetch transactions from API',e);
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
  renderBalancesUI();
});
