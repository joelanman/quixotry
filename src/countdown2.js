var sys = require("sys")
  , http = require("http")
  , url = require("url")
  , fs = require("fs")
  , path = require("path")
  , ws = require('./lib/ws');

fs.readFile('wordlist.csv', 'utf8', function (err, data) {
  if (err) throw err;
  words = data.split('\n');
  sys.log("loaded dictionary, total words: " + words.length);
  //console.log((words.indexOf(process.argv[2]) != -1) ? 'correct' : 'that is not a word');
});

var httpServer = http.createServer(function(request, response) {  
    var uri = url.parse(request.url).pathname;  
    var filename = path.join(process.cwd(), 'static/' + uri);  
    path.exists(filename, function(exists) {  
        if(!exists) {  
            response.writeHead(404, {"Content-Type": "text/plain"});  
            response.write("404 Not Found\n");  
            response.end();  
            return;  
        }  
  
        fs.readFile(filename, "binary", function(err, file) {  
            if(err) {  
                response.writeHead(500, {"Content-Type": "text/plain"});  
                response.write(err + "\n");  
                response.end();  
                return;  
            }  
  
            response.writeHead(200);  
            response.write(file, "binary");  
            response.end();  
        });  
    });  
})

var state = "lobby";

var server = ws.createServer({
  server: httpServer
});

server.addListener("listening", function(){
  sys.log("Listening for connections.");
});

// Handle WebSocket Requests
server.addListener("connection", function(conn){
  
  var username = "user_"+conn.id;
  conn.storage.set("username", username);

  conn.send(JSON.stringify({"action":"userConnected","userId": conn.id}));

  conn.broadcast("** "+username+" connected");

  conn.addListener("message", function(message){
  	var message = JSON.parse(message);
  	
  	if (message.action == "submit"){
  	
  		sys.log("Checking: " + message.word);
  
  		var validWord = (words.indexOf(message.word.toLowerCase()) != -1);
  		
  		sys.log("Valid: " + validWord);
  		
    	server.broadcast(conn.storage.get("username")+": "+validWord);
  	}
    
  });
});

server.addListener("close", function(conn){
  server.broadcast("<"+conn.id+"> disconnected");
});

server.listen(8000);
