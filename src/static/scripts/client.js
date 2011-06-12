WEB_SOCKET_SWF_LOCATION = "/scripts/socket.io/lib/vendor/web-socket-js/WebSocketMain.swf";
// Set this to dump debug message from Flash to console.log:
WEB_SOCKET_DEBUG = true;

var host = window.location.hostname;
var socket = new io.Socket(host, {port:"8008", "reconnect": false});


socket.on('disconnect', function(){
	log("disconnected");
});
	
var states = {},
	currentState = "";
	
var round = {
	"_init" : function(){
		this.vowels = 0;
		this.consonants = 0;
	}
};

var selfId = window.localStorage.getItem('userId');

var drawLeaderboards = function(leaderboards){
	$('#leaderboards .user').remove();
	
	var $roundLeaderboard = $('#leaderboards .round.leaderboard .users');
	
	var roundUsers = [];
	
	for (var i = 0; i < leaderboards.round.length; i++){
		
		var user = new User(leaderboards.round[i]);
		
		var $user = userManager.$userTemplate.clone();
		
		$user.find('.name').text(user.name());
		$user.find('.word').text(user.word());
		$user.find('.word').addClass(user.hasValidWord() ? "valid" : "invalid");
		$user.find('.score').text(user.scoreChange());
		$user.find('.totalScore').text(user.totalScore());
		
		if(user.id == selfId)
			$user.addClass("self");
			
		roundUsers.push($user[0]);
	}
	
	$roundLeaderboard.append(roundUsers);
	
	var $overallLeaderboard = $('#leaderboards .overall.leaderboard .users');
	
	var roundUsers = [];
	
	for (var i = 0; i < leaderboards.overall.length; i++){
		
		var user = new User(leaderboards.overall[i]);
		
		var $user = userManager.$userTemplate.clone();
		
		$user.find('.name').text(user.name());
		$user.find('.word').text(user.word());
		$user.find('.word').addClass(user.hasValidWord() ? "valid" : "invalid");
		$user.find('.score').text(user.scoreChange());
		$user.find('.totalScore').text(user.totalScore());
		
		if(user.id == selfId)
			$user.addClass("self");
			
		roundUsers.push($user[0]);
	}
	
	$overallLeaderboard.append(roundUsers);
}

var changeState = function(state, message){
	
	// end the current state
	
	if (currentState){
		try {
			states[currentState]._end();
		} catch (err){
			log("End failed for state: " + currentState + " : " + err);
		}
	}
	
	log("changeState: " + state);
	
	if (states[state]) {

		currentState = state;
		
		try {
			states[state]._init(message);
		} catch (err){
			log("Init failed for state: " + state + " : " + err);
		}
		
	} else {
		
		log("state not found: " + state);
	}
	
};

states.common = {

	"initRoom" : function(message){
		log("initialising room...");
		
		userManager.init();
		
		var users = message.users;
		for (var userId in users)
			userManager.addUser(users[userId]);
			
		var selfUser = userManager.get(selfId);
		$('#selfName').text(selfUser.name());
		
		changeState(message.state, message);

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
		log("Users left room");
		userManager.removeUsers(message.users);
	},
	"state" : function(message){
		log("Game state: " + message.state);
		state = message.state;
		
		changeState(state, message);
	},
	"timeout": function(message){
		$('#message').text("Sorry - you've been disconnected as you weren't playing. You can join in again whenever you're ready.")
					 .show();
		changeState("login");
	}
};

states.lobby = {
	"_init" : function(message){
		$('#lobby').show();
		if (message.leaderboards){
			drawLeaderboards(message.leaderboards);
		}
		
		$('.leaderboardHolder').height($('.leaderboard.overall').innerHeight());
		
		$('#leaderboards .tabs .overall').removeClass('active');
		$('#leaderboards .tabs .round').addClass('active');
		
		$('#leaderboards .round.leaderboard').show();
		$('#leaderboards .overall.leaderboard').hide();
		
		setTimeout(function(){
			
			$('#leaderboards .tabs .round').removeClass("active");
			$('#leaderboards .tabs .overall').addClass("active");
			
			$('#leaderboards .round.leaderboard').fadeOut();
			$('#leaderboards .overall.leaderboard').fadeIn();
		
		}, 5 * 1000);
		
	},
	
	"_end" : function(message){
		$('#lobby').hide();
	}
};

states.chooseLetters = {

	"_init" : function(message){
		
		round._init();
				
		$('#dealerTitle').show();
		$('#game').show();
		$('#input .tiles, #output .tiles').empty();
		
		$('#tilePicker .vowel').show();
		$('#tilePicker .consonant').show();
		
		if (message.dealerId == selfId) {
			$('#tilePicker').show().removeClass('disabled');
			$('#dealerTitle').text('Choose 8 letters for this round');
		} else {
			$('#tilePicker').hide();
			$('#dealerTitle').text(message.dealerName + ' is picking letters...');
			
			for (var letter in message.letters){
				addTile(message.letters[letter]);
			}
		}
	},

	"_end" : function(message){
		$('#tilePicker').fadeOut('fast');
	},
	
	"addTile" : function(message){
		log("Add tile: " + message.letter);
		addTile(message.letter);
	},
	"dealerDead" : function(message){
		
		log("Dealer's dead!");
		
		$('#tilePicker').hide();
		for (var i=0; i<message.letters.length;i++){
			addTile(message.letters.charAt(i));
		}
		
	}
	
};

states.game = {
	
	"_init" : function(message){
		
		$('#dealerTitle').show();
		$('#game').show();
		
		$('#dealerTitle').text('Find the longest word!');
		
		for (var letter in message.letters){
			addTile(message.letters[letter]);
		}
		
		if (message.time != -1){
			$('#clock').text(message.time);
			clockInterval = setInterval("incrementClock()", 1000);
		}		
	},
	
	"_end" : function(message){
		$('#game').hide();
		$('#input .tiles, #output .tiles').empty();
	}
};

states.login = {
	"_init" : function(message){
		
		$('#chat').hide();
		userManager.removeAll();
		
		$('#login').show();
		$('#frm_login').find('.name').focus();
	},
	
	"_end" : function(message){
		$('#message').hide().text("");
		$('#login').hide();
		$('#chat').show();
	},
	
	"initRoom" : function(message){
		log("initialising room...");
		
		var users = message.users;
		for (var userId in users)
			userManager.addUser(users[userId]);
			
		var selfUser = userManager.get(selfId);
		$('#selfName').text(selfUser.name());
		
		changeState(message.state, message);

	},
	
	"yourId" : function(message){
		log("Got Id");
		selfId = message.userId;
		window.localStorage.setItem('userId', message.userId);
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
};

var pickTile = function(type){
	
	if (type == "vowel"){
		
		round.vowels += 1;
		
		if (round.vowels >= 5){
			$('#tilePicker .vowel').hide();
		}
	
	} else {
		
		round.consonants += 1;
		
		if (round.consonants >= 5){
			$('#tilePicker .consonant').hide();
		}
	}
	
	socket.send(JSON.stringify({'action':'chooseLetter', 'type':type}));
		
};
	
incrementClock = function(){
	$('#clock').text(parseInt($('#clock').text()) -1); 
	if ($('#clock').text() == "0"){
		clearInterval(clockInterval);
		
	  	var word = $.trim($('#output').text());
		socket.send(JSON.stringify({'action':'submitWord', 'word' : word}));
		
	}
};

function log(data){
  console.log(data);
}

socket.on('message', function(data){
	
	log("Received: " + data);
	
	try {
		var message = JSON.parse(data);
	} catch(err) {
		log("The message was not valid JSON");
	}
	
	if (currentState != "" && states[currentState][message.action]){
		
		states[currentState][message.action](message);
		
	} else if (currentState != "login" && states.common[message.action]){
		
		states.common[message.action](message);
		
	} else {
		
		log("Invalid message in this state: " + data);
		socket.send(JSON.stringify({
			action: "error"
		}));	
	}
	
});
	
var documentReady = function(){
	
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
		
		if (newName != "") {
			socket.send(JSON.stringify({
				'action': 	'changeName',
				'name': 	newName
			}));
			
			$('#selfName').text(newName);
		}
		
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
		
		socket.send(JSON.stringify({"action" :"joinRoom",
								  	"userId" : selfId,
								  	"name"   : name}));
		
	});
	
	$('#frm_login .submit').click(function(e){
		e.preventDefault();
		$('#frm_login').submit();
	});
		
	if (selfId){
		socket.on('connect', function() {
			log("opened");
					
			socket.send(JSON.stringify({"action" : "joinRoom",
									  	"userId" : selfId}));
		});
	} else {
		changeState('login');
	}
	
	socket.connect();

};
