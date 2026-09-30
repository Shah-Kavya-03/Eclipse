const express = require("express");
const router = express.Router();

const {
  getSettings,
  updateSettings,
  clearHistory,
} = require("../controllers/settingsController");

// Get settings (GET /api/settings?user_id=...)
router.get("/", getSettings);

// Update settings (PUT /api/settings)
router.put("/", updateSettings);

// Bulk clear conversation history (POST /api/settings/clear-history)
router.post("/clear-history", clearHistory);

module.exports = router;
