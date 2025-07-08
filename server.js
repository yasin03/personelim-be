const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const employeeRoutes = require("./routes/employees");
const businessRoutes = require("./routes/business");
const leaveRoutes = require("./routes/leaves");
const advanceRoutes = require("./routes/advances");
const { testFirestoreConnection } = require("./utils/firestore");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/auth", authRoutes);
app.use("/employees", employeeRoutes);
app.use("/employees/:employeeId/leaves", leaveRoutes);
app.use("/advances", advanceRoutes);
app.use("/business", businessRoutes);

// Anasayfa root route
app.get("/", (req, res) => {
  res.send("👋 Personelim API is working. Go to /health or /api-docs");
});


/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [System]
 *     security: []
 *     responses:
 *       200:
 *         description: API health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "OK"
 *                 message:
 *                   type: string
 *                   example: "Personelim API is running"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 firestore:
 *                   type: string
 *                   enum: ["Connected", "Disconnected", "Error"]
 *                 database:
 *                   type: string
 *                   example: "Firestore"
 *                 error:
 *                   type: string
 *                   description: Error message if firestore connection fails
 */
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

  // Test Firestore connection on startup
  console.log("🔍 Testing Firestore connection...");
  await testFirestoreConnection();
});

module.exports = app;
