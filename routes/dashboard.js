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

// GET /dashboard/pending-requests - Get pending requests summary (Owner/Manager only)
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

      // Get all employees
      const employeesResult = await Employee.findAllByUserId(ownerUserId);
      const employees = Array.isArray(employeesResult)
        ? employeesResult
        : employeesResult.employees || [];

      if (!Array.isArray(employees) || employees.length === 0) {
        return res.status(200).json({
          message: "Pending requests summary retrieved successfully",
          data: {
            total: 0,
            leaves: {
              count: 0,
              recent: [],
            },
            timesheets: {
              count: 0,
              recent: [],
            },
            advances: {
              count: 0,
              recent: [],
            },
            lastUpdated: new Date().toISOString(),
          },
        });
      }

      // Get pending counts and recent items in parallel
      const [pendingLeaves, pendingTimesheets, pendingAdvances] =
        await Promise.all([
          // Get pending leaves
          (async () => {
            try {
              const allPending = await Leave.findAllPendingByOwner(ownerUserId);
              // Filter expired leaves
              const filtered = Leave.filterExpiredLeaves(allPending, false);
              // Get recent 5
              const recent = filtered
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 5);
              return {
                count: filtered.length,
                recent: recent.map((leave) => ({
                  id: leave.id,
                  employeeId: leave.employeeId,
                  type: leave.type,
                  startDate: leave.startDate,
                  endDate: leave.endDate,
                  createdAt: leave.createdAt,
                })),
              };
            } catch (error) {
              console.error("Error getting pending leaves:", error);
              return { count: 0, recent: [] };
            }
          })(),

          // Get pending timesheets
          (async () => {
            try {
              const allPending = [];
              const timesheetPromises = employees.map(async (employee) => {
                try {
                  const result = await Timesheet.findAllByEmployeeId(
                    ownerUserId,
                    employee.id,
                    { approvalStatus: "pending" }
                  );
                  const timesheets = Array.isArray(result)
                    ? result
                    : result.timesheets || [];
                  return timesheets.map((ts) => ({
                    ...ts,
                    employeeId: employee.id,
                  }));
                  const timesheets = Array.isArray(result)
                    ? result
                    : result.timesheets || [];
                  return timesheets.map((ts) => ({
                    ...ts,
                    employeeId: employee.id,
                  }));
                } catch (error) {
                  console.error(
                    `Error getting timesheets for employee ${employee.id}:`,
                    error
                  );
                  return [];
                }
              });

              const allTimesheetsArrays = await Promise.all(timesheetPromises);
              allPending.push(...allTimesheetsArrays.flat());

              // Get recent 5
              const recent = allPending
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 5)
                .map((ts) => ({
                  id: ts.id,
                  employeeId: ts.employeeId,
                  date: ts.date,
                  status: ts.status,
                  createdAt: ts.createdAt,
                }));

              return {
                count: allPending.length,
                recent,
              };
            } catch (error) {
              console.error("Error getting pending timesheets:", error);
              return { count: 0, recent: [] };
            }
          })(),

          // Get pending advance requests
          (async () => {
            try {
              const allPending = [];
              const advancePromises = employees.map(async (employee) => {
                try {
                  const result = await AdvanceRequest.findAllByEmployeeId(
                    ownerUserId,
                    employee.id,
                    { status: "pending" }
                  );
                  const advances = Array.isArray(result)
                    ? result
                    : result.advances || [];
                  return advances.map((adv) => ({
                    ...adv,
                    employeeId: employee.id,
                  }));
                } catch (error) {
                  console.error(
                    `Error getting advances for employee ${employee.id}:`,
                    error
                  );
                  return [];
                }
              });

              const allAdvancesArrays = await Promise.all(advancePromises);
              allPending.push(...allAdvancesArrays.flat());

              // Get recent 5
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
              console.error("Error getting pending advances:", error);
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
      console.error("Error getting pending requests summary:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message || "Failed to get pending requests summary",
      });
    }
  }
);

module.exports = router;

