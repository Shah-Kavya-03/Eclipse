const AuditLog = require("../models/AuditLog");
const ApiUsage = require("../models/ApiUsage");
const pythonMlClient = require("../services/pythonMlClient");

/**
 * @route   GET /api/logs (or /logs)
 * @desc    Retrieve paginated audit logs
 * @access  Public / Admin
 */
const getLogs = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
    const userId = req.query.user_id;

    const query = userId ? { user_id: userId } : {};

    const docs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    const logs = docs.map((doc) => ({
      id: doc._id.toString(),
      session_id: doc.session_id,
      title: doc.title,
      prompt_masked: doc.prompt_masked,
      response: doc.response,
      model_used: doc.model_used,
      api_used: doc.api_used,
      status: doc.status,
      threat_tier: doc.threat_tier,
      lime_explanation: doc.lime_explanation,
      timestamp: doc.timestamp ? new Date(doc.timestamp).toISOString() : null,
      user_id: doc.user_id,
    }));

    return res.json({
      logs,
      count: logs.length,
    });
  } catch (error) {
    console.error("[Logs Get Error]:", error);
    return res.status(500).json({
      success: false,
      detail: "Failed to fetch audit logs.",
    });
  }
};

/**
 * @route   GET /api/dashboard-stats (or /dashboard-stats)
 * @desc    Aggregate summary stats, hourly counts, and provider metrics
 * @access  Public / Admin
 */
const getDashboardStats = async (req, res) => {
  try {
    const [total, safe, pii_detected, blocked, jailbreak] = await Promise.all([
      AuditLog.countDocuments({}),
      AuditLog.countDocuments({ status: "Safe" }),
      AuditLog.countDocuments({ status: "PII Detected" }),
      AuditLog.countDocuments({
        status: { $in: ["Prompt Injection", "Harmful", "Jailbreak"] },
      }),
      AuditLog.countDocuments({ status: "Jailbreak" }),
    ]);

    const modified = pii_detected;

    // Threats breakdown by status
    const groupStatus = await AuditLog.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const threats_by_type = {};
    groupStatus.forEach((g) => {
      if (g._id) threats_by_type[g._id] = g.count;
    });

    // Threats in the last 24 hours
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const hourlyLogs = await AuditLog.find({
      timestamp: { $gte: since24h },
    }).lean();

    const hourlyMap = {};
    hourlyLogs.forEach((log) => {
      if (log.timestamp) {
        const d = new Date(log.timestamp);
        const key = `${d.getUTCFullYear()}-${String(
          d.getUTCMonth() + 1
        ).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}T${String(
          d.getUTCHours()
        ).padStart(2, "0")}:00`;
        hourlyMap[key] = (hourlyMap[key] || 0) + 1;
      }
    });

    const threats_by_hour = Object.keys(hourlyMap)
      .sort()
      .map((hour) => ({ hour, count: hourlyMap[hour] }));

    // Provider usage breakdown
    const usageDocs = await ApiUsage.find({}).lean();
    const api_usage_breakdown = {};
    usageDocs.forEach((u) => {
      api_usage_breakdown[u.api_name.toLowerCase()] = {
        requests: u.requests_count || 0,
        is_rate_limited: u.is_rate_limited || false,
        last_used: u.last_used ? new Date(u.last_used).toISOString() : null,
      };
    });

    return res.json({
      total,
      safe,
      modified,
      blocked,
      pii_detected,
      jailbreak,
      threats_by_type,
      threats_by_hour,
      api_usage: api_usage_breakdown,
    });
  } catch (error) {
    console.error("[Dashboard Stats Error]:", error);
    return res.status(500).json({
      success: false,
      detail: "Failed to calculate dashboard statistics.",
    });
  }
};

/**
 * @route   GET /api/anomalies (or /anomalies)
 * @desc    Proxy to Python Isolation Forest anomaly detector
 * @access  Public / Admin
 */
const getAnomalies = async (req, res) => {
  try {
    const data = await pythonMlClient.getAnomalies();
    return res.json(data);
  } catch (error) {
    return res.status(500).json({
      success: false,
      detail: "Failed to run anomaly detection.",
    });
  }
};

/**
 * @route   GET /api/report/download (or /report/download)
 * @desc    Proxy to Python DPDP PDF generator stream
 * @access  Public
 */
const downloadReport = async (req, res) => {
  try {
    const { type, id } = req.query;

    if (!type || !["session", "weekly"].includes(type)) {
      return res.status(400).json({
        success: false,
        detail: "`type` must be either 'session' or 'weekly'.",
      });
    }

    const response = await pythonMlClient.getReportStream(type, id);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      response.headers["content-disposition"] ||
        `attachment; filename="guardrail_${type}_report.pdf"`
    );

    response.data.pipe(res);
  } catch (error) {
    console.error("[Report Download Error]:", error);
    return res.status(500).json({
      success: false,
      detail: "Failed to generate report PDF.",
    });
  }
};

module.exports = {
  getLogs,
  getDashboardStats,
  getAnomalies,
  downloadReport,
};
