var sys = require("sys"),
  http = require("http"),
  url = require("url"),
  fs = require("fs"),
  path = require("path"),
  ws = require('./lib/ws'),
  users = require('./lib/users'),
  crypto = require('crypto');
  

fs.readFile('wordlist.csv', 'utf8', function (err, data) {
	
  if (err) throw err;
  words = data.split('\n');
  sys.log("loaded dictionary, total words: " + words.length);
  
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

var userManager = new users.UserManager();
var state = "lobby";

var validWords = [],
	totalWordLength = 0;

// Handle WebSocket Requests
server.addListener("connection", function(conn){

	var actions = {
		"tryWord" : function(message){
			
			sys.log("Checking: " + message.word);
		  
	  		var validWord = (words.indexOf(message.word.toLowerCase()) != -1);
	  		
	  		sys.log("Valid: " + validWord);
	  		
			server.broadcast(conn.storage.get("username") + ": "+validWord);
		},
		
		"submitWord" : function(message){
			
			sys.log("Submitted: " + message.word);
			
			var user = connections[conn.id],
				word = message.word;
			
			user.word(word);
			
	  		var validWord = (words.indexOf(word.toLowerCase()) != -1);
	  		
	  		sys.log("Valid: " + validWord);
			
			user.validWord(validWord);
			
			if (validWord){
				validWords.push(user);
				totalWordLength += word.length;
			}
			
			user.status("submittedWord");
			
			if (userManager.checkGroupStatus("submittedWord")) {
				
				var averageWordLength = totalWordLength/validWords.length;
				
				for (i = 0; i < validWords.length; i++){
					var user = validWords[i];
					var word = user.word();
					if (word.length > averageWordLength) {
						var scoreChange = word.length-averageWordLength;
						user.scoreChange(scoreChange);
					}
				}
				
				conn.send(JSON.stringify({action:"state", state:"lobby", users:userManager.users}));
				conn.broadcast(JSON.stringify({action:"state", state:"lobby", users:userManager.users}));
				
			}
		},
		
		"changeName" : function(message){
			
			var newName = message.name;
			
			sys.log("Name change to: " + newName);
			
			var user = connections[conn.id];
			
			user.name(newName);
			
			server.broadcast(JSON.stringify({
				"action": "changeName",
				"name":    newName,
				"userId":  user.userId
			}));
		},
		
		"joinRoom" : function(message){
			sys.log("Joining");
			
			try{
				
				var user = userManager.get(message.userId);
				
			} catch(err) {
				
				var identifier = new Date().toString() + conn.id;
				var userId = crypto.createHash('sha1').update(identifier).digest('hex');
				var user = userManager.addUser(userId);
				
				conn.send(JSON.stringify({"action":"yourId", "userId":userId}));
			}
			connections[conn.id] = user;
						
			conn.send(JSON.stringify({"action":"initRoom", state:state, users:userManager.users}));
			conn.broadcast(JSON.stringify({"action":"joinRoom", "user":user}));
		},
		
		"userReady" : function(message){
			sys.log("User ready: " + message.userId);
			var user = userManager.get(message.userId)
			user.status((message.isReady) ? "ready" : "lobby");
			conn.broadcast(JSON.stringify({"action":"userReady","userId":message.userId, "isReady":message.isReady}));
			
			if (message.isReady){
				if (userManager.checkGroupStatus("ready")) {
					
					server.broadcast(JSON.stringify({
						"action": "state",
						"state": "allReady"
					}));
					
					var startGame = function(){
						sys.log("starting game");
						conn.send(JSON.stringify({
							"action": "state",
							"state":  "game",
							"dealerId":  user.userId
						}));
						conn.broadcast(JSON.stringify({
							"action": "state",
							"state":  "game",
							"dealerId":  user.userId
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
			
			conn.broadcast(JSON.stringify({"action":"addTile", "letter":message.letter}));
		},
		"tileSelectionComplete" : function(message){
			
			conn.send(JSON.stringify({"action":"startGame"}));
			conn.broadcast(JSON.stringify({"action":"startGame"}));
		}
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
	
  	server.broadcast(JSON.stringify({"action":"closed", "userId":userId}));
  
  	//userManager.removeUser(userId);

	delete connections[conn.id];
	
});

server.listen(8008);
