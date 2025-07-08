const { db, COLLECTIONS } = require("../config/firebase");

class Payroll {
  constructor(data) {
    this.employeeId = data.employeeId;
    this.userId = data.userId;
    this.periodMonth = data.periodMonth; // "07"
    this.periodYear = data.periodYear; // "2025"
    this.grossSalary = data.grossSalary;
    this.netSalary = data.netSalary;
    this.totalDeductions = data.totalDeductions;
    this.insurancePremiumEmployeeShare = data.insurancePremiumEmployeeShare;
    this.insurancePremiumEmployerShare = data.insurancePremiumEmployerShare;
    this.taxDeduction = data.taxDeduction;
    this.otherAdditions = data.otherAdditions || 0;
    this.currency = data.currency || "TL";
    this.payrollDate = data.payrollDate || new Date().toISOString();
    this.status = data.status || "Beklemede"; // "Ödendi", "Beklemede"
    this.paymentDate = data.paymentDate || null;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  // Get payrolls collection reference for an employee
  static getPayrollsCollection(userId, employeeId) {
    return db
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .collection("employees")
      .doc(employeeId)
      .collection("payrolls");
  }

  // Create new payroll
  static async create(userId, employeeId, payrollData) {
    try {
      // Check if payroll already exists for this period
      const existingPayroll = await this.findByPeriod(
        userId,
        employeeId,
        payrollData.periodMonth,
        payrollData.periodYear
      );

      if (existingPayroll) {
        throw new Error(
          `Payroll already exists for ${payrollData.periodMonth}/${payrollData.periodYear}`
        );
      }

      const payroll = new Payroll({
        ...payrollData,
        employeeId,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Calculate net salary if not provided
      if (!payroll.netSalary) {
        payroll.netSalary = this.calculateNetSalary(payroll);
      }

      const payrollRef = await this.getPayrollsCollection(
        userId,
        employeeId
      ).add({
        employeeId: payroll.employeeId,
        userId: payroll.userId,
        periodMonth: payroll.periodMonth,
        periodYear: payroll.periodYear,
        grossSalary: payroll.grossSalary,
        netSalary: payroll.netSalary,
        totalDeductions: payroll.totalDeductions,
        insurancePremiumEmployeeShare: payroll.insurancePremiumEmployeeShare,
        insurancePremiumEmployerShare: payroll.insurancePremiumEmployerShare,
        taxDeduction: payroll.taxDeduction,
        otherAdditions: payroll.otherAdditions,
        currency: payroll.currency,
        payrollDate: payroll.payrollDate,
        status: payroll.status,
        paymentDate: payroll.paymentDate,
        createdAt: payroll.createdAt,
        updatedAt: payroll.updatedAt,
      });

      return {
        id: payrollRef.id,
        ...payroll,
      };
    } catch (error) {
      throw new Error(`Failed to create payroll: ${error.message}`);
    }
  }

  // Get payroll by ID
  static async findById(userId, employeeId, payrollId) {
    try {
      const payrollDoc = await this.getPayrollsCollection(userId, employeeId)
        .doc(payrollId)
        .get();

      if (!payrollDoc.exists) {
        return null;
      }

      return {
        id: payrollDoc.id,
        ...payrollDoc.data(),
      };
    } catch (error) {
      throw new Error(`Failed to find payroll by ID: ${error.message}`);
    }
  }

  // Get payroll by period
  static async findByPeriod(userId, employeeId, month, year) {
    try {
      const payrollsSnapshot = await this.getPayrollsCollection(
        userId,
        employeeId
      )
        .where("periodMonth", "==", month)
        .where("periodYear", "==", year)
        .get();

      if (payrollsSnapshot.empty) {
        return null;
      }

      const doc = payrollsSnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      };
    } catch (error) {
      throw new Error(`Failed to find payroll by period: ${error.message}`);
    }
  }

  // Get all payrolls for an employee
  static async findAllByEmployeeId(userId, employeeId, options = {}) {
    try {
      let query = this.getPayrollsCollection(userId, employeeId);

      // Filter by year if specified
      if (options.year) {
        query = query.where("periodYear", "==", options.year);
      }

      // Filter by status if specified
      if (options.status) {
        query = query.where("status", "==", options.status);
      }

      // Order by period (newest first)
      query = query
        .orderBy("periodYear", "desc")
        .orderBy("periodMonth", "desc");

      const payrollsSnapshot = await query.get();
      const payrolls = [];

      payrollsSnapshot.forEach((doc) => {
        payrolls.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      // Apply pagination if needed
      if (options.page && options.limit) {
        const startIndex = (options.page - 1) * options.limit;
        const endIndex = startIndex + options.limit;
        return {
          payrolls: payrolls.slice(startIndex, endIndex),
          total: payrolls.length,
          page: options.page,
          limit: options.limit,
          totalPages: Math.ceil(payrolls.length / options.limit),
        };
      }

      return {
        payrolls,
        total: payrolls.length,
        page: 1,
        limit: payrolls.length,
        totalPages: 1,
      };
    } catch (error) {
      throw new Error(`Failed to get payrolls: ${error.message}`);
    }
  }

  // Update payroll
  static async updateById(userId, employeeId, payrollId, updateData) {
    try {
      const payrollDoc = await this.getPayrollsCollection(userId, employeeId)
        .doc(payrollId)
        .get();

      if (!payrollDoc.exists) {
        return null;
      }

      const updateFields = {
        ...updateData,
        updatedAt: new Date().toISOString(),
      };

      // Recalculate net salary if salary components are updated
      if (
        updateFields.grossSalary ||
        updateFields.totalDeductions ||
        updateFields.otherAdditions
      ) {
        const currentData = payrollDoc.data();
        const payrollData = { ...currentData, ...updateFields };
        updateFields.netSalary = this.calculateNetSalary(payrollData);
      }

      await this.getPayrollsCollection(userId, employeeId)
        .doc(payrollId)
        .update(updateFields);

      // Return updated payroll data
      const updatedDoc = await this.getPayrollsCollection(userId, employeeId)
        .doc(payrollId)
        .get();

      return {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      };
    } catch (error) {
      throw new Error(`Failed to update payroll: ${error.message}`);
    }
  }

  // Mark payroll as paid
  static async markAsPaid(userId, employeeId, payrollId) {
    try {
      const payrollDoc = await this.getPayrollsCollection(userId, employeeId)
        .doc(payrollId)
        .get();

      if (!payrollDoc.exists) {
        return null;
      }

      const updateFields = {
        status: "Ödendi",
        paymentDate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.getPayrollsCollection(userId, employeeId)
        .doc(payrollId)
        .update(updateFields);

      return {
        id: payrollDoc.id,
        ...payrollDoc.data(),
        ...updateFields,
      };
    } catch (error) {
      throw new Error(`Failed to mark payroll as paid: ${error.message}`);
    }
  }

  // Delete payroll
  static async deleteById(userId, employeeId, payrollId) {
    try {
      const payrollDoc = await this.getPayrollsCollection(userId, employeeId)
        .doc(payrollId)
        .get();

      if (!payrollDoc.exists) {
        return null;
      }

      await this.getPayrollsCollection(userId, employeeId)
        .doc(payrollId)
        .delete();

      return {
        id: payrollDoc.id,
        ...payrollDoc.data(),
      };
    } catch (error) {
      throw new Error(`Failed to delete payroll: ${error.message}`);
    }
  }

  // Get payroll statistics
  static async getStatistics(userId, employeeId, options = {}) {
    try {
      const { year = new Date().getFullYear() } = options;

      const payrollsSnapshot = await this.getPayrollsCollection(
        userId,
        employeeId
      )
        .where("periodYear", "==", year)
        .get();

      const stats = {
        totalPayrolls: 0,
        paidPayrolls: 0,
        pendingPayrolls: 0,
        totalGrossSalary: 0,
        totalNetSalary: 0,
        totalDeductions: 0,
        totalTaxDeductions: 0,
        totalInsurancePremiums: 0,
        byStatus: {
          Ödendi: 0,
          Beklemede: 0,
        },
        byMonth: {},
      };

      payrollsSnapshot.forEach((doc) => {
        const payroll = doc.data();
        stats.totalPayrolls++;

        // Count by status
        if (stats.byStatus[payroll.status] !== undefined) {
          stats.byStatus[payroll.status]++;
        }

        if (payroll.status === "Ödendi") {
          stats.paidPayrolls++;
        } else {
          stats.pendingPayrolls++;
        }

        // Calculate totals
        stats.totalGrossSalary += parseFloat(payroll.grossSalary) || 0;
        stats.totalNetSalary += parseFloat(payroll.netSalary) || 0;
        stats.totalDeductions += parseFloat(payroll.totalDeductions) || 0;
        stats.totalTaxDeductions += parseFloat(payroll.taxDeduction) || 0;
        stats.totalInsurancePremiums +=
          parseFloat(payroll.insurancePremiumEmployeeShare) || 0;

        // Group by month
        const monthKey = `${payroll.periodYear}-${payroll.periodMonth}`;
        if (!stats.byMonth[monthKey]) {
          stats.byMonth[monthKey] = {
            grossSalary: 0,
            netSalary: 0,
            status: payroll.status,
          };
        }
        stats.byMonth[monthKey].grossSalary +=
          parseFloat(payroll.grossSalary) || 0;
        stats.byMonth[monthKey].netSalary += parseFloat(payroll.netSalary) || 0;
      });

      return stats;
    } catch (error) {
      throw new Error(`Failed to get payroll statistics: ${error.message}`);
    }
  }

  // Calculate net salary
  static calculateNetSalary(payrollData) {
    const grossSalary = parseFloat(payrollData.grossSalary) || 0;
    const totalDeductions = parseFloat(payrollData.totalDeductions) || 0;
    const otherAdditions = parseFloat(payrollData.otherAdditions) || 0;

    return parseFloat(
      (grossSalary - totalDeductions + otherAdditions).toFixed(2)
    );
  }

  // Validate payroll data
  static validatePayrollData(data) {
    if (!data.periodMonth || !/^(0[1-9]|1[0-2])$/.test(data.periodMonth)) {
      throw new Error("Period month must be in MM format (01-12)");
    }

    if (!data.periodYear || !/^\d{4}$/.test(data.periodYear)) {
      throw new Error("Period year must be in YYYY format");
    }

    if (
      !data.grossSalary ||
      isNaN(data.grossSalary) ||
      parseFloat(data.grossSalary) <= 0
    ) {
      throw new Error("Gross salary must be a positive number");
    }

    const validStatuses = ["Ödendi", "Beklemede"];
    if (data.status && !validStatuses.includes(data.status)) {
      throw new Error(`Status must be one of: ${validStatuses.join(", ")}`);
    }

    return true;
  }
}

module.exports = Payroll;
