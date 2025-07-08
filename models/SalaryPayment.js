const { db, COLLECTIONS } = require("../config/firebase");

class SalaryPayment {
  constructor(data) {
    this.employeeId = data.employeeId;
    this.userId = data.userId;
    this.payrollId = data.payrollId || null;
    this.amount = data.amount;
    this.currency = data.currency || "TL";
    this.paymentDate = data.paymentDate || new Date().toISOString();
    this.paymentMethod = data.paymentMethod || "Banka Havalesi"; // "Nakit" de olabilir
    this.description = data.description || null;
    this.createdAt = data.createdAt || new Date().toISOString();
  }

  // Get salary payments collection reference for an employee
  static getSalaryPaymentsCollection(userId, employeeId) {
    return db
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .collection("employees")
      .doc(employeeId)
      .collection("salaryPayments");
  }

  // Create new salary payment
  static async create(userId, employeeId, paymentData) {
    try {
      const salaryPayment = new SalaryPayment({
        ...paymentData,
        employeeId,
        userId,
        createdAt: new Date().toISOString(),
      });

      const paymentRef = await this.getSalaryPaymentsCollection(
        userId,
        employeeId
      ).add({
        employeeId: salaryPayment.employeeId,
        userId: salaryPayment.userId,
        payrollId: salaryPayment.payrollId,
        amount: salaryPayment.amount,
        currency: salaryPayment.currency,
        paymentDate: salaryPayment.paymentDate,
        paymentMethod: salaryPayment.paymentMethod,
        description: salaryPayment.description,
        createdAt: salaryPayment.createdAt,
      });

      return {
        id: paymentRef.id,
        ...salaryPayment,
      };
    } catch (error) {
      throw new Error(`Failed to create salary payment: ${error.message}`);
    }
  }

  // Get salary payment by ID
  static async findById(userId, employeeId, paymentId) {
    try {
      const paymentDoc = await this.getSalaryPaymentsCollection(
        userId,
        employeeId
      )
        .doc(paymentId)
        .get();

      if (!paymentDoc.exists) {
        return null;
      }

      return {
        id: paymentDoc.id,
        ...paymentDoc.data(),
      };
    } catch (error) {
      throw new Error(`Failed to find salary payment by ID: ${error.message}`);
    }
  }

  // Get all salary payments for an employee
  static async findAllByEmployeeId(userId, employeeId, options = {}) {
    try {
      let query = this.getSalaryPaymentsCollection(userId, employeeId);

      // Filter by payment method if specified
      if (options.paymentMethod) {
        query = query.where("paymentMethod", "==", options.paymentMethod);
      }

      // Filter by date range if specified
      if (options.startDate) {
        query = query.where("paymentDate", ">=", options.startDate);
      }
      if (options.endDate) {
        query = query.where("paymentDate", "<=", options.endDate);
      }

      // Filter by year if specified
      if (options.year) {
        const startOfYear = `${options.year}-01-01T00:00:00.000Z`;
        const endOfYear = `${options.year}-12-31T23:59:59.999Z`;
        query = query
          .where("paymentDate", ">=", startOfYear)
          .where("paymentDate", "<=", endOfYear);
      }

      // Order by payment date (newest first)
      query = query.orderBy("paymentDate", "desc");

      const paymentsSnapshot = await query.get();
      const payments = [];

      paymentsSnapshot.forEach((doc) => {
        payments.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      // Apply pagination if needed
      if (options.page && options.limit) {
        const startIndex = (options.page - 1) * options.limit;
        const endIndex = startIndex + options.limit;
        return {
          payments: payments.slice(startIndex, endIndex),
          total: payments.length,
          page: options.page,
          limit: options.limit,
          totalPages: Math.ceil(payments.length / options.limit),
        };
      }

      return {
        payments,
        total: payments.length,
        page: 1,
        limit: payments.length,
        totalPages: 1,
      };
    } catch (error) {
      throw new Error(`Failed to get salary payments: ${error.message}`);
    }
  }

  // Update salary payment
  static async updateById(userId, employeeId, paymentId, updateData) {
    try {
      const paymentDoc = await this.getSalaryPaymentsCollection(
        userId,
        employeeId
      )
        .doc(paymentId)
        .get();

      if (!paymentDoc.exists) {
        return null;
      }

      await this.getSalaryPaymentsCollection(userId, employeeId)
        .doc(paymentId)
        .update(updateData);

      // Return updated payment data
      const updatedDoc = await this.getSalaryPaymentsCollection(
        userId,
        employeeId
      )
        .doc(paymentId)
        .get();

      return {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      };
    } catch (error) {
      throw new Error(`Failed to update salary payment: ${error.message}`);
    }
  }

  // Delete salary payment
  static async deleteById(userId, employeeId, paymentId) {
    try {
      const paymentDoc = await this.getSalaryPaymentsCollection(
        userId,
        employeeId
      )
        .doc(paymentId)
        .get();

      if (!paymentDoc.exists) {
        return null;
      }

      await this.getSalaryPaymentsCollection(userId, employeeId)
        .doc(paymentId)
        .delete();

      return {
        id: paymentDoc.id,
        ...paymentDoc.data(),
      };
    } catch (error) {
      throw new Error(`Failed to delete salary payment: ${error.message}`);
    }
  }

  // Get salary payment statistics
  static async getStatistics(userId, employeeId, options = {}) {
    try {
      const { year = new Date().getFullYear() } = options;

      const startOfYear = `${year}-01-01T00:00:00.000Z`;
      const endOfYear = `${year}-12-31T23:59:59.999Z`;

      const paymentsSnapshot = await this.getSalaryPaymentsCollection(
        userId,
        employeeId
      )
        .where("paymentDate", ">=", startOfYear)
        .where("paymentDate", "<=", endOfYear)
        .get();

      const stats = {
        totalPayments: 0,
        totalAmount: 0,
        byPaymentMethod: {
          "Banka Havalesi": { count: 0, amount: 0 },
          Nakit: { count: 0, amount: 0 },
        },
        byMonth: {},
        averagePayment: 0,
      };

      paymentsSnapshot.forEach((doc) => {
        const payment = doc.data();
        stats.totalPayments++;

        const amount = parseFloat(payment.amount) || 0;
        stats.totalAmount += amount;

        // Count by payment method
        if (stats.byPaymentMethod[payment.paymentMethod]) {
          stats.byPaymentMethod[payment.paymentMethod].count++;
          stats.byPaymentMethod[payment.paymentMethod].amount += amount;
        }

        // Group by month
        const paymentDate = new Date(payment.paymentDate);
        const monthKey = `${paymentDate.getFullYear()}-${(
          paymentDate.getMonth() + 1
        )
          .toString()
          .padStart(2, "0")}`;

        if (!stats.byMonth[monthKey]) {
          stats.byMonth[monthKey] = { count: 0, amount: 0 };
        }
        stats.byMonth[monthKey].count++;
        stats.byMonth[monthKey].amount += amount;
      });

      // Calculate average payment
      stats.averagePayment =
        stats.totalPayments > 0
          ? parseFloat((stats.totalAmount / stats.totalPayments).toFixed(2))
          : 0;

      return stats;
    } catch (error) {
      throw new Error(
        `Failed to get salary payment statistics: ${error.message}`
      );
    }
  }

  // Get payments by payroll ID
  static async findByPayrollId(userId, employeeId, payrollId) {
    try {
      const paymentsSnapshot = await this.getSalaryPaymentsCollection(
        userId,
        employeeId
      )
        .where("payrollId", "==", payrollId)
        .orderBy("paymentDate", "desc")
        .get();

      const payments = [];
      paymentsSnapshot.forEach((doc) => {
        payments.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      return payments;
    } catch (error) {
      throw new Error(`Failed to get payments by payroll ID: ${error.message}`);
    }
  }

  // Validate salary payment data
  static validatePaymentData(data) {
    if (!data.amount || isNaN(data.amount) || parseFloat(data.amount) <= 0) {
      throw new Error("Amount must be a positive number");
    }

    const validPaymentMethods = ["Banka Havalesi", "Nakit"];
    if (
      data.paymentMethod &&
      !validPaymentMethods.includes(data.paymentMethod)
    ) {
      throw new Error(
        `Payment method must be one of: ${validPaymentMethods.join(", ")}`
      );
    }

    const validCurrencies = ["TL", "USD", "EUR"];
    if (data.currency && !validCurrencies.includes(data.currency)) {
      throw new Error(`Currency must be one of: ${validCurrencies.join(", ")}`);
    }

    return true;
  }
}

module.exports = SalaryPayment;
