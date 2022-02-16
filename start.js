var emailCfg = require("./config/cfg.json")
var userCfg = require("./config/emails.json")
var AppleEmailWatcher = require("./src/apple");
var imap = require("./src/imap")
var pop3 = require("./src/pop3")
var sendEmail = require("./src/sendmail")
var schedule = require('node-schedule');

function watch(){
    var size = userCfg.emails.length;
    var count = 0;
    var watcher = new AppleEmailWatcher()
    var afterAllEmail = function() {
        var comtent = watcher.onFinish(userCfg.sendReaded, userCfg.outputFolder);
        sendEmail(userCfg.sender.mail, userCfg.sender.pass, 
                  userCfg.sendTo, "邮箱检测结果", comtent)
    }
    
    userCfg.emails.forEach(email => {
        var reg = /.+@(.+)\..+/
        var arr = reg.exec(email.mail)
        if(arr) {
            var key = arr[1];
            var info = emailCfg[key];
            if(info.read) {
                console.log("watch email:" + email.mail);
                if(info.read.type == 'imap') {
                    imap(email.mail,email.pass, info.read.host, info.read.port, info.read.tls, userCfg.days, (e)=> {
                        watcher.onEmail(e);
                    }, () => {
                        count++;
                        console.log("read email finish:" + email.mail);
                        if(count >= size) {
                            afterAllEmail();
                        }
                    })
                } else if(info.read.type == 'pop3'){
                    pop3(email.mail,email.pass, info.read.host, info.read.port, info.read.tls, (e)=> {
                        watcher.onEmail(e);
                    }, () => {
                        count++;
                        if(count >= size) {
                            afterAllEmail();
                        }
                    })
                }
            }
        }
    });
}

console.log("start watch Email：");
console.log("cron setting："+ userCfg.cron);
schedule.scheduleJob(userCfg.cron, function(){
    console.log("start scan email");
    watch();
    console.log("ended scan email");
});
