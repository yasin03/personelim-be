const {
  Employee,
  CONTRACT_TYPES,
  WORK_MODES,
} = require("../../../models/Employee");
const Leave = require("../../../models/Leave");
const AdvanceRequest = require("../../../models/AdvanceRequest");

const findEmployeeByUserId = async (userId) => {
  return Employee.findByUserId(userId);
};

const findEmployeeById = async (ownerId, employeeId, options) => {
  return Employee.findById(ownerId, employeeId, options);
};

const createEmployee = async (ownerId, employeeData) => {
  return Employee.create(ownerId, employeeData);
};

const updateEmployeeById = async (ownerId, employeeId, updateData) => {
  return Employee.updateById(ownerId, employeeId, updateData);
};

const deleteEmployeeById = async (ownerId, employeeId) => {
  return Employee.deleteById(ownerId, employeeId);
};

const restoreEmployeeById = async (ownerId, employeeId) => {
  return Employee.restoreById(ownerId, employeeId);
};

const listEmployees = async (ownerId, options) => {
  return Employee.findAllByUserId(ownerId, options);
};

const listEmployeesByDepartment = async (ownerId, department, options) => {
  return Employee.findByDepartment(ownerId, department, options);
};

const searchEmployees = async (ownerId, search, options) => {
  return Employee.search(ownerId, search, options);
};

const sanitizeEmployee = (employee) => {
  return Employee.sanitize(employee);
};

const validateLeaveDates = (startDate, endDate) => {
  return Leave.validateDates(startDate, endDate);
};

const listLeavesByEmployeeId = async (ownerId, employeeId, options) => {
  return Leave.findAllByEmployeeId(ownerId, employeeId, options);
};

const createLeave = async (ownerId, employeeId, leaveData) => {
  return Leave.create(ownerId, employeeId, leaveData);
};

const listAdvanceRequestsByEmployeeId = async (
  ownerId,
  employeeId,
  options,
) => {
  return AdvanceRequest.findAllByEmployeeId(ownerId, employeeId, options);
};

const validateAdvanceData = (amount, reason) => {
  return AdvanceRequest.validateAdvanceData(amount, reason);
};

const createAdvanceRequest = async (ownerId, employeeId, data) => {
  return AdvanceRequest.create(ownerId, employeeId, data);
};

module.exports = {
  Employee,
  CONTRACT_TYPES,
  WORK_MODES,
  findEmployeeByUserId,
  findEmployeeById,
  createEmployee,
  updateEmployeeById,
  deleteEmployeeById,
  restoreEmployeeById,
  listEmployees,
  listEmployeesByDepartment,
  searchEmployees,
  sanitizeEmployee,
  validateLeaveDates,
  listLeavesByEmployeeId,
  createLeave,
  listAdvanceRequestsByEmployeeId,
  validateAdvanceData,
  createAdvanceRequest,
};
