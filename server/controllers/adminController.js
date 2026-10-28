const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const ApiUsage = require("../models/ApiUsage");
const pythonMlClient = require("../services/pythonMlClient");

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with activity counts
 * @access  Private (Admin)
 */
const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).sort({ created_at: -1 }).lean();

    const usersWithStats = await Promise.all(
      users.map(async (u) => {
        const userIdStr = u._id.toString();
        const requestCount = await AuditLog.countDocuments({ user_id: userIdStr });
        return {
          user_id: userIdStr,
          name: u.name,
          email: u.email,
          created_at: u.created_at ? new Date(u.created_at).toISOString() : null,
          is_flagged: Boolean(u.is_flagged),
          is_admin: Boolean(u.is_admin),
          request_count: requestCount,
        };
      })
    );

    return res.json({ users: usersWithStats, count: usersWithStats.length });
  } catch (error) {
    console.error("[Admin getUsers Error]:", error);
    return res.status(500).json({ success: false, detail: "Failed to fetch users." });
  }
};

/**
 * @route   GET /api/admin/stats
 * @desc    System-wide statistics for Admin Dashboard
 * @access  Private (Admin)
 */
const getAdminStats = async (req, res) => {
  try {
    const [
      totalUsers,
      flaggedUsers,
      totalRequests,
      statusAgg,
      apiDocs
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ is_flagged: true }),
      AuditLog.countDocuments({}),
      AuditLog.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      ApiUsage.find({}).lean()
    ]);

    // Unique conversations count from AuditLogs
    const uniqueConversations = await AuditLog.distinct("session_id");

    const statusBreakdown = {};
    statusAgg.forEach((item) => {
      if (item._id) statusBreakdown[item._id] = item.count;
    });

    const apiUsage = {};
    apiDocs.forEach((doc) => {
      apiUsage[doc.api_name.toLowerCase()] = {
        requests: doc.requests_count || 0,
        is_rate_limited: Boolean(doc.is_rate_limited),
      };
    });

    // Anomaly count from Python microservice
    let totalAnomalies = 0;
    try {
      const anomalyData = await pythonMlClient.getAnomalies();
      totalAnomalies = (anomalyData.anomalies || []).length;
    } catch {}

    return res.json({
      total_users: totalUsers,
      flagged_users: flaggedUsers,
      total_requests: totalRequests,
      total_conversations: uniqueConversations.length,
      total_anomalies: totalAnomalies,
      status_breakdown: statusBreakdown,
      api_usage: apiUsage,
    });
  } catch (error) {
    console.error("[Admin getAdminStats Error]:", error);
    return res.status(500).json({ success: false, detail: "Failed to compile admin stats." });
  }
};

/**
 * @route   GET /api/admin/anomalies
 * @desc    Fetch detected anomalies via Python ML microservice
 * @access  Private (Admin)
 */
const getAnomalies = async (req, res) => {
  try {
    const data = await pythonMlClient.getAnomalies();
    return res.json(data);
  } catch (error) {
    console.error("[Admin getAnomalies Error]:", error);
    return res.status(500).json({ success: false, detail: "Failed to fetch anomalies." });
  }
};

/**
 * @route   PUT /api/admin/user/:user_id/flag
 * @desc    Toggle user flagged status
 * @access  Private (Admin)
 */
const flagUser = async (req, res) => {
  try {
    const { user_id } = req.params;
    const user = await User.findById(user_id);

    if (!user) {
      return res.status(404).json({ success: false, detail: "User not found." });
    }

    user.is_flagged = !user.is_flagged;
    await user.save();

    return res.json({
      user_id: user._id.toString(),
      is_flagged: user.is_flagged,
    });
  } catch (error) {
    console.error("[Admin flagUser Error]:", error);
    return res.status(500).json({ success: false, detail: "Failed to update user flag status." });
  }
};

module.exports = {
  getUsers,
  getAdminStats,
  getAnomalies,
  flagUser,
};

