const express = require("express");
const {
  authenticateToken,
  isManagerOrOwner,
} = require("../../shared/middleware/auth.middleware");

const employeesController = require("./employees.controller");
const {
  validateRequest,
  validateEmployeeSchema,
  employeeIdSchema,
  updateMyProfileSchema,
  createMyLeaveSchema,
  createMyAdvanceSchema,
} = require("./employees.schema");

const router = express.Router();

router.get("/me", authenticateToken, employeesController.me);

router.put(
  "/me",
  authenticateToken,
  updateMyProfileSchema,
  validateRequest,
  employeesController.updateMe,
);

router.get("/me/leaves", authenticateToken, employeesController.myLeaves);

router.post(
  "/me/leaves",
  authenticateToken,
  createMyLeaveSchema,
  validateRequest,
  employeesController.createMyLeave,
);

router.get("/me/advances", authenticateToken, employeesController.myAdvances);

router.post(
  "/me/advances",
  authenticateToken,
  createMyAdvanceSchema,
  validateRequest,
  employeesController.createMyAdvance,
);

router.get(
  "/contract-types",
  authenticateToken,
  isManagerOrOwner,
  employeesController.contractTypes,
);

router.get(
  "/work-modes",
  authenticateToken,
  isManagerOrOwner,
  employeesController.workModes,
);

router.get("/", authenticateToken, isManagerOrOwner, employeesController.list);

router.get(
  "/deleted",
  authenticateToken,
  isManagerOrOwner,
  employeesController.listDeleted,
);

router.get(
  "/statistics",
  authenticateToken,
  isManagerOrOwner,
  employeesController.statistics,
);

router.get(
  "/:employeeId",
  authenticateToken,
  isManagerOrOwner,
  employeeIdSchema,
  validateRequest,
  employeesController.getById,
);

router.post(
  "/",
  authenticateToken,
  isManagerOrOwner,
  validateEmployeeSchema,
  validateRequest,
  employeesController.create,
);

router.put(
  "/:employeeId",
  authenticateToken,
  employeeIdSchema,
  validateEmployeeSchema,
  validateRequest,
  employeesController.update,
);

router.delete(
  "/:employeeId",
  authenticateToken,
  employeeIdSchema,
  validateRequest,
  employeesController.remove,
);

router.post(
  "/:employeeId/restore",
  authenticateToken,
  employeeIdSchema,
  validateRequest,
  employeesController.restore,
);

module.exports = router;
