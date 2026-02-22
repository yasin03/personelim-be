const express = require("express");
const router = express.Router({ mergeParams: true });

const {
  authenticateToken,
  isManagerOrOwner,
} = require("../../shared/middleware/auth.middleware");

const paymentsController = require("./payments.controller");
const {
  validateRequest,
  employeeIdSchema,
  paymentIdSchema,
  payrollIdSchema,
  createPaymentSchema,
  updatePaymentSchema,
  listPaymentsSchema,
  statisticsSchema,
} = require("./payments.schema");

router.post(
  "/",
  authenticateToken,
  isManagerOrOwner,
  employeeIdSchema,
  createPaymentSchema,
  validateRequest,
  paymentsController.verifyEmployeeOwnership,
  paymentsController.create,
);

router.get(
  "/",
  authenticateToken,
  employeeIdSchema,
  listPaymentsSchema,
  validateRequest,
  paymentsController.verifyEmployeeOwnership,
  paymentsController.list,
);

router.get(
  "/statistics",
  authenticateToken,
  employeeIdSchema,
  statisticsSchema,
  validateRequest,
  paymentsController.verifyEmployeeOwnership,
  paymentsController.statistics,
);

router.get(
  "/by-payroll/:payrollId",
  authenticateToken,
  employeeIdSchema,
  payrollIdSchema,
  validateRequest,
  paymentsController.verifyEmployeeOwnership,
  paymentsController.byPayroll,
);

router.get(
  "/:paymentId",
  authenticateToken,
  employeeIdSchema,
  paymentIdSchema,
  validateRequest,
  paymentsController.verifyEmployeeOwnership,
  paymentsController.getById,
);

router.put(
  "/:paymentId",
  authenticateToken,
  isManagerOrOwner,
  employeeIdSchema,
  paymentIdSchema,
  updatePaymentSchema,
  validateRequest,
  paymentsController.verifyEmployeeOwnership,
  paymentsController.update,
);

router.delete(
  "/:paymentId",
  authenticateToken,
  isManagerOrOwner,
  employeeIdSchema,
  paymentIdSchema,
  validateRequest,
  paymentsController.verifyEmployeeOwnership,
  paymentsController.remove,
);

module.exports = router;
