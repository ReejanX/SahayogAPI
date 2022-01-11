const router = require('express').Router()
const pool = require("../db");
const bcrypt = require("bcrypt");
const responsify = require("../utils/reponsify")
const role = require('../utils/const');
//middlewares
const { roleControl } = require('../middleware/rolecontrol.middleware');


router.get("/getAllRequestList", roleControl(role.donor), async (req, res) => {

    try {
        const donationRequests = await pool.query("SELECT * FROM donation_requests ORDER BY date_till ASC")

        if (donationRequests == null || donationRequests.rowCount==0) {
            return res.status(401).json({ "msg": "sorry no requests found" })
        }

        res.json(donationRequests.rows);

    } catch (error) {
        console.error(error.msg);
        res.status(500).send("Server Error")
    }
});


router.post("/postDonationRequest", async (req, res) => {

    try {

        const { user_id,
            user_role,
            donation_type,
            blood_group,
            date_till,
            donation_status,
            required_amount,
            venue_id,
            venue_contact,
            venue_name,
            latitude,
            longitude,
            work_day,
            open_time,
            close_time
        } = req.body;

        switch (user_role) {
            case role.hospital:
                const new_request = await pool.query("INSERT INTO donation_requests(user_id,donation_type,blood_group,date_till,donation_status,required_amount,venue_id) VARCHAR ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
                    [user_id,
                        donation_type,
                        blood_group,
                        date_till,
                        donation_status,
                        required_amount,
                        venue_id,])
                break;


            case role.donor:

                if (venue_id==null) {
                    const new_venue = await pool.query("INSERT INTO venue(venue_name,venue_contact,work_day,open_time,close_time,latitude,longitude) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
                        [
                            venue_name,
                            venue_contact,
                            work_day,
                            open_time,
                            close_time,
                            latitude,
                            longitude
                        ]);
                    const new_venue_id = new_venue.rows[0].venue_id
                    const new_request = await pool.query("INSERT INTO donation_requests(user_id,donation_type,blood_group,date_till,donation_status,required_amount,venue_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
                        [user_id,
                            donation_type,
                            blood_group,
                            date_till,
                            donation_status,
                            required_amount,
                            new_venue_id,])
                }
                else{
                const new_request = await pool.query("INSERT INTO donation_requests(user_id,donation_type,blood_group,date_till,donation_status,required_amount,venue_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
                    [user_id,
                        donation_type,
                        blood_group,
                        date_till,
                        donation_status,
                        required_amount,
                        venue_id,]);
                var new_request_id = new_request.rows[0].donation_id
            }   
                break;
        }

        res.json(responsify.success(200,"New Doantion Request Posted",{new_request_id,blood_group,date_till,required_amount,}))
    }
    catch (error) {
        console.error(error.stack)
        res.status(500).send("Server Error");

    }
})

module.exports = router;