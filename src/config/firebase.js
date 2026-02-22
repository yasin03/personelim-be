const admin = require("firebase-admin");
const path = require("path");

let firebaseApp;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    console.log("🔧 Using FIREBASE_SERVICE_ACCOUNT_KEY from environment");
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
    console.log(
      "✅ Firebase initialized with service account from environment",
    );
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.log("🔧 Using FIREBASE_SERVICE_ACCOUNT from environment");
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
    console.log(
      "✅ Firebase initialized with service account from environment",
    );
  } else {
    try {
      const serviceAccountPath = path.join(
        __dirname,
        "..",
        "..",
        "serviceAccountKey.json",
      );
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
      console.log("✅ Firebase initialized with service account file");
    } catch (fileError) {
      console.warn(
        "⚠️  Service account file not found. Trying default credentials...",
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

const db = admin.firestore();

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
