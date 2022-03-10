const e = require('express');
const jwt = require('jsonwebtoken');
const role = require('../utils/const');
const responsify = require("../utils/reponsify")
require('dotenv').config();

exports.roleControl = function (user_role) {
    return async (req, res, next) => {

        // get token
        const token = req.header('token');

        // Check if not token
        if (!token) {
            // return res.status(403).json({ msg: "authorization denied" });
            return res.json(responsify.failed(403,"Authorization Denied"))
        }

        try {
            const user = jwt.verify(token, process
                .env.jwtSecret);

            console.log('-- role-user', user.access_level)
            console.log('-- role-needed', user_role)
            
            if(user_role==role.user){
                next();
            }
            if (user.access_level == user_role) {
                next();
            }else if(user.access_level == role.admin){
                next();        
            }
            else {
                return res.json(responsify.failed(403,"Access Denied"))
            }



        } catch (err) {
            return res.json(responsify.failed(401,"Invalid Token"))
        }
    }
}