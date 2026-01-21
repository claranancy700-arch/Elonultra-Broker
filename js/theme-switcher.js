/**
 * Theme Switcher System
 * Provides light and dark theme switching with persistence
 * Light theme: Desert sand gold and azure with glittering effect
 * Dark theme: Original cyberpunk dark theme
 */

class ThemeSwitcher {
  constructor() {
    this.THEME_KEY = 'elon-ui-theme';
    this.LIGHT = 'light';
    this.DARK = 'dark';
    this.init();
  }

  init() {
    // Load saved theme or default to light
    const savedTheme = this.getSavedTheme();
    const defaultTheme = this.LIGHT; // Start with light theme as default
    this.setTheme(savedTheme || defaultTheme);
    
    // Create floating switch when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => this.createFloatingSwitch(), 100);
      });
    } else {
      setTimeout(() => this.createFloatingSwitch(), 100);
    }
  }

  getSavedTheme() {
    try {
      return localStorage.getItem(this.THEME_KEY);
    } catch (e) {
      console.warn('Unable to access localStorage:', e);
      return null;
    }
  }

  saveTheme(theme) {
    try {
      localStorage.setItem(this.THEME_KEY, theme);
    } catch (e) {
      console.warn('Unable to save theme to localStorage:', e);
    }
  }

  setTheme(theme) {
    if (theme !== this.LIGHT && theme !== this.DARK) {
      theme = this.LIGHT;
    }

    // Set data-theme attribute on html element
    document.documentElement.setAttribute('data-theme', theme);
    
    // Save preference
    this.saveTheme(theme);

    // Update toggle button if it exists
    this.updateToggleButton(theme);

    // Dispatch custom event for any components that need to react
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || this.DARK;
    const newTheme = currentTheme === this.LIGHT ? this.DARK : this.LIGHT;
    this.setTheme(newTheme);
  }

  getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || this.DARK;
  }

  updateToggleButton(theme) {
    const buttons = document.querySelectorAll('.theme-toggle');
    buttons.forEach(btn => {
      const icon = btn.querySelector('.theme-toggle-icon');
      if (theme === this.LIGHT) {
        btn.innerHTML = '<span class="theme-toggle-icon">🌙</span> Dark Mode';
      } else {
        btn.innerHTML = '<span class="theme-toggle-icon">☀️</span> Light Mode';
      }
      btn.onclick = () => this.toggleTheme();
    });

    // Update floating switch checkbox state
    const checkbox = document.getElementById('theme-switch-checkbox');
    if (checkbox) {
      checkbox.checked = theme === this.DARK;
    }

    // Update label active states
    const lightLabel = document.querySelector('.theme-label-light');
    const darkLabel = document.querySelector('.theme-label-dark');
    if (lightLabel && darkLabel) {
      if (theme === this.LIGHT) {
        lightLabel.classList.add('active');
        darkLabel.classList.remove('active');
      } else {
        lightLabel.classList.remove('active');
        darkLabel.classList.add('active');
      }
    }
  }

  createFloatingSwitch() {
    // Check if switch already exists
    if (document.getElementById('floating-theme-switch')) {
      console.log('Theme switch already exists');
      return;
    }

    console.log('Creating floating theme switch');

    // Create floating switch container
    const container = document.createElement('div');
    container.id = 'floating-theme-switch';
    container.className = 'floating-theme-switch';
    container.innerHTML = `
      <div class="theme-switch-wrapper">
        <span class="theme-switch-label theme-label-light">☀️</span>
        <label class="theme-switch">
          <input type="checkbox" id="theme-switch-checkbox">
          <span class="theme-switch-slider"></span>
        </label>
        <span class="theme-switch-label theme-label-dark">🌙</span>
      </div>
    `;

    document.body.appendChild(container);
    console.log('Theme switch added to DOM');

    // Add event listener
    const checkbox = document.getElementById('theme-switch-checkbox');
    if (checkbox) {
      const currentTheme = this.getCurrentTheme();
      checkbox.checked = currentTheme === this.DARK;
      checkbox.addEventListener('change', (e) => {
        this.setTheme(e.target.checked ? this.DARK : this.LIGHT);
      });
      console.log('Theme switch initialized, current theme:', currentTheme);
    }

    // Update label active states immediately
    this.updateToggleButton(this.getCurrentTheme());
  }
}

// Initialize theme switcher when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.themeSwitcher = new ThemeSwitcher();
  });
} else {
  window.themeSwitcher = new ThemeSwitcher();
}
