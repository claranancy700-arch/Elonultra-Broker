// Admin Transaction Management for editable tables
(function() {
  // For admin tools, always talk directly to the Express API on localhost:5001
  const apiBase = 'http://localhost:5001/api';
  
  let allTransactions = [];
  
  function fmtMoney(v) {
    if (v >= 1) return `$${v.toLocaleString(undefined, {maximumFractionDigits: 2})}`;
    return `$${v.toFixed(6)}`;
  }
  
  function getTypeColor(type) {
    const colors = {
      'deposit': '#10b981',
      'withdrawal': '#f59e0b',
      'trade': '#2563eb'
    };
    return colors[type] || '#6b7280';
  }
  
  function getAdminKey() {
    return sessionStorage.getItem('adminKey') || document.getElementById('admin-key')?.value || '';
  }
  
  async function fetchTransactions() {
    const key = getAdminKey();
    if (!key) {
      console.warn('Admin key not set');
      return;
    }
    
    try {
      const res = await fetch(`${apiBase}/admin/transactions`, {
        headers: {'x-admin-key': key}
      });
      
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`fetch transactions failed: ${res.status} ${text.slice(0, 80)}`);
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text().catch(() => '');
        console.warn('fetchTransactions: received non-JSON response', text.slice(0, 80));
        return;
      }

      const data = await res.json();
      // Handle both direct array and {success, transactions} format
      if (Array.isArray(data)) {
        allTransactions = data;
      } else if (data.transactions && Array.isArray(data.transactions)) {
        allTransactions = data.transactions;
      } else {
        console.warn('fetchTransactions: unexpected response format', data);
        allTransactions = [];
      }
      renderAllTransactionTables();
    } catch(e) {
      console.warn('fetchTransactions failed', e);
    }
  }
  
  function renderAllTransactionTables() {
    renderAllTransactions();
    renderDeposits();
    renderWithdrawals();
    renderTrades();
  }
  
  function renderAllTransactions() {
    const tbody = document.getElementById('all-transactions-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    if (!allTransactions.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted)">No transactions yet</td></tr>';
      return;
    }
    
    allTransactions.forEach((t, idx) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${t.id || idx + 1}</td>
        <td>${t.user || '—'}</td>
        <td><span style="padding:2px 6px;border-radius:4px;font-size:11px;background:${getTypeColor(t.type)};color:white">${t.type || 'transfer'}</span></td>
        <td>${fmtMoney(t.amount || 0)}</td>
        <td>${t.date ? new Date(t.date).toLocaleDateString() : '—'}</td>
        <td><span style="padding:3px 8px;border-radius:4px;font-size:11px;background:${t.status==='completed'?'#10b981':'#fbbf24'};color:white">${t.status || 'pending'}</span></td>
        <td>
          <button onclick="editTransaction('${t.id || idx}')" style="padding:4px 8px;font-size:12px;margin-right:4px">Edit</button>
          <button onclick="deleteTransaction('${t.id || idx}')" style="padding:4px 8px;font-size:12px;background:#ef4444;color:white;border:none;border-radius:4px;cursor:pointer">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  }
  
  function renderDeposits() {
    const tbody = document.getElementById('deposits-admin-tbody');
    if (!tbody) return;
    
    const deposits = allTransactions.filter(t => t.type === 'deposit');
    tbody.innerHTML = '';
    
    if (!deposits.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted)">No deposits yet</td></tr>';
      return;
    }
    
    deposits.forEach((t, idx) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${t.date ? new Date(t.date).toLocaleDateString() : '—'}</td>
        <td>${t.user || '—'}</td>
        <td>${t.method || '—'}</td>
        <td>${fmtMoney(t.amount || 0)}</td>
        <td><span style="padding:3px 8px;border-radius:4px;font-size:11px;background:${t.status==='completed'?'#10b981':'#fbbf24'};color:white">${t.status || 'pending'}</span></td>
        <td style="font-size:11px;font-family:monospace">${(t.txid || '—').substring(0,12)}${t.txid && t.txid.length > 12 ? '...' : ''}</td>
        <td>
          <button onclick="editTransaction('${t.id || idx}')" style="padding:4px 8px;font-size:12px;margin-right:4px">Edit</button>
          ${t.status !== 'completed' ? `<button onclick="approveTransaction('${t.id || idx}')" style="padding:4px 8px;font-size:12px;background:#10b981;color:white;border:none;border-radius:4px;cursor:pointer;margin-right:4px">Approve</button>` : ''}
          <button onclick="deleteTransaction('${t.id || idx}')" style="padding:4px 8px;font-size:12px;background:#ef4444;color:white;border:none;border-radius:4px;cursor:pointer">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  }
  
  function renderWithdrawals() {
    const tbody = document.getElementById('withdrawals-admin-tbody');
    if (!tbody) return;
    
    const withdrawals = allTransactions.filter(t => t.type === 'withdrawal');
    tbody.innerHTML = '';
    
    if (!withdrawals.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted)">No withdrawals yet</td></tr>';
      return;
    }
    
    withdrawals.forEach((t, idx) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${t.date ? new Date(t.date).toLocaleDateString() : '—'}</td>
        <td>${t.user || '—'}</td>
        <td>${t.method || '—'}</td>
        <td>${fmtMoney(t.amount || 0)}</td>
        <td><span style="padding:3px 8px;border-radius:4px;font-size:11px;background:${t.status==='completed'?'#10b981':'#fbbf24'};color:white">${t.status || 'pending'}</span></td>
        <td style="font-size:11px;font-family:monospace">${(t.txid || '—').substring(0,12)}${t.txid && t.txid.length > 12 ? '...' : ''}</td>
        <td>
          <button onclick="editTransaction('${t.id || idx}')" style="padding:4px 8px;font-size:12px;margin-right:4px">Edit</button>
          ${t.status !== 'completed' ? `<button onclick="approveTransaction('${t.id || idx}')" style="padding:4px 8px;font-size:12px;background:#10b981;color:white;border:none;border-radius:4px;cursor:pointer;margin-right:4px">Approve</button>` : ''}
          <button onclick="deleteTransaction('${t.id || idx}')" style="padding:4px 8px;font-size:12px;background:#ef4444;color:white;border:none;border-radius:4px;cursor:pointer">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  }
  
  function renderTrades() {
    const tbody = document.getElementById('trades-admin-tbody');
    if (!tbody) return;
    
    const trades = allTransactions.filter(t => t.type === 'trade');
    tbody.innerHTML = '';
    
    if (!trades.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--muted)">No trades yet</td></tr>';
      return;
    }
    
    trades.forEach((t, idx) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${t.date ? new Date(t.date).toLocaleDateString() : '—'}</td>
        <td>${t.user || '—'}</td>
        <td><span style="padding:2px 6px;border-radius:4px;font-size:11px;background:${t.side==='buy'?'#10b981':'#ef4444'};color:white">${t.side || 'buy'}</span></td>
        <td>${t.asset || '—'}</td>
        <td>${t.amount || 0}</td>
        <td>${fmtMoney(t.price || 0)}</td>
        <td>${fmtMoney((t.amount || 0) * (t.price || 0))}</td>
        <td>
          <button onclick="editTransaction('${t.id || idx}')" style="padding:4px 8px;font-size:12px;margin-right:4px">Edit</button>
          <button onclick="deleteTransaction('${t.id || idx}')" style="padding:4px 8px;font-size:12px;background:#ef4444;color:white;border:none;border-radius:4px;cursor:pointer">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  }
  
  // Expose functions globally
  window.ADMIN_TX = {
    fetchTransactions,
    renderAllTransactionTables,
    allTransactions
  };
  
  // Auto-load transactions when admin key is available
  document.addEventListener('DOMContentLoaded', () => {
    const adminKey = getAdminKey();
    if (adminKey) {
      fetchTransactions();
    }
    
    // Watch for admin key changes
    const adminKeyInput = document.getElementById('admin-key');
    if (adminKeyInput) {
      adminKeyInput.addEventListener('change', () => {
        if (adminKeyInput.value) {
          sessionStorage.setItem('adminKey', adminKeyInput.value);
          fetchTransactions();
        }
      });
    }
  });
})();
