const express = require("express");
const { body, param, query, validationResult } = require("express-validator");
const router = express.Router({ mergeParams: true });
const SalaryPayment = require("../models/SalaryPayment");
const Employee = require("../models/Employee");
const { authenticateToken, isManagerOrOwner } = require("../middleware/auth");

/**
 * @swagger
 * tags:
 *   name: Salary Payments
 *   description: Employee salary payment management
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

// Create salary payment (Only Owner/Manager can create payments)
router.post(
  "/",
  authenticateToken,
  isManagerOrOwner,
  [
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
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { employeeId } = req.params;
      const paymentData = req.body;

      // Validate employee exists
      const employee = await Employee.findById(req.user.uid, employeeId);
      if (!employee) {
        return res.status(404).json({
          error: "Not Found",
          message: "Employee not found",
        });
      }

      // Validate payment data
      SalaryPayment.validatePaymentData(paymentData);

      // Create the salary payment
      const salaryPayment = await SalaryPayment.create(
        req.user.uid,
        employeeId,
        paymentData
      );

      console.log(
        `Salary payment created for employee ${employeeId} by user ${req.user.email}`
      );

      res.status(201).json({
        message: "Salary payment created successfully",
        data: salaryPayment,
      });
    } catch (error) {
      console.error("Error creating salary payment:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message || "Failed to create salary payment",
      });
    }
  }
);

// Get salary payments (Employee sees only their own, Owner/Manager see all for specific employee)
router.get(
  "/",
  authenticateToken,
  [
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
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { employeeId } = req.params;
      const {
        year,
        paymentMethod,
        startDate,
        endDate,
        page = 1,
        limit = 10,
      } = req.query;

      // Check if user has permission to view salary payments for this employee
      if (req.user.role === "employee") {
        const employee = await Employee.findByUserId(req.user.uid);
        if (!employee || employee.id !== employeeId) {
          return res.status(403).json({
            error: "Forbidden",
            message: "You can only view your own salary payments",
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
        paymentMethod,
        startDate,
        endDate,
        page: parseInt(page),
        limit: parseInt(limit),
      };

      const result = await SalaryPayment.findAllByEmployeeId(
        req.user.uid,
        employeeId,
        options
      );

      res.status(200).json({
        message: "Salary payments retrieved successfully",
        data: result,
      });
    } catch (error) {
      console.error("Error getting salary payments:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message || "Failed to get salary payments",
      });
    }
  }
);

// Get salary payment statistics
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
            message: "You can only view your own salary payment statistics",
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

      const stats = await SalaryPayment.getStatistics(
        req.user.uid,
        employeeId,
        options
      );

      res.status(200).json({
        message: "Salary payment statistics retrieved successfully",
        data: stats,
      });
    } catch (error) {
      console.error("Error getting salary payment statistics:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message || "Failed to get salary payment statistics",
      });
    }
  }
);

// Get salary payments by payroll ID
router.get(
  "/by-payroll/:payrollId",
  authenticateToken,
  [
    param("employeeId").isString().withMessage("Employee ID must be a string"),
    param("payrollId").isString().withMessage("Payroll ID must be a string"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { employeeId, payrollId } = req.params;

      // Check if user has permission to view salary payments for this employee
      if (req.user.role === "employee") {
        const employee = await Employee.findByUserId(req.user.uid);
        if (!employee || employee.id !== employeeId) {
          return res.status(403).json({
            error: "Forbidden",
            message: "You can only view your own salary payments",
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

      const payments = await SalaryPayment.findByPayrollId(
        req.user.uid,
        employeeId,
        payrollId
      );

      res.status(200).json({
        message: "Salary payments retrieved successfully",
        data: {
          payments,
          total: payments.length,
        },
      });
    } catch (error) {
      console.error("Error getting salary payments by payroll ID:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message || "Failed to get salary payments by payroll ID",
      });
    }
  }
);

// Get specific salary payment by ID
router.get(
  "/:paymentId",
  authenticateToken,
  [
    param("employeeId").isString().withMessage("Employee ID must be a string"),
    param("paymentId").isString().withMessage("Payment ID must be a string"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { employeeId, paymentId } = req.params;

      // Check if user has permission to view this salary payment
      if (req.user.role === "employee") {
        const employee = await Employee.findByUserId(req.user.uid);
        if (!employee || employee.id !== employeeId) {
          return res.status(403).json({
            error: "Forbidden",
            message: "You can only view your own salary payments",
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

      const salaryPayment = await SalaryPayment.findById(
        req.user.uid,
        employeeId,
        paymentId
      );
      if (!salaryPayment) {
        return res.status(404).json({
          error: "Not Found",
          message: "Salary payment not found",
        });
      }

      res.status(200).json({
        message: "Salary payment retrieved successfully",
        data: salaryPayment,
      });
    } catch (error) {
      console.error("Error getting salary payment:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message || "Failed to get salary payment",
      });
    }
  }
);

// Update salary payment (Only Owner/Manager can update)
router.put(
  "/:paymentId",
  authenticateToken,
  isManagerOrOwner,
  [
    param("employeeId").isString().withMessage("Employee ID must be a string"),
    param("paymentId").isString().withMessage("Payment ID must be a string"),
    body("amount")
      .optional()
      .isNumeric()
      .withMessage("Amount must be a number"),
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
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { employeeId, paymentId } = req.params;
      const updateData = req.body;

      // Validate employee exists
      const employee = await Employee.findById(req.user.uid, employeeId);
      if (!employee) {
        return res.status(404).json({
          error: "Not Found",
          message: "Employee not found",
        });
      }

      // Get current salary payment
      const currentPayment = await SalaryPayment.findById(
        req.user.uid,
        employeeId,
        paymentId
      );
      if (!currentPayment) {
        return res.status(404).json({
          error: "Not Found",
          message: "Salary payment not found",
        });
      }

      // Validate payment data if provided
      if (Object.keys(updateData).length > 0) {
        SalaryPayment.validatePaymentData({ ...currentPayment, ...updateData });
      }

      // Update the salary payment
      const updatedPayment = await SalaryPayment.updateById(
        req.user.uid,
        employeeId,
        paymentId,
        updateData
      );

      console.log(
        `Salary payment ${paymentId} updated by user ${req.user.email}`
      );

      res.status(200).json({
        message: "Salary payment updated successfully",
        data: updatedPayment,
      });
    } catch (error) {
      console.error("Error updating salary payment:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message || "Failed to update salary payment",
      });
    }
  }
);

// Delete salary payment (Only Owner/Manager can delete)
router.delete(
  "/:paymentId",
  authenticateToken,
  isManagerOrOwner,
  [
    param("employeeId").isString().withMessage("Employee ID must be a string"),
    param("paymentId").isString().withMessage("Payment ID must be a string"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { employeeId, paymentId } = req.params;

      // Validate employee exists
      const employee = await Employee.findById(req.user.uid, employeeId);
      if (!employee) {
        return res.status(404).json({
          error: "Not Found",
          message: "Employee not found",
        });
      }

      // Delete the salary payment
      const deletedPayment = await SalaryPayment.deleteById(
        req.user.uid,
        employeeId,
        paymentId
      );
      if (!deletedPayment) {
        return res.status(404).json({
          error: "Not Found",
          message: "Salary payment not found",
        });
      }

      console.log(
        `Salary payment ${paymentId} deleted by user ${req.user.email}`
      );

      res.status(200).json({
        message: "Salary payment deleted successfully",
        data: deletedPayment,
      });
    } catch (error) {
      console.error("Error deleting salary payment:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message || "Failed to delete salary payment",
      });
    }
  }
);

module.exports = router;
