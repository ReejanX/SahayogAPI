const router = require('express').Router()
const pool = require("../db");
const bcrypt = require("bcrypt");
const { status } = require('express/lib/response');
const { captureRejections } = require('nodemailer/lib/xoauth2');

const responsify = require("../utils/reponsify")
const mailer = require("../utils/OTPmailer")
const role = require('../utils/const');
const jwtGenerator = require("../utils/jwtGenerator");
//middlewares
const validInfo = require("../middleware/validinfo.middleware");
const { roleControl } = require('../middleware/rolecontrol.middleware');

//register a new user 
router.post("/register", validInfo, async (req, res) => {
    try {

        //1. de-struct the req.body
        const { name,
            email,
            password,
            phoneNumber,
            user_role, sex,
            blood_group,
            registration_number,
            landline_number,
            work_day,
            open_time,
            close_time,
            latitude,
            longitude } = req.body;
        //2. check if user exist
        const user = await pool.query("SELECT * FROM users WHERE user_email = $1", [email]);
        if (user.rows.length !== 0) {
            return res.status(401).send("User Already Exists!")
        }
        //3. bcrypt user password
        const saltRound = 10;
        const salt = await bcrypt.genSalt(saltRound);
        const bcryptPassword = await bcrypt.hash(password, salt);
        //4. enter the user to db
        const newUser = await pool.query("INSERT INTO users (user_name, user_email, user_password,user_phone,user_role) VALUES ($1, $2, $3,$4,$5) RETURNING *",
            [name, email, bcryptPassword, phoneNumber, user_role]
        );
        const newUserID = newUser.rows[0].user_id;
        const newUserRole = newUser.rows[0].user_role;
        if (newUser) {
            switch (newUserRole) {
                case role.donor:
                    //register user as donor
                    const newDonor = await pool.query("INSERT INTO donors (user_id, sex, donor_blood_group) VALUES ($1, $2, $3) RETURNING *",
                        [newUserID,
                            sex,
                            blood_group]
                    );
                    break;
                case role.hospital:
                    //register new hospital venuw
                    const newVenue = await pool.query("INSERT INTO venue(venue_name,venue_contact,work_day,open_time,close_time,latitude,longitude) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
                        [
                            name,
                            landline_number,
                            work_day,
                            open_time,
                            close_time,
                            latitude,
                            longitude
                        ]);
                    const newVenueID = newVenue.rows[0].venue_id
                    //register user as hospital
                    const newHospital = await pool.query("INSERT INTO hospitals (user_id,registration_number,venue_id) VALUES ($1,$2,$3) RETURNING *",
                        [newUserID,
                            registration_number,
                            newVenueID]
                    );
                    break;
            }

        }



        //5. generating out jwt token
        const token = jwtGenerator(newUser.rows[0].user_id, newUser.rows[0].user_role);

        res.json({
            token
        });
    }
    catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
})

//login the user
router.post("/login", validInfo, async (req, res) => {
    try {
        //1. destruct the req body
        const { email, password } = req.body
        //2. check if the user doesnt exist
        const user = await pool.query("SELECT * FROM users WHERE user_email = $1", [email]);
        if (user.rows.length === 0) {
            return res.status(401).json("Password or Email is incorrect")
        }
        //3. check if passwords match
        const validPassword = await bcrypt.compare(password, user.rows[0].user_password)

        if (!validPassword) {
            return res.status(401).json("Password is incorrect")
        }
        //4. give jwt token

        const token = jwtGenerator(user.rows[0].user_id, user.rows[0].user_role);
        const user_name = user.rows[0].user_name
        const user_email = user.rows[0].user_email
        const user_role = user.rows[0].user_role
        // res.json({ token, user_name, user_email, user_role});
        res.json(responsify.success("00", "Hello", { token, user_name, user_email, user_role }))



    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
})

//send and store otp 
router.post("/send-reset-otp",validInfo, async (req, res) => {
    try {
        //request destruct
        const { email } = req.body;


        const user = await pool.query("SELECT * FROM users WHERE user_email = $1", [email]);
        if (user.rows.length == 0) {
            return res.status(401).send("User Doesnot Exists!")
        }
        //otp generating, storing and sending via email
        const otp = parseInt(mailer.generateotp())
        console.log(otp);

        // mailer.sendOtp(email,otp)

        const storeOTP = await pool.query("UPDATE users SET reset_otp = $1, otp_timestamp = CURRENT_TIMESTAMP  WHERE user_email = $2", [otp, email])

        console.log(storeOTP.rows)

        res.json(responsify.success(01, "reset otp has been sent to your email."))

    } catch (error) {


        console.log(error.stack)
        res.status(500).send("Server Error");
    }
})
//reset password with valid otp
router.post("/forgot-password", validInfo, async (req, res) => {

    try {
        //request destruct
        const {
            email,
            otp,
            password
        }= req.body
        
        const user = await pool.query("SELECT * FROM users WHERE user_email = $1", [email]);
        if (user.rows.length == 0) {
            return res.status(404).send("User Doesnot Exists!")
        }

        const checkOTP = await pool.query("SELECT reset_otp FROM users WHERE user_email = $1", [email])
        if (!checkOTP){
            return res.status(404).send("no otp sent")
        }
        //otp check
        console.log(checkOTP.rows)
        if (checkOTP.rows[0].reset_otp !== otp) {
            return res.json(responsify.failed(02, "Invalid OTP"))
        } else {
            // otp expiration check
            const seconds = await pool.query("SELECT EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - otp_timestamp)) AS difference FROM users WHERE user_email = $1",[email])
            if (seconds.rows[0].difference > 120){
                return res.status(401).send("The OTP has expired please Resend OTP and try again!")
            }
            // bcrypt user password
            const saltRound = 10;
            const salt = await bcrypt.genSalt(saltRound);
            const bcryptPassword = await bcrypt.hash(password, salt);
            //reset password
            const changePassword = await pool.query("UPDATE users SET user_password = $1 WHERE user_email = $2",[bcryptPassword,email])
            if (changePassword){
                res.json(responsify.success(01,"Password reset Successfull"))
            }else{
                res.json(responsify.failed(02,"Password reset Failed"))
            }
            
        }


    } catch (error) {
            console.log(error.stack)
            res.status(500).send("Server Error")
    }
})
 


module.exports = router;