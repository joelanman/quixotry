var sys = require("sys"),
	http = require("http"),
	url = require("url"),
	fs = require("fs"),
	path = require("path"), 
	
    io = require('socket.io'),
	users = require('./lib/users'),
	channels = require('./lib/channels'),
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

fs.readFile(__dirname + '/wordlist.csv', 'utf8', function (err, data) {
	
  if (err) throw err;
  words = data.split('\n');
  quicklog("loaded dictionary, total words: " + words.length);
  
});

var	vowels = "AAAAAAAAAEEEEEEEEEEEEIIIIIIIIIOOOOOOOOUUUU", // Scrabble distributions
	consonants = "BBCCDDDDFFGGGHHJKLLLLMMNNNNNNPPQRRRRRRSSSSTTTTTTVVWWXYYZ";
	
// set up servers (to do: take out http server)

var httpServer = http.createServer(function(request, response) { 

    var uri = url.parse(request.url).pathname; 
	
	uri = (uri == "" || uri == "/") ? "index.html" : uri;
	
    var filename = path.join(__dirname, '/static/' + uri);  
	
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

var channelManager = new users.ChannelManager();
var User = users.User;

channelManager.addChannel("login");
channelManager.addChannel("active");
channelManager.addChannel("inactive");

var channels = channelManager.channels;

var currentState = "";
	
var initRound = function(){
	round = {
		"usersWithValidWords" : [],
		"totalWordLength" : 0,
		"letters" : "",
		"consonants" : 0,
		"vowels" : 0,
		"maxConsonants" : 5,
		"maxVowels" : 5,
		"time" : -1,
		"leaderboards" : {
			"round": [],
			"overall" : []
		}
	};
}

initRound();

var states = {};

states.common = {

	"changeName" : function(client, msg){
		
		var newName = msg.name;
					
		var user = client.user;
		
		quicklog(client.sessionId + ": Name change: '" + user.name() + "' to '" + newName +"'");
		
		user.name(newName);
		
		channels.active.broadcast(JSON.stringify({
			"action": "changeName",
			"name":    newName,
			"userId":  user.userId
		}));
	},
	
	"error" : function(client, msg){
		quicklog("error from the client");
	},
	
	"joinRoom" : function(client, msg){
				
		try{ // user exists
			
			// to do: get existing user from storage
			
			throw("no storage yet");
			
		} catch(err) {
						
			if (msg.name) { // user log in
			
				var identifier = new Date().toString() + client.sessionId;
				var userId = crypto.createHash('sha1').update(identifier).digest('hex');
				
				var user = new User(userId);
				
				client.user = user;
				
				user.name(msg.name);
				
				client.send(JSON.stringify({
					"action": "yourId",
					"userId": userId
				}));
				
			} else { // user needs to log in
			
				client.send(JSON.stringify({
					"action": "state",
					"state":  "login"
				}));
				return;
			}
		}
		
		channels.login.remove(client);
		channels.active.add(client);
		
		quicklog('Total connections: ' + channels.active.count());
		
		var dealer = channels.active.dealer();
		
		client.send(JSON.stringify({
			"action":		"initRoom",
			"state":		currentState,
			"users":		channels.active.users(),
			"dealerId": 	dealer.id,
			"dealerName": 	dealer.name,
			"letters":		round.letters,
			"time":			round.time
		}));
									  
		channels.active.broadcast(JSON.stringify({"action":"addUser", "user":user}));
	},
	
};

states.lobby = {
	
	"_init" : function(){
		
		quicklog("states.lobby._init");
		
		// cull inactive users
		
		var inactiveClients = channels.active.getInactive();
		
		if (inactiveClients.length){
			
			var inactiveUserIds = [];
			
			for (var i = 0; i < inactiveClients.length; i++){
							
				var client = inactiveClients[i];
			
				channels.active.remove(client);
				channels.inactive.add(client);
				
				client.send(JSON.stringify({'action':'timeout'}));
				
				inactiveUserIds.push(client.user.id);
			
			}
			
			/*
			channels.active.broadcast(JSON.stringify({
				action: "closed",
				users: inactiveUserIds
			}));
			*/
		}
												   					   
		channels.active.broadcast(JSON.stringify({action: "state",
												  state: "lobby",
												  leaderboards: round.leaderboards}));
		
		var startGame = function(){
	
			if (channels.active.count() == 0) {
				
				sys.log("No players - waiting...");
				
			} else {
					
				clearInterval(startGameInterval);
						
				changeState('chooseLetters');
				
			}
		};
				
		startGameInterval = setInterval(startGame, 10000);
		
	},
	
	"_end" : function(){
		
		channels.active.endRound();
		
		initRound();
		
	}
};

states.chooseLetters = {
	
	"_init" : function(){
		
		quicklog("Starting game");
		
		var dealer = channels.active.newDealer();
		
		var msgOut = JSON.stringify({
			"action": "state",
			"state": "chooseLetters",
			"dealerId": dealer.id,
			"dealerName": dealer.name()
		});
		
		channels.active.broadcast(msgOut);
		
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
			
			var index = round.letters.length;
			
			round.letters += letters;
			
			var msgOut = JSON.stringify({
				"action": 	  "dealerDead",
				"letters": 	  letters,
				"startIndex": index
			});
			
			channels.active.broadcast(msgOut);
						
			changeState("game");
			
		};
		
		dealerDeadTimeout = setTimeout(dealerDead, 8 * 1000);
	},
	
	"chooseLetter" : function(client, msg){
		
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
		var letter = letters.substring(index, index+1);
		
		round.letters += letter;
		
		var index = round.letters.length - 1;
		
		quicklog("Add tile: " + letter);
		
		channels.active.broadcast(JSON.stringify({'action':	'addTile',
												  'letter':	letter,
												  'index':	index}));
		
		if (round.letters.length >= 8) {
			
			clearTimeout(dealerDeadTimeout);
						
			changeState("game");

		}	
	}
}

states.game = {
	
	"_init" :  function(){
		
		channels.active.setUserStatus("game");
		
		round.time = 30;
		
		channels.active.broadcast(JSON.stringify({'action': 	'state',
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
			
	"submitLetters" : function(client, msg){
				
		var word = "";
		
		for (var i=0; i < msg.letters.length; i++){
			word += round.letters.charAt(msg.letters[i]);
		}
		
		quicklog(" submitted: " + word);
		
		var user = client.user;
			
		if (word.length > 0){
			user.lastActive(new Date());
		}
		
		user.word(word);
		
  		var hasValidWord = (words.indexOf(word.toLowerCase()) != -1);
  		
  		quicklog("Valid: " + hasValidWord);
		
		user.hasValidWord(hasValidWord);
		
		if (hasValidWord){
			round.usersWithValidWords.push(user);
			round.totalWordLength += word.length;
		} else {
			user.scoreChange(0);
		}
		
		user.status("submittedWord");
		
		if (channels.active.checkUserStatus("submittedWord")) {
						
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

	"submitLetters" : states.game.submitLetters
	
}

var compareScore = function(a,b){
	
	if (a.scoreChange() > b.scoreChange()){
		return -1;
	} else
	if (a.scoreChange() < b.scoreChange()){
		return 1;
	} else {
		return 0;
	}
}

var compareTotalScore = function(a,b){
	
	if (a.totalScore() > b.totalScore()){
		return -1;
	} else
	if (a.totalScore() < b.totalScore()){
		return 1;
	} else {
		return 0;
	}
}

states.endRound = {
	
	"_init" : function(){
		
		quicklog("states.endRound._init");
		
		var averageWordLength = round.totalWordLength/channels.active.count();
			
		quicklog("Average word length: " + averageWordLength);
		
		for (i = 0; i < round.usersWithValidWords.length; i++){
			var user = round.usersWithValidWords[i];
			var word = user.word();
			if (word.length > averageWordLength) {
				var scoreChange = Math.ceil(word.length-averageWordLength) * 10;
				user.scoreChange(scoreChange);
			} else {
				user.scoreChange(0);
			}
		}
		
		var activeUserArray = channels.active.usersToArray();
		
		round.leaderboards.round   = activeUserArray;
		round.leaderboards.overall = activeUserArray;
		
		round.leaderboards.round.sort(compareScore);
		round.leaderboards.overall.sort(compareTotalScore);
		
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
		quicklog("State doesn't exist: " + state );
	}
	
}

// Handle WebSocket Requests
socket.on('connection', function(client){ 
	
	quicklog('Client connected.');
	
	channelManager.addClient(client);
	
	channels.login.add(client);

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
			
			states[currentState][msgObj.action](client, msgObj);
			
		} else if (states.common[msgObj.action]){ // common events
			
			states.common[msgObj.action](client, msgObj);
			
		} else {
			client.send(JSON.stringify({
				action: "error",
				message: "The message you sent was not valid in the current state: " + msg
			}));	
		}
	});
	
	
  client.on('disconnect', function(){
  	
  	quicklog('Client disconnected');
	
	channelManager.removeClient(client);
	
	if (client.user){
		
		//channels.active.broadcast(JSON.stringify({"action":"closed", "users":[client.user.id]}));
	}
	
  }) 
});


httpServer.listen(8008);

changeState('lobby');