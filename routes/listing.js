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
const axios = require("axios");

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
// Index Route
// -----------------------------
router.get(
  "/",
  wrapAsync(async (req, res) => {
    const searchQuery = req.query.search || "";

    // Fetch all listings with populated reviews
    let allListings = await Listing.find({}).populate("reviews");

    // If there is a search query, filter listings by title (case-insensitive substring match)
    if (searchQuery) {
      const regex = new RegExp(searchQuery, "i");
      allListings = allListings.filter((listing) => regex.test(listing.title));
    }

    // Calculate average rating for each listing
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

    res.render("listings/index", { allListings: listingsWithAvgRatings, searchQuery });
  })
);


// -----------------------------
// New Route
// -----------------------------
router.get("/new", requireLogin, (req, res) => {
  res.render("listings/new");
});

// -----------------------------
// Create Route
// -----------------------------
router.post(
  "/",
  requireLogin,
  upload.single("image"),
  validateListing,
  wrapAsync(async (req, res) => {
    const { location, country } = req.body;

    // Default geometry in case geocoding fails
    let geometry = {
      type: "Point",
      coordinates: [0, 0], // Null Island fallback
    };

    try {
      const geoRes = await axios.get(
        `https://nominatim.openstreetmap.org/search`,
        {
          params: {
            q: `${location}, ${country}`,
            format: "json",
            limit: 1,
          },
        }
      );

      if (geoRes.data.length > 0) {
        geometry = {
          type: "Point",
          coordinates: [
            parseFloat(geoRes.data[0].lon),
            parseFloat(geoRes.data[0].lat),
          ],
        };
      } else {
        req.flash(
          "error",
          "Could not find coordinates for that location. Using default map position."
        );
      }
    } catch (err) {
      console.error("Geocoding failed:", err.message);
      req.flash(
        "error",
        "Could not fetch coordinates due to a server issue. Using default map position."
      );
    }

    // Create listing with geometry already assigned
    const newListing = new Listing({
      ...req.body,
      author: req.user._id,
      geometry,
    });

    // Handle image upload
    if (req.file) {
      newListing.image = {
        url: req.file.path,
        filename: req.file.filename,
      };
    } else {
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
// Show Route
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
// Edit Route
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
// Update Route
// -----------------------------

router.put(
  "/:id",
  requireLogin,
  isListingAuthor,
  upload.single("image"),
  validateListing,
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const { location, country } = req.body;
    const listing = await Listing.findById(id);

    if (!listing) {
      req.flash("error", "Listing not found!");
      return res.redirect("/listings");
    }

    // Default geometry (Null Island fallback)
    let newGeometry = {
      type: "Point",
      coordinates: [0, 0],
    };

    // Try geocoding new location
    try {
      const geoRes = await axios.get(
        `https://nominatim.openstreetmap.org/search`,
        {
          params: {
            q: `${location}, ${country}`,
            format: "json",
            limit: 1,
          },
        }
      );

      if (geoRes.data.length > 0) {
        newGeometry = {
          type: "Point",
          coordinates: [
            parseFloat(geoRes.data[0].lon),
            parseFloat(geoRes.data[0].lat),
          ],
        };
      } else {
        req.flash(
          "error",
          "Could not find coordinates for that location. Using default map position."
        );
      }
    } catch (err) {
      console.error("Geocoding failed:", err.message);
      req.flash(
        "error",
        "Could not fetch coordinates due to a server issue. Using default map position."
      );
    }

    // Assign geometry (always something, never null)
    listing.geometry = newGeometry;

    // Update basic fields
    listing.title = req.body.title;
    listing.description = req.body.description;
    listing.price = req.body.price;
    listing.location = location;
    listing.country = country;

    // Image handling
    if (req.file) {
      if (listing.image && listing.image.filename !== "default-image") {
        await cloudinary.uploader.destroy(listing.image.filename);
      }
      listing.image = {
        url: req.file.path,
        filename: req.file.filename,
      };
    } else if (!listing.image || !listing.image.url) {
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
// Delete Route
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

    if (listing.image && listing.image.filename !== "default-image") {
      await cloudinary.uploader.destroy(listing.image.filename);
    }

    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing Deleted!");
    res.redirect("/listings");
  })
);

module.exports = router;
