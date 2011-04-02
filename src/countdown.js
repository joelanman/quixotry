var sys = require("sys"),
	http = require("http"),
	url = require("url"),
	fs = require("fs"),
	path = require("path"), 
    io = require('socket.io'),
	users = require('./lib/users'),
	crypto = require('crypto');
	
  
function quicklog(s) {
	var logpath = "/tmp/node.log";
	s = s.toString().replace(/\r\n|\r/g, '\n'); // hack
	var fd = fs.openSync(logpath, 'a+', 0666);
	var date = new Date();
	s = '[' + date.toString() + '] ' + s;
	sys.log(s);
	fs.writeSync(fd, s + '\n');
	fs.closeSync(fd);
}

// set up dictionary and letters

fs.readFile('wordlist.csv', 'utf8', function (err, data) {
	
  if (err) throw err;
  words = data.split('\n');
  quicklog("loaded dictionary, total words: " + words.length);
  
});

var	vowels = "AAAAAAAAAEEEEEEEEEEEEIIIIIIIIIOOOOOOOOUUUU", // Scrabble distributions
	consonants = "BBCCDDDDFFGGGHHJKLLLLMMNNNNNNPPQRRRRRRSSSSTTTTTTVVWWXYYZ";
	
// set up servers (to do: take out http server)

var httpServer = http.createServer(function(request, response) {  
    var uri = url.parse(request.url).pathname; 
	
	quicklog(uri);
	
	uri = (uri == "" || uri =="/") ? "index.html" : uri;
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
			try {
				response.write(file, "binary");
			} catch (err){
				quicklog(err);
			}  
            response.end();  
			
        });  
    });  
})


// socket.io 
var socket = io.listen(httpServer); 

var userManager = new users.UserManager();
var currentState = "";
	
var initRound = function(){
	round = {
		"validWords" : [],
		"totalWordLength" : 0,
		"letters" : "",
		"consonants" : 0,
		"vowels" : 0,
		"maxConsonants" : 5,
		"maxVowels" : 5,
		"time" : -1
	};
}

initRound();

var states = {};

states.common = {

	"changeName" : function(msg){
		
		var newName = msg.name;
					
		var user = userManager.getBySessionId(msg.client.sessionId);
		
		quicklog(msg.client.sessionId + ": Name change: '" + user.name() + "' to '" + newName +"'");
		
		user.name(newName);
		
		socket.broadcast(JSON.stringify({
			"action": "changeName",
			"name":    newName,
			"userId":  user.userId
		}));
	},
	
	"error" : function(msg){
		quicklog("error from the client");
	}
	
};

states.lobby = {
	
	"_init" : function(){
		
		quicklog("states.lobby._init");
		
		socket.broadcast(JSON.stringify({action:"state", state:"lobby", users:userManager.users}));
		
		var inactiveUserIds = userManager.getInactive();
		
		for (var i = 0; i < inactiveUserIds.length; i++){
			
			var userId = inactiveUserIds[i];
			
			var user = userManager.get(userId);
			
			socket.clients[user.sessionId].send({'action':'inactive'});
			socket.clients[user.sessionId].emit('disconnect');
			
			delete socket.clients[user.sessionId];
		
		}
		
		var startGame = function(){
	
			if (userManager.count() == 0) {
				
				sys.log("No players - waiting...");
				
			} else {
					
				clearInterval(startGameInterval);
						
				changeState('chooseLetters');
				
			}
		};
				
		startGameInterval = setInterval(startGame, 10000);
		
	},
	
	"_end" : function(){
		
		initRound();
		
	},
	
	"joinRoom" : function(msg){
				
		try{ // user exists
			
			var user = userManager.get(msg.userId);
			
		} catch(err) {
			
			if (msg.name) { // user log in
				var identifier = new Date().toString() + msg.client.sessionId;
				var userId = crypto.createHash('sha1').update(identifier).digest('hex');
				var user = userManager.addUser(userId, msg.client.sessionId);
				
				user.name(msg.name);
				
				msg.client.send(JSON.stringify({
					"action": "yourId",
					"userId": userId
				}));
				
			} else { // id didn't exist - user needs to log in
			
				msg.client.send(JSON.stringify({
					"action": "state",
					"state":  "login"
				}));
				return;
			}
		}
		
		quicklog("User joined: " + msg.client.sessionId);
					
		msg.client.send(JSON.stringify({"action":	"initRoom",
									  	"state":	currentState,
									  	"users":	userManager.users,
									  	"letters": 	round.letters}));
									  
		msg.client.broadcast(JSON.stringify({"action":"addUser", "user":user}));
	}
};

states.chooseLetters = {
	
	"_init" : function(){
		
		quicklog("Starting game");
		
		var msgOut = JSON.stringify({
			"action": "state",
			"state": "chooseLetters",
			"dealerId": userManager.newDealer()
		});
		
		socket.broadcast(msgOut);
		
		dealerDead = function(){
		
			quicklog("Dealer dead!");
			
			clearTimeout(dealerDeadTimeout);
			
			var letters = "";
			
			var numLetters = 8 - round.letters.length;
			
			quicklog("Selected letters : " + round.letters);
			
			var numConsonants = 5 - round.consonants;
			var numVowels = 5 - round.vowels;
			
			if (numLetters < numConsonants) {
				numConsonants = numLetters;
			}
			
			for (var i = 0; i < numConsonants; i++) {
			
				var index = Math.floor(Math.random() * consonants.length);
				letters += consonants.substring(index, index + 1);
				
			}
			
			numLetters = numLetters - numConsonants;
			
			for (var i = 0; i < numLetters; i++) {
			
				var index = Math.floor(Math.random() * vowels.length);
				letters += vowels.substring(index, index + 1);
				
			}
			
			round.letters += letters;
			
			var msgOut = JSON.stringify({
				"action": "dealerDead",
				"letters": letters
			});
			
			socket.broadcast(msgOut);
						
			changeState("game");
			
		};
		
		dealerDeadTimeout = setTimeout(dealerDead, 8 * 1000);
	},
		
	"joinRoom" : function(msg){
				
		try{ // user exists
			
			var user = userManager.get(msg.userId);
			
		} catch(err) {
			
			if (msg.name) { // user log in
				var identifier = new Date().toString() + msg.client.sessionId;
				var userId = crypto.createHash('sha1').update(identifier).digest('hex');
				var user = userManager.addUser(userId, msg.client.sessionId);
				
				user.name(msg.name);
				
				msg.client.send(JSON.stringify({
					"action": "yourId",
					"userId": userId
				}));
				
			} else { // user needs to log in
				msg.client.send(JSON.stringify({
					"action": "state",
					"state":  "login"
				}));
				return;
			}
		}
		userManager.getBySessionId(msg.client.sessionId) = user;
		
		quicklog("User joined: " + msg.client.sessionId);
					
		msg.client.send(JSON.stringify({
			"action":	"initRoom",
			"state":	currentState,
			"users":	userManager.users,
			"dealerId": userManager.dealer(),
			"letters":	round.letters,
			"time":		round.time
		}));
									  
		msg.client.broadcast(JSON.stringify({"action":"addUser", "user":user}));
	},
	
	"chooseLetter" : function(msg){
		
		clearTimeout(dealerDeadTimeout);
		dealerDeadTimeout = setTimeout(dealerDead, 8 * 1000);
		
		if (msg.type == "vowel") {
			if (round.vowels >= round.maxVowels){
				msg.type = "consonant";
			}
		} else {
			if (round.consonants >= round.maxConsonants){
				msg.type = "vowel";
			}
		}
		
		if (msg.type == "vowel"){
			round.vowels += 1 ;
		} else {
			round.consonants += 1;
		}
		
		var letters = (msg.type == "vowel") ? vowels : consonants;
		var index = Math.floor(Math.random()*letters.length);
		var letter = letters.substring(index,index+1);
		
		round.letters += letter;
		
		quicklog("Add tile: " + letter);
		
		socket.broadcast(JSON.stringify({'action':'addTile', 'letter':letter}));
			
		if (round.letters.length == 8) {
			
			clearTimeout(dealerDeadTimeout);
						
			changeState("game");

		}	
	}
}

states.game = {
	
	"_init" :  function(){
		
		userManager.setGroupStatus("game");
		
		round.time = 30;
		
		socket.broadcast(JSON.stringify({'action': 	'state',
										 'state': 	'game',
										 'time': 	round.time}));
		
		var countdown = function(){
			round.time = round.time - 1;
			
			quicklog("Time left: " + round.time);
			
			if (round.time == 0){
				clearInterval(countdownInterval);
				
				changeState("submissions");
			}
		}
		
		countdownInterval = setInterval(countdown, 1000);
		
	},
		
	"joinRoom" : function(msg){
				
		try{ // user exists
			
			var user = userManager.get(msg.userId);
			
		} catch(err) {
						
			if (msg.name) { // user log in
			
				var identifier = new Date().toString() + msg.client.sessionId;
				var userId = crypto.createHash('sha1').update(identifier).digest('hex');
				var user = userManager.addUser(userId, msg.client.sessionId);
				
				user.name(msg.name);
				
				msg.client.send(JSON.stringify({
					"action": "yourId",
					"userId": userId
				}));
				
			} else { // user needs to log in
			
				msg.client.send(JSON.stringify({
					"action": "state",
					"state":  "login"
				}));
				return;
			}
		}
		
		msg.client.send(JSON.stringify({
			"action":	"initRoom",
			"state":	currentState,
			"users":	userManager.users,
			"letters":	round.letters,
			"time":		round.time
		}));
									  
		msg.client.broadcast(JSON.stringify({"action":"addUser", "user":user}));
	},
			
	"submitWord" : function(msg){
		
		quicklog(" submitted: " + msg.word);
		
		var user = userManager.getBySessionId(msg.client.sessionId),
			word = msg.word;
			
		if (word.length > 0){
			user.lastActive(new Date());
		}
		
		user.word(word);
		
  		var validWord = (words.indexOf(word.toLowerCase()) != -1);
  		
  		quicklog("Valid: " + validWord);
		
		user.validWord(validWord);
		
		if (validWord){
			round.validWords.push(user);
			round.totalWordLength += word.length;
		} else {
			user.scoreChange(0);
		}
		
		user.status("submittedWord");
		
		if (userManager.checkGroupStatus("submittedWord")) {
			
			// end the round
						
			changeState('endRound');
			
		}
	}
}

states.submissions = {
	
	"_init" : function(){
		
		quicklog("states.submissions._init");
		
		var endRound = function(){
			changeState("endRound");
		}
		
		this.endRoundTimeout = setTimeout(endRound, 3 * 1000);
		
	},
	
	"_end" : function(){
		
		quicklog("states.submissions._end");
		clearTimeout(this.endRoundTimeout);
		
	},

	"submitWord" : states.game.submitWord
	
}

states.endRound = {
	
	"_init" : function(){
		
		quicklog("states.endRound._init");
		
		var averageWordLength = round.totalWordLength/userManager.count();
			
		quicklog("Average word length: " + averageWordLength);
		
		for (i = 0; i < round.validWords.length; i++){
			var user = round.validWords[i];
			var word = user.word();
			if (word.length > averageWordLength) {
				var scoreChange = Math.ceil(word.length-averageWordLength) * 10;
				user.scoreChange(scoreChange);
			} else {
				user.scoreChange(0);
			}
		}
		
		changeState("lobby");
	}
}

var changeState = function(state){
	
	if (states[state]) {
	
		try {
			states[currentState]._end();
		} catch (err){
			quicklog("End failed for state: " + currentState + ". " + err);
		}
		
		currentState = state;
		
		try {
			states[state]._init();
		} catch (err){
			quicklog("Init failed for state: " + state + ". " + err);
		}
		
	} else {
		// error - state not found
	}
	
}

// Handle WebSocket Requests
socket.on('connection', function(client){ 
	
	quicklog('Client connected');

	client.on('message', function(msg){
		
		quicklog(msg);
	
		try {
			var msgObj = JSON.parse(msg);
		} catch (err){
			quicklog('Invalid JSON: ' + msg);
			return;
		}
		
		msgObj.client = client;
		
		if (states[currentState][msgObj.action]){ // current state
			
			states[currentState][msgObj.action](msgObj);
			
		} else if (states.common[msgObj.action]){ // common events
			
			states.common[msgObj.action](msgObj);
			
		} else {
			client.send(JSON.stringify({
				action: "error",
				message: "The message you sent was not valid in the current state: " + msg
			}));	
		}
	});
	
	
  client.on('disconnect', function(){
  	quicklog('Client disconnected');
	
	var user = userManager.getBySessionId(client.sessionId);
	
	if (user){
		var userId = user.userId;
	
	  	socket.broadcast(JSON.stringify({"action":"closed", "userId":userId}));
	  
	  	userManager.removeUser(userId);

	}
  }) 
});


httpServer.listen(8008);

changeState('lobby');