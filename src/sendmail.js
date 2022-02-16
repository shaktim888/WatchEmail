var nodemailer = require('nodemailer');

var emailCfg = require("../config/cfg.json");

function sendEmail(from, pass, to, subject, text )
{
    if(!from || !pass || !to || !text) {
        return;
    }
    var reg = /.+@(.+)\..+/
    var arr = reg.exec(from)
    if(arr) {
        var key = arr[1];
        var info = emailCfg[key];
        if(!info || !info.send) {
            console.log("please configuration your email send info.")
            return;
        }
        var transport = nodemailer.createTransport({
            host: info.send.host,
            port: info.send.port,
            auth: {
                user: from,
                pass: pass
            }
        })
        var message = {
            from: from, // Sender address
            to: to,         // List of recipients
            subject: subject, // Subject line
            text: text // Plain text body
        };
        transport.sendMail(message, function(err, info) {
            if (err) {
                console.log(err)
            } else {
                console.log(info);
            }
        });
    }
}

module.exports = sendEmail