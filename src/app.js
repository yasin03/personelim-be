const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");

const { loadEnv } = require("./config/env");
loadEnv();

const { errorHandler } = require("./shared/errors");
const { testFirestoreConnection } = require("./shared/db/firestore");

// Module routes
const authRoutes = require("./modules/auth/auth.routes");
const employeesRoutes = require("./modules/employees/employees.routes");
const businessRoutes = require("./modules/business/business.routes");
const advancesRoutes = require("./modules/advances/advances.routes");
const leavesRoutes = require("./modules/leaves/leaves.routes");
const timesheetsRoutes = require("./modules/timesheets/timesheets.routes");
const payrollsRoutes = require("./modules/payroll/payrolls.routes");
const paymentsRoutes = require("./modules/payments/payments.routes");

// Redoc/simple docs configuration
const { loadOpenAPISpec, generateRedocHTML } = require("./config/redoc");
const { generateSimpleHTML } = require("./config/simple-docs");

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Content Security Policy to satisfy Vercel restrictions
app.use((req, res, next) => {
  const docsSafeList = new Set([
    "/api-docs",
    "/api-docs-simple",
    "/docs",
    "/openapi.json",
    "/docs.css",
    "/docs-init.js",
    "/redoc.standalone.js",
  ]);
  const isDocsRequest = docsSafeList.has(req.path);
  const styleSrc = isDocsRequest ? "'self' 'unsafe-inline'" : "'self'";

  res.setHeader(
    "Content-Security-Policy",
    `default-src 'self'; script-src 'self'; style-src ${styleSrc}; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'self'`,
  );
  next();
});

// Serve static documentation assets from root /public
app.use(express.static(path.join(__dirname, "..", "public")));

// Serve Redoc bundle from dependency (self-hosted)
let redocBundlePath;
try {
  redocBundlePath = require.resolve("redoc/bundles/redoc.standalone.js");
} catch (error) {
  console.error("Redoc bundle could not be resolved:", error);
}

app.get("/redoc.standalone.js", (req, res) => {
  if (!redocBundlePath) {
    return res
      .status(500)
      .type("text/plain")
      .send("Redoc bundle not found. Please ensure 'redoc' is installed.");
  }

  res.type("application/javascript");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  return res.sendFile(redocBundlePath);
});

// API Documentation with Redoc
app.get("/openapi.json", (req, res) => {
  const spec = loadOpenAPISpec();
  if (spec) {
    return res.json(spec);
  }
  return res
    .status(500)
    .json({ error: "Could not load OpenAPI specification" });
});

app.get("/api-docs", (req, res) => {
  const spec = loadOpenAPISpec();
  if (spec) {
    const html = generateRedocHTML(spec);
    res.setHeader("Content-Type", "text/html");
    return res.send(html);
  }
  return res.status(500).send("Could not load API documentation");
});

app.get("/api-docs-simple", (req, res) => {
  const spec = loadOpenAPISpec();
  if (spec) {
    const html = generateSimpleHTML(spec);
    res.setHeader("Content-Type", "text/html");
    return res.send(html);
  }
  return res.status(500).send("Could not load API documentation");
});

app.get("/docs", (req, res) => {
  res.redirect("/api-docs");
});

// Routes
app.use("/auth", authRoutes);
app.use("/employees", employeesRoutes);
app.use("/employees/:employeeId/leaves", leavesRoutes);
app.use("/employees/:employeeId/timesheets", timesheetsRoutes);
app.use("/employees/:employeeId/payrolls", payrollsRoutes);
app.use("/employees/:employeeId/salary-payments", paymentsRoutes);
app.use("/advances", advancesRoutes);
app.use("/business", businessRoutes);

app.get("/", (req, res) => {
  res.send("Personelim API is working. Go to /health or /api-docs");
});

app.get("/health", async (req, res) => {
  try {
    const firestoreStatus = await testFirestoreConnection();
    return res.status(200).json({
      status: "OK",
      message: "Personelim API is running",
      timestamp: new Date().toISOString(),
      firestore: firestoreStatus ? "Connected" : "Disconnected",
      database: "Firestore",
    });
  } catch (error) {
    return res.status(200).json({
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
app.use(errorHandler);

module.exports = app;
