const router = require('express').Router()
const pool = require("../db");
const bcrypt = require("bcrypt");
const responsify = require("../utils/reponsify")
const role = require('../utils/const');
//middlewares
const { roleControl } = require('../middleware/rolecontrol.middleware');
const e = require('express');

//show all donation requests
router.get("/getAllRequestList", async (req, res) => {

    try {
        const donationRequests = await pool.query("SELECT DR.donation_type, DR.donation_status, DR.date_till, DR.patient_name, DR.blood_group, DR.required_amount, U.user_name, U.user_phone, V.latitude, V.longitude, V.venue_contact, V.venue_name FROM donation_requests DR INNER JOIN users U ON (DR.user_id = U.user_id) JOIN venue V ON V.venue_id = DR.venue_id;")

        if (donationRequests == null || donationRequests.rowCount == 0) {
            return res.status(401).json({ "msg": "sorry no requests found" })
        }

        res.json(donationRequests.rows);

    } catch (error) {
        console.error(error.msg);
        res.status(500).send("Server Error")
    }
});

//post doantion request
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

                if (venue_id == null) {
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
                    console.log(new_request_id = new_request.rows[0].donation_id)

                }
                else {
                    const new_request = await pool.query("INSERT INTO donation_requests(user_id,donation_type,blood_group,date_till,donation_status,required_amount,venue_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
                        [user_id,
                            donation_type,
                            blood_group,
                            date_till,
                            donation_status,
                            required_amount,
                            venue_id,]);
                    console.log(new_request_id = new_request.rows[0].donation_id)
                }
                break;
        }

        res.json(responsify.success(200, "New Doantion Request Posted", { new_request_id, blood_group, date_till, required_amount, }))
    }
    catch (error) {
        console.error(error.stack)
        res.status(500).send("Server Error");

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
              return res.status(403).json({ msg: "You have already donated for this request" });
          }
          else {     
              try {
              
  
                //update remaining blood count and inserting data
              const read_acceptors = await pool.query("SELECT * FROM acceptor_log WHERE donation_id = $1", [donation_id]);
              if (read_acceptors.rows.length == 0) {
                  var remaining_count = required_amount - 1
                  const acceptRequest = await pool.query("INSERT INTO acceptor_log(acceptor_id,donation_id,required_amount) VALUES ($1,$2,$3)",
                      [donor_id,
                          donation_id,
                          remaining_count
                      ]);
                //update donor last donated date
                  const donatedDate = await pool.query("UPDATE donors SET lastdonated= CURRENT_DATE WHERE donor_id = $1", [donor_id])
                  res.json(responsify.success(200, "Acceptor added to log", { donor_id, donation_id, remaining_count }))
              } else {
                  const required_count = await pool.query("SELECT MIN(required_amount) FROM acceptor_log WHERE donation_id = $1", [donation_id])
                    // store donaiton request 
                  var remaining_count = (required_count.rows[0].min) - 1
                  const acceptRequest = await pool.query("INSERT INTO acceptor_log(acceptor_id,donation_id,required_amount) VALUES ($1,$2,$3)",
                      [donor_id,
                          donation_id,
                          remaining_count
                      ]);
                  const donatedDate = await pool.query("UPDATE donors SET lastdonated= CURRENT_DATE WHERE donor_id = $1", [donor_id])
  
                  res.json(responsify.success(200, "Acceptor added to log", { donor_id, donation_id, remaining_count }))
  
              }
              //donation fulfilled on remaining request = 0
              if (remaining_count <= 0) {
                  const completed_request = await pool.query("UPDATE donation_requests SET donation_status='TRUE' WHERE donation_id = $1", [donation_id]);
                  console.log("request requirement fulfilled")
              }
  
          } catch (error) {
  
              console.error(error.stack)
              res.status(500).send("Server Error");
  
          } }
  
          res.json(lastDonated.rows[0].lastdonated)

        }
        else {
            //check if 56 days had passed since last donation
            const daysSinceDonated = await pool.query("SELECT CURRENT_DATE-lastdonated as \"days_since_donated\" from donors where donor_id=$1;", [donor_id])
            const lastDonated = await pool.query("SELECT lastdonated from donors where donor_id=$1;", [donor_id])

            console.log(daysSinceDonated.rows)
            console.log(daysSinceDonated.rows[0].days_since_donated)
            var daysLeft = 56 - daysSinceDonated.rows[0].days_since_donated
            
            if (daysSinceDonated.rows[0].days_since_donated < 56) {

                return res.status(401).json({ msg: "You cannot donate right now . You last donated on "+lastDonated.rows[0].lastdonated +"." + daysLeft + " days remaining." })
            }
            else{
                const donated = await pool.query("SELECT * FROM acceptor_log WHERE acceptor_id = $1 AND donation_id= $2", [donor_id, donation_id])
                console.log(donated.rows.length)
                if (donated.rows.length != 0) {
                    return res.status(403).json({ msg: "You have already donated for this request" });
                }
                else {     
                    try {
                    
        
        
                    const read_acceptors = await pool.query("SELECT * FROM acceptor_log WHERE donation_id = $1", [donation_id]);
                    if (read_acceptors.rows.length == 0) {
                        var remaining_count = required_amount - 1
                        const acceptRequest = await pool.query("INSERT INTO acceptor_log(acceptor_id,donation_id,required_amount) VALUES ($1,$2,$3)",
                            [donor_id,
                                donation_id,
                                remaining_count
                            ]);
        
                        const donatedDate = await pool.query("UPDATE donors SET lastdonated= CURRENT_DATE WHERE donor_id = $1", [donor_id])
                        res.json(responsify.success(200, "Acceptor added to log", { donor_id, donation_id, remaining_count }))
                    } else {
                        const required_count = await pool.query("SELECT MIN(required_amount) FROM acceptor_log WHERE donation_id = $1", [donation_id])
        
                        var remaining_count = (required_count.rows[0].min) - 1
                        const acceptRequest = await pool.query("INSERT INTO acceptor_log(acceptor_id,donation_id,required_amount) VALUES ($1,$2,$3)",
                            [donor_id,
                                donation_id,
                                remaining_count
                            ]);
                        const donatedDate = await pool.query("UPDATE donors SET lastdonated= CURRENT_DATE WHERE donor_id = $1", [donor_id])
        
                        res.json(responsify.success(200, "Acceptor added to log", { donor_id, donation_id, remaining_count }))
        
                    }
        
                    if (remaining_count <= 0) {
                        const completed_request = await pool.query("UPDATE donation_requests SET donation_status='TRUE' WHERE donation_id = $1", [donation_id]);
                        console.log("request requirement fulfilled")
                    }
        
                } catch (error) {
        
                    console.error(error.stack)
                    res.status(500).send("Server Error");
        
                } }
            }

        }

      


    } catch (error) {
            console.log(error.stack)
    }






})



module.exports = router;