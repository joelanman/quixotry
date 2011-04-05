var sys = require("sys");

var Channel = function(name, manager){
	
	this.name = name;
	this.manager = manager;
	this.clients = {};
};

Channel.prototype.subscribe = function(clientId){
	
	this.clients[clientId] = true;
	
}

Channel.prototype.unSubscribe = function(clientId){
	
	delete this.clients[clientId];
	
}

Channel.prototype.broadcast = function(message, except){
	
	for (i in this.clients){
		if (i != except)
			this.manager.socket.clients[i].send(message);
	}
	
}

exports.ChannelManager = function(socket){
	this.socket = socket;
	this.channels = {};
};

exports.ChannelManager.prototype.addChannel = function(name){

	this.channels[name] = new Channel(name, this);
	
};


