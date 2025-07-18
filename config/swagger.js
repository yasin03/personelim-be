const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Personelim API",
      version: "1.0.0",
      description:
        "Node.js backend API for personnel management system with authentication, employee management, leaves, advances, timesheets, payrolls, and salary payments.",
      contact: {
        name: "API Support",
        email: "support@personelim.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
      {
        url: "https://personelim-be.vercel.app",
        description: "Production server (Vercel)",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            'JWT Authorization header using the Bearer scheme. Example: "Bearer {token}"',
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            uid: {
              type: "string",
              description: "Unique user identifier",
            },
            name: {
              type: "string",
              description: "User full name",
            },
            email: {
              type: "string",
              format: "email",
              description: "User email address",
            },
            role: {
              type: "string",
              enum: ["owner", "manager", "employee"],
              description: "User role in the system",
            },
            businessId: {
              type: "string",
              description: "Business identifier",
            },
            employeeId: {
              type: "string",
              description: "Employee identifier (for employee role)",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Account creation timestamp",
            },
          },
        },
        Employee: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Employee unique identifier",
            },
            name: {
              type: "string",
              description: "Employee full name",
            },
            email: {
              type: "string",
              format: "email",
              description: "Employee email address",
            },
            position: {
              type: "string",
              description: "Job position",
            },
            department: {
              type: "string",
              description: "Department name",
            },
            salary: {
              type: "number",
              description: "Monthly salary amount",
            },
            hireDate: {
              type: "string",
              format: "date",
              description: "Hiring date (YYYY-MM-DD)",
            },
            userId: {
              type: "string",
              description: "Associated user account ID",
            },
          },
        },
        Leave: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Leave request unique identifier",
            },
            employeeId: {
              type: "string",
              description: "Employee identifier",
            },
            type: {
              type: "string",
              enum: ["günlük", "yıllık", "mazeret"],
              description: "Type of leave",
            },
            startDate: {
              type: "string",
              format: "date",
              description: "Leave start date (YYYY-MM-DD)",
            },
            endDate: {
              type: "string",
              format: "date",
              description: "Leave end date (YYYY-MM-DD)",
            },
            reason: {
              type: "string",
              description: "Reason for leave",
            },
            status: {
              type: "string",
              enum: ["pending", "approved", "rejected"],
              description: "Leave request status",
            },
            approvedBy: {
              type: "string",
              description: "Who approved/rejected the leave",
            },
            approvalNote: {
              type: "string",
              description: "Approval/rejection note",
            },
          },
        },
        AdvanceRequest: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Advance request unique identifier",
            },
            employeeId: {
              type: "string",
              description: "Employee identifier",
            },
            amount: {
              type: "number",
              description: "Advance amount requested",
            },
            reason: {
              type: "string",
              description: "Reason for advance request",
            },
            status: {
              type: "string",
              enum: ["pending", "approved", "rejected"],
              description: "Advance request status",
            },
            requestDate: {
              type: "string",
              format: "date-time",
              description: "Request submission date",
            },
            responseDate: {
              type: "string",
              format: "date-time",
              description: "Response date",
            },
            approvedBy: {
              type: "string",
              description: "Who approved/rejected the request",
            },
          },
        },
        Timesheet: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Timesheet unique identifier",
            },
            employeeId: {
              type: "string",
              description: "Employee identifier",
            },
            date: {
              type: "string",
              format: "date",
              description: "Work date (YYYY-MM-DD)",
            },
            status: {
              type: "string",
              enum: [
                "Çalıştı",
                "İzinli",
                "Devamsız",
                "Yarım Gün",
                "Resmi Tatil",
              ],
              description: "Work status for the day",
            },
            checkInTime: {
              type: "string",
              pattern: "^\\d{2}:\\d{2}$",
              description: "Check-in time (HH:MM)",
            },
            checkOutTime: {
              type: "string",
              pattern: "^\\d{2}:\\d{2}$",
              description: "Check-out time (HH:MM)",
            },
            totalHoursWorked: {
              type: "number",
              description: "Total hours worked",
            },
            overtimeHours: {
              type: "number",
              description: "Overtime hours",
            },
            notes: {
              type: "string",
              description: "Additional notes",
            },
          },
        },
        Payroll: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Payroll unique identifier",
            },
            employeeId: {
              type: "string",
              description: "Employee identifier",
            },
            periodMonth: {
              type: "string",
              pattern: "^(0[1-9]|1[0-2])$",
              description: "Payroll period month (MM)",
            },
            periodYear: {
              type: "string",
              pattern: "^\\d{4}$",
              description: "Payroll period year (YYYY)",
            },
            grossSalary: {
              type: "number",
              description: "Gross salary amount",
            },
            netSalary: {
              type: "number",
              description: "Net salary amount",
            },
            totalDeductions: {
              type: "number",
              description: "Total deductions",
            },
            status: {
              type: "string",
              enum: ["Ödendi", "Beklemede"],
              description: "Payment status",
            },
            currency: {
              type: "string",
              enum: ["TL", "USD", "EUR"],
              description: "Currency",
            },
          },
        },
        SalaryPayment: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Salary payment unique identifier",
            },
            employeeId: {
              type: "string",
              description: "Employee identifier",
            },
            payrollId: {
              type: "string",
              description: "Associated payroll identifier",
            },
            amount: {
              type: "number",
              description: "Payment amount",
            },
            paymentMethod: {
              type: "string",
              enum: ["Banka Havalesi", "Nakit"],
              description: "Payment method",
            },
            paymentDate: {
              type: "string",
              format: "date-time",
              description: "Payment date",
            },
            currency: {
              type: "string",
              enum: ["TL", "USD", "EUR"],
              description: "Currency",
            },
            description: {
              type: "string",
              description: "Payment description",
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "Error type",
            },
            message: {
              type: "string",
              description: "Error message",
            },
            details: {
              type: "array",
              items: {
                type: "object",
              },
              description: "Validation error details",
            },
          },
        },
        Success: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Success message",
            },
            data: {
              type: "object",
              description: "Response data",
            },
            token: {
              type: "string",
              description: "JWT token (for auth endpoints)",
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    "./routes/*.js", // Tüm route dosyalarını tarar
    "./models/*.js", // Model dosyalarını da tarar
    "./server.js", // Ana server dosyasını tarar
    // Vercel için absolute paths
    "routes/*.js",
    "models/*.js",
    "server.js",
  ],
};

const specs = swaggerJsdoc(options);

module.exports = {
  specs,
  swaggerUi,
  swaggerJsdoc,
};
