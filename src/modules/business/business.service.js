const Business = require("../../../models/Business");

const getMyBusiness = async (userId) => {
  const business = await Business.findByOwnerId(userId);
  return business;
};

const updateMyBusiness = async (userId, updateData) => {
  const business = await Business.findByOwnerId(userId);
  if (!business) return null;

  const updatedBusiness = await Business.updateById(business.id, updateData);
  return updatedBusiness;
};

const getBusinessById = async (businessId) => {
  const business = await Business.findById(businessId);
  return business;
};

module.exports = {
  getMyBusiness,
  updateMyBusiness,
  getBusinessById,
};
