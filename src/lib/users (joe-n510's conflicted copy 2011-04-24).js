
function UserManager (){
	this.users = {};
	this.totalUsers = 0;
};

function User (userId){
	this.userId = userId;
	this._isReady = false;
	this._roomId = null;
	this._isDealer = false;
	this._name = "Player "+UserManager.prototype.totalUsers;
};

User.prototype.ready = function(isReady){

	if (isReady == null)
		return this._isReady;
		
	this._isReady = isReady;
	
	return this;
	
}


User.prototype.room = function(roomId){

	if (roomId == null) {
		var room = RoomManager.prototype.get(this._roomId);
		return room;
	}
		
	this._roomId = roomId;
	
	var room = RoomManager.prototype.get(roomId).addUser(this);
	
	return this;
}

User.prototype.dealer = function(isDealer){

	if (isDealer == null)
		return this._isDealer;
		
	this._isDealer = isDealer;
		
	return this;
}

UserManager.prototype.addUser = function(userId){
	
	sys.log("Adding user: " + userId);
	
	this.totalUsers += 1;
	
	this.users[userId] = new User(userId);
	
	return this.users[userId];
};

UserManager.prototype.removeUser = function(userId){

	sys.log("Removing user: " + userId);
	
	this.totalUsers -= 1;
	
	var user = this.users[userId];
	
	user.room().removeUser(user);
		
	delete this.users[userId];
};

UserManager.prototype.get = function(userId){
	sys.log("getting user " + userId) + ": " + this.users[userId];
	
	if (!this.users[userId])
		throw("user not found");
		
	return this.users[userId];
};


function Room (id){

	this.id = id;
	this.state = "lobby";
	this.users = {};

};

Room.prototype.addUser = function(user){
	
	this.users[user.userId] = user;
	
	return this;
}

Room.prototype.removeUser = function(user){
	
	delete this.users[user.userId];
	
	return this;
}

Room.prototype.allReady = function(){
	sys.log("Checking users are ready");
	for (userId in this.users) {
		sys.log(userId);
		if (UserManager.prototype.get(userId).ready() == false) 
			return false;
	}
	
	return true;
}
	
function RoomManager (){
	this.rooms = {};
}

RoomManager.prototype.addRoom = function(roomId){

	sys.log("Adding room: " + roomId);
	
	this.rooms[roomId] = new Room(roomId);
	
	return this.rooms[roomId];
};

RoomManager.prototype.removeRoom = function(roomId){

	sys.log("Removing room: " + roomId);
		
	delete this.rooms[roomId];
};

RoomManager.prototype.get = function(roomId){
	if (!this.rooms[roomId])
		throw("room not found");
	return this.rooms[roomId];
};

