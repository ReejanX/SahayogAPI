const express = require('express');
const app = express();
const cors = require('cors');
const users = require('./contract/user.values')

app.use(express.json()) //req.body
app.use(cors())


//ROUTES//

//USER AUTHENTICATIONS
//-- login
//-- signup
//-- forgot password
app.use("/auth", require("./routes/auth.routes"));

//ADMIN ACCESS CONTROL
//-- promote user to admin/mod
//-- demote admin/mod to user
//-- delete a user
 

//USER FUNCTIONS
//-- see user details
//-- edit user details

app.use("/user", require("./routes/user.routes"));

app.use("/donor", require("./routes/donor.routes"));
app.listen(4444, ()=>{
    console.log("-- server running on 4444")
})