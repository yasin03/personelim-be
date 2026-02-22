const employeesService = require("./employees.service");

const me = async (req, res) => {
  try {
    const userId = req.user.uid;
    const userRole = req.user.role;

    if (userRole !== "employee") {
      return res.status(403).json({
        error: "Access denied",
        message: "This endpoint is only for employees",
      });
    }

    const employee = await employeesService.findEmployeeByUserId(userId);

    if (!employee) {
      return res.status(404).json({
        error: "Employee not found",
        message: "Employee record not found for this user",
      });
    }

    const sanitizedEmployee = employeesService.sanitizeEmployee(employee);

    return res.status(200).json({
      message: "Employee data retrieved successfully",
      data: sanitizedEmployee,
    });
  } catch (error) {
    console.error("Get employee own data error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to get employee data",
    });
  }
};

const updateMe = async (req, res) => {
  try {
    const userId = req.user.uid;
    const userRole = req.user.role;

    if (userRole !== "employee") {
      return res.status(403).json({
        error: "Access denied",
        message: "This endpoint is only for employees",
      });
    }

    const employee = await employeesService.findEmployeeByUserId(userId);

    if (!employee) {
      return res.status(404).json({
        error: "Employee not found",
        message: "Employee record not found for this user",
      });
    }

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

    const updatedEmployee = await employeesService.updateEmployeeById(
      employee.businessOwnerId,
      employee.id,
      updateData,
    );

    const sanitizedEmployee =
      employeesService.sanitizeEmployee(updatedEmployee);

    return res.status(200).json({
      message: "Employee data updated successfully",
      data: sanitizedEmployee,
    });
  } catch (error) {
    console.error("Update employee own data error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to update employee data",
    });
  }
};

const list = async (req, res) => {
  try {
    const { page = 1, limit = 10, department, search } = req.query;
    const userId = req.user.uid;

    const paging = {
      page: parseInt(page),
      limit: parseInt(limit),
    };

    let result;

    if (search) {
      result = await employeesService.searchEmployees(userId, search, paging);
    } else if (department) {
      result = await employeesService.listEmployeesByDepartment(
        userId,
        department,
        paging,
      );
    } else {
      result = await employeesService.listEmployees(userId, paging);
    }

    return res.status(200).json({
      message: "Employees retrieved successfully",
      data: result,
    });
  } catch (error) {
    console.error("Get employees error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to retrieve employees",
    });
  }
};

const listDeleted = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user.uid;

    const result = await employeesService.listEmployees(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      onlyDeleted: true,
    });

    return res.status(200).json({
      message: "Deleted employees retrieved successfully",
      data: result,
    });
  } catch (error) {
    console.error("Get deleted employees error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to retrieve deleted employees",
    });
  }
};

const statistics = async (req, res) => {
  try {
    const userId = req.user.uid;

    const activeResult = await employeesService.listEmployees(userId);
    const deletedResult = await employeesService.listEmployees(userId, {
      onlyDeleted: true,
    });

    const stats = {
      total: activeResult.total,
      active: activeResult.total,
      deleted: deletedResult.total,
      departments: {},
    };

    activeResult.employees.forEach((emp) => {
      if (emp.department) {
        stats.departments[emp.department] =
          (stats.departments[emp.department] || 0) + 1;
      }
    });

    return res.status(200).json({
      message: "Employee statistics retrieved successfully",
      data: stats,
    });
  } catch (error) {
    console.error("Get employee statistics error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to retrieve employee statistics",
    });
  }
};

const getById = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const userId = req.user.uid;

    const employee = await employeesService.findEmployeeById(
      userId,
      employeeId,
    );

    if (!employee) {
      return res.status(404).json({
        error: "Employee not found",
        message: "Employee with the specified ID does not exist",
      });
    }

    return res.status(200).json({
      message: "Employee retrieved successfully",
      data: employee,
    });
  } catch (error) {
    console.error("Get employee error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to retrieve employee",
    });
  }
};

const create = async (req, res) => {
  try {
    const userId = req.user.uid;
    const employeeData = req.body;

    if (employeeData.tcKimlikNo) {
      const existingEmployees = await employeesService.searchEmployees(
        userId,
        employeeData.tcKimlikNo,
      );

      const duplicateTc = existingEmployees.employees?.some(
        (emp) => emp.tcKimlikNo === employeeData.tcKimlikNo && emp.isActive,
      );

      if (duplicateTc) {
        return res.status(400).json({
          error: "Duplicate TC Kimlik No",
          message: "An active employee with this TC Kimlik No already exists",
        });
      }
    }

    const employee = await employeesService.createEmployee(
      userId,
      employeeData,
    );

    return res.status(201).json({
      message: "Employee created successfully",
      data: employee,
    });
  } catch (error) {
    console.error("Create employee error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to create employee",
    });
  }
};

const update = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const userId = req.user.uid;
    const updateData = req.body;

    const existingEmployee = await employeesService.findEmployeeById(
      userId,
      employeeId,
    );

    if (!existingEmployee) {
      return res.status(404).json({
        error: "Employee not found",
        message: "Employee with the specified ID does not exist",
      });
    }

    if (
      updateData.tcKimlikNo &&
      updateData.tcKimlikNo !== existingEmployee.tcKimlikNo
    ) {
      const existingEmployees = await employeesService.searchEmployees(
        userId,
        updateData.tcKimlikNo,
      );
      const duplicateTc = existingEmployees.employees?.some(
        (emp) =>
          emp.tcKimlikNo === updateData.tcKimlikNo &&
          emp.isActive &&
          emp.id !== employeeId,
      );

      if (duplicateTc) {
        return res.status(400).json({
          error: "Duplicate TC Kimlik No",
          message:
            "Another active employee with this TC Kimlik No already exists",
        });
      }
    }

    const updatedEmployee = await employeesService.updateEmployeeById(
      userId,
      employeeId,
      updateData,
    );

    return res.status(200).json({
      message: "Employee updated successfully",
      data: updatedEmployee,
    });
  } catch (error) {
    console.error("Update employee error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to update employee",
    });
  }
};

const remove = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const userId = req.user.uid;

    const employee = await employeesService.findEmployeeById(
      userId,
      employeeId,
    );

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

    await employeesService.deleteEmployeeById(userId, employeeId);

    return res.status(200).json({
      message: "Employee deleted successfully",
    });
  } catch (error) {
    console.error("Delete employee error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to delete employee",
    });
  }
};

const restore = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const userId = req.user.uid;

    const employee = await employeesService.findEmployeeById(
      userId,
      employeeId,
      {
        includeDeleted: true,
      },
    );

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

    const restoredEmployee = await employeesService.restoreEmployeeById(
      userId,
      employeeId,
    );

    return res.status(200).json({
      message: "Employee restored successfully",
      data: restoredEmployee,
    });
  } catch (error) {
    console.error("Restore employee error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to restore employee",
    });
  }
};

const myLeaves = async (req, res) => {
  try {
    const userId = req.user.uid;
    const userRole = req.user.role;

    if (userRole !== "employee") {
      return res.status(403).json({
        error: "Access denied",
        message: "This endpoint is only for employees",
      });
    }

    const employee = await employeesService.findEmployeeByUserId(userId);

    if (!employee) {
      return res.status(404).json({
        error: "Employee not found",
        message: "Employee record not found for this user",
      });
    }

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

    const result = await employeesService.listLeavesByEmployeeId(
      employee.businessOwnerId,
      employee.id,
      options,
    );

    return res.status(200).json({
      message: "Leaves retrieved successfully",
      data: result,
    });
  } catch (error) {
    console.error("Get employee own leaves error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to get employee leaves",
    });
  }
};

const createMyLeave = async (req, res) => {
  try {
    const userId = req.user.uid;
    const userRole = req.user.role;

    if (userRole !== "employee") {
      return res.status(403).json({
        error: "Access denied",
        message: "This endpoint is only for employees",
      });
    }

    const employee = await employeesService.findEmployeeByUserId(userId);

    if (!employee) {
      return res.status(404).json({
        error: "Employee not found",
        message: "Employee record not found for this user",
      });
    }

    const leaveData = req.body;

    try {
      employeesService.validateLeaveDates(
        leaveData.startDate,
        leaveData.endDate,
      );
    } catch (dateError) {
      return res.status(400).json({
        error: "Invalid dates",
        message: dateError.message,
      });
    }

    leaveData.status = "pending";
    leaveData.approved = false;

    const leave = await employeesService.createLeave(
      employee.businessOwnerId,
      employee.id,
      leaveData,
    );

    return res.status(201).json({
      message: "Leave request created successfully",
      data: leave,
    });
  } catch (error) {
    console.error("Create employee leave request error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to create leave request",
    });
  }
};

const myAdvances = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { status, page = 1, limit = 10 } = req.query;

    const employee = await employeesService.findEmployeeByUserId(userId);

    if (!employee) {
      return res.status(404).json({
        error: "Employee not found",
        message: "Employee record not found for this user",
      });
    }

    const options = {
      status,
      page: parseInt(page),
      limit: parseInt(limit),
    };

    const result = await employeesService.listAdvanceRequestsByEmployeeId(
      employee.businessOwnerId,
      employee.id,
      options,
    );

    return res.status(200).json({
      message: "Advance requests retrieved successfully",
      data: result,
    });
  } catch (error) {
    console.error("Get employee advance requests error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to get advance requests",
    });
  }
};

const createMyAdvance = async (req, res) => {
  try {
    const userId = req.user.uid;

    const employee = await employeesService.findEmployeeByUserId(userId);

    if (!employee) {
      return res.status(404).json({
        error: "Employee not found",
        message: "Employee record not found for this user",
      });
    }

    const { amount, reason } = req.body;
    try {
      employeesService.validateAdvanceData(amount, reason);
    } catch (validationError) {
      return res.status(400).json({
        error: "Invalid advance request data",
        message: validationError.message,
      });
    }

    const advanceRequest = await employeesService.createAdvanceRequest(
      employee.businessOwnerId,
      employee.id,
      {
        amount: parseFloat(amount),
        reason: reason.trim(),
      },
    );

    return res.status(201).json({
      message: "Advance request created successfully",
      data: advanceRequest,
    });
  } catch (error) {
    console.error("Create employee advance request error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to create advance request",
    });
  }
};

const contractTypes = (req, res) => {
  try {
    return res.status(200).json({
      message: "Contract types retrieved successfully",
      contractTypes: employeesService.CONTRACT_TYPES,
    });
  } catch (error) {
    console.error("Get contract types error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to get contract types",
    });
  }
};

const workModes = (req, res) => {
  try {
    return res.status(200).json({
      message: "Work modes retrieved successfully",
      workModes: employeesService.WORK_MODES,
    });
  } catch (error) {
    console.error("Get work modes error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to get work modes",
    });
  }
};

module.exports = {
  me,
  updateMe,
  list,
  listDeleted,
  statistics,
  getById,
  create,
  update,
  remove,
  restore,
  myLeaves,
  createMyLeave,
  myAdvances,
  createMyAdvance,
  contractTypes,
  workModes,
};
