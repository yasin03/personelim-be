const payrollsService = require("./payrolls.service");

const verifyEmployeeOwnership = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const userId = req.user.uid;
    const userRole = req.user.role;

    if (userRole === "employee") {
      const employee = await payrollsService.findEmployeeByUserId(userId);
      if (!employee || employee.id !== employeeId) {
        return res.status(403).json({
          error: "Forbidden",
          message: "You can only view your own payrolls",
        });
      }
      req.employee = employee;
      req.businessOwnerId = employee.businessOwnerId;
    } else if (["owner", "manager"].includes(userRole)) {
      const employee = await payrollsService.findEmployeeById(
        userId,
        employeeId,
      );
      if (!employee) {
        return res.status(404).json({
          error: "Not Found",
          message: "Employee not found",
        });
      }
      req.employee = employee;
      req.businessOwnerId = userId;
    } else {
      return res.status(403).json({
        error: "Forbidden",
        message: "Insufficient permissions",
      });
    }

    return next();
  } catch (error) {
    console.error("Employee ownership verification error:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to verify employee ownership",
    });
  }
};

const create = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const ownerId = req.businessOwnerId;
    const payrollData = req.body;

    payrollsService.validatePayrollData(payrollData);

    const payroll = await payrollsService.createPayroll(
      ownerId,
      employeeId,
      payrollData,
    );

    console.log(
      `Payroll created for employee ${employeeId} by user ${req.user.email}`,
    );

    return res.status(201).json({
      message: "Payroll created successfully",
      data: payroll,
    });
  } catch (error) {
    console.error("Error creating payroll:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Failed to create payroll",
    });
  }
};

const list = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const ownerId = req.businessOwnerId;
    const { year, status, page = 1, limit = 10 } = req.query;

    const options = {
      year,
      status,
      page: parseInt(page),
      limit: parseInt(limit),
    };

    const result = await payrollsService.listPayrolls(
      ownerId,
      employeeId,
      options,
    );

    return res.status(200).json({
      message: "Payrolls retrieved successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error getting payrolls:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Failed to get payrolls",
    });
  }
};

const statistics = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const ownerId = req.businessOwnerId;
    const { year = new Date().getFullYear() } = req.query;

    const stats = await payrollsService.getStatistics(ownerId, employeeId, {
      year: parseInt(year),
    });

    return res.status(200).json({
      message: "Payroll statistics retrieved successfully",
      data: stats,
    });
  } catch (error) {
    console.error("Error getting payroll statistics:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Failed to get payroll statistics",
    });
  }
};

const getById = async (req, res) => {
  try {
    const { employeeId, payrollId } = req.params;
    const ownerId = req.businessOwnerId;

    const payroll = await payrollsService.findById(
      ownerId,
      employeeId,
      payrollId,
    );
    if (!payroll) {
      return res.status(404).json({
        error: "Not Found",
        message: "Payroll not found",
      });
    }

    return res.status(200).json({
      message: "Payroll retrieved successfully",
      data: payroll,
    });
  } catch (error) {
    console.error("Error getting payroll:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Failed to get payroll",
    });
  }
};

const update = async (req, res) => {
  try {
    const { employeeId, payrollId } = req.params;
    const ownerId = req.businessOwnerId;
    const updateData = req.body;

    const currentPayroll = await payrollsService.findById(
      ownerId,
      employeeId,
      payrollId,
    );
    if (!currentPayroll) {
      return res.status(404).json({
        error: "Not Found",
        message: "Payroll not found",
      });
    }

    const updatedPayroll = await payrollsService.updateById(
      ownerId,
      employeeId,
      payrollId,
      updateData,
    );

    console.log(`Payroll ${payrollId} updated by user ${req.user.email}`);

    return res.status(200).json({
      message: "Payroll updated successfully",
      data: updatedPayroll,
    });
  } catch (error) {
    console.error("Error updating payroll:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Failed to update payroll",
    });
  }
};

const markPaid = async (req, res) => {
  try {
    const { employeeId, payrollId } = req.params;
    const ownerId = req.businessOwnerId;

    const currentPayroll = await payrollsService.findById(
      ownerId,
      employeeId,
      payrollId,
    );
    if (!currentPayroll) {
      return res.status(404).json({
        error: "Not Found",
        message: "Payroll not found",
      });
    }

    if (currentPayroll.status === "Ödendi") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Payroll is already marked as paid",
      });
    }

    const paidPayroll = await payrollsService.markAsPaid(
      ownerId,
      employeeId,
      payrollId,
    );

    console.log(`Payroll ${payrollId} marked as paid by ${req.user.email}`);

    return res.status(200).json({
      message: "Payroll marked as paid successfully",
      data: paidPayroll,
    });
  } catch (error) {
    console.error("Error marking payroll as paid:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Failed to mark payroll as paid",
    });
  }
};

const remove = async (req, res) => {
  try {
    const { employeeId, payrollId } = req.params;
    const ownerId = req.businessOwnerId;

    const deletedPayroll = await payrollsService.deleteById(
      ownerId,
      employeeId,
      payrollId,
    );
    if (!deletedPayroll) {
      return res.status(404).json({
        error: "Not Found",
        message: "Payroll not found",
      });
    }

    console.log(`Payroll ${payrollId} deleted by user ${req.user.email}`);

    return res.status(200).json({
      message: "Payroll deleted successfully",
      data: deletedPayroll,
    });
  } catch (error) {
    console.error("Error deleting payroll:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Failed to delete payroll",
    });
  }
};

module.exports = {
  verifyEmployeeOwnership,
  create,
  list,
  statistics,
  getById,
  update,
  markPaid,
  remove,
};
