// models/LikedRecipe.js
const mongoose = require("mongoose");

const likedRecipeSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  recipes: [
    {
      name: { type: String, required: true },
      rating: { type: Number, required: true },
      cuisine: { type: String, required: true },
      image: { type: String, required: true },
    },
  ],
});

const LikedRecipe = mongoose.model("LikedRecipe", likedRecipeSchema);

module.exports = LikedRecipe;
