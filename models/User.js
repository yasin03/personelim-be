const { db, COLLECTIONS } = require("../src/config/firebase");

class User {
  constructor(data) {
    this.name = data.name;
    this.email = data.email;
    this.role = data.role; // "owner" | "manager" | "employee"
    this.businessId = data.businessId || null;
    this.employeeId = data.employeeId || null; // Employee ID if role is "employee"
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.lastLogin = data.lastLogin || null;
    this.deletedAt = data.deletedAt || null;
  }

  // Create new user in Firestore
  static async create(userData) {
    try {
      const user = new User({
        ...userData,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const userRef = await db.collection(COLLECTIONS.USERS).add({
        name: user.name,
        email: user.email,
        role: user.role,
        businessId: user.businessId,
        employeeId: user.employeeId,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLogin: user.lastLogin,
        deletedAt: user.deletedAt,
      });

      return { uid: userRef.id, ...user };
    } catch (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  // Get user by UID (only active users)
  static async findById(uid) {
    try {
      const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();

      if (!userDoc.exists) {
        return null;
      }

      const userData = userDoc.data();

      // Check if user is active
      if (!userData.isActive) {
        return null;
      }

      return {
        uid: userDoc.id,
        ...userData,
      };
    } catch (error) {
      throw new Error(`Failed to find user by ID: ${error.message}`);
    }
  }

  // Get user by email (only active users)
  static async findByEmail(email) {
    try {
      const usersRef = db.collection(COLLECTIONS.USERS);
      const snapshot = await usersRef
        .where("email", "==", email.toLowerCase())
        .where("isActive", "==", true)
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
      throw new Error(`Failed to find user by email: ${error.message}`);
    }
  }

  // Get all users (only active users)
  static async findAll() {
    try {
      const usersSnapshot = await db
        .collection(COLLECTIONS.USERS)
        .where("isActive", "==", true)
        .get();
      const users = [];

      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        users.push({
          uid: doc.id,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          isActive: userData.isActive,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
          lastLogin: userData.lastLogin,
        });
      });

      return users;
    } catch (error) {
      throw new Error(`Failed to get all users: ${error.message}`);
    }
  }

  // Update user
  static async updateById(uid, updateData) {
    try {
      const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();

      if (!userDoc.exists) {
        return null;
      }

      const updateFields = {
        ...updateData,
        updatedAt: new Date().toISOString(),
      };

      await db.collection(COLLECTIONS.USERS).doc(uid).update(updateFields);

      // Return updated user data
      const updatedDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
      return {
        uid: updatedDoc.id,
        ...updatedDoc.data(),
      };
    } catch (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  // Soft delete user (mark as inactive)
  static async deleteById(uid) {
    try {
      const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();

      if (!userDoc.exists) {
        return null;
      }

      const userData = userDoc.data();

      // Check if user is already deleted
      if (!userData.isActive) {
        return null;
      }

      // Soft delete: mark as inactive
      const deletedAt = new Date().toISOString();
      await db.collection(COLLECTIONS.USERS).doc(uid).update({
        isActive: false,
        deletedAt: deletedAt,
        updatedAt: deletedAt,
      });

      return {
        uid: userDoc.id,
        ...userData,
        isActive: false,
        deletedAt: deletedAt,
      };
    } catch (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  // Update last login
  static async updateLastLogin(uid) {
    try {
      const lastLogin = new Date().toISOString();
      await db.collection(COLLECTIONS.USERS).doc(uid).update({
        lastLogin,
        updatedAt: lastLogin,
      });
      return lastLogin;
    } catch (error) {
      throw new Error(`Failed to update last login: ${error.message}`);
    }
  }

  // Check if user exists by email
  static async existsByEmail(email) {
    try {
      const user = await this.findByEmail(email);
      return user !== null;
    } catch (error) {
      throw new Error(`Failed to check user existence: ${error.message}`);
    }
  }

  // Get deleted users (for admin purposes)
  static async findDeleted() {
    try {
      const usersSnapshot = await db
        .collection(COLLECTIONS.USERS)
        .where("isActive", "==", false)
        .get();
      const users = [];

      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        users.push({
          uid: doc.id,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          isActive: userData.isActive,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
          lastLogin: userData.lastLogin,
          deletedAt: userData.deletedAt,
        });
      });

      return users;
    } catch (error) {
      throw new Error(`Failed to get deleted users: ${error.message}`);
    }
  }

  // Restore deleted user
  static async restoreById(uid) {
    try {
      const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();

      if (!userDoc.exists) {
        return null;
      }

      const userData = userDoc.data();

      // Check if user is actually deleted
      if (userData.isActive) {
        return null;
      }

      // Restore user
      const restoredAt = new Date().toISOString();
      await db.collection(COLLECTIONS.USERS).doc(uid).update({
        isActive: true,
        deletedAt: null,
        updatedAt: restoredAt,
      });

      return {
        uid: userDoc.id,
        ...userData,
        isActive: true,
        deletedAt: null,
        updatedAt: restoredAt,
      };
    } catch (error) {
      throw new Error(`Failed to restore user: ${error.message}`);
    }
  }

  // Sanitize user data (remove password and sensitive info)
  static sanitize(userData) {
    const { password, ...sanitizedData } = userData;
    return sanitizedData;
  }
}

module.exports = User;
