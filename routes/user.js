require("dotenv").config();

const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/user");
const { createTokenUser } = require("../service/auth");
const { requireLogin } = require("../middlewares/auth");
const wrapAsync = require("../utils/wrapAsync");

// Render Signup Form
router.get("/signup", (req, res) => {
  res.render("user/signup");
});

// Handle Signup
router.post(
  "/signup",
  wrapAsync(async (req, res) => {
    const { username, email, password } = req.body;

    const saltRounds = parseInt(process.env.BCRYPT_SALT);
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    req.flash("success", "Signup successful! Please log in.");
    res.redirect("/user/login");
  })
);

// Render Login Form
router.get("/login", (req, res) => {
  res.render("user/login");
});

// Handle Login (with JWT)
router.post(
  "/login",
  wrapAsync(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      req.flash("error", "Invalid email or password.");
      return res.redirect("/user/login");
    }

    const token = createTokenUser(user);
    res.cookie("token", token, {
      httpOnly: true,
    });

    req.flash("success", `Welcome back, ${user.username}!`);
    res.redirect("/listings");
  })
);

// ✅ Protect Logout
router.post("/logout", requireLogin, (req, res) => {
  res.clearCookie("token");
  req.flash("success", "You have been logged out.");
  res.redirect("/listings");
});

module.exports = router;
