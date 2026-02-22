const express = require("express");
const router = express.Router();
const {
  authenticateToken,
  isManagerOrOwner,
} = require("../../shared/middleware/auth.middleware");
const advancesController = require("./advances.controller");
const {
  validateRequest,
  createAdvanceSchema,
  advanceIdParamsSchema,
  updateAdvanceSchema,
  approveRejectSchema,
  deleteAdvanceSchema,
} = require("./advances.schema");

// Create advance request (Employee can only create for themselves, Owner/Manager can create for any employee)
router.post(
  "/",
  authenticateToken,
  createAdvanceSchema,
  validateRequest,
  advancesController.createAdvance,
);

// Get advance requests (Employee sees only their own, Owner/Manager see all or specific employee)
router.get("/", authenticateToken, advancesController.listAdvances);

// Get specific advance request by ID
router.get(
  "/:employeeId/:advanceId",
  authenticateToken,
  advanceIdParamsSchema,
  validateRequest,
  advancesController.getAdvance,
);

// Update advance request (Only employees can update their own pending requests)
router.put(
  "/:employeeId/:advanceId",
  authenticateToken,
  updateAdvanceSchema,
  validateRequest,
  advancesController.updateAdvance,
);

// Approve advance request (Only Owner/Manager can approve)
router.patch(
  "/:employeeId/:advanceId/approve",
  authenticateToken,
  isManagerOrOwner,
  approveRejectSchema,
  validateRequest,
  advancesController.approveAdvance,
);

// Reject advance request (Only Owner/Manager can reject)
router.patch(
  "/:employeeId/:advanceId/reject",
  authenticateToken,
  isManagerOrOwner,
  approveRejectSchema,
  validateRequest,
  advancesController.rejectAdvance,
);

// Delete advance request (Only employees can delete their own pending requests)
router.delete(
  "/:employeeId/:advanceId",
  authenticateToken,
  deleteAdvanceSchema,
  validateRequest,
  advancesController.deleteAdvance,
);

// Get advance request statistics (Employee sees only their own, Owner/Manager see all or specific employee)
router.get(
  "/statistics/:employeeId?",
  authenticateToken,
  advancesController.getAdvanceStatistics,
);

module.exports = router;
