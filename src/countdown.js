var sys = require("sys"),
	http = require("http"),
	url = require("url"),
	fs = require("fs"),
	path = require("path"), 
	
    io = require('socket.io'),
	utils = require('./lib/utils'),
	users = require('./lib/users');
	
var quicklog = utils.quicklog;

var game = {};

// set up dictionary and letters

fs.readFile(__dirname + '/wordlist.csv', 'utf8', function (err, data) {
	
  if (err) throw err;
  game.words = data.split('\n');
  quicklog("loaded dictionary, total words: " + game.words.length);
  
});

game.vowels 	= "AAAAAAAAAEEEEEEEEEEEEIIIIIIIIIOOOOOOOOUUUU";
game.consonants = "BBCCDDDDFFGGGHHJKLLLLMMNNNNNNPPQRRRRRRSSSSTTTTTTVVWWXYYZ";
	
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

// channels

var channelManager = new users.ChannelManager();

channelManager.addChannel("login");
channelManager.addChannel("active");
channelManager.addChannel("inactive");

game.channels = channelManager.channels;
	
game.initRound = function(){
	this.round = {
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
};

game.initRound();

// states

game.currentState = "";
game.states = {};

game.changeState = function(state){
	
	if (this.states[state]) {
	
		try {
			this.states[this.currentState]._end();
		} catch (err){
			quicklog("End failed for state: " + this.currentState + ". " + err);
		}
		
		this.currentState = state;
		
		try {
			this.states[state]._init();
		} catch (err){
			quicklog("Init failed for state: " + state + ". " + err);
		}
		
	} else {
		// error - state not found
		quicklog("State doesn't exist: " + state );
	}
	
}

game.request = function(msg){
	
	var action = msg.action;
	var client = msg.client;
	
	if (this.states[this.currentState][action]){ // current state
			
		this.states[this.currentState][action](client, msg);
		
	} else if (this.states.common[action]){ // common events
		
		this.states.common[action](client, msg);
		
	} else {
		client.send(JSON.stringify({
			action: "error",
			message: "The message you sent was not valid in the current state: " + this.currentState + " > " + msg.action
		}));	
	}
}

var files = fs.readdirSync(__dirname + '/states');

files.forEach(function(filename){
	var stateName = path.basename(filename, '.js');
	game.states[stateName] = require('./states/' + stateName).state(game);
	quicklog('requiring state: '+stateName);
});

// socket.io 
var io = io.listen(httpServer); 

// Handle WebSocket Requests
io.sockets.on('connection', function(client){ 
	
	quicklog('Client connected.');
	
	channelManager.addClient(client), 'login';
	
	client.on('message', function(msg){
		
		quicklog(msg);
	
		try {
			var msgObj = JSON.parse(msg);
		} catch (err){
			quicklog('Invalid JSON: ' + msg);
			return;
		}
		
		msgObj.client = client;
				
		game.request(msgObj);
		
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

game.changeState('lobby');