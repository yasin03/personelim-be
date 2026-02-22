const authService = require("./auth.service");

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const result = await authService.registerOwner({ name, email, password });
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      error: "Registration failed",
      message: "An error occurred during user registration",
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      error: "Login failed",
      message: "An error occurred during login",
    });
  }
};

const me = async (req, res) => {
  try {
    const result = await authService.getMe(req.user.uid);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("Get user error:", error);
    return res.status(500).json({
      error: "Server error",
      message: "An error occurred while fetching user information",
    });
  }
};

const logout = (req, res) => {
  return res.status(200).json({
    message: "Başarıyla çıkış yapıldı",
    success: true,
  });
};

const getUsers = async (req, res) => {
  try {
    const result = await authService.getAllUsers();
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("Get users error:", error);
    return res.status(500).json({
      error: "Server error",
      message: "An error occurred while fetching users",
    });
  }
};

const getDeletedUsers = async (req, res) => {
  try {
    const result = await authService.getDeletedUsers();
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("Get deleted users error:", error);
    return res.status(500).json({
      error: "Server error",
      message: "An error occurred while fetching deleted users",
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, role } = req.body;
    const result = await authService.updateProfile(req.user.uid, {
      name,
      role,
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("Update user error:", error);
    return res.status(500).json({
      error: "Update failed",
      message: "An error occurred while updating user",
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { uid } = req.params;

    if (uid === req.user.uid) {
      return res.status(400).json({
        error: "Cannot delete yourself",
        message: "You cannot delete your own account",
      });
    }

    const result = await authService.deleteUserByUid(uid);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("Delete user error:", error);
    return res.status(500).json({
      error: "Delete failed",
      message: "An error occurred while deleting user",
    });
  }
};

const restoreUser = async (req, res) => {
  try {
    const { uid } = req.params;
    const result = await authService.restoreUserByUid(uid);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("Restore user error:", error);
    return res.status(500).json({
      error: "Restore failed",
      message: "An error occurred while restoring user",
    });
  }
};

const registerEmployee = async (req, res) => {
  try {
    const { employeeId, email, password } = req.body;
    const managerId = req.user.uid;
    const businessId = req.user.userData.businessId;

    const result = await authService.registerEmployee({
      managerId,
      businessId,
      employeeId,
      email,
      password,
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("Employee registration error:", error);
    return res.status(500).json({
      error: "Registration failed",
      message: "An error occurred while creating employee user",
    });
  }
};

const adminOnly = (req, res) => {
  return res.status(200).json({
    message: "Bu sadece admin kullanıcılar için erişilebilir endpoint",
    user: {
      uid: req.user.uid,
      email: req.user.email,
      role: req.user.role,
    },
  });
};

module.exports = {
  register,
  login,
  me,
  logout,
  getUsers,
  getDeletedUsers,
  updateProfile,
  deleteUser,
  restoreUser,
  registerEmployee,
  adminOnly,
};
