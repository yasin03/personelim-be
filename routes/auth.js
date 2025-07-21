const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const { db, COLLECTIONS } = require("../config/firebase");
const {
  authenticateToken,
  isAdmin,
  isManagerOrOwner,
} = require("../middleware/auth");
const User = require("../models/User");
const Business = require("../models/Business");
const { Employee } = require("../models/Employee");

const router = express.Router();

// Validation middleware
const validateRegister = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one lowercase letter, one uppercase letter, and one number"
    ),
  body("role")
    .optional()
    .isIn(["admin", "user", "owner"])
    .withMessage("Role must be admin, user, or owner"),
];

const validateLogin = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
];

// Helper function to generate JWT token
const generateToken = (uid, email, role) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  return jwt.sign({ uid, email, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post("/register", validateRegister, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        error: "User already exists",
        message: "A user with this email already exists",
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // First, create a business for this user
    const newBusiness = await Business.create({
      name: "Yeni İşletme",
      address: "",
      phone: "",
      email: email.toLowerCase(),
      logoUrl: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
      ownerId: null, // Will be updated after user creation
    });

    // Create user using model with businessId and role as "owner"
    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      role: "owner", // Always set role as "owner" for new registrations
      businessId: newBusiness.id,
    });

    // Update business with the actual user ID
    await Business.updateById(newBusiness.id, {
      ownerId: newUser.uid,
    });

    // Save password separately in a secure way
    await db.collection(COLLECTIONS.USERS).doc(newUser.uid).update({
      password: hashedPassword,
    });

    // Generate JWT token
    const token = generateToken(newUser.uid, newUser.email, newUser.role);

    // Return success response (sanitized)
    const userResponse = User.sanitize(newUser);
    const businessResponse = Business.sanitize(newBusiness);

    res.status(201).json({
      message: "User and business created successfully",
      user: userResponse,
      business: {
        ...businessResponse,
        ownerId: newUser.uid,
      },
      token,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      error: "Registration failed",
      message: "An error occurred during user registration",
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post("/login", validateLogin, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      });
    }

    const { email, password } = req.body;

    // Check if user exists using model
    const user = await User.findByEmail(email.toLowerCase());
    if (!user) {
      return res.status(400).json({
        error: "Invalid credentials",
        message: "Email or password is incorrect",
      });
    }

    // Get password from database separately
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(user.uid).get();
    const userPassword = userDoc.data().password;

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, userPassword);
    if (!isPasswordValid) {
      return res.status(400).json({
        error: "Invalid credentials",
        message: "Email or password is incorrect",
      });
    }

    // Update last login timestamp using model
    const lastLogin = await User.updateLastLogin(user.uid);

    // Generate JWT token
    const token = generateToken(user.uid, user.email, user.role);

    // Return success response (sanitized)
    const userResponse = {
      uid: user.uid,
      name: user.name,
      email: user.email,
      role: user.role,
      lastLogin: lastLogin,
    };

    res.status(200).json({
      message: "Login successful",
      user: userResponse,
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      error: "Login failed",
      message: "An error occurred during login",
    });
  }
});

// @route   GET /auth/me
// @desc    Get current user info (requires authentication)
// @access  Private
router.get("/me", authenticateToken, async (req, res) => {
  try {
    // Get user from database using model
    const user = await User.findById(req.user.uid);

    if (!user) {
      return res.status(404).json({
        error: "User not found",
        message: "User does not exist",
      });
    }

    // Return user info (sanitized - no password)
    const userResponse = User.sanitize(user);

    res.status(200).json({
      user: userResponse,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      error: "Server error",
      message: "An error occurred while fetching user information",
    });
  }
});

// @route   POST /auth/logout
// @desc    Logout user (client-side token removal)
// @access  Public
router.post("/logout", (req, res) => {
  // JWT token sisteminde logout işlemi server tarafında yapılmaz
  // Token client tarafında silinir
  res.status(200).json({
    message: "Başarıyla çıkış yapıldı",
    success: true,
  });
});

// @route   GET /auth/users
// @desc    Get all users (Admin only)
// @access  Admin
router.get("/users", authenticateToken, isAdmin, async (req, res) => {
  try {
    const users = await User.findAll();

    res.status(200).json({
      message: "Users retrieved successfully",
      users: users,
      count: users.length,
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      error: "Server error",
      message: "An error occurred while fetching users",
    });
  }
});

// @route   GET /auth/users/deleted
// @desc    Get all deleted users (Admin only)
// @access  Admin
router.get("/users/deleted", authenticateToken, isAdmin, async (req, res) => {
  try {
    const deletedUsers = await User.findDeleted();

    res.status(200).json({
      message: "Deleted users retrieved successfully",
      users: deletedUsers,
      count: deletedUsers.length,
    });
  } catch (error) {
    console.error("Get deleted users error:", error);
    res.status(500).json({
      error: "Server error",
      message: "An error occurred while fetching deleted users",
    });
  }
});

// @route   PUT /auth/update
// @desc Update current user's profile
// @access Private
router.put(
  "/update",
  [
    authenticateToken,
    body("name")
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Name must be between 2 and 50 characters"),
    body("role")
      .optional()
      .isIn(["admin", "user"])
      .withMessage("Role must be either admin or user"),
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { name, role } = req.body;
      const updateData = {};

      // Only include fields that are provided
      if (name !== undefined) {
        updateData.name = name.trim();
      }
      if (role !== undefined) {
        updateData.role = role;
      }

      // Check if there's anything to update
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          error: "No update data provided",
          message: "Please provide name or role to update",
        });
      }

      // Update user using model
      const updatedUser = await User.updateById(req.user.uid, updateData);

      if (!updatedUser) {
        return res.status(404).json({
          error: "User not found",
          message: "User does not exist",
        });
      }

      // Return updated user (sanitized)
      const userResponse = User.sanitize(updatedUser);

      res.status(200).json({
        message: "User updated successfully",
        user: userResponse,
      });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({
        error: "Update failed",
        message: "An error occurred while updating user",
      });
    }
  }
);

// @route   DELETE /auth/users/:uid
// @desc    Delete user by UID (Admin only)
// @access  Admin
router.delete("/users/:uid", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { uid } = req.params;

    // Prevent admin from deleting themselves
    if (uid === req.user.uid) {
      return res.status(400).json({
        error: "Cannot delete yourself",
        message: "You cannot delete your own account",
      });
    }

    // Soft delete user using model
    const deletedUser = await User.deleteById(uid);

    if (!deletedUser) {
      return res.status(404).json({
        error: "User not found",
        message: "User does not exist or is already deleted",
      });
    }

    // Return deleted user info (sanitized)
    const userResponse = User.sanitize(deletedUser);

    res.status(200).json({
      message: "User deleted successfully (soft delete)",
      deletedUser: userResponse,
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      error: "Delete failed",
      message: "An error occurred while deleting user",
    });
  }
});

// @route   PUT /auth/users/:uid/restore
// @desc    Restore deleted user by UID (Admin only)
// @access  Admin
router.put(
  "/users/:uid/restore",
  authenticateToken,
  isAdmin,
  async (req, res) => {
    try {
      const { uid } = req.params;

      // Restore user using model
      const restoredUser = await User.restoreById(uid);

      if (!restoredUser) {
        return res.status(404).json({
          error: "User not found",
          message: "User does not exist or is not deleted",
        });
      }

      // Return restored user info (sanitized)
      const userResponse = User.sanitize(restoredUser);

      res.status(200).json({
        message: "User restored successfully",
        restoredUser: userResponse,
      });
    } catch (error) {
      console.error("Restore user error:", error);
      res.status(500).json({
        error: "Restore failed",
        message: "An error occurred while restoring user",
      });
    }
  }
);

// @route   POST /auth/register-employee
// @desc    Register a new employee user (only for owner/manager)
// @access  Owner/Manager Only
router.post(
  "/register-employee",
  authenticateToken,
  isManagerOrOwner,
  [
    body("employeeId").notEmpty().withMessage("Employee ID is required"),
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage(
        "Password must contain at least one lowercase letter, one uppercase letter, and one number"
      ),
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { employeeId, email, password } = req.body;
      const managerId = req.user.uid;
      const businessId = req.user.userData.businessId;

      // Check if employee exists and belongs to the manager
      const employee = await Employee.findById(managerId, employeeId);
      if (!employee) {
        return res.status(404).json({
          error: "Employee not found",
          message: "Employee does not exist or does not belong to you",
        });
      }

      // Check if user with this email already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          error: "User already exists",
          message: "A user with this email already exists",
        });
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user for employee
      const newUser = await User.create({
        name: `${employee.firstName} ${employee.lastName}`,
        email: email.toLowerCase(),
        role: "employee",
        businessId: businessId,
        employeeId: employeeId,
      });

      // Store password separately
      await db.collection(COLLECTIONS.PASSWORDS).doc(newUser.uid).set({
        password: hashedPassword,
        createdAt: new Date().toISOString(),
      });

      // Update employee record with userId
      await Employee.updateById(managerId, employeeId, {
        userId: newUser.uid,
        email: email.toLowerCase(),
      });

      // Generate JWT token
      const token = generateToken(newUser.uid, newUser.email, newUser.role);

      res.status(201).json({
        message: "Employee user created successfully",
        user: User.sanitize(newUser),
        token,
      });
    } catch (error) {
      console.error("Employee registration error:", error);
      res.status(500).json({
        error: "Registration failed",
        message: "An error occurred while creating employee user",
      });
    }
  }
);

// @route   GET /auth/admin-only
// @desc    Test endpoint for admin-only access
// @access  Admin Only
router.get("/admin-only", authenticateToken, isAdmin, (req, res) => {
  res.status(200).json({
    message: "Bu sadece admin kullanıcılar için erişilebilir endpoint",
    user: {
      uid: req.user.uid,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

module.exports = router;
