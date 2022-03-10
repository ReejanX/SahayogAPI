
const nodemailder = require('nodemailer');

class NodeMailder {
    generateotp() {
        // 6 digit random otp
        var digits = '0123456789';
        let OTP = '';
        for (let i = 0; i < 6; i++) {
            OTP += digits[Math.floor(Math.random() * 10)];
        }
        return OTP;
    }
    sendOtp(email, otp) {

        const transporter = nodemailder.createTransport({

            service: "hotmail",
            auth: {

                user: "sahayogapp@outlook.com",
                pass: "testEmail@123"
            }
        });
        // otp email model
        const options = {
            from: '"Team Sahayog" <sahayogapp@outlook.com>',
            to: email,
            subject: "OTP ACTIVATION",
            text: "Your activation OTP is : " + otp

        }

        transporter.sendMail(options, function (error, info) {
            if (error) {
                console.log(error.stack);
                return;
            }

            console.log("Sent:" + info.response)
        })
    }
}

module.exports = new NodeMailder