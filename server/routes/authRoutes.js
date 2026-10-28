const express = require("express");
const router = express.Router();

const {
  signup,
  login,
  logout,
  getMe,
  changePassword,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// Public routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

// Private routes
router.get("/me", protect, getMe);
router.post("/change-password", protect, changePassword);

module.exports = router;
