const paymentsService = require("./payments.service");

const verifyEmployeeOwnership = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const userId = req.user.uid;
    const userRole = req.user.role;

    if (userRole === "employee") {
      const employee = await paymentsService.findEmployeeByUserId(userId);
      if (!employee || employee.id !== employeeId) {
        return res.status(403).json({
          error: "Forbidden",
          message: "You can only view your own salary payments",
        });
      }
      req.employee = employee;
      req.businessOwnerId = employee.businessOwnerId;
    } else if (["owner", "manager"].includes(userRole)) {
      const employee = await paymentsService.findEmployeeById(
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
    const paymentData = req.body;

    paymentsService.validatePaymentData(paymentData);

    const salaryPayment = await paymentsService.createPayment(
      ownerId,
      employeeId,
      paymentData,
    );

    console.log(
      `Salary payment created for employee ${employeeId} by user ${req.user.email}`,
    );

    return res.status(201).json({
      message: "Salary payment created successfully",
      data: salaryPayment,
    });
  } catch (error) {
    console.error("Error creating salary payment:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Failed to create salary payment",
    });
  }
};

const list = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const ownerId = req.businessOwnerId;
    const {
      year,
      paymentMethod,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = req.query;

    const options = {
      year: year ? parseInt(year) : undefined,
      paymentMethod,
      startDate,
      endDate,
      page: parseInt(page),
      limit: parseInt(limit),
    };

    const result = await paymentsService.listPayments(
      ownerId,
      employeeId,
      options,
    );

    return res.status(200).json({
      message: "Salary payments retrieved successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error getting salary payments:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Failed to get salary payments",
    });
  }
};

const statistics = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const ownerId = req.businessOwnerId;
    const { year = new Date().getFullYear() } = req.query;

    const stats = await paymentsService.getStatistics(ownerId, employeeId, {
      year: parseInt(year),
    });

    return res.status(200).json({
      message: "Salary payment statistics retrieved successfully",
      data: stats,
    });
  } catch (error) {
    console.error("Error getting salary payment statistics:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Failed to get salary payment statistics",
    });
  }
};

const byPayroll = async (req, res) => {
  try {
    const { employeeId, payrollId } = req.params;
    const ownerId = req.businessOwnerId;

    const payments = await paymentsService.findByPayrollId(
      ownerId,
      employeeId,
      payrollId,
    );

    return res.status(200).json({
      message: "Salary payments retrieved successfully",
      data: {
        payments,
        total: payments.length,
      },
    });
  } catch (error) {
    console.error("Error getting salary payments by payroll ID:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Failed to get salary payments by payroll ID",
    });
  }
};

const getById = async (req, res) => {
  try {
    const { employeeId, paymentId } = req.params;
    const ownerId = req.businessOwnerId;

    const salaryPayment = await paymentsService.findPaymentById(
      ownerId,
      employeeId,
      paymentId,
    );
    if (!salaryPayment) {
      return res.status(404).json({
        error: "Not Found",
        message: "Salary payment not found",
      });
    }

    return res.status(200).json({
      message: "Salary payment retrieved successfully",
      data: salaryPayment,
    });
  } catch (error) {
    console.error("Error getting salary payment:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Failed to get salary payment",
    });
  }
};

const update = async (req, res) => {
  try {
    const { employeeId, paymentId } = req.params;
    const ownerId = req.businessOwnerId;
    const updateData = req.body;

    const currentPayment = await paymentsService.findPaymentById(
      ownerId,
      employeeId,
      paymentId,
    );
    if (!currentPayment) {
      return res.status(404).json({
        error: "Not Found",
        message: "Salary payment not found",
      });
    }

    if (Object.keys(updateData).length > 0) {
      paymentsService.validatePaymentData({ ...currentPayment, ...updateData });
    }

    const updatedPayment = await paymentsService.updatePaymentById(
      ownerId,
      employeeId,
      paymentId,
      updateData,
    );

    console.log(
      `Salary payment ${paymentId} updated by user ${req.user.email}`,
    );

    return res.status(200).json({
      message: "Salary payment updated successfully",
      data: updatedPayment,
    });
  } catch (error) {
    console.error("Error updating salary payment:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Failed to update salary payment",
    });
  }
};

const remove = async (req, res) => {
  try {
    const { employeeId, paymentId } = req.params;
    const ownerId = req.businessOwnerId;

    const deletedPayment = await paymentsService.deletePaymentById(
      ownerId,
      employeeId,
      paymentId,
    );
    if (!deletedPayment) {
      return res.status(404).json({
        error: "Not Found",
        message: "Salary payment not found",
      });
    }

    console.log(
      `Salary payment ${paymentId} deleted by user ${req.user.email}`,
    );

    return res.status(200).json({
      message: "Salary payment deleted successfully",
      data: deletedPayment,
    });
  } catch (error) {
    console.error("Error deleting salary payment:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Failed to delete salary payment",
    });
  }
};

module.exports = {
  verifyEmployeeOwnership,
  create,
  list,
  statistics,
  byPayroll,
  getById,
  update,
  remove,
};
