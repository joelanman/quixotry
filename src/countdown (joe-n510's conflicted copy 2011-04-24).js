var sys = require("sys")
  , http = require("http")
  , url = require("url")
  , fs = require("fs")
  , path = require("path")
  , ws = require('./lib/ws')
  , users = require('./lib/users'),
  crypto = require('crypto');
  
var userManager = new users.UserManager();
var roomManager = new users.RoomManager();

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


var server = ws.createServer({
	server: httpServer,
	debug: 	true
});

server.addListener("listening", function(){
  sys.log("Listening for connections.");
});


var connections = {};

// Handle WebSocket Requests
server.addListener("connection", function(conn){

	var actions = {
		"submit" : function(message){
			sys.log("Checking: " + message.word);
		  
	  		var validWord = (words.indexOf(message.word.toLowerCase()) != -1);
	  		
	  		sys.log("Valid: " + validWord);
	  		
			server.broadcast(conn.storage.get("username") + ": "+validWord);
		},
		
		"joinRoom" : function(message){
			sys.log("Joining: " + message.roomId);
			
			try{
				
				var user = userManager.get(message.userId);
				
			} catch(err) {
				
				var identifier = new Date().toString() + conn.id;
				var userId = crypto.createHash('sha1').update(identifier).digest('hex');
				var user = userManager.addUser(userId);
				
				conn.send(JSON.stringify({"action":"yourId", "userId":userId}));
			}
			connections[conn.id] = {'userId': user.userId};
			
			try {
				var room = roomManager.get(message.roomId);
			} catch (err) {
				var room = roomManager.addRoom(message.roomId);
				user.dealer(true);
			}				
						
			user.room(room.id);
			
			conn.send(JSON.stringify({"action":"initRoom", "room": room}));
			conn.broadcast(JSON.stringify({"action":"joinRoom","userId":user.userId}));
		},
		
		"userReady" : function(message){
			sys.log("User ready: " + message.userId);
			var user = userManager.get(message.userId)
			user.ready(message.isReady);
			conn.broadcast(JSON.stringify({"action":"userReady","userId":message.userId, "isReady":message.isReady}));
			
			if (message.isReady){
				if (user.room().allReady()) {
					
					server.broadcast(JSON.stringify({
						"action": "state",
						"state": "allReady"
					}));
					
					var startGame = function(){
						sys.log("starting game");
						conn.send(JSON.stringify({
							"action": 	"state",
							"state": 	"game",
							"dealer":	true
						}));
						conn.broadcast(JSON.stringify({
							"action": 	"state",
							"state": 	"game",
							"dealer":	false
						}));
					}

					startGameTimeout = setTimeout(startGame, 5000);
				}
			} else {
				try {
					clearTimeout(startGameTimeout);
				} catch(err){}
			}
			
		},
		"addTile" : function(message){
			sys.log("Add tile: " + message.letter);
			
			conn.broadcast(JSON.stringify({"action":"addTile","letter":message.letter}));
		},
	}

	conn.addListener("message", function(message){
	
		try {
			var message = JSON.parse(message);
		} catch (err){
			sys.log('Invalid JSON: '+message);
			return;
		}

		if (actions[message.action])
			actions[message.action](message);
		
	});
});

server.addListener("close", function(conn){
	
	var userId = connections[conn.id].userId;
	
  	server.broadcast(JSON.stringify({"action":"closed","userId":userId}));
  
  	//userManager.removeUser(userId);

	delete connections[conn.id];
	
});

server.listen(8008);
