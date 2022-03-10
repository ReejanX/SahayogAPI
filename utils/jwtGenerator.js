const jwt = require('jsonwebtoken');
require('dotenv').config();

function jwtGenerator(user_id, role) {
    const payload = {
        user : user_id,
        access_level : role
    }


    return jwt.sign(payload, process.env.jwtSecret, {expiresIn: "20d" })

}

module.exports = jwtGenerator;
