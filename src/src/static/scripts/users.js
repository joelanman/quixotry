var userManager = {
	users: {}
};

userManager.addUser = function(user){

	log("Adding user: " + user.userId);
	
	if (!this.users[user.userId])
		this.users[user.userId] = new User(user);
};

userManager.removeUser = function(userId){
	
	log("Removing user: " + userId);
	
	$('#user_'+ userId).fadeOut();
	
	delete this.users[userId];
};

userManager.updateUsers = function(users){
	for (var id in users){
		userManager.get(id).update(users[id]);
	}
}

userManager.get = function(userId){
	return this.users[userId];
};

User = function(user){
		
	this.$el = userManager.$userTemplate.clone();
	this.$el.attr('id','user_'+ user.userId);
	
	this.update(user);
	
	this.$el.appendTo($('#users'));
};

User.prototype.update = function(user){

	for (property in user){
		this[property] = user[property];
	}
	
	this.$el.find('.name').text(this.name());
	this.$el.find('.word').text(this.word());
	this.$el.find('.scoreChange').text(this.scoreChange());
	this.$el.find('.score').text(this.score());
	
	if (this.userId == selfId)
		$('#selfName').text(this.name());
		
	return this;
}

User.prototype.scoreChange = function(scoreChange){

	if (scoreChange == null)
		return this._scoreChange;
		
	this._scoreChange = scoreChange;
	this._score += scoreChange;
	
	return this;
	
}

User.prototype.name = function(name){

	if (name === undefined)
		return this._name;
		
	this._name = name;
		
	return this;
}

User.prototype.score = function(score){

	if (score == null)
		return this._score;
		
	this._score = score;
		
	return this;
}

User.prototype.word = function(word){

	if (word == null)
		return this._word;
		
	this._word = word;
		
	return this;
}