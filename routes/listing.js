const express = require("express");
const router = express.Router();
const Listing = require("../models/listings");
const wrapAsync = require("../utils/wrapAsync");
const { listingSchema } = require("../schema");
const ExpressError = require("../utils/ExpressError");
const { requireLogin, isListingAuthor } = require("../middlewares/auth");
const { storage, cloudinary } = require("../cloudConfig");
const multer = require("multer");
const upload = multer({ storage }); 

// const fs = require("fs");
// const path = require("path");

// -----------------------------
// Middleware to validate listing data using Joi schema
// -----------------------------
const validateListing = (req, res, next) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    throw new ExpressError(
      400,
      "Request body is empty. Please provide listing details."
    );
  }

  const { error, value } = listingSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    const errMsg = error.details.map((el) => el.message).join(", ");
    throw new ExpressError(400, errMsg);
  }

  req.body = value;
  next();
};

// -----------------------------
// Index Route - Show all listings
// -----------------------------
router.get(
  "/",
  wrapAsync(async (req, res) => {
    const allListings = await Listing.find({}).populate("reviews");

    const listingsWithAvgRatings = allListings.map((listing) => {
      let avgRating = 0;
      if (listing.reviews.length > 0) {
        const total = listing.reviews.reduce((sum, r) => sum + r.rating, 0);
        avgRating = total / listing.reviews.length;
      }
      return {
        ...listing.toObject(),
        rating: avgRating,
      };
    });

    res.render("listings/index", { allListings: listingsWithAvgRatings });
  })
);

// -----------------------------
// New Route - Render form to create new listing
// -----------------------------
router.get("/new", requireLogin, (req, res) => {
  res.render("listings/new");
});

// -----------------------------
// Create Route - Add new listing to DB
// -----------------------------
router.post(
  "/",
  requireLogin,
  upload.single("image"),
  validateListing,
  wrapAsync(async (req, res) => {
    const newListing = new Listing({
      ...req.body,
      author: req.user._id,
    });

    if (req.file) {
      newListing.image = {
        url: req.file.path,
        filename: req.file.filename,
      };
    } else {
      // 👇 Add default image if no file is uploaded
      newListing.image = {
        url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
        filename: "default-image",
      };
    }

    await newListing.save();
    req.flash("success", "New Listing Created!");
    res.redirect("/listings");
  })
);

// -----------------------------
// Show Route - Show single listing with populated author and reviews
// -----------------------------
router.get(
  "/:id",
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id)
      .populate({
        path: "reviews",
        populate: { path: "author", select: "username" },
      })
      .populate("author", "username");

    if (!listing) {
      req.flash("error", "Listing not found!");
      return res.redirect("/listings");
    }

    res.render("listings/show", { listing });
  })
);

// -----------------------------
// Edit Route - Show form to edit listing
// -----------------------------
router.get(
  "/:id/edit",
  requireLogin,
  isListingAuthor,
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) {
      req.flash("error", "Listing you requested does not exist!");
      return res.redirect("/listings");
    }

    res.render("listings/edit", { listing });
  })
);

// -----------------------------
// Update Route - Update listing in DB
// -----------------------------
router.put(
  "/:id",
  requireLogin,
  isListingAuthor,
  upload.single("image"), // 👉 handle optional image upload
  validateListing,
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) {
      req.flash("error", "Listing not found!");
      return res.redirect("/listings");
    }

    // Update fields
    listing.title = req.body.title;
    listing.description = req.body.description;
    listing.price = req.body.price;
    listing.location = req.body.location;
    listing.country = req.body.country;

    // If new image uploaded, replace the old one
    if (req.file) {
      // Delete old Cloudinary image if it exists and is not default
      if (listing.image && listing.image.filename !== "default-image") {
        await cloudinary.uploader.destroy(listing.image.filename);
      }

      // Set new uploaded image
      listing.image = {
        url: req.file.path,
        filename: req.file.filename,
      };
    } else if (!listing.image || !listing.image.url) {
      // No existing image and no new image uploaded → set default image
      listing.image = {
        url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
        filename: "default-image",
      };
    }

    await listing.save();
    req.flash("success", "Listing Updated!");
    res.redirect(`/listings/${id}`);
  })
);

// -----------------------------
// Delete Route - Delete listing + associated image
// -----------------------------
router.delete(
  "/:id",
  requireLogin,
  isListingAuthor,
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) {
      req.flash("error", "Listing not found!");
      return res.redirect("/listings");
    }

    // Delete image from Cloudinary if not default image
    if (listing.image && listing.image.filename !== "default-image") {
      await cloudinary.uploader.destroy(listing.image.filename);
    }

    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing Deleted!");
    res.redirect("/listings");
  })
);

module.exports = router;
