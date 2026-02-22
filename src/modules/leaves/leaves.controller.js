const leavesService = require("./leaves.service");

const verifyEmployeeOwnership = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const userId = req.user.uid;
    const userRole = req.user.role;

    if (userRole === "employee") {
      const employee = await leavesService.findEmployeeByUserId(userId);
      if (!employee || employee.id !== employeeId) {
        return res.status(403).json({
          error: "Access denied",
          message: "You can only access your own leave records",
        });
      }
      req.employee = employee;
      req.businessOwnerId = employee.businessOwnerId;
    } else if (["owner", "manager"].includes(userRole)) {
      const employee = await leavesService.findEmployeeById(userId, employeeId);
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

    return next();
  } catch (error) {
    console.error("Employee ownership verification error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to verify employee ownership",
    });
  }
};

const createLeave = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const businessOwnerId = req.businessOwnerId;
    const leaveData = req.body;

    try {
      leavesService.validateLeaveDates(leaveData.startDate, leaveData.endDate);
    } catch (dateError) {
      return res.status(400).json({
        error: "Invalid dates",
        message: dateError.message,
      });
    }

    if (req.user.role === "employee") {
      leaveData.status = "pending";
      leaveData.approved = false;
    }

    const leave = await leavesService.createLeave(
      businessOwnerId,
      employeeId,
      leaveData,
    );

    return res.status(201).json({
      message: "Leave created successfully",
      data: leave,
    });
  } catch (error) {
    console.error("Create leave error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to create leave",
    });
  }
};

const listLeaves = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const businessOwnerId = req.businessOwnerId;
    const { page = 1, limit = 10, approved, type, status } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
    };

    if (approved !== undefined) {
      options.approved = approved === "true";
    }
    if (status) {
      options.status = status;
    }
    if (type) {
      options.type = type;
    }

    const result = await leavesService.listLeaves(
      businessOwnerId,
      employeeId,
      options,
    );

    return res.status(200).json({
      message: "Leaves retrieved successfully",
      data: result,
    });
  } catch (error) {
    console.error("Get leaves error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to retrieve leaves",
    });
  }
};

const statistics = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const businessOwnerId = req.businessOwnerId;
    const { year } = req.query;

    const stats = await leavesService.getStatistics(
      businessOwnerId,
      employeeId,
      year ? parseInt(year) : undefined,
    );

    return res.status(200).json({
      message: "Leave statistics retrieved successfully",
      data: stats,
    });
  } catch (error) {
    console.error("Get leave statistics error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to get leave statistics",
    });
  }
};

const getLeave = async (req, res) => {
  try {
    const { employeeId, leaveId } = req.params;
    const businessOwnerId = req.businessOwnerId;

    const leave = await leavesService.findLeaveById(
      businessOwnerId,
      employeeId,
      leaveId,
    );
    if (!leave) {
      return res.status(404).json({
        error: "Leave not found",
        message: "Leave record not found",
      });
    }

    return res.status(200).json({
      message: "Leave retrieved successfully",
      data: leave,
    });
  } catch (error) {
    console.error("Get leave error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to retrieve leave",
    });
  }
};

const updateLeave = async (req, res) => {
  try {
    const { employeeId, leaveId } = req.params;
    const businessOwnerId = req.businessOwnerId;
    const updateData = req.body;

    const existingLeave = await leavesService.findLeaveById(
      businessOwnerId,
      employeeId,
      leaveId,
    );
    if (!existingLeave) {
      return res.status(404).json({
        error: "Leave not found",
        message: "Leave record not found",
      });
    }

    if (req.user.role === "employee" && existingLeave.status !== "pending") {
      return res.status(403).json({
        error: "Access denied",
        message: "You can only update pending leave requests",
      });
    }

    try {
      leavesService.validateLeaveDates(
        updateData.startDate,
        updateData.endDate,
      );
    } catch (dateError) {
      return res.status(400).json({
        error: "Invalid dates",
        message: dateError.message,
      });
    }

    const updatedLeave = await leavesService.updateLeaveById(
      businessOwnerId,
      employeeId,
      leaveId,
      updateData,
    );

    return res.status(200).json({
      message: "Leave updated successfully",
      data: updatedLeave,
    });
  } catch (error) {
    console.error("Update leave error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to update leave",
    });
  }
};

const approve = async (req, res) => {
  try {
    const { employeeId, leaveId } = req.params;
    const businessOwnerId = req.businessOwnerId;
    const { status, approvalNote } = req.body;
    const approvedBy = req.user.uid;

    const existingLeave = await leavesService.findLeaveById(
      businessOwnerId,
      employeeId,
      leaveId,
    );
    if (!existingLeave) {
      return res.status(404).json({
        error: "Leave not found",
        message: "Leave record not found",
      });
    }

    const updatedLeave = await leavesService.updateStatus(
      businessOwnerId,
      employeeId,
      leaveId,
      status,
      approvedBy,
      approvalNote,
    );

    return res.status(200).json({
      message: `Leave ${status} successfully`,
      data: updatedLeave,
    });
  } catch (error) {
    console.error("Approve leave error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to update leave status",
    });
  }
};

const removeLeave = async (req, res) => {
  try {
    const { employeeId, leaveId } = req.params;
    const businessOwnerId = req.businessOwnerId;

    const existingLeave = await leavesService.findLeaveById(
      businessOwnerId,
      employeeId,
      leaveId,
    );
    if (!existingLeave) {
      return res.status(404).json({
        error: "Leave not found",
        message: "Leave record not found",
      });
    }

    if (req.user.role === "employee" && existingLeave.status !== "pending") {
      return res.status(403).json({
        error: "Access denied",
        message: "You can only delete pending leave requests",
      });
    }

    await leavesService.deleteLeaveById(businessOwnerId, employeeId, leaveId);
    return res.status(200).json({
      message: "Leave deleted successfully",
    });
  } catch (error) {
    console.error("Delete leave error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to delete leave",
    });
  }
};

module.exports = {
  verifyEmployeeOwnership,
  createLeave,
  listLeaves,
  statistics,
  getLeave,
  updateLeave,
  approve,
  removeLeave,
};
