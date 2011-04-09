var userManager = {
	users: {}
};

userManager.addUser = function(user){

	log("Adding user: " + user.id);
	
	if (!this.users[user.id])
		this.users[user.id] = new User(user);
};

userManager.removeUser = function(id){
	
	log("Removing user: " + id);
	
	$('#user_'+ id).fadeOut();
	
	delete this.users[id];
};

userManager.removeUsers = function(ids){
	
	for (var i=0; i<ids.length; i++)
		this.removeUser(ids[i]);
		
};

userManager.updateUsers = function(users){
	for (var id in users){
		userManager.get(id).update(users[id]);
	}
};

userManager.get = function(id){
	return this.users[id];
};

User = function(user){
		
	this.$el = userManager.$userTemplate.clone();
	this.$el.attr('id','user_'+ user.id);
	
	this.update(user);
	
	this.$el.appendTo($('#users'));
};

User.prototype.update = function(user){

	for (var property in user){
		this[property] = user[property];
	}
	
	this.$el.find('.name').text(this.name());
	this.$el.find('.word').text(this.word());
	this.$el.find('.scoreChange').text(this.scoreChange());
	this.$el.find('.score').text(this.score());
	
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