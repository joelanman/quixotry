var sys = require("sys");
/*
 * User
 * UeerManager
 * Room
 * RoomManager
 */

exports.User = function(userId){
	this.userId    = userId;
	this._name 	   = userId;
	this._isReady  = false;
	this._roomId   = null;
	this._isDealer = false;
};

exports.User.prototype.ready = function(isReady){

	if (isReady == null)
		return this._isReady;
		
	this._isReady = isReady;
	
	return this;
	
}

exports.User.prototype.name = function(name){

	if (name == null)
		return this._name;
		
	this._name = name;
		
	return this;
}

exports.User.prototype.dealer = function(isDealer){

	if (isDealer == null)
		return this._isDealer;
		
	this._isDealer = isDealer;
		
	return this;
}


exports.UserManager = function(){
	this.users = {};
};

exports.UserManager.prototype.addUser = function(userId){

	sys.log("Adding user: " + userId);
	
	this.users[userId] = new exports.User(userId);
	
	return this.users[userId];
};

exports.UserManager.prototype.removeUser = function(userId){

	sys.log("Removing user: " + userId);
	
	var user = this.users[userId];
	
	user.room().removeUser(user);
	
	delete this.users[userId];
};

exports.UserManager.prototype.get = function(userId){
	sys.log("getting user " + userId) + ": " + this.users[userId];
	
	if (!this.users[userId])
		throw("user not found");
		
	return this.users[userId];
};

exports.UserManager.prototype.allReady = function(){
	sys.log("Checking users are ready");
	for (userId in this.users) {
		sys.log(userId);
		if (this.get(userId).ready() == false) 
			return false;
	}
	
	return true;
}