const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/authMiddleware");
const {
  getUsers,
  getAdminStats,
  getAnomalies,
  flagUser,
} = require("../controllers/adminController");

// Restrict all routes below to authenticated Admins only
router.use(protect, adminOnly);

router.get("/users", getUsers);
router.get("/stats", getAdminStats);
router.get("/anomalies", getAnomalies);
router.put("/user/:user_id/flag", flagUser);

module.exports = router;

