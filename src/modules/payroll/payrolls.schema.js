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
  param("employeeId").isString().withMessage("Employee ID must be a string"),
];

const payrollIdSchema = [
  param("payrollId").isString().withMessage("Payroll ID must be a string"),
];

const createPayrollSchema = [
  body("periodMonth")
    .matches(/^(0[1-9]|1[0-2])$/)
    .withMessage("Period month must be in MM format (01-12)"),
  body("periodYear")
    .matches(/^\d{4}$/)
    .withMessage("Period year must be in YYYY format"),
  body("grossSalary").isNumeric().withMessage("Gross salary must be a number"),
  body("totalDeductions")
    .optional()
    .isNumeric()
    .withMessage("Total deductions must be a number"),
  body("insurancePremiumEmployeeShare")
    .optional()
    .isNumeric()
    .withMessage("Insurance premium employee share must be a number"),
  body("insurancePremiumEmployerShare")
    .optional()
    .isNumeric()
    .withMessage("Insurance premium employer share must be a number"),
  body("taxDeduction")
    .optional()
    .isNumeric()
    .withMessage("Tax deduction must be a number"),
  body("otherAdditions")
    .optional()
    .isNumeric()
    .withMessage("Other additions must be a number"),
  body("currency")
    .optional()
    .isIn(["TL", "USD", "EUR"])
    .withMessage("Currency must be TL, USD, or EUR"),
];

const updatePayrollSchema = [
  body("grossSalary")
    .optional()
    .isNumeric()
    .withMessage("Gross salary must be a number"),
  body("totalDeductions")
    .optional()
    .isNumeric()
    .withMessage("Total deductions must be a number"),
  body("insurancePremiumEmployeeShare")
    .optional()
    .isNumeric()
    .withMessage("Insurance premium employee share must be a number"),
  body("insurancePremiumEmployerShare")
    .optional()
    .isNumeric()
    .withMessage("Insurance premium employer share must be a number"),
  body("taxDeduction")
    .optional()
    .isNumeric()
    .withMessage("Tax deduction must be a number"),
  body("otherAdditions")
    .optional()
    .isNumeric()
    .withMessage("Other additions must be a number"),
  body("currency")
    .optional()
    .isIn(["TL", "USD", "EUR"])
    .withMessage("Currency must be TL, USD, or EUR"),
];

const listPayrollsSchema = [
  query("year")
    .optional()
    .isInt({ min: 2000, max: 3000 })
    .withMessage("Year must be valid"),
  query("status")
    .optional()
    .isIn(["Ödendi", "Beklemede"])
    .withMessage("Status must be Ödendi or Beklemede"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1-100"),
];

const statisticsSchema = [
  query("year")
    .optional()
    .isInt({ min: 2000, max: 3000 })
    .withMessage("Year must be valid"),
];

module.exports = {
  validateRequest,
  employeeIdSchema,
  payrollIdSchema,
  createPayrollSchema,
  updatePayrollSchema,
  listPayrollsSchema,
  statisticsSchema,
};
