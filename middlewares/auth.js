const { validateToken } = require("../service/auth");
const Listing = require("../models/listings");
const Review = require("../models/review");

function isLoggedIn(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) {
      req.user = null;
      return next();
    }

    const user = validateToken(token);
    req.user = user;
    next();
  } catch (err) {
    req.user = null;
    next();
  }
}

function requireLogin(req, res, next) {
  if (!req.user) {
    req.flash("error", "You must be logged in to do that!");
    return res.redirect("/user/login");
  }
  next();
}

async function isListingAuthor(req, res, next) {
  const { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing not found!");
    return res.redirect("/listings");
  }
  // ✅ Use author instead of owner
  if (!req.user || !listing.author || !listing.author.equals(req.user._id)) {
    req.flash("error", "You do not have permission to do that!");
    return res.redirect(`/listings/${id}`);
  }
  next();
}

async function isReviewAuthor(req, res, next) {
  const { reviewId, id } = req.params;
  const review = await Review.findById(reviewId);

  if (!review) {
    req.flash("error", "Review not found!");
    return res.redirect(`/listings/${id}`);
  }

  if (!req.user || !review.author || !review.author.equals(req.user._id)) {
    req.flash("error", "You do not have permission to delete this review!");
    return res.redirect(`/listings/${id}`);
  }

  next();
}

module.exports = {
  isLoggedIn,
  requireLogin,
  isListingAuthor,
  isReviewAuthor,
};
