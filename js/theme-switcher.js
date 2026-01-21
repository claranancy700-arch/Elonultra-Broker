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
    const defaultTheme = this.LIGHT; // Start with light theme as requested
    this.setTheme(savedTheme || defaultTheme);
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
