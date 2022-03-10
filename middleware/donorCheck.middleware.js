const e = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const role = require('../utils/const');
require('dotenv').config();

module.exports = function(req, res, next) {

    const donorID = req.body.donor_id
    const donationID = req.dody.donation_id
    const donorBlood = await pool.query("SELECT donor_blood_group from donors where donor_id = $1",[donorID])
    const requiredBlood = await pool.query("SELECT blood_group from donation_requests where donation_id = $1",[donationID])

    if (donorBlood=="AB +"){
        next()
    }
    


}
