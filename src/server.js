const app = require("./app");
const { testFirestoreConnection } = require("./shared/db/firestore");

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, async () => {
    console.log(`Personelim API server is running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
    console.log(`Docs shortcut: http://localhost:${PORT}/docs`);

    console.log("Testing Firestore connection...");
    await testFirestoreConnection();
  });
}

module.exports = app;
