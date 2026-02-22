const express = require("express");

const router = express.Router({ mergeParams: true });

const {
  authenticateToken,
} = require("../../shared/middleware/auth.middleware");
const timesheetsController = require("./timesheets.controller");
const {
  validateRequest,
  createTimesheetSchema,
  listTimesheetsSchema,
  statisticsSchema,
  timesheetIdSchema,
  updateTimesheetSchema,
} = require("./timesheets.schema");

router.post(
  "/",
  authenticateToken,
  createTimesheetSchema,
  validateRequest,
  timesheetsController.createTimesheet,
);

router.get(
  "/",
  authenticateToken,
  listTimesheetsSchema,
  validateRequest,
  timesheetsController.listTimesheets,
);

router.get(
  "/statistics",
  authenticateToken,
  statisticsSchema,
  validateRequest,
  timesheetsController.getStatistics,
);

router.get(
  "/:timesheetId",
  authenticateToken,
  timesheetIdSchema,
  validateRequest,
  timesheetsController.getTimesheet,
);

router.put(
  "/:timesheetId",
  authenticateToken,
  updateTimesheetSchema,
  validateRequest,
  timesheetsController.updateTimesheet,
);

router.delete(
  "/:timesheetId",
  authenticateToken,
  timesheetIdSchema,
  validateRequest,
  timesheetsController.deleteTimesheet,
);

module.exports = router;
