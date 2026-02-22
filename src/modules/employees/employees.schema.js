const { body, param, validationResult } = require("express-validator");
const { CONTRACT_TYPES, WORK_MODES } = require("../../../models/Employee");

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

const validateEmployeeSchema = [
  body("firstName")
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters"),
  body("lastName")
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters"),
  body("email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email"),
  body("phoneNumber")
    .optional()
    .isMobilePhone("tr-TR")
    .withMessage("Please provide a valid Turkish phone number"),
  body("tcKimlikNo")
    .optional()
    .isLength({ min: 11, max: 11 })
    .withMessage("TC Kimlik No must be 11 digits")
    .isNumeric()
    .withMessage("TC Kimlik No must contain only numbers"),
  body("position")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Position must be between 2 and 100 characters"),
  body("department")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Department must be between 2 and 100 characters"),
  body("contractType")
    .optional()
    .isIn(CONTRACT_TYPES)
    .withMessage(`Contract type must be one of: ${CONTRACT_TYPES.join(", ")}`),
  body("workMode")
    .optional()
    .isIn(WORK_MODES)
    .withMessage(`Work mode must be one of: ${WORK_MODES.join(", ")}`),
  body("workingHoursPerDay")
    .optional()
    .isFloat({ min: 1, max: 24 })
    .withMessage("Working hours per day must be between 1 and 24"),
  body("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid date"),
  body("terminationDate")
    .optional()
    .isISO8601()
    .withMessage("Termination date must be a valid date"),
  body("salary.grossAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Gross amount must be a positive number"),
  body("salary.netAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Net amount must be a positive number"),
  body("salary.currency")
    .optional()
    .isIn(["TL", "USD", "EUR"])
    .withMessage("Currency must be TL, USD, or EUR"),
];

const employeeIdSchema = [
  param("employeeId").notEmpty().withMessage("Employee ID is required"),
];

const updateMyProfileSchema = [
  body("phoneNumber")
    .optional()
    .isMobilePhone("tr-TR")
    .withMessage("Please provide a valid Turkish phone number"),
  body("address")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Address must not exceed 500 characters"),
  body("profilePictureUrl")
    .optional()
    .isURL()
    .withMessage("Please provide a valid URL"),
];

const createMyLeaveSchema = [
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

const createMyAdvanceSchema = [
  body("amount").isNumeric().withMessage("Amount must be a number"),
  body("reason").notEmpty().withMessage("Reason is required"),
];

module.exports = {
  validateRequest,
  validateEmployeeSchema,
  employeeIdSchema,
  updateMyProfileSchema,
  createMyLeaveSchema,
  createMyAdvanceSchema,
};
