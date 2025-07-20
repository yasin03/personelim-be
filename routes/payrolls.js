const express = require("express");
const { body, param, query, validationResult } = require("express-validator");
const router = express.Router({ mergeParams: true });
const Payroll = require("../models/Payroll");
const Employee = require("../models/Employee");
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

// Create payroll (Only Owner/Manager can create payrolls)
router.post(
  "/",
  authenticateToken,
  isManagerOrOwner,
  [
    body("periodMonth")
      .matches(/^(0[1-9]|1[0-2])$/)
      .withMessage("Period month must be in MM format (01-12)"),
    body("periodYear")
      .matches(/^\d{4}$/)
      .withMessage("Period year must be in YYYY format"),
    body("grossSalary")
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
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { employeeId } = req.params;
      const payrollData = req.body;

      // Validate employee exists
      const employee = await Employee.findById(req.user.uid, employeeId);
      if (!employee) {
        return res.status(404).json({
          error: "Not Found",
          message: "Employee not found",
        });
      }

      // Validate payroll data
      Payroll.validatePayrollData(payrollData);

      // Create the payroll
      const payroll = await Payroll.create(
        req.user.uid,
        employeeId,
        payrollData
      );

      console.log(
        `Payroll created for employee ${employeeId} by user ${req.user.email}`
      );

      res.status(201).json({
        message: "Payroll created successfully",
        data: payroll,
      });
    } catch (error) {
      console.error("Error creating payroll:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message || "Failed to create payroll",
      });
    }
  }
);

// Get payrolls (Employee sees only their own, Owner/Manager see all for specific employee)
router.get(
  "/",
  authenticateToken,
  [
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
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { employeeId } = req.params;
      const { year, status, page = 1, limit = 10 } = req.query;

      // Check if user has permission to view payrolls for this employee
      if (req.user.role === "employee") {
        const employee = await Employee.findByUserId(req.user.uid);
        if (!employee || employee.id !== employeeId) {
          return res.status(403).json({
            error: "Forbidden",
            message: "You can only view your own payrolls",
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
        year,
        status,
        page: parseInt(page),
        limit: parseInt(limit),
      };

      const result = await Payroll.findAllByEmployeeId(
        req.user.uid,
        employeeId,
        options
      );

      res.status(200).json({
        message: "Payrolls retrieved successfully",
        data: result,
      });
    } catch (error) {
      console.error("Error getting payrolls:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message || "Failed to get payrolls",
      });
    }
  }
);

// Get payroll statistics
router.get(
  "/statistics",
  authenticateToken,
  [
    query("year")
      .optional()
      .isInt({ min: 2000, max: 3000 })
      .withMessage("Year must be valid"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { employeeId } = req.params;
      const { year = new Date().getFullYear() } = req.query;

      // Check if user has permission to view statistics for this employee
      if (req.user.role === "employee") {
        const employee = await Employee.findByUserId(req.user.uid);
        if (!employee || employee.id !== employeeId) {
          return res.status(403).json({
            error: "Forbidden",
            message: "You can only view your own payroll statistics",
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
        year: parseInt(year),
      };

      const stats = await Payroll.getStatistics(
        req.user.uid,
        employeeId,
        options
      );

      res.status(200).json({
        message: "Payroll statistics retrieved successfully",
        data: stats,
      });
    } catch (error) {
      console.error("Error getting payroll statistics:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message || "Failed to get payroll statistics",
      });
    }
  }
);

// Get specific payroll by ID
router.get(
  "/:payrollId",
  authenticateToken,
  [
    param("employeeId").isString().withMessage("Employee ID must be a string"),
    param("payrollId").isString().withMessage("Payroll ID must be a string"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { employeeId, payrollId } = req.params;

      // Check if user has permission to view this payroll
      if (req.user.role === "employee") {
        const employee = await Employee.findByUserId(req.user.uid);
        if (!employee || employee.id !== employeeId) {
          return res.status(403).json({
            error: "Forbidden",
            message: "You can only view your own payrolls",
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

      const payroll = await Payroll.findById(
        req.user.uid,
        employeeId,
        payrollId
      );
      if (!payroll) {
        return res.status(404).json({
          error: "Not Found",
          message: "Payroll not found",
        });
      }

      res.status(200).json({
        message: "Payroll retrieved successfully",
        data: payroll,
      });
    } catch (error) {
      console.error("Error getting payroll:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message || "Failed to get payroll",
      });
    }
  }
);

// Update payroll (Only Owner/Manager can update)
router.put(
  "/:payrollId",
  authenticateToken,
  isManagerOrOwner,
  [
    param("employeeId").isString().withMessage("Employee ID must be a string"),
    param("payrollId").isString().withMessage("Payroll ID must be a string"),
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
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { employeeId, payrollId } = req.params;
      const updateData = req.body;

      // Validate employee exists
      const employee = await Employee.findById(req.user.uid, employeeId);
      if (!employee) {
        return res.status(404).json({
          error: "Not Found",
          message: "Employee not found",
        });
      }

      // Get current payroll
      const currentPayroll = await Payroll.findById(
        req.user.uid,
        employeeId,
        payrollId
      );
      if (!currentPayroll) {
        return res.status(404).json({
          error: "Not Found",
          message: "Payroll not found",
        });
      }

      // Update the payroll
      const updatedPayroll = await Payroll.updateById(
        req.user.uid,
        employeeId,
        payrollId,
        updateData
      );

      console.log(`Payroll ${payrollId} updated by user ${req.user.email}`);

      res.status(200).json({
        message: "Payroll updated successfully",
        data: updatedPayroll,
      });
    } catch (error) {
      console.error("Error updating payroll:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message || "Failed to update payroll",
      });
    }
  }
);

// Mark payroll as paid (Only Owner/Manager can mark as paid)
router.patch(
  "/:payrollId/pay",
  authenticateToken,
  isManagerOrOwner,
  [
    param("employeeId").isString().withMessage("Employee ID must be a string"),
    param("payrollId").isString().withMessage("Payroll ID must be a string"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { employeeId, payrollId } = req.params;

      // Validate employee exists
      const employee = await Employee.findById(req.user.uid, employeeId);
      if (!employee) {
        return res.status(404).json({
          error: "Not Found",
          message: "Employee not found",
        });
      }

      // Get current payroll
      const currentPayroll = await Payroll.findById(
        req.user.uid,
        employeeId,
        payrollId
      );
      if (!currentPayroll) {
        return res.status(404).json({
          error: "Not Found",
          message: "Payroll not found",
        });
      }

      // Check if already paid
      if (currentPayroll.status === "Ödendi") {
        return res.status(400).json({
          error: "Bad Request",
          message: "Payroll is already marked as paid",
        });
      }

      // Mark as paid
      const paidPayroll = await Payroll.markAsPaid(
        req.user.uid,
        employeeId,
        payrollId
      );

      console.log(`Payroll ${payrollId} marked as paid by ${req.user.email}`);

      res.status(200).json({
        message: "Payroll marked as paid successfully",
        data: paidPayroll,
      });
    } catch (error) {
      console.error("Error marking payroll as paid:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message || "Failed to mark payroll as paid",
      });
    }
  }
);

// Delete payroll (Only Owner/Manager can delete)
router.delete(
  "/:payrollId",
  authenticateToken,
  isManagerOrOwner,
  [
    param("employeeId").isString().withMessage("Employee ID must be a string"),
    param("payrollId").isString().withMessage("Payroll ID must be a string"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { employeeId, payrollId } = req.params;

      // Validate employee exists
      const employee = await Employee.findById(req.user.uid, employeeId);
      if (!employee) {
        return res.status(404).json({
          error: "Not Found",
          message: "Employee not found",
        });
      }

      // Delete the payroll
      const deletedPayroll = await Payroll.deleteById(
        req.user.uid,
        employeeId,
        payrollId
      );
      if (!deletedPayroll) {
        return res.status(404).json({
          error: "Not Found",
          message: "Payroll not found",
        });
      }

      console.log(`Payroll ${payrollId} deleted by user ${req.user.email}`);

      res.status(200).json({
        message: "Payroll deleted successfully",
        data: deletedPayroll,
      });
    } catch (error) {
      console.error("Error deleting payroll:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message || "Failed to delete payroll",
      });
    }
  }
);

module.exports = router;
