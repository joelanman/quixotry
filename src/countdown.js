var sys = require("sys"),
	http = require("http"),
	url = require("url"),
	fs = require("fs"),
	path = require("path"), 
	
    io = require('socket.io'),
	utils = require('./lib/utils'),
	users = require('./lib/users'),
	states = require('./lib/states'),
	crypto = require('crypto');
	
var quicklog = utils.quicklog;

// set up dictionary and letters

fs.readFile(__dirname + '/wordlist.csv', 'utf8', function (err, data) {
	
  if (err) throw err;
  var words = data.split('\n');
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
var io = io.listen(httpServer); 

var channelManager = new users.ChannelManager();

channelManager.addChannel("login");
channelManager.addChannel("active");
channelManager.addChannel("inactive");
	
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
				
		states.request(msgObj);
		
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

states.changeState('lobby');