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

const paymentIdSchema = [
  param("paymentId").isString().withMessage("Payment ID must be a string"),
];

const payrollIdSchema = [
  param("payrollId").isString().withMessage("Payroll ID must be a string"),
];

const createPaymentSchema = [
  body("amount").isNumeric().withMessage("Amount must be a number"),
  body("payrollId")
    .optional()
    .isString()
    .withMessage("Payroll ID must be a string"),
  body("currency")
    .optional()
    .isIn(["TL", "USD", "EUR"])
    .withMessage("Currency must be TL, USD, or EUR"),
  body("paymentDate")
    .optional()
    .isISO8601()
    .withMessage("Payment date must be a valid ISO date"),
  body("paymentMethod")
    .optional()
    .isIn(["Banka Havalesi", "Nakit"])
    .withMessage("Payment method must be Banka Havalesi or Nakit"),
  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string"),
];

const updatePaymentSchema = [
  body("amount").optional().isNumeric().withMessage("Amount must be a number"),
  body("currency")
    .optional()
    .isIn(["TL", "USD", "EUR"])
    .withMessage("Currency must be TL, USD, or EUR"),
  body("paymentDate")
    .optional()
    .isISO8601()
    .withMessage("Payment date must be a valid ISO date"),
  body("paymentMethod")
    .optional()
    .isIn(["Banka Havalesi", "Nakit"])
    .withMessage("Payment method must be Banka Havalesi or Nakit"),
  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string"),
];

const listPaymentsSchema = [
  query("year")
    .optional()
    .isInt({ min: 2000, max: 3000 })
    .withMessage("Year must be valid"),
  query("paymentMethod")
    .optional()
    .isIn(["Banka Havalesi", "Nakit"])
    .withMessage("Payment method must be valid"),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO date"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO date"),
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
  paymentIdSchema,
  payrollIdSchema,
  createPaymentSchema,
  updatePaymentSchema,
  listPaymentsSchema,
  statisticsSchema,
};
