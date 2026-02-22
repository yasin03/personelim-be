const SalaryPayment = require("../../../models/SalaryPayment");
const { Employee } = require("../../../models/Employee");

const findEmployeeByUserId = async (userId) => {
  return Employee.findByUserId(userId);
};

const findEmployeeById = async (ownerId, employeeId) => {
  return Employee.findById(ownerId, employeeId);
};

const validatePaymentData = (data) => {
  return SalaryPayment.validatePaymentData(data);
};

const createPayment = async (ownerId, employeeId, paymentData) => {
  return SalaryPayment.create(ownerId, employeeId, paymentData);
};

const listPayments = async (ownerId, employeeId, options) => {
  return SalaryPayment.findAllByEmployeeId(ownerId, employeeId, options);
};

const getStatistics = async (ownerId, employeeId, options) => {
  return SalaryPayment.getStatistics(ownerId, employeeId, options);
};

const findByPayrollId = async (ownerId, employeeId, payrollId) => {
  return SalaryPayment.findByPayrollId(ownerId, employeeId, payrollId);
};

const findPaymentById = async (ownerId, employeeId, paymentId) => {
  return SalaryPayment.findById(ownerId, employeeId, paymentId);
};

const updatePaymentById = async (
  ownerId,
  employeeId,
  paymentId,
  updateData,
) => {
  return SalaryPayment.updateById(ownerId, employeeId, paymentId, updateData);
};

const deletePaymentById = async (ownerId, employeeId, paymentId) => {
  return SalaryPayment.deleteById(ownerId, employeeId, paymentId);
};

module.exports = {
  findEmployeeByUserId,
  findEmployeeById,
  validatePaymentData,
  createPayment,
  listPayments,
  getStatistics,
  findByPayrollId,
  findPaymentById,
  updatePaymentById,
  deletePaymentById,
};
