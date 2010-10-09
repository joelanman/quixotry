var wsAddress = "ws://0.0.0.0:8008/"; //"ws://192.168.1.78:8008/";

var state = "",
	vowels = "AEIOU",
	consonants = "BCDFGHJKLMNPQRSTVWXYZ";

var userManager = {
users: {}
};

User = function(userId){
this.isReady = false;

this.$el = userManager.$userTemplate.clone();
this.$el.attr('id','user_'+ userId);
this.$el.find('.name').text(userId);
this.$el.appendTo($('#users'));

};

User.prototype.ready = function(isReady){

if (isReady == null)
	return this.isReady;
	
this.isReady = isReady;

this.$el.find('.ready').toggle(this.isReady);
this.$el.find('.notReady').toggle(this.isReady == false);

}

userManager.addUser = function(userId){

log("Adding user: " + userId);

this.users[userId] = new User(userId);
};

userManager.removeUser = function(userId){

log("Removing user: " + userId);

$('#user_'+ userId).fadeOut();

delete this.users[userId];
};

userManager.get = function(userId){
return this.users[userId];
};

actions = {
	"initRoom" : function(message){
		log("initialising room...");
		if(message.room.state == "lobby"){
			var users = message.room.users;
			for (userId in users)
				userManager.addUser(userId);
		}
	},
	"joinRoom" : function(message){
		log("User joined room");
		userManager.addUser(message.userId);
	},
	"closed" : function(message){
		log("User left room");
		userManager.removeUser(message.userId);
	},
	"userReady" : function(message){
		log("User ready");
		userManager.get(message.userId).ready(message.isReady);
	},
	"yourId" : function(message){
		log("Got Id");
		selfId = message.userId;
	},
	"state" : function(message){
		log("Game state: " + message.state);
		state = message.state;
		if (state == "lobby"){
			$('#lobby').show();
			$('#game').hide();
		} else if (state == "game"){
			$('#lobby').hide();
			$('#game').show();
			
			if(message.dealer)
				$('#tilePicker').show();
			
		}
	},
	"addTile" : function(message){
		log("Add tile: " + message.letter);
		addTile(message.letter);
	}
}

	
var addTile = function(letter){
	
	var $newTile = $tile.clone();
	$newTile.find('a').text(letter);
	$newTile.appendTo('#input .tiles');
}

var pickTile = function(type){
	var letters = (type == "vowel") ? vowels : consonants;
	var index = Math.floor(Math.random()*letters.length)
	var letter = letters.substring(index,index+1);
	addTile(letter)
	
	conn.send(JSON.stringify({'action':'addTile','letter':letter}));
		
	if ($('#input .tiles li').length == 8) {
		conn.send(JSON.stringify({'action':'tileSelectionComplete'}));
		$('#clock').show();
		clockInterval = setInterval("incrementClock()", 1000);
	}
}
	
incrementClock = function(){
	$('#clock').text(parseInt($('#clock').text()) -1); 
	if ($('#clock').text() == "0"){
		clearInterval(clockInterval);
	}
}

function log(data){
  console.log(data);
}

var conn, recvd, connections = 0;

if (window["WebSocket"]) {
	recvd = 0;

	conn = new WebSocket(wsAddress);

	conn.onmessage = function(evt) {
		log("Received: " +evt.data);
		try{
			var message = JSON.parse(evt.data);
			actions[message.action](message);
		}catch(err){
			// not valid json
		}
	};

	conn.onerror = function() {
	  log("error", arguments);
	};

	conn.onclose = function() {
	  log("closed");
	};

}

documentReady = function(){
	
	$tile = $('#tileTemplate').remove().removeAttr('id').removeClass('template').show();

	userManager.$userTemplate = $('#userTemplate').clone().removeAttr('id').removeClass('template').show();

	$('#actions a').click(function(e){
		e.preventDefault();
		
	  	var isReady = !userManager.get(selfId).ready();
	  	
	  	userManager.get(selfId).ready(isReady);
	  	
	  	conn.send(JSON.stringify({'action':'userReady', 'isReady': isReady}));
	  	$('#actions a').toggle();
	});

	$('.tiles a').live('click', function(e){
		e.preventDefault();
		var destination = ($(this).closest('#input').length) ? '#output' : '#input';
		$(this).closest('li').appendTo(destination + ' .tiles');
	});
		
	$('#tilePicker .vowel').click(function(e){
		pickTile('vowel');
	});
	
	$('#tilePicker .consonant').click(function(e){
		pickTile('consonant');
	});
	
	$('#submit').click(function(e){
	  
	  	e.preventDefault();
	  	
	  	var word = $.trim($('#output').text());
	  	
	  	conn.send(JSON.stringify({'action':'submit','word': word}));
	  	
	  });
				
	
	var hash = window.location.hash;

	if (hash.search(/^#/) != -1)
		hash = hash.substring(1);

	var hashArray = hash.split('&');

	var hashOptions = {};

	for (var i = 0; i < hashArray.length; i++) {
		var nameValue = hashArray[i].split('=');
		hashOptions[nameValue[0]] = nameValue[1];
	}

	conn.onopen = function() {
		log("opened");
		conn.send(JSON.stringify({"action":"joinRoom", "roomId" : hashOptions.room}));
	};
}
