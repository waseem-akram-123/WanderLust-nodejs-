// require("dotenv").config({ path: "../.env" });

// const mongoose = require("mongoose");
// const initData = require("./data");
// const Listing = require("../models/listings");
// const { connectToMongoDb } = require("../connection");
// const axios = require("axios");
// const fs = require("fs");
// const path = require("path");
// const { tmpdir } = require("os");
// const { v4: uuidv4 } = require("uuid");
// const { cloudinary } = require("../cloudConfig");

// const AUTHOR_ID = "6894c2728d5749f4ee2d42c0"; // Your user ID

// connectToMongoDb(process.env.MongoURL_Local)
//   .then(() => console.log("✅ MongoDB connected"))
//   .catch((err) => console.error("❌ MongoDB connection error:", err));

// // Helper: Upload a remote image URL to Cloudinary
// const uploadToCloudinary = async (imageUrl) => {
//   try {
//     const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
//     const buffer = Buffer.from(response.data, "binary");

//     const tempImagePath = path.join(tmpdir(), uuidv4() + ".jpg");
//     fs.writeFileSync(tempImagePath, buffer);

//     const uploaded = await cloudinary.uploader.upload(tempImagePath, {
//       folder: "wanderlust_DEV",
//     });

//     fs.unlinkSync(tempImagePath);

//     return {
//       url: uploaded.secure_url,
//       filename: uploaded.public_id,
//     };
//   } catch (err) {
//     console.warn("⚠️ Cloudinary upload failed. Using original image URL.");
//     return null;
//   }
// };

// const initDB = async () => {
//   try {
//     await Listing.deleteMany({});
//     console.log("🧹 Old listings deleted");

//     const finalListings = [];
//     console.log(`📦 Seeding ${initData.data.length} listings...`);

//     for (let listing of initData.data) {
//       let uploadedImage = await uploadToCloudinary(listing.image.url);

//       if (!uploadedImage) {
//         uploadedImage = {
//           url: listing.image.url,
//           filename: listing.image.filename || "fallback",
//         };
//       }

//       finalListings.push({
//         ...listing,
//         image: uploadedImage,
//         author: AUTHOR_ID,
//       });
//     }

//     await Listing.insertMany(finalListings);
//     console.log("✅ Listings seeded with Cloudinary images");
//   } catch (err) {
//     console.error("❌ Error seeding DB:", err);
//   }
// };

// initDB();


// require("dotenv").config({ path: "../.env" });
// const mongoose = require("mongoose");
// const Listing = require("../models/listings");
// const { connectToMongoDb } = require("../connection");
// const axios = require("axios");

// // 1. Connect to Mongo Atlas, not local
// connectToMongoDb(process.env.MongoURL_Local)
//   .then(() => console.log("✅ MongoDB Atlas connected"))
//   .catch((err) => console.error("❌ Connection error:", err));

// async function updateGeometry() {
//   try {
//     const listings = await Listing.find({});
//     console.log(`📦 Found ${listings.length} listings`);

//     for (let listing of listings) {
//       if (!listing.geometry || !listing.geometry.coordinates?.length) {
//         try {
//           // 2. Get coordinates from OpenStreetMap Nominatim (free)
//           const geoRes = await axios.get("https://nominatim.openstreetmap.org/search", {
//             params: {
//               q: `${listing.location}, ${listing.country}`,
//               format: "json",
//               limit: 1
//             },
//             headers: { "User-Agent": "wanderlust-app/1.0" }
//           });

//           if (geoRes.data.length) {
//             const { lon, lat } = geoRes.data[0];
//             listing.geometry = {
//               type: "Point",
//               coordinates: [parseFloat(lon), parseFloat(lat)] // [lng, lat]
//             };
//             await listing.save();
//             console.log(`✅ Updated geometry for: ${listing.title}`);
//           } else {
//             console.warn(`⚠️ No coords found for: ${listing.title}`);
//           }

//         } catch (err) {
//           console.error(`❌ Failed to update ${listing.title}:`, err.message);
//         }
//       }
//     }

//     console.log("🎯 Geometry update complete");
//     process.exit();
//   } catch (err) {
//     console.error("❌ Error:", err);
//   }
// }

// updateGeometry();



require("dotenv").config({ path: "../.env" });

const mongoose = require("mongoose");
const initData = require("./data");
const Listing = require("../models/listings");
const { connectToMongoDb } = require("../connection");
const axios = require("axios");

const AUTHOR_ID = "6894c2728d5749f4ee2d42c0"; // Your user ID

connectToMongoDb(process.env.MongoURL_Local)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

const initDB = async () => {
  try {
    await Listing.deleteMany({});
    console.log("🧹 Old listings deleted");

    const finalListings = [];

    for (let listing of initData.data) {
      // Fetch coordinates from OpenStreetMap
      let geometry = { type: "Point", coordinates: [] };
      try {
        const geoRes = await axios.get("https://nominatim.openstreetmap.org/search", {
          params: {
            q: `${listing.location}, ${listing.country}`,
            format: "json",
            limit: 1,
          },
          headers: { "User-Agent": "wanderlust-app/1.0" }
        });

        if (geoRes.data.length) {
          const { lon, lat } = geoRes.data[0];
          geometry.coordinates = [parseFloat(lon), parseFloat(lat)]; // [lng, lat]
        }
      } catch (err) {
        console.warn(`⚠️ Failed to get geometry for ${listing.title}`);
      }

      // Push listing with geometry and no Cloudinary
      finalListings.push({
        ...listing,
        geometry,
        author: AUTHOR_ID
      });
    }

    await Listing.insertMany(finalListings);
    console.log("✅ Listings seeded with geometry (no Cloudinary)");
    process.exit();
  } catch (err) {
    console.error("❌ Error seeding DB:", err);
    process.exit(1);
  }
};

initDB();
