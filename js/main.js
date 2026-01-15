document.addEventListener('DOMContentLoaded', () => {
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(contactForm).entries());
      try {
        if(window.CBApi && window.CBApi.contact){
          await window.CBApi.contact.send(data);
        } else {
          await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        }
        alert('Message sent. We will reply shortly.');
        contactForm.reset();
      } catch (err) {
        console.error(err);
        alert('Unable to send message. Please try again later.');
      }
    });
  }

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(loginForm).entries());
      try {
        if(window.CBApi && window.CBApi.auth){
          const resp = await window.CBApi.auth.login(data.email, data.password);
          if(resp && (resp.token || resp.success)){
            window.location.href = '/dashboard.html';
            return;
          }
          throw new Error('Invalid credentials');
        } else {
          await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
          window.location.href = '/dashboard.html';
        }
      } catch (err) {
        console.error(err);
        alert('Login failed');
      }
    });
  }

  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(signupForm).entries());
      try {
        if(window.CBApi && window.CBApi.auth){
          const resp = await window.CBApi.auth.register(data.name || data.firstName || '', '', data.email, data.password);
          if(resp && (resp.token || resp.success)){
            alert('Account created. Please sign in.');
            window.location.href = '/login.html';
            return;
          }
          throw new Error('Signup failed');
        } else {
          await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
          alert('Account created. Please sign in.');
          window.location.href = '/login.html';
        }
      } catch (err) {
        console.error(err);
        alert('Signup failed');
      }
    });
  }

  // Inject mobile menu toggle when a sidebar exists and wire toggle logic
  try {
    const headerContainer = document.querySelector('.site-header .container');
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && headerContainer) {
      const btn = document.createElement('button');
      btn.id = 'mobile-menu-toggle';
      btn.className = 'menu-toggle';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Toggle menu');
      btn.setAttribute('aria-expanded', 'false');
      btn.innerHTML = '☰';
      btn.addEventListener('click', () => {
        const opened = document.body.classList.toggle('sidebar-open');
        btn.setAttribute('aria-expanded', opened ? 'true' : 'false');
      });
      const nav = headerContainer.querySelector('.nav');
      headerContainer.insertBefore(btn, nav);

      // Add a skip-to-content link for keyboard users
      if (!document.getElementById('skip-link')) {
        const skip = document.createElement('a');
        skip.id = 'skip-link';
        skip.href = '#main-content';
        skip.textContent = 'Skip to content';
        skip.style = 'position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden';
        skip.addEventListener('focus', () => { skip.style.position = 'static'; skip.style.left = '8px'; skip.style.top = '8px'; skip.style.background = '#fff'; skip.style.padding = '8px'; skip.style.zIndex = 9999; skip.style.borderRadius = '4px'; skip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)'; });
        skip.addEventListener('blur', () => { skip.style.position = 'absolute'; skip.style.left = '-9999px'; skip.style.top = 'auto'; skip.style.background = 'none'; skip.style.padding = '0'; skip.style.boxShadow = 'none'; });
        headerContainer.parentElement.insertBefore(skip, headerContainer);
      }

      // Close sidebar when clicking main content or pressing Escape
      document.querySelector('.main-content')?.addEventListener('click', () => {
        if (document.body.classList.contains('sidebar-open')) {
          document.body.classList.remove('sidebar-open');
          btn.setAttribute('aria-expanded', 'false');
        }
      });
      document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape' && document.body.classList.contains('sidebar-open')) {
          document.body.classList.remove('sidebar-open');
          btn.setAttribute('aria-expanded', 'false');
          btn.focus();
        }
      });
    }
  } catch (e) { console.warn('Mobile menu inject failed', e); }

});

// Mount components if available
if (window.CBComponents) {
  if (document.getElementById('market-data')) window.CBComponents.renderMarketData('market-data');
  if (document.getElementById('portfolio-view')) window.CBComponents.renderPortfolioView('portfolio-view');
  if (document.getElementById('trading-dashboard')) window.CBComponents.renderTradingDashboard('trading-dashboard');
}
