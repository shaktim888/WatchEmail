var POP3Client = require("poplib");
var util = require("util"),
		RE_HDR = /^([^:]+):[ \t]?(.+)?$/,
		RE_ENCWORD = /=\?([^?*]*?)(?:\*.*?)?\?([qb])\?(.*?)\?=/gi,
		RE_ENCWORD_END = /=\?([^?*]*?)(?:\*.*?)?\?([qb])\?(.*?)\?=$/i,
		RE_ENCWORD_BEGIN = /^[ \t]=\?([^?*]*?)(?:\*.*?)?\?([qb])\?(.*?)\?=/i,
		RE_CRLF = /\r\n/g;

function decodeWords(str, state) {
	var pendoffset = -1;
  
	if (!state) {
	  state = {
		buffer: undefined,
		encoding: undefined,
		consecutive: false,
		replaces: undefined,
		curReplace: undefined,
		remainder: undefined
	  };
	}
  
	state.replaces = [];
  
	var bytes, m, next, i, j, leni, lenj, seq, replaces = [], lastReplace = {};
  
	// join consecutive q-encoded words that have the same charset first
	while (m = RE_ENCWORD.exec(str)) {
	  seq = {
		consecutive: (pendoffset > -1
					  ? RE_LWS_ONLY.test(str.substring(pendoffset, m.index))
					  : false),
		charset: m[1].toLowerCase(),
		encoding: m[2].toLowerCase(),
		chunk: m[3],
		index: m.index,
		length: m[0].length,
		pendoffset: pendoffset,
		buf: undefined
	  };
	  lastReplace = replaces.length && replaces[replaces.length - 1];
	  if (seq.consecutive
		  && seq.charset === lastReplace.charset
		  && seq.encoding === lastReplace.encoding
		  && seq.encoding === 'q') {
		lastReplace.length += seq.length + seq.index - pendoffset;
		lastReplace.chunk += seq.chunk;
	  } else {
		replaces.push(seq);
		lastReplace = seq;
	  }
	  pendoffset = m.index + m[0].length;
	}
  
	// generate replacement substrings and their positions
	for (i = 0, leni = replaces.length; i < leni; ++i) {
	  m = replaces[i];
	  state.consecutive = m.consecutive;
	  if (m.encoding === 'q') {
		// q-encoding, similar to quoted-printable
		bytes = new Buffer(m.chunk.replace(RE_QENC, qEncReplacer), 'binary');
		next = undefined;
	  } else {
		// base64
		bytes = m.buf || new Buffer(m.chunk, 'base64');
		next = replaces[i + 1];
		if (next && next.consecutive && next.encoding === m.encoding
		  && next.charset === m.charset) {
		  // we use the next base64 chunk, if any, to determine the integrity
		  // of the current chunk
		  next.buf = new Buffer(next.chunk, 'base64');
		}
	  }
	  decodeBytes(bytes, m.charset, m.index, m.length, m.pendoffset, state,
		next && next.buf);
	}
  
	// perform the actual replacements
	for (i = state.replaces.length - 1; i >= 0; --i) {
	  seq = state.replaces[i];
	  if (Array.isArray(seq)) {
		for (j = 0, lenj = seq.length; j < lenj; ++j) {
		  str = str.substring(0, seq[j].fromOffset)
				+ seq[j].val
				+ str.substring(seq[j].toOffset);
		}
	  } else {
		str = str.substring(0, seq.fromOffset)
			  + seq.val
			  + str.substring(seq.toOffset);
	  }
	}
  
	return str;
  }
  
  function parseHeader(str, noDecode) {
	var lines = str.split(RE_CRLF),
		len = lines.length,
		header = {},
		state = {
		  buffer: undefined,
		  encoding: undefined,
		  consecutive: false,
		  replaces: undefined,
		  curReplace: undefined,
		  remainder: undefined
		},
		m, h, i, val;
  
	for (i = 0; i < len; ++i) {
	  if (lines[i].length === 0)
		break; // empty line separates message's header and body
	  if (lines[i][0] === '\t' || lines[i][0] === ' ') {
		if (!Array.isArray(header[h]))
		  continue; // ignore invalid first line
		// folded header content
		val = lines[i];
		if (!noDecode) {
		  if (RE_ENCWORD_END.test(lines[i - 1])
			  && RE_ENCWORD_BEGIN.test(val)) {
			// RFC2047 says to *ignore* leading whitespace in folded header values
			// for adjacent encoded-words ...
			val = val.substring(1);
		  }
		}
		header[h][header[h].length - 1] += val;
	  } else {
		m = RE_HDR.exec(lines[i]);
		if (m) {
		  h = m[1].toLowerCase().trim();
		  if (m[2]) {
			if (header[h] === undefined)
			  header[h] = [m[2]];
			else
			  header[h].push(m[2]);
		  } else
			header[h] = [''];
		} else
		  break;
	  }
	}
	if (!noDecode) {
	  var hvs;
	  for (h in header) {
		hvs = header[h];
		for (i = 0, len = header[h].length; i < len; ++i)
		  hvs[i] = decodeWords(hvs[i], state);
	  }
	}
  
	return header;
  }

function watchEmail(username, password, host, port, enabletls, onEmail, onAllEmailEnd) {
	var debug = false;
	var currentmsg = 1;
	var totalmsg = 0;
	// 防止邮件过多。遍历有限数量的邮件
	var limitWatchNum = 50;
	var isSuccess = false;
	var client = new POP3Client(port, host, {
		debug: debug,
		enabletls: enabletls
	});
	client.on("error", function(err) {
		if (err.errno === 111) console.log("Unable to connect to server");
		else console.log("Server error occurred");
		console.log(err);
		if(onAllEmailEnd) {
			onAllEmailEnd()
		}
	});

	client.on("connect", function(rawdata) {
		if(isSuccess) {
			return;
		}
		isSuccess = true;
		console.log("CONNECT success");
		client.login(username, password);
	});

	client.on("invalid-state", function(cmd) {
		console.log("Invalid state. You tried calling " + cmd);
	});

	client.on("locked", function(cmd) {
		console.log("Current command has not finished yet. You tried calling " + cmd);
	});

	client.on("login", function(status, rawdata) {
		if (status) {
			console.log("LOGIN/PASS success");
			client.list();
		} else {
			console.log("LOGIN/PASS failed");
			client.quit();
		}
	});

	client.on("list", function(status, msgcount, msgnumber, data, rawdata) {
		if (status === false) {
			if (msgnumber !== undefined) console.log("LIST failed for msgnumber " + msgnumber);
			else console.log("LIST failed");
			client.quit();
		} else if (msgcount === 0) {
			console.log("LIST success with 0 elements");
			client.quit();
		} else {
			console.log("LIST success with " + msgcount + " element(s)");
			// client.uidl();
			totalmsg = msgcount < limitWatchNum ? msgcount : watchNum;
			currentmsg = 1;
			client.top(currentmsg, 0);
		}
	});

	client.on("top", function(status, msgnumber, data, rawdata) {
		if (status === true) {
			console.log("RETR success for msgnumber " + msgnumber);
			if (debug) console.log("Parsed data: " + data);
			var info = parseHeader(data);
			if(onEmail) {
				onEmail(info);
			}
			currentmsg++;
			if(totalmsg < currentmsg) {
				client.quit();
			} else {
				client.top(currentmsg, 0);
			}
		} else {
			console.log("RETR failed for msgnumber " + msgnumber);
			client.quit();
		}
	});
		
	client.on("quit", function(status, rawdata) {
		if (status === true) console.log("QUIT success");
		else console.log("QUIT failed");
		if(onAllEmailEnd) {
			onAllEmailEnd();
		}
	});
}

module.exports = watchEmail