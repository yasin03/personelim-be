const { body, validationResult } = require("express-validator");

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation error",
      message: "Please check your input data",
      details: errors.array(),
    });
  }
  next();
};

const validateBusiness = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Business name must be between 2 and 100 characters"),
  body("address")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Address must not exceed 500 characters"),
  body("phone")
    .optional()
    .isMobilePhone("tr-TR")
    .withMessage("Please provide a valid Turkish phone number"),
  body("email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email"),
  body("logoUrl")
    .optional()
    .isURL()
    .withMessage("Please provide a valid URL for logo"),
];

module.exports = {
  validateRequest,
  validateBusiness,
};
