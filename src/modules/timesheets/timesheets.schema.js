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

const createTimesheetSchema = [
  body("date")
    .isDate()
    .withMessage("Date must be a valid date in YYYY-MM-DD format"),
  body("status")
    .optional()
    .isIn(["Çalıştı", "İzinli", "Devamsız", "Yarım Gün", "Resmi Tatil"])
    .withMessage(
      "Status must be one of: Çalıştı, İzinli, Devamsız, Yarım Gün, Resmi Tatil",
    ),
  body("checkInTime")
    .optional()
    .matches(/^\d{2}:\d{2}$/)
    .withMessage("Check-in time must be in HH:MM format"),
  body("checkOutTime")
    .optional()
    .matches(/^\d{2}:\d{2}$/)
    .withMessage("Check-out time must be in HH:MM format"),
  body("totalHoursWorked")
    .optional()
    .isNumeric()
    .withMessage("Total hours worked must be a number"),
  body("overtimeHours")
    .optional()
    .isNumeric()
    .withMessage("Overtime hours must be a number"),
  body("notes").optional().isString().withMessage("Notes must be a string"),
];

const listTimesheetsSchema = [
  query("month")
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage("Month must be between 1-12"),
  query("year")
    .optional()
    .isInt({ min: 2000, max: 3000 })
    .withMessage("Year must be valid"),
  query("status")
    .optional()
    .isIn(["Çalıştı", "İzinli", "Devamsız", "Yarım Gün", "Resmi Tatil"])
    .withMessage("Status must be valid"),
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
  query("month")
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage("Month must be between 1-12"),
  query("year")
    .optional()
    .isInt({ min: 2000, max: 3000 })
    .withMessage("Year must be valid"),
];

const timesheetIdSchema = [
  param("employeeId").isString().withMessage("Employee ID must be a string"),
  param("timesheetId").isString().withMessage("Timesheet ID must be a string"),
];

const updateTimesheetSchema = [
  ...timesheetIdSchema,
  body("date").optional().isDate().withMessage("Date must be a valid date"),
  body("status")
    .optional()
    .isIn(["Çalıştı", "İzinli", "Devamsız", "Yarım Gün", "Resmi Tatil"])
    .withMessage("Status must be valid"),
  body("checkInTime")
    .optional()
    .matches(/^\d{2}:\d{2}$/)
    .withMessage("Check-in time must be in HH:MM format"),
  body("checkOutTime")
    .optional()
    .matches(/^\d{2}:\d{2}$/)
    .withMessage("Check-out time must be in HH:MM format"),
  body("totalHoursWorked")
    .optional()
    .isNumeric()
    .withMessage("Total hours worked must be a number"),
  body("overtimeHours")
    .optional()
    .isNumeric()
    .withMessage("Overtime hours must be a number"),
  body("notes").optional().isString().withMessage("Notes must be a string"),
];

module.exports = {
  validateRequest,
  createTimesheetSchema,
  listTimesheetsSchema,
  statisticsSchema,
  timesheetIdSchema,
  updateTimesheetSchema,
};
