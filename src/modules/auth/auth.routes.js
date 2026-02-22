const express = require("express");
const {
  authenticateToken,
  isAdmin,
  isManagerOrOwner,
} = require("../../shared/middleware/auth.middleware");
const authController = require("./auth.controller");
const {
  validateRequest,
  registerSchema,
  loginSchema,
  updateProfileSchema,
  registerEmployeeSchema,
} = require("./auth.schema");

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post(
  "/register",
  registerSchema,
  validateRequest,
  authController.register,
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post("/login", loginSchema, validateRequest, authController.login);

// @route   GET /auth/me
// @desc    Get current user info (requires authentication)
// @access  Private
router.get("/me", authenticateToken, authController.me);

// @route   POST /auth/logout
// @desc    Logout user (client-side token removal)
// @access  Public
router.post("/logout", authController.logout);

// @route   GET /auth/users
// @desc    Get all users (Admin only)
// @access  Admin
router.get("/users", authenticateToken, isAdmin, authController.getUsers);

// @route   GET /auth/users/deleted
// @desc    Get all deleted users (Admin only)
// @access  Admin
router.get(
  "/users/deleted",
  authenticateToken,
  isAdmin,
  authController.getDeletedUsers,
);

// @route   PUT /auth/update
// @desc Update current user's profile
// @access Private
router.put(
  "/update",
  authenticateToken,
  updateProfileSchema,
  validateRequest,
  authController.updateProfile,
);

// @route   DELETE /auth/users/:uid
// @desc    Delete user by UID (Admin only)
// @access  Admin
router.delete(
  "/users/:uid",
  authenticateToken,
  isAdmin,
  authController.deleteUser,
);

// @route   PUT /auth/users/:uid/restore
// @desc    Restore deleted user by UID (Admin only)
// @access  Admin
router.put(
  "/users/:uid/restore",
  authenticateToken,
  isAdmin,
  authController.restoreUser,
);

// @route   POST /auth/register-employee
// @desc    Register a new employee user (only for owner/manager)
// @access  Owner/Manager Only
router.post(
  "/register-employee",
  authenticateToken,
  isManagerOrOwner,
  registerEmployeeSchema,
  validateRequest,
  authController.registerEmployee,
);

// @route   GET /auth/admin-only
// @desc    Test endpoint for admin-only access
// @access  Admin Only
router.get("/admin-only", authenticateToken, isAdmin, authController.adminOnly);

module.exports = router;
