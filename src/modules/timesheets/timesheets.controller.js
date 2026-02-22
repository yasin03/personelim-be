const timesheetsService = require("./timesheets.service");

const createTimesheet = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const timesheetData = req.body;

    if (req.user.role === "employee") {
      const employee = await timesheetsService.findEmployeeByUserId(
        req.user.uid,
      );
      if (!employee || employee.id !== employeeId) {
        return res.status(403).json({
          error: "Forbidden",
          message: "You can only create timesheets for yourself",
        });
      }
    }

    const employee = await timesheetsService.findEmployee(
      req.user.uid,
      employeeId,
    );
    if (!employee) {
      return res.status(404).json({
        error: "Not Found",
        message: "Employee not found",
      });
    }

    timesheetsService.Timesheet.validateTimesheetData(timesheetData);

    const timesheet = await timesheetsService.createTimesheet(
      req.user.uid,
      employeeId,
      timesheetData,
    );

    console.log(
      `Timesheet created for employee ${employeeId} by user ${req.user.email}`,
    );

    return res.status(201).json({
      message: "Timesheet created successfully",
      data: timesheet,
    });
  } catch (error) {
    console.error("Error creating timesheet:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Failed to create timesheet",
    });
  }
};

const listTimesheets = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month, year, status, page = 1, limit = 10 } = req.query;

    if (req.user.role === "employee") {
      const employee = await timesheetsService.findEmployeeByUserId(
        req.user.uid,
      );
      if (!employee || employee.id !== employeeId) {
        return res.status(403).json({
          error: "Forbidden",
          message: "You can only view your own timesheets",
        });
      }
    }

    const employee = await timesheetsService.findEmployee(
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
      month,
      year,
      status,
      page: parseInt(page),
      limit: parseInt(limit),
    };

    const result = await timesheetsService.listTimesheets(
      req.user.uid,
      employeeId,
      options,
    );

    return res.status(200).json({
      message: "Timesheets retrieved successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error getting timesheets:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Failed to get timesheets",
    });
  }
};

const getStatistics = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month, year = new Date().getFullYear() } = req.query;

    if (req.user.role === "employee") {
      const employee = await timesheetsService.findEmployeeByUserId(
        req.user.uid,
      );
      if (!employee || employee.id !== employeeId) {
        return res.status(403).json({
          error: "Forbidden",
          message: "You can only view your own timesheet statistics",
        });
      }
    }

    const employee = await timesheetsService.findEmployee(
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
      month,
      year: parseInt(year),
    };

    const stats = await timesheetsService.getStatistics(
      req.user.uid,
      employeeId,
      options,
    );

    return res.status(200).json({
      message: "Timesheet statistics retrieved successfully",
      data: stats,
    });
  } catch (error) {
    console.error("Error getting timesheet statistics:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Failed to get timesheet statistics",
    });
  }
};

const getTimesheet = async (req, res) => {
  try {
    const { employeeId, timesheetId } = req.params;

    if (req.user.role === "employee") {
      const employee = await timesheetsService.findEmployeeByUserId(
        req.user.uid,
      );
      if (!employee || employee.id !== employeeId) {
        return res.status(403).json({
          error: "Forbidden",
          message: "You can only view your own timesheets",
        });
      }
    }

    const employee = await timesheetsService.findEmployee(
      req.user.uid,
      employeeId,
    );
    if (!employee) {
      return res.status(404).json({
        error: "Not Found",
        message: "Employee not found",
      });
    }

    const timesheet = await timesheetsService.findById(
      req.user.uid,
      employeeId,
      timesheetId,
    );
    if (!timesheet) {
      return res.status(404).json({
        error: "Not Found",
        message: "Timesheet not found",
      });
    }

    return res.status(200).json({
      message: "Timesheet retrieved successfully",
      data: timesheet,
    });
  } catch (error) {
    console.error("Error getting timesheet:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Failed to get timesheet",
    });
  }
};

const updateTimesheet = async (req, res) => {
  try {
    const { employeeId, timesheetId } = req.params;
    const updateData = req.body;

    if (req.user.role === "employee") {
      const employee = await timesheetsService.findEmployeeByUserId(
        req.user.uid,
      );
      if (!employee || employee.id !== employeeId) {
        return res.status(403).json({
          error: "Forbidden",
          message: "You can only update your own timesheets",
        });
      }
    }

    const employee = await timesheetsService.findEmployee(
      req.user.uid,
      employeeId,
    );
    if (!employee) {
      return res.status(404).json({
        error: "Not Found",
        message: "Employee not found",
      });
    }

    const currentTimesheet = await timesheetsService.findById(
      req.user.uid,
      employeeId,
      timesheetId,
    );
    if (!currentTimesheet) {
      return res.status(404).json({
        error: "Not Found",
        message: "Timesheet not found",
      });
    }

    if (Object.keys(updateData).length > 0) {
      timesheetsService.Timesheet.validateTimesheetData({
        ...currentTimesheet,
        ...updateData,
      });
    }

    const updatedTimesheet = await timesheetsService.updateById(
      req.user.uid,
      employeeId,
      timesheetId,
      updateData,
    );

    console.log(`Timesheet ${timesheetId} updated by user ${req.user.email}`);

    return res.status(200).json({
      message: "Timesheet updated successfully",
      data: updatedTimesheet,
    });
  } catch (error) {
    console.error("Error updating timesheet:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Failed to update timesheet",
    });
  }
};

const deleteTimesheet = async (req, res) => {
  try {
    const { employeeId, timesheetId } = req.params;

    if (req.user.role === "employee") {
      const employee = await timesheetsService.findEmployeeByUserId(
        req.user.uid,
      );
      if (!employee || employee.id !== employeeId) {
        return res.status(403).json({
          error: "Forbidden",
          message: "You can only delete your own timesheets",
        });
      }
    }

    const employee = await timesheetsService.findEmployee(
      req.user.uid,
      employeeId,
    );
    if (!employee) {
      return res.status(404).json({
        error: "Not Found",
        message: "Employee not found",
      });
    }

    const deletedTimesheet = await timesheetsService.deleteById(
      req.user.uid,
      employeeId,
      timesheetId,
    );
    if (!deletedTimesheet) {
      return res.status(404).json({
        error: "Not Found",
        message: "Timesheet not found",
      });
    }

    console.log(`Timesheet ${timesheetId} deleted by user ${req.user.email}`);

    return res.status(200).json({
      message: "Timesheet deleted successfully",
      data: deletedTimesheet,
    });
  } catch (error) {
    console.error("Error deleting timesheet:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Failed to delete timesheet",
    });
  }
};

module.exports = {
  createTimesheet,
  listTimesheets,
  getStatistics,
  getTimesheet,
  updateTimesheet,
  deleteTimesheet,
};
