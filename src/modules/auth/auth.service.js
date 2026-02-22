const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { db, COLLECTIONS } = require("../../config/firebase");
const User = require("../../../models/User");
const Business = require("../../../models/Business");
const { Employee } = require("../../../models/Employee");

const SALT_ROUNDS = 12;

const generateToken = (uid, email, role) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  return jwt.sign({ uid, email, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  });
};

const getPasswordHashForUser = async (uid) => {
  // Legacy location: users/{uid}.password
  const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
  if (userDoc.exists) {
    const data = userDoc.data() || {};
    if (data.password) return data.password;
  }

  // Newer/employee location: passwords/{uid}.password
  try {
    const passwordDoc = await db
      .collection(COLLECTIONS.PASSWORDS)
      .doc(uid)
      .get();

    if (passwordDoc.exists) {
      const data = passwordDoc.data() || {};
      if (data.password) return data.password;
    }
  } catch (error) {
    // Don't leak internal details; caller will handle invalid credentials.
    console.error("Password lookup error:", error);
  }

  return null;
};

const registerOwner = async ({ name, email, password }) => {
  const normalizedEmail = email.toLowerCase();

  const existingUser = await User.findByEmail(normalizedEmail);
  if (existingUser) {
    return {
      status: 400,
      body: {
        error: "User already exists",
        message: "A user with this email already exists",
      },
    };
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const newBusiness = await Business.create({
    name: "Yeni İşletme",
    address: "",
    phone: "",
    email: normalizedEmail,
    logoUrl: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
    ownerId: null,
  });

  const newUser = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    role: "owner",
    businessId: newBusiness.id,
  });

  await Business.updateById(newBusiness.id, {
    ownerId: newUser.uid,
  });

  // Keep existing behavior: store hashed password under user doc
  await db.collection(COLLECTIONS.USERS).doc(newUser.uid).update({
    password: hashedPassword,
  });

  const token = generateToken(newUser.uid, newUser.email, newUser.role);

  return {
    status: 201,
    body: {
      message: "User and business created successfully",
      user: User.sanitize(newUser),
      business: {
        ...Business.sanitize(newBusiness),
        ownerId: newUser.uid,
      },
      token,
    },
  };
};

const login = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase();

  const user = await User.findByEmail(normalizedEmail);
  if (!user) {
    return {
      status: 400,
      body: {
        error: "Invalid credentials",
        message: "Email or password is incorrect",
      },
    };
  }

  const passwordHash = await getPasswordHashForUser(user.uid);
  if (!passwordHash) {
    return {
      status: 400,
      body: {
        error: "Invalid credentials",
        message: "Email or password is incorrect",
      },
    };
  }

  const isPasswordValid = await bcrypt.compare(password, passwordHash);
  if (!isPasswordValid) {
    return {
      status: 400,
      body: {
        error: "Invalid credentials",
        message: "Email or password is incorrect",
      },
    };
  }

  const lastLogin = await User.updateLastLogin(user.uid);
  const token = generateToken(user.uid, user.email, user.role);

  return {
    status: 200,
    body: {
      message: "Login successful",
      user: {
        uid: user.uid,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: lastLogin,
      },
      token,
    },
  };
};

const getMe = async (uid) => {
  const user = await User.findById(uid);
  if (!user) {
    return {
      status: 404,
      body: {
        error: "User not found",
        message: "User does not exist",
      },
    };
  }

  return {
    status: 200,
    body: {
      user: User.sanitize(user),
    },
  };
};

const getAllUsers = async () => {
  const users = await User.findAll();
  return {
    status: 200,
    body: {
      message: "Users retrieved successfully",
      users: users,
      count: users.length,
    },
  };
};

const getDeletedUsers = async () => {
  const deletedUsers = await User.findDeleted();
  return {
    status: 200,
    body: {
      message: "Deleted users retrieved successfully",
      users: deletedUsers,
      count: deletedUsers.length,
    },
  };
};

const updateProfile = async (uid, { name, role }) => {
  const updateData = {};
  if (name !== undefined) updateData.name = name.trim();
  if (role !== undefined) updateData.role = role;

  if (Object.keys(updateData).length === 0) {
    return {
      status: 400,
      body: {
        error: "No update data provided",
        message: "Please provide name or role to update",
      },
    };
  }

  const updatedUser = await User.updateById(uid, updateData);
  if (!updatedUser) {
    return {
      status: 404,
      body: {
        error: "User not found",
        message: "User does not exist",
      },
    };
  }

  return {
    status: 200,
    body: {
      message: "User updated successfully",
      user: User.sanitize(updatedUser),
    },
  };
};

const deleteUserByUid = async (uid) => {
  const deletedUser = await User.deleteById(uid);
  if (!deletedUser) {
    return {
      status: 404,
      body: {
        error: "User not found",
        message: "User does not exist or is already deleted",
      },
    };
  }

  return {
    status: 200,
    body: {
      message: "User deleted successfully (soft delete)",
      deletedUser: User.sanitize(deletedUser),
    },
  };
};

const restoreUserByUid = async (uid) => {
  const restoredUser = await User.restoreById(uid);
  if (!restoredUser) {
    return {
      status: 404,
      body: {
        error: "User not found",
        message: "User does not exist or is not deleted",
      },
    };
  }

  return {
    status: 200,
    body: {
      message: "User restored successfully",
      restoredUser: User.sanitize(restoredUser),
    },
  };
};

const registerEmployee = async ({
  managerId,
  businessId,
  employeeId,
  email,
  password,
}) => {
  const normalizedEmail = email.toLowerCase();

  const employee = await Employee.findById(managerId, employeeId);
  if (!employee) {
    return {
      status: 404,
      body: {
        error: "Employee not found",
        message: "Employee does not exist or does not belong to you",
      },
    };
  }

  const existingUser = await User.findByEmail(normalizedEmail);
  if (existingUser) {
    return {
      status: 400,
      body: {
        error: "User already exists",
        message: "A user with this email already exists",
      },
    };
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const newUser = await User.create({
    name: `${employee.firstName} ${employee.lastName}`,
    email: normalizedEmail,
    role: "employee",
    businessId: businessId,
    employeeId: employeeId,
  });

  await db.collection(COLLECTIONS.PASSWORDS).doc(newUser.uid).set({
    password: hashedPassword,
    createdAt: new Date().toISOString(),
  });

  await Employee.updateById(managerId, employeeId, {
    userId: newUser.uid,
    email: normalizedEmail,
  });

  const token = generateToken(newUser.uid, newUser.email, newUser.role);

  return {
    status: 201,
    body: {
      message: "Employee user created successfully",
      user: User.sanitize(newUser),
      token,
    },
  };
};

module.exports = {
  generateToken,
  registerOwner,
  login,
  getMe,
  getAllUsers,
  getDeletedUsers,
  updateProfile,
  deleteUserByUid,
  restoreUserByUid,
  registerEmployee,
};
