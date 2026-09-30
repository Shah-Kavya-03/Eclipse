const express = require("express");
const router = express.Router();

const {
  getLogs,
  getDashboardStats,
  getAnomalies,
  downloadReport,
} = require("../controllers/logsController");

// Logs & telemetry routes
router.get("/logs", getLogs);
router.get("/dashboard-stats", getDashboardStats);
router.get("/anomalies", getAnomalies);
router.get("/report/download", downloadReport);

module.exports = router;
