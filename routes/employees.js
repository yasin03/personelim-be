const express = require("express");
const { body, validationResult, param, query } = require("express-validator");
const Employee = require("../models/Employee");
const { authenticateToken, isManagerOrOwner } = require("../middleware/auth");

const router = express.Router();


// Validation middleware
const validateEmployee = [
  body("firstName")
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters"),
  body("lastName")
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters"),
  body("email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email"),
  body("phoneNumber")
    .optional()
    .isMobilePhone("tr-TR")
    .withMessage("Please provide a valid Turkish phone number"),
  body("tcKimlikNo")
    .optional()
    .isLength({ min: 11, max: 11 })
    .withMessage("TC Kimlik No must be 11 digits")
    .isNumeric()
    .withMessage("TC Kimlik No must contain only numbers"),
  body("position")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Position must be between 2 and 100 characters"),
  body("department")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Department must be between 2 and 100 characters"),
  body("contractType")
    .optional()
    .isIn(["Belirsiz Süreli", "Belirli Süreli", "Part-time", "Stajyer"])
    .withMessage("Invalid contract type"),
  body("workingHoursPerDay")
    .optional()
    .isFloat({ min: 1, max: 24 })
    .withMessage("Working hours per day must be between 1 and 24"),
  body("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid date"),
  body("terminationDate")
    .optional()
    .isISO8601()
    .withMessage("Termination date must be a valid date"),
  body("salary.grossAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Gross amount must be a positive number"),
  body("salary.netAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Net amount must be a positive number"),
  body("salary.currency")
    .optional()
    .isIn(["TL", "USD", "EUR"])
    .withMessage("Currency must be TL, USD, or EUR"),
];

const validateEmployeeId = [
  param("employeeId").notEmpty().withMessage("Employee ID is required"),
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

// GET /employees/me - Get current employee's own data (for employee login)
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const userRole = req.user.role;

    // Only employees can access this endpoint
    if (userRole !== "employee") {
      return res.status(403).json({
        error: "Access denied",
        message: "This endpoint is only for employees",
      });
    }

    // Find employee record by user ID
    const employee = await Employee.findByUserId(userId);

    if (!employee) {
      return res.status(404).json({
        error: "Employee not found",
        message: "Employee record not found for this user",
      });
    }

    // Sanitize sensitive data if needed
    const sanitizedEmployee = Employee.sanitize(employee);

    res.status(200).json({
      message: "Employee data retrieved successfully",
      data: sanitizedEmployee,
    });
  } catch (error) {
    console.error("Get employee own data error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to get employee data",
    });
  }
});

// PUT /employees/me - Update current employee's own data (limited fields)
router.put(
  "/me",
  authenticateToken,
  [
    body("phoneNumber")
      .optional()
      .isMobilePhone("tr-TR")
      .withMessage("Please provide a valid Turkish phone number"),
    body("address")
      .optional()
      .isLength({ max: 500 })
      .withMessage("Address must not exceed 500 characters"),
    body("profilePictureUrl")
      .optional()
      .isURL()
      .withMessage("Please provide a valid URL"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user.uid;
      const userRole = req.user.role;

      // Only employees can access this endpoint
      if (userRole !== "employee") {
        return res.status(403).json({
          error: "Access denied",
          message: "This endpoint is only for employees",
        });
      }

      // Find employee record by user ID
      const employee = await Employee.findByUserId(userId);

      if (!employee) {
        return res.status(404).json({
          error: "Employee not found",
          message: "Employee record not found for this user",
        });
      }

      // Only allow certain fields to be updated by employee
      const allowedFields = ["phoneNumber", "address", "profilePictureUrl"];
      const updateData = {};

      Object.keys(req.body).forEach((key) => {
        if (allowedFields.includes(key)) {
          updateData[key] = req.body[key];
        }
      });

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          error: "No valid fields to update",
          message: "No valid fields provided for update",
        });
      }

      const updatedEmployee = await Employee.updateById(
        employee.businessOwnerId,
        employee.id,
        updateData
      );

      const sanitizedEmployee = Employee.sanitize(updatedEmployee);

      res.status(200).json({
        message: "Employee data updated successfully",
        data: sanitizedEmployee,
      });
    } catch (error) {
      console.error("Update employee own data error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to update employee data",
      });
    }
  }
);

// GET /employees - Get all employees for authenticated user (only for owner/manager)
router.get("/", authenticateToken, isManagerOrOwner, async (req, res) => {
  try {
    const { page = 1, limit = 10, department, search } = req.query;
    const userId = req.user.uid;

    let result;

    if (search) {
      result = await Employee.search(userId, search, {
        page: parseInt(page),
        limit: parseInt(limit),
      });
    } else if (department) {
      result = await Employee.findByDepartment(userId, department, {
        page: parseInt(page),
        limit: parseInt(limit),
      });
    } else {
      result = await Employee.findAllByUserId(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
      });
    }

    res.status(200).json({
      message: "Employees retrieved successfully",
      data: result,
    });
  } catch (error) {
    console.error("Get employees error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to retrieve employees",
    });
  }
});

// GET /employees/deleted - Get deleted employees for authenticated user (only for owner/manager)
router.get(
  "/deleted",
  authenticateToken,
  isManagerOrOwner,
  async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const userId = req.user.uid;

      const result = await Employee.findAllByUserId(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        onlyDeleted: true,
      });

      res.status(200).json({
        message: "Deleted employees retrieved successfully",
        data: result,
      });
    } catch (error) {
      console.error("Get deleted employees error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to retrieve deleted employees",
      });
    }
  }
);

// GET /employees/statistics - Get employee statistics (only for owner/manager)
router.get(
  "/statistics",
  authenticateToken,
  isManagerOrOwner,
  async (req, res) => {
    try {
      const userId = req.user.uid;

      // Simple statistics without complex queries
      const activeResult = await Employee.findAllByUserId(userId);
      const deletedResult = await Employee.findAllByUserId(userId, {
        onlyDeleted: true,
      });

      const statistics = {
        total: activeResult.total,
        active: activeResult.total,
        deleted: deletedResult.total,
        departments: {},
      };

      // Count by department
      activeResult.employees.forEach((emp) => {
        if (emp.department) {
          statistics.departments[emp.department] =
            (statistics.departments[emp.department] || 0) + 1;
        }
      });

      res.status(200).json({
        message: "Employee statistics retrieved successfully",
        data: statistics,
      });
    } catch (error) {
      console.error("Get employee statistics error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to retrieve employee statistics",
      });
    }
  }
);

// GET /employees/:employeeId - Get specific employee (only for owner/manager)
router.get(
  "/:employeeId",
  authenticateToken,
  isManagerOrOwner,
  validateEmployeeId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { employeeId } = req.params;
      const userId = req.user.uid;

      const employee = await Employee.findById(userId, employeeId);

      if (!employee) {
        return res.status(404).json({
          error: "Employee not found",
          message: "Employee with the specified ID does not exist",
        });
      }

      res.status(200).json({
        message: "Employee retrieved successfully",
        data: employee,
      });
    } catch (error) {
      console.error("Get employee error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to retrieve employee",
      });
    }
  }
);

// POST /employees - Create new employee (only for owner/manager)
router.post(
  "/",
  authenticateToken,
  isManagerOrOwner,
  validateEmployee,
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user.uid;
      const employeeData = req.body;

      // Check if employee with same TC Kimlik No already exists
      if (employeeData.tcKimlikNo) {
        const existingEmployees = await Employee.search(
          userId,
          employeeData.tcKimlikNo
        );
        const duplicateTc = existingEmployees.employees?.some(
          (emp) => emp.tcKimlikNo === employeeData.tcKimlikNo && emp.isActive
        );

        if (duplicateTc) {
          return res.status(400).json({
            error: "Duplicate TC Kimlik No",
            message: "An active employee with this TC Kimlik No already exists",
          });
        }
      }

      const employee = await Employee.create(userId, employeeData);

      res.status(201).json({
        message: "Employee created successfully",
        data: employee,
      });
    } catch (error) {
      console.error("Create employee error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to create employee",
      });
    }
  }
);

// PUT /employees/:employeeId - Update employee
router.put(
  "/:employeeId",
  authenticateToken,
  validateEmployeeId,
  validateEmployee,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { employeeId } = req.params;
      const userId = req.user.uid;
      const updateData = req.body;

      // Check if employee exists
      const existingEmployee = await Employee.findById(userId, employeeId);
      if (!existingEmployee) {
        return res.status(404).json({
          error: "Employee not found",
          message: "Employee with the specified ID does not exist",
        });
      }

      // Check for duplicate TC Kimlik No if updating
      if (
        updateData.tcKimlikNo &&
        updateData.tcKimlikNo !== existingEmployee.tcKimlikNo
      ) {
        const existingEmployees = await Employee.search(
          userId,
          updateData.tcKimlikNo
        );
        const duplicateTc = existingEmployees.employees?.some(
          (emp) =>
            emp.tcKimlikNo === updateData.tcKimlikNo &&
            emp.isActive &&
            emp.id !== employeeId
        );

        if (duplicateTc) {
          return res.status(400).json({
            error: "Duplicate TC Kimlik No",
            message:
              "Another active employee with this TC Kimlik No already exists",
          });
        }
      }

      const updatedEmployee = await Employee.updateById(
        userId,
        employeeId,
        updateData
      );

      res.status(200).json({
        message: "Employee updated successfully",
        data: updatedEmployee,
      });
    } catch (error) {
      console.error("Update employee error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to update employee",
      });
    }
  }
);

// DELETE /employees/:employeeId - Soft delete employee
router.delete(
  "/:employeeId",
  authenticateToken,
  validateEmployeeId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { employeeId } = req.params;
      const userId = req.user.uid;

      // Check if employee exists and is active
      const employee = await Employee.findById(userId, employeeId);
      if (!employee) {
        return res.status(404).json({
          error: "Employee not found",
          message: "Employee with the specified ID does not exist",
        });
      }

      if (!employee.isActive) {
        return res.status(400).json({
          error: "Employee already deleted",
          message: "This employee has already been deleted",
        });
      }

      await Employee.deleteById(userId, employeeId);

      res.status(200).json({
        message: "Employee deleted successfully",
      });
    } catch (error) {
      console.error("Delete employee error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to delete employee",
      });
    }
  }
);

// POST /employees/:employeeId/restore - Restore deleted employee
router.post(
  "/:employeeId/restore",
  authenticateToken,
  validateEmployeeId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { employeeId } = req.params;
      const userId = req.user.uid;

      // Check if employee exists and is deleted
      const employee = await Employee.findById(userId, employeeId, {
        includeDeleted: true,
      });
      if (!employee) {
        return res.status(404).json({
          error: "Employee not found",
          message: "Employee with the specified ID does not exist",
        });
      }

      if (employee.isActive) {
        return res.status(400).json({
          error: "Employee not deleted",
          message: "This employee is already active",
        });
      }

      const restoredEmployee = await Employee.restoreById(userId, employeeId);

      res.status(200).json({
        message: "Employee restored successfully",
        data: restoredEmployee,
      });
    } catch (error) {
      console.error("Restore employee error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to restore employee",
      });
    }
  }
);

// GET /employees/me/leaves - Get current employee's own leaves
router.get("/me/leaves", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const userRole = req.user.role;

    // Only employees can access this endpoint
    if (userRole !== "employee") {
      return res.status(403).json({
        error: "Access denied",
        message: "This endpoint is only for employees",
      });
    }

    // Find employee record by user ID
    const employee = await Employee.findByUserId(userId);

    if (!employee) {
      return res.status(404).json({
        error: "Employee not found",
        message: "Employee record not found for this user",
      });
    }

    // Get query parameters for filtering
    const { page = 1, limit = 10, status, type } = req.query;
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
    };

    if (status) {
      options.status = status;
    }
    if (type) {
      options.type = type;
    }

    // Get leaves using the Leave model
    const Leave = require("../models/Leave");
    const result = await Leave.findAllByEmployeeId(
      employee.businessOwnerId,
      employee.id,
      options
    );

    res.status(200).json({
      message: "Leaves retrieved successfully",
      data: result,
    });
  } catch (error) {
    console.error("Get employee own leaves error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to get employee leaves",
    });
  }
});

// POST /employees/me/leaves - Create leave request for current employee
router.post(
  "/me/leaves",
  authenticateToken,
  [
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
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user.uid;
      const userRole = req.user.role;

      // Only employees can access this endpoint
      if (userRole !== "employee") {
        return res.status(403).json({
          error: "Access denied",
          message: "This endpoint is only for employees",
        });
      }

      // Find employee record by user ID
      const employee = await Employee.findByUserId(userId);

      if (!employee) {
        return res.status(404).json({
          error: "Employee not found",
          message: "Employee record not found for this user",
        });
      }

      const leaveData = req.body;

      // Validate dates
      const Leave = require("../models/Leave");
      try {
        Leave.validateDates(leaveData.startDate, leaveData.endDate);
      } catch (dateError) {
        return res.status(400).json({
          error: "Invalid dates",
          message: dateError.message,
        });
      }

      // Employees can only create pending leaves
      leaveData.status = "pending";
      leaveData.approved = false;

      const leave = await Leave.create(
        employee.businessOwnerId,
        employee.id,
        leaveData
      );

      res.status(201).json({
        message: "Leave request created successfully",
        data: leave,
      });
    } catch (error) {
      console.error("Create employee leave request error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to create leave request",
      });
    }
  }
);

// GET /employees/me/advances - Get current employee's own advance requests
router.get("/me/advances", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { status, page = 1, limit = 10 } = req.query;

    // Find employee record by user ID
    const employee = await Employee.findByUserId(userId);

    if (!employee) {
      return res.status(404).json({
        error: "Employee not found",
        message: "Employee record not found for this user",
      });
    }

    const AdvanceRequest = require("../models/AdvanceRequest");
    const options = {
      status,
      page: parseInt(page),
      limit: parseInt(limit),
    };

    const result = await AdvanceRequest.findAllByEmployeeId(
      employee.businessOwnerId,
      employee.id,
      options
    );

    res.status(200).json({
      message: "Advance requests retrieved successfully",
      data: result,
    });
  } catch (error) {
    console.error("Get employee advance requests error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to get advance requests",
    });
  }
});

// POST /employees/me/advances - Create advance request for current employee
router.post(
  "/me/advances",
  authenticateToken,
  [
    body("amount").isNumeric().withMessage("Amount must be a number"),
    body("reason").notEmpty().withMessage("Reason is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation Error",
          message: "Invalid input data",
          details: errors.array(),
        });
      }

      const userId = req.user.uid;

      // Find employee record by user ID
      const employee = await Employee.findByUserId(userId);

      if (!employee) {
        return res.status(404).json({
          error: "Employee not found",
          message: "Employee record not found for this user",
        });
      }

      const { amount, reason } = req.body;

      // Validate advance request data
      const AdvanceRequest = require("../models/AdvanceRequest");
      try {
        AdvanceRequest.validateAdvanceData(amount, reason);
      } catch (validationError) {
        return res.status(400).json({
          error: "Invalid advance request data",
          message: validationError.message,
        });
      }

      const advanceRequest = await AdvanceRequest.create(
        employee.businessOwnerId,
        employee.id,
        {
          amount: parseFloat(amount),
          reason: reason.trim(),
        }
      );

      res.status(201).json({
        message: "Advance request created successfully",
        data: advanceRequest,
      });
    } catch (error) {
      console.error("Create employee advance request error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to create advance request",
      });
    }
  }
);

module.exports = router;
