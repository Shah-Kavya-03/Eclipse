const express = require("express");
const router = express.Router();

const {
  listConversations,
  getConversation,
  renameConversation,
  deleteConversation,
} = require("../controllers/conversationController");

// List conversations for user (GET /api/conversations?user_id=...)
router.get("/", listConversations);

// Get single conversation details with messages (GET /api/conversations/:session_id)
router.get("/:session_id", getConversation);

// Rename conversation title (PATCH /api/conversations/:session_id/title)
router.patch("/:session_id/title", renameConversation);

// Delete conversation (DELETE /api/conversations/:session_id)
router.delete("/:session_id", deleteConversation);

module.exports = router;
