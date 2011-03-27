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

var	vowels = "AAAAAAAAAEEEEEEEEEEEEIIIIIIIIIOOOOOOOOUUUU", // Scrabble distributions
	consonants = "BBCCDDDDFFGGGHHJKLLLLMMNNNNNNPPQRRRRRRSSSSTTTTTTVVWWXYYZ";

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
var round = {};
var currentState = "";
	
var initRound = function(){
	round = {
		"validWords" : [],
		"totalWordLength" : 0,
		"letters" : "",
		"time" : -1
	};
}

var startGame = function(){
	if (userManager.count()){ // only play if people are connected!
		
		clearInterval(startGameInterval);
		
		sys.log("Starting game");
		
		initRound();
		
		var msgOut = JSON.stringify({
			"action": "state",
			"state":  "chooseLetters",
			"dealerId":  userManager.dealer()
		});
		
		server.broadcast(msgOut);
		
		changeState('chooseLetters');
		
	} else {
		
		sys.log("No players - waiting...");
	}
};

var states = {};

states.common = {

	"changeName" : function(msg){
		
		var newName = msg.name;
					
		var user = connections[msg.conn.id];
		
		sys.log(msg.conn.id + ": Name change: '" + user.name() + "' to '" + newName +"'");
		
		user.name(newName);
		
		server.broadcast(JSON.stringify({
			"action": "changeName",
			"name":    newName,
			"userId":  user.userId
		}));
	}
	
};

states.lobby = {
	
	"_init" : function(){
		
		sys.log("states.lobby._init");
				
		startGameInterval = setInterval(startGame, 10000);
		
	},
	
	"joinRoom" : function(msg){
				
		try{ // user exists
			
			var user = userManager.get(msg.userId);
			
		} catch(err) {
			
			if (msg.name) { // user log in
				var identifier = new Date().toString() + msg.conn.id;
				var userId = crypto.createHash('sha1').update(identifier).digest('hex');
				var user = userManager.addUser(userId);
				
				user.name(msg.name);
				
				msg.conn.send(JSON.stringify({
					"action": "yourId",
					"userId": userId
				}));
				
			} else { // id didn't exist - user needs to log in
			
				msg.conn.send(JSON.stringify({
					"action": "state",
					"state":  "login"
				}));
				return;
			}
		}
		connections[msg.conn.id] = user;
		
		sys.log("User joined: " + msg.conn.id);
					
		msg.conn.send(JSON.stringify({"action":	"initRoom",
									  "state":	 currentState,
									  "users":	 userManager.users,
									  "letters": round.letters}));
									  
		msg.conn.broadcast(JSON.stringify({"action":"addUser", "user":user}));
	}
};

states.chooseLetters = {
		
	"joinRoom" : function(msg){
				
		try{ // user exists
			
			var user = userManager.get(msg.userId);
			
		} catch(err) {
			
			if (msg.name) { // user log in
				var identifier = new Date().toString() + msg.conn.id;
				var userId = crypto.createHash('sha1').update(identifier).digest('hex');
				var user = userManager.addUser(userId);
				
				user.name(msg.name);
				
				msg.conn.send(JSON.stringify({
					"action": "yourId",
					"userId": userId
				}));
				
			} else { // user needs to log in
				msg.conn.send(JSON.stringify({
					"action": "state",
					"state":  "login"
				}));
				return;
			}
		}
		connections[msg.conn.id] = user;
		
		sys.log("User joined: " + msg.conn.id);
					
		msg.conn.send(JSON.stringify({
			"action":	"initRoom",
			"state":	currentState,
			"users":	userManager.users,
			"dealerId":  userManager.dealer(),
			"letters":	round.letters,
			"time":		round.time
		}));
									  
		msg.conn.broadcast(JSON.stringify({"action":"addUser", "user":user}));
	},
	
	"chooseLetter" : function(msg){
		
		var letters = (msg.type == "vowel") ? vowels : consonants;
		var index = Math.floor(Math.random()*letters.length);
		var letter = letters.substring(index,index+1);
		
		round.letters += letter;
		
		sys.log("Add tile: " + letter);
		
		server.broadcast(JSON.stringify({'action':'addTile', 'letter':letter}));
			
		if (round.letters.length == 8) {
			
			round.time = 30;
			
			server.broadcast(JSON.stringify({'action': 	'state',
											 'state': 	'game',
											 'time': 	round.time}));
			
			incrementClock = function(){
				round.time = round.time - 1;
				
				sys.log("Time left: " + round.time);
				
				if (round.time == 0){
					clearInterval(clockInterval);					
				}
			}
			
			clockInterval = setInterval(incrementClock, 1000);
			
			changeState("game");

		}	
	}
}

states.game = {
	
	"_init" :  function(){
		
		userManager.setGroupStatus("game");
		
	},
		
	"joinRoom" : function(msg){
				
		try{ // user exists
			
			var user = userManager.get(msg.userId);
			
		} catch(err) {
			
			if (msg.name) { // user log in
				var identifier = new Date().toString() + msg.conn.id;
				var userId = crypto.createHash('sha1').update(identifier).digest('hex');
				var user = userManager.addUser(userId);
				
				user.name(msg.name);
				
				msg.conn.send(JSON.stringify({
					"action": "yourId",
					"userId": userId
				}));
				
			} else { // user needs to log in
				msg.conn.send(JSON.stringify({
					"action": "state",
					"state":  "login"
				}));
				return;
			}
		}
		connections[msg.conn.id] = user;
		
		sys.log("User joined: " + msg.conn.id);
					
		msg.conn.send(JSON.stringify({
			"action":	"initRoom",
			"state":	currentState,
			"users":	userManager.users,
			"letters":	round.letters,
			"time":		round.time
		}));
									  
		msg.conn.broadcast(JSON.stringify({"action":"addUser", "user":user}));
	},
			
	"submitWord" : function(msg){
		
		sys.log("Submitted: " + msg.word);
		
		var user = connections[msg.conn.id],
			word = msg.word;
		
		user.word(word);
		
  		var validWord = (words.indexOf(word.toLowerCase()) != -1);
  		
  		sys.log("Valid: " + validWord);
		
		user.validWord(validWord);
		
		if (validWord){
			round.validWords.push(user);
			round.totalWordLength += word.length;
		} else {
			user.scoreChange(0);
		}
		
		user.status("submittedWord");
		
		if (userManager.checkGroupStatus("submittedWord")) {
			
			var averageWordLength = round.totalWordLength/userManager.count();
			
			sys.log(averageWordLength);
			
			for (i = 0; i < round.validWords.length; i++){
				var user = round.validWords[i];
				var word = user.word();
				if (word.length > averageWordLength) {
					var scoreChange = Math.ceil(word.length-averageWordLength) * 10;
					user.scoreChange(scoreChange);
				}
			}
			
			msg.conn.send(JSON.stringify({action:"state", state:"lobby", users:userManager.users}));
			msg.conn.broadcast(JSON.stringify({action:"state", state:"lobby", users:userManager.users}));
			
			changeState('lobby');
			
		}
	}
}

var changeState = function(state){
	
	if (states[state]) {
	
		currentState = state;
		
		try {
			states[state]._init();
		} catch (err){
			sys.log("Init failed for state: "+state);
		}
		
	} else {
		// error - state not found
	}
	
}
			
changeState('lobby');

// Handle WebSocket Requests
server.addListener("connection", function(conn){

	conn.addListener("message", function(msg){
	
		try {
			var msgObj = JSON.parse(msg);
		} catch (err){
			sys.log('Invalid JSON: ' + msg);
			return;
		}

		msgObj.conn = conn;
		
		if (states[currentState][msgObj.action]){ // current state
			
			states[currentState][msgObj.action](msgObj);
			
		} else if (states.common[msgObj.action]){ // common events
			
			states.common[msgObj.action](msgObj);
			
		} else {
			conn.send(JSON.stringify({
				action: "error",
				message: "The message you sent was not valid in the current state: " + msg
			}));	
		}
	});
});

server.addListener("close", function(conn){
	
	var user = connections[conn.id];
	
	if(user){
		var userId = user.userId;
	
	  	server.broadcast(JSON.stringify({"action":"closed", "userId":userId}));
	  
	  	userManager.removeUser(userId);
	
		delete connections[conn.id];
	}
	
	
});

server.listen(8008);
