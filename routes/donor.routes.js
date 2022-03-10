const router = require('express').Router()
const pool = require("../db");
const bcrypt = require("bcrypt");
const responsify = require("../utils/reponsify")
const role = require('../utils/const');
const sendNotification = require("../utils/fcm")
//middlewares
const { roleControl } = require('../middleware/rolecontrol.middleware');
const authorizaton = require('../middleware/authorization.middleware');
const e = require('express');

//show all donation requests
router.get("/getAllRequestList", authorizaton, async (req, res) => {

    try {
        const donationRequests = await pool.query("SELECT DR.donation_id,DR.donation_type, DR.donation_status, DR.date_till,DR.request_date, DR.patient_name, DR.blood_group, DR.required_amount,DR.remaining_unit,DR.message, U.user_name, U.user_phone, V.latitude, V.longitude, V.venue_contact, V.venue_name, V.open_time, V.close_time FROM donation_requests DR INNER JOIN users U ON (DR.user_id = U.user_id) JOIN venue V ON V.venue_id = DR.venue_id;")

        if (donationRequests == null || donationRequests.rowCount == 0) {
            return res.json(responsify.failed(401, "Sorry no donation requests found"))
        }

        res.json(responsify.success(200, "Donation request List fetched", donationRequests.rows))

        // res.json(donationRequests.rows);

    } catch (error) {
        console.error(error.stack);
        return res.json(responsify.failed(500, "Server Error !!"))
    }
});

//post doantion request
router.post("/post-donation-request", authorizaton, async (req, res) => {



    try {

        const { user_id,
            user_role,
            donation_type,
            blood_group,
            patient_name,
            date_till,
            required_amount,
            message,
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
                const new_request = await pool.query("INSERT INTO donation_requests(user_id,donation_type,blood_group,date_till,required_amount,remaining_unit,message,venue_id) VARCHAR ($1,$2,$3,$4,$5,$5,$6,$7) RETURNING *",
                    [user_id,
                        donation_type,
                        blood_group,
                        date_till,
                        required_amount,
                        message,
                        venue_id
                    ])
                break;


            case role.donor:

                if (venue_id == null || venue_id == "") {
                    const new_venue = await pool.query("INSERT INTO venue(venue_name,venue_contact,open_time,close_time,latitude,longitude) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
                        [
                            venue_name,
                            venue_contact,
                            open_time,
                            close_time,
                            latitude,
                            longitude
                        ]);
                    const new_venue_id = new_venue.rows[0].venue_id
                    const new_request = await pool.query("INSERT INTO donation_requests(user_id,donation_type,blood_group,date_till,required_amount,remaining_unit,message,venue_id,patient_name) VALUES ($1,$2,$3,$4,$5,$5,$6,$7,$8) RETURNING *",
                        [user_id,
                            donation_type,
                            blood_group,
                            date_till,
                            required_amount,
                            message,
                            new_venue_id,
                            patient_name])
                    var new_request_id = new_request.rows[0].donation_id

                }
                else {

                    const new_request = await pool.query(`INSERT INTO donation_requests(user_id,donation_type,blood_group,date_till,required_amount,remaining_unit,message,venue_id,patient_name) VALUES ($1,$2,$3,$4,$5,$5,$6,$7,$8) RETURNING *`,
                        [user_id,
                            donation_type,
                            blood_group,
                            date_till,

                            required_amount,
                            message,
                            venue_id,
                            patient_name]);
                    var new_request_id = new_request.rows[0].donation_id
                        
                }
                break;

            
        }
        
        res.json(responsify.success(200, "New Doantion Request Posted", { new_request_id, blood_group, date_till, required_amount }))
        console.log(new_request_id)
        
        sendNotification("New Donaiton request",
         `${patient_name} needs ${required_amount} pints of ${blood_group} ${donation_type} till ${date_till}`
         ,new_request_id.toString()
         ,"all")
    }
    catch (error) {
        console.error(error.stack)
        return res.json(responsify.failed(500, "Server Error !!"))

    }
})

router.get("/my-requests", authorizaton, async (req, res) => {
    const user_id = req.query.id

    try {
        const my_donations = await pool.query("SELECT * FROM donation_requests JOIN venue ON donation_requests.venue_id = venue.venue_id WHERE user_id = $1", [user_id])
        
        if (my_donations.rows.length == 0) {
            return res.json(responsify.success(204, "No Data Found", my_donations.rows))
        } else {


            return res.json(responsify.success(200, "Data fetched", my_donations.rows))
        }
    }
    catch (error) {

        console.log(error.stack)
        return res.json(responsify.failed(500, "Server Error !!"))
    }

})

router.get("/my-accepted-history", roleControl(role.donor), async (req, res) => {
    const acceptor_id = req.query.id

    try {
        const accepted_history = await pool.query("SELECT * FROM donation_requests JOIN acceptor_log ON donation_requests.donation_id = acceptor_log.donation_id JOIN venue ON venue.venue_id = donation_requests.venue_id WHERE acceptor_id=$1", [acceptor_id])
        // console.log(accepted_history.rows)
        if (accepted_history.rows.length == 0) {
            return res.json(responsify.success(204, "No Data Found", accepted_history.rows))
        } else {

            return res.json(responsify.success(200, "Data fetched", accepted_history.rows))
        }
    }
    catch (error) {
        console.log(error.stack)
        return res.json(responsify.failed(500, "Server Error !!"))

    }


})

//accept donation request
router.post("/accept-donation-request", roleControl(role.donor), async (req, res) => {



    const {
        donation_id,
        donor_id,
        required_amount,
        trasfussion_date,
        extra_1,
        extra_2,
    } = req.body
    console.log(donor_id, donation_id)
    try {
        //Check if user has donated before
        const lastDonated = await pool.query("SELECT lastdonated FROM donors WHERE donor_id = $1", [donor_id])

        if (lastDonated.rows[0].lastdonated == null || lastDonated.rows[0].lastdonated == "") {
            console.log("you can donate")
            const donated = await pool.query("SELECT * FROM acceptor_log WHERE acceptor_id = $1 AND donation_id= $2", [donor_id, donation_id])
            console.log(donated.rows.length)
            if (donated.rows.length != 0) {
                return res.json(responsify.failed(403, "You have already donated for this request"))
            }
            else {



                //update remaining blood count and inserting data
                const read_acceptors = await pool.query("SELECT remaining_unit FROM donation_requests WHERE donation_id = $1", [donation_id]);
                var remaining = read_acceptors.rows[0].remaining_unit - 1

                const acceptRequest = await pool.query("INSERT INTO acceptor_log(acceptor_id,donation_id) VALUES ($1,$2)",
                    [donor_id,
                        donation_id,
                    ]);
                const remaining_count = await pool.query("UPDATE donation_requests SET remaining_unit=$1 WHERE donation_id = $2", [remaining, donation_id])

                //update donor last donated date
                const donatedDate = await pool.query("UPDATE donors SET lastdonated= CURRENT_DATE WHERE donor_id = $1", [donor_id])
                res.json(responsify.success(200, "Acceptor added to log"))


                //donation fulfilled on remaining request = 0
                if (remaining <= 0) {
                    const completed_request = await pool.query("UPDATE donation_requests SET donation_status='TRUE' WHERE donation_id = $1", [donation_id]);
                    console.log("request requirement fulfilled")
                }


            }



        }

        else {

            //check if 56 days had passed since last donation
            const daysSinceDonated = await pool.query("SELECT CURRENT_DATE-lastdonated as \"days_since_donated\" from donors where donor_id=$1;", [donor_id])
            const lastDonated = await pool.query("SELECT lastdonated from donors where donor_id=$1;", [donor_id])

            console.log(daysSinceDonated.rows[0].days_since_donated)
            var daysLeft = 56 - daysSinceDonated.rows[0].days_since_donated
            console.log("hitt")
            if (daysSinceDonated.rows[0].days_since_donated < 56) {

                return res.json(responsify.failed(403, "You cannot donate right now . You last donated on " + lastDonated.rows[0].lastdonated + "." + daysLeft + " days remaining."))
            }
            else {



                //update remaining blood count and inserting data
                const read_acceptors = await pool.query("SELECT remaining_unit FROM donation_requests WHERE donation_id = $1", [donation_id]);
                var remaining = read_acceptors.rows[0].remaining_unit - 1

                const acceptRequest = await pool.query("INSERT INTO acceptor_log(acceptor_id,donation_id) VALUES ($1,$2)",
                    [donor_id,
                        donation_id,
                    ]);
                const remaining_count = await pool.query("UPDATE donation_requests SET remaining_unit=$1 WHERE donation_id = $2", [remaining, donation_id])

                //update donor last donated date
                const donatedDate = await pool.query("UPDATE donors SET lastdonated= CURRENT_DATE WHERE donor_id = $1", [donor_id])
                res.json(responsify.success(200, "Acceptor added to log"))


                //donation fulfilled on remaining request = 0
                if (remaining <= 0) {
                    const completed_request = await pool.query("UPDATE donation_requests SET donation_status='TRUE' WHERE donation_id = $1", [donation_id]);
                    console.log("request requirement fulfilled")
                }






            }

        }



    } catch (error) {
        console.log(error.stack)
        return res.json(responsify.failed(500, "Server Error !!"))
    }






})

router.get("/get-venues", authorizaton, async (req, res) => {

    try {

        const venues = await pool.query("SELECT * FROM venue")
        if (venues == null || venues.rowCount == 0) {

            return res.json(responsify.failed(401, "No Locations Found !!"))

        }
        return res.json(venues.rows)



    } catch (error) {
        console.log(error.stack)
        return res.json(responsify.failed(500, "Server Error !!"))

    }
})

router.post("/update-fcm-token",async(req,res)=>{

    try {
        const 
    {
            fcm_token,user_id
    }= req.body

        console.log("Here")
        const update = await pool.query("UPDATE users SET fcm_token = $1 WHERE user_id = $2",[fcm_token,user_id])

        return res.json(responsify.success(200,"FCM token updated"))

    } catch (error) {
         console.error(error.stack)
        return res.json(responsify.failed(500, "Server Error !!"))

    }
})


module.exports = router;