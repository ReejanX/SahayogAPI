const router = require('express').Router()
const pool = require("../db");
const bcrypt = require("bcrypt");

const responsify = require("../utils/reponsify")
const role = require('../utils/const');
//middlewares
const validInfo = require("../middleware/validinfo.middleware");
const { roleControl } = require('../middleware/rolecontrol.middleware');
const authorization  = require('../middleware/authorization.middleware');


//change password with current password
router.put("/change-password",validInfo,authorization,async(req,res)=>{
    try {
        
        const{
            email,
            old_password,
            new_password} = req.body
        
        const user = await pool.query("SELECT * FROM users WHERE user_email = $1", [email]);
        if (user.rows.length == 0) {
            return res.json(responsify.failed(404,"User Does not Exits"))
        }
        //check password
        const validPassword = await bcrypt.compare(old_password, user.rows[0].user_password)

        if (!validPassword) {
            return res.json(responsify.failed(401,"Password is incorrect"))
        }
        // bcrypt user password
        const saltRound = 10;
        const salt = await bcrypt.genSalt(saltRound);
        const bcryptPassword = await bcrypt.hash(new_password, salt);
        //reset password
        const changePassword = await pool.query("UPDATE users SET user_password = $1 WHERE user_email = $2",[bcryptPassword,email])
        if (changePassword){
            res.json(responsify.success(200,"Password Change Successful"))
        }else{
            res.json(responsify.failed(404,"Password Change Failed"))
        }
        
    } catch (error) {
        console.log(error.stack)
        res.json(responsify.failed(500,"Server Error !"))
    }
})


module.exports = router;

