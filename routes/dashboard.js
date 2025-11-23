const express = require("express");
const { authenticateToken, isManagerOrOwner } = require("../middleware/auth");
const Leave = require("../models/Leave");
const Timesheet = require("../models/Timesheet");
const AdvanceRequest = require("../models/AdvanceRequest");
const { Employee } = require("../models/Employee");
const Business = require("../models/Business");

const router = express.Router();

// Helper function to resolve owner user ID
const resolveOwnerUserId = async (req) => {
  if (req.user.role === "manager") {
    const businessId = req.user.userData?.businessId;
    if (!businessId) {
      return {
        error: {
          status: 403,
          message: "Associated business not found for manager user",
        },
      };
    }
    const business = await Business.findById(businessId);
    if (!business || !business.ownerId) {
      return {
        error: {
          status: 404,
          message: "Business owner could not be determined",
        },
      };
    }
    return { ownerUserId: business.ownerId };
  }
  return { ownerUserId: req.user.uid };
};

// Helper function to get employee map for quick lookup
const getEmployeeMap = async (ownerUserId) => {
  const employeesResult = await Employee.findAllByUserId(ownerUserId);
  const employees = Array.isArray(employeesResult)
    ? employeesResult
    : employeesResult.employees || [];

  const employeeMap = new Map();
  employees.forEach((emp) => {
    employeeMap.set(emp.id, {
      id: emp.id,
      firstName: emp.firstName || "",
      lastName: emp.lastName || "",
      name: `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Unknown",
      email: emp.email || null,
      department: emp.department || null,
      position: emp.position || null,
    });
  });

  return { employees, employeeMap };
};

// GET /dashboard/pending-requests - Get pending requests summary (Owner/Manager only)
// This endpoint collects all pending requests (leaves, timesheets, advances) that need approval
router.get(
  "/pending-requests",
  authenticateToken,
  isManagerOrOwner,
  async (req, res) => {
    try {
      const ownerContext = await resolveOwnerUserId(req);
      if (ownerContext.error) {
        return res.status(ownerContext.error.status).json({
          error: ownerContext.error.status === 403 ? "Forbidden" : "Not Found",
          message: ownerContext.error.message,
        });
      }

      const { ownerUserId } = ownerContext;

      // Get employees and create map for quick lookup
      const { employees, employeeMap } = await getEmployeeMap(ownerUserId);

      if (!Array.isArray(employees) || employees.length === 0) {
        return res.status(200).json({
          message: "Pending requests summary retrieved successfully",
          data: {
            total: 0,
            leaves: { count: 0, recent: [] },
            timesheets: { count: 0, recent: [] },
            advances: { count: 0, recent: [] },
            lastUpdated: new Date().toISOString(),
          },
        });
      }

      // Get all pending requests in parallel (optimized)
      const [pendingLeaves, pendingTimesheets, pendingAdvances] =
        await Promise.all([
          // Get pending leaves
          (async () => {
            try {
              const allPending = await Leave.findAllPendingByOwner(ownerUserId);
              
              // Don't filter expired in dashboard - show all pending for notification purposes
              const filtered = allPending;
              
              // Get recent 5 (most recent first)
              const recent = filtered
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 5)
                .map((leave) => ({
                  id: leave.id,
                  employeeId: leave.employeeId,
                  type: leave.type,
                  startDate: leave.startDate,
                  endDate: leave.endDate,
                  reason: leave.reason,
                  createdAt: leave.createdAt,
                }));

              return {
                count: filtered.length,
                recent,
              };
            } catch (error) {
              console.error("[Dashboard] Error getting pending leaves:", error);
              return { count: 0, recent: [] };
            }
          })(),

          // Get pending timesheets
          (async () => {
            try {
              const allPending = await Timesheet.findAllPendingByOwner(ownerUserId);
              
              // Get recent 5 (most recent first)
              const recent = allPending
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 5)
                .map((ts) => ({
                  id: ts.id,
                  employeeId: ts.employeeId,
                  date: ts.date,
                  status: ts.status,
                  totalHoursWorked: ts.totalHoursWorked,
                  overtimeHours: ts.overtimeHours,
                  createdAt: ts.createdAt,
                }));

              return {
                count: allPending.length,
                recent,
              };
            } catch (error) {
              console.error("[Dashboard] Error getting pending timesheets:", error);
              return { count: 0, recent: [] };
            }
          })(),

          // Get pending advance requests
          (async () => {
            try {
              const allPending = await AdvanceRequest.findAllPendingByOwner(ownerUserId);
              
              // Get recent 5 (most recent first)
              const recent = allPending
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 5)
                .map((adv) => ({
                  id: adv.id,
                  employeeId: adv.employeeId,
                  amount: adv.amount,
                  reason: adv.reason,
                  createdAt: adv.createdAt,
                }));

              return {
                count: allPending.length,
                recent,
              };
            } catch (error) {
              console.error("[Dashboard] Error getting pending advances:", error);
              return { count: 0, recent: [] };
            }
          })(),
        ]);

      const total =
        pendingLeaves.count +
        pendingTimesheets.count +
        pendingAdvances.count;

      res.status(200).json({
        message: "Pending requests summary retrieved successfully",
        data: {
          total,
          leaves: pendingLeaves,
          timesheets: pendingTimesheets,
          advances: pendingAdvances,
          lastUpdated: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("[Dashboard] Error getting pending requests summary:", error);
      console.error("[Dashboard] Error stack:", error.stack);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message || "Failed to get pending requests summary",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }
);

module.exports = router;
