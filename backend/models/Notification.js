const mongoose = require("mongoose");

const recipientSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    status: { type: String, enum: ["pending", "sent", "failed"], default: "pending" },
    isRead: { type: Boolean, default: false },
  },
  { _id: false }
);

const notificationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["recipe", "update"], required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    recipeId: { type: mongoose.Schema.Types.ObjectId, ref: "Recipe", default: null },
    recipeName: { type: String, default: "" },
    recipeImage: { type: String, default: "" },
    cuisine: { type: String, default: "" },
    rating: { type: Number, default: 0 },
    recipients: { type: [recipientSchema], default: [] },
  },
  { timestamps: true }
);

notificationSchema.index({ "recipients.email": 1, createdAt: -1 });
notificationSchema.index(
  { type: 1, recipeId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      type: "recipe",
      recipeId: { $type: "objectId" },
    },
  }
);

module.exports = mongoose.model("Notification", notificationSchema);
