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

var userManager = {
	users: {}
};

User = function(userId){
	this.userId = userId;
	this._isReady = false;
	this._room = null;
};

User.prototype.ready = function(isReady){

	if (isReady == null)
		return this._isReady;
		
	this._isReady = isReady;
	
	return this;
	
}

User.prototype.room = function(room){

	if (room == null)
		return this._room;
		
	this._room = room;
	
	room.addUser(this);
	
	return this;
}

userManager.addUser = function(userId){

	sys.log("Adding user: " + userId);
	
	this.users[userId] = new User(userId);
};

userManager.removeUser = function(userId){

	sys.log("Removing user: " + userId);
	
	var user = this.users[userId];
	
	user.room().removeUser(user);
	
	delete this.users[userId];
};

userManager.get = function(userId){
	sys.log("getting user " + userId) + ": " + this.users[userId];
	return this.users[userId];
};


Room = function(id){

	this.id = id;
	this.state = "lobby";
	this.users = {};

};

Room.prototype.addUser = function(user){
	
	this.users[user.userId] = 1;
	
	return this;
}

Room.prototype.removeUser = function(user){
	
	delete this.users[user.userId];
	
	return this;
}

Room.prototype.allReady = function(){
	sys.log("Checking users are ready");
	for (userId in this.users) {
		sys.log(userId);
		if (userManager.get(userId).ready() == false) 
			return false;
	}
	
	return true;
}
	
var roomManager = {
	rooms: {}
}

roomManager.addRoom = function(roomId){

	sys.log("Adding room: " + roomId);
	
	this.rooms[roomId] = new Room(roomId);
	
	return this.rooms[roomId];
};

roomManager.removeRoom = function(roomId){

	sys.log("Removing room: " + roomId);
		
	delete this.rooms[roomId];
};

roomManager.get = function(roomId){
	if (typeof(this.rooms[roomId]) == "undefined")
		throw("room not found");
	return this.rooms[roomId];
};



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
  server: 	httpServer,
  debug: 	true
});

server.addListener("listeninghttp://cards.pronked.com/Game.aspx/Details/66dbba84-d495-4834-98ec-e3ce83ce0d03", function(){
  sys.log("Listening for connections.");
});

startGame = function(){
	sys.log("starting game");
	server.broadcast(JSON.stringify({
		"action": "state",
		"state": "game"
	}));
}

// Handle WebSocket Requests
server.addListener("connection", function(conn){

	var actions = {
		"submit" : function(message){
			sys.log("Checking: " + message.word);
		  
	  		var validWord = (words.indexOf(message.word.toLowerCase()) != -1);
	  		
	  		sys.log("Valid: " + validWord);
	  		
			server.broadcast(conn.storage.get("username")+": "+validWord);
		},
		"joinRoom" : function(message){
			sys.log("Joining: " + message.roomId);
			
			try {
				var room = roomManager.get(message.roomId);
			} catch (err) {
				var room = roomManager.addRoom(message.roomId);
			}				
						
			userManager.get(conn.id).room(room);
			
			conn.send(JSON.stringify({"action":"initRoom", "room": room}));
			conn.broadcast(JSON.stringify({"action":"joinRoom","userId":conn.id}));
		},
		"userReady" : function(message){
			sys.log("User ready: " + conn.id);
			var user = userManager.get(conn.id)
			user.ready(message.isReady);
			conn.broadcast(JSON.stringify({"action":"userReady","userId":conn.id, "isReady":message.isReady}));
			
			if (message.isReady){
				if (user.room().allReady()) {
					
					server.broadcast(JSON.stringify({
						"action": "state",
						"state": "allReady"
					}));
					
					startGameTimeout = setTimeout(startGame, 5000);
				}
			} else {
				try {
					clearTimeout(startGameTimeout);
				} catch(err){}
			}
			
		}
	}
	
	userManager.addUser(conn.id);
	
	conn.send(JSON.stringify({"action":"yourId", "userId":conn.id}));

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
  server.broadcast(JSON.stringify({"action":"closed","userId":conn.id}));
  
  userManager.removeUser(conn.id);
  
});

server.listen(8008);
