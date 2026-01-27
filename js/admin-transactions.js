// Admin Transaction Management for editable tables
(function() {
  // For admin tools, use the dynamic API base (fallback to localhost for dev)
  const apiBase = (typeof window !== 'undefined' && window.__apiBase) 
    ? window.__apiBase 
    : ((typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) 
      ? 'http://localhost:5001/api' 
      : `${window.location.origin}/api`);
  
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
  
  async function fetchTransactions(userId = null) {
    const key = getAdminKey();
    if (!key) {
      console.warn('Admin key not set');
      return;
    }
    
    try {
      let url = `${apiBase}/admin/transactions`;
      if (userId) {
        url = `${apiBase}/admin/users/${userId}/transactions`;
      }
      
      const res = await fetch(url, {
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
      let transactions = [];
      if (Array.isArray(data)) {
        transactions = data;
      } else if (data.transactions && Array.isArray(data.transactions)) {
        transactions = data.transactions;
      } else {
        console.warn('fetchTransactions: unexpected response format', data);
        transactions = [];
      }
      
      // Also fetch withdrawals
      let withdrawals = [];
      try {
        const withdrawalsRes = await fetch(`${apiBase}/admin/withdrawals`, {
          headers: {'x-admin-key': key}
        });
        if (withdrawalsRes.ok) {
          const withdrawalsData = await withdrawalsRes.json();
          withdrawals = withdrawalsData.withdrawals || [];
          // Convert withdrawals to transaction-like format
          withdrawals = withdrawals.map(w => ({
            id: w.id,
            user: w.user_id,
            type: 'withdrawal',
            amount: parseFloat(w.amount),
            status: w.status,
            method: w.crypto_type,
            date: w.created_at,
            txn_hash: w.txn_hash,
            crypto_address: w.crypto_address,
            fee_amount: w.fee_amount,
            fee_status: w.fee_status
          }));
        }
      } catch (err) {
        console.warn('Failed to fetch withdrawals:', err);
      }
      
      allTransactions = [...transactions, ...withdrawals];
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
          <button onclick="deleteTransaction('${t.id}')" style="padding:4px 8px;font-size:12px;background:#ef4444;color:white;border:none;border-radius:4px;cursor:pointer">Delete</button>
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
        <td>${t.user_id || t.user || '—'}</td>
        <td>${t.method || t.currency || '—'}</td>
        <td>${fmtMoney(t.amount || 0)}</td>
        <td><span style="padding:3px 8px;border-radius:4px;font-size:11px;background:${t.status==='completed'?'#10b981':'#fbbf24'};color:white">${t.status || 'pending'}</span></td>
        <td style="font-size:11px;font-family:monospace">${(t.txid || t.reference || '—').substring(0,12)}${t.txid && t.txid.length > 12 ? '...' : ''}</td>
        <td>
          <button onclick="editTransaction('${t.id || idx}')" style="padding:2px 4px;font-size:11px;margin-right:2px">Edit</button>
          ${t.status !== 'completed' ? `<button onclick="approveTransaction('${t.id || idx}', '${t.type}')" style="padding:2px 4px;font-size:11px;background:#10b981;color:white;border:none;border-radius:4px;cursor:pointer;margin-right:2px">Approve</button>` : ''}
          <button onclick="deleteTransaction('${t.id}')" style="padding:2px 4px;font-size:11px;background:#ef4444;color:white;border:none;border-radius:4px;cursor:pointer">Delete</button>
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
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--muted)">No withdrawals yet</td></tr>';
      return;
    }

    withdrawals.forEach((t, idx) => {
      const feeStatusClass = t.fee_status === 'confirmed'
        ? 'status-confirmed'
        : t.fee_status === 'submitted'
          ? 'status-submitted'
          : 'status-required';

      let actionBtns = '';
      if (t.status === 'pending' || t.status === 'processing') {
        actionBtns = `
          <button class="btn btn-small" style="background:#4CAF50" onclick="completeWithdrawal(${t.id})">Complete</button>
          <button class="btn btn-small" style="background:#ff9800" onclick="failWithdrawal(${t.id})">Failed</button>
          <button class="btn btn-small" style="background:#f44336" onclick="deleteWithdrawal(${t.id})">Delete</button>
        `;
      } else if (t.status === 'completed') {
        actionBtns = '<span style="color:green;font-weight:600">✓ Completed</span>';
      } else if (t.status === 'failed') {
        actionBtns = '<span style="color:red;font-weight:600">✗ Failed</span>';
      } else {
        actionBtns = '<span style="color:var(--muted)">—</span>';
      }

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${t.date ? new Date(t.date).toLocaleString() : '—'}</td>
        <td>${t.user || '—'}</td>
        <td>${t.method || '—'}</td>
        <td>${fmtMoney(t.amount || 0)}</td>
        <td><span style="padding:3px 8px;border-radius:4px;font-size:11px;background:${t.status==='completed'?'#10b981':t.status==='failed'?'#ef4444':'#fbbf24'};color:white">${t.status || 'pending'}</span></td>
        <td><span class="status-pill ${feeStatusClass}">${t.fee_status || 'required'}</span></td>
        <td>${t.txn_hash || '-'}</td>
        <td style="display:flex;gap:4px;flex-wrap:wrap">${actionBtns}</td>
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
          <button onclick="deleteTransaction('${t.id}')" style="padding:4px 8px;font-size:12px;background:#ef4444;color:white;border:none;border-radius:4px;cursor:pointer">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  }
  
  // Transaction CRUD functions
  async function deleteTransaction(id) {
    if (!confirm('Delete this transaction permanently?')) return;
    
    const key = getAdminKey();
    if (!key) return alert('Admin key required');
    
    try {
      const res = await fetch(`${apiBase}/admin/transactions/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': key }
      });
      if (!res.ok) throw new Error('Delete failed');
      alert('Transaction deleted');
      fetchTransactions(); // Refresh
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete: ' + err.message);
    }
  }
  
  async function editTransaction(id) {
    alert('Edit functionality not implemented yet');
  }
  
  async function confirmFee(id) {
    const key = getAdminKey();
    if (!key) return alert('Admin key required');
    
    try {
      const res = await fetch(`${apiBase}/admin/withdrawals/${id}/confirm-fee`, {
        method: 'POST',
        headers: { 'x-admin-key': key }
      });
      if (!res.ok) throw new Error('Confirm fee failed');
      alert('Fee confirmed');
      fetchTransactions(); // Refresh
    } catch (err) {
      console.error('Confirm fee error:', err);
      alert('Failed to confirm fee: ' + err.message);
    }
  }
  
  async function approveTransaction(id, type) {
    const key = getAdminKey();
    if (!key) return alert('Admin key required');
    
    try {
      if (type === 'withdrawal') {
        // For withdrawals, first confirm fee, then approve
        await fetch(`${apiBase}/admin/withdrawals/${id}/confirm-fee`, {
          method: 'POST',
          headers: { 'x-admin-key': key }
        });
        const res = await fetch(`${apiBase}/admin/withdrawals/${id}/approve`, {
          method: 'POST',
          headers: { 'x-admin-key': key }
        });
        if (!res.ok) throw new Error('Approve withdrawal failed');
        alert('Withdrawal approved (fee confirmed and completed)');
      } else {
        // For deposits
        const res = await fetch(`${apiBase}/admin/transactions/${id}/approve`, {
          method: 'POST',
          headers: { 'x-admin-key': key }
        });
        if (!res.ok) throw new Error('Approve failed');
        alert('Deposit approved');
      }
      fetchTransactions(); // Refresh
    } catch (err) {
      console.error('Approve error:', err);
      alert('Failed to approve: ' + err.message);
    }
  }
  
  // Expose functions globally
  window.ADMIN_TX = {
    fetchTransactions,
    renderAllTransactionTables,
    allTransactions
  };
  
  // Also expose individual functions
  window.deleteTransaction = deleteTransaction;
  window.editTransaction = editTransaction;
  window.approveTransaction = approveTransaction;
  
  // Auto-load transactions when admin key is available
  document.addEventListener('DOMContentLoaded', () => {
    const adminKey = getAdminKey();
    if (adminKey) {
      // Check if there's a selected user
      const selectedUserId = document.getElementById('current-user-select')?.value;
      fetchTransactions(selectedUserId || null);
    }
    
    // Watch for admin key changes
    const adminKeyInput = document.getElementById('admin-key');
    if (adminKeyInput) {
      adminKeyInput.addEventListener('change', () => {
        if (adminKeyInput.value) {
          sessionStorage.setItem('adminKey', adminKeyInput.value);
          const selectedUserId = document.getElementById('current-user-select')?.value;
          fetchTransactions(selectedUserId || null);
        }
      });
    }
    
    // Watch for user selection changes
    const userSelect = document.getElementById('current-user-select');
    if (userSelect) {
      userSelect.addEventListener('change', () => {
        const selectedUserId = userSelect.value;
        if (getAdminKey()) {
          fetchTransactions(selectedUserId || null);
        }
      });
    }
  });
})();
