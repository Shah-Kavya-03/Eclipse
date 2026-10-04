const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Generate signed JWT token.
 */
const generateToken = (userId) => {
  return jwt.sign(
    { user_id: userId.toString(), id: userId.toString() },
    process.env.JWT_SECRET || "eclipse_default_jwt_secret_key",
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
};

/**
 * @route   POST /api/auth/signup (or /auth/signup)
 * @desc    Register a new user account
 * @access  Public
 */
const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        detail: "Name, email, and password are required.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        detail: "Password must be at least 6 characters long.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        detail: "An account with this email address already exists.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hashed = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password_hashed,
      is_admin: false,
      is_flagged: false,
    });

    const token = generateToken(user._id);
    const userIdStr = user._id.toString();

    return res.status(201).json({
      access_token: token,
      token: token,
      token_type: "bearer",
      user_id: userIdStr,
      id: userIdStr,
      name: user.name,
      username: user.name,
      email: user.email,
      is_admin: user.is_admin,
      user: {
        user_id: userIdStr,
        id: userIdStr,
        name: user.name,
        username: user.name,
        email: user.email,
        is_admin: user.is_admin,
      },
    });
  } catch (error) {
    console.error("[Auth Signup Error]:", error);
    return res.status(500).json({
      success: false,
      detail: "Failed to register user. Please try again later.",
    });
  }
};

/**
 * @route   POST /api/auth/login (or /auth/login)
 * @desc    Authenticate user & return JWT token
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        detail: "Email and password are required.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({
        success: false,
        detail: "Invalid email or password.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hashed);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        detail: "Invalid email or password.",
      });
    }

    if (user.is_flagged) {
      return res.status(403).json({
        success: false,
        detail: "Account is flagged for security review. Access restricted.",
      });
    }

    const token = generateToken(user._id);
    const userIdStr = user._id.toString();

    return res.json({
      access_token: token,
      token: token,
      token_type: "bearer",
      user_id: userIdStr,
      id: userIdStr,
      name: user.name,
      username: user.name,
      email: user.email,
      is_admin: user.is_admin,
      user: {
        user_id: userIdStr,
        id: userIdStr,
        name: user.name,
        username: user.name,
        email: user.email,
        is_admin: user.is_admin,
      },
    });
  } catch (error) {
    console.error("[Auth Login Error]:", error);
    return res.status(500).json({
      success: false,
      detail: "Login failed. Please try again later.",
    });
  }
};

/**
 * @route   POST /api/auth/logout (or /auth/logout)
 * @desc    Client logout hook
 * @access  Public
 */
const logout = async (req, res) => {
  return res.json({
    message: "Logged out successfully.",
  });
};

/**
 * @route   GET /api/auth/me (or /auth/me)
 * @desc    Get currently authenticated user info & admin status
 * @access  Private (JWT)
 */
const getMe = async (req, res) => {
  return res.json({
    user_id: req.user._id.toString(),
    name: req.user.name,
    email: req.user.email,
    is_admin: req.user.is_admin,
    is_flagged: req.user.is_flagged,
    created_at: req.user.created_at,
  });
};

module.exports = {
  signup,
  login,
  logout,
  getMe,
};
