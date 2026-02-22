const { body, param, validationResult } = require("express-validator");

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

const createAdvanceSchema = [
  body("amount").isNumeric().withMessage("Amount must be a number"),
  body("reason").notEmpty().withMessage("Reason is required"),
  body("employeeId")
    .optional()
    .isString()
    .withMessage("Employee ID must be a string"),
];

const advanceIdParamsSchema = [
  param("employeeId").isString().withMessage("Employee ID must be a string"),
  param("advanceId").isString().withMessage("Advance ID must be a string"),
];

const updateAdvanceSchema = [
  ...advanceIdParamsSchema,
  body("amount").optional().isNumeric().withMessage("Amount must be a number"),
  body("reason").optional().notEmpty().withMessage("Reason cannot be empty"),
];

const approveRejectSchema = [
  ...advanceIdParamsSchema,
  body("approvalNote")
    .optional()
    .isString()
    .withMessage("Approval note must be a string"),
];

const deleteAdvanceSchema = [...advanceIdParamsSchema];

module.exports = {
  validateRequest,
  createAdvanceSchema,
  advanceIdParamsSchema,
  updateAdvanceSchema,
  approveRejectSchema,
  deleteAdvanceSchema,
};
