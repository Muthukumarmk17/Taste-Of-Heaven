const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

  // =====================================================
  // USERNAME
  // =====================================================

  username: {
    type: String,
    required: true,
  },

  // =====================================================
  // EMAIL
  // =====================================================

  email: {
    type: String,
    required: true,
    unique: true,
  },

  // =====================================================
  // PASSWORD
  // =====================================================

  password: {
    type: String,
    required: true,
  },

  // =====================================================
  // PROFILE PICTURE
  // =====================================================

  profilePicture: {
    type: String,
    default: "/default-profile.png",
  },

  // =====================================================
  // ROLE
  // =====================================================

  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },

});

const User = mongoose.model(
  "User",
  userSchema
);

module.exports = User;