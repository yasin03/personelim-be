const jwt = require("jsonwebtoken");
const { db, COLLECTIONS } = require("../../config/firebase");

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: "Access denied",
        message: "No token provided",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Optional: Check if user still exists in database
    const userDoc = await db
      .collection(COLLECTIONS.USERS)
      .doc(decoded.uid)
      .get();

    if (!userDoc.exists) {
      return res.status(401).json({
        error: "User not found",
        message: "User does not exist",
      });
    }

    // Add user info to request object
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      role: decoded.role,
      userData: userDoc.data(),
    };

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        error: "Invalid token",
        message: "Token is not valid",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Token expired",
        message: "Token has expired",
      });
    }

    console.error("Authentication error:", error);
    res.status(500).json({
      error: "Authentication failed",
      message: "An error occurred during authentication",
    });
  }
};

// Middleware to check user role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
        message: "User must be authenticated",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Insufficient permissions",
        message: `Access denied. Required role: ${roles.join(" or ")}`,
      });
    }

    next();
  };
};

// Middleware to require admin role (backward compatibility)
const requireAdmin = requireRole(["admin", "owner"]);

// Middleware to require user or admin role (backward compatibility)
const requireUser = requireRole([
  "user",
  "admin",
  "owner",
  "manager",
  "employee",
]);

// Middleware to require manager or owner role
const requireManager = requireRole(["owner", "manager"]);

// Middleware to require owner role
const requireOwner = requireRole(["owner"]);

// isAdmin middleware - checks if user is admin or owner
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: "Authentication required",
      message: "User must be authenticated",
    });
  }

  if (!["admin", "owner"].includes(req.user.role)) {
    return res.status(403).json({
      error: "Access denied",
      message: "Admin or Owner access required",
    });
  }

  next();
};

// Middleware to check if user is manager or owner
const isManagerOrOwner = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: "Authentication required",
      message: "User must be authenticated",
    });
  }

  if (!["owner", "manager"].includes(req.user.role)) {
    return res.status(403).json({
      error: "Access denied",
      message: "Manager or Owner access required",
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireUser,
  requireManager,
  requireOwner,
  isAdmin,
  isManagerOrOwner,
};
