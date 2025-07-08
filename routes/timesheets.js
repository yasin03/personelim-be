const express = require("express");
const { body, param, query, validationResult } = require("express-validator");
const router = express.Router({ mergeParams: true });
const Timesheet = require("../models/Timesheet");
const Employee = require("../models/Employee");
const { authenticateToken, isManagerOrOwner } = require("../middleware/auth");

/**
 * @swagger
 * tags:
 *   name: Timesheets
 *   description: Employee timesheet and working hours management
 */

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

      // Check if user has permission to create timesheet for this employee
      if (req.user.role === "employee") {
        // Employee can only create timesheet for themselves
        const employee = await Employee.findByUserId(req.user.uid);
        if (!employee || employee.id !== employeeId) {
          return res.status(403).json({
            error: "Forbidden",
            message: "You can only create timesheets for yourself",
          });
        }
      }

      // Validate employee exists
      const employee = await Employee.findById(req.user.uid, employeeId);
      if (!employee) {
        return res.status(404).json({
          error: "Not Found",
          message: "Employee not found",
        });
      }

      // Validate timesheet data
      Timesheet.validateTimesheetData(timesheetData);

      // Create the timesheet
      const timesheet = await Timesheet.create(
        req.user.uid,
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

      // Check if user has permission to view timesheets for this employee
      if (req.user.role === "employee") {
        const employee = await Employee.findByUserId(req.user.uid);
        if (!employee || employee.id !== employeeId) {
          return res.status(403).json({
            error: "Forbidden",
            message: "You can only view your own timesheets",
          });
        }
      }

      // Validate employee exists
      const employee = await Employee.findById(req.user.uid, employeeId);
      if (!employee) {
        return res.status(404).json({
          error: "Not Found",
          message: "Employee not found",
        });
      }

      const options = {
        month,
        year,
        status,
        page: parseInt(page),
        limit: parseInt(limit),
      };

      const result = await Timesheet.findAllByEmployeeId(
        req.user.uid,
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

      // Check if user has permission to view statistics for this employee
      if (req.user.role === "employee") {
        const employee = await Employee.findByUserId(req.user.uid);
        if (!employee || employee.id !== employeeId) {
          return res.status(403).json({
            error: "Forbidden",
            message: "You can only view your own timesheet statistics",
          });
        }
      }

      // Validate employee exists
      const employee = await Employee.findById(req.user.uid, employeeId);
      if (!employee) {
        return res.status(404).json({
          error: "Not Found",
          message: "Employee not found",
        });
      }

      const options = {
        month,
        year: parseInt(year),
      };

      const stats = await Timesheet.getStatistics(
        req.user.uid,
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

      // Check if user has permission to view this timesheet
      if (req.user.role === "employee") {
        const employee = await Employee.findByUserId(req.user.uid);
        if (!employee || employee.id !== employeeId) {
          return res.status(403).json({
            error: "Forbidden",
            message: "You can only view your own timesheets",
          });
        }
      }

      // Validate employee exists
      const employee = await Employee.findById(req.user.uid, employeeId);
      if (!employee) {
        return res.status(404).json({
          error: "Not Found",
          message: "Employee not found",
        });
      }

      const timesheet = await Timesheet.findById(
        req.user.uid,
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

      // Check if user has permission to update this timesheet
      if (req.user.role === "employee") {
        const employee = await Employee.findByUserId(req.user.uid);
        if (!employee || employee.id !== employeeId) {
          return res.status(403).json({
            error: "Forbidden",
            message: "You can only update your own timesheets",
          });
        }
      }

      // Validate employee exists
      const employee = await Employee.findById(req.user.uid, employeeId);
      if (!employee) {
        return res.status(404).json({
          error: "Not Found",
          message: "Employee not found",
        });
      }

      // Get current timesheet
      const currentTimesheet = await Timesheet.findById(
        req.user.uid,
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
        req.user.uid,
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

      // Check if user has permission to delete this timesheet
      if (req.user.role === "employee") {
        const employee = await Employee.findByUserId(req.user.uid);
        if (!employee || employee.id !== employeeId) {
          return res.status(403).json({
            error: "Forbidden",
            message: "You can only delete your own timesheets",
          });
        }
      }

      // Validate employee exists
      const employee = await Employee.findById(req.user.uid, employeeId);
      if (!employee) {
        return res.status(404).json({
          error: "Not Found",
          message: "Employee not found",
        });
      }

      // Delete the timesheet
      const deletedTimesheet = await Timesheet.deleteById(
        req.user.uid,
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

module.exports = router;
