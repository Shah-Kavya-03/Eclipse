const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Required Authentication Middleware.
 * Verifies JWT from Authorization header: Bearer <token>.
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      detail: "Not authenticated. Bearer token is missing.",
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "eclipse_default_jwt_secret_key"
    );

    const user = await User.findById(decoded.user_id || decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        detail: "User account associated with this token no longer exists.",
      });
    }

    if (user.is_flagged) {
      return res.status(403).json({
        success: false,
        detail: "Account is flagged for security review. Access restricted.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      detail: "Invalid or expired authorization token.",
    });
  }
};

/**
 * Optional Authentication Middleware.
 * Attaches req.user if a valid token is provided, but allows guest requests through.
 */
const optionalAuth = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "eclipse_default_jwt_secret_key"
    );
    const user = await User.findById(decoded.user_id || decoded.id);
    req.user = user || null;
  } catch (error) {
    req.user = null;
  }

  next();
};

/**
 * Role-Based Admin Guard.
 * Restricts endpoint strictly to users with is_admin === true.
 */
const adminOnly = (req, res, next) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({
      success: false,
      detail: "Access denied. Administrator privileges required.",
    });
  }
  next();
};

module.exports = {
  protect,
  optionalAuth,
  adminOnly,
};
