const { db, COLLECTIONS } = require("../config/firebase");

class Timesheet {
  constructor(data) {
    this.employeeId = data.employeeId; // Personele referans
    this.userId = data.userId; // Hangi kullanıcıya (işletmeye) ait
    this.date = data.date; // YYYY-MM-DD
    this.status = data.status || "Çalıştı"; // "Çalıştı", "İzinli", "Devamsız", "Yarım Gün", "Resmi Tatil"
    this.checkInTime = data.checkInTime || null; // "09:00"
    this.checkOutTime = data.checkOutTime || null; // "17:00"
    this.totalHoursWorked = data.totalHoursWorked || 0;
    this.overtimeHours = data.overtimeHours || 0;
    this.notes = data.notes || null;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  // Get timesheets collection reference for an employee
  static getTimesheetsCollection(userId, employeeId) {
    return db
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .collection("employees")
      .doc(employeeId)
      .collection("timesheets");
  }

  // Create new timesheet
  static async create(userId, employeeId, timesheetData) {
    try {
      const timesheet = new Timesheet({
        ...timesheetData,
        employeeId,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Calculate total hours worked if check-in and check-out times are provided
      if (timesheet.checkInTime && timesheet.checkOutTime) {
        timesheet.totalHoursWorked = this.calculateHoursWorked(
          timesheet.checkInTime,
          timesheet.checkOutTime
        );
      }

      const timesheetRef = await this.getTimesheetsCollection(
        userId,
        employeeId
      ).add({
        employeeId: timesheet.employeeId,
        userId: timesheet.userId,
        date: timesheet.date,
        status: timesheet.status,
        checkInTime: timesheet.checkInTime,
        checkOutTime: timesheet.checkOutTime,
        totalHoursWorked: timesheet.totalHoursWorked,
        overtimeHours: timesheet.overtimeHours,
        notes: timesheet.notes,
        createdAt: timesheet.createdAt,
        updatedAt: timesheet.updatedAt,
      });

      return {
        id: timesheetRef.id,
        ...timesheet,
      };
    } catch (error) {
      throw new Error(`Failed to create timesheet: ${error.message}`);
    }
  }

  // Get timesheet by ID
  static async findById(userId, employeeId, timesheetId) {
    try {
      const timesheetDoc = await this.getTimesheetsCollection(
        userId,
        employeeId
      )
        .doc(timesheetId)
        .get();

      if (!timesheetDoc.exists) {
        return null;
      }

      return {
        id: timesheetDoc.id,
        ...timesheetDoc.data(),
      };
    } catch (error) {
      throw new Error(`Failed to find timesheet by ID: ${error.message}`);
    }
  }

  // Get all timesheets for an employee
  static async findAllByEmployeeId(userId, employeeId, options = {}) {
    try {
      let query = this.getTimesheetsCollection(userId, employeeId);

      // Filter by month and year if specified
      if (options.month && options.year) {
        const startDate = `${options.year}-${options.month.padStart(
          2,
          "0"
        )}-01`;
        const endDate = `${options.year}-${options.month.padStart(2, "0")}-31`;
        query = query
          .where("date", ">=", startDate)
          .where("date", "<=", endDate);
      }

      // Filter by status if specified
      if (options.status) {
        query = query.where("status", "==", options.status);
      }

      // Order by date
      query = query.orderBy("date", "desc");

      const timesheetsSnapshot = await query.get();
      const timesheets = [];

      timesheetsSnapshot.forEach((doc) => {
        timesheets.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      // Apply pagination if needed
      if (options.page && options.limit) {
        const startIndex = (options.page - 1) * options.limit;
        const endIndex = startIndex + options.limit;
        return {
          timesheets: timesheets.slice(startIndex, endIndex),
          total: timesheets.length,
          page: options.page,
          limit: options.limit,
          totalPages: Math.ceil(timesheets.length / options.limit),
        };
      }

      return {
        timesheets,
        total: timesheets.length,
        page: 1,
        limit: timesheets.length,
        totalPages: 1,
      };
    } catch (error) {
      throw new Error(`Failed to get timesheets: ${error.message}`);
    }
  }

  // Update timesheet
  static async updateById(userId, employeeId, timesheetId, updateData) {
    try {
      const timesheetDoc = await this.getTimesheetsCollection(
        userId,
        employeeId
      )
        .doc(timesheetId)
        .get();

      if (!timesheetDoc.exists) {
        return null;
      }

      const updateFields = {
        ...updateData,
        updatedAt: new Date().toISOString(),
      };

      // Recalculate total hours if check-in or check-out time is updated
      if (updateFields.checkInTime || updateFields.checkOutTime) {
        const currentData = timesheetDoc.data();
        const checkInTime = updateFields.checkInTime || currentData.checkInTime;
        const checkOutTime =
          updateFields.checkOutTime || currentData.checkOutTime;

        if (checkInTime && checkOutTime) {
          updateFields.totalHoursWorked = this.calculateHoursWorked(
            checkInTime,
            checkOutTime
          );
        }
      }

      await this.getTimesheetsCollection(userId, employeeId)
        .doc(timesheetId)
        .update(updateFields);

      // Return updated timesheet data
      const updatedDoc = await this.getTimesheetsCollection(userId, employeeId)
        .doc(timesheetId)
        .get();

      return {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      };
    } catch (error) {
      throw new Error(`Failed to update timesheet: ${error.message}`);
    }
  }

  // Delete timesheet
  static async deleteById(userId, employeeId, timesheetId) {
    try {
      const timesheetDoc = await this.getTimesheetsCollection(
        userId,
        employeeId
      )
        .doc(timesheetId)
        .get();

      if (!timesheetDoc.exists) {
        return null;
      }

      await this.getTimesheetsCollection(userId, employeeId)
        .doc(timesheetId)
        .delete();

      return {
        id: timesheetDoc.id,
        ...timesheetDoc.data(),
      };
    } catch (error) {
      throw new Error(`Failed to delete timesheet: ${error.message}`);
    }
  }

  // Get timesheet statistics for an employee
  static async getStatistics(userId, employeeId, options = {}) {
    try {
      const { month, year = new Date().getFullYear() } = options;

      let query = this.getTimesheetsCollection(userId, employeeId);

      if (month) {
        const startDate = `${year}-${month.padStart(2, "0")}-01`;
        const endDate = `${year}-${month.padStart(2, "0")}-31`;
        query = query
          .where("date", ">=", startDate)
          .where("date", "<=", endDate);
      } else {
        const startOfYear = `${year}-01-01`;
        const endOfYear = `${year}-12-31`;
        query = query
          .where("date", ">=", startOfYear)
          .where("date", "<=", endOfYear);
      }

      const timesheetsSnapshot = await query.get();

      const stats = {
        totalDays: 0,
        workDays: 0,
        absentDays: 0,
        leaveDays: 0,
        halfDays: 0,
        holidayDays: 0,
        totalHoursWorked: 0,
        totalOvertimeHours: 0,
        byStatus: {
          Çalıştı: 0,
          İzinli: 0,
          Devamsız: 0,
          "Yarım Gün": 0,
          "Resmi Tatil": 0,
        },
      };

      timesheetsSnapshot.forEach((doc) => {
        const timesheet = doc.data();
        stats.totalDays++;

        // Count by status
        if (stats.byStatus[timesheet.status] !== undefined) {
          stats.byStatus[timesheet.status]++;
        }

        switch (timesheet.status) {
          case "Çalıştı":
            stats.workDays++;
            break;
          case "İzinli":
            stats.leaveDays++;
            break;
          case "Devamsız":
            stats.absentDays++;
            break;
          case "Yarım Gün":
            stats.halfDays++;
            break;
          case "Resmi Tatil":
            stats.holidayDays++;
            break;
        }

        stats.totalHoursWorked += parseFloat(timesheet.totalHoursWorked) || 0;
        stats.totalOvertimeHours += parseFloat(timesheet.overtimeHours) || 0;
      });

      return stats;
    } catch (error) {
      throw new Error(`Failed to get timesheet statistics: ${error.message}`);
    }
  }

  // Calculate hours worked between check-in and check-out times
  static calculateHoursWorked(checkInTime, checkOutTime) {
    try {
      const [checkInHour, checkInMinute] = checkInTime.split(":").map(Number);
      const [checkOutHour, checkOutMinute] = checkOutTime
        .split(":")
        .map(Number);

      const checkInMinutes = checkInHour * 60 + checkInMinute;
      const checkOutMinutes = checkOutHour * 60 + checkOutMinute;

      let totalMinutes = checkOutMinutes - checkInMinutes;

      // Handle overnight shifts
      if (totalMinutes < 0) {
        totalMinutes += 24 * 60;
      }

      return parseFloat((totalMinutes / 60).toFixed(2));
    } catch (error) {
      return 0;
    }
  }

  // Validate timesheet data
  static validateTimesheetData(data) {
    if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      throw new Error("Date must be in YYYY-MM-DD format");
    }

    const validStatuses = [
      "Çalıştı",
      "İzinli",
      "Devamsız",
      "Yarım Gün",
      "Resmi Tatil",
    ];
    if (data.status && !validStatuses.includes(data.status)) {
      throw new Error(`Status must be one of: ${validStatuses.join(", ")}`);
    }

    if (data.checkInTime && !/^\d{2}:\d{2}$/.test(data.checkInTime)) {
      throw new Error("Check-in time must be in HH:MM format");
    }

    if (data.checkOutTime && !/^\d{2}:\d{2}$/.test(data.checkOutTime)) {
      throw new Error("Check-out time must be in HH:MM format");
    }

    return true;
  }
}

module.exports = Timesheet;
