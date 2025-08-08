require("dotenv").config({ path: "../.env" });

const mongoose = require("mongoose");
const initData = require("./data");
const Listing = require("../models/listings");
const { connectToMongoDb } = require("../connection");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { tmpdir } = require("os");
const { v4: uuidv4 } = require("uuid");
const { cloudinary } = require("../cloudConfig");

const AUTHOR_ID = "6894c2728d5749f4ee2d42c0"; // Your user ID

connectToMongoDb(process.env.MongoURL_Local)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Helper: Upload a remote image URL to Cloudinary
const uploadToCloudinary = async (imageUrl) => {
  try {
    const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data, "binary");

    const tempImagePath = path.join(tmpdir(), uuidv4() + ".jpg");
    fs.writeFileSync(tempImagePath, buffer);

    const uploaded = await cloudinary.uploader.upload(tempImagePath, {
      folder: "wanderlust_DEV",
    });

    fs.unlinkSync(tempImagePath);

    return {
      url: uploaded.secure_url,
      filename: uploaded.public_id,
    };
  } catch (err) {
    console.warn("⚠️ Cloudinary upload failed. Using original image URL.");
    return null;
  }
};

const initDB = async () => {
  try {
    await Listing.deleteMany({});
    console.log("🧹 Old listings deleted");

    const finalListings = [];
    console.log(`📦 Seeding ${initData.data.length} listings...`);

    for (let listing of initData.data) {
      let uploadedImage = await uploadToCloudinary(listing.image.url);

      if (!uploadedImage) {
        uploadedImage = {
          url: listing.image.url,
          filename: listing.image.filename || "fallback",
        };
      }

      finalListings.push({
        ...listing,
        image: uploadedImage,
        author: AUTHOR_ID,
      });
    }

    await Listing.insertMany(finalListings);
    console.log("✅ Listings seeded with Cloudinary images");
  } catch (err) {
    console.error("❌ Error seeding DB:", err);
  }
};

initDB();
