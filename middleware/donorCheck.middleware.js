const e = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const role = require('../utils/const');
require('dotenv').config();

exports.donorCheck = function () {
    return async (req, res, next) => {

        const {donor_id, donation_id} = req.body
        console.log(donor_id,   donation_id)
        try {
            
            const lastDonated = await pool.query("SELECT lastdonated FROM donors WHERE donor_id = $1",[donor_id] )

            if (lastDonated.rows[0].lastDonated==null || lastDonated.rows[0].lastDonated== ""){
                    next();
            }
            else{

                const daysSinceDonated = await pool.query("SELECT CURRENT_DATE-lastdonated as \"days_since_donated\" from donors where donor_id=$1;",[donor_id])
                console.log(daysSinceDonated.rows[0].days_since_donated)
                var daysLeft = 56-daysSinceDonated.rows[0].days_since_donated
                if (daysSinceDonated.rows[0].days_since_donated <56){

                    return res.status(401).json({msg: "You can donate right now "+daysLeft+" days remaining"})
                }
               
            }
        
                const donated = await pool.query("SELECT * FROM acceptor_log WHERE acceptor_id = $1 AND donation_id= $2", [donor_id, donation_id])
                console.log(donated.rows.length)
                if (donated.rows.length != 0) {
                    return res.status(403).json({ msg: "You have already donated for this request" });
                }
                else { next(); }

            
        } catch (error) {

        }
    }

}
