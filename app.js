require("dotenv").config();

const express = require("express");
const app = express();
const PORT = 3000;
// const { connectToMongoDb } = require("./connection");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const flash = require("connect-flash");
const cookieParser = require("cookie-parser");
const { isLoggedIn } = require("./middlewares/auth");
const mongoose = require("mongoose");

const listingRouter = require("./routes/listing");
const reviewRouter = require("./routes/review");
const userRouter = require("./routes/user");

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => {
    console.log("MongoDB is connected");
    // Start your server here after a successful database connection
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Error in Mongoose connection:", err);
  });

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Defining config
const sessionOptions = {
  secret: "waseeem@123",
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
};

// ✅ Using config in correct order
app.use(cookieParser());
app.use(session(sessionOptions));
app.use(flash());
app.use(isLoggedIn);

// This middleware takes the req.user (which was set by your isLoggedIn middleware)
// and makes it available to all EJS templates as currentUser.
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  next();
});

app.use((req, res, next) => {
  const successMessages = req.flash("success");
  const errorMessages = req.flash("error");

  res.locals.success =
    successMessages.length > 0 ? successMessages[0] : undefined;
  res.locals.error = errorMessages.length > 0 ? errorMessages[0] : undefined;

  next();
});

// ✅ Add the root redirect here
app.get("/", (req, res) => {
  res.redirect("/listings");
});

app.use("/user", userRouter);
app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);

// app.all("*", (req, res, next) => {
//   next(new ExpressError(404, "Page Not Found"));
// });

// Error handler
app.use((err, req, res, next) => {
  let { statusCode = 500, message = "Something went wrong" } = err;
  res.render("error", { message, statusCode });
});

// Start server
app.listen(PORT, () => console.log(`Server started on PORT ${PORT}`));
