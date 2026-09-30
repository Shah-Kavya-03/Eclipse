const express = require("express");
const router = express.Router();

const {
  signup,
  login,
  logout,
  getMe,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// Public routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

// Private routes
router.get("/me", protect, getMe);

module.exports = router;
