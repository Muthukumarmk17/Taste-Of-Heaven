require("dotenv").config();
const analyzeReview = require("./utils/analyzeReview");

analyzeReview("Very tasty but too spicy for me", 4)
  .then(console.log)
  .catch(console.error);