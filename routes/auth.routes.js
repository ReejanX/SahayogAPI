const router = require('express').Router()
const pool = require("../db");
const bcrypt = require("bcrypt");
const responsify = require("../utils/reponsify")
const role = require('../utils/const');
//middlewares
const jwtGenerator = require("../utils/jwtGenerator");
const validInfo = require("../middleware/validinfo.middleware");
const { roleControl } = require('../middleware/rolecontrol.middleware');



//authentication

// -- register user X
// -- login user X
// -- convert user to admin/mod by admin X
// -- convert mod/admin to user by mod X
// -- delete user by admin
// -- get all users by role
// -- edit user name, email, phone by admin



//register a new user as 'user'

router.post("/register", validInfo, async (req, res) => {
    try {

        //1. de-struct the req.body
        const { name,
            email, 
            password, 
            phoneNumber, 
            user_role,sex,
            blood_group,
            registration_number,
            landline_number,
            work_day,
            open_time,
            close_time,
            latitude,
            longitude} = req.body;
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
        if (newUser){
            switch (newUserRole){
                case role.donor:
                    const newDonor = await pool.query("INSERT INTO donors (user_id, sex, donor_blood_group) VALUES ($1, $2, $3) RETURNING *",
                    [newUserID,
                    sex,
                    blood_group]
                    );
            break;
                case role.hospital:

                    const newVenue = await pool.query("INSERT INTO venue(venue_name,venue_contact,work_day,open_time,close_time,latitude,longitude) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
                    [
                        name,
                        landline_number,
                        work_day,
                        open_time,
                        close_time,
                        latitude,
                        longitude
                    ] );
                    const newVenueID = newVenue.rows[0].venue_id
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
        res.status(500).send("Server Error");}
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
        res.json(responsify.success("00","Hello", {token,user_name,user_email,user_role}))

        

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
})





module.exports = router;