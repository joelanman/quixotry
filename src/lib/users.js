var sys = require("sys");
/*
 * User
 * UserManager
 * Room
 * RoomManager
 */

exports.User = function(userId){
	this.userId    = userId;
	this._name 	   = userId;
	this._status   = "lobby";
	this._roomId   = null;
	this._isDealer = false;
	this._score    = 0;
	this._scoreChange = 0;
	this._word 	   = "";
	this._validWord = true;
};

exports.User.prototype.status = function(status){

	if (status == null)
		return this._status;
		
	this._status = status;
	
	return this;
	
}

exports.User.prototype.scoreChange = function(scoreChange){

	if (scoreChange == null)
		return this._scoreChange;
		
	this._scoreChange = scoreChange;
	this._score += scoreChange;
	
	return this;
	
}

exports.User.prototype.score = function(score){

	if (score == null)
		return this._score;
		
	this._score = score;
		
	return this;
}

exports.User.prototype.name = function(name){

	if (name == null)
		return this._name;
		
	this._name = name;
		
	return this;
}

exports.User.prototype.word = function(word){

	if (word == null)
		return this._word;
		
	this._word = word;
		
	return this;
}

exports.User.prototype.validWord = function(isValid){

	if (isValid == null)
		return this._validWord;
		
	this._validWord = isValid;
		
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

exports.UserManager.prototype.dealer = function(userId){

	if (userId == null){
		for (userId in this.users){
			return this.users[userId].userId;
			break;
		}
	}
	
};

exports.UserManager.prototype.addUser = function(userId){

	sys.log("Adding user: " + userId);
	
	this.users[userId] = new exports.User(userId);
	
	return this.users[userId];
};

exports.UserManager.prototype.removeUser = function(userId){

	sys.log("Removing user: " + userId);
	
	var user = this.users[userId];
		
	delete this.users[userId];
};

exports.UserManager.prototype.get = function(userId){
	sys.log("getting user " + userId) + ": " + this.users[userId];
	
	if (!this.users[userId])
		throw("user not found");
		
	return this.users[userId];
};

exports.UserManager.prototype.checkGroupStatus = function(status){
	sys.log("Checking users are all in state: " + status);
	for (userId in this.users) {
		if (this.get(userId).status() != status) {
			sys.log("User not in state: " + userId);
			return false;
		}
	}
	
	return true;
}

exports.UserManager.prototype.setGroupStatus = function(status){
	
	sys.log("Setting users to state: " + status);
	
	for (userId in this.users) {
		this.get(userId).status(status);
	}
	
}

exports.UserManager.prototype.count = function(){
	
	var count = 0;
	
	for (userId in this.users) {
		count++;
	}
	
	return count;
}