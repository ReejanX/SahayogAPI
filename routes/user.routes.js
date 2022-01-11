const router = require('express').Router()
const pool = require("../db");
const bcrypt = require("bcrypt");
const role = require('../utils/const');
//middlewares
const { roleControl } = require('../middleware/rolecontrol.middleware');


// verification
router.get("/", async(req, res)=>{
    res.json({"hello":"111"})
})


router.post("/getUserDetails", roleControl('user'), async(req, res)=>{
    try {

        const {user_id} = req.body
        const user = await pool.query("SELECT user_id, user_email, user_name FROM users WHERE user_id = $1",[user_id])
        res.json(user.rows[0])
        
    } catch (err) {
        console.error(err.message)
        res.status(500).send("Server Error");
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


module.exports = router;