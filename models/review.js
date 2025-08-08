// review.js
const { Schema, model } = require("mongoose");

const reviewSchema = new Schema({
  comment: String,
  rating: {
    type: Number,
    min: 1,
    max: 5,
  },
  // ✅ Reference to the user who posted this review
  author: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // ✅ Reference to the listing this review belongs to (optional but helpful)
  listing: {
    type: Schema.Types.ObjectId,
    ref: "Listing",
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

module.exports = model("Review", reviewSchema);
