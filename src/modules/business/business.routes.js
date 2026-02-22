const express = require("express");
const {
  authenticateToken,
} = require("../../shared/middleware/auth.middleware");
const businessController = require("./business.controller");
const { validateBusiness, validateRequest } = require("./business.schema");

const router = express.Router();

// GET /business/my - Get current user's business
router.get("/my", authenticateToken, businessController.getMyBusiness);

// PUT /business/my - Update current user's business
router.put(
  "/my",
  authenticateToken,
  validateBusiness,
  validateRequest,
  businessController.updateMyBusiness,
);

// GET /business/:businessId - Get business by ID (for future features)
router.get(
  "/:businessId",
  authenticateToken,
  businessController.getBusinessById,
);

module.exports = router;
