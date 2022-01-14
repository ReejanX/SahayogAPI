const e = require('express');
const jwt = require('jsonwebtoken');
const role = require('../utils/const');
require('dotenv').config();

exports.roleControl = function (user_role) {
    return async (req, res, next) => {

        // get token
        const token = req.header('token');

        // Check if not token
        if (!token) {
            return res.status(403).json({ msg: "authorization denied" });
        }

        try {
            const user = jwt.verify(token, process
                .env.jwtSecret);

            console.log('-- role-user', user.access_level)
            console.log('-- role-needed', user_role)

            if (user.access_level == user_role) {
                next();
            }else if(user.access_level == role.admin){
                next();        
            }
            else {
                res.status(401).json({ msg: "User Access Denied" })
            }



        } catch (err) {
            res.status(401).json({ msg: "Invalid Token" });
        }
    }
}