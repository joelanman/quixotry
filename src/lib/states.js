
var path = require('path'),
	fs = require('fs'),
	sys = require('sys');

var currentState = "";
var states = {};

debugger;

var files = fs.readdirSync(__dirname + '/states');

files.forEach(function(filename){
	var stateName = path.basename(filename, '.js');
	states[stateName] = require('./states/' + stateName).state;
	quicklog('requiring state: '+stateName);
});
	

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
			
				// TODO user might still exist - check for user id and send state
			
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

var request = function(msg){
	
	var action = msg.action;
	var client = msg.client;
	
	if (states[currentState][action]){ // current state
			
		states[currentState][action](client, msg);
		
	} else if (states.common[action]){ // common events
		
		states.common[action](client, msg);
		
	} else {
		client.send(JSON.stringify({
			action: "error",
			message: "The message you sent was not valid in the current state: " + currentState + " > " + msg.action
		}));	
	}
}

exports.request = request;
exports.changeState = changeState;