import React, { useState, useEffect } from 'react';
import './TransactionsPage.css';
import { Link } from 'react-router-dom';
import API from '../../../services/api';

export const TransactionsPage = () => {
  const [activeTab, setActiveTab] = useState('deposits');
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  const formatDate = (dateStr) => {
    if (!dateStr) return { main: 'N/A', time: '' };
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { main: 'N/A', time: '' };
      return {
        main: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
    } catch {
      return { main: 'N/A', time: '' };
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [depRes, withRes, tradeRes] = await Promise.all([
          API.get('/transactions?type=deposit'),
          API.get('/withdrawals'),
          API.get('/trades'),
        ]);
        setDeposits(depRes.data?.transactions || []);
        setWithdrawals(withRes.data?.withdrawals || []);
        setTrades(tradeRes.data?.trades || []);
      } catch (err) {
        console.error('Failed to fetch transaction data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getAssetDotClass = (asset) => {
    const sym = (asset || '').toUpperCase();
    if (sym === 'BTC') return 'dot-btc';
    if (sym === 'ETH') return 'dot-eth';
    if (sym === 'SOL') return 'dot-sol';
    return 'dot-usd';
  };

  const getAssetSymbol = (asset) => {
    const sym = (asset || '').toUpperCase();
    if (sym === 'BTC') return '₿';
    if (sym === 'ETH') return 'Ξ';
    if (sym === 'SOL') return '◎';
    return '$';
  };

  const StatusBadge = ({ status }) => (
    <span className={`tx-status ${(status || 'pending').toLowerCase()}`}>
      {status || 'Pending'}
    </span>
  );

  const EmptyRow = ({ colSpan, msg }) => (
    <tr>
      <td colSpan={colSpan}>
        <div className="tx-empty">{msg}</div>
      </td>
    </tr>
  );

  return (
    <div className="tx-page">

      {/* â”€â”€ HEADER â”€â”€ */}
      <div className="tx-header">
        <div className="tx-header-left">
          <div className="tx-page-label">Account Activity</div>
          <h1 className="tx-page-title">Transactions</h1>
          <p className="tx-page-sub">Deposits, withdrawals &amp; trade history</p>
        </div>
        <div className="tx-header-actions">
          <Link to="/deposit" className="tx-btn primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span className="btn-label">Add Funds</span>
          </Link>
        </div>
      </div>

      {/* â”€â”€ TABS â”€â”€ */}
      <div className="tx-tabs">
        <button
          className={`tx-tab${activeTab === 'deposits' ? ' active' : ''}`}
          onClick={() => setActiveTab('deposits')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
          </svg>
          Deposits <span className="tx-tab-count">{deposits.length}</span>
        </button>
        <button
          className={`tx-tab${activeTab === 'withdrawals' ? ' active' : ''}`}
          onClick={() => setActiveTab('withdrawals')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>
          </svg>
          Withdrawals <span className="tx-tab-count">{withdrawals.length}</span>
        </button>
        <button
          className={`tx-tab${activeTab === 'trades' ? ' active' : ''}`}
          onClick={() => setActiveTab('trades')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/>
            <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
          </svg>
          Trades <span className="tx-tab-count">{trades.length}</span>
        </button>
      </div>

      {loading ? (
        <div className="tx-loading">
          <div className="tx-loading-spinner"/>
          <span>Loading transactions…</span>
        </div>
      ) : (
        <>
          {/* â”€â”€ DEPOSITS â”€â”€ */}
          {activeTab === 'deposits' && (
            <div className="table-wrapper">
              <div className="table-header">
                <div className="table-header-left">
                  <div className="table-header-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
                    </svg>
                  </div>
                  <div className="table-header-meta">
                    <h3>Deposit History</h3>
                    <span className="table-header-badge">{deposits.length} records</span>
                  </div>
                </div>
                <Link to="/deposit" className="table-action-link">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add Funds
                </Link>
              </div>
              <div className="tx-desktop-table">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th className="col-method">Method</th>
                      <th>Asset</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th className="col-txid">Transaction ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deposits.length ? deposits.map((item, idx) => {
                      const { main, time } = formatDate(item.created_at);
                      return (
                        <tr key={idx}>
                          <td>
                            <div className="tx-date">
                              <span className="tx-date-main">{main}</span>
                              <span className="tx-date-time">{time}</span>
                            </div>
                          </td>
                          <td className="col-method">
                            <span className="tx-method">{item.method || item.type || 'Transfer'}</span>
                          </td>
                          <td>
                            <div className="tx-asset">
                              <div className={`tx-asset-dot ${getAssetDotClass(item.asset)}`}>{getAssetSymbol(item.asset)}</div>
                              <span className="tx-asset-name">{(item.asset || 'USD').toUpperCase()}</span>
                            </div>
                          </td>
                          <td><span className="tx-amount pos">+{(Number(item.amount) || 0).toFixed(2)}</span></td>
                          <td><StatusBadge status={item.status} /></td>
                          <td className="col-txid">
                            <span className="tx-txid" title={item.txid || item.tx_id || item.id}>
                              {item.txid || item.tx_id || item.id || 'N/A'}
                            </span>
                          </td>
                        </tr>
                      );
                    }) : <EmptyRow colSpan={6} msg="No deposits yet" />}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="tx-mobile-list">
                {deposits.length ? deposits.map((item, idx) => {
                  const { main, time } = formatDate(item.created_at);
                  return (
                    <div key={idx} className="tx-mobile-item">
                      <div className="tx-mobile-icon dep">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
                        </svg>
                      </div>
                      <div className="tx-mobile-info">
                        <div className="tx-mobile-title">
                          {(item.asset || 'USD').toUpperCase()} Deposit
                          <StatusBadge status={item.status} />
                        </div>
                        <div className="tx-mobile-sub">{main} {time}</div>
                      </div>
                      <div className="tx-mobile-right">
                        <div className="tx-mobile-amount pos">+{(Number(item.amount) || 0).toFixed(2)}</div>
                        <div className="tx-mobile-pl">{item.method || 'Transfer'}</div>
                      </div>
                    </div>
                  );
                }) : <div className="tx-empty" style={{ padding: '28px 16px' }}>No deposits yet</div>}
              </div>
            </div>
          )}

          {/* â”€â”€ WITHDRAWALS â”€â”€ */}
          {activeTab === 'withdrawals' && (
            <div className="table-wrapper">
              <div className="table-header">
                <div className="table-header-left">
                  <div className="table-header-icon th-danger">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>
                    </svg>
                  </div>
                  <div className="table-header-meta">
                    <h3>Withdrawal History</h3>
                    <span className="table-header-badge">{withdrawals.length} records</span>
                  </div>
                </div>
                <Link to="/withdrawals" className="table-action-link th-danger">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>
                  </svg>
                  Withdraw
                </Link>
              </div>
              <div className="tx-desktop-table">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th className="col-method">Method</th>
                      <th>Asset</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th className="col-txid">Transaction ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.length ? withdrawals.map((item, idx) => {
                      const { main, time } = formatDate(item.created_at);
                      return (
                        <tr key={idx}>
                          <td>
                            <div className="tx-date">
                              <span className="tx-date-main">{main}</span>
                              <span className="tx-date-time">{time}</span>
                            </div>
                          </td>
                          <td className="col-method">
                            <span className="tx-method">{item.crypto_type || 'Crypto'}</span>
                          </td>
                          <td>
                            <div className="tx-asset">
                              <div className={`tx-asset-dot ${getAssetDotClass(item.crypto_type)}`}>{getAssetSymbol(item.crypto_type)}</div>
                              <span className="tx-asset-name">{(item.crypto_type || 'USD').toUpperCase()}</span>
                            </div>
                          </td>
                          <td><span className="tx-amount neg">-{(Number(item.amount) || 0).toFixed(2)}</span></td>
                          <td><StatusBadge status={item.status} /></td>
                          <td className="col-txid">
                            <span className="tx-txid" title={String(item.id)}>
                              {item.id || 'N/A'}
                            </span>
                          </td>
                        </tr>
                      );
                    }) : <EmptyRow colSpan={6} msg="No withdrawals yet" />}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="tx-mobile-list">
                {withdrawals.length ? withdrawals.map((item, idx) => {
                  const { main, time } = formatDate(item.created_at);
                  return (
                    <div key={idx} className="tx-mobile-item">
                      <div className="tx-mobile-icon with">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>
                        </svg>
                      </div>
                      <div className="tx-mobile-info">
                        <div className="tx-mobile-title">
                          {(item.crypto_type || 'Crypto').toUpperCase()} Withdrawal
                          <StatusBadge status={item.status} />
                        </div>
                        <div className="tx-mobile-sub">{main} {time}</div>
                      </div>
                      <div className="tx-mobile-right">
                        <div className="tx-mobile-amount neg">-{(Number(item.amount) || 0).toFixed(2)}</div>
                        <div className="tx-mobile-pl">{item.crypto_type || 'Crypto'}</div>
                      </div>
                    </div>
                  );
                }) : <div className="tx-empty" style={{ padding: '28px 16px' }}>No withdrawals yet</div>}
              </div>
            </div>
          )}

          {/* â”€â”€ TRADES â”€â”€ */}
          {activeTab === 'trades' && (
            <div className="table-wrapper">
              <div className="table-header">
                <div className="table-header-left">
                  <div className="table-header-icon th-blue">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/>
                      <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
                    </svg>
                  </div>
                  <div className="table-header-meta">
                    <h3>Trade History</h3>
                    <span className="table-header-badge">{trades.length} records</span>
                  </div>
                </div>
              </div>
              <div className="tx-desktop-table">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Asset</th>
                      <th>Amount</th>
                      <th>Price</th>
                      <th className="col-txid">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.length ? trades.map((item, idx) => {
                      const { main, time } = formatDate(item.created_at || item.date);
                      const isBuy = (item.order_type || item.type || '').toLowerCase() === 'buy';
                      const total = (Number(item.amount) || 0) * (Number(item.price) || 0);
                      return (
                        <tr key={idx}>
                          <td>
                            <div className="tx-date">
                              <span className="tx-date-main">{main}</span>
                              <span className="tx-date-time">{time}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`trade-type ${isBuy ? 'buy' : 'sell'}`}>
                              {item.order_type || item.type || 'N/A'}
                            </span>
                          </td>
                          <td>
                            <div className="tx-asset">
                              <div className={`tx-asset-dot ${getAssetDotClass(item.symbol || item.asset)}`}>
                                {getAssetSymbol(item.symbol || item.asset)}
                              </div>
                              <span className="tx-asset-name">{(item.symbol || item.asset || 'N/A').toUpperCase()}</span>
                            </div>
                          </td>
                          <td><span className="tx-amount">{(Number(item.amount) || 0).toFixed(4)}</span></td>
                          <td><span className="tx-amount">${(Number(item.price) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></td>
                          <td className="col-txid"><span className="tx-amount">${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></td>
                        </tr>
                      );
                    }) : <EmptyRow colSpan={6} msg="No trades yet" />}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="tx-mobile-list">
                {trades.length ? trades.map((item, idx) => {
                  const { main, time } = formatDate(item.created_at || item.date);
                  const isBuy = (item.order_type || item.type || '').toLowerCase() === 'buy';
                  const total = (Number(item.amount) || 0) * (Number(item.price) || 0);
                  return (
                    <div key={idx} className="tx-mobile-item">
                      <div className={`tx-mobile-icon ${isBuy ? 'buy' : 'sell'}`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/>
                          <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
                        </svg>
                      </div>
                      <div className="tx-mobile-info">
                        <div className="tx-mobile-title">
                          {(item.symbol || item.asset || 'N/A').toUpperCase()}
                          <span className={`trade-type ${isBuy ? 'buy' : 'sell'}`}>{item.order_type || item.type || 'Trade'}</span>
                        </div>
                        <div className="tx-mobile-sub">{main} {time}</div>
                      </div>
                      <div className="tx-mobile-right">
                        <div className={`tx-mobile-amount ${isBuy ? 'neg' : 'pos'}`}>
                          ${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </div>
                        <div className="tx-mobile-pl">{(Number(item.amount) || 0).toFixed(4)} units</div>
                      </div>
                    </div>
                  );
                }) : <div className="tx-empty" style={{ padding: '28px 16px' }}>No trades yet</div>}
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
};
