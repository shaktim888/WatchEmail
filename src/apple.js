var util = require("util");
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var EmailFilter = require("../config/apple")

function AppleEmailWatcher()
{
    this.record = {};
    this.ignored = {};
    this.solveContent = function(content, emailAddr, time, seem) {
        // console.log(content);
        for(var fdex = 0 ; fdex < EmailFilter.length; fdex ++) {
            var cfg = EmailFilter[fdex];
            for(var index = 0 ; index < cfg.match.length; index ++) {
                var reg = cfg.match[index];
                var myRe = new RegExp(reg[0]);
                var retArr = myRe.exec(content);
                if(retArr) {
                    var m = { email : emailAddr , type : cfg.type , date : time , seem : seem, args : {} }
                    for(var vi = 1; vi < reg.length; vi++) {
                        m.args[reg[vi]] = retArr[vi];
                    }
                    return m;
                }
            }
        }
    }
    this.onEmail = function(email) {
        var head = email.head || email
        if(head.from[0].includes("@email.apple.com")){
            var emailAddr = head.to[0]
            var result = this.solveContent(head.subject[0], emailAddr, new Date(head.date[0]), email.seem)
            if(result) {
                this.ignored[emailAddr] = this.ignored[emailAddr] || [];
                if(!this.record[emailAddr]) {
                    this.record[emailAddr] = result;
                }
                else {
                    if(result.date > this.record[emailAddr].date) {
                        this.ignored[emailAddr].push(this.record[emailAddr]);
                        this.record[emailAddr] = result;
                    } else {
                        this.ignored[emailAddr].push(this.record[emailAddr]);
                    }
                }
            }
        }
    }

    this.onFinish = function(sendReaded, saveToFolder) {
        var mailBody = "这是本次的邮件检测结果：\n";
        var isHasContent=false;
        for(var mail in this.record) {
            this.ignored[mail] = this.ignored[mail].sort((a, b) => {
                return a.date < b.date;
            })

            if(saveToFolder && saveToFolder != "") {
                (function(mail) {
                    mkdirp(path.join(saveToFolder, mail), ()=> {
                        fs.writeFileSync(path.join(saveToFolder, mail,  "current.json"), JSON.stringify(this.record[mail], null, 4));
                        fs.writeFileSync(path.join(saveToFolder, mail,  "before.json"), JSON.stringify(this.ignored[mail], null, 4));
                    });
                }.bind(this))(mail);
            }
            var info = this.record[mail];
            if(!info.seem || sendReaded) {
                isHasContent = true;
                mailBody += "--------------------------------------------------\n";
                mailBody += mail + " :\n";
                mailBody += JSON.stringify(info, null, 4);
            }
        }
        return isHasContent ? mailBody : "";
    }

}

module.exports = AppleEmailWatcher