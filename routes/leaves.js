const express = require("express");
const { body, validationResult, param } = require("express-validator");
const Leave = require("../models/Leave");
const Employee = require("../models/Employee");
const { authenticateToken, isManagerOrOwner } = require("../middleware/auth");

const router = express.Router({ mergeParams: true }); // mergeParams to access employeeId from parent route

/**
 * @swagger
 * tags:
 *   name: Leaves
 *   description: Employee leave management
 */

// Validation middleware
const validateLeave = [
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

const validateEmployeeId = [
  param("employeeId").notEmpty().withMessage("Employee ID is required"),
];

const validateLeaveId = [
  param("leaveId").notEmpty().withMessage("Leave ID is required"),
];

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
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

// Helper function to verify employee ownership or self-access
const verifyEmployeeOwnership = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const userId = req.user.uid;
    const userRole = req.user.role;

    if (userRole === "employee") {
      // If user is an employee, they can only access their own data
      const employee = await Employee.findByUserId(userId);
      if (!employee || employee.id !== employeeId) {
        return res.status(403).json({
          error: "Access denied",
          message: "You can only access your own leave records",
        });
      }
      req.employee = employee;
      req.businessOwnerId = employee.businessOwnerId;
    } else if (["owner", "manager"].includes(userRole)) {
      // If user is owner or manager, check if employee belongs to them
      const employee = await Employee.findById(userId, employeeId);
      if (!employee) {
        return res.status(404).json({
          error: "Employee not found",
          message: "Employee does not exist or does not belong to you",
        });
      }
      req.employee = employee;
      req.businessOwnerId = userId;
    } else {
      return res.status(403).json({
        error: "Access denied",
        message: "Insufficient permissions",
      });
    }

    next();
  } catch (error) {
    console.error("Employee ownership verification error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to verify employee ownership",
    });
  }
};

// POST /employees/:employeeId/leaves - Create new leave
router.post(
  "/",
  authenticateToken,
  validateEmployeeId,
  validateLeave,
  handleValidationErrors,
  verifyEmployeeOwnership,
  async (req, res) => {
    try {
      const { employeeId } = req.params;
      const businessOwnerId = req.businessOwnerId;
      const leaveData = req.body;

      // Validate dates
      try {
        Leave.validateDates(leaveData.startDate, leaveData.endDate);
      } catch (dateError) {
        return res.status(400).json({
          error: "Invalid dates",
          message: dateError.message,
        });
      }

      // Employees can only create pending leaves
      if (req.user.role === "employee") {
        leaveData.status = "pending";
        leaveData.approved = false;
      }

      const leave = await Leave.create(businessOwnerId, employeeId, leaveData);

      res.status(201).json({
        message: "Leave created successfully",
        data: leave,
      });
    } catch (error) {
      console.error("Create leave error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to create leave",
      });
    }
  }
);

// GET /employees/:employeeId/leaves - Get all leaves for employee
router.get(
  "/",
  authenticateToken,
  validateEmployeeId,
  handleValidationErrors,
  verifyEmployeeOwnership,
  async (req, res) => {
    try {
      const { employeeId } = req.params;
      const businessOwnerId = req.businessOwnerId;
      const { page = 1, limit = 10, approved, type, status } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
      };

      // Add filters if provided
      if (approved !== undefined) {
        options.approved = approved === "true";
      }
      if (status) {
        options.status = status;
      }
      if (type) {
        options.type = type;
      }

      const result = await Leave.findAllByEmployeeId(
        businessOwnerId,
        employeeId,
        options
      );

      res.status(200).json({
        message: "Leaves retrieved successfully",
        data: result,
      });
    } catch (error) {
      console.error("Get leaves error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to retrieve leaves",
      });
    }
  }
);

// GET /employees/:employeeId/leaves/statistics - Get leave statistics
router.get(
  "/statistics",
  authenticateToken,
  validateEmployeeId,
  handleValidationErrors,
  verifyEmployeeOwnership,
  async (req, res) => {
    try {
      const { employeeId } = req.params;
      const businessOwnerId = req.businessOwnerId;
      const { year } = req.query;

      const stats = await Leave.getStatistics(
        businessOwnerId,
        employeeId,
        year ? parseInt(year) : undefined
      );

      res.status(200).json({
        message: "Leave statistics retrieved successfully",
        data: stats,
      });
    } catch (error) {
      console.error("Get leave statistics error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to get leave statistics",
      });
    }
  }
);

// GET /employees/:employeeId/leaves/:leaveId - Get specific leave
router.get(
  "/:leaveId",
  authenticateToken,
  validateEmployeeId,
  validateLeaveId,
  handleValidationErrors,
  verifyEmployeeOwnership,
  async (req, res) => {
    try {
      const { employeeId, leaveId } = req.params;
      const businessOwnerId = req.businessOwnerId;

      const leave = await Leave.findById(businessOwnerId, employeeId, leaveId);

      if (!leave) {
        return res.status(404).json({
          error: "Leave not found",
          message: "Leave record not found",
        });
      }

      res.status(200).json({
        message: "Leave retrieved successfully",
        data: leave,
      });
    } catch (error) {
      console.error("Get leave error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to retrieve leave",
      });
    }
  }
);

// PUT /employees/:employeeId/leaves/:leaveId - Update leave
router.put(
  "/:leaveId",
  authenticateToken,
  validateEmployeeId,
  validateLeaveId,
  validateLeave,
  handleValidationErrors,
  verifyEmployeeOwnership,
  async (req, res) => {
    try {
      const { employeeId, leaveId } = req.params;
      const businessOwnerId = req.businessOwnerId;
      const updateData = req.body;

      // Check if leave exists
      const existingLeave = await Leave.findById(
        businessOwnerId,
        employeeId,
        leaveId
      );
      if (!existingLeave) {
        return res.status(404).json({
          error: "Leave not found",
          message: "Leave record not found",
        });
      }

      // Employees can only update pending leaves
      if (req.user.role === "employee" && existingLeave.status !== "pending") {
        return res.status(403).json({
          error: "Access denied",
          message: "You can only update pending leave requests",
        });
      }

      // Validate dates
      try {
        Leave.validateDates(updateData.startDate, updateData.endDate);
      } catch (dateError) {
        return res.status(400).json({
          error: "Invalid dates",
          message: dateError.message,
        });
      }

      const updatedLeave = await Leave.updateById(
        businessOwnerId,
        employeeId,
        leaveId,
        updateData
      );

      res.status(200).json({
        message: "Leave updated successfully",
        data: updatedLeave,
      });
    } catch (error) {
      console.error("Update leave error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to update leave",
      });
    }
  }
);

// PATCH /employees/:employeeId/leaves/:leaveId/approve - Approve or reject leave (only for manager/owner)
router.patch(
  "/:leaveId/approve",
  authenticateToken,
  isManagerOrOwner,
  validateEmployeeId,
  validateLeaveId,
  [
    body("status")
      .isIn(["approved", "rejected"])
      .withMessage("Status must be either approved or rejected"),
    body("approvalNote")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Approval note must not exceed 500 characters"),
  ],
  handleValidationErrors,
  verifyEmployeeOwnership,
  async (req, res) => {
    try {
      const { employeeId, leaveId } = req.params;
      const businessOwnerId = req.businessOwnerId;
      const { status, approvalNote } = req.body;
      const approvedBy = req.user.uid;

      // Check if leave exists
      const existingLeave = await Leave.findById(
        businessOwnerId,
        employeeId,
        leaveId
      );
      if (!existingLeave) {
        return res.status(404).json({
          error: "Leave not found",
          message: "Leave record not found",
        });
      }

      // Update leave status
      const updatedLeave = await Leave.updateStatus(
        businessOwnerId,
        employeeId,
        leaveId,
        status,
        approvedBy,
        approvalNote
      );

      res.status(200).json({
        message: `Leave ${status} successfully`,
        data: updatedLeave,
      });
    } catch (error) {
      console.error("Approve leave error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to update leave status",
      });
    }
  }
);

// DELETE /employees/:employeeId/leaves/:leaveId - Delete leave
router.delete(
  "/:leaveId",
  authenticateToken,
  validateEmployeeId,
  validateLeaveId,
  handleValidationErrors,
  verifyEmployeeOwnership,
  async (req, res) => {
    try {
      const { employeeId, leaveId } = req.params;
      const businessOwnerId = req.businessOwnerId;

      // Check if leave exists
      const existingLeave = await Leave.findById(
        businessOwnerId,
        employeeId,
        leaveId
      );
      if (!existingLeave) {
        return res.status(404).json({
          error: "Leave not found",
          message: "Leave record not found",
        });
      }

      // Employees can only delete their own pending leaves
      if (req.user.role === "employee" && existingLeave.status !== "pending") {
        return res.status(403).json({
          error: "Access denied",
          message: "You can only delete pending leave requests",
        });
      }

      await Leave.deleteById(businessOwnerId, employeeId, leaveId);

      res.status(200).json({
        message: "Leave deleted successfully",
      });
    } catch (error) {
      console.error("Delete leave error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to delete leave",
      });
    }
  }
);

module.exports = router;
