const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: path.join(__dirname, ".env") });

const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// CORS Configuration
const allowedOrigins = (process.env.CORS_ORIGINS || "*").split(",").map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "Eclipse Express API Gateway",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "Eclipse Express API Gateway",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Root route
app.get("/", (req, res) => {
  res.json({
    service: "Eclipse V2 API Gateway",
    status: "running",
    port: PORT,
  });
});

// Routes
const authRoutes = require("./routes/authRoutes");
const conversationRoutes = require("./routes/conversationRoutes");
const settingRoutes = require("./routes/settingRoutes");
const chatRoutes = require("./routes/chatRoutes");
const logRoutes = require("./routes/logRoutes");

app.use("/api/auth", authRoutes);
app.use("/auth", authRoutes);

app.use("/api/conversations", conversationRoutes);
app.use("/conversations", conversationRoutes);

app.use("/api/settings", settingRoutes);
app.use("/settings", settingRoutes);

app.use("/api/chat", chatRoutes);
app.use("/chat", chatRoutes);

app.use("/api", logRoutes);
app.use("/", logRoutes); // Backwards compatibility for /logs, /dashboard-stats, /anomalies, /report/download

// Centralized error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`[Eclipse Gateway] Server running on http://localhost:${PORT}`);
});

module.exports = app;
