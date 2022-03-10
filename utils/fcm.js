var admin = require("firebase-admin");
const pool = require("../db");

var serviceAccount = require("../sahayogapp-3fd9e-firebase-adminsdk-u7n4c-353c8a21cd.json");

async function sendNotificaitonToAll(title,body,id,recipient) {
  var donorFCMTokens =  []
  const tk= await pool
    .query('SELECT fcm_token from users where fcm_token IS NOT NULL')
    for (obj in tk.rows){     
      donorFCMTokens.push(tk.rows[obj].fcm_token)    
  }
  

admin.initializeApp({
  	credential: admin.credential.cert(serviceAccount)
});

var message = {
  notification: {
    title: title,
    body: body},
    data:{
      id:id
    }

  }

const updateNotification = await pool.query("INSERT INTO notifications (title, body, recipient) VALUES ($1,$2,$3) RETURNING *",[title,body,recipient])  



// Send a message to devices subscribed to the provided topic.
admin.messaging().sendToDevice(donorFCMTokens,message)
  .then((response) => {
    // Response is a message ID string.
    console.log('Successfully sent message:', response);
    console.log('Notificaiton ID :',updateNotification.row[0].notification_id)
  })
  .catch((error) => {
    console.log('Error sending message:', error);
});}




module.exports = sendNotificaitonToAll;