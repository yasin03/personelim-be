const businessService = require("./business.service");
const Business = require("../../../models/Business");

const getMyBusiness = async (req, res) => {
  try {
    const userId = req.user.uid;

    const business = await businessService.getMyBusiness(userId);

    if (!business) {
      return res.status(404).json({
        error: "Business not found",
        message: "No business found for this user",
      });
    }

    return res.status(200).json({
      message: "Business retrieved successfully",
      data: Business.sanitize(business),
    });
  } catch (error) {
    console.error("Get business error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to retrieve business information",
    });
  }
};

const updateMyBusiness = async (req, res) => {
  try {
    const userId = req.user.uid;
    const updateData = req.body;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: "No update data provided",
        message: "Please provide data to update",
      });
    }

    const updatedBusiness = await businessService.updateMyBusiness(
      userId,
      updateData,
    );

    if (!updatedBusiness) {
      return res.status(404).json({
        error: "Business not found",
        message: "No business found for this user",
      });
    }

    return res.status(200).json({
      message: "Business updated successfully",
      data: Business.sanitize(updatedBusiness),
    });
  } catch (error) {
    console.error("Update business error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to update business information",
    });
  }
};

const getBusinessById = async (req, res) => {
  try {
    const { businessId } = req.params;

    const business = await businessService.getBusinessById(businessId);

    if (!business) {
      return res.status(404).json({
        error: "Business not found",
        message: "Business with the specified ID does not exist",
      });
    }

    return res.status(200).json({
      message: "Business retrieved successfully",
      data: Business.sanitize(business),
    });
  } catch (error) {
    console.error("Get business by ID error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to retrieve business information",
    });
  }
};

module.exports = {
  getMyBusiness,
  updateMyBusiness,
  getBusinessById,
};
