const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email},
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

// CREATE STAFF (OWNER)
exports.createStaff = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.create({
      email,
      password,
      role: "STAFF",
      mustChangePassword: true,
    });

    res.status(201).json({
      id: user._id,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Email already exists" });
    }
    res.status(500).json({ message: "Server error" });
  }
};

// CHANGE OWN PASSWORD (OWNER + STAFF)
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Wrong password" });
    }

    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

// RESET STAFF PASSWORD (OWNER ONLY)
exports.resetStaffPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 🔐 SECURITY: owner password cannot be reset
    if (user.role === "OWNER") {
      return res.status(403).json({ message: "Cannot reset owner password" });
    }

    user.password = newPassword;
    user.mustChangePassword = true;
    await user.save();

    res.json({ message: "Staff password reset" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

// GET ALL USERS (OWNER ONLY)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

// user.controller.js
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE STAFF (OWNER ONLY)
exports.deleteStaff = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    // prevent deleting owner
    if (user.role === "OWNER") {
      return res.status(403).json({ message: "Cannot delete owner" });
    }

    await user.deleteOne();
    res.json({ message: "Staff deleted successfully" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

// GET STAFF ONLY (OWNER ONLY)
exports.getStaff = async (req, res) => {
  try {
    const staff = await User.find({ role: "STAFF" }).select("-password");
    res.json(staff);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};
