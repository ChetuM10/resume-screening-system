/**
 * Toast Notification Helper
 * Centralized toast configuration for Resume Screening System
 * @version 1.1.0 - Enhanced with additional features
 */

const ToastHelper = {
  // Default configuration
  defaultConfig: {
    duration: 4000,
    gravity: "top", // top or bottom
    position: "right", // left, center or right
    stopOnFocus: true, // Pause timer when hovering
    offset: {
      x: 20, // horizontal offset
      y: 80, // vertical offset (to avoid navbar)
    },
    style: {
      borderRadius: "12px",
      fontSize: "15px",
      fontWeight: "500",
      padding: "16px 20px",
      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
      minWidth: "300px",
      maxWidth: "500px",
    },
  },

  /**
   * Success toast (green) - For successful operations
   * @param {string} message - The message to display
   * @param {number} duration - Custom duration in milliseconds (optional)
   */
  success(message, duration) {
    Toastify({
      text: message,
      ...this.defaultConfig,
      duration: duration || this.defaultConfig.duration,
      style: {
        ...this.defaultConfig.style,
        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      },
    }).showToast();
  },

  /**
   * Error toast (red) - For errors and failures
   * @param {string} message - The message to display
   * @param {number} duration - Custom duration in milliseconds (optional)
   */
  error(message, duration) {
    Toastify({
      text: message,
      ...this.defaultConfig,
      duration: duration || 5000, // Errors stay longer
      style: {
        ...this.defaultConfig.style,
        background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
      },
    }).showToast();
  },

  /**
   * Warning toast (orange) - For warnings and cautions
   * @param {string} message - The message to display
   * @param {number} duration - Custom duration in milliseconds (optional)
   */
  warning(message, duration) {
    Toastify({
      text: message,
      ...this.defaultConfig,
      duration: duration || this.defaultConfig.duration,
      style: {
        ...this.defaultConfig.style,
        background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
      },
    }).showToast();
  },

  /**
   * Info toast (blue) - For informational messages
   * @param {string} message - The message to display
   * @param {number} duration - Custom duration in milliseconds (optional)
   */
  info(message, duration) {
    Toastify({
      text: message,
      ...this.defaultConfig,
      duration: duration || this.defaultConfig.duration,
      style: {
        ...this.defaultConfig.style,
        background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
      },
    }).showToast();
  },

  /**
   * Processing toast (purple) - For ongoing operations
   * Matches your app's purple theme
   * @param {string} message - The message to display
   * @param {number} duration - Custom duration in milliseconds (optional)
   */
  processing(message, duration) {
    Toastify({
      text: message,
      ...this.defaultConfig,
      duration: duration || 3000, // Processing messages are shorter
      style: {
        ...this.defaultConfig.style,
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      },
    }).showToast();
  },

  /**
   * Custom toast with manual configuration
   * @param {string} message - The message to display
   * @param {object} options - Custom Toastify options
   */
  custom(message, options = {}) {
    Toastify({
      text: message,
      ...this.defaultConfig,
      ...options,
      style: {
        ...this.defaultConfig.style,
        ...(options.style || {}),
      },
    }).showToast();
  },

  /**
   * Quick toast with icon
   * @param {string} message - The message to display
   * @param {string} icon - Icon HTML or emoji
   * @param {string} type - Toast type (success, error, warning, info, processing)
   */
  withIcon(message, icon, type = "info") {
    const fullMessage = `${icon} ${message}`;
    this[type](fullMessage);
  },
};

// Make it globally available
window.ToastHelper = ToastHelper;

// ✅ Add console log for debugging
console.log("✅ ToastHelper initialized and ready");

// ✅ Optional: Test function (remove in production)
// ToastHelper.test = function() {
//   console.log('Testing ToastHelper...');
//   this.success('✅ Success test');
//   setTimeout(() => this.error('❌ Error test'), 1000);
//   setTimeout(() => this.warning('⚠️ Warning test'), 2000);
//   setTimeout(() => this.info('ℹ️ Info test'), 3000);
//   setTimeout(() => this.processing('⏳ Processing test'), 4000);
// };
