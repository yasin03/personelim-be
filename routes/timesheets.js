const express = require("express");
const { body, param, query, validationResult } = require("express-validator");
const router = express.Router({ mergeParams: true });
const Timesheet = require("../models/Timesheet");
const { Employee } = require("../models/Employee");
const Business = require("../models/Business");
const { authenticateToken, isManagerOrOwner } = require("../middleware/auth");

// Error handling helper
const handleValidationErrors = (req, res, next) => {
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

const stripApprovalFields = (payload) => {
  if (!payload || typeof payload !== "object") {
    return;
  }

  delete payload.approvalStatus;
  delete payload.approvalNote;
  delete payload.approvedBy;
  delete payload.approvedAt;
};

const buildErrorResponse = (status, error, message) => ({
  status,
  body: { error, message },
});

const resolveTimesheetContext = async (req, employeeId) => {
  if (!employeeId) {
    return {
      errorResponse: buildErrorResponse(
        400,
        "Validation Error",
        "Employee ID is required"
      ),
    };
  }

  if (req.user.role === "employee") {
    const employee = await Employee.findByUserId(req.user.uid);
    if (!employee || employee.id !== employeeId) {
      return {
        errorResponse: buildErrorResponse(
          403,
          "Forbidden",
          "You can only access your own timesheets"
        ),
      };
    }

    return {
      ownerUserId: employee.businessOwnerId,
      employee,
      actorRole: "employee",
    };
  }

  if (req.user.role === "manager") {
    const businessId = req.user.userData?.businessId;
    if (!businessId) {
      return {
        errorResponse: buildErrorResponse(
          403,
          "Forbidden",
          "Associated business not found for manager user"
        ),
      };
    }

    const business = await Business.findById(businessId);
    if (!business || !business.ownerId) {
      return {
        errorResponse: buildErrorResponse(
          404,
          "Not Found",
          "Business owner could not be determined"
        ),
      };
    }

    const employee = await Employee.findById(business.ownerId, employeeId);
    if (!employee) {
      return {
        errorResponse: buildErrorResponse(
          404,
          "Not Found",
          "Employee not found"
        ),
      };
    }

    return {
      ownerUserId: business.ownerId,
      employee,
      actorRole: "manager",
    };
  }

  const employee = await Employee.findById(req.user.uid, employeeId);
  if (!employee) {
    return {
      errorResponse: buildErrorResponse(
        404,
        "Not Found",
        "Employee not found"
      ),
    };
  }

  return {
    ownerUserId: req.user.uid,
    employee,
    actorRole: req.user.role,
  };
};

// Create timesheet (Owner/Manager can create for any employee, Employee can create for themselves)
router.post(
  "/",
  authenticateToken,
  [
    body("date")
      .isDate()
      .withMessage("Date must be a valid date in YYYY-MM-DD format"),
    body("status")
      .optional()
      .isIn(["Çalıştı", "İzinli", "Devamsız", "Yarım Gün", "Resmi Tatil"])
      .withMessage(
        "Status must be one of: Çalıştı, İzinli, Devamsız, Yarım Gün, Resmi Tatil"
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
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { employeeId } = req.params;
      const timesheetData = req.body;
      stripApprovalFields(timesheetData);

      const context = await resolveTimesheetContext(req, employeeId);
      if (context.errorResponse) {
        return res
          .status(context.errorResponse.status)
          .json(context.errorResponse.body);
      }

      // Validate timesheet data
      Timesheet.validateTimesheetData(timesheetData);

      // Create the timesheet
      const timesheet = await Timesheet.create(
        context.ownerUserId,
        employeeId,
        timesheetData
      );

      console.log(
        `Timesheet created for employee ${employeeId} by user ${req.user.email}`
      );

      res.status(201).json({
        message: "Timesheet created successfully",
        data: timesheet,
      });
    } catch (error) {
      console.error("Error creating timesheet:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message || "Failed to create timesheet",
      });
    }
  }
);

// Get timesheets (Employee sees only their own, Owner/Manager see all for specific employee)
router.get(
  "/",
  authenticateToken,
  [
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
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { employeeId } = req.params;
      const { month, year, status, page = 1, limit = 10 } = req.query;

      const context = await resolveTimesheetContext(req, employeeId);
      if (context.errorResponse) {
        return res
          .status(context.errorResponse.status)
          .json(context.errorResponse.body);
      }

      const options = {
        month,
        year,
        status,
        page: parseInt(page),
        limit: parseInt(limit),
      };

      const result = await Timesheet.findAllByEmployeeId(
        context.ownerUserId,
        employeeId,
        options
      );

      res.status(200).json({
        message: "Timesheets retrieved successfully",
        data: result,
      });
    } catch (error) {
      console.error("Error getting timesheets:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message || "Failed to get timesheets",
      });
    }
  }
);

// Get timesheet statistics
router.get(
  "/statistics",
  authenticateToken,
  [
    query("month")
      .optional()
      .isInt({ min: 1, max: 12 })
      .withMessage("Month must be between 1-12"),
    query("year")
      .optional()
      .isInt({ min: 2000, max: 3000 })
      .withMessage("Year must be valid"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { employeeId } = req.params;
      const { month, year = new Date().getFullYear() } = req.query;

      const context = await resolveTimesheetContext(req, employeeId);
      if (context.errorResponse) {
        return res
          .status(context.errorResponse.status)
          .json(context.errorResponse.body);
      }

      const options = {
        month,
        year: parseInt(year),
      };

      const stats = await Timesheet.getStatistics(
        context.ownerUserId,
        employeeId,
        options
      );

      res.status(200).json({
        message: "Timesheet statistics retrieved successfully",
        data: stats,
      });
    } catch (error) {
      console.error("Error getting timesheet statistics:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message || "Failed to get timesheet statistics",
      });
    }
  }
);

// Get specific timesheet by ID
router.get(
  "/:timesheetId",
  authenticateToken,
  [
    param("employeeId").isString().withMessage("Employee ID must be a string"),
    param("timesheetId")
      .isString()
      .withMessage("Timesheet ID must be a string"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { employeeId, timesheetId } = req.params;

      const context = await resolveTimesheetContext(req, employeeId);
      if (context.errorResponse) {
        return res
          .status(context.errorResponse.status)
          .json(context.errorResponse.body);
      }

      const timesheet = await Timesheet.findById(
        context.ownerUserId,
        employeeId,
        timesheetId
      );
      if (!timesheet) {
        return res.status(404).json({
          error: "Not Found",
          message: "Timesheet not found",
        });
      }

      res.status(200).json({
        message: "Timesheet retrieved successfully",
        data: timesheet,
      });
    } catch (error) {
      console.error("Error getting timesheet:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message || "Failed to get timesheet",
      });
    }
  }
);

// Update timesheet
router.put(
  "/:timesheetId",
  authenticateToken,
  [
    param("employeeId").isString().withMessage("Employee ID must be a string"),
    param("timesheetId")
      .isString()
      .withMessage("Timesheet ID must be a string"),
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
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { employeeId, timesheetId } = req.params;
      const updateData = req.body;
      stripApprovalFields(updateData);

      const context = await resolveTimesheetContext(req, employeeId);
      if (context.errorResponse) {
        return res
          .status(context.errorResponse.status)
          .json(context.errorResponse.body);
      }

      // Get current timesheet
      const currentTimesheet = await Timesheet.findById(
        context.ownerUserId,
        employeeId,
        timesheetId
      );
      if (!currentTimesheet) {
        return res.status(404).json({
          error: "Not Found",
          message: "Timesheet not found",
        });
      }

      // Validate timesheet data if provided
      if (Object.keys(updateData).length > 0) {
        Timesheet.validateTimesheetData({ ...currentTimesheet, ...updateData });
      }

      // Update the timesheet
      const updatedTimesheet = await Timesheet.updateById(
        context.ownerUserId,
        employeeId,
        timesheetId,
        updateData
      );

      console.log(`Timesheet ${timesheetId} updated by user ${req.user.email}`);

      res.status(200).json({
        message: "Timesheet updated successfully",
        data: updatedTimesheet,
      });
    } catch (error) {
      console.error("Error updating timesheet:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message || "Failed to update timesheet",
      });
    }
  }
);

// Delete timesheet
router.delete(
  "/:timesheetId",
  authenticateToken,
  [
    param("employeeId").isString().withMessage("Employee ID must be a string"),
    param("timesheetId")
      .isString()
      .withMessage("Timesheet ID must be a string"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { employeeId, timesheetId } = req.params;

      const context = await resolveTimesheetContext(req, employeeId);
      if (context.errorResponse) {
        return res
          .status(context.errorResponse.status)
          .json(context.errorResponse.body);
      }

      // Delete the timesheet
      const deletedTimesheet = await Timesheet.deleteById(
        context.ownerUserId,
        employeeId,
        timesheetId
      );
      if (!deletedTimesheet) {
        return res.status(404).json({
          error: "Not Found",
          message: "Timesheet not found",
        });
      }

      console.log(`Timesheet ${timesheetId} deleted by user ${req.user.email}`);

      res.status(200).json({
        message: "Timesheet deleted successfully",
        data: deletedTimesheet,
      });
    } catch (error) {
      console.error("Error deleting timesheet:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message || "Failed to delete timesheet",
      });
    }
  }
);

// Approve or reject timesheet (only for owner/manager)
router.patch(
  "/:timesheetId/approve",
  authenticateToken,
  isManagerOrOwner,
  [
    param("employeeId").isString().withMessage("Employee ID must be a string"),
    param("timesheetId").isString().withMessage("Timesheet ID must be a string"),
    body("status")
      .isIn(Timesheet.getApprovalStatuses())
      .withMessage(
        `Status must be one of: ${Timesheet.getApprovalStatuses().join(", ")}`
      ),
    body("note")
      .optional()
      .isString()
      .isLength({ max: 1000 })
      .withMessage("Note must be a string up to 1000 characters"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { employeeId, timesheetId } = req.params;
      const { status, note } = req.body;

      const context = await resolveTimesheetContext(req, employeeId);
      if (context.errorResponse) {
        return res
          .status(context.errorResponse.status)
          .json(context.errorResponse.body);
      }

      const updatedTimesheet = await Timesheet.updateApprovalStatus(
        context.ownerUserId,
        employeeId,
        timesheetId,
        {
          approvalStatus: status,
          approvalNote: note,
          reviewerId: req.user.uid,
        }
      );

      res.status(200).json({
        message: "Timesheet approval status updated successfully",
        data: updatedTimesheet,
      });
    } catch (error) {
      console.error("Error approving timesheet:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message || "Failed to update timesheet approval status",
      });
    }
  }
);

module.exports = router;
