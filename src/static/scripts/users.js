Array.prototype.sum = function(){
	for(var i=0,sum=0;i<this.length;sum+=this[i++]);
	return sum;
}


var userManager = {
};

userManager.init = function(){
	this.users = {};
}

userManager.count = function(){
	
	var count = 0;
	
	for (userId in this.users) {
		count++;
	}
	
	return count;
}


userManager.addUser = function(user){

	log("Adding user: " + user.id);
	
	if (!this.users[user.id])
		this.users[user.id] = new User(user);
};

userManager.removeUser = function(id){
	
	log("Removing user: " + id);
	
	$('#user_'+ id).fadeOut(function(){$(this).remove()});
	
	delete this.users[id];
};

userManager.removeUsers = function(ids){
	
	for (var i=0; i<ids.length; i++)
		this.removeUser(ids[i]);
		
};

userManager.removeAll = function(){
	
	for (var id in this.users){
		this.removeUser(id);
	}
		
};

userManager.updateUsers = function(users){
	for (var id in users){
		userManager.get(id).update(users[id]);
	}
};

userManager.get = function(id){
	return this.users[id];
};

userManager.init();

User = function(user){
	
	this.update(user);
};

User.prototype.update = function(user){

	for (var property in user){
		this[property] = user[property];
	}
	
	if (this.id === selfId)
		$('#selfName').text(this.name());
		
	return this;
};

User.prototype.scoreChange = function(scoreChange){

	if (scoreChange === undefined)
		return this._scoreChange;
		
	this._scoreChange = scoreChange;
	this._score += scoreChange;
	
	return this;
	
};

User.prototype.totalScore = function(){

	return this.previousScores.sum();
	
}

User.prototype.name = function(name){

	if (name === undefined)
		return this._name;
		
	this._name = name;
		
	return this;
};

User.prototype.score = function(score){

	if (score === undefined)
		return this._score;
		
	this._score = score;
		
	return this;
};

User.prototype.word = function(word){

	if (word === undefined)
		return this._word;
		
	this._word = word;
		
	return this;
};

User.prototype.hasValidWord = function(isValid){

	if (isValid == null)
		return this._hasValidWord;
		
	this._hasValidWord = isValid;
		
	return this;
}

