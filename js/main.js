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
});

// Mount components if available
if (window.CBComponents) {
  if (document.getElementById('market-data')) window.CBComponents.renderMarketData('market-data');
  if (document.getElementById('portfolio-view')) window.CBComponents.renderPortfolioView('portfolio-view');
  if (document.getElementById('trading-dashboard')) window.CBComponents.renderTradingDashboard('trading-dashboard');
}
