(function(window){
  // Central API base for pages; other scripts should read `window.__apiBase`
  window.__apiBase = window.__apiBase || ((typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) ? `http://${window.location.hostname}:5001/api` : '/api');
  const DEFAULT_API = '/api';
  const STORAGE_KEY = 'authToken';

  function getToken(){
    return localStorage.getItem(STORAGE_KEY);
  }

  function setToken(token){
    if(token) localStorage.setItem(STORAGE_KEY, token);
    else localStorage.removeItem(STORAGE_KEY);
  }

  async function request(path, opts={}){
    const url = (opts.fullUrl ? path : (DEFAULT_API + path));
    const headers = opts.headers || {};
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    const token = getToken();
    if(token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, Object.assign({}, opts, { headers }));
    const text = await res.text();
    let json = null;
    try{ json = text ? JSON.parse(text) : null; }catch(e){ json = text; }
    if(!res.ok) throw { status: res.status, body: json };
    return json;
  }

  const auth = {
    login: async (email, password) => {
      const data = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      if(data && data.token) setToken(data.token);
      return data;
    },
    register: async (firstName, lastName, email, password) => {
      const data = await request('/auth/register', { method: 'POST', body: JSON.stringify({ firstName, lastName, email, password }) });
      if(data && data.token) setToken(data.token);
      return data;
    },
    getMe: async () => request('/auth/me', { method: 'GET' })
  };

  const portfolio = {
    getMarketData: () => request('/portfolio/market', { method: 'GET' }),
    getPortfolio: () => request('/portfolio/portfolio', { method: 'GET' }),
    buy: (symbol, amount) => request('/portfolio/buy', { method: 'POST', body: JSON.stringify({ symbol, amount }) }),
    sell: (symbol, amount) => request('/portfolio/sell', { method: 'POST', body: JSON.stringify({ symbol, amount }) })
  };

  const contact = {
    send: (payload) => request('/contact', { method: 'POST', body: JSON.stringify(payload) })
  };

  window.CBApi = { auth, portfolio, contact, setToken, getToken };
})(window);