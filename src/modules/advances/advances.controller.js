const advancesService = require("./advances.service");
const AdvanceRequest = require("../../../models/AdvanceRequest");

const createAdvance = async (req, res) => {
  try {
    const { amount, reason, employeeId } = req.body;
    let targetEmployeeId = employeeId;

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

    if (
      req.user.role === "employee" &&
      targetEmployeeId !== req.user.employeeId
    ) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You can only create advance requests for yourself",
      });
    }

    const employee = await advancesService.findEmployee(
      req.user.uid,
      targetEmployeeId,
    );
    if (!employee) {
      return res.status(404).json({
        error: "Not Found",
        message: "Employee not found",
      });
    }

    AdvanceRequest.validateAdvanceData(amount, reason);

    const advanceRequest = await advancesService.createAdvance(
      req.user.uid,
      targetEmployeeId,
      {
        amount: parseFloat(amount),
        reason: reason.trim(),
      },
    );

    console.log(
      `Advance request created for employee ${targetEmployeeId} by user ${req.user.email}`,
    );

    return res.status(201).json({
      message: "Advance request created successfully",
      data: advanceRequest,
    });
  } catch (error) {
    console.error("Error creating advance request:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Failed to create advance request",
    });
  }
};

const listAdvances = async (req, res) => {
  try {
    const { employeeId, status, page = 1, limit = 10 } = req.query;

    if (req.user.role === "employee") {
      const options = {
        status,
        page: parseInt(page),
        limit: parseInt(limit),
      };

      const result = await advancesService.findAdvancesByEmployee(
        req.user.uid,
        req.user.employeeId,
        options,
      );

      return res.status(200).json({
        message: "Advance requests retrieved successfully",
        data: result,
      });
    }

    if (employeeId) {
      const employee = await advancesService.findEmployee(
        req.user.uid,
        employeeId,
      );
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

      const result = await advancesService.findAdvancesByEmployee(
        req.user.uid,
        employeeId,
        options,
      );

      return res.status(200).json({
        message: "Advance requests retrieved successfully",
        data: result,
      });
    }

    const employees = await advancesService.findAllEmployees(req.user.uid);
    const allAdvances = [];

    for (const employee of employees) {
      const options = { status };
      const result = await advancesService.findAdvancesByEmployee(
        req.user.uid,
        employee.id,
        options,
      );

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

    allAdvances.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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
  } catch (error) {
    console.error("Error getting advance requests:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Failed to get advance requests",
    });
  }
};

const getAdvance = async (req, res) => {
  try {
    const { employeeId, advanceId } = req.params;

    if (req.user.role === "employee" && employeeId !== req.user.employeeId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You can only view your own advance requests",
      });
    }

    const employee = await advancesService.findEmployee(
      req.user.uid,
      employeeId,
    );
    if (!employee) {
      return res.status(404).json({
        error: "Not Found",
        message: "Employee not found",
      });
    }

    const advanceRequest = await advancesService.findAdvanceById(
      req.user.uid,
      employeeId,
      advanceId,
    );
    if (!advanceRequest) {
      return res.status(404).json({
        error: "Not Found",
        message: "Advance request not found",
      });
    }

    const responseData = {
      ...advanceRequest,
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        department: employee.department,
      },
    };

    return res.status(200).json({
      message: "Advance request retrieved successfully",
      data: responseData,
    });
  } catch (error) {
    console.error("Error getting advance request:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Failed to get advance request",
    });
  }
};

const updateAdvance = async (req, res) => {
  try {
    const { employeeId, advanceId } = req.params;
    const { amount, reason } = req.body;

    if (req.user.role === "employee" && employeeId !== req.user.employeeId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You can only update your own advance requests",
      });
    }

    const employee = await advancesService.findEmployee(
      req.user.uid,
      employeeId,
    );
    if (!employee) {
      return res.status(404).json({
        error: "Not Found",
        message: "Employee not found",
      });
    }

    const currentAdvance = await advancesService.findAdvanceById(
      req.user.uid,
      employeeId,
      advanceId,
    );
    if (!currentAdvance) {
      return res.status(404).json({
        error: "Not Found",
        message: "Advance request not found",
      });
    }

    if (currentAdvance.status !== "pending") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Only pending advance requests can be updated",
      });
    }

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

    const updatedAdvance = await advancesService.updateAdvanceById(
      req.user.uid,
      employeeId,
      advanceId,
      updateData,
    );

    console.log(
      `Advance request ${advanceId} updated by user ${req.user.email}`,
    );

    return res.status(200).json({
      message: "Advance request updated successfully",
      data: updatedAdvance,
    });
  } catch (error) {
    console.error("Error updating advance request:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Failed to update advance request",
    });
  }
};

const approveAdvance = async (req, res) => {
  try {
    const { employeeId, advanceId } = req.params;
    const { approvalNote } = req.body;

    const employee = await advancesService.findEmployee(
      req.user.uid,
      employeeId,
    );
    if (!employee) {
      return res.status(404).json({
        error: "Not Found",
        message: "Employee not found",
      });
    }

    const currentAdvance = await advancesService.findAdvanceById(
      req.user.uid,
      employeeId,
      advanceId,
    );
    if (!currentAdvance) {
      return res.status(404).json({
        error: "Not Found",
        message: "Advance request not found",
      });
    }

    if (currentAdvance.status !== "pending") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Only pending advance requests can be approved",
      });
    }

    const approvedAdvance = await advancesService.updateAdvanceStatus(
      req.user.uid,
      employeeId,
      advanceId,
      "approved",
      req.user.email,
      approvalNote,
    );

    console.log(`Advance request ${advanceId} approved by ${req.user.email}`);

    return res.status(200).json({
      message: "Advance request approved successfully",
      data: approvedAdvance,
    });
  } catch (error) {
    console.error("Error approving advance request:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Failed to approve advance request",
    });
  }
};

const rejectAdvance = async (req, res) => {
  try {
    const { employeeId, advanceId } = req.params;
    const { approvalNote } = req.body;

    const employee = await advancesService.findEmployee(
      req.user.uid,
      employeeId,
    );
    if (!employee) {
      return res.status(404).json({
        error: "Not Found",
        message: "Employee not found",
      });
    }

    const currentAdvance = await advancesService.findAdvanceById(
      req.user.uid,
      employeeId,
      advanceId,
    );
    if (!currentAdvance) {
      return res.status(404).json({
        error: "Not Found",
        message: "Advance request not found",
      });
    }

    if (currentAdvance.status !== "pending") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Only pending advance requests can be rejected",
      });
    }

    const rejectedAdvance = await advancesService.updateAdvanceStatus(
      req.user.uid,
      employeeId,
      advanceId,
      "rejected",
      req.user.email,
      approvalNote,
    );

    console.log(`Advance request ${advanceId} rejected by ${req.user.email}`);

    return res.status(200).json({
      message: "Advance request rejected successfully",
      data: rejectedAdvance,
    });
  } catch (error) {
    console.error("Error rejecting advance request:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Failed to reject advance request",
    });
  }
};

const deleteAdvance = async (req, res) => {
  try {
    const { employeeId, advanceId } = req.params;

    if (req.user.role === "employee" && employeeId !== req.user.employeeId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You can only delete your own advance requests",
      });
    }

    const employee = await advancesService.findEmployee(
      req.user.uid,
      employeeId,
    );
    if (!employee) {
      return res.status(404).json({
        error: "Not Found",
        message: "Employee not found",
      });
    }

    const currentAdvance = await advancesService.findAdvanceById(
      req.user.uid,
      employeeId,
      advanceId,
    );
    if (!currentAdvance) {
      return res.status(404).json({
        error: "Not Found",
        message: "Advance request not found",
      });
    }

    if (req.user.role === "employee" && currentAdvance.status !== "pending") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Only pending advance requests can be deleted",
      });
    }

    const deletedAdvance = await advancesService.deleteAdvanceById(
      req.user.uid,
      employeeId,
      advanceId,
    );

    console.log(
      `Advance request ${advanceId} deleted by user ${req.user.email}`,
    );

    return res.status(200).json({
      message: "Advance request deleted successfully",
      data: deletedAdvance,
    });
  } catch (error) {
    console.error("Error deleting advance request:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Failed to delete advance request",
    });
  }
};

const getAdvanceStatistics = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { year = new Date().getFullYear() } = req.query;

    if (req.user.role === "employee") {
      const stats = await advancesService.getStatistics(
        req.user.uid,
        req.user.employeeId,
        parseInt(year),
      );

      return res.status(200).json({
        message: "Advance request statistics retrieved successfully",
        data: stats,
      });
    }

    if (employeeId) {
      const employee = await advancesService.findEmployee(
        req.user.uid,
        employeeId,
      );
      if (!employee) {
        return res.status(404).json({
          error: "Not Found",
          message: "Employee not found",
        });
      }

      const stats = await advancesService.getStatistics(
        req.user.uid,
        employeeId,
        parseInt(year),
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
    }

    const employees = await advancesService.findAllEmployees(req.user.uid);
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
      const employeeStats = await advancesService.getStatistics(
        req.user.uid,
        employee.id,
        parseInt(year),
      );

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
  } catch (error) {
    console.error("Error getting advance request statistics:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Failed to get advance request statistics",
    });
  }
};

module.exports = {
  createAdvance,
  listAdvances,
  getAdvance,
  updateAdvance,
  approveAdvance,
  rejectAdvance,
  deleteAdvance,
  getAdvanceStatistics,
};
