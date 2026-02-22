const { body, param, query, validationResult } = require("express-validator");

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation Error",
      message: "Invalid input data",
      details: errors.array(),
    });
  }
  next();
};

const employeeIdSchema = [
  param("employeeId").notEmpty().withMessage("Employee ID is required"),
];

const leaveIdSchema = [
  param("leaveId").notEmpty().withMessage("Leave ID is required"),
];

const leaveBodySchema = [
  body("type")
    .isIn(["günlük", "yıllık", "mazeret"])
    .withMessage("Leave type must be one of: günlük, yıllık, mazeret"),
  body("startDate")
    .isISO8601()
    .withMessage("Start date must be a valid date (YYYY-MM-DD)"),
  body("endDate")
    .isISO8601()
    .withMessage("End date must be a valid date (YYYY-MM-DD)"),
  body("reason")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Reason must not exceed 500 characters"),
];

const listLeavesSchema = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1-100"),
  query("approved")
    .optional()
    .isIn(["true", "false"])
    .withMessage("approved must be true or false"),
  query("type")
    .optional()
    .isIn(["günlük", "yıllık", "mazeret"])
    .withMessage("type must be one of: günlük, yıllık, mazeret"),
  query("status").optional().isString().withMessage("status must be a string"),
];

const statisticsSchema = [
  query("year")
    .optional()
    .isInt({ min: 2000, max: 3000 })
    .withMessage("Year must be valid"),
];

const approveLeaveSchema = [
  body("status")
    .isIn(["approved", "rejected"])
    .withMessage("Status must be either approved or rejected"),
  body("approvalNote")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Approval note must not exceed 500 characters"),
];

module.exports = {
  validateRequest,
  employeeIdSchema,
  leaveIdSchema,
  leaveBodySchema,
  listLeavesSchema,
  statisticsSchema,
  approveLeaveSchema,
};
