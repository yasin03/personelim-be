const AdvanceRequest = require("../../../models/AdvanceRequest");
const { Employee } = require("../../../models/Employee");

const findEmployee = async (ownerId, employeeId) => {
  return Employee.findById(ownerId, employeeId);
};

const findAllEmployees = async (ownerId) => {
  return Employee.findAll(ownerId);
};

const createAdvance = async (ownerId, employeeId, data) => {
  return AdvanceRequest.create(ownerId, employeeId, data);
};

const findAdvancesByEmployee = async (ownerId, employeeId, options) => {
  return AdvanceRequest.findAllByEmployeeId(ownerId, employeeId, options);
};

const findAdvanceById = async (ownerId, employeeId, advanceId) => {
  return AdvanceRequest.findById(ownerId, employeeId, advanceId);
};

const updateAdvanceById = async (
  ownerId,
  employeeId,
  advanceId,
  updateData,
) => {
  return AdvanceRequest.updateById(ownerId, employeeId, advanceId, updateData);
};

const updateAdvanceStatus = async (
  ownerId,
  employeeId,
  advanceId,
  status,
  performedBy,
  approvalNote,
) => {
  return AdvanceRequest.updateStatus(
    ownerId,
    employeeId,
    advanceId,
    status,
    performedBy,
    approvalNote,
  );
};

const deleteAdvanceById = async (ownerId, employeeId, advanceId) => {
  return AdvanceRequest.deleteById(ownerId, employeeId, advanceId);
};

const getStatistics = async (ownerId, employeeId, year) => {
  return AdvanceRequest.getStatistics(ownerId, employeeId, year);
};

module.exports = {
  findEmployee,
  findAllEmployees,
  createAdvance,
  findAdvancesByEmployee,
  findAdvanceById,
  updateAdvanceById,
  updateAdvanceStatus,
  deleteAdvanceById,
  getStatistics,
};
