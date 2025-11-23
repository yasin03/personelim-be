const express = require("express");
const { body, validationResult, param, query } = require("express-validator");
const Leave = require("../models/Leave");
const { Employee } = require("../models/Employee");
const Business = require("../models/Business");
const { authenticateToken, isManagerOrOwner } = require("../middleware/auth");

const router = express.Router({ mergeParams: true }); // mergeParams to access employeeId from parent route

// Helper function to build error response
const buildErrorResponse = (status, error, message) => ({
  status,
  body: { error, message },
});

// Helper function to resolve leave context (similar to timesheet)
const resolveLeaveContext = async (req, employeeId) => {
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
          "You can only access your own leaves"
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

      // Filter out expired pending leaves by default (unless includeExpired=true)
      const includeExpired = req.query.includeExpired === "true";
      if (result.leaves) {
        result.leaves = Leave.filterExpiredLeaves(result.leaves, includeExpired);
        result.total = result.leaves.length;
      } else if (Array.isArray(result)) {
        result = Leave.filterExpiredLeaves(result, includeExpired);
      }

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

// GET /employees/:employeeId/leaves/all - Get all leaves for all employees (Owner/Manager only)
// NOTE: This route must be before /pending and /:leaveId to avoid route conflicts
router.get(
  "/all",
  authenticateToken,
  isManagerOrOwner,
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1-100"),
    query("status")
      .optional()
      .isIn(["pending", "approved", "rejected"])
      .withMessage("Status must be one of: pending, approved, rejected"),
    query("type")
      .optional()
      .isIn(["günlük", "yıllık", "mazeret"])
      .withMessage("Type must be one of: günlük, yıllık, mazeret"),
    query("includeExpired")
      .optional()
      .isBoolean()
      .withMessage("includeExpired must be a boolean"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { page = 1, limit = 10, status, type, includeExpired = false } = req.query;

      // Resolve owner user ID
      let ownerUserId;
      if (req.user.role === "manager") {
        const businessId = req.user.userData?.businessId;
        if (!businessId) {
          return res.status(403).json({
            error: "Forbidden",
            message: "Associated business not found for manager user",
          });
        }
        const business = await Business.findById(businessId);
        if (!business || !business.ownerId) {
          return res.status(404).json({
            error: "Not Found",
            message: "Business owner could not be determined",
          });
        }
        ownerUserId = business.ownerId;
      } else {
        ownerUserId = req.user.uid;
      }

      if (!ownerUserId) {
        return res.status(500).json({
          error: "Internal Server Error",
          message: "Owner user ID could not be determined",
        });
      }

      // Get all leaves for all employees (optimized with parallel queries)
      const options = {};
      if (status) options.status = status;
      if (type) options.type = type;
      
      const allLeavesRaw = await Leave.findAllByOwner(ownerUserId, options);

      // Get employee data for mapping
      const employeesResult = await Employee.findAllByUserId(ownerUserId);
      const employees = Array.isArray(employeesResult) 
        ? employeesResult 
        : (employeesResult.employees || []);
      
      const employeeMap = new Map();
      employees.forEach((emp) => {
        employeeMap.set(emp.id, emp);
      });

      // Map leaves with employee info
      const allLeaves = allLeavesRaw.map((leave) => {
        const employee = employeeMap.get(leave.employeeId) || leave._employee || {};
        return {
          ...leave,
          employee: {
            id: employee.id || leave.employeeId,
            firstName: employee.firstName || "",
            lastName: employee.lastName || "",
            name: `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || "Unknown",
            email: employee.email || null,
            department: employee.department || null,
            position: employee.position || null,
          },
        };
      });

      // Filter expired leaves if needed (only for pending status)
      const includeExpiredBool = includeExpired === "true" || includeExpired === true;
      const filteredLeaves = Array.isArray(allLeaves) && allLeaves.length > 0
        ? Leave.filterExpiredLeaves(allLeaves, includeExpiredBool)
        : [];

      // Sort by creation date (newest first)
      filteredLeaves.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      // Apply pagination
      const startIndex = (parseInt(page) - 1) * parseInt(limit);
      const endIndex = startIndex + parseInt(limit);
      const paginatedLeaves = filteredLeaves.slice(startIndex, endIndex);

      res.status(200).json({
        message: "Leaves retrieved successfully",
        data: {
          leaves: paginatedLeaves,
          total: filteredLeaves.length,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(filteredLeaves.length / parseInt(limit)),
        },
      });
    } catch (error) {
      console.error("Error getting all leaves:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message || "Failed to get leaves",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }
);

// GET /employees/:employeeId/leaves/pending - Get all pending leaves (Owner/Manager only)
// NOTE: This route must be before /:leaveId to avoid route conflicts
router.get(
  "/pending",
  authenticateToken,
  isManagerOrOwner,
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1-100"),
    query("includeExpired")
      .optional()
      .isBoolean()
      .withMessage("includeExpired must be a boolean"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { page = 1, limit = 10, includeExpired = false } = req.query;

      // Resolve owner user ID
      let ownerUserId;
      if (req.user.role === "manager") {
        const businessId = req.user.userData?.businessId;
        if (!businessId) {
          return res.status(403).json({
            error: "Forbidden",
            message: "Associated business not found for manager user",
          });
        }
        const business = await Business.findById(businessId);
        if (!business || !business.ownerId) {
          return res.status(404).json({
            error: "Not Found",
            message: "Business owner could not be determined",
          });
        }
        ownerUserId = business.ownerId;
      } else {
        ownerUserId = req.user.uid;
      }

      if (!ownerUserId) {
        return res.status(500).json({
          error: "Internal Server Error",
          message: "Owner user ID could not be determined",
        });
      }

      // Get all pending leaves for all employees (optimized with parallel queries)
      const allPendingLeavesRaw = await Leave.findAllPendingByOwner(ownerUserId);
      console.log(`[Pending Leaves] Found ${allPendingLeavesRaw.length} pending leaves from findAllPendingByOwner`);

      // Get employee data for mapping
      const employeesResult = await Employee.findAllByUserId(ownerUserId);
      const employees = Array.isArray(employeesResult) 
        ? employeesResult 
        : (employeesResult.employees || []);
      
      console.log(`[Pending Leaves] Found ${employees.length} employees`);
      
      const employeeMap = new Map();
      employees.forEach((emp) => {
        employeeMap.set(emp.id, emp);
      });

      // Map leaves with employee info
      const allPendingLeaves = allPendingLeavesRaw.map((leave) => {
        const employee = employeeMap.get(leave.employeeId) || leave._employee || {};
        return {
          ...leave,
          employee: {
            id: employee.id || leave.employeeId,
            firstName: employee.firstName || "",
            lastName: employee.lastName || "",
            name: `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || "Unknown",
            email: employee.email || null,
            department: employee.department || null,
            position: employee.position || null,
          },
        };
      });

      // Filter expired leaves if needed
      const includeExpiredBool = includeExpired === "true" || includeExpired === true;
      const filteredLeaves = Array.isArray(allPendingLeaves) && allPendingLeaves.length > 0
        ? Leave.filterExpiredLeaves(allPendingLeaves, includeExpiredBool)
        : [];

      // Sort by creation date (newest first)
      filteredLeaves.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      // Apply pagination
      const startIndex = (parseInt(page) - 1) * parseInt(limit);
      const endIndex = startIndex + parseInt(limit);
      const paginatedLeaves = filteredLeaves.slice(startIndex, endIndex);

      res.status(200).json({
        message: "Pending leaves retrieved successfully",
        data: {
          leaves: paginatedLeaves,
          total: filteredLeaves.length,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(filteredLeaves.length / parseInt(limit)),
        },
      });
    } catch (error) {
      console.error("Error getting pending leaves:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message || "Failed to get pending leaves",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
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

      // Owner/Manager can update any leave, but if they update a non-pending leave,
      // it should reset to pending status unless they explicitly approve it
      if (["owner", "manager"].includes(req.user.role) && existingLeave.status !== "pending") {
        // If owner/manager is updating an approved/rejected leave, reset to pending
        updateData.status = "pending";
        updateData.approved = false;
        updateData.approvedBy = null;
        updateData.approvedAt = null;
        updateData.approvalNote = null;
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

// PATCH /employees/:employeeId/leaves/:leaveId/approve - Approve, reject, or reset leave (only for manager/owner)
router.patch(
  "/:leaveId/approve",
  authenticateToken,
  isManagerOrOwner,
  [
    param("employeeId").isString().withMessage("Employee ID must be a string"),
    param("leaveId").isString().withMessage("Leave ID must be a string"),
    body("status")
      .isIn(Leave.getApprovalStatuses())
      .withMessage(
        `Status must be one of: ${Leave.getApprovalStatuses().join(", ")}`
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
      const { employeeId, leaveId } = req.params;
      const { status, note } = req.body;

      const context = await resolveLeaveContext(req, employeeId);
      if (context.errorResponse) {
        return res
          .status(context.errorResponse.status)
          .json(context.errorResponse.body);
      }

      // Check if leave exists
      const existingLeave = await Leave.findById(
        context.ownerUserId,
        employeeId,
        leaveId
      );
      if (!existingLeave) {
        return res.status(404).json({
          error: "Not Found",
          message: "Leave not found",
        });
      }

      const updatedLeave = await Leave.updateApprovalStatus(
        context.ownerUserId,
        employeeId,
        leaveId,
        {
          approvalStatus: status,
          approvalNote: note,
          reviewerId: req.user.uid,
        }
      );

      res.status(200).json({
        message: "Leave approval status updated successfully",
        data: updatedLeave,
      });
    } catch (error) {
      console.error("Error approving leave:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message || "Failed to update leave approval status",
      });
    }
  }
);

// PATCH /employees/:employeeId/leaves/:leaveId/revise - Revise and approve leave (only for manager/owner)
router.patch(
  "/:leaveId/revise",
  authenticateToken,
  isManagerOrOwner,
  [
    param("employeeId").isString().withMessage("Employee ID must be a string"),
    param("leaveId").isString().withMessage("Leave ID must be a string"),
    body("type")
      .optional()
      .isIn(["günlük", "yıllık", "mazeret"])
      .withMessage("Leave type must be one of: günlük, yıllık, mazeret"),
    body("startDate")
      .optional()
      .isISO8601()
      .withMessage("Start date must be a valid date (YYYY-MM-DD)"),
    body("endDate")
      .optional()
      .isISO8601()
      .withMessage("End date must be a valid date (YYYY-MM-DD)"),
    body("reason")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Reason must not exceed 500 characters"),
    body("status")
      .optional()
      .isIn(Leave.getApprovalStatuses())
      .withMessage(
        `Status must be one of: ${Leave.getApprovalStatuses().join(", ")}`
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
      const { employeeId, leaveId } = req.params;
      const { type, startDate, endDate, reason, status, note } = req.body;

      const context = await resolveLeaveContext(req, employeeId);
      if (context.errorResponse) {
        return res
          .status(context.errorResponse.status)
          .json(context.errorResponse.body);
      }

      // Check if leave exists
      const existingLeave = await Leave.findById(
        context.ownerUserId,
        employeeId,
        leaveId
      );
      if (!existingLeave) {
        return res.status(404).json({
          error: "Not Found",
          message: "Leave not found",
        });
      }

      // Build update data
      const updateData = {};
      if (type !== undefined) updateData.type = type;
      if (startDate !== undefined) updateData.startDate = startDate;
      if (endDate !== undefined) updateData.endDate = endDate;
      if (reason !== undefined) updateData.reason = reason;

      // Validate dates if provided
      const finalStartDate = startDate || existingLeave.startDate;
      const finalEndDate = endDate || existingLeave.endDate;
      try {
        Leave.validateDates(finalStartDate, finalEndDate);
      } catch (dateError) {
        return res.status(400).json({
          error: "Invalid dates",
          message: dateError.message,
        });
      }

      // Update leave data
      if (Object.keys(updateData).length > 0) {
        await Leave.updateById(
          context.ownerUserId,
          employeeId,
          leaveId,
          updateData
        );
      }

      // If status is provided, update approval status
      if (status) {
        await Leave.updateApprovalStatus(
          context.ownerUserId,
          employeeId,
          leaveId,
          {
            approvalStatus: status,
            approvalNote: note,
            reviewerId: req.user.uid,
          }
        );
      }

      // Return updated leave
      const updatedLeave = await Leave.findById(
        context.ownerUserId,
        employeeId,
        leaveId
      );

      res.status(200).json({
        message: "Leave revised successfully",
        data: updatedLeave,
      });
    } catch (error) {
      console.error("Error revising leave:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message || "Failed to revise leave",
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
