var wsAddress = "ws://192.168.1.67:8008/"; //"ws://0.0.0.0:8008/"; //"ws://192.168.1.78:8008/";

var state = "",
	vowels = "AAAAAAAAAEEEEEEEEEEEEIIIIIIIIIOOOOOOOOUUUU", // Scrabble distributions
	consonants = "BBCCDDDDFFGGGHHJKLLLLMMNNNNNNPPQRRRRRRSSSSTTTTTTVVWWXYYZ";

var selfId = window.localStorage.getItem('userId');

var userManager = {
	users: {}
};

User = function(user){
	
	for (property in user){
		this[property] = user[property];
	}
	
	this.$el = userManager.$userTemplate.clone();
	this.$el.attr('id','user_'+ this.userId);
	this.$el.find('.name').text(this.name());
	this.$el.appendTo($('#users'));
	
	if (this.userId == selfId)
		$('#selfName').text(this.name());

};

User.prototype.name = function(name){

	if (name === undefined)
		return this._name;
		
	this._name = name;
		
	return this;
}

User.prototype.ready = function(isReady){
	
	if (isReady === undefined)
		return this._isReady;
		
	this._isReady = isReady;
	
	this.$el.find('.ready').toggle(this._isReady);
	this.$el.find('.notReady').toggle(this._isReady == false);

}

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

userManager.get = function(userId){
	return this.users[userId];
};

actions = {
	"initRoom" : function(message){
		log("initialising room...");
		if(message.state == "lobby"){
			var users = message.users;
			for (userId in users)
				userManager.addUser(users[userId]);
		}
	},
	"joinRoom" : function(message){
		log("User joined room");
		userManager.addUser(message.user);
	},
	"changeName" : function(message){
		log("User changed name to " + message.name);
		userManager.get(message.userId).name(message.name);
		$('#user_'+message.userId).find('.name').text(message.name);
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
		window.localStorage.setItem('userId', message.userId);
		var selfUser = userManager.get(message.userId);
		$('#selfName').text(selfUser.name());
	},
	"state" : function(message){
		log("Game state: " + message.state);
		state = message.state;
		if (state == "lobby"){
			$('#lobby').show();
			$('#game').hide();
			if (message.users){
				userManager.updateUsers(message.users);
			}
		} else if (state == "game"){
			$('#lobby').hide();
			$('#game').show();
			
			if (message.dealerId == selfId) {
				$('#tilePicker').show();
				$('#dealerTitle').text('Choose 8 letters for this round');
			} else {
				var dealerName = userManager.get(message.dealerId).name();
				$('#dealerTitle').text(dealerName + ' is picking letters...');
			}
		}
	},
	"startGame" : function(message){
		
		$('#tilePicker').hide();
		$('#dealerTitle').hide();
		$('#clock').show();
		clockInterval = setInterval("incrementClock()", 1000);
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
	}
}
	
incrementClock = function(){
	$('#clock').text(parseInt($('#clock').text()) -1); 
	if ($('#clock').text() == "0"){
		clearInterval(clockInterval);
		
	  	var word = $.trim($('#output').text());
		conn.send(JSON.stringify({'action':'submitWord', 'word' : word}));
		
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
	
	$('#btn_changeName').live('click', function(e){
		
		e.preventDefault();
		
		$('#displaySelfName').hide();
		$('#editSelfName').show();
		
		
	});
	
	$('#frm_changeName').submit(function(e){
		
		e.preventDefault();
		
		var newName = $('#inp_changeName').val();
	  	conn.send(JSON.stringify({'action':'changeName','name': newName}));
		
		$('#selfName').text(newName);
		
		$('#displaySelfName').show();
		$('#editSelfName').hide();
		
	});

	$('#actions a').click(function(e){
		e.preventDefault();
		
	  	var isReady = !userManager.get(selfId).ready();
	  	
	  	userManager.get(selfId).ready(isReady);
	  	
	  	conn.send(JSON.stringify({'action':'userReady', 'isReady': isReady, 'userId':selfId}));
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
				
		conn.send(JSON.stringify({"action":"joinRoom",
								  "userId" : selfId}));
	};
}
