crypto = require('crypto');

exports.state = function(game){
	
	return {
		
		"changeName" : function(client, msg){
			
			var newName = msg.name;
			var user = client.user;
			
			quicklog(client.sessionId + ": Name change: '" + user.name() + "' to '" + newName +"'");
			
			user.name(newName);
			
			game.channels.active.broadcast(JSON.stringify({
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
				
					var identifier = new Date().toString() + client.id;
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
			
			game.channels.login.remove(client);
			game.channels.active.add(client);
			
			quicklog('Total connections: ' + game.channels.active.count());
			
			var dealer = game.channels.active.dealer();
			
			client.send(JSON.stringify({
				"action":		"initRoom",
				"state":		game.currentState,
				"users":		game.channels.active.users(),
				"dealerId": 	dealer.id,
				"dealerName": 	dealer.name(),
				"letters":		game.round.letters,
				"time":			game.round.time
			}));
										  
			game.channels.active.broadcast(JSON.stringify({"action":"addUser", "user":user}));
		},
		
	};
};
