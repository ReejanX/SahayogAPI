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
        return res.status(401).json("Missing Credentials");
      } else if (!validEmail(email)) {
        return res.status(401).json("Invalid Email");
      }else if (!validPhoneNumber){
        return res.status(401).json("Invalid Phone Number")
      }

    } else if (req.path === "/login") {
      if (![email, password].every(Boolean)) {
        return res.status(401).json("Missing Credentials");
      } else if (!validEmail(email)) {
        return res.status(401).json("Invalid Email");
      }
    }

    if (!validEmail(email)){
      return res.status(401).json("Invalid Email");
    }
    
    if (!validPhoneNumber(phoneNumber)) {

      return res.status(401).json("Invalid Phone Number")
    }
    next();
  };