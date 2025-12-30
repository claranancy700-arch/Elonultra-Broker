;(function(window){
  function el(tag, attrs, children){
    const e = document.createElement(tag);
    if(attrs){ Object.keys(attrs).forEach(k=>{ if(k==='class') e.className=attrs[k]; else e.setAttribute(k, attrs[k]); }); }
    (children||[]).forEach(c => { if(typeof c === 'string') e.appendChild(document.createTextNode(c)); else e.appendChild(c); });
    return e;
  }

  function renderLoading(container, message){
    container.innerHTML = '';
    const wrap = el('div',{class:'loading-wrap'},[
      el('div',{class:'loader'},[]),
      el('p',{class:'muted'},[message||'Loading...'])
    ]);
    container.appendChild(wrap);
  }

  function renderMarketData(containerId){
    const c = document.getElementById(containerId);
    if(!c) return;
    const loggedIn = false;
    c.innerHTML = '';
    if(!loggedIn){
      c.appendChild(el('div',{class:'card'},[el('h3',{},['Market Data']), el('p',{class:'muted'},['Sign in to view real market data.'])]));
      return;
    }
    // If logged in, fetch /api/market (not implemented here)
    renderLoading(c,'Fetching market data...');
  }

  function renderPortfolioView(containerId){
    const c = document.getElementById(containerId);
    if(!c) return;
    c.innerHTML = '';
    const loggedIn = false;
    if(!loggedIn){
      c.appendChild(el('div',{class:'card'},[el('h3',{},['Portfolio']), el('p',{class:'muted'},['Sign in to view your portfolio.'])]));
      return;
    }
    renderLoading(c,'Loading portfolio...');
  }

  function renderTradingDashboard(containerId){
    const c = document.getElementById(containerId);
    if(!c) return;
    c.innerHTML = '';
    const loggedIn = false;
    if(!loggedIn){
      c.appendChild(el('div',{class:'card'},[el('h3',{},['Trading Dashboard']), el('p',{class:'muted'},['Sign in to trade and view account balances.'])]));
      return;
    }
    renderLoading(c,'Loading dashboard...');
  }

  window.CBComponents = {
    renderMarketData,
    renderPortfolioView,
    renderTradingDashboard,
    renderLoading
  };
})(window);
