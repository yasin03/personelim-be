const { db, COLLECTIONS } = require("../src/config/firebase");

// Contract types constant
const CONTRACT_TYPES = [
  "Belirsiz Süreli",
  "Belirli Süreli",
  "Kısmi Süreli",
  "Çağrı Üzerine",
  "Deneme Süreli",
];

// Work modes constant
const WORK_MODES = [
  "Tam Zamanlı",
  "Yarı Zamanlı",
  "Part-time",
  "Hibrit",
  "Uzaktan (Remote)",
];

class Employee {
  constructor(data) {
    this.userId = data.userId; // Kullanıcının UID'si (personel login olacağı için gerekli)
    this.employeeCode = data.employeeCode || null;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.profilePictureUrl = data.profilePictureUrl || null;
    this.email = data.email; // Email required for employee login
    this.phoneNumber = data.phoneNumber || null;
    this.tcKimlikNo = data.tcKimlikNo || null;
    this.dateOfBirth = data.dateOfBirth || null;
    this.gender = data.gender || null;
    this.address = data.address || null;
    this.position = data.position || null;
    this.department = data.department || null;
    this.contractType = data.contractType || "Belirsiz Süreli";
    this.workMode = data.workMode || "Tam Zamanlı";
    this.workingHoursPerDay = data.workingHoursPerDay || 8;
    this.startDate = data.startDate || null;
    this.terminationDate = data.terminationDate || null;
    this.salary = data.salary || {
      grossAmount: 0,
      netAmount: 0,
      currency: "TL",
      bankName: null,
      iban: null,
    };
    this.insuranceInfo = data.insuranceInfo || {
      sicilNo: null,
      startDate: null,
    };
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  // Get collection reference for user's employees
  static getEmployeesCollection(userId) {
    return db.collection(COLLECTIONS.USERS).doc(userId).collection("employees");
  }

  // Create new employee
  static async create(userId, employeeData) {
    try {
      const employee = new Employee({
        ...employeeData,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const employeeRef = await this.getEmployeesCollection(userId).add({
        userId: employee.userId,
        employeeCode: employee.employeeCode,
        firstName: employee.firstName,
        lastName: employee.lastName,
        profilePictureUrl: employee.profilePictureUrl,
        email: employee.email,
        phoneNumber: employee.phoneNumber,
        tcKimlikNo: employee.tcKimlikNo,
        dateOfBirth: employee.dateOfBirth,
        gender: employee.gender,
        address: employee.address,
        position: employee.position,
        department: employee.department,
        contractType: employee.contractType,
        workMode: employee.workMode,
        workingHoursPerDay: employee.workingHoursPerDay,
        startDate: employee.startDate,
        terminationDate: employee.terminationDate,
        salary: employee.salary,
        insuranceInfo: employee.insuranceInfo,
        isActive: employee.isActive,
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt,
      });

      return {
        id: employeeRef.id,
        ...employee,
      };
    } catch (error) {
      throw new Error(`Failed to create employee: ${error.message}`);
    }
  }

  // Get employee by ID
  static async findById(userId, employeeId, options = {}) {
    try {
      const employeeDoc = await this.getEmployeesCollection(userId)
        .doc(employeeId)
        .get();

      if (!employeeDoc.exists) {
        return null;
      }

      const employeeData = employeeDoc.data();

      // Check if employee is active unless includeDeleted is true
      if (!options.includeDeleted && !employeeData.isActive) {
        return null;
      }

      return {
        id: employeeDoc.id,
        ...employeeData,
      };
    } catch (error) {
      throw new Error(`Failed to find employee by ID: ${error.message}`);
    }
  }

  // Get all active employees for a user
  static async findAllByUserId(userId, options = {}) {
    try {
      let query = this.getEmployeesCollection(userId);

      // Only filter active if not explicitly requesting deleted
      if (!options.onlyDeleted) {
        query = query.where("isActive", "==", true);
      } else {
        query = query.where("isActive", "==", false);
      }

      const employeesSnapshot = await query.get();
      const employees = [];

      employeesSnapshot.forEach((doc) => {
        const employeeData = doc.data();
        employees.push({
          id: doc.id,
          ...employeeData,
        });
      });

      // Sort manually after retrieval to avoid index issues
      employees.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Apply pagination if needed
      if (options.page && options.limit) {
        const startIndex = (options.page - 1) * options.limit;
        const endIndex = startIndex + options.limit;
        return {
          employees: employees.slice(startIndex, endIndex),
          total: employees.length,
          page: options.page,
          limit: options.limit,
          totalPages: Math.ceil(employees.length / options.limit),
        };
      }

      return {
        employees,
        total: employees.length,
        page: 1,
        limit: employees.length,
        totalPages: 1,
      };
    } catch (error) {
      throw new Error(`Failed to get employees: ${error.message}`);
    }
  }

  // Get all employees (including inactive) for a user
  static async findAllIncludingInactive(userId) {
    try {
      const employeesSnapshot = await this.getEmployeesCollection(userId)
        .orderBy("createdAt", "desc")
        .get();

      const employees = [];

      employeesSnapshot.forEach((doc) => {
        const employeeData = doc.data();
        employees.push({
          id: doc.id,
          ...employeeData,
        });
      });

      return employees;
    } catch (error) {
      throw new Error(`Failed to get all employees: ${error.message}`);
    }
  }

  // Update employee
  static async updateById(userId, employeeId, updateData) {
    try {
      const employeeDoc = await this.getEmployeesCollection(userId)
        .doc(employeeId)
        .get();

      if (!employeeDoc.exists) {
        return null;
      }

      const employeeData = employeeDoc.data();

      // Check if employee is active
      if (!employeeData.isActive) {
        return null;
      }

      const updateFields = {
        ...updateData,
        updatedAt: new Date().toISOString(),
      };

      await this.getEmployeesCollection(userId)
        .doc(employeeId)
        .update(updateFields);

      // Return updated employee data
      const updatedDoc = await this.getEmployeesCollection(userId)
        .doc(employeeId)
        .get();
      return {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      };
    } catch (error) {
      throw new Error(`Failed to update employee: ${error.message}`);
    }
  }

  // Soft delete employee (mark as inactive)
  static async deleteById(userId, employeeId) {
    try {
      const employeeDoc = await this.getEmployeesCollection(userId)
        .doc(employeeId)
        .get();

      if (!employeeDoc.exists) {
        return null;
      }

      const employeeData = employeeDoc.data();

      // Check if employee is already deleted
      if (!employeeData.isActive) {
        return null;
      }

      // Soft delete: mark as inactive
      const deletedAt = new Date().toISOString();
      await this.getEmployeesCollection(userId).doc(employeeId).update({
        isActive: false,
        terminationDate: deletedAt,
        updatedAt: deletedAt,
      });

      return {
        id: employeeDoc.id,
        ...employeeData,
        isActive: false,
        terminationDate: deletedAt,
      };
    } catch (error) {
      throw new Error(`Failed to delete employee: ${error.message}`);
    }
  }

  // Restore deleted employee
  static async restoreById(userId, employeeId) {
    try {
      const employeeDoc = await this.getEmployeesCollection(userId)
        .doc(employeeId)
        .get();

      if (!employeeDoc.exists) {
        return null;
      }

      const employeeData = employeeDoc.data();

      // Check if employee is actually deleted
      if (employeeData.isActive) {
        return null;
      }

      // Restore employee
      const restoredAt = new Date().toISOString();
      await this.getEmployeesCollection(userId).doc(employeeId).update({
        isActive: true,
        terminationDate: null,
        updatedAt: restoredAt,
      });

      return {
        id: employeeDoc.id,
        ...employeeData,
        isActive: true,
        terminationDate: null,
        updatedAt: restoredAt,
      };
    } catch (error) {
      throw new Error(`Failed to restore employee: ${error.message}`);
    }
  }

  // Simple search employees by text (client-side filtering)
  static async search(userId, searchTerm, options = {}) {
    try {
      // Get all employees first
      const result = await this.findAllByUserId(userId, {
        onlyDeleted: options.onlyDeleted,
      });

      if (!searchTerm || searchTerm.trim() === "") {
        return result;
      }

      const searchLower = searchTerm.toLowerCase();

      // Filter employees by search term
      const filteredEmployees = result.employees.filter((emp) => {
        return (
          (emp.firstName &&
            emp.firstName.toLowerCase().includes(searchLower)) ||
          (emp.lastName && emp.lastName.toLowerCase().includes(searchLower)) ||
          (emp.email && emp.email.toLowerCase().includes(searchLower)) ||
          (emp.tcKimlikNo && emp.tcKimlikNo.includes(searchTerm)) ||
          (emp.position && emp.position.toLowerCase().includes(searchLower)) ||
          (emp.department && emp.department.toLowerCase().includes(searchLower))
        );
      });

      // Apply pagination if needed
      if (options.page && options.limit) {
        const startIndex = (options.page - 1) * options.limit;
        const endIndex = startIndex + options.limit;
        return {
          employees: filteredEmployees.slice(startIndex, endIndex),
          total: filteredEmployees.length,
          page: options.page,
          limit: options.limit,
          totalPages: Math.ceil(filteredEmployees.length / options.limit),
        };
      }

      return {
        employees: filteredEmployees,
        total: filteredEmployees.length,
        page: 1,
        limit: filteredEmployees.length,
        totalPages: 1,
      };
    } catch (error) {
      throw new Error(`Failed to search employees: ${error.message}`);
    }
  }

  // Find employees by department (client-side filtering)
  static async findByDepartment(userId, department, options = {}) {
    try {
      // Get all employees first
      const result = await this.findAllByUserId(userId, {
        onlyDeleted: options.onlyDeleted,
      });

      if (!department || department.trim() === "") {
        return result;
      }

      // Filter employees by department
      const filteredEmployees = result.employees.filter(
        (emp) =>
          emp.department &&
          emp.department.toLowerCase() === department.toLowerCase(),
      );

      // Apply pagination if needed
      if (options.page && options.limit) {
        const startIndex = (options.page - 1) * options.limit;
        const endIndex = startIndex + options.limit;
        return {
          employees: filteredEmployees.slice(startIndex, endIndex),
          total: filteredEmployees.length,
          page: options.page,
          limit: options.limit,
          totalPages: Math.ceil(filteredEmployees.length / options.limit),
        };
      }

      return {
        employees: filteredEmployees,
        total: filteredEmployees.length,
        page: 1,
        limit: filteredEmployees.length,
        totalPages: 1,
      };
    } catch (error) {
      throw new Error(
        `Failed to find employees by department: ${error.message}`,
      );
    }
  }

  // Get employee statistics
  static async getStatistics(userId) {
    try {
      const allEmployees = await this.findAllIncludingInactive(userId);

      const stats = {
        total: allEmployees.length,
        active: allEmployees.filter((emp) => emp.isActive).length,
        inactive: allEmployees.filter((emp) => !emp.isActive).length,
        byDepartment: {},
        byPosition: {},
        byGender: {},
        averageSalary: 0,
      };

      // Calculate statistics
      let totalSalary = 0;
      let salaryCount = 0;

      allEmployees.forEach((employee) => {
        if (employee.isActive) {
          // Department stats
          if (employee.department) {
            stats.byDepartment[employee.department] =
              (stats.byDepartment[employee.department] || 0) + 1;
          }

          // Position stats
          if (employee.position) {
            stats.byPosition[employee.position] =
              (stats.byPosition[employee.position] || 0) + 1;
          }

          // Gender stats
          if (employee.gender) {
            stats.byGender[employee.gender] =
              (stats.byGender[employee.gender] || 0) + 1;
          }

          // Salary stats
          if (employee.salary && employee.salary.grossAmount > 0) {
            totalSalary += employee.salary.grossAmount;
            salaryCount++;
          }
        }
      });

      stats.averageSalary =
        salaryCount > 0 ? Math.round(totalSalary / salaryCount) : 0;

      return stats;
    } catch (error) {
      throw new Error(`Failed to get employee statistics: ${error.message}`);
    }
  }

  // Find employee by user ID (for employee login)
  static async findByUserId(employeeUserId) {
    try {
      // Search through all businesses to find the employee
      const usersSnapshot = await db.collection(COLLECTIONS.USERS).get();

      for (const userDoc of usersSnapshot.docs) {
        const employeesSnapshot = await this.getEmployeesCollection(userDoc.id)
          .where("userId", "==", employeeUserId)
          .where("isActive", "==", true)
          .get();

        if (!employeesSnapshot.empty) {
          const employeeDoc = employeesSnapshot.docs[0];
          return {
            id: employeeDoc.id,
            businessOwnerId: userDoc.id,
            ...employeeDoc.data(),
          };
        }
      }

      return null;
    } catch (error) {
      throw new Error(`Failed to find employee by user ID: ${error.message}`);
    }
  }

  // Sanitize employee data (remove sensitive info for employee role)
  static sanitize(employeeData, userRole = "employee") {
    if (userRole === "employee") {
      // Employees see limited fields
      const { salary, insuranceInfo, ...publicData } = employeeData;
      return {
        ...publicData,
        salary: salary
          ? {
              currency: salary.currency || "TL",
              // Hide actual amounts for basic employees
            }
          : null,
      };
    }
    // Owners and managers see all data
    return employeeData;
  }

  // Get contract types
  static getContractTypes() {
    return CONTRACT_TYPES;
  }

  // Get work modes
  static getWorkModes() {
    return WORK_MODES;
  }

  // Validate contract type
  static isValidContractType(contractType) {
    return CONTRACT_TYPES.includes(contractType);
  }

  // Validate work mode
  static isValidWorkMode(workMode) {
    return WORK_MODES.includes(workMode);
  }
}

module.exports = {
  Employee,
  CONTRACT_TYPES,
  WORK_MODES,
};
