const express = require("express");
const { body, param, validationResult } = require("express-validator");
const router = express.Router();
const AdvanceRequest = require("../models/AdvanceRequest");
const Employee = require("../models/Employee");
const {
  authenticateToken,
  requireRole,
  isManagerOrOwner,
} = require("../middleware/auth");

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

// Create advance request (Employee can only create for themselves, Owner/Manager can create for any employee)
router.post(
  "/",
  authenticateToken,
  [
    body("amount").isNumeric().withMessage("Amount must be a number"),
    body("reason").notEmpty().withMessage("Reason is required"),
    body("employeeId")
      .optional()
      .isString()
      .withMessage("Employee ID must be a string"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { amount, reason, employeeId } = req.body;
      let targetEmployeeId = employeeId;

      // If no employeeId provided, use current user's employee data
      if (!targetEmployeeId) {
        if (req.user.role === "employee") {
          targetEmployeeId = req.user.employeeId;
        } else {
          return res.status(400).json({
            error: "Bad Request",
            message: "Employee ID is required for managers and owners",
          });
        }
      }

      // Check if user has permission to create advance request for this employee
      if (
        req.user.role === "employee" &&
        targetEmployeeId !== req.user.employeeId
      ) {
        return res.status(403).json({
          error: "Forbidden",
          message: "You can only create advance requests for yourself",
        });
      }

      // Validate employee exists
      const employee = await Employee.findById(req.user.uid, targetEmployeeId);
      if (!employee) {
        return res.status(404).json({
          error: "Not Found",
          message: "Employee not found",
        });
      }

      // Validate advance request data
      AdvanceRequest.validateAdvanceData(amount, reason);

      // Create the advance request
      const advanceRequest = await AdvanceRequest.create(
        req.user.uid,
        targetEmployeeId,
        {
          amount: parseFloat(amount),
          reason: reason.trim(),
        }
      );

      console.log(
        `Advance request created for employee ${targetEmployeeId} by user ${req.user.email}`
      );

      res.status(201).json({
        message: "Advance request created successfully",
        data: advanceRequest,
      });
    } catch (error) {
      console.error("Error creating advance request:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message || "Failed to create advance request",
      });
    }
  }
);

// Get advance requests (Employee sees only their own, Owner/Manager see all or specific employee)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { employeeId, status, page = 1, limit = 10 } = req.query;

    // For employees, they can only see their own advance requests
    if (req.user.role === "employee") {
      const options = {
        status,
        page: parseInt(page),
        limit: parseInt(limit),
      };

      const result = await AdvanceRequest.findAllByEmployeeId(
        req.user.uid,
        req.user.employeeId,
        options
      );

      return res.status(200).json({
        message: "Advance requests retrieved successfully",
        data: result,
      });
    }

    // For owners and managers
    if (employeeId) {
      // Get advance requests for specific employee
      const employee = await Employee.findById(req.user.uid, employeeId);
      if (!employee) {
        return res.status(404).json({
          error: "Not Found",
          message: "Employee not found",
        });
      }

      const options = {
        status,
        page: parseInt(page),
        limit: parseInt(limit),
      };

      const result = await AdvanceRequest.findAllByEmployeeId(
        req.user.uid,
        employeeId,
        options
      );

      return res.status(200).json({
        message: "Advance requests retrieved successfully",
        data: result,
      });
    } else {
      // Get advance requests for all employees
      const employees = await Employee.findAll(req.user.uid);
      const allAdvances = [];

      for (const employee of employees) {
        const options = { status };
        const result = await AdvanceRequest.findAllByEmployeeId(
          req.user.uid,
          employee.id,
          options
        );

        // Add employee info to each advance request
        const advancesWithEmployeeInfo = result.advances.map((advance) => ({
          ...advance,
          employee: {
            id: employee.id,
            name: employee.name,
            email: employee.email,
            department: employee.department,
          },
        }));

        allAdvances.push(...advancesWithEmployeeInfo);
      }

      // Sort by creation date (newest first)
      allAdvances.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Apply pagination
      const startIndex = (parseInt(page) - 1) * parseInt(limit);
      const endIndex = startIndex + parseInt(limit);
      const paginatedAdvances = allAdvances.slice(startIndex, endIndex);

      return res.status(200).json({
        message: "Advance requests retrieved successfully",
        data: {
          advances: paginatedAdvances,
          total: allAdvances.length,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(allAdvances.length / parseInt(limit)),
        },
      });
    }
  } catch (error) {
    console.error("Error getting advance requests:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Failed to get advance requests",
    });
  }
});

// Get specific advance request by ID
router.get(
  "/:employeeId/:advanceId",
  authenticateToken,
  [
    param("employeeId").isString().withMessage("Employee ID must be a string"),
    param("advanceId").isString().withMessage("Advance ID must be a string"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { employeeId, advanceId } = req.params;

      // Check if user has permission to view this advance request
      if (req.user.role === "employee" && employeeId !== req.user.employeeId) {
        return res.status(403).json({
          error: "Forbidden",
          message: "You can only view your own advance requests",
        });
      }

      // Validate employee exists
      const employee = await Employee.findById(req.user.uid, employeeId);
      if (!employee) {
        return res.status(404).json({
          error: "Not Found",
          message: "Employee not found",
        });
      }

      const advanceRequest = await AdvanceRequest.findById(
        req.user.uid,
        employeeId,
        advanceId
      );
      if (!advanceRequest) {
        return res.status(404).json({
          error: "Not Found",
          message: "Advance request not found",
        });
      }

      // Add employee info to the response
      const responseData = {
        ...advanceRequest,
        employee: {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          department: employee.department,
        },
      };

      res.status(200).json({
        message: "Advance request retrieved successfully",
        data: responseData,
      });
    } catch (error) {
      console.error("Error getting advance request:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message || "Failed to get advance request",
      });
    }
  }
);

// Update advance request (Only employees can update their own pending requests)
router.put(
  "/:employeeId/:advanceId",
  authenticateToken,
  [
    param("employeeId").isString().withMessage("Employee ID must be a string"),
    param("advanceId").isString().withMessage("Advance ID must be a string"),
    body("amount")
      .optional()
      .isNumeric()
      .withMessage("Amount must be a number"),
    body("reason").optional().notEmpty().withMessage("Reason cannot be empty"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { employeeId, advanceId } = req.params;
      const { amount, reason } = req.body;

      // Check if user has permission to update this advance request
      if (req.user.role === "employee" && employeeId !== req.user.employeeId) {
        return res.status(403).json({
          error: "Forbidden",
          message: "You can only update your own advance requests",
        });
      }

      // Validate employee exists
      const employee = await Employee.findById(req.user.uid, employeeId);
      if (!employee) {
        return res.status(404).json({
          error: "Not Found",
          message: "Employee not found",
        });
      }

      // Get current advance request
      const currentAdvance = await AdvanceRequest.findById(
        req.user.uid,
        employeeId,
        advanceId
      );
      if (!currentAdvance) {
        return res.status(404).json({
          error: "Not Found",
          message: "Advance request not found",
        });
      }

      // Only pending requests can be updated
      if (currentAdvance.status !== "pending") {
        return res.status(400).json({
          error: "Bad Request",
          message: "Only pending advance requests can be updated",
        });
      }

      // Prepare update data
      const updateData = {};
      if (amount !== undefined) {
        if (isNaN(amount) || parseFloat(amount) <= 0) {
          return res.status(400).json({
            error: "Bad Request",
            message: "Amount must be a positive number",
          });
        }
        updateData.amount = parseFloat(amount);
      }
      if (reason !== undefined) {
        if (!reason.trim()) {
          return res.status(400).json({
            error: "Bad Request",
            message: "Reason cannot be empty",
          });
        }
        updateData.reason = reason.trim();
      }

      // Update the advance request
      const updatedAdvance = await AdvanceRequest.updateById(
        req.user.uid,
        employeeId,
        advanceId,
        updateData
      );

      console.log(
        `Advance request ${advanceId} updated by user ${req.user.email}`
      );

      res.status(200).json({
        message: "Advance request updated successfully",
        data: updatedAdvance,
      });
    } catch (error) {
      console.error("Error updating advance request:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message || "Failed to update advance request",
      });
    }
  }
);

// Approve advance request (Only Owner/Manager can approve)
router.patch(
  "/:employeeId/:advanceId/approve",
  authenticateToken,
  isManagerOrOwner,
  [
    param("employeeId").isString().withMessage("Employee ID must be a string"),
    param("advanceId").isString().withMessage("Advance ID must be a string"),
    body("approvalNote")
      .optional()
      .isString()
      .withMessage("Approval note must be a string"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { employeeId, advanceId } = req.params;
      const { approvalNote } = req.body;

      // Validate employee exists
      const employee = await Employee.findById(req.user.uid, employeeId);
      if (!employee) {
        return res.status(404).json({
          error: "Not Found",
          message: "Employee not found",
        });
      }

      // Get current advance request
      const currentAdvance = await AdvanceRequest.findById(
        req.user.uid,
        employeeId,
        advanceId
      );
      if (!currentAdvance) {
        return res.status(404).json({
          error: "Not Found",
          message: "Advance request not found",
        });
      }

      // Only pending requests can be approved
      if (currentAdvance.status !== "pending") {
        return res.status(400).json({
          error: "Bad Request",
          message: "Only pending advance requests can be approved",
        });
      }

      // Approve the advance request
      const approvedAdvance = await AdvanceRequest.updateStatus(
        req.user.uid,
        employeeId,
        advanceId,
        "approved",
        req.user.email,
        approvalNote
      );

      console.log(`Advance request ${advanceId} approved by ${req.user.email}`);

      res.status(200).json({
        message: "Advance request approved successfully",
        data: approvedAdvance,
      });
    } catch (error) {
      console.error("Error approving advance request:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message || "Failed to approve advance request",
      });
    }
  }
);

// Reject advance request (Only Owner/Manager can reject)
router.patch(
  "/:employeeId/:advanceId/reject",
  authenticateToken,
  isManagerOrOwner,
  [
    param("employeeId").isString().withMessage("Employee ID must be a string"),
    param("advanceId").isString().withMessage("Advance ID must be a string"),
    body("approvalNote")
      .optional()
      .isString()
      .withMessage("Approval note must be a string"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { employeeId, advanceId } = req.params;
      const { approvalNote } = req.body;

      // Validate employee exists
      const employee = await Employee.findById(req.user.uid, employeeId);
      if (!employee) {
        return res.status(404).json({
          error: "Not Found",
          message: "Employee not found",
        });
      }

      // Get current advance request
      const currentAdvance = await AdvanceRequest.findById(
        req.user.uid,
        employeeId,
        advanceId
      );
      if (!currentAdvance) {
        return res.status(404).json({
          error: "Not Found",
          message: "Advance request not found",
        });
      }

      // Only pending requests can be rejected
      if (currentAdvance.status !== "pending") {
        return res.status(400).json({
          error: "Bad Request",
          message: "Only pending advance requests can be rejected",
        });
      }

      // Reject the advance request
      const rejectedAdvance = await AdvanceRequest.updateStatus(
        req.user.uid,
        employeeId,
        advanceId,
        "rejected",
        req.user.email,
        approvalNote
      );

      console.log(`Advance request ${advanceId} rejected by ${req.user.email}`);

      res.status(200).json({
        message: "Advance request rejected successfully",
        data: rejectedAdvance,
      });
    } catch (error) {
      console.error("Error rejecting advance request:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message || "Failed to reject advance request",
      });
    }
  }
);

// Delete advance request (Only employees can delete their own pending requests)
router.delete(
  "/:employeeId/:advanceId",
  authenticateToken,
  [
    param("employeeId").isString().withMessage("Employee ID must be a string"),
    param("advanceId").isString().withMessage("Advance ID must be a string"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { employeeId, advanceId } = req.params;

      // Check if user has permission to delete this advance request
      if (req.user.role === "employee" && employeeId !== req.user.employeeId) {
        return res.status(403).json({
          error: "Forbidden",
          message: "You can only delete your own advance requests",
        });
      }

      // Validate employee exists
      const employee = await Employee.findById(req.user.uid, employeeId);
      if (!employee) {
        return res.status(404).json({
          error: "Not Found",
          message: "Employee not found",
        });
      }

      // Get current advance request
      const currentAdvance = await AdvanceRequest.findById(
        req.user.uid,
        employeeId,
        advanceId
      );
      if (!currentAdvance) {
        return res.status(404).json({
          error: "Not Found",
          message: "Advance request not found",
        });
      }

      // Only pending requests can be deleted by employees
      if (req.user.role === "employee" && currentAdvance.status !== "pending") {
        return res.status(400).json({
          error: "Bad Request",
          message: "Only pending advance requests can be deleted",
        });
      }

      // Delete the advance request
      const deletedAdvance = await AdvanceRequest.deleteById(
        req.user.uid,
        employeeId,
        advanceId
      );

      console.log(
        `Advance request ${advanceId} deleted by user ${req.user.email}`
      );

      res.status(200).json({
        message: "Advance request deleted successfully",
        data: deletedAdvance,
      });
    } catch (error) {
      console.error("Error deleting advance request:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message || "Failed to delete advance request",
      });
    }
  }
);

// Get advance request statistics (Employee sees only their own, Owner/Manager see all or specific employee)
router.get("/statistics/:employeeId?", authenticateToken, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { year = new Date().getFullYear() } = req.query;

    // For employees, they can only see their own statistics
    if (req.user.role === "employee") {
      const stats = await AdvanceRequest.getStatistics(
        req.user.uid,
        req.user.employeeId,
        parseInt(year)
      );

      return res.status(200).json({
        message: "Advance request statistics retrieved successfully",
        data: stats,
      });
    }

    // For owners and managers
    if (employeeId) {
      // Get statistics for specific employee
      const employee = await Employee.findById(req.user.uid, employeeId);
      if (!employee) {
        return res.status(404).json({
          error: "Not Found",
          message: "Employee not found",
        });
      }

      const stats = await AdvanceRequest.getStatistics(
        req.user.uid,
        employeeId,
        parseInt(year)
      );

      return res.status(200).json({
        message: "Advance request statistics retrieved successfully",
        data: {
          ...stats,
          employee: {
            id: employee.id,
            name: employee.name,
            email: employee.email,
            department: employee.department,
          },
        },
      });
    } else {
      // Get statistics for all employees
      const employees = await Employee.findAll(req.user.uid);
      const allStats = {
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        byStatus: {
          pending: 0,
          approved: 0,
          rejected: 0,
        },
        totalAmount: 0,
        approvedAmount: 0,
        pendingAmount: 0,
        rejectedAmount: 0,
        employeeStats: [],
      };

      for (const employee of employees) {
        const employeeStats = await AdvanceRequest.getStatistics(
          req.user.uid,
          employee.id,
          parseInt(year)
        );

        // Add to overall statistics
        allStats.total += employeeStats.total;
        allStats.approved += employeeStats.approved;
        allStats.pending += employeeStats.pending;
        allStats.rejected += employeeStats.rejected;
        allStats.totalAmount += employeeStats.totalAmount;
        allStats.approvedAmount += employeeStats.approvedAmount;
        allStats.pendingAmount += employeeStats.pendingAmount;
        allStats.rejectedAmount += employeeStats.rejectedAmount;

        Object.keys(employeeStats.byStatus).forEach((status) => {
          allStats.byStatus[status] += employeeStats.byStatus[status];
        });

        // Add individual employee stats
        allStats.employeeStats.push({
          employee: {
            id: employee.id,
            name: employee.name,
            email: employee.email,
            department: employee.department,
          },
          ...employeeStats,
        });
      }

      return res.status(200).json({
        message: "Advance request statistics retrieved successfully",
        data: allStats,
      });
    }
  } catch (error) {
    console.error("Error getting advance request statistics:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Failed to get advance request statistics",
    });
  }
});

module.exports = router;
