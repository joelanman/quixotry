var sys = require("sys");

User = function(id){
	
	this.id    		= id;
	this._name 	   	= "";
	this._status   	= "login";
	this._isDealer 	= false;
	this._score    	= 0;
	this._scoreChange = 0;
	this._word 	   	= "";
	this._hasValidWord = false;
	this._lastActive = new Date();
};

User.prototype.status = function(status){

	if (status == null)
		return this._status;
		
	this._status = status;
	
	return this;
	
}


User.prototype.scoreChange = function(scoreChange){

	if (scoreChange == null)
		return this._scoreChange;
		
	this._scoreChange = scoreChange;
	this._score += scoreChange;
	
	return this;
	
}

User.prototype.score = function(score){

	if (score == null)
		return this._score;
		
	this._score = score;
		
	return this;
}

User.prototype.name = function(name){

	if (name == null)
		return this._name;
		
	this._name = name;
		
	return this;
}

User.prototype.word = function(word){

	if (word == null)
		return this._word;
		
	this._word = word;
		
	return this;
}

User.prototype.hasValidWord = function(isValid){

	if (isValid == null)
		return this._hasValidWord;
		
	this._hasValidWord = isValid;
		
	return this;
}

User.prototype.dealer = function(isDealer){

	if (isDealer == null)
		return this._isDealer;
		
	this._isDealer = isDealer;
		
	return this;
}

User.prototype.lastActive = function(date){

	if (date == null)
		return this._lastActive;
		
	this._lastActive = date;
	
	return this;
	
}

var Channel = function(name){
	
	this.name = name;
	this.clients = {};
	
	this._dealer = null;
	
};

Channel.prototype.add = function(client){
	
	this.clients[client.sessionId] = client;
	
	client.channels[this.name] = true;
	
}

Channel.prototype.remove = function(client){
	
	delete this.clients[client.sessionId];
	
	delete client.channels[this.name];
	
}

Channel.prototype.broadcast = function(message, except){
	
	for (var id in this.clients){
		if (id != except)
			this.clients[id].send(message);
	}
	
}

Channel.prototype.users = function(){
	
	var users = {};
	
	for (var id in this.clients){
		var user = this.clients[id].user;
		users[user.id] = user;
	}
	
	return users;
}

Channel.prototype.usersToArray = function(){
	
	var users = [];
	
	for (var id in this.clients){
		var user = this.clients[id].user;
		users.push(user);
	}
	
	return users;
}

Channel.prototype.dealer = function(user){

	if (user == null) {
		if (this._dealer != null){
			return this._dealer;
		} else {
			return this.newDealer();
		}
	}
	
	this._dealer = user;
	
	return this;
	
};

Channel.prototype.newDealer = function(){

	if (this._dealer == null) {
		
		sys.log("no dealer, selecting first user")
		
		for (id in this.clients) {
			this._dealer = this.clients[id].user;
			
			sys.log("dealer: " + this._dealer.name());
			
			return this._dealer;
			break;
		}
		
	} else {
	
		var dealerFound = false;
	
		sys.log("getting user after current dealer...")
		
		for (id in this.clients) {
			
			var user = this.clients[id].user;
			
			if (user == this._dealer){
				
				dealerFound = true;
				
			} else if (dealerFound)	{
				
				sys.log("dealer: " + this._dealer.name());
			
				this._dealer = user;
				return this._dealer;
				break;
			}
		}
		
		sys.log("dealer not found, must be the first user")
		
		// if dealer is last user, next will fail, and we want to select the first:
		
		this._dealer = null;
		return (this.newDealer());
		
	}
	
};

Channel.prototype.checkUserStatus = function(status){
	
	sys.log("Checking users are all in state: " + status);
	
	for (id in this.clients) {
		if(this.clients[id].user.status() != status){
			sys.log("User not in state: " + userId);
			return false;
		}
	}
	
	return true;
}

Channel.prototype.setUserStatus = function(status){
	
	sys.log("Setting users to state: " + status);
	
	for (id in this.clients) {
		this.clients[id].user.status(status);
	}
	
}

Channel.prototype.endRound = function(){
	
	for (id in this.clients) {
		var user = this.clients[id].user;
		user.scoreChange(0);
		user.word("");
	}
}

Channel.prototype.count = function(){
	
	var count = 0;
	
	for (userId in this.clients) {
		count++;
	}
	
	return count;
}

Channel.prototype.getInactive = function(){
	
	sys.log("Finding inactive clients...");
	
	var date = new Date(),
		inactiveClients = [];
	
	for (id in this.clients) {
		
		var user = this.clients[id].user;
		
		var timeInactive = date - user.lastActive();
		
		sys.log("User inactive for: " + timeInactive/1000 + " secs");
	
		if (timeInactive > 30 * 1000) {
			
			sys.log("Inactive user: " + user.name());
			inactiveClients.push(this.clients[id]);
			
		}
	}
	
	return inactiveClients;
}



ChannelManager = function(){
	this.channels 	= {};
	this.clients 	= {};
};

ChannelManager.prototype.addChannel = function(name){

	this.channels[name] = new Channel(name);
	
};

ChannelManager.prototype.addClient = function(client){

	this.clients[client.sessionId] = client;
	
	client.channels = {};

};

ChannelManager.prototype.removeClient = function(client){

	for (channel in client.channels){
		this.channels[channel].remove(client);
	}
	
	delete this.clients[client.sessionId];

};

ChannelManager.prototype.get = function(userId){
	sys.log("getting user " + userId) + ": " + this.clients[userId];

	for (var sessionId in this.clients) {
		var user = this.getBySessionId(sessionId); 
		if (user.id == userId)
			return user;
	}
	
	return false;
};

ChannelManager.prototype.getBySessionId = function(sessionId){
	
	user = this.clients[sessionId];
		
	return (user) ? user : false;
}

exports.ChannelManager = ChannelManager;
exports.User = User;