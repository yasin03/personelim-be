const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const employeeRoutes = require("./routes/employees");
const businessRoutes = require("./routes/business");
const leaveRoutes = require("./routes/leaves");
const advanceRoutes = require("./routes/advances");
const timesheetRoutes = require("./routes/timesheets");
const payrollRoutes = require("./routes/payrolls");
const salaryPaymentRoutes = require("./routes/salaryPayments");
const dashboardRoutes = require("./routes/dashboard");
const { testFirestoreConnection } = require("./utils/firestore");

// Redoc configuration
const {
  loadOpenAPISpec: loadRedocSpec,
  generateRedocHTML,
} = require("./config/redoc");
const { generateSimpleHTML } = require("./config/simple-docs");
const {
  swaggerUi,
  swaggerUIOptions,
  loadOpenAPISpec: loadSwaggerSpec,
} = require("./config/swagger");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Content Security Policy to satisfy Vercel restrictions
app.use((req, res, next) => {
  const docsSafeList = new Set([
    "/api-docs",
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
    `default-src 'self'; script-src 'self'; style-src ${styleSrc}; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'self'`
  );
  next();
});

// Serve static documentation assets
app.use(express.static(path.join(__dirname, "public")));

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
  res.sendFile(redocBundlePath);
});

// API Documentation with Redoc
app.get("/openapi.json", (req, res) => {
  const spec = loadRedocSpec();
  if (spec) {
    res.json(spec);
  } else {
    res.status(500).json({ error: "Could not load OpenAPI specification" });
  }
});

app.get("/api-docs", (req, res) => {
  const spec = loadRedocSpec();
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
  const spec = loadRedocSpec();
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
  const spec = loadRedocSpec();
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

// Swagger UI documentation
const swaggerSpec = loadSwaggerSpec();
if (swaggerSpec) {
  app.use(
    "/swagger",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, swaggerUIOptions)
  );
} else {
  console.warn("Swagger dokümantasyonu yüklenemedi.");
}

// Routes
app.use("/auth", authRoutes);
app.use("/employees", employeeRoutes);
app.use("/employees/:employeeId/leaves", leaveRoutes);
app.use("/employees/:employeeId/timesheets", timesheetRoutes);
app.use("/employees/:employeeId/payrolls", payrollRoutes);
app.use("/employees/:employeeId/salary-payments", salaryPaymentRoutes);
app.use("/advances", advanceRoutes);
app.use("/business", businessRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/dashboard", dashboardRoutes);

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
