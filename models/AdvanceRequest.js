const { db, COLLECTIONS } = require("../src/config/firebase");

class AdvanceRequest {
  constructor(data) {
    this.employeeId = data.employeeId; // Hangi personele ait
    this.amount = data.amount; // Avans miktarı
    this.reason = data.reason || null; // Açıklama
    this.status = data.status || "pending"; // "pending", "approved", "rejected"
    this.requestDate = data.requestDate || new Date().toISOString(); // Talep tarihi
    this.responseDate = data.responseDate || null; // Yanıt tarihi
    this.approvedBy = data.approvedBy || null; // Kim onayladı/reddetti
    this.approvalNote = data.approvalNote || null; // Onay/red notu
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  // Get advance requests collection reference for an employee
  static getAdvanceRequestsCollection(userId, employeeId) {
    return db
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .collection("employees")
      .doc(employeeId)
      .collection("advances");
  }

  // Create new advance request
  static async create(userId, employeeId, advanceData) {
    try {
      const advanceRequest = new AdvanceRequest({
        ...advanceData,
        employeeId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const advanceRef = await this.getAdvanceRequestsCollection(
        userId,
        employeeId,
      ).add({
        employeeId: advanceRequest.employeeId,
        amount: advanceRequest.amount,
        reason: advanceRequest.reason,
        status: advanceRequest.status,
        requestDate: advanceRequest.requestDate,
        responseDate: advanceRequest.responseDate,
        approvedBy: advanceRequest.approvedBy,
        approvalNote: advanceRequest.approvalNote,
        createdAt: advanceRequest.createdAt,
        updatedAt: advanceRequest.updatedAt,
      });

      return {
        id: advanceRef.id,
        ...advanceRequest,
      };
    } catch (error) {
      throw new Error(`Failed to create advance request: ${error.message}`);
    }
  }

  // Get advance request by ID
  static async findById(userId, employeeId, advanceId) {
    try {
      const advanceDoc = await this.getAdvanceRequestsCollection(
        userId,
        employeeId,
      )
        .doc(advanceId)
        .get();

      if (!advanceDoc.exists) {
        return null;
      }

      return {
        id: advanceDoc.id,
        ...advanceDoc.data(),
      };
    } catch (error) {
      throw new Error(`Failed to find advance request by ID: ${error.message}`);
    }
  }

  // Get all advance requests for an employee
  static async findAllByEmployeeId(userId, employeeId, options = {}) {
    try {
      let query = this.getAdvanceRequestsCollection(userId, employeeId);

      // Filter by status if specified
      if (options.status) {
        query = query.where("status", "==", options.status);
      }

      // Order by creation date
      query = query.orderBy("createdAt", "desc");

      const advancesSnapshot = await query.get();
      const advances = [];

      advancesSnapshot.forEach((doc) => {
        advances.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      // Apply pagination if needed
      if (options.page && options.limit) {
        const startIndex = (options.page - 1) * options.limit;
        const endIndex = startIndex + options.limit;
        return {
          advances: advances.slice(startIndex, endIndex),
          total: advances.length,
          page: options.page,
          limit: options.limit,
          totalPages: Math.ceil(advances.length / options.limit),
        };
      }

      return {
        advances,
        total: advances.length,
        page: 1,
        limit: advances.length,
        totalPages: 1,
      };
    } catch (error) {
      throw new Error(`Failed to get advance requests: ${error.message}`);
    }
  }

  // Update advance request
  static async updateById(userId, employeeId, advanceId, updateData) {
    try {
      const advanceDoc = await this.getAdvanceRequestsCollection(
        userId,
        employeeId,
      )
        .doc(advanceId)
        .get();

      if (!advanceDoc.exists) {
        return null;
      }

      const updateFields = {
        ...updateData,
        updatedAt: new Date().toISOString(),
      };

      await this.getAdvanceRequestsCollection(userId, employeeId)
        .doc(advanceId)
        .update(updateFields);

      // Return updated advance request data
      const updatedDoc = await this.getAdvanceRequestsCollection(
        userId,
        employeeId,
      )
        .doc(advanceId)
        .get();

      return {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      };
    } catch (error) {
      throw new Error(`Failed to update advance request: ${error.message}`);
    }
  }

  // Approve or reject advance request
  static async updateStatus(
    userId,
    employeeId,
    advanceId,
    status,
    approvedBy,
    approvalNote = null,
  ) {
    try {
      const advanceDoc = await this.getAdvanceRequestsCollection(
        userId,
        employeeId,
      )
        .doc(advanceId)
        .get();

      if (!advanceDoc.exists) {
        return null;
      }

      const updateFields = {
        status,
        approvedBy,
        responseDate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (approvalNote) {
        updateFields.approvalNote = approvalNote;
      }

      await this.getAdvanceRequestsCollection(userId, employeeId)
        .doc(advanceId)
        .update(updateFields);

      return {
        id: advanceDoc.id,
        ...advanceDoc.data(),
        ...updateFields,
      };
    } catch (error) {
      throw new Error(
        `Failed to update advance request status: ${error.message}`,
      );
    }
  }

  // Delete advance request
  static async deleteById(userId, employeeId, advanceId) {
    try {
      const advanceDoc = await this.getAdvanceRequestsCollection(
        userId,
        employeeId,
      )
        .doc(advanceId)
        .get();

      if (!advanceDoc.exists) {
        return null;
      }

      await this.getAdvanceRequestsCollection(userId, employeeId)
        .doc(advanceId)
        .delete();

      return {
        id: advanceDoc.id,
        ...advanceDoc.data(),
      };
    } catch (error) {
      throw new Error(`Failed to delete advance request: ${error.message}`);
    }
  }

  // Get advance request statistics for an employee
  static async getStatistics(
    userId,
    employeeId,
    year = new Date().getFullYear(),
  ) {
    try {
      const startOfYear = `${year}-01-01`;
      const endOfYear = `${year}-12-31`;

      const advancesSnapshot = await this.getAdvanceRequestsCollection(
        userId,
        employeeId,
      )
        .where("requestDate", ">=", startOfYear)
        .where("requestDate", "<=", endOfYear)
        .get();

      const stats = {
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        byStatus: {
          pending: 0,
          approved: 0,
          rejected: 0,
        },
        totalAmount: 0,
        approvedAmount: 0,
        pendingAmount: 0,
        rejectedAmount: 0,
      };

      advancesSnapshot.forEach((doc) => {
        const advance = doc.data();
        stats.total++;

        // Count by status
        if (stats.byStatus[advance.status] !== undefined) {
          stats.byStatus[advance.status]++;
        }

        if (advance.status === "approved") {
          stats.approved++;
          stats.approvedAmount += parseFloat(advance.amount) || 0;
        } else if (advance.status === "pending") {
          stats.pending++;
          stats.pendingAmount += parseFloat(advance.amount) || 0;
        } else if (advance.status === "rejected") {
          stats.rejected++;
          stats.rejectedAmount += parseFloat(advance.amount) || 0;
        }

        stats.totalAmount += parseFloat(advance.amount) || 0;
      });

      return stats;
    } catch (error) {
      throw new Error(
        `Failed to get advance request statistics: ${error.message}`,
      );
    }
  }

  // Validate advance request data
  static validateAdvanceData(amount, reason) {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      throw new Error("Amount must be a positive number");
    }

    if (!reason || reason.trim().length === 0) {
      throw new Error("Reason is required");
    }

    return true;
  }
}

module.exports = AdvanceRequest;
