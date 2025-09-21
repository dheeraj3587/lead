const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const dotenv = require("dotenv");
const connectDB = require("./config/database");
const helmet = require("helmet");
const validateEnv = require("./config/validateEnv");
const authRoutes = require("./routes/auth");
const leadRoutes = require("./routes/leads");
const errorHandler = require("./middleware/errorHandler");

// Load environment variables
dotenv.config();

// Ensure MongoDB URI points to the Atlas cluster (override localhost)
const DEFAULT_MONGO_URI =
  "mongodb+srv://dheeraj8782:munnu@cluster0.nn1re.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
if (
  !process.env.MONGO_URI ||
  /mongodb:\/\/(localhost|127\.0\.0\.1)/i.test(process.env.MONGO_URI)
) {
  process.env.MONGO_URI = DEFAULT_MONGO_URI;
}

// Validate environment variables early
validateEnv();

// Connect to database
connectDB();

const app = express();

// Security middleware for production
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
  app.use(helmet());
}

// Logging
if (process.env.NODE_ENV === "production") {
  app.use(morgan("combined"));
} else {
  app.use(morgan("dev"));
}

// CORS (allow multiple domains + additional origins) with normalization
const normalizeOrigin = (url) => {
  try {
    const u = new URL(url);
    const host = u.host.toLowerCase();
    // return protocol + host (includes port if present)
    return `${u.protocol}//${host}`;
  } catch {
    return null;
  }
};

const corsOptions = {
  origin: function (origin, callback) {
    // Allow any origin in development for ease of local testing
    if (process.env.NODE_ENV !== "production") return callback(null, true);
    if (!origin) return callback(null, true); // non-browser or same-origin

    const baseOrigins = [
      process.env.FRONTEND_URL,
      "http://localhost:3000",
      "http://localhost:5173",
      "https://localhost:3000",
      "https://localhost:5173",
    ].filter(Boolean);
    const extraList = (process.env.ADDITIONAL_ORIGINS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const allowed = [...baseOrigins, ...extraList]
      .map(normalizeOrigin)
      .filter(Boolean);

    const incoming = normalizeOrigin(origin);
    const isLocalhost =
      incoming && /^https?:\/\/localhost(?::\d+)?$/.test(incoming);
    if (incoming && (allowed.includes(incoming) || isLocalhost)) {
      return callback(null, true);
    }
    console.warn(`CORS blocked origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  // Remove allowedHeaders whitelist so cors reflects request headers automatically
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
// Ensure Express responds to preflight requests
// Express 5: avoid bare '*' which breaks path-to-regexp; use a regex instead
app.options(/.*/, cors(corsOptions));

// Body parsers and cookies
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/leads", leadRoutes);
// Removed non-API alias to avoid undocumented routes

// Basic health
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// API health
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "1.0.0",
  });
});

// Detailed health
app.get("/api/health/detailed", async (req, res) => {
  try {
    const mongoose = require("mongoose");
    const dbStatus =
      mongoose.connection.readyState === 1 ? "connected" : "disconnected";
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      version: process.env.npm_package_version || "1.0.0",
      database: {
        status: dbStatus,
        name: mongoose.connection.name || "unknown",
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + " MB",
        total:
          Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + " MB",
      },
      node: process.version,
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// Error handling middleware
app.use(errorHandler);

// 404 handler (catch-all after routes)
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
    path: req.originalUrl,
    method: req.method,
  });
});

// Graceful shutdown: close server and DB
const mongoose = require("mongoose");
function shutdown(signal) {
  console.log(`${signal} received, starting graceful shutdown...`);
  server.close(() => {
    (async () => {
      console.log("HTTP server closed. Closing MongoDB connection...");
      try {
        await mongoose.connection.close(false);
        console.log("MongoDB connection closed. Exiting.");
        process.exit(0);
      } catch (err) {
        console.error("Error closing MongoDB connection:", err);
        process.exit(1);
      }
    })();
  });
  // Force-exit if not closed in time
  setTimeout(() => {
    console.error("Forcing shutdown after 10s timeout");
    process.exit(1);
  }, 10000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  if (process.env.NODE_ENV !== "production") {
    console.log(`📖 API docs: http://localhost:${PORT}/`);
  }
});
