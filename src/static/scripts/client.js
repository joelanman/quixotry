
var socket = io.connect('http://' + window.location.hostname + ':8008');


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
		
		if (message.longestWord){
			$('#longestWord').text(message.longestWord);
			$('#longestWord').attr('href', 'http://en.wiktionary.org/wiki/'+ message.longestWord.toLowerCase());
		}
		
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
			
			for (var i = 0; i < message.letters.length; i++){
				var letter = message.letters[i];
				addTile(letter, i);
			}
		}
	},

	"_end" : function(message){
		$('#tilePicker').fadeOut('fast');
	},
	
	"addTile" : function(message){
		log("Add tile: " + message.letter);
		addTile(message.letter, message.index);
	},
	
	"dealerDead" : function(message){
		
		log("Dealer's dead!");
		
		var index = message.startIndex,
			letters = message.letters;
		
		$('#tilePicker').hide();
		
		for (var i = 0; i < letters.length; i++){
			addTile(letters.charAt(i), index++);
		}
		
	}
	
};

states.game = {
	
	"_init" : function(message){
		
		$('#dealerTitle').show();
		$('#game').show();
		
		$('#dealerTitle').text('Find the longest word!');
		
		if(message.letters){
			
			for (var i = 0; i < message.letters.length; i++){
				var letter = message.letters[i];
				addTile(letter, i);
			}
		}
		
		if (message.time != -1){
			$('#clock').text(message.time);
			clockInterval = setInterval("incrementClock()", 1000);
		}		
		
		$(document).bind("keyup.selectLetters", function(e){
			
			if (e.which == 8){
				$('#output li:last').appendTo('#input .tiles');
				return;
			}
			
			var letter = String.fromCharCode(e.which).toUpperCase();
			
			var input = $.trim($('#input').text());
			
			var index = input.indexOf(letter);
			
			if (index == -1){
				return;
			};
			
			$('#input li').eq(index).appendTo('#output .tiles');
			
		});
		
	},
	
	"_end" : function(message){
		$(document).unbind("keyup.selectLetters");
		clearInterval(clockInterval);
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

states.submissions = {

	"_init": function(){
	
		$('#dealerTitle').text('Collecting words...');
		
	  	var letters = [];
		$('#output a').each(function(){
			letters.push($(this).data('index'));
		})
		socket.send(JSON.stringify({'action':'submitLetters', 'letters' : letters}));
	},
	"_end": function(){
		$('#game').hide();
		$('#input .tiles, #output .tiles').empty();
		$('#clock').text("");
	}

};
	
var addTile = function(letter, index){
	
	var $newTile = $tile.clone();
	
	$newTile.css({'opacity':0});
	
	var a = $newTile.find('a');
	a.text(letter)
	 .css({'position':'relative', 'top':-80})
	 .data('index', index);
	 
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
	if ($('#clock').text() <= "0"){
		clearInterval(clockInterval);
	}
};

function log(data){
	if(typeof(log) != "undefined"){
		console.log(data);
	}
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

	var $output = $('#output .tiles'),
		$input = $('#input .tiles');
		
	var clickTrigger = (window.Touch) ? 'touchstart' : 'click';

	$('.tiles a').live(clickTrigger, function(e){
		e.preventDefault();
		var destination = ($(this).closest('#input').length) ? $output : $input;
		$(this).closest('li').appendTo(destination);
	});
		
	$('#tilePicker .vowel').live(clickTrigger, function(e){
		pickTile('vowel');
	});
	
	$('#tilePicker .consonant').live(clickTrigger, function(e){
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
	

};
