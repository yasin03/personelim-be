const admin = require("firebase-admin");
const path = require("path");

// Initialize Firebase Admin SDK
let firebaseApp;

try {
  // For production, use service account key from environment
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  } else {
    // For development, try to use service account file
    try {
      const serviceAccountPath = path.join(
        __dirname,
        "..",
        "serviceAccountKey.json"
      );
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
      console.log("✅ Firebase initialized with service account file");
    } catch (fileError) {
      // Fallback to default credentials (for deployed environments like Cloud Functions)
      console.warn(
        "⚠️  Service account file not found. Trying default credentials..."
      );
      firebaseApp = admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    }
  }
} catch (error) {
  console.error("❌ Firebase initialization error:", error.message);
  console.error("Make sure you have:");
  console.error("1. Created a Firebase project");
  console.error("2. Enabled Firestore");
  console.error("3. Downloaded service account key");
  console.error("4. Set FIREBASE_PROJECT_ID in .env file");
  process.exit(1);
}

// Get Firestore instance
const db = admin.firestore();

// Collections
const COLLECTIONS = {
  USERS: "users",
  BUSINESSES: "businesses",
  PASSWORDS: "passwords",
};

module.exports = {
  admin,
  db,
  COLLECTIONS,
};
