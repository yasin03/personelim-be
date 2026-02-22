const Leave = require("../../../models/Leave");
const { Employee } = require("../../../models/Employee");

const findEmployeeByUserId = async (userId) => {
  return Employee.findByUserId(userId);
};

const findEmployeeById = async (ownerId, employeeId) => {
  return Employee.findById(ownerId, employeeId);
};

const validateLeaveDates = (startDate, endDate) => {
  return Leave.validateDates(startDate, endDate);
};

const createLeave = async (ownerId, employeeId, leaveData) => {
  return Leave.create(ownerId, employeeId, leaveData);
};

const listLeaves = async (ownerId, employeeId, options) => {
  return Leave.findAllByEmployeeId(ownerId, employeeId, options);
};

const getStatistics = async (ownerId, employeeId, year) => {
  return Leave.getStatistics(ownerId, employeeId, year);
};

const findLeaveById = async (ownerId, employeeId, leaveId) => {
  return Leave.findById(ownerId, employeeId, leaveId);
};

const updateLeaveById = async (ownerId, employeeId, leaveId, updateData) => {
  return Leave.updateById(ownerId, employeeId, leaveId, updateData);
};

const updateStatus = async (
  ownerId,
  employeeId,
  leaveId,
  status,
  approvedBy,
  approvalNote,
) => {
  return Leave.updateStatus(
    ownerId,
    employeeId,
    leaveId,
    status,
    approvedBy,
    approvalNote,
  );
};

const deleteLeaveById = async (ownerId, employeeId, leaveId) => {
  return Leave.deleteById(ownerId, employeeId, leaveId);
};

module.exports = {
  findEmployeeByUserId,
  findEmployeeById,
  validateLeaveDates,
  createLeave,
  listLeaves,
  getStatistics,
  findLeaveById,
  updateLeaveById,
  updateStatus,
  deleteLeaveById,
};
