require("dotenv").config();

const jwt = require("jsonwebtoken");
const secret = process.env.JWT_SECRET;

function createTokenUser(user) {
  const payload = {
    _id: user._id,
    username: user.username,
    email: user.email,
  };
  const token = jwt.sign(payload, secret);
  return token;
}

function validateToken(token) {
  const payload = jwt.verify(token, secret);
  return payload;
}

module.exports = {
  createTokenUser,
  validateToken,
};
