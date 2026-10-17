
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  // USERNAME
  username: {
    type: String,
    required: true,
    trim: true,
  },

  // EMAIL
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },

  // PASSWORD
  password: {
    type: String,
    required: true,
  },

  // PROFILE PICTURE
  profilePicture: {
    type: String,
    default: "/default-profile.png",
  },

  // ROLE
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },

  // EMAIL VERIFICATION
  isVerified: {
    type: Boolean,
    default: false,
  },

  // OTP VERIFICATION DETAILS
  emailVerificationOtpHash: {
    type: String,
    default: undefined,
  },

  emailVerificationOtpExpires: {
    type: Date,
    default: undefined,
  },

  emailVerificationAttempts: {
    type: Number,
    default: 0,
  },

  // WELCOME EMAIL TRACKING
  welcomeEmailSent: {
    type: Boolean,
    default: false,
  },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
