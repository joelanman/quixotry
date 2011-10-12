var sys = require("sys"),
	fs = require("fs");

exports.quicklog = function(s) {
	var logpath = "/tmp/node.log";
	s = s.toString().replace(/\r\n|\r/g, '\n'); // hack
	var fd = fs.openSync(logpath, 'a+', 0666);
	var date = new Date();
	s = '[' + date.toString() + '] ' + s;
	sys.log(s);
	fs.writeSync(fd, s + '\n');
	fs.closeSync(fd);
}
