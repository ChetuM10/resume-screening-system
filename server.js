/**
 * @fileoverview Main Express Server for Resume Screening System
 * @version 2.4.0 - Optimized for 100 file uploads with extended timeouts
 */

require("dotenv").config();

const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const expressLayouts = require("express-ejs-layouts");
const ejs = require("ejs");

// Initialize app
const app = express();

// Disable all caching (views, ETag, etc.)
console.log("🔄 Disabling all caching...");
app.set("view cache", false);
app.set("etag", false);
ejs.clearCache();
console.log("✅ All caching disabled");

// ✅ UPDATED: Server config optimized for 100 file uploads
const SERVER_CONFIG = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || "development",
  REQUEST_TIMEOUT: 600000, // ✅ 10 minutes for large uploads
  BODY_LIMIT: "1000mb", // ✅ 1GB for 100 files (10MB each)
  STATIC_CACHE_AGE: "0",
  MAX_FILES: 100, // ✅ Maximum files allowed per upload
};

// CORS config
const CORS_CONFIG = {
  origin: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    process.env.CORS_ORIGIN || "http://localhost:3000",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// Content Security Policy config
const CSP_CONFIG = {
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: [
      "'self'",
      "'unsafe-inline'",
      "https://cdn.jsdelivr.net",
      "https://cdnjs.cloudflare.com",
      "https://fonts.googleapis.com",
    ],
    scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
    imgSrc: ["'self'", "data:", "https:"],
    fontSrc: [
      "'self'",
      "https://cdnjs.cloudflare.com",
      "https://fonts.gstatic.com",
    ],
    connectSrc: ["'self'"],
  },
};

// Connect to MongoDB
async function initializeDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
}

// ==================== MIDDLEWARE ====================

// Disable caching
app.use((req, res, next) => {
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
    Expires: "0",
    "Last-Modified": new Date().toUTCString(),
  });
  next();
});

app.use(cors(CORS_CONFIG));
app.options("*", cors());

app.use(
  helmet({
    contentSecurityPolicy: CSP_CONFIG,
    crossOriginResourcePolicy: false,
  })
);

const logFormat = SERVER_CONFIG.NODE_ENV === "production" ? "combined" : "dev";
app.use(morgan(logFormat));

app.use(compression());

// ✅ UPDATED: Body parser with 1GB limit
app.use(express.json({ limit: SERVER_CONFIG.BODY_LIMIT }));
app.use(
  express.urlencoded({ extended: true, limit: SERVER_CONFIG.BODY_LIMIT })
);

// ==================== RATE LIMITERS ====================

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: SERVER_CONFIG.NODE_ENV === "production" ? 100 : 1000,
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const screeningLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: SERVER_CONFIG.NODE_ENV === "production" ? 5 : 50,
  message: { error: "Too many screening requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const candidateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: SERVER_CONFIG.NODE_ENV === "production" ? 20 : 200,
  message: { error: "Too many candidate requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ NEW: Upload rate limiter for large file uploads
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: SERVER_CONFIG.NODE_ENV === "production" ? 10 : 100,
  message: {
    error: "Too many upload requests. Please try again later.",
    retryAfter: "1 hour",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

app.use("/api/", apiLimiter);
app.use("/screening", screeningLimiter);
app.use("/candidate", candidateLimiter);
app.use("/upload", uploadLimiter); // ✅ NEW: Rate limit for uploads

// Static files
app.use(
  express.static(path.join(__dirname, "public"), {
    maxAge: 0,
    etag: false,
    lastModified: false,
    setHeaders: (res, filePath) => {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      if (filePath.endsWith(".css")) res.setHeader("Content-Type", "text/css");
      else if (filePath.endsWith(".js"))
        res.setHeader("Content-Type", "application/javascript");
    },
  })
);

// View engine
app.use(expressLayouts);
app.set("layout", "layouts/main");
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// ✅ UPDATED: Extended request and response timeout for large uploads
app.use((req, res, next) => {
  req.setTimeout(SERVER_CONFIG.REQUEST_TIMEOUT);
  res.setTimeout(SERVER_CONFIG.REQUEST_TIMEOUT);

  req.on("timeout", () => {
    if (!res.headersSent) {
      console.log(`⏰ Request timeout: ${req.method} ${req.originalUrl}`);
      res.status(408).json({
        success: false,
        error: "Request timeout - upload may be too large or taking too long",
        timeout: `${SERVER_CONFIG.REQUEST_TIMEOUT / 1000} seconds`,
      });
    }
  });

  next();
});

// ==================== ROUTES ====================

try {
  const indexRouter = require("./routes/index");
  const uploadRouter = require("./routes/upload");
  const screeningRouter = require("./routes/screening");
  const candidateRouter = require("./routes/candidate");
  const apiRouter = require("./routes/api");
  const dashboardRouter = require("./routes/dashboard");

  app.use("/", indexRouter);
  app.use("/upload", uploadRouter);
  app.use("/screening", screeningRouter);
  app.use("/candidate", candidateRouter);
  app.use("/api", apiRouter);
  app.use("/dashboard", dashboardRouter);

  console.log("✅ All routes registered successfully");
} catch (error) {
  console.error("❌ Error loading routes:", error);
  process.exit(1);
}

// ==================== UTILITY ROUTES ====================

// ✅ UPDATED: Health check with more details
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: SERVER_CONFIG.NODE_ENV,
    config: {
      maxFiles: SERVER_CONFIG.MAX_FILES,
      maxBodySize: SERVER_CONFIG.BODY_LIMIT,
      requestTimeout: `${SERVER_CONFIG.REQUEST_TIMEOUT / 1000}s`,
      caching: "disabled",
    },
    routes: {
      screening: "✅ Registered",
      candidate: "✅ Registered",
      upload: "✅ Registered",
      dashboard: "✅ Registered",
      analytics: "✅ Registered",
    },
  });
});

app.delete("/test-delete", (req, res) => {
  console.log("✅ Test DELETE endpoint working!");
  res.json({
    success: true,
    message: "DELETE is working!",
    timestamp: new Date().toISOString(),
  });
});

// ==================== ERROR HANDLERS ====================

// 404 handler
app.use("*", (req, res) => {
  console.log(`🔍 404 Not Found: ${req.method} ${req.originalUrl}`);
  if (req.xhr || req.headers.accept?.includes("application/json")) {
    return res.status(404).json({
      success: false,
      error: "Route not found",
      path: req.originalUrl,
      method: req.method,
      availableRoutes: [
        "/",
        "/upload",
        "/screening",
        "/candidate",
        "/analytics",
        "/dashboard",
        "/api",
      ],
    });
  }
  res.status(404).render("pages/error", {
    title: "404 - Page Not Found",
    message: `The page "${req.originalUrl}" could not be found.`,
    currentYear: new Date().getFullYear(),
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("🚨 Global error handler:", error);

  const isDevelopment = SERVER_CONFIG.NODE_ENV === "development";

  // Handle specific error types
  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      error: "File too large",
      message: "One or more files exceed the maximum size limit",
      maxSize: "10MB per file",
    });
  }

  if (error.code === "LIMIT_FILE_COUNT") {
    return res.status(413).json({
      success: false,
      error: "Too many files",
      message: `Maximum ${SERVER_CONFIG.MAX_FILES} files allowed per upload`,
    });
  }

  if (req.xhr || req.headers.accept?.includes("application/json")) {
    return res.status(error.status || 500).json({
      success: false,
      error: isDevelopment ? error.message : "Internal server error",
      ...(isDevelopment && { stack: error.stack }),
      timestamp: new Date().toISOString(),
    });
  }

  res.status(error.status || 500).render("pages/error", {
    title: "Server Error",
    message: isDevelopment
      ? error.message
      : "An internal server error occurred",
    currentYear: new Date().getFullYear(),
  });
});

// ==================== GRACEFUL SHUTDOWN ====================

function gracefulShutdown(signal, server) {
  console.log(`${signal} received, shutting down gracefully`);
  if (server && server.close) {
    server.close(async () => {
      console.log("HTTP server closed");
      try {
        await mongoose.connection.close();
        console.log("MongoDB connection closed");
        process.exit(0);
      } catch (error) {
        console.error("Error closing MongoDB:", error);
        process.exit(1);
      }
    });
    setTimeout(() => {
      console.error(
        "Could not close connections in time, forcefully shutting down"
      );
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

// ==================== APPLICATION STARTUP ====================

async function startApplication() {
  try {
    console.log("🚀 Initializing Resume Screening System...");
    console.log(`📦 Max files per upload: ${SERVER_CONFIG.MAX_FILES}`);
    console.log(
      `⏱️  Request timeout: ${SERVER_CONFIG.REQUEST_TIMEOUT / 1000}s`
    );
    console.log(`💾 Max body size: ${SERVER_CONFIG.BODY_LIMIT}`);

    await initializeDatabase();

    const server = app.listen(SERVER_CONFIG.PORT, "0.0.0.0", () => {
      console.log("🎉 Server startup complete!");
      console.log(`🚀 Server running on port ${SERVER_CONFIG.PORT}`);
      console.log(`📊 Environment: ${SERVER_CONFIG.NODE_ENV}`);
      console.log("🔄 Caching: DISABLED");

      if (SERVER_CONFIG.NODE_ENV === "production") {
        console.log("🚀 Production server ready!");
        console.log(
          "⚠️  Note: 100 file uploads require adequate server resources"
        );
      } else {
        console.log("📡 Local routes available:");
        console.log(` - http://localhost:${SERVER_CONFIG.PORT}`);
        console.log(` - http://localhost:${SERVER_CONFIG.PORT}/upload`);
        console.log(` - http://localhost:${SERVER_CONFIG.PORT}/screening`);
        console.log(` - http://localhost:${SERVER_CONFIG.PORT}/analytics`);
      }
    });

    // ✅ Set server timeout to match request timeout
    server.setTimeout(SERVER_CONFIG.REQUEST_TIMEOUT);
    server.keepAliveTimeout = SERVER_CONFIG.REQUEST_TIMEOUT;
    server.headersTimeout = SERVER_CONFIG.REQUEST_TIMEOUT + 5000;

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM", server));
    process.on("SIGINT", () => gracefulShutdown("SIGINT", server));

    return server;
  } catch (error) {
    console.error("💥 Failed to start application:", error);
    process.exit(1);
  }
}

// Start if run directly
if (require.main === module) {
  startApplication();
}

module.exports = app;
