const express = require("express");
const {
  authenticateToken,
  isManagerOrOwner,
} = require("../../shared/middleware/auth.middleware");

const router = express.Router({ mergeParams: true });

const leavesController = require("./leaves.controller");
const {
  validateRequest,
  employeeIdSchema,
  leaveIdSchema,
  leaveBodySchema,
  listLeavesSchema,
  statisticsSchema,
  approveLeaveSchema,
} = require("./leaves.schema");

router.post(
  "/",
  authenticateToken,
  employeeIdSchema,
  leaveBodySchema,
  validateRequest,
  leavesController.verifyEmployeeOwnership,
  leavesController.createLeave,
);

router.get(
  "/",
  authenticateToken,
  employeeIdSchema,
  listLeavesSchema,
  validateRequest,
  leavesController.verifyEmployeeOwnership,
  leavesController.listLeaves,
);

router.get(
  "/statistics",
  authenticateToken,
  employeeIdSchema,
  statisticsSchema,
  validateRequest,
  leavesController.verifyEmployeeOwnership,
  leavesController.statistics,
);

router.get(
  "/:leaveId",
  authenticateToken,
  employeeIdSchema,
  leaveIdSchema,
  validateRequest,
  leavesController.verifyEmployeeOwnership,
  leavesController.getLeave,
);

router.put(
  "/:leaveId",
  authenticateToken,
  employeeIdSchema,
  leaveIdSchema,
  leaveBodySchema,
  validateRequest,
  leavesController.verifyEmployeeOwnership,
  leavesController.updateLeave,
);

router.patch(
  "/:leaveId/approve",
  authenticateToken,
  isManagerOrOwner,
  employeeIdSchema,
  leaveIdSchema,
  approveLeaveSchema,
  validateRequest,
  leavesController.verifyEmployeeOwnership,
  leavesController.approve,
);

router.delete(
  "/:leaveId",
  authenticateToken,
  employeeIdSchema,
  leaveIdSchema,
  validateRequest,
  leavesController.verifyEmployeeOwnership,
  leavesController.removeLeave,
);

module.exports = router;
