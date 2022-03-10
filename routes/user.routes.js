const router = require('express').Router()
const pool = require("../db");
const bcrypt = require("bcrypt");
const role = require('../utils/const');
//middlewares
const { roleControl } = require('../middleware/rolecontrol.middleware');
const { authorization } = require('../middleware/authorization.middleware');

const responsify = require("../utils/reponsify");
const { response } = require('../utils/reponsify');

var donorFCMTokens = []
// verification
router.get("/", async(req, res)=>{
    res.json({"hello":"There"})
})


router.get("/getDonorDetails", async(req, res)=>{

    try {

        const user_id = req.query.id
        const user = await pool.query("SELECT users.user_name,users.user_email,users.user_phone,donors.donor_blood_group,donors.sex,donors.lastdonated ,donors.donor_id FROM users JOIN donors ON users.user_id=donors.user_id WHERE users.user_id= $1",
        [user_id])  
        const donor_id = user.rows[0].donor_id
        const lives_saved = await pool.query("Select Count(*) as lives_saved from acceptor_log WHERE acceptor_id = $1",[donor_id])
        const name = user.rows[0].user_name
        const email = user.rows[0].user_email
        const phone = user.rows[0].user_phone
        const blood_group = user.rows[0].donor_blood_group
        const sex = user.rows[0].sex
        const livesSaved = lives_saved.rows[0].lives_saved
        const last_donated = user.rows[0].lastdonated

        res.json(responsify.success(200,"User Data Fetched",{name,email,phone,blood_group,sex,last_donated,livesSaved}))   
        
    } catch (err) {
        console.error(err.message)
        return res.json(responsify.failed(500,"Server Error !!"))
    }
})


router.get("/get-hospital-details", async(req,res)=>{

    try {

        const user_id = req.query.id
        const hospital = await pool.query("SELECT users.user_name,users.user_email,users.user_phone,venue.venue_contact,venue.open_time,venue.close_time,venue.latitude,venue.longitude FROM users JOIN hospitals ON (users.user_id=hospitals.user_id) JOIN venue ON (hospitals.venue_id = venue.venue_id ) WHERE users.user_id= $1 ;",[user_id])        

        const name = hospital.rows[0].user_name
        const email = hospital.rows[0].user_email
        const phone = hospital.rows[0].user_phone
        const contact = hospital.rows[0].venue_contact
        const open_time = hospital.rows[0].open_time
        const close_time = hospital.rows[0].close_time
        const latitude = hospital.rows[0].latitude
        const longitude = hospital.rows[0].longitude
        console.log(hospital.rows[0])
        res.json(responsify.success(200,"Hospital Data Fetched",{name,email,phone,contact,open_time,close_time,latitude,longitude}))   


    } catch (error) {
        console.error(err.message)
        return res.json(responsify.failed(500,"Server Error !!"))
        
    }
})

router.get("/get-notifications",async(req,res)=>{
try {
    const id = req.query.id
    const notifications = await pool.query(`SELECT * FROM notifications WHERE recipient = 'all' OR recipient = '${req.query.id}' ORDER BY time DESC`)
    return res.json(responsify.success(200,"Data Fetch Success",notifications.rows))

} catch (error) {
        console.error(error.message)
        return res.json(responsify.failed(500,"Server Error !!"))
}
  


})
// get All users by 'user_role' as admin/user/mod/docs

router.post("/getAllUsers", roleControl('admin'), async (req, res) => {
    try {

        //destruct
        const { user_role } = req.body
        // get all users where role is 
        const users = await (await pool.query("SELECT * from users WHERE user_role = $1", [user_role])).rows;

        if (users == null || users == "") {
            return res.status(401).json({ "msg": "sorry no users found" })
        }

        res.json(users)

    } catch (err) {
        console.error(err.message)
        res.status(500).send("Server Error");
    }
})
// delete a user

router.post("/deleteUser", roleControl('admin'), async (req, res) => {
    try {

        const { user_id } = req.body
        const user = await pool.query("SELECT * FROM users WHERE user_id = $1", [user_id]);
        if (user.rows.length == 0) {
            return res.status(401).json({ "message": "User Not Found!" })
        }
        const deleteUser = await pool.query("DELETE FROM users WHERE user_id= $1 ", [user_id]);

        res.json({
            "msg": "user deleted"
        })

    } catch (err) {
        console.error(err.message)
        res.status(500).send("Server Error");
    }
})

// use a admin token to promote and demote any user to admin/mod

router.post("/changeUserRole", roleControl('admin'), async (req, res) => {
    try {

        const { user_id, role_to } = req.body;
        const user = await pool.query("SELECT * FROM users WHERE user_id = $1", [user_id]);
        if (user.rows.length == 0) {
            return res.status(401).json({ "message": "User Not Found!" })
        }
        const updatedUser = await pool.query("UPDATE users SET user_role = $2 WHERE user_id = $1", [user_id, role_to]);

        res.json({
            "msg": "user updated"
        })


    } catch (err) {
        console.error(err.message)
        res.status(500).send("Server Error");
    }
})

router.post("/send-notification", async (req,res)=>
{
   try {
       const dFCMT = await pool.query("SELECT fcm_token from donors")
        // donorFCMTokens = dFCMT.rows.fcm_token
        

        // console.log(dFCMT.rows)
        for (obj in dFCMT.rows){
            
            donorFCMTokens.push(dFCMT.rows[obj].fcm_token)
            
        }
console.log(donorFCMTokens)
        return  res.json(responsify.success(500,"N"))
   } catch (error) {
       console.error(error.stack)
   } 

})

module.exports = router;