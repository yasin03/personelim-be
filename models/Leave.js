const { db, COLLECTIONS } = require("../config/firebase");

class Leave {
  constructor(data) {
    this.employeeId = data.employeeId; // Hangi personele ait
    this.type = data.type; // "günlük", "yıllık", "mazeret"
    this.startDate = data.startDate; // İzin başlangıç tarihi (YYYY-MM-DD)
    this.endDate = data.endDate; // İzin bitiş tarihi (YYYY-MM-DD)
    this.reason = data.reason || null; // Açıklama
    this.status = data.status || "pending"; // "pending", "approved", "rejected"
    this.approved = data.approved || false; // Backward compatibility
    this.approvedBy = data.approvedBy || null; // Who approved/rejected
    this.approvedAt = data.approvedAt || null; // When approved/rejected
    this.approvalNote = data.approvalNote || null; // Approval/rejection note
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  // Get leaves collection reference for an employee
  static getLeavesCollection(userId, employeeId) {
    return db
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .collection("employees")
      .doc(employeeId)
      .collection("leaves");
  }

  // Create new leave
  static async create(userId, employeeId, leaveData) {
    try {
      const leave = new Leave({
        ...leaveData,
        employeeId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const leaveRef = await this.getLeavesCollection(userId, employeeId).add({
        employeeId: leave.employeeId,
        type: leave.type,
        startDate: leave.startDate,
        endDate: leave.endDate,
        reason: leave.reason,
        status: leave.status,
        approved: leave.approved,
        approvedBy: leave.approvedBy,
        approvedAt: leave.approvedAt,
        approvalNote: leave.approvalNote,
        createdAt: leave.createdAt,
        updatedAt: leave.updatedAt,
      });

      return {
        id: leaveRef.id,
        ...leave,
      };
    } catch (error) {
      throw new Error(`Failed to create leave: ${error.message}`);
    }
  }

  // Get leave by ID
  static async findById(userId, employeeId, leaveId) {
    try {
      const leaveDoc = await this.getLeavesCollection(userId, employeeId)
        .doc(leaveId)
        .get();

      if (!leaveDoc.exists) {
        return null;
      }

      return {
        id: leaveDoc.id,
        ...leaveDoc.data(),
      };
    } catch (error) {
      throw new Error(`Failed to find leave by ID: ${error.message}`);
    }
  }

  // Get all leaves for an employee
  static async findAllByEmployeeId(userId, employeeId, options = {}) {
    try {
      let query = this.getLeavesCollection(userId, employeeId);

      // Filter by approval status if specified (backward compatibility)
      if (options.approved !== undefined) {
        query = query.where("approved", "==", options.approved);
      }

      // Filter by status if specified
      if (options.status) {
        query = query.where("status", "==", options.status);
      }

      // Filter by leave type if specified
      if (options.type) {
        query = query.where("type", "==", options.type);
      }

      // Order by creation date
      query = query.orderBy("createdAt", "desc");

      const leavesSnapshot = await query.get();
      const leaves = [];

      leavesSnapshot.forEach((doc) => {
        leaves.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      // Apply pagination if needed
      if (options.page && options.limit) {
        const startIndex = (options.page - 1) * options.limit;
        const endIndex = startIndex + options.limit;
        return {
          leaves: leaves.slice(startIndex, endIndex),
          total: leaves.length,
          page: options.page,
          limit: options.limit,
          totalPages: Math.ceil(leaves.length / options.limit),
        };
      }

      return {
        leaves,
        total: leaves.length,
        page: 1,
        limit: leaves.length,
        totalPages: 1,
      };
    } catch (error) {
      throw new Error(`Failed to get leaves: ${error.message}`);
    }
  }

  // Update leave
  static async updateById(userId, employeeId, leaveId, updateData) {
    try {
      const leaveDoc = await this.getLeavesCollection(userId, employeeId)
        .doc(leaveId)
        .get();

      if (!leaveDoc.exists) {
        return null;
      }

      const updateFields = {
        ...updateData,
        updatedAt: new Date().toISOString(),
      };

      await this.getLeavesCollection(userId, employeeId)
        .doc(leaveId)
        .update(updateFields);

      // Return updated leave data
      const updatedDoc = await this.getLeavesCollection(userId, employeeId)
        .doc(leaveId)
        .get();

      return {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      };
    } catch (error) {
      throw new Error(`Failed to update leave: ${error.message}`);
    }
  }

  // Approve or reject leave
  static async updateStatus(
    userId,
    employeeId,
    leaveId,
    status,
    approvedBy,
    approvalNote = null
  ) {
    try {
      const leaveDoc = await this.getLeavesCollection(userId, employeeId)
        .doc(leaveId)
        .get();

      if (!leaveDoc.exists) {
        return null;
      }

      const updateFields = {
        status,
        approved: status === "approved",
        approvedBy,
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (approvalNote) {
        updateFields.approvalNote = approvalNote;
      }

      await this.getLeavesCollection(userId, employeeId)
        .doc(leaveId)
        .update(updateFields);

      return {
        id: leaveDoc.id,
        ...leaveDoc.data(),
        ...updateFields,
      };
    } catch (error) {
      throw new Error(`Failed to update leave status: ${error.message}`);
    }
  }

  // Approve leave (deprecated, use updateStatus instead)
  static async approveById(userId, employeeId, leaveId) {
    try {
      const leaveDoc = await this.getLeavesCollection(userId, employeeId)
        .doc(leaveId)
        .get();

      if (!leaveDoc.exists) {
        return null;
      }

      const approvedAt = new Date().toISOString();
      await this.getLeavesCollection(userId, employeeId).doc(leaveId).update({
        status: "approved",
        approved: true,
        approvedAt: approvedAt,
        updatedAt: approvedAt,
      });

      return {
        id: leaveDoc.id,
        ...leaveDoc.data(),
        status: "approved",
        approved: true,
        approvedAt: approvedAt,
        updatedAt: approvedAt,
      };
    } catch (error) {
      throw new Error(`Failed to approve leave: ${error.message}`);
    }
  }

  // Delete leave
  static async deleteById(userId, employeeId, leaveId) {
    try {
      const leaveDoc = await this.getLeavesCollection(userId, employeeId)
        .doc(leaveId)
        .get();

      if (!leaveDoc.exists) {
        return null;
      }

      await this.getLeavesCollection(userId, employeeId).doc(leaveId).delete();

      return {
        id: leaveDoc.id,
        ...leaveDoc.data(),
      };
    } catch (error) {
      throw new Error(`Failed to delete leave: ${error.message}`);
    }
  }

  // Get leave statistics for an employee
  static async getStatistics(
    userId,
    employeeId,
    year = new Date().getFullYear()
  ) {
    try {
      const startOfYear = `${year}-01-01`;
      const endOfYear = `${year}-12-31`;

      const leavesSnapshot = await this.getLeavesCollection(userId, employeeId)
        .where("startDate", ">=", startOfYear)
        .where("startDate", "<=", endOfYear)
        .get();

      const stats = {
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        byType: {
          günlük: 0,
          yıllık: 0,
          mazeret: 0,
        },
        byStatus: {
          pending: 0,
          approved: 0,
          rejected: 0,
        },
        totalDays: 0,
        approvedDays: 0,
      };

      leavesSnapshot.forEach((doc) => {
        const leave = doc.data();
        stats.total++;

        // Count by status (new way)
        if (leave.status) {
          if (stats.byStatus[leave.status] !== undefined) {
            stats.byStatus[leave.status]++;
          }

          if (leave.status === "approved") {
            stats.approved++;
          } else if (leave.status === "pending") {
            stats.pending++;
          } else if (leave.status === "rejected") {
            stats.rejected++;
          }
        } else {
          // Backward compatibility with old approved field
          if (leave.approved) {
            stats.approved++;
            stats.byStatus.approved++;
          } else {
            stats.pending++;
            stats.byStatus.pending++;
          }
        }

        // Count by type
        if (stats.byType[leave.type] !== undefined) {
          stats.byType[leave.type]++;
        }

        // Calculate days
        const startDate = new Date(leave.startDate);
        const endDate = new Date(leave.endDate);
        const days =
          Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

        stats.totalDays += days;
        if (leave.status === "approved" || leave.approved) {
          stats.approvedDays += days;
        }
      });

      return stats;
    } catch (error) {
      throw new Error(`Failed to get leave statistics: ${error.message}`);
    }
  }

  // Calculate leave days between two dates
  static calculateLeaveDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  }

  // Validate leave dates
  static validateDates(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      throw new Error("Start date cannot be in the past");
    }

    if (end < start) {
      throw new Error("End date cannot be before start date");
    }

    return true;
  }
}

module.exports = Leave;
