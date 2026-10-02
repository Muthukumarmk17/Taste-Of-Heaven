// models/Comment.js
const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  recipeName: String,
  username: String,
  email: String,
  rating: Number,
  comments: String,
}, { timestamps: true });

const Comment = mongoose.model("Comment", commentSchema);

module.exports = Comment;
