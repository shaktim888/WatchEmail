var Imap = require('imap'),
inspect = require('util').inspect;

function watchEmail(user, password, host, port, tls, days, onEmail, onAllEnd) {
    var imap = new Imap({
        user: user,
        password: password,
        host: host,
        port: port,
        tls: tls,
        connTimeout : 20000,
        tlsOptions: { rejectUnauthorized: false } 
    });
    
    function openInbox(cb) {
        imap.openBox('INBOX', true, cb);
    }
    
    function getStream(stream) {
        return new Promise(resolve => {
          const chunks = [];
      
          stream.on("data", chunk => chunks.push(chunk));
          stream.on("end", () => resolve(Buffer.concat(chunks).toString()));
        });
    }
    
    imap.once('ready', function() {
        openInbox(function(err, box) {
            if (err) throw err;
            console.log(box);
            var record = {};
            var delay = 24 * 3600 * 1000 * days;
            var sinceTime = new Date();
            sinceTime.setTime(Date.now() - delay);
            sinceTime = sinceTime.toISOString();
            console.log(sinceTime);
            imap.search([['SINCE', sinceTime]], function(err, results) {
                if (err) throw err;
                var size = results.length;
                var count = 0;
                var solveEmail = function(e) {
                    count++;
                    if(onEmail) {
                        onEmail(e);
                    }
                    if(count >= size) {
                        imap.end();
                        if(onAllEnd) {
                            onAllEnd()
                        }
                    }
                }
                if(results.length == 0) {
                    imap.end();
                    if(onAllEnd) {
                        onAllEnd()
                    }
                    return
                }
                var f = imap.fetch(results, { bodies: ['HEADER'], size :true, markSeen : true });
                f.on('message', function(msg, seqno) {
                    // console.log('Message #%d', seqno);
                    var prefix = '(#' + seqno + ') ';
                    record[seqno] = { id : seqno };
                    msg.on('body', function(stream, info) {
                        // console.log(prefix + 'Body');
                        getStream(stream).then(function(str) {
                            var hd = Imap.parseHeader(str)
                            record[seqno].head = hd;
                            if(record[seqno].attrs) {
                                solveEmail(record[seqno])
                            }
                        })
                    });
                    msg.once('attributes', function(attrs) {
                        if(attrs.flags && attrs.flags.includes('\\Seen') ) {
                            record[seqno].seem = true;
                        } else {
                            record[seqno].seem = false;
                        }
                        record[seqno].attrs = attrs;
                        // console.log(prefix + 'Attributes: %s', inspect(attrs, false, 8));
                        if(record[seqno].head) {
                            solveEmail(record[seqno])
                        }
                    });
                    msg.once('end', function(info) {
                        console.log(prefix + 'Finished');
                    });
                });
                f.once('error', function(err) {
                    console.log('Fetch error: ' + err);
                });
                f.once('end', function() {
                    console.log('Done fetching all messages!');
                    // imap.end();
                });
            });
        });
    });
    
    imap.once('error', function(err) {
        console.log(err);
        if(onAllEnd) {
            onAllEnd()
        }
    });
    
    imap.once('end', function() {
        console.log('Connection ended');
    });
    imap.connect();
}


module.exports = watchEmail