const express = require("express");
const router = express.Router({ mergeParams: true });

const {
  authenticateToken,
  isManagerOrOwner,
} = require("../../shared/middleware/auth.middleware");

const payrollsController = require("./payrolls.controller");
const {
  validateRequest,
  employeeIdSchema,
  payrollIdSchema,
  createPayrollSchema,
  updatePayrollSchema,
  listPayrollsSchema,
  statisticsSchema,
} = require("./payrolls.schema");

router.post(
  "/",
  authenticateToken,
  isManagerOrOwner,
  employeeIdSchema,
  createPayrollSchema,
  validateRequest,
  payrollsController.verifyEmployeeOwnership,
  payrollsController.create,
);

router.get(
  "/",
  authenticateToken,
  employeeIdSchema,
  listPayrollsSchema,
  validateRequest,
  payrollsController.verifyEmployeeOwnership,
  payrollsController.list,
);

router.get(
  "/statistics",
  authenticateToken,
  employeeIdSchema,
  statisticsSchema,
  validateRequest,
  payrollsController.verifyEmployeeOwnership,
  payrollsController.statistics,
);

router.get(
  "/:payrollId",
  authenticateToken,
  employeeIdSchema,
  payrollIdSchema,
  validateRequest,
  payrollsController.verifyEmployeeOwnership,
  payrollsController.getById,
);

router.put(
  "/:payrollId",
  authenticateToken,
  isManagerOrOwner,
  employeeIdSchema,
  payrollIdSchema,
  updatePayrollSchema,
  validateRequest,
  payrollsController.verifyEmployeeOwnership,
  payrollsController.update,
);

router.patch(
  "/:payrollId/pay",
  authenticateToken,
  isManagerOrOwner,
  employeeIdSchema,
  payrollIdSchema,
  validateRequest,
  payrollsController.verifyEmployeeOwnership,
  payrollsController.markPaid,
);

router.delete(
  "/:payrollId",
  authenticateToken,
  isManagerOrOwner,
  employeeIdSchema,
  payrollIdSchema,
  validateRequest,
  payrollsController.verifyEmployeeOwnership,
  payrollsController.remove,
);

module.exports = router;
