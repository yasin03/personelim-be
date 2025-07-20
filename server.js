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

// Redoc configuration
const { loadOpenAPISpec, generateRedocHTML } = require("./config/redoc");
const { generateSimpleHTML } = require("./config/simple-docs");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Documentation with Redoc
app.get("/openapi.json", (req, res) => {
  const spec = loadOpenAPISpec();
  if (spec) {
    res.json(spec);
  } else {
    res.status(500).json({ error: "Could not load OpenAPI specification" });
  }
});

app.get("/api-docs", (req, res) => {
  const spec = loadOpenAPISpec();
  if (spec) {
    const html = generateRedocHTML(spec);
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } else {
    res.status(500).send("Could not load API documentation");
  }
});

// Simple HTML documentation as fallback
app.get("/api-docs-simple", (req, res) => {
  const spec = loadOpenAPISpec();
  if (spec) {
    const html = generateSimpleHTML(spec);
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } else {
    res.status(500).send("Could not load API documentation");
  }
});

// Test endpoint to debug
app.get("/api-docs-debug", (req, res) => {
  const spec = loadOpenAPISpec();
  res.json({
    specExists: !!spec,
    specKeys: spec ? Object.keys(spec) : null,
    pathsCount: spec?.paths ? Object.keys(spec.paths).length : 0,
  });
});

// API Documentation redirect
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

// Anasayfa root route
app.get("/", (req, res) => {
  res.send("👋 Personelim API is working. Go to /health or /api-docs");
});

// Health check route with Firestore status
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    message: `The route ${req.originalUrl} does not exist`,
  });
});

// Global error handler
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

app.listen(PORT, async () => {
  console.log(`🚀 Personelim API server is running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`📖 Docs shortcut: http://localhost:${PORT}/docs`);

  // Test Firestore connection on startup
  console.log("🔍 Testing Firestore connection...");
  await testFirestoreConnection();
});

// Vercel için serverless export
module.exports = app;
