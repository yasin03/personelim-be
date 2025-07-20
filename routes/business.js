const express = require("express");
const { body, validationResult } = require("express-validator");
const Business = require("../models/Business");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();


// Validation middleware
const validateBusiness = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Business name must be between 2 and 100 characters"),
  body("address")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Address must not exceed 500 characters"),
  body("phone")
    .optional()
    .isMobilePhone("tr-TR")
    .withMessage("Please provide a valid Turkish phone number"),
  body("email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email"),
  body("logoUrl")
    .optional()
    .isURL()
    .withMessage("Please provide a valid URL for logo"),
];

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation error",
      message: "Please check your input data",
      details: errors.array(),
    });
  }
  next();
};

// GET /business/my - Get current user's business
router.get("/my", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;

    const business = await Business.findByOwnerId(userId);

    if (!business) {
      return res.status(404).json({
        error: "Business not found",
        message: "No business found for this user",
      });
    }

    res.status(200).json({
      message: "Business retrieved successfully",
      data: Business.sanitize(business),
    });
  } catch (error) {
    console.error("Get business error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to retrieve business information",
    });
  }
});

// PUT /business/my - Update current user's business
router.put(
  "/my",
  authenticateToken,
  validateBusiness,
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user.uid;
      const updateData = req.body;

      // Find user's business first
      const business = await Business.findByOwnerId(userId);

      if (!business) {
        return res.status(404).json({
          error: "Business not found",
          message: "No business found for this user",
        });
      }

      // Check if there's anything to update
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          error: "No update data provided",
          message: "Please provide data to update",
        });
      }

      const updatedBusiness = await Business.updateById(
        business.id,
        updateData
      );

      res.status(200).json({
        message: "Business updated successfully",
        data: Business.sanitize(updatedBusiness),
      });
    } catch (error) {
      console.error("Update business error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to update business information",
      });
    }
  }
);

// GET /business/:businessId - Get business by ID (for future features)
router.get("/:businessId", authenticateToken, async (req, res) => {
  try {
    const { businessId } = req.params;

    const business = await Business.findById(businessId);

    if (!business) {
      return res.status(404).json({
        error: "Business not found",
        message: "Business with the specified ID does not exist",
      });
    }

    res.status(200).json({
      message: "Business retrieved successfully",
      data: Business.sanitize(business),
    });
  } catch (error) {
    console.error("Get business by ID error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to retrieve business information",
    });
  }
});

module.exports = router;
