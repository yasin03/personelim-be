const { db, COLLECTIONS } = require("../../config/firebase");

// Test Firestore connection
const testFirestoreConnection = async () => {
  try {
    // Try to write a test document
    const testRef = await db.collection("test").add({
      message: "Firestore connection test",
      timestamp: new Date().toISOString(),
    });

    console.log(
      "✅ Firestore connection successful. Test document ID:",
      testRef.id,
    );

    // Clean up test document
    await testRef.delete();
    console.log("🧹 Test document cleaned up");

    return true;
  } catch (error) {
    console.error("❌ Firestore connection failed:", error.message);
    return false;
  }
};

// Get all users from Firestore
const getAllUsers = async () => {
  try {
    const usersSnapshot = await db.collection(COLLECTIONS.USERS).get();
    const users = [];

    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      users.push({
        uid: doc.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        createdAt: userData.createdAt,
      });
    });

    return users;
  } catch (error) {
    console.error("Error getting users:", error);
    throw error;
  }
};

// Get user by email
const getUserByEmail = async (email) => {
  try {
    const usersRef = db.collection(COLLECTIONS.USERS);
    const snapshot = await usersRef
      .where("email", "==", email.toLowerCase())
      .get();

    if (snapshot.empty) {
      return null;
    }

    const userDoc = snapshot.docs[0];
    return {
      uid: userDoc.id,
      ...userDoc.data(),
    };
  } catch (error) {
    console.error("Error getting user by email:", error);
    throw error;
  }
};

// Create user in Firestore
const createUser = async (userData) => {
  try {
    const userRef = await db.collection(COLLECTIONS.USERS).add({
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return userRef.id;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

// Update user in Firestore
const updateUser = async (uid, updateData) => {
  try {
    await db
      .collection(COLLECTIONS.USERS)
      .doc(uid)
      .update({
        ...updateData,
        updatedAt: new Date().toISOString(),
      });

    return true;
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
};

module.exports = {
  testFirestoreConnection,
  getAllUsers,
  getUserByEmail,
  createUser,
  updateUser,
};
