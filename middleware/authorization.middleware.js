const jwt = require("jsonwebtoken");
const responsify = require("../utils/reponsify")

require("dotenv").config();

//this middleware will on continue on if the token is inside the local storage

module.exports = function(req, res, next) {
  // Get token from header
  const token = req.header("token");

  // Check if not token
  if (!token) {
    return res.json(responsify.failed(403,"Authorization Denied"))
  }

  // Verify token
  try {
    //it is going to give use the user id (user:{id: user.id})
    const verify = jwt.verify(token, process.env.jwtSecret);
    

    req.user = verify.user;
    next();
  } catch (err) {
    return res.json(responsify.failed(401,"Invalid Token"))
  }
};