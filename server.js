const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const employeeRoutes = require("./routes/employees");
const businessRoutes = require("./routes/business");
const leaveRoutes = require("./routes/leaves");
const advanceRoutes = require("./routes/advances");
const timesheetRoutes = require("./routes/timesheets");
const payrollRoutes = require("./routes/payrolls");
const salaryPaymentRoutes = require("./routes/salaryPayments");
const { testFirestoreConnection } = require("./utils/firestore");

const { specs, swaggerUi } = require("./config/swagger");

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger Docs
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Personelim API Documentation",
    customfavIcon: "/favicon.ico",
  })
);

app.get("/docs", (req, res) => {
  res.redirect("/api-docs");
});

// Routes
app.use("/auth", authRoutes);
app.use("/employees", employeeRoutes);
app.use("/employees/:employeeId/leaves", leaveRoutes);
app.use("/employees/:employeeId/timesheets", timesheetRoutes);
app.use("/employees/:employeeId/payrolls", payrollRoutes);
app.use("/employees/:employeeId/salary-payments", salaryPaymentRoutes);
app.use("/advances", advanceRoutes);
app.use("/business", businessRoutes);

// Health
app.get("/health", async (req, res) => {
  try {
    const firestoreStatus = await testFirestoreConnection();
    res.status(200).json({
      status: "OK",
      message: "Personelim API is running",
      timestamp: new Date().toISOString(),
      firestore: firestoreStatus ? "Connected" : "Disconnected",
      database: "Firestore",
    });
  } catch (error) {
    res.status(200).json({
      status: "OK",
      message: "Personelim API is running",
      timestamp: new Date().toISOString(),
      firestore: "Error",
      error: error.message,
    });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    message: `The route ${req.originalUrl} does not exist`,
  });
});

// Error
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// Export for Vercel
module.exports = app;
