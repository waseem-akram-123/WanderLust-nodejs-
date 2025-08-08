// review.js
const express = require("express");
const router = express.Router({ mergeParams: true }); // ✅ fix here  without this we were unable to submit review
const Review = require("../models/review");
const Listing = require("../models/listings");
const wrapAsync = require("../utils/wrapAsync");
const { reviewSchema } = require("../schema");
const ExpressError = require("../utils/ExpressError");
const { requireLogin,isReviewAuthor } = require("../middlewares/auth");


const validateReview = (req, res, next) => {
  const { error } = reviewSchema.validate(req.body);
  if (error) {
    const errMsg = error.details.map((el) => el.message).join(", ");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

router.post(
  "/",
  requireLogin,         // ✅ Only logged-in users can post reviews
  validateReview,
  wrapAsync(async (req, res) => {
    let listing = await Listing.findById(req.params.id);
    if (!listing) throw new ExpressError(404, "Listing not found");

    let newReview = new Review(req.body.review);
    
    // Optional: save who made the review
    newReview.author = req.user._id;

    listing.reviews.push(newReview);

    await newReview.save();
    await listing.save();
    req.flash("success", "New Review Added!");
    res.redirect(`/listings/${listing._id}`);
  })
);

router.delete(
  "/:reviewId",
  requireLogin,
  isReviewAuthor,
  wrapAsync(async (req, res) => {
    const { id, reviewId } = req.params;
    await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);
    req.flash("success", "Review Deleted!");
    res.redirect(`/listings/${id}`);
  })
);


module.exports = router;
