
const responsify = require("../utils/reponsify")

module.exports = function(req, res, next) {
    const { email, name, password, phoneNumber  } = req.body ;
  
    function validEmail(userEmail) {
      return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(userEmail);
    }
    function validPhoneNumber(phoneNumber){
      return /^(98[0124568]{1}\d{7})|(97[2456]{1}\d{7})|(96[123]{1}\d{7})/.test(phoneNumber)
    }
  
    if (req.path === "/register") {
      console.log(!email.length);
      if (![email, name, password, phoneNumber].every(Boolean)) {
        return res.json(responsify.failed(401,"Missing Credentials"))
      } else if (!validEmail(email)) {
        return res.json(responsify.failed(401,"Invalid Email"))
      }else if (!validPhoneNumber){
        return res.json(responsify.failed(401,"Invalid Phone Number"))
      }

    } else if (req.path === "/login") {
      if (![email, password].every(Boolean)) {
        return res.json(responsify.failed(401,"Missing Credentials"))
      } else if (!validEmail(email)) {
        return res.json(responsify.failed(401,"Invalid Email"))
      }
    }

    if (!validEmail(email)){
      return res.json(responsify.failed(401,"Invalid Email"))
    }
    
    next();
  };