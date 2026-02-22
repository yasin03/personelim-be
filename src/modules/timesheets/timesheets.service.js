const Timesheet = require("../../../models/Timesheet");
const { Employee } = require("../../../models/Employee");

const findEmployeeByUserId = async (userId) => {
  return Employee.findByUserId(userId);
};

const findEmployee = async (ownerId, employeeId) => {
  return Employee.findById(ownerId, employeeId);
};

const createTimesheet = async (ownerId, employeeId, data) => {
  return Timesheet.create(ownerId, employeeId, data);
};

const listTimesheets = async (ownerId, employeeId, options) => {
  return Timesheet.findAllByEmployeeId(ownerId, employeeId, options);
};

const getStatistics = async (ownerId, employeeId, options) => {
  return Timesheet.getStatistics(ownerId, employeeId, options);
};

const findById = async (ownerId, employeeId, timesheetId) => {
  return Timesheet.findById(ownerId, employeeId, timesheetId);
};

const updateById = async (ownerId, employeeId, timesheetId, updateData) => {
  return Timesheet.updateById(ownerId, employeeId, timesheetId, updateData);
};

const deleteById = async (ownerId, employeeId, timesheetId) => {
  return Timesheet.deleteById(ownerId, employeeId, timesheetId);
};

module.exports = {
  Timesheet,
  findEmployeeByUserId,
  findEmployee,
  createTimesheet,
  listTimesheets,
  getStatistics,
  findById,
  updateById,
  deleteById,
};
