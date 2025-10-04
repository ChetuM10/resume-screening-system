/**
 * Dark Mode Toggle with localStorage
 * Persists user preference across sessions
 * @version 1.1.0 - Fixed toast positioning
 */

const DarkModeToggle = {
  // Configuration
  config: {
    storageKey: "resume-screener-theme",
    darkClass: "dark-mode",
    lightClass: "light-mode",
    transitions: true,
  },

  /**
   * Initialize dark mode on page load
   */
  init() {
    console.log("🌓 Initializing Dark Mode Toggle...");

    // Get saved theme or default to dark (your current theme)
    const savedTheme = this.getSavedTheme();
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const theme = savedTheme || (prefersDark ? "dark" : "dark"); // Default to dark

    // Apply theme immediately (before page renders)
    this.applyTheme(theme, false); // false = no animation on load

    // Setup toggle button listeners
    this.setupListeners();

    // Listen for system theme changes
    this.watchSystemTheme();

    console.log(`✅ Dark Mode initialized with theme: ${theme}`);
  },

  /**
   * Get saved theme from localStorage
   */
  getSavedTheme() {
    try {
      return localStorage.getItem(this.config.storageKey);
    } catch (e) {
      console.warn("localStorage not available:", e);
      return null;
    }
  },

  /**
   * Save theme to localStorage
   */
  saveTheme(theme) {
    try {
      localStorage.setItem(this.config.storageKey, theme);
      console.log(`💾 Theme saved: ${theme}`);
    } catch (e) {
      console.warn("Could not save theme:", e);
    }
  },

  /**
   * Apply theme to document
   */
  applyTheme(theme, animate = true) {
    const html = document.documentElement;
    const body = document.body;

    // Add transition class if animations enabled
    if (animate && this.config.transitions) {
      body.classList.add("theme-transitioning");
    }

    // Remove both classes first
    html.classList.remove(this.config.darkClass, this.config.lightClass);
    body.classList.remove(this.config.darkClass, this.config.lightClass);

    // Add appropriate class
    const themeClass =
      theme === "light" ? this.config.lightClass : this.config.darkClass;
    html.classList.add(themeClass);
    body.classList.add(themeClass);

    // Update data attribute for CSS
    html.setAttribute("data-theme", theme);

    // Update toggle button icons
    this.updateToggleButtons(theme);

    // Remove transition class after animation
    if (animate && this.config.transitions) {
      setTimeout(() => {
        body.classList.remove("theme-transitioning");
      }, 300);
    }

    // Save theme
    this.saveTheme(theme);

    // Dispatch custom event
    window.dispatchEvent(
      new CustomEvent("themeChanged", {
        detail: { theme },
      })
    );
  },

  /**
   * Toggle between dark and light modes
   */
  toggle(event) {
    const currentTheme =
      document.documentElement.getAttribute("data-theme") || "dark";
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    console.log(`🔄 Toggling theme: ${currentTheme} → ${newTheme}`);

    this.applyTheme(newTheme, true);

    // Show notification next to button
    this.showNotification(newTheme, event);
  },

/**
 * Show compact notification
 */
showNotification(theme, event) {
  const icon = theme === 'dark' ? '🌙' : '☀️';
  const message = theme === 'dark' ? 'Dark Mode' : 'Light Mode';
  
  // Remove any existing notification
  const existingNotif = document.querySelector('.theme-notification');
  if (existingNotif) {
    existingNotif.remove();
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'theme-notification';
  notification.innerHTML = `
    <span class="theme-notification-icon">${icon}</span>
    <span class="theme-notification-text">${message}</span>
  `;
  
  document.body.appendChild(notification);
  
  // Trigger animation
  setTimeout(() => notification.classList.add('show'), 10);
  
  // Remove after 1.5 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 1500);
},

  /**
   * Update all toggle button icons
   */
  updateToggleButtons(theme) {
    const buttons = document.querySelectorAll("[data-theme-toggle]");

    buttons.forEach((button) => {
      const icon = button.querySelector("i");
      if (icon) {
        if (theme === "dark") {
          icon.className = "fas fa-sun"; // Show sun in dark mode
          button.setAttribute("title", "Switch to Light Mode");
          button.setAttribute("aria-label", "Switch to Light Mode");
        } else {
          icon.className = "fas fa-moon"; // Show moon in light mode
          button.setAttribute("title", "Switch to Dark Mode");
          button.setAttribute("aria-label", "Switch to Dark Mode");
        }
      }
    });
  },

  /**
   * Setup event listeners for toggle buttons
   */
  setupListeners() {
    // Find all toggle buttons
    const buttons = document.querySelectorAll("[data-theme-toggle]");

    buttons.forEach((button) => {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        this.toggle(e);
      });
    });

    // Keyboard shortcut: Ctrl/Cmd + Shift + D
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "D") {
        e.preventDefault();
        this.toggle(null);
      }
    });

    console.log(`🎛️ Setup ${buttons.length} theme toggle button(s)`);
  },

  /**
   * Watch for system theme changes
   */
  watchSystemTheme() {
    if (window.matchMedia) {
      const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");

      darkModeQuery.addEventListener("change", (e) => {
        // Only auto-switch if user hasn't manually set a preference
        if (!this.getSavedTheme()) {
          const theme = e.matches ? "dark" : "light";
          console.log(`🖥️ System theme changed to: ${theme}`);
          this.applyTheme(theme, true);
        }
      });
    }
  },
};

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => DarkModeToggle.init());
} else {
  DarkModeToggle.init();
}

// Make globally available
window.DarkModeToggle = DarkModeToggle;
