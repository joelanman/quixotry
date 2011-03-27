var wsAddress = "ws://192.168.0.109:8008/"; //"ws://0.0.0.0:8008/"; //"ws://192.168.1.78:8008/";

var state = "";

var states = {},
	currentState = "";

var selfId = window.localStorage.getItem('userId');

var changeState = function(state, message){
	
	// end the current state
	
	if (currentState){
		try {
			states[currentState]._end();
		} catch (err){
			log("End failed for state: "+currentState);
		}
	}
	
	if (states[state]) {

		currentState = state;
		
		try {
			states[state]._init(message);
		} catch (err){
			log("Init failed for state: "+state);
		}
		
	} else {
		
		log("state not found: " + state);
	}
	
}

states.common = {

	"initRoom" : function(message){
		log("initialising room...");
		
		var users = message.users;
		for (userId in users)
			userManager.addUser(users[userId]);
			
		var selfUser = userManager.get(selfId);
		$('#selfName').text(selfUser.name());
			
		if(message.state == "lobby"){
			
			changeState('lobby');
			
		} else if (message.state == "game"){
			
			changeState('game');
			
			for (var letter in message.letters){
				addTile(message.letters[letter]);
			}
			
			if (message.time != -1){
				$('#clock').text(message.time);
				clockInterval = setInterval("incrementClock()", 1000);
			}
			
		}
	},
	"addUser" : function(message){
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
	},
	"state" : function(message){
		log("Game state: " + message.state);
		state = message.state;
		
		changeState(state, message);
	}
}

states.lobby = {
	"_init" : function(message){
		$('#lobby').show();
		$('#game').hide();
		if (message.users){
			userManager.updateUsers(message.users);
		}
	}
};

states.chooseTiles = {

	"_init" : function(message){
				
		$('#lobby').hide();
		$('#dealerTitle').show();
		$('#game').show();
		$('#input .tiles, #output .tiles').empty();
		if (message.dealerId == selfId) {
			$('#tilePicker').show().removeClass('disabled');
			$('#dealerTitle').text('Choose 8 letters for this round');
		} else {
			$('#tilePicker').hide();
			var dealerName = userManager.get(message.dealerId).name();
			$('#dealerTitle').text(dealerName + ' is picking letters...');
		}
	},

	"addTile" : function(message){
		log("Add tile: " + message.letter);
		addTile(message.letter);
	}
	
};

states.game = {
	
	"_init" : function(message){
		
		$('#tilePicker').fadeOut('fast');
		$('#dealerTitle').text('Find the longest word!');
		
		$('#clock').text('30');
		clockInterval = setInterval("incrementClock()", 1000);
		
	},
};

states.login = {
	"_init" : function(message){
		$('#login').show();
		$('#chat').hide();
		$('#lobby').hide();
		$('#game').hide();
		
		$('#frm_login').find('.name').focus();
	},
	
	"_end" : function(message){
		$('#login').hide();
	}
};

	
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
		
		log("Received: " + evt.data);
		
		try{
			
			var message = JSON.parse(evt.data);
			
		} catch(err) {
			log("The message was not valid JSON")
		}
		
		if (currentState != "" && states[currentState][message.action]){
			
			states[currentState][message.action](message);
			
		} else if (states.common[message.action]){
			
			states.common[message.action](message);
			
		} else {
			
			log("Invalid message in this state");
			conn.send(JSON.stringify({
				action: "error",
				message: "The message you sent was not valid in the current state: " + msg
			}));	
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
					
			conn.send(JSON.stringify({"action" : "joinRoom",
									  "userId" : selfId}));
		};
	} else {
		changeState('login');
	}

}
