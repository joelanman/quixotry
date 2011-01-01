var wsAddress = "ws://0.0.0.0:8008/"; //"ws://192.168.1.78:8008/";

var state = "";

var selfId = window.localStorage.getItem('userId');

var userManager = {
	users: {}
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

actions = {
	"initRoom" : function(message){
		log("initialising room...");
		
		var users = message.users;
		for (userId in users)
			userManager.addUser(users[userId]);
			
		if(message.state == "lobby"){
			
			$('#lobby').show();
			$('#chat').show();
			$('#game').hide();
			$('#login').hide();
			
		} else if(message.state == "game"){
			
			$('#game').show();
			$('#chat').show();
			$('#lobby').hide();
			$('#login').hide();
			
			for (var letter in message.letters){
				addTile(message.letters[letter]);
			}
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
			
		} else if (state == "login"){
			
			$('#login').show();
			$('#chat').hide();
			$('#lobby').hide();
			$('#game').hide();
			
			$('#frm_login').find('.name').focus();
			
		} else if (state == "game"){
			
			$('#lobby').hide();
			$('#dealerTitle').show();
			$('#game').show();
			$('#input .tiles, #output .tiles').empty();
			$('#clock').text('30');
			if (message.dealerId == selfId) {
				$('#tilePicker').removeClass('disabled');
				$('#dealerTitle').text('Choose 8 letters for this round');
			} else {
				if ($('#tilePicker').hasClass('disabled') == false)
					$('#tilePicker').addClass('disabled');
				var dealerName = userManager.get(message.dealerId).name();
				$('#dealerTitle').text(dealerName + ' is picking letters...');
			}
		}
	},
	"startGame" : function(message){
		
		$('#tilePicker').addClass('disabled');
		$('#dealerTitle').text('Find the longest word!');
		clockInterval = setInterval("incrementClock()", 1000);
	},
	"addTile" : function(message){
		log("Add tile: " + message.letter);
		addTile(message.letter);
	}
}

	
var addTile = function(letter){
	
	var $newTile = $tile.clone();
	
	$newTile.css({'opacity':0});
	
	var a = $newTile.find('a');
	a.text(letter)
	 .css({'position':'relative', 'top':-80});
	 
	$newTile.appendTo('#input .tiles');
	
	$newTile.animate({'opacity':1});
	a.animate({'top':-5});
}

var pickTile = function(type){
	
	conn.send(JSON.stringify({'action':'chooseTile','type':type}));
		
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
		$('#inp_changeName').focus();
		
	});
	
	$('#btn_saveChangeName').live('click', function(e){

		e.preventDefault();
		
		$('#frm_changeName').submit();
		
	});
	
	$('#frm_changeName').submit(function(e){
		
		e.preventDefault();
		
		var newName = $('#inp_changeName').val();
	  	conn.send(JSON.stringify({'action':'changeName','name': newName}));
		
		$('#selfName').text(newName);
		
		$('#displaySelfName').show();
		$('#editSelfName').hide();
		
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
	
	$('#frm_login').submit(function(e){
		
		e.preventDefault();
		var name = $('#frm_login').find('.name').val();
		
		conn.send(JSON.stringify({"action" :"joinRoom",
								  "userId" : selfId,
								  "name"   : name}));
		
	});
		
	if (selfId){
		conn.onopen = function() {
			log("opened");
					
			conn.send(JSON.stringify({"action":"joinRoom",
									  "userId" : selfId}));
		};
	} else {
		$('#login').show();
		$('#chat').hide();
		$('#game').hide();
		$('#lobby').hide();
	}

	
}
