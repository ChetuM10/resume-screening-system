/**
 * @fileoverview Analytics Dashboard JavaScript - Chart.js Integration
 * @author Resume Screening System
 * @version 2.0.0 - ENHANCED PROFESSIONAL EDITION
 * @description Fetches analytics data and renders interactive charts with modern styling
 */

// ==================== GLOBAL VARIABLES ====================

let charts = {
  skills: null,
  score: null,
  trends: null,
  experience: null,
  education: null,
};

// ==================== CONFIGURATION ====================

const CHART_CONFIG = {
  // Modern gradient color schemes
  colors: {
    primary: "#667eea",
    primaryLight: "#818CF8",
    success: "#10b981",
    successLight: "#34d399",
    info: "#0ea5e9",
    infoLight: "#38bdf8",
    warning: "#f59e0b",
    warningLight: "#fbbf24",
    danger: "#ef4444",
    dangerLight: "#f87171",
    purple: "#8b5cf6",
    purpleLight: "#a78bfa",
    teal: "#14b8a6",
    tealLight: "#2dd4bf",
    orange: "#f97316",
    orangeLight: "#fb923c",
  },

  // Enhanced gradients for modern look
  gradients: {
    primary: ["#667eea", "#764ba2"],
    success: ["#10b981", "#059669"],
    info: ["#0ea5e9", "#0284c7"],
    warning: ["#f59e0b", "#d97706"],
    danger: ["#ef4444", "#dc2626"],
    purple: ["#8b5cf6", "#7c3aed"],
    teal: ["#14b8a6", "#0d9488"],
    orange: ["#f97316", "#ea580c"],
  },

  // Chart.js default options with modern styling
  defaultOptions: {
    responsive: true,
    maintainAspectRatio: true,
    animation: {
      duration: 1500,
      easing: "easeInOutCubic",
    },
    plugins: {
      legend: {
        display: true,
        position: "top",
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 13,
            weight: "600",
            family: "'Inter', sans-serif",
          },
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        titleColor: "#f1f5f9",
        bodyColor: "#cbd5e1",
        padding: 16,
        cornerRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(148, 163, 184, 0.2)",
        displayColors: true,
        boxPadding: 6,
        usePointStyle: true,
        titleFont: {
          size: 14,
          weight: "700",
          family: "'Inter', sans-serif",
        },
        bodyFont: {
          size: 13,
          weight: "500",
          family: "'Inter', sans-serif",
        },
      },
    },
  },
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Show loading spinner
 */
function showLoading() {
  document.getElementById("loading-spinner").style.display = "flex";
  document.getElementById("charts-container").style.display = "none";
  document.getElementById("error-message").style.display = "none";
}

/**
 * Hide loading spinner and show charts
 */
function hideLoading() {
  document.getElementById("loading-spinner").style.display = "none";
  document.getElementById("charts-container").style.display = "flex";
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showError(message) {
  document.getElementById("loading-spinner").style.display = "none";
  document.getElementById("charts-container").style.display = "none";
  const errorDiv = document.getElementById("error-message");
  errorDiv.style.display = "block";
  document.getElementById("error-text").textContent = message;
}

/**
 * Generate gradient for charts
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} colors - Array of colors [start, end]
 * @param {boolean} vertical - Vertical gradient
 * @returns {CanvasGradient} Gradient object
 */
function createGradient(ctx, colors, vertical = true) {
  const gradient = vertical
    ? ctx.createLinearGradient(0, 0, 0, 400)
    : ctx.createLinearGradient(0, 0, 400, 0);

  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(1, colors[1]);

  return gradient;
}

/**
 * Create gradient with transparency
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} color - Base color
 * @returns {CanvasGradient} Gradient with transparency
 */
function createTransparentGradient(ctx, color) {
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, color + "B3"); // 70% opacity
  gradient.addColorStop(0.5, color + "66"); // 40% opacity
  gradient.addColorStop(1, color + "00"); // 0% opacity
  return gradient;
}

/**
 * Check if dark mode is enabled
 * @returns {boolean} True if dark mode is active
 */
function isDarkMode() {
  return (
    document.body.classList.contains("dark-mode") ||
    document.documentElement.classList.contains("dark-mode")
  );
}

/**
 * Get text color based on theme
 * @returns {string} Text color
 */
function getTextColor() {
  return isDarkMode() ? "#cbd5e1" : "#475569";
}

/**
 * Get grid color based on theme
 * @returns {string} Grid color
 */
function getGridColor() {
  return isDarkMode() ? "#334155" : "#e2e8f0";
}

// ==================== CHART CREATION FUNCTIONS ====================

/**
 * Create Skills Distribution Chart (Horizontal Bar) - ENHANCED
 * @param {Array} data - Skills data array
 */
function createSkillsChart(data) {
  const ctx = document.getElementById("skillsChart").getContext("2d");

  if (charts.skills) {
    charts.skills.destroy();
  }

  const labels = data.map((item) => item.skill);
  const values = data.map((item) => item.count);

  // Create gradient for each bar
  const gradient = createGradient(ctx, CHART_CONFIG.gradients.primary, false);

  charts.skills = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Number of Resumes",
          data: values,
          backgroundColor: gradient,
          borderColor: CHART_CONFIG.colors.primary,
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
          barThickness: 28,
          hoverBackgroundColor: CHART_CONFIG.colors.primaryLight,
          hoverBorderWidth: 3,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: true,
      animation: {
        duration: 1500,
        easing: "easeInOutQuart",
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          ...CHART_CONFIG.defaultOptions.plugins.tooltip,
          callbacks: {
            label: function (context) {
              return `${context.parsed.x} resumes with this skill`;
            },
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            color: getTextColor(),
            stepSize: 5,
            font: {
              size: 12,
              weight: "600",
            },
          },
          grid: {
            color: getGridColor(),
            drawBorder: false,
            lineWidth: 1,
          },
          border: {
            display: false,
          },
        },
        y: {
          ticks: {
            color: getTextColor(),
            font: {
              size: 13,
              weight: "600",
            },
            padding: 8,
          },
          grid: {
            display: false,
          },
          border: {
            display: false,
          },
        },
      },
    },
  });

  console.log("✅ Skills chart created with enhanced styling");
}

/**
 * Create Score Distribution Chart (Doughnut) - ENHANCED
 * @param {Object} data - Score distribution data
 */
function createScoreChart(data) {
  const ctx = document.getElementById("scoreChart").getContext("2d");

  if (charts.score) {
    charts.score.destroy();
  }

  const labels = [
    "Excellent (80-100)",
    "Good (60-79)",
    "Average (40-59)",
    "Poor (0-39)",
  ];
  const values = [data.excellent, data.good, data.average, data.poor];

  // Enhanced gradient colors
  const colors = [
    CHART_CONFIG.colors.success,
    CHART_CONFIG.colors.info,
    CHART_CONFIG.colors.warning,
    CHART_CONFIG.colors.danger,
  ];

  const hoverColors = [
    CHART_CONFIG.colors.successLight,
    CHART_CONFIG.colors.infoLight,
    CHART_CONFIG.colors.warningLight,
    CHART_CONFIG.colors.dangerLight,
  ];

  charts.score = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Candidates",
          data: values,
          backgroundColor: colors,
          borderColor: isDarkMode() ? "#1e293b" : "#ffffff",
          borderWidth: 4,
          hoverBackgroundColor: hoverColors,
          hoverBorderWidth: 6,
          hoverOffset: 12,
          spacing: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: "65%",
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 1500,
        easing: "easeInOutQuart",
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: getTextColor(),
            padding: 20,
            font: {
              size: 13,
              weight: "600",
              family: "'Inter', sans-serif",
            },
            usePointStyle: true,
            pointStyle: "circle",
          },
        },
        tooltip: {
          ...CHART_CONFIG.defaultOptions.plugins.tooltip,
          callbacks: {
            label: function (context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return `${context.label}: ${context.parsed} (${percentage}%)`;
            },
          },
        },
      },
    },
  });

  console.log("✅ Score chart created with enhanced styling");
}

/**
 * Create Monthly Trends Chart (Line) - ENHANCED
 * @param {Array} data - Monthly trends data
 */
function createTrendsChart(data) {
  const ctx = document.getElementById("trendsChart").getContext("2d");

  if (charts.trends) {
    charts.trends.destroy();
  }

  const labels = data.map((item) => item.month);
  const values = data.map((item) => item.count);

  // Create beautiful gradient background
  const gradient = createTransparentGradient(ctx, CHART_CONFIG.colors.info);

  charts.trends = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Resume Uploads",
          data: values,
          borderColor: CHART_CONFIG.colors.info,
          backgroundColor: gradient,
          borderWidth: 4,
          fill: true,
          tension: 0.4,
          pointRadius: 6,
          pointHoverRadius: 10,
          pointBackgroundColor: CHART_CONFIG.colors.info,
          pointBorderColor: "#ffffff",
          pointBorderWidth: 3,
          pointHoverBackgroundColor: CHART_CONFIG.colors.infoLight,
          pointHoverBorderColor: "#ffffff",
          pointHoverBorderWidth: 4,
          shadowOffsetX: 0,
          shadowOffsetY: 4,
          shadowBlur: 8,
          shadowColor: "rgba(14, 165, 233, 0.3)",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: {
        intersect: false,
        mode: "index",
      },
      animation: {
        duration: 2000,
        easing: "easeInOutQuart",
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          ...CHART_CONFIG.defaultOptions.plugins.tooltip,
          callbacks: {
            label: function (context) {
              return `${context.parsed.y} uploads this month`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: getTextColor(),
            font: {
              size: 12,
              weight: "600",
            },
          },
          grid: {
            color: getGridColor(),
            drawBorder: false,
            lineWidth: 1,
          },
          border: {
            display: false,
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: getTextColor(),
            stepSize: 10,
            font: {
              size: 12,
              weight: "600",
            },
          },
          grid: {
            color: getGridColor(),
            drawBorder: false,
            lineWidth: 1,
          },
          border: {
            display: false,
          },
        },
      },
    },
  });

  console.log("✅ Trends chart created with enhanced styling");
}

/**
 * Create Experience Breakdown Chart (Bar) - ENHANCED
 * @param {Array} data - Experience distribution data
 */
function createExperienceChart(data) {
  const ctx = document.getElementById("experienceChart").getContext("2d");

  if (charts.experience) {
    charts.experience.destroy();
  }

  const labels = data.map((item) => item.label);
  const values = data.map((item) => item.count);

  // Create gradients for each bar
  const gradients = [
    createGradient(ctx, CHART_CONFIG.gradients.success),
    createGradient(ctx, CHART_CONFIG.gradients.info),
    createGradient(ctx, CHART_CONFIG.gradients.warning),
    createGradient(ctx, CHART_CONFIG.gradients.danger),
  ];

  const colors = [
    CHART_CONFIG.colors.success,
    CHART_CONFIG.colors.info,
    CHART_CONFIG.colors.warning,
    CHART_CONFIG.colors.danger,
  ];

  const hoverColors = [
    CHART_CONFIG.colors.successLight,
    CHART_CONFIG.colors.infoLight,
    CHART_CONFIG.colors.warningLight,
    CHART_CONFIG.colors.dangerLight,
  ];

  charts.experience = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Number of Candidates",
          data: values,
          backgroundColor: gradients,
          borderColor: colors,
          borderWidth: 2,
          borderRadius: 10,
          borderSkipped: false,
          hoverBackgroundColor: hoverColors,
          hoverBorderWidth: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: {
        duration: 1500,
        easing: "easeInOutQuart",
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          ...CHART_CONFIG.defaultOptions.plugins.tooltip,
          callbacks: {
            label: function (context) {
              return `${context.parsed.y} candidates in this category`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: getTextColor(),
            font: {
              size: 12,
              weight: "600",
            },
          },
          grid: {
            display: false,
          },
          border: {
            display: false,
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: getTextColor(),
            stepSize: 10,
            font: {
              size: 12,
              weight: "600",
            },
          },
          grid: {
            color: getGridColor(),
            drawBorder: false,
            lineWidth: 1,
          },
          border: {
            display: false,
          },
        },
      },
    },
  });

  console.log("✅ Experience chart created with enhanced styling");
}

/**
 * Create Education Statistics Chart (Pie) - ENHANCED
 * @param {Array} data - Education distribution data
 */
function createEducationChart(data) {
  const ctx = document.getElementById("educationChart").getContext("2d");

  if (charts.education) {
    charts.education.destroy();
  }

  // Filter out zero values
  const filteredData = data.filter((item) => item.count > 0);

  const labels = filteredData.map((item) => item.level);
  const values = filteredData.map((item) => item.count);

  // Enhanced color palette
  const colors = [
    CHART_CONFIG.colors.primary,
    CHART_CONFIG.colors.success,
    CHART_CONFIG.colors.info,
    CHART_CONFIG.colors.warning,
    CHART_CONFIG.colors.purple,
    CHART_CONFIG.colors.teal,
  ];

  const hoverColors = [
    CHART_CONFIG.colors.primaryLight,
    CHART_CONFIG.colors.successLight,
    CHART_CONFIG.colors.infoLight,
    CHART_CONFIG.colors.warningLight,
    CHART_CONFIG.colors.purpleLight,
    CHART_CONFIG.colors.tealLight,
  ];

  charts.education = new Chart(ctx, {
    type: "pie",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Candidates",
          data: values,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: isDarkMode() ? "#1e293b" : "#ffffff",
          borderWidth: 4,
          hoverBackgroundColor: hoverColors.slice(0, labels.length),
          hoverBorderWidth: 6,
          hoverOffset: 15,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 1500,
        easing: "easeInOutQuart",
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: getTextColor(),
            padding: 16,
            font: {
              size: 12,
              weight: "600",
              family: "'Inter', sans-serif",
            },
            usePointStyle: true,
            pointStyle: "circle",
          },
        },
        tooltip: {
          ...CHART_CONFIG.defaultOptions.plugins.tooltip,
          callbacks: {
            label: function (context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return `${context.label}: ${context.parsed} (${percentage}%)`;
            },
          },
        },
      },
    },
  });

  console.log("✅ Education chart created with enhanced styling");
}

// ==================== DATA FETCHING ====================

/**
 * Fetch analytics data from API
 */
async function fetchAnalyticsData() {
  showLoading();

  try {
    console.log("📊 Fetching analytics data...");

    const response = await fetch("/api/analytics/data");

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to fetch analytics data");
    }

    console.log("✅ Analytics data fetched successfully:", result.data);

    // Create all charts with enhanced styling
    if (
      result.data.skillsDistribution &&
      result.data.skillsDistribution.length > 0
    ) {
      createSkillsChart(result.data.skillsDistribution);
    } else {
      console.warn("⚠️ No skills data available");
    }

    if (result.data.scoreDistribution) {
      createScoreChart(result.data.scoreDistribution);
    }

    if (result.data.monthlyUploads && result.data.monthlyUploads.length > 0) {
      createTrendsChart(result.data.monthlyUploads);
    }

    if (
      result.data.experienceBreakdown &&
      result.data.experienceBreakdown.length > 0
    ) {
      createExperienceChart(result.data.experienceBreakdown);
    }

    if (result.data.educationStats && result.data.educationStats.length > 0) {
      createEducationChart(result.data.educationStats);
    }

    hideLoading();
  } catch (error) {
    console.error("❌ Error fetching analytics data:", error);
    showError(
      error.message ||
        "Failed to load analytics data. Please try refreshing the page."
    );
  }
}

/**
 * Refresh analytics data
 */
function refreshAnalytics() {
  console.log("🔄 Refreshing analytics...");

  const refreshBtn = document.getElementById("refreshAnalytics");
  refreshBtn.classList.add("loading");
  refreshBtn.disabled = true;

  // Destroy all existing charts
  Object.keys(charts).forEach((key) => {
    if (charts[key]) {
      charts[key].destroy();
      charts[key] = null;
    }
  });

  // Fetch new data
  fetchAnalyticsData().finally(() => {
    refreshBtn.classList.remove("loading");
    refreshBtn.disabled = false;
  });
}

// ==================== EVENT LISTENERS ====================

/**
 * Initialize analytics dashboard on page load
 */
document.addEventListener("DOMContentLoaded", function () {
  console.log("📊 Analytics dashboard initializing with enhanced styling...");

  // Check if Chart.js is loaded
  if (typeof Chart === "undefined") {
    console.error("❌ Chart.js not loaded!");
    showError("Chart library failed to load. Please refresh the page.");
    return;
  }

  console.log("✅ Chart.js loaded successfully");

  // Set Chart.js global defaults with modern styling
  Chart.defaults.font.family =
    "'Inter', 'Segoe UI', 'Helvetica Neue', sans-serif";
  Chart.defaults.font.size = 13;
  Chart.defaults.font.weight = "500";
  Chart.defaults.color = getTextColor();
  Chart.defaults.borderColor = getGridColor();

  // Fetch analytics data
  fetchAnalyticsData();

  // Refresh button event listener
  const refreshBtn = document.getElementById("refreshAnalytics");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", refreshAnalytics);
  }

  // Listen for theme changes
  const themeToggle = document.querySelector("[data-theme-toggle]");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      setTimeout(() => {
        refreshAnalytics();
      }, 100);
    });
  }

  console.log("✅ Analytics dashboard ready with enhanced styling!");
});

// ==================== WINDOW RESIZE HANDLER ====================

/**
 * Handle window resize to update charts
 */
let resizeTimer;
window.addEventListener("resize", function () {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function () {
    Object.keys(charts).forEach((key) => {
      if (charts[key]) {
        charts[key].resize();
      }
    });
  }, 250);
});
