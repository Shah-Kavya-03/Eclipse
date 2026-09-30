const express = require("express");
const router = express.Router();

const { handleChat } = require("../controllers/chatController");
const { optionalAuth } = require("../middleware/authMiddleware");

// POST /api/chat (or /chat)
router.post("/", optionalAuth, handleChat);

module.exports = router;
