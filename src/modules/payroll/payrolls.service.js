const Payroll = require("../../../models/Payroll");
const { Employee } = require("../../../models/Employee");

const findEmployeeByUserId = async (userId) => {
  return Employee.findByUserId(userId);
};

const findEmployeeById = async (ownerId, employeeId) => {
  return Employee.findById(ownerId, employeeId);
};

const validatePayrollData = (data) => {
  return Payroll.validatePayrollData(data);
};

const createPayroll = async (ownerId, employeeId, payrollData) => {
  return Payroll.create(ownerId, employeeId, payrollData);
};

const listPayrolls = async (ownerId, employeeId, options) => {
  return Payroll.findAllByEmployeeId(ownerId, employeeId, options);
};

const getStatistics = async (ownerId, employeeId, options) => {
  return Payroll.getStatistics(ownerId, employeeId, options);
};

const findById = async (ownerId, employeeId, payrollId) => {
  return Payroll.findById(ownerId, employeeId, payrollId);
};

const updateById = async (ownerId, employeeId, payrollId, updateData) => {
  return Payroll.updateById(ownerId, employeeId, payrollId, updateData);
};

const markAsPaid = async (ownerId, employeeId, payrollId) => {
  return Payroll.markAsPaid(ownerId, employeeId, payrollId);
};

const deleteById = async (ownerId, employeeId, payrollId) => {
  return Payroll.deleteById(ownerId, employeeId, payrollId);
};

module.exports = {
  findEmployeeByUserId,
  findEmployeeById,
  validatePayrollData,
  createPayroll,
  listPayrolls,
  getStatistics,
  findById,
  updateById,
  markAsPaid,
  deleteById,
};
