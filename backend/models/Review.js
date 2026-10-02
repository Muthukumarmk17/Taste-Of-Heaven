// models/Review.js
const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  recipeName: { type: String, required: true },
  username: { type: String, required: true },
  email: { type: String, required: true },
  rating: { type: Number, required: true },
  comments: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Review", reviewSchema);
